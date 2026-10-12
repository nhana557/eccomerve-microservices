package middleware

import (
	"fmt"
	"net/http"
	"time"
)

type responseWriterWrapper struct {
	http.ResponseWriter
	statusCode  int
	wroteHeader bool
	startTime   time.Time
}

func (rw *responseWriterWrapper) WriteHeader(code int) {
	if !rw.wroteHeader {
		duration := time.Since(rw.startTime)
		rw.Header().Set("X-Response-Time", fmt.Sprintf("%dms", duration.Milliseconds()))
		rw.statusCode = code
		rw.wroteHeader = true
		rw.ResponseWriter.WriteHeader(code)
	}
}

func (rw *responseWriterWrapper) Write(b []byte) (int, error) {
	if !rw.wroteHeader {
		rw.WriteHeader(http.StatusOK)
	}
	return rw.ResponseWriter.Write(b)
}

func ResponseTime(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		wrapped := &responseWriterWrapper{
			ResponseWriter: w,
			statusCode:     http.StatusOK,
			startTime:      start,
		}
		next.ServeHTTP(wrapped, r)
	})
}
