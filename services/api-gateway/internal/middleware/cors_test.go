package middleware_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"ecommerce-platform/services/api-gateway/internal/middleware"
)

func TestCORSPreflight(t *testing.T) {
	nextHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	cors := middleware.CORS(nextHandler)

	req := httptest.NewRequest(http.MethodOptions, "/api/v1/products", nil)
	req.Header.Set("Origin", "http://localhost:3000")
	w := httptest.NewRecorder()

	cors.ServeHTTP(w, req)

	if w.Code != http.StatusNoContent {
		t.Errorf("expected preflight 204, got %d", w.Code)
	}
	if w.Header().Get("Access-Control-Allow-Origin") != "*" && w.Header().Get("Access-Control-Allow-Origin") != "http://localhost:3000" {
		t.Errorf("missing or invalid allow origin header")
	}
}
