package telemetry

import (
	"context"
	"os"
	"strings"
	"time"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
	"go.opentelemetry.io/otel/propagation"
	"go.opentelemetry.io/otel/sdk/resource"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	semconv "go.opentelemetry.io/otel/semconv/v1.26.0"
	"google.golang.org/grpc/credentials/insecure"
)

// InitTracer initializes an OTLP gRPC tracer provider with non-blocking graceful fallback.
func InitTracer(ctx context.Context, serviceName string) (func(context.Context) error, error) {
	endpoint := os.Getenv("OTEL_EXPORTER_OTLP_ENDPOINT")
	if endpoint == "disabled" || endpoint == "none" {
		res, _ := resource.New(ctx, resource.WithAttributes(semconv.ServiceNameKey.String(serviceName)))
		tp := sdktrace.NewTracerProvider(sdktrace.WithResource(res))
		otel.SetTracerProvider(tp)
		otel.SetTextMapPropagator(propagation.NewCompositeTextMapPropagator(
			propagation.TraceContext{},
			propagation.Baggage{},
		))
		return func(shutdownCtx context.Context) error { return tp.Shutdown(shutdownCtx) }, nil
	}

	if endpoint == "" {
		endpoint = "localhost:4317"
	}
	endpoint = strings.TrimPrefix(endpoint, "http://")
	endpoint = strings.TrimPrefix(endpoint, "https://")

	res, err := resource.New(ctx,
		resource.WithAttributes(
			semconv.ServiceNameKey.String(serviceName),
		),
	)
	if err != nil {
		res = resource.Default()
	}

	ctxConn, cancelConn := context.WithTimeout(ctx, 1*time.Second)
	defer cancelConn()

	exporter, err := otlptracegrpc.New(ctxConn,
		otlptracegrpc.WithEndpoint(endpoint),
		otlptracegrpc.WithTLSCredentials(insecure.NewCredentials()),
	)

	var tp *sdktrace.TracerProvider
	if err != nil {
		// Non-blocking graceful fallback when OTLP collector is offline
		tp = sdktrace.NewTracerProvider(sdktrace.WithResource(res))
	} else {
		tp = sdktrace.NewTracerProvider(
			sdktrace.WithBatcher(exporter, sdktrace.WithBatchTimeout(500*time.Millisecond)),
			sdktrace.WithResource(res),
		)
	}

	otel.SetTracerProvider(tp)
	otel.SetTextMapPropagator(propagation.NewCompositeTextMapPropagator(
		propagation.TraceContext{},
		propagation.Baggage{},
	))

	cleanup := func(shutdownCtx context.Context) error {
		return tp.Shutdown(shutdownCtx)
	}

	return cleanup, nil
}
