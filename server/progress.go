package main

import (
	"encoding/json"
	"net/http"
)

// levelIDs must match the ids in src/data/levels.js. They are save keys and never change.
var levelIDs = map[string]bool{
	"ayodhya": true, "braj": true, "pawapuri": true, "amritsar": true, "kolkata": true, "goa": true, "gujarat": true,
	"nepal": true, "kalapani": true, "trinidad": true, "malaysia": true, "leicester": true, "world": true,
}

func (a *app) progressRoutes() {
	a.api.HandleFunc("GET /api/progress", a.getProgress)
	a.api.HandleFunc("PUT /api/progress", a.putProgress)
	a.api.HandleFunc("POST /api/account/delete", a.deleteAccount)
}

func validStars(m map[string]int) bool {
	if len(m) > len(levelIDs) {
		return false
	}
	for k, v := range m {
		if !levelIDs[k] || v < 0 || v > 3 {
			return false
		}
	}
	return true
}

// mergeStars keeps the best score per place, so a sync can never lower anything.
func mergeStars(have, in map[string]int) map[string]int {
	out := make(map[string]int, len(have)+len(in))
	for k, v := range have {
		out[k] = v
	}
	for k, v := range in {
		if v > out[k] {
			out[k] = v
		}
	}
	return out
}

func (a *app) getProgress(w http.ResponseWriter, r *http.Request) {
	uid, ok := a.requireUser(w, r)
	if !ok {
		return
	}
	var raw []byte
	err := a.db.QueryRow(r.Context(), `SELECT COALESCE((SELECT stars FROM progress WHERE user_id = $1), '{}'::jsonb)`, uid).Scan(&raw)
	if err != nil {
		a.internal(w, err)
		return
	}
	stars := map[string]int{}
	if err := json.Unmarshal(raw, &stars); err != nil {
		a.internal(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"stars": stars})
}

func (a *app) putProgress(w http.ResponseWriter, r *http.Request) {
	uid, ok := a.requireUser(w, r)
	if !ok {
		return
	}
	var in struct {
		Stars map[string]int `json:"stars"`
	}
	if err := readJSON(r, &in); err != nil || !validStars(in.Stars) {
		a.fail(w, http.StatusBadRequest, "bad_request")
		return
	}
	ctx := r.Context()
	tx, err := a.db.Begin(ctx)
	if err != nil {
		a.internal(w, err)
		return
	}
	defer func() { _ = tx.Rollback(ctx) }()
	if _, err := tx.Exec(ctx, `INSERT INTO progress (user_id) VALUES ($1) ON CONFLICT DO NOTHING`, uid); err != nil {
		a.internal(w, err)
		return
	}
	var raw []byte
	if err := tx.QueryRow(ctx, `SELECT stars FROM progress WHERE user_id = $1 FOR UPDATE`, uid).Scan(&raw); err != nil {
		a.internal(w, err)
		return
	}
	have := map[string]int{}
	if err := json.Unmarshal(raw, &have); err != nil {
		a.internal(w, err)
		return
	}
	merged := mergeStars(have, in.Stars)
	out, _ := json.Marshal(merged)
	if _, err := tx.Exec(ctx, `UPDATE progress SET stars = $2, updated_at = now() WHERE user_id = $1`, uid, out); err != nil {
		a.internal(w, err)
		return
	}
	if err := tx.Commit(ctx); err != nil {
		a.internal(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"stars": merged})
}

// deleteAccount removes the user; foreign keys cascade to passkeys, sessions, codes and progress.
func (a *app) deleteAccount(w http.ResponseWriter, r *http.Request) {
	uid, ok := a.requireUser(w, r)
	if !ok {
		return
	}
	var in struct {
		Confirm string `json:"confirm"`
	}
	if err := readJSON(r, &in); err != nil || in.Confirm != "delete" {
		a.fail(w, http.StatusBadRequest, "bad_request")
		return
	}
	if _, err := a.db.Exec(r.Context(), `DELETE FROM users WHERE id = $1`, uid); err != nil {
		a.internal(w, err)
		return
	}
	a.setCookie(w, sessCookie, "", -1)
	w.WriteHeader(http.StatusNoContent)
}
