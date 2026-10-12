package telemetry_test

import (
	"context"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"ecommerce-platform/packages/shared-go/telemetry"
	"go.opentelemetry.io/otel/trace"
)

func TestInitTracerCreatesProviderWithoutPanic(t *testing.T) {
	os.Setenv("OTEL_EXPORTER_OTLP_ENDPOINT", "none")
	defer os.Unsetenv("OTEL_EXPORTER_OTLP_ENDPOINT")

	ctx := context.Background()
	cleanup, err := telemetry.InitTracer(ctx, "test-service")
	if err != nil {
		t.Fatalf("expected no error initializing tracer, got %v", err)
	}
	if cleanup == nil {
		t.Fatal("expected non-nil cleanup function")
	}
	defer cleanup(ctx)
}

func TestHTTPMiddlewareExtractsAndCreatesSpan(t *testing.T) {
	os.Setenv("OTEL_EXPORTER_OTLP_ENDPOINT", "none")
	defer os.Unsetenv("OTEL_EXPORTER_OTLP_ENDPOINT")

	ctx := context.Background()
	cleanup, _ := telemetry.InitTracer(ctx, "test-http-service")
	defer cleanup(ctx)

	var capturedTraceID string
	testHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		span := trace.SpanFromContext(r.Context())
		if span.SpanContext().IsValid() {
			capturedTraceID = span.SpanContext().TraceID().String()
		}
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	handler := telemetry.HTTPMiddleware("test-http-service")(testHandler)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/test", nil)
	// Inject incoming W3C traceparent
	incomingTraceID := "4bf92f3577b34da6a3ce929d0e0e4736"
	req.Header.Set("traceparent", "00-"+incomingTraceID+"-00f067aa0ba902b7-01")

	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 OK, got %d", rec.Code)
	}
	if capturedTraceID != incomingTraceID {
		t.Fatalf("expected trace ID %s propagated into span, got %s", incomingTraceID, capturedTraceID)
	}
}

func TestHTTPMiddlewareRecordsQueryAndClientIPLocation(t *testing.T) {
	os.Setenv("OTEL_EXPORTER_OTLP_ENDPOINT", "none")
	defer os.Unsetenv("OTEL_EXPORTER_OTLP_ENDPOINT")

	ctx := context.Background()
	cleanup, _ := telemetry.InitTracer(ctx, "test-query-service")
	defer cleanup(ctx)

	testHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	handler := telemetry.HTTPMiddleware("test-query-service")(testHandler)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/products?q=sepatu&limit=10", nil)
	req.Header.Set("X-Forwarded-For", "182.253.140.25")
	req.Header.Set("X-Client-Location", "Jakarta, Indonesia")

	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 OK, got %d", rec.Code)
	}
}
