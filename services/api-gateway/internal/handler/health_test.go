package handler_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"ecommerce-platform/packages/shared-go/response"
	"ecommerce-platform/services/api-gateway/internal/handler"
)

func TestGatewayHealth(t *testing.T) {
	h := handler.NewHealthHandler("api-gateway", map[string]string{})
	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	w := httptest.NewRecorder()

	h.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d", http.StatusOK, w.Code)
	}

	var res response.Envelope
	if err := json.Unmarshal(w.Body.Bytes(), &res); err != nil {
		t.Fatalf("failed to parse json: %v", err)
	}
	if !res.Success {
		t.Errorf("expected success true, got false")
	}
}
