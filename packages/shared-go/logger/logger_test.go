package logger_test

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"ecommerce-platform/packages/shared-go/logger"
	"ecommerce-platform/packages/shared-go/telemetry"
	"go.opentelemetry.io/otel"
)

func TestLoggerInjectsTraceAndSpanID(t *testing.T) {
	os.Setenv("OTEL_EXPORTER_OTLP_ENDPOINT", "none")
	os.Setenv("LOKI_URL", "none")
	defer os.Unsetenv("OTEL_EXPORTER_OTLP_ENDPOINT")
	defer os.Unsetenv("LOKI_URL")

	ctx := context.Background()
	cleanup, _ := telemetry.InitTracer(ctx, "log-test-service")
	defer cleanup(ctx)

	var buf bytes.Buffer
	log := logger.NewWithWriter("log-test-service", &buf)

	tracer := otel.GetTracerProvider().Tracer("log-test-service")
	ctx, span := tracer.Start(ctx, "test-span")
	defer span.End()

	log.InfoContext(ctx, "Testing correlated log message", "order_id", "ord-123")

	var logData map[string]interface{}
	if err := json.Unmarshal(buf.Bytes(), &logData); err != nil {
		t.Fatalf("failed to parse JSON log: %v", err)
	}

	expectedTraceID := span.SpanContext().TraceID().String()
	expectedSpanID := span.SpanContext().SpanID().String()

	if logData["trace_id"] != expectedTraceID {
		t.Fatalf("expected trace_id %s in log, got %v", expectedTraceID, logData["trace_id"])
	}
	if logData["span_id"] != expectedSpanID {
		t.Fatalf("expected span_id %s in log, got %v", expectedSpanID, logData["span_id"])
	}
}

func TestLoggerPushesToLoki(t *testing.T) {
	var receivedPayload map[string]interface{}
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/loki/api/v1/push" {
			_ = json.NewDecoder(r.Body).Decode(&receivedPayload)
			w.WriteHeader(http.StatusNoContent)
		}
	}))
	defer server.Close()

	os.Setenv("LOKI_URL", server.URL)
	defer os.Unsetenv("LOKI_URL")

	var buf bytes.Buffer
	log := logger.NewWithWriter("test-loki-service", &buf)
	log.Info("Hello Loki from Go")

	// Wait briefly for background flush
	time.Sleep(300 * time.Millisecond)

	if receivedPayload == nil {
		t.Fatal("expected log payload to be pushed to Loki test server")
	}
}
