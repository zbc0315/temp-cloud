package main

import (
	"context"
	"encoding/base64"
	"log"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// base64Encode encodes raw bytes for inline data URLs.
func base64Encode(raw []byte) string {
	return base64.StdEncoding.EncodeToString(raw)
}

// urlEscape escapes a value for use inside an RFC 5987 filename* parameter.
func urlEscape(value string) string {
	return url.PathEscape(value)
}

func contextWithTimeout(d time.Duration) (context.Context, context.CancelFunc) {
	return context.WithTimeout(context.Background(), d)
}

// statusRecorder captures the response status for access logging.
type statusRecorder struct {
	http.ResponseWriter
	status int
	bytes  int
}

func (r *statusRecorder) WriteHeader(code int) {
	r.status = code
	r.ResponseWriter.WriteHeader(code)
}

func (r *statusRecorder) Write(p []byte) (int, error) {
	if r.status == 0 {
		r.status = http.StatusOK
	}
	n, err := r.ResponseWriter.Write(p)
	r.bytes += n
	return n, err
}

// requestLogger emits one access log line per request. UGOS Pro captures the
// process stdout/stderr into the application log directory.
func requestLogger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		started := time.Now()
		rec := &statusRecorder{ResponseWriter: w}
		next.ServeHTTP(rec, r)
		if rec.status == 0 {
			rec.status = http.StatusOK
		}
		log.Printf("%s %s %d %dB %s", r.Method, r.URL.Path, rec.status, rec.bytes, time.Since(started).Round(time.Millisecond))
	})
}

// cacheControl keeps the HTML shell revalidated while allowing static assets to
// be cached briefly.
func cacheControl(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.HasSuffix(r.URL.Path, ".html") || r.URL.Path == "/" {
			w.Header().Set("Cache-Control", "no-cache")
		} else {
			w.Header().Set("Cache-Control", "public, max-age=300")
		}
		next.ServeHTTP(w, r)
	})
}
