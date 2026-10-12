package middleware_test

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"ecommerce-platform/services/api-gateway/internal/middleware"
)

func TestResponseTimeMiddleware(t *testing.T) {
	nextHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(10 * time.Millisecond)
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("ok"))
	})

	handler := middleware.ResponseTime(nextHandler)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/products", nil)
	w := httptest.NewRecorder()

	handler.ServeHTTP(w, req)

	headerVal := w.Header().Get("X-Response-Time")
	if headerVal == "" {
		t.Fatal("expected X-Response-Time header to be set")
	}
	if !strings.HasSuffix(headerVal, "ms") {
		t.Errorf("expected header to end with 'ms', got %s", headerVal)
	}
}
