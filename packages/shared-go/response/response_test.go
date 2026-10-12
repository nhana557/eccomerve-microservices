package response_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"ecommerce-platform/packages/shared-go/response"
)

func TestJSON(t *testing.T) {
	w := httptest.NewRecorder()
	payload := map[string]string{"foo": "bar"}
	response.JSON(w, http.StatusOK, payload, "test-service")

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
	if res.Meta.Service != "test-service" {
		t.Errorf("expected service test-service, got %s", res.Meta.Service)
	}
}

func TestError(t *testing.T) {
	w := httptest.NewRecorder()
	response.Error(w, http.StatusBadRequest, "INVALID_INPUT", "Input validation failed", "test-service")

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected status %d, got %d", http.StatusBadRequest, w.Code)
	}

	var res response.Envelope
	if err := json.Unmarshal(w.Body.Bytes(), &res); err != nil {
		t.Fatalf("failed to parse json: %v", err)
	}

	if res.Success {
		t.Errorf("expected success false, got true")
	}
	if res.Error == nil || res.Error.Code != "INVALID_INPUT" {
		t.Errorf("expected error code INVALID_INPUT, got %v", res.Error)
	}
}
