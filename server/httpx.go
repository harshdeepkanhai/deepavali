package main

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"mime"
	"net"
	"net/http"
	"net/netip"
	"strings"
	"sync"
	"time"

	"github.com/go-webauthn/webauthn/webauthn"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/time/rate"
)

const maxBody = 16 << 10 // every request body is capped at 16 KB

type app struct {
	cfg   config
	log   *slog.Logger
	db    *pgxpool.Pool
	wa    *webauthn.WebAuthn
	files map[string]*asset
	api   *http.ServeMux
	lim   map[string]*limiter
	csp   string
}

func newRef() string {
	b := make([]byte, 6)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}

// ServeHTTP is the single entry point: headers, limits, routing, uniform errors, access log.
func (a *app) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	start := time.Now()
	sw := &statusWriter{ResponseWriter: w}
	defer func() {
		if v := recover(); v != nil {
			ref := newRef()
			a.log.Error("panic", "ref", ref, "err", fmt.Sprint(v))
			if sw.status == 0 {
				a.writeErr(sw, http.StatusInternalServerError, "server", ref)
			}
		}
		// No client address, no query string, no user id: paths, statuses and timings only.
		a.log.Info("req", "m", r.Method, "p", r.URL.Path, "s", sw.status, "ms", time.Since(start).Milliseconds())
	}()
	a.securityHeaders(sw.Header())
	r.Body = http.MaxBytesReader(sw, r.Body, maxBody)

	path := r.URL.Path
	switch {
	case strings.HasPrefix(path, "/api/"):
		sw.Header().Set("Cache-Control", "no-store")
		if !a.lim["api"].allow(a.clientKey(r)) {
			a.tooMany(sw)
			return
		}
		if !a.sameOrigin(r) {
			a.fail(sw, http.StatusForbidden, "forbidden")
			return
		}
		if _, pattern := a.api.Handler(r); pattern == "" {
			a.fail(sw, http.StatusNotFound, "not_found") // also for wrong methods: no 405 hints
			return
		}
		a.api.ServeHTTP(sw, r)
	case path == "/up" && r.Method == http.MethodGet:
		sw.WriteHeader(http.StatusNoContent) // health check for the hosting platform
	default:
		if !a.lim["static"].allow(a.clientKey(r)) {
			a.tooMany(sw)
			return
		}
		a.serveStatic(sw, r)
	}
}

func (a *app) buildCSP() string {
	csp := "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; " +
		"connect-src 'self'; manifest-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"
	if a.cfg.Secure {
		csp += "; upgrade-insecure-requests"
	}
	return csp
}

func (a *app) securityHeaders(h http.Header) {
	h.Set("Content-Security-Policy", a.csp)
	if a.cfg.Secure {
		h.Set("Strict-Transport-Security", "max-age=63072000; includeSubDomains")
	}
	h.Set("X-Content-Type-Options", "nosniff")
	h.Set("X-Frame-Options", "DENY")
	h.Set("Referrer-Policy", "no-referrer")
	h.Set("Cross-Origin-Opener-Policy", "same-origin")
	h.Set("Cross-Origin-Resource-Policy", "same-origin")
	h.Set("Permissions-Policy", "accelerometer=(), camera=(), display-capture=(), geolocation=(), gyroscope=(), "+
		"magnetometer=(), microphone=(), midi=(), payment=(), usb=(), "+
		"publickey-credentials-create=(self), publickey-credentials-get=(self)")
}

// sameOrigin enforces the cross-site rules for the API. Reads must come from our own pages;
// writes must also be JSON and carry our exact Origin. Browsers always send Origin on POST.
func (a *app) sameOrigin(r *http.Request) bool {
	if s := r.Header.Get("Sec-Fetch-Site"); s != "" && s != "same-origin" {
		return false
	}
	if r.Method == http.MethodGet || r.Method == http.MethodHead {
		return true
	}
	if r.Header.Get("Origin") != a.cfg.PublicOrigin {
		return false
	}
	mt, _, err := mime.ParseMediaType(r.Header.Get("Content-Type"))
	return err == nil && mt == "application/json"
}

// clientKey identifies a client for rate limiting. On Render the edge (Cloudflare) overwrites
// CF-Connecting-IP; X-Forwarded-For is never trusted because clients can prepend to it.
// IPv6 clients are grouped by /64 so rotating addresses inside one network does not help.
func (a *app) clientKey(r *http.Request) string {
	raw := ""
	if a.cfg.ClientIPHeader != "" {
		raw = strings.TrimSpace(r.Header.Get(a.cfg.ClientIPHeader))
	}
	if raw == "" {
		if host, _, err := net.SplitHostPort(r.RemoteAddr); err == nil {
			raw = host
		}
	}
	ip, err := netip.ParseAddr(raw)
	if err != nil {
		return "?"
	}
	ip = ip.Unmap()
	if ip.Is4() {
		return ip.String()
	}
	p, _ := ip.Prefix(64)
	return p.String()
}

// Errors are identical in shape for every failure: a short code and an opaque reference.
func (a *app) fail(w http.ResponseWriter, status int, code string) {
	a.writeErr(w, status, code, newRef())
}

func (a *app) writeErr(w http.ResponseWriter, status int, code, ref string) {
	h := w.Header()
	h.Set("Content-Type", "application/json")
	h.Set("Cache-Control", "no-store")
	w.WriteHeader(status)
	_, _ = fmt.Fprintf(w, `{"error":%q,"ref":%q}`, code, ref)
}

// internal logs the real cause server-side and shows the client only a reference.
func (a *app) internal(w http.ResponseWriter, err error) {
	ref := newRef()
	a.log.Error("internal", "ref", ref, "err", err.Error())
	a.writeErr(w, http.StatusInternalServerError, "server", ref)
}

func (a *app) tooMany(w http.ResponseWriter) {
	w.Header().Set("Retry-After", "60")
	a.fail(w, http.StatusTooManyRequests, "too_many")
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

// readJSON accepts exactly one JSON object with no unknown fields and nothing after it.
func readJSON(r *http.Request, v any) error {
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(v); err != nil {
		return err
	}
	if err := dec.Decode(&struct{}{}); !errors.Is(err, io.EOF) {
		return errors.New("trailing data")
	}
	return nil
}

type statusWriter struct {
	http.ResponseWriter
	status int
}

func (w *statusWriter) WriteHeader(s int) {
	if w.status == 0 {
		w.status = s
	}
	w.ResponseWriter.WriteHeader(s)
}

func (w *statusWriter) Write(b []byte) (int, error) {
	if w.status == 0 {
		w.status = http.StatusOK
	}
	return w.ResponseWriter.Write(b)
}

// limiter is a per-client token bucket. Entries are dropped once their bucket would be full
// again, so forgetting them never gives anyone extra requests.
type limiter struct {
	mu    sync.Mutex
	every rate.Limit
	burst int
	ttl   time.Duration
	m     map[string]*limEntry
}

type limEntry struct {
	l    *rate.Limiter
	seen time.Time
}

const maxTrackedClients = 200_000

func newLimiter(perHour float64, burst int) *limiter {
	every := rate.Limit(perHour / 3600)
	ttl := time.Duration(float64(burst) / float64(every) * float64(time.Second))
	if ttl < time.Minute {
		ttl = time.Minute
	}
	return &limiter{every: every, burst: burst, ttl: ttl, m: map[string]*limEntry{}}
}

func (l *limiter) allow(key string) bool {
	l.mu.Lock()
	defer l.mu.Unlock()
	now := time.Now()
	e := l.m[key]
	if e == nil {
		if len(l.m) >= maxTrackedClients {
			l.sweepLocked(now)
			if len(l.m) >= maxTrackedClients {
				return false // under a very wide flood, refuse new clients rather than run out of memory
			}
		}
		e = &limEntry{l: rate.NewLimiter(l.every, l.burst)}
		l.m[key] = e
	}
	e.seen = now
	return e.l.AllowN(now, 1)
}

func (l *limiter) sweep() {
	l.mu.Lock()
	l.sweepLocked(time.Now())
	l.mu.Unlock()
}

func (l *limiter) sweepLocked(now time.Time) {
	for k, e := range l.m {
		if now.Sub(e.seen) > l.ttl {
			delete(l.m, k)
		}
	}
}

func defaultLimiters() map[string]*limiter {
	return map[string]*limiter{
		"static":  newLimiter(6000, 300), // page and asset loads
		"api":     newLimiter(3600, 120), // all API calls
		"auth":    newLimiter(600, 20),   // passkey ceremonies
		"signup":  newLimiter(60, 30),    // new accounts per address per hour, a classroom fits in the burst
		"recover": newLimiter(10, 5),     // recovery-code attempts
	}
}
