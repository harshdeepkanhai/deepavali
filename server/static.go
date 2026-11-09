package main

import (
	"bytes"
	"compress/gzip"
	"crypto/sha256"
	"encoding/hex"
	"io/fs"
	"mime"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
)

// asset is a built file held in memory with a precomputed gzip copy and ETag.
type asset struct {
	body, gz  []byte
	ctype     string
	etag      string
	immutable bool // content-hashed file names never change, so they can be cached forever
}

var extraTypes = map[string]string{
	".js":          "text/javascript; charset=utf-8",
	".mjs":         "text/javascript; charset=utf-8",
	".css":         "text/css; charset=utf-8",
	".html":        "text/html; charset=utf-8",
	".svg":         "image/svg+xml",
	".json":        "application/json",
	".webmanifest": "application/manifest+json",
	".glb":         "model/gltf-binary",
	".gltf":        "model/gltf+json",
	".webp":        "image/webp",
	".txt":         "text/plain; charset=utf-8",
}

func loadStatic(dir string) (map[string]*asset, error) {
	files := map[string]*asset{}
	err := filepath.WalkDir(dir, func(p string, d fs.DirEntry, err error) error {
		if err != nil || d.IsDir() {
			return err
		}
		rel, err := filepath.Rel(dir, p)
		if err != nil {
			return err
		}
		ext := strings.ToLower(filepath.Ext(p))
		if ext == ".map" || ext == ".gz" || strings.HasPrefix(d.Name(), ".") {
			return nil // never publish source maps or hidden files
		}
		b, err := os.ReadFile(p)
		if err != nil {
			return err
		}
		ct := extraTypes[ext]
		if ct == "" {
			ct = mime.TypeByExtension(ext)
		}
		if ct == "" {
			ct = "application/octet-stream"
		}
		sum := sha256.Sum256(b)
		url := "/" + filepath.ToSlash(rel)
		f := &asset{body: b, ctype: ct, etag: hex.EncodeToString(sum[:10]), immutable: strings.HasPrefix(url, "/a/")}
		if compressible(ct) && len(b) > 512 {
			var buf bytes.Buffer
			zw, _ := gzip.NewWriterLevel(&buf, gzip.BestCompression)
			_, _ = zw.Write(b)
			_ = zw.Close()
			if buf.Len() < len(b) {
				f.gz = buf.Bytes()
			}
		}
		files[url] = f
		return nil
	})
	if idx := files["/index.html"]; idx != nil {
		files["/"] = idx
		delete(files, "/index.html")
	}
	return files, err
}

func compressible(ct string) bool {
	return strings.HasPrefix(ct, "text/") || strings.Contains(ct, "javascript") ||
		strings.Contains(ct, "json") || strings.Contains(ct, "svg") || strings.Contains(ct, "gltf+json")
}

func (a *app) serveStatic(w http.ResponseWriter, r *http.Request) {
	f := a.files[r.URL.Path]
	if f == nil || (r.Method != http.MethodGet && r.Method != http.MethodHead) {
		a.notFoundPage(w)
		return
	}
	h := w.Header()
	h.Set("Content-Type", f.ctype)
	h.Set("Vary", "Accept-Encoding")
	if f.immutable {
		h.Set("Cache-Control", "public, max-age=31536000, immutable")
	} else {
		h.Set("Cache-Control", "no-cache")
	}
	body, etag := f.body, `"`+f.etag+`"`
	if f.gz != nil && acceptsGzip(r) {
		body, etag = f.gz, `"`+f.etag+`-z"` // a different encoding needs a different strong ETag
		h.Set("Content-Encoding", "gzip")
	}
	h.Set("ETag", etag)
	if inm := r.Header.Get("If-None-Match"); inm != "" && strings.Contains(inm, etag) {
		w.WriteHeader(http.StatusNotModified)
		return
	}
	h.Set("Content-Length", strconv.Itoa(len(body)))
	w.WriteHeader(http.StatusOK)
	if r.Method == http.MethodGet {
		_, _ = w.Write(body)
	}
}

func acceptsGzip(r *http.Request) bool {
	for _, part := range strings.Split(r.Header.Get("Accept-Encoding"), ",") {
		name, params, _ := strings.Cut(strings.TrimSpace(part), ";")
		if strings.EqualFold(strings.TrimSpace(name), "gzip") {
			if q, ok := strings.CutPrefix(strings.TrimSpace(params), "q="); ok {
				v, err := strconv.ParseFloat(strings.TrimSpace(q), 64)
				return err == nil && v > 0
			}
			return true
		}
	}
	return false
}

// notFoundPage is the same short page for every unknown path and method.
func (a *app) notFoundPage(w http.ResponseWriter) {
	h := w.Header()
	h.Set("Content-Type", "text/html; charset=utf-8")
	h.Set("Cache-Control", "no-store")
	w.WriteHeader(http.StatusNotFound)
	_, _ = w.Write([]byte("<!doctype html><meta charset=\"utf-8\"><title>Not found</title><p>Not found.</p>\n"))
}
