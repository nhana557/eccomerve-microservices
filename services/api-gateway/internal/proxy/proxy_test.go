package proxy_test

import (
	"context"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	"ecommerce-platform/packages/shared-go/telemetry"
	"ecommerce-platform/services/api-gateway/internal/proxy"
	"go.opentelemetry.io/otel"
)

func TestProxyPropagatesW3CTraceParent(t *testing.T) {
	os.Setenv("OTEL_EXPORTER_OTLP_ENDPOINT", "none")
	defer os.Unsetenv("OTEL_EXPORTER_OTLP_ENDPOINT")

	ctx := context.Background()
	cleanup, _ := telemetry.InitTracer(ctx, "gateway-test")
	defer cleanup(ctx)

	var downstreamTraceParent string
	backendServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		downstreamTraceParent = r.Header.Get("traceparent")
		w.WriteHeader(http.StatusOK)
	}))
	defer backendServer.Close()

	proxyHandler, err := proxy.NewReverseProxy(backendServer.URL, "test-target")
	if err != nil {
		t.Fatalf("failed to create proxy: %v", err)
	}

	tracer := otel.GetTracerProvider().Tracer("gateway-test")
	reqCtx, span := tracer.Start(ctx, "gateway-ingress")
	defer span.End()

	req := httptest.NewRequest(http.MethodGet, "/test", nil).WithContext(reqCtx)
	rec := httptest.NewRecorder()

	proxyHandler.ServeHTTP(rec, req)

	expectedTraceID := span.SpanContext().TraceID().String()
	if downstreamTraceParent == "" {
		t.Fatal("expected downstream traceparent header to be present")
	}
	if !strings.Contains(downstreamTraceParent, expectedTraceID) {
		t.Fatalf("expected downstream traceparent to contain trace ID %s, got %s", expectedTraceID, downstreamTraceParent)
	}
}

func TestProxyErrorHandlerRecordsSpanErrorOnUnreachableBackend(t *testing.T) {
	os.Setenv("OTEL_EXPORTER_OTLP_ENDPOINT", "none")
	defer os.Unsetenv("OTEL_EXPORTER_OTLP_ENDPOINT")

	ctx := context.Background()
	cleanup, _ := telemetry.InitTracer(ctx, "gateway-err-test")
	defer cleanup(ctx)

	// Target port that is not running
	proxyHandler, err := proxy.NewReverseProxy("http://127.0.0.1:59999", "auth-service")
	if err != nil {
		t.Fatalf("failed to create proxy: %v", err)
	}

	tracer := otel.GetTracerProvider().Tracer("gateway-err-test")
	reqCtx, span := tracer.Start(ctx, "POST /api/v1/auth/sync")
	defer span.End()

	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/sync", nil).WithContext(reqCtx)
	rec := httptest.NewRecorder()

	proxyHandler.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadGateway {
		t.Fatalf("expected 502 Bad Gateway, got %d: %s", rec.Code, rec.Body.String())
	}
	if !strings.Contains(rec.Body.String(), "auth-service is unavailable or unreachable") {
		t.Fatalf("expected error message in body, got %s", rec.Body.String())
	}
}
