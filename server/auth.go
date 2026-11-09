package main

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base32"
	"encoding/base64"
	"encoding/json"
	"errors"
	"math/big"
	"net/http"
	"strings"
	"time"

	"github.com/go-webauthn/webauthn/protocol"
	"github.com/go-webauthn/webauthn/webauthn"
	"github.com/jackc/pgx/v5"
)

// Generic cookie names: they say nothing about the software behind them.
const (
	sessCookie = "__Host-s"
	chalCookie = "__Host-c"
)

func newWebAuthn(cfg config) (*webauthn.WebAuthn, error) {
	required := true
	return webauthn.New(&webauthn.Config{
		RPID:                  cfg.RPID,
		RPDisplayName:         "Deepa Quest",
		RPOrigins:             []string{cfg.PublicOrigin},
		AttestationPreference: protocol.PreferNoAttestation, // no device fingerprinting
		AuthenticatorSelection: protocol.AuthenticatorSelection{
			ResidentKey:        protocol.ResidentKeyRequirementRequired, // discoverable: sign in without a username
			RequireResidentKey: &required,
			UserVerification:   protocol.VerificationRequired, // biometric or device PIN every time
		},
		Timeouts: webauthn.TimeoutsConfig{
			Login:        webauthn.TimeoutConfig{Enforce: true, Timeout: 3 * time.Minute},
			Registration: webauthn.TimeoutConfig{Enforce: true, Timeout: 5 * time.Minute},
		},
	})
}

func (a *app) authRoutes() {
	a.api.HandleFunc("POST /api/register/begin", a.registerBegin)
	a.api.HandleFunc("POST /api/register/finish", a.registerFinish)
	a.api.HandleFunc("POST /api/login/begin", a.loginBegin)
	a.api.HandleFunc("POST /api/login/finish", a.loginFinish)
	a.api.HandleFunc("POST /api/recover", a.recoverWithCode)
	a.api.HandleFunc("POST /api/passkeys/begin", a.addPasskeyBegin)
	a.api.HandleFunc("POST /api/passkeys/finish", a.addPasskeyFinish)
	a.api.HandleFunc("POST /api/logout", a.logout)
	a.api.HandleFunc("POST /api/logout-all", a.logoutAll)
	a.api.HandleFunc("GET /api/me", a.me)
}

type waUser struct {
	id    []byte
	name  string
	creds []webauthn.Credential
}

func (u *waUser) WebAuthnID() []byte                         { return u.id }
func (u *waUser) WebAuthnName() string                       { return u.name }
func (u *waUser) WebAuthnDisplayName() string                { return u.name }
func (u *waUser) WebAuthnCredentials() []webauthn.Credential { return u.creds }

// ---------- sign-up ----------

func (a *app) registerBegin(w http.ResponseWriter, r *http.Request) {
	if !a.allow(w, r, "auth", "signup") || !emptyBody(a, w, r) {
		return
	}
	user := &waUser{id: randBytes(32), name: displayName()}
	creation, sd, err := a.wa.BeginRegistration(user)
	if err != nil {
		a.internal(w, err)
		return
	}
	if err := a.saveChallenge(r.Context(), w, "register", user.id, user.name, sd); err != nil {
		a.internal(w, err)
		return
	}
	writeJSON(w, http.StatusOK, creation)
}

func (a *app) registerFinish(w http.ResponseWriter, r *http.Request) {
	if !a.allow(w, r, "auth") {
		return
	}
	ctx := r.Context()
	ch, err := a.takeChallenge(ctx, w, r, "register")
	if err != nil {
		a.fail(w, http.StatusBadRequest, "failed")
		return
	}
	user := &waUser{id: ch.userID, name: ch.name}
	cred, err := a.wa.FinishRegistration(user, ch.sd, r)
	if err != nil || !cred.Flags.UserVerified {
		a.ceremonyFailed(w, "register", err)
		return
	}
	codes := recoveryCodes(10)
	tx, err := a.db.Begin(ctx)
	if err != nil {
		a.internal(w, err)
		return
	}
	defer func() { _ = tx.Rollback(ctx) }()
	data, _ := json.Marshal(cred)
	if _, err := tx.Exec(ctx, `INSERT INTO users (id, display_name) VALUES ($1, $2)`, user.id, user.name); err != nil {
		a.internal(w, err)
		return
	}
	if _, err := tx.Exec(ctx, `INSERT INTO credentials (id, user_id, data) VALUES ($1, $2, $3)`, cred.ID, user.id, data); err != nil {
		a.internal(w, err)
		return
	}
	for _, c := range codes {
		if _, err := tx.Exec(ctx, `INSERT INTO recovery_codes (code_hash, user_id) VALUES ($1, $2)`, hashCode(c), user.id); err != nil {
			a.internal(w, err)
			return
		}
	}
	if err := tx.Commit(ctx); err != nil {
		a.internal(w, err)
		return
	}
	if err := a.startSession(ctx, w, user.id); err != nil {
		a.internal(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"name": user.name, "codes": codes})
}

// ---------- sign-in ----------

func (a *app) loginBegin(w http.ResponseWriter, r *http.Request) {
	if !a.allow(w, r, "auth") || !emptyBody(a, w, r) {
		return
	}
	assertion, sd, err := a.wa.BeginDiscoverableLogin(webauthn.WithUserVerification(protocol.VerificationRequired))
	if err != nil {
		a.internal(w, err)
		return
	}
	if err := a.saveChallenge(r.Context(), w, "login", nil, "", sd); err != nil {
		a.internal(w, err)
		return
	}
	writeJSON(w, http.StatusOK, assertion)
}

func (a *app) loginFinish(w http.ResponseWriter, r *http.Request) {
	if !a.allow(w, r, "auth") {
		return
	}
	ctx := r.Context()
	ch, err := a.takeChallenge(ctx, w, r, "login")
	if err != nil {
		a.fail(w, http.StatusBadRequest, "failed")
		return
	}
	found, cred, err := a.wa.FinishPasskeyLogin(func(_, userHandle []byte) (webauthn.User, error) {
		return a.loadUser(ctx, userHandle)
	}, ch.sd, r)
	if err != nil || !cred.Flags.UserVerified || cred.Authenticator.CloneWarning {
		a.ceremonyFailed(w, "login", err) // a clone warning means the sign counter went backwards
		return
	}
	user := found.(*waUser)
	data, _ := json.Marshal(cred)
	if _, err := a.db.Exec(ctx, `UPDATE credentials SET data = $1, last_used_at = now() WHERE id = $2 AND user_id = $3`, data, cred.ID, user.id); err != nil {
		a.internal(w, err)
		return
	}
	if err := a.startSession(ctx, w, user.id); err != nil {
		a.internal(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"name": user.name})
}

func (a *app) recoverWithCode(w http.ResponseWriter, r *http.Request) {
	if !a.allow(w, r, "recover") {
		return
	}
	var in struct {
		Code string `json:"code"`
	}
	if err := readJSON(r, &in); err != nil || len(in.Code) > 64 {
		a.fail(w, http.StatusBadRequest, "bad_request")
		return
	}
	code, ok := normalizeCode(in.Code)
	if !ok {
		a.fail(w, http.StatusBadRequest, "failed")
		return
	}
	ctx := r.Context()
	var uid []byte
	err := a.db.QueryRow(ctx, `UPDATE recovery_codes SET used_at = now() WHERE code_hash = $1 AND used_at IS NULL RETURNING user_id`, hashCode(code)).Scan(&uid)
	if errors.Is(err, pgx.ErrNoRows) {
		a.fail(w, http.StatusBadRequest, "failed")
		return
	} else if err != nil {
		a.internal(w, err)
		return
	}
	var name string
	if err := a.db.QueryRow(ctx, `SELECT display_name FROM users WHERE id = $1`, uid).Scan(&name); err != nil {
		a.internal(w, err)
		return
	}
	if err := a.startSession(ctx, w, uid); err != nil {
		a.internal(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"name": name})
}

// ---------- extra passkeys for a signed-in player ----------

func (a *app) addPasskeyBegin(w http.ResponseWriter, r *http.Request) {
	uid, ok := a.requireUser(w, r)
	if !ok || !a.allow(w, r, "auth") || !emptyBody(a, w, r) {
		return
	}
	user, err := a.loadUser(r.Context(), uid)
	if err != nil {
		a.internal(w, err)
		return
	}
	exclude := make([]protocol.CredentialDescriptor, 0, len(user.creds))
	for _, c := range user.creds {
		exclude = append(exclude, c.Descriptor())
	}
	creation, sd, err := a.wa.BeginRegistration(user, webauthn.WithExclusions(exclude))
	if err != nil {
		a.internal(w, err)
		return
	}
	if err := a.saveChallenge(r.Context(), w, "add", uid, user.name, sd); err != nil {
		a.internal(w, err)
		return
	}
	writeJSON(w, http.StatusOK, creation)
}

func (a *app) addPasskeyFinish(w http.ResponseWriter, r *http.Request) {
	uid, ok := a.requireUser(w, r)
	if !ok || !a.allow(w, r, "auth") {
		return
	}
	ctx := r.Context()
	ch, err := a.takeChallenge(ctx, w, r, "add")
	if err != nil || string(ch.userID) != string(uid) {
		a.fail(w, http.StatusBadRequest, "failed")
		return
	}
	user, err := a.loadUser(ctx, uid)
	if err != nil {
		a.internal(w, err)
		return
	}
	cred, err := a.wa.FinishRegistration(user, ch.sd, r)
	if err != nil || !cred.Flags.UserVerified {
		a.ceremonyFailed(w, "add", err)
		return
	}
	data, _ := json.Marshal(cred)
	if _, err := a.db.Exec(ctx, `INSERT INTO credentials (id, user_id, data) VALUES ($1, $2, $3)`, cred.ID, uid, data); err != nil {
		a.internal(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// ---------- sessions ----------

func (a *app) startSession(ctx context.Context, w http.ResponseWriter, uid []byte) error {
	token := randBytes(32)
	if _, err := a.db.Exec(ctx, `INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)`,
		sha(token), uid, time.Now().Add(sessionMax)); err != nil {
		return err
	}
	a.setCookie(w, sessCookie, base64.RawURLEncoding.EncodeToString(token), int(sessionMax/time.Second))
	return nil
}

// userFromSession returns the signed-in user, refreshing the idle timer.
func (a *app) userFromSession(r *http.Request) ([]byte, []byte, bool) {
	c, err := r.Cookie(sessCookie)
	if err != nil {
		return nil, nil, false
	}
	token, err := base64.RawURLEncoding.DecodeString(c.Value)
	if err != nil || len(token) != 32 {
		return nil, nil, false
	}
	h := sha(token)
	var uid []byte
	err = a.db.QueryRow(r.Context(), `UPDATE sessions SET last_seen_at = now()
		WHERE token_hash = $1 AND expires_at > now() AND last_seen_at > now() - $2::interval RETURNING user_id`, h, sessionIdle).Scan(&uid)
	return uid, h, err == nil
}

func (a *app) requireUser(w http.ResponseWriter, r *http.Request) ([]byte, bool) {
	uid, _, ok := a.userFromSession(r)
	if !ok {
		a.fail(w, http.StatusUnauthorized, "signed_out")
	}
	return uid, ok
}

func (a *app) logout(w http.ResponseWriter, r *http.Request) {
	if _, h, ok := a.userFromSession(r); ok {
		if _, err := a.db.Exec(r.Context(), `DELETE FROM sessions WHERE token_hash = $1`, h); err != nil {
			a.internal(w, err)
			return
		}
	}
	a.setCookie(w, sessCookie, "", -1)
	w.WriteHeader(http.StatusNoContent)
}

func (a *app) logoutAll(w http.ResponseWriter, r *http.Request) {
	uid, ok := a.requireUser(w, r)
	if !ok {
		return
	}
	if _, err := a.db.Exec(r.Context(), `DELETE FROM sessions WHERE user_id = $1`, uid); err != nil {
		a.internal(w, err)
		return
	}
	a.setCookie(w, sessCookie, "", -1)
	w.WriteHeader(http.StatusNoContent)
}

func (a *app) me(w http.ResponseWriter, r *http.Request) {
	uid, ok := a.requireUser(w, r)
	if !ok {
		return
	}
	var out struct {
		Name      string `json:"name"`
		Passkeys  int    `json:"passkeys"`
		CodesLeft int    `json:"codesLeft"`
	}
	err := a.db.QueryRow(r.Context(), `SELECT u.display_name,
		(SELECT count(*) FROM credentials WHERE user_id = u.id),
		(SELECT count(*) FROM recovery_codes WHERE user_id = u.id AND used_at IS NULL)
		FROM users u WHERE u.id = $1`, uid).Scan(&out.Name, &out.Passkeys, &out.CodesLeft)
	if err != nil {
		a.internal(w, err)
		return
	}
	writeJSON(w, http.StatusOK, out)
}

// ---------- ceremony state ----------

type challenge struct {
	userID []byte
	name   string
	sd     webauthn.SessionData
}

func (a *app) saveChallenge(ctx context.Context, w http.ResponseWriter, kind string, uid []byte, name string, sd *webauthn.SessionData) error {
	id := randBytes(32)
	data, err := json.Marshal(sd)
	if err != nil {
		return err
	}
	if _, err := a.db.Exec(ctx, `INSERT INTO challenges (id_hash, kind, user_id, display_name, data, expires_at)
		VALUES ($1, $2, $3, $4, $5, now() + interval '5 minutes')`, sha(id), kind, uid, name, data); err != nil {
		return err
	}
	a.setCookie(w, chalCookie, base64.RawURLEncoding.EncodeToString(id), 300)
	return nil
}

// takeChallenge loads and deletes the ceremony in one statement, so it can be used only once.
func (a *app) takeChallenge(ctx context.Context, w http.ResponseWriter, r *http.Request, kind string) (*challenge, error) {
	a.setCookie(w, chalCookie, "", -1)
	c, err := r.Cookie(chalCookie)
	if err != nil {
		return nil, err
	}
	id, err := base64.RawURLEncoding.DecodeString(c.Value)
	if err != nil || len(id) != 32 {
		return nil, errors.New("bad challenge cookie")
	}
	ch := &challenge{}
	var data []byte
	err = a.db.QueryRow(ctx, `DELETE FROM challenges WHERE id_hash = $1 AND kind = $2 AND expires_at > now()
		RETURNING user_id, COALESCE(display_name, ''), data`, sha(id), kind).Scan(&ch.userID, &ch.name, &data)
	if err != nil {
		return nil, err
	}
	return ch, json.Unmarshal(data, &ch.sd)
}

func (a *app) loadUser(ctx context.Context, uid []byte) (*waUser, error) {
	u := &waUser{id: uid}
	if err := a.db.QueryRow(ctx, `SELECT display_name FROM users WHERE id = $1`, uid).Scan(&u.name); err != nil {
		return nil, err
	}
	rows, err := a.db.Query(ctx, `SELECT data FROM credentials WHERE user_id = $1`, uid)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var data []byte
		var c webauthn.Credential
		if err := rows.Scan(&data); err != nil {
			return nil, err
		}
		if err := json.Unmarshal(data, &c); err != nil {
			return nil, err
		}
		u.creds = append(u.creds, c)
	}
	return u, rows.Err()
}

// ceremonyFailed tells the client nothing about which check failed; the reason stays in the log.
func (a *app) ceremonyFailed(w http.ResponseWriter, kind string, err error) {
	ref := newRef()
	why := "flags"
	if err != nil {
		why = err.Error()
	}
	a.log.Info("ceremony failed", "kind", kind, "ref", ref, "why", why)
	a.writeErr(w, http.StatusBadRequest, "failed", ref)
}

// ---------- helpers ----------

func (a *app) allow(w http.ResponseWriter, r *http.Request, buckets ...string) bool {
	k := a.clientKey(r)
	for _, b := range buckets {
		if !a.lim[b].allow(k) {
			a.tooMany(w)
			return false
		}
	}
	return true
}

func emptyBody(a *app, w http.ResponseWriter, r *http.Request) bool {
	var in struct{}
	if err := readJSON(r, &in); err != nil {
		a.fail(w, http.StatusBadRequest, "bad_request")
		return false
	}
	return true
}

func (a *app) setCookie(w http.ResponseWriter, name, value string, maxAge int) {
	http.SetCookie(w, &http.Cookie{Name: name, Value: value, Path: "/", MaxAge: maxAge,
		HttpOnly: true, Secure: true, SameSite: http.SameSiteStrictMode})
}

func randBytes(n int) []byte {
	b := make([]byte, n)
	_, _ = rand.Read(b)
	return b
}

func sha(b []byte) []byte {
	s := sha256.Sum256(b)
	return s[:]
}

// Display names are generated so children never type personal data.
var (
	nameWords1 = []string{"Golden", "Bright", "Brave", "Shining", "Gentle", "Swift", "Happy", "Glowing", "Clever", "Little"}
	nameWords2 = []string{"Diya", "Lamp", "Star", "Spark", "Lotus", "Peacock", "Firefly", "Comet", "Lantern", "Rangoli"}
)

func pick(n int) int {
	v, _ := rand.Int(rand.Reader, big.NewInt(int64(n)))
	return int(v.Int64())
}

func displayName() string {
	return nameWords1[pick(len(nameWords1))] + " " + nameWords2[pick(len(nameWords2))] + " " + itoa4(1000+pick(9000))
}

func itoa4(n int) string {
	return string([]byte{byte('0' + n/1000), byte('0' + n/100%10), byte('0' + n/10%10), byte('0' + n%10)})
}

var b32 = base32.StdEncoding.WithPadding(base32.NoPadding)

// recoveryCodes returns n codes of 80 random bits each, formatted XXXX-XXXX-XXXX-XXXX.
func recoveryCodes(n int) []string {
	out := make([]string, n)
	for i := range out {
		s := b32.EncodeToString(randBytes(10))
		out[i] = s[0:4] + "-" + s[4:8] + "-" + s[8:12] + "-" + s[12:16]
	}
	return out
}

// normalizeCode accepts lower case, spaces, dashes and the usual look-alike digits.
func normalizeCode(in string) (string, bool) {
	s := strings.Map(func(r rune) rune {
		switch {
		case r == '-' || r == ' ':
			return -1
		case r == '0':
			return 'O'
		case r == '1':
			return 'I'
		case r == '8':
			return 'B'
		}
		return r
	}, strings.ToUpper(in))
	if len(s) != 16 {
		return "", false
	}
	if _, err := b32.DecodeString(s); err != nil {
		return "", false
	}
	return s, true
}

func hashCode(code string) []byte {
	n, _ := normalizeCode(code)
	return sha([]byte(n))
}
