package main

import (
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func testApp(t *testing.T) *app {
	t.Helper()
	dir := t.TempDir()
	must(t, os.MkdirAll(filepath.Join(dir, "a"), 0o755))
	must(t, os.WriteFile(filepath.Join(dir, "index.html"), []byte("<!doctype html>"+strings.Repeat("<p>lamp</p>", 100)), 0o644))
	must(t, os.WriteFile(filepath.Join(dir, "a", "x1.js"), []byte(strings.Repeat("console.log(1);", 100)), 0o644))
	must(t, os.WriteFile(filepath.Join(dir, "a", "x1.js.map"), []byte("{}"), 0o644))
	cfg := config{PublicOrigin: "https://game.example", RPID: "game.example", Secure: true, StaticDir: dir, ClientIPHeader: "CF-Connecting-IP"}
	a, err := newApp(cfg, slog.New(slog.NewTextHandler(io.Discard, nil)))
	must(t, err)
	return a
}

func must(t *testing.T, err error) {
	t.Helper()
	if err != nil {
		t.Fatal(err)
	}
}

func do(a *app, method, path string, hdr map[string]string, body string) *httptest.ResponseRecorder {
	r := httptest.NewRequest(method, path, strings.NewReader(body))
	for k, v := range hdr {
		r.Header.Set(k, v)
	}
	w := httptest.NewRecorder()
	a.ServeHTTP(w, r)
	return w
}

func TestSecurityHeadersAndNoFingerprints(t *testing.T) {
	a := testApp(t)
	w := do(a, "GET", "/", nil, "")
	if w.Code != 200 {
		t.Fatalf("status %d", w.Code)
	}
	h := w.Header()
	for k, want := range map[string]string{
		"Content-Security-Policy":    "script-src 'self'",
		"Strict-Transport-Security":  "max-age=",
		"X-Content-Type-Options":     "nosniff",
		"Referrer-Policy":            "no-referrer",
		"Cross-Origin-Opener-Policy": "same-origin",
		"Permissions-Policy":         "camera=()",
		"Cache-Control":              "no-cache",
	} {
		if !strings.Contains(h.Get(k), want) {
			t.Errorf("%s = %q, want it to contain %q", k, h.Get(k), want)
		}
	}
	if !strings.Contains(h.Get("Content-Security-Policy"), "frame-ancestors 'none'") {
		t.Error("CSP must forbid framing")
	}
	for _, k := range []string{"Server", "X-Powered-By", "Via"} {
		if h.Get(k) != "" {
			t.Errorf("%s must not be sent", k)
		}
	}
}

func TestStaticCachingAndCompression(t *testing.T) {
	a := testApp(t)
	w := do(a, "GET", "/a/x1.js", map[string]string{"Accept-Encoding": "br, gzip;q=0.5"}, "")
	if w.Code != 200 || w.Header().Get("Content-Encoding") != "gzip" {
		t.Fatalf("want gzip 200, got %d %q", w.Code, w.Header().Get("Content-Encoding"))
	}
	if !strings.Contains(w.Header().Get("Cache-Control"), "immutable") {
		t.Error("hashed assets must be immutable")
	}
	etag := w.Header().Get("ETag")
	if w2 := do(a, "GET", "/a/x1.js", map[string]string{"Accept-Encoding": "gzip", "If-None-Match": etag}, ""); w2.Code != 304 {
		t.Errorf("If-None-Match: got %d, want 304", w2.Code)
	}
	if w3 := do(a, "GET", "/a/x1.js", map[string]string{"Accept-Encoding": "gzip;q=0"}, ""); w3.Header().Get("Content-Encoding") != "" {
		t.Error("q=0 must disable gzip")
	}
	if w4 := do(a, "GET", "/a/x1.js.map", nil, ""); w4.Code != 404 {
		t.Error("source maps must never be served")
	}
}

func TestUniformNotFound(t *testing.T) {
	a := testApp(t)
	first := do(a, "GET", "/wp-admin", nil, "")
	for _, c := range []struct{ m, p string }{{"GET", "/.env"}, {"POST", "/"}, {"DELETE", "/a/x1.js"}, {"GET", "/index.html"}} {
		w := do(a, c.m, c.p, nil, "")
		if w.Code != 404 || w.Body.String() != first.Body.String() {
			t.Errorf("%s %s: got %d %q", c.m, c.p, w.Code, w.Body.String())
		}
	}
	w := do(a, "GET", "/api/nope", nil, "")
	if w.Code != 404 || !strings.Contains(w.Body.String(), `"error":"not_found"`) || w.Header().Get("Cache-Control") != "no-store" {
		t.Errorf("api 404: %d %s", w.Code, w.Body.String())
	}
}

func TestCrossSiteWritesRejected(t *testing.T) {
	a := testApp(t)
	json := map[string]string{"Content-Type": "application/json", "Origin": "https://game.example"}
	if w := do(a, "POST", "/api/anything", json, "{}"); w.Code != 404 {
		t.Errorf("same-origin JSON should reach routing, got %d", w.Code)
	}
	for name, hdr := range map[string]map[string]string{
		"other origin":     {"Content-Type": "application/json", "Origin": "https://evil.example"},
		"no origin":        {"Content-Type": "application/json"},
		"form post":        {"Content-Type": "application/x-www-form-urlencoded", "Origin": "https://game.example"},
		"cross-site fetch": {"Content-Type": "application/json", "Origin": "https://game.example", "Sec-Fetch-Site": "cross-site"},
	} {
		if w := do(a, "POST", "/api/anything", hdr, "{}"); w.Code != http.StatusForbidden {
			t.Errorf("%s: got %d, want 403", name, w.Code)
		}
	}
	if w := do(a, "GET", "/api/anything", map[string]string{"Sec-Fetch-Site": "cross-site"}, ""); w.Code != http.StatusForbidden {
		t.Errorf("cross-site read: got %d", w.Code)
	}
}

func TestClientKey(t *testing.T) {
	a := testApp(t)
	r := httptest.NewRequest("GET", "/", nil)
	r.RemoteAddr = "10.0.0.1:1234"
	r.Header.Set("X-Forwarded-For", "6.6.6.6")
	if got := a.clientKey(r); got != "10.0.0.1" {
		t.Errorf("X-Forwarded-For must be ignored, got %s", got)
	}
	r.Header.Set("CF-Connecting-IP", "203.0.113.7")
	if got := a.clientKey(r); got != "203.0.113.7" {
		t.Errorf("edge header: got %s", got)
	}
	r.Header.Set("CF-Connecting-IP", "2001:db8:1:2:aaaa::1")
	r2 := r.Clone(r.Context())
	r2.Header.Set("CF-Connecting-IP", "2001:db8:1:2:bbbb::9")
	if a.clientKey(r) != a.clientKey(r2) {
		t.Error("addresses in one IPv6 /64 must share a bucket")
	}
}

func TestRateLimit(t *testing.T) {
	l := newLimiter(60, 3)
	for i := 0; i < 3; i++ {
		if !l.allow("k") {
			t.Fatal("burst should pass")
		}
	}
	if l.allow("k") {
		t.Fatal("fourth call should be limited")
	}
	if !l.allow("other") {
		t.Fatal("other clients must not be affected")
	}
}

func TestReadJSONStrict(t *testing.T) {
	var v struct{ A int }
	for _, body := range []string{`{"A":1,"B":2}`, `{"A":1}{"A":2}`, `[1]`, ``} {
		r := httptest.NewRequest("POST", "/", strings.NewReader(body))
		if readJSON(r, &v) == nil {
			t.Errorf("accepted %q", body)
		}
	}
}
