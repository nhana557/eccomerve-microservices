package telemetry

import (
	"fmt"
	"net"
	"net/http"
	"strings"
	"time"

	"ecommerce-platform/packages/shared-go/logger"
	"ecommerce-platform/packages/shared-go/metrics"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/propagation"
	semconv "go.opentelemetry.io/otel/semconv/v1.26.0"
	"go.opentelemetry.io/otel/trace"
)

type statusRecorder struct {
	http.ResponseWriter
	statusCode int
}

func (r *statusRecorder) WriteHeader(code int) {
	r.statusCode = code
	r.ResponseWriter.WriteHeader(code)
}

func extractClientIP(r *http.Request) string {
	for _, header := range []string{"X-Forwarded-For", "X-Real-IP", "CF-Connecting-IP"} {
		val := strings.TrimSpace(r.Header.Get(header))
		if val != "" {
			parts := strings.Split(val, ",")
			return strings.TrimSpace(parts[0])
		}
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err == nil && host != "" {
		return host
	}
	return r.RemoteAddr
}

func extractClientLocation(r *http.Request, clientIP string) string {
	if loc := strings.TrimSpace(r.Header.Get("X-Client-Location")); loc != "" {
		return loc
	}
	country := strings.TrimSpace(r.Header.Get("CF-IPCountry"))
	if country == "" {
		country = strings.TrimSpace(r.Header.Get("X-Vercel-IP-Country"))
	}
	city := strings.TrimSpace(r.Header.Get("CF-IPCity"))
	if city == "" {
		city = strings.TrimSpace(r.Header.Get("X-Vercel-IP-City"))
	}
	if city != "" && country != "" {
		return fmt.Sprintf("%s, %s", city, country)
	}
	if country != "" {
		return country
	}

	if clientIP == "127.0.0.1" || clientIP == "::1" || strings.HasPrefix(clientIP, "192.168.") || strings.HasPrefix(clientIP, "10.") || strings.HasPrefix(clientIP, "172.") {
		return "Localhost / Internal (ID)"
	}
	return "Indonesia"
}

func HTTPMiddleware(serviceName string) func(http.Handler) http.Handler {
	tracer := otel.GetTracerProvider().Tracer(serviceName)
	propagator := otel.GetTextMapPropagator()
	log := logger.New(serviceName)

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Skip telemetry for scrape/health endpoints to avoid log spam
			if r.URL.Path == "/metrics" || r.URL.Path == "/health" || r.URL.Path == "/api/v1/health" {
				next.ServeHTTP(w, r)
				return
			}

			start := time.Now()
			ctx := propagator.Extract(r.Context(), propagation.HeaderCarrier(r.Header))

			defer metrics.TrackInFlight(serviceName)()

			clientIP := extractClientIP(r)
			clientLocation := extractClientLocation(r, clientIP)
			rawQuery := r.URL.RawQuery
			fullURI := r.URL.RequestURI()

			spanName := fmt.Sprintf("%s %s", r.Method, r.URL.Path)
			spanAttrs := []attribute.KeyValue{
				semconv.HTTPRequestMethodKey.String(r.Method),
				semconv.URLPathKey.String(r.URL.Path),
				semconv.ClientAddressKey.String(clientIP),
				attribute.String("service.name", serviceName),
				attribute.String("method", r.Method),
				attribute.String("fullUrl", fullURI),
				attribute.String("url.full", fullURI),
				attribute.String("client.ip", clientIP),
				attribute.String("client.location", clientLocation),
			}
			if userAgent := r.UserAgent(); userAgent != "" {
				spanAttrs = append(spanAttrs, attribute.String("user_agent", userAgent))
			}
			if userID := r.Header.Get("X-User-Id"); userID != "" {
				spanAttrs = append(spanAttrs, attribute.String("user.id", userID))
			}
			if userRole := r.Header.Get("X-User-Role"); userRole != "" {
				spanAttrs = append(spanAttrs, attribute.String("user.role", userRole))
			}
			if rawQuery != "" {
				spanAttrs = append(spanAttrs,
					attribute.String("url.query", rawQuery),
					attribute.String("query", rawQuery),
				)
			}

			ctx, span := tracer.Start(ctx, spanName,
				trace.WithSpanKind(trace.SpanKindServer),
				trace.WithAttributes(spanAttrs...),
			)
			defer span.End()

			// Log saat request masuk (ringkas: method dan fullUrl)
			log.InfoContext(ctx, fmt.Sprintf("Incoming: %s %s", r.Method, fullURI),
				"method", r.Method,
				"fullUrl", fullURI,
			)

			rec := &statusRecorder{ResponseWriter: w, statusCode: http.StatusOK}
			next.ServeHTTP(rec, r.WithContext(ctx))

			duration := time.Since(start)
			metrics.Record(serviceName, r.Method, r.URL.Path, rec.statusCode, duration)
			outMsg := fmt.Sprintf("Completed: %s %s - %d (%s)", r.Method, fullURI, rec.statusCode, duration.Round(time.Millisecond))

			// Span Attributes di Jaeger dibuat sangat lengkap (deep diagnostics)
			spanAttrsToSet := []attribute.KeyValue{
				semconv.HTTPResponseStatusCodeKey.Int(rec.statusCode),
				attribute.Int("statusCode", rec.statusCode),
				attribute.Int("status_code", rec.statusCode),
				attribute.String("method", r.Method),
				attribute.String("fullUrl", fullURI),
				attribute.String("message", outMsg),
				attribute.Int64("duration_ms", duration.Milliseconds()),
				attribute.Int64("http.duration_ms", duration.Milliseconds()),
			}
			if rawQuery != "" {
				spanAttrsToSet = append(spanAttrsToSet, attribute.String("query", rawQuery))
			}
			span.SetAttributes(spanAttrsToSet...)

			span.AddEvent("http.request.completed", trace.WithAttributes(
				attribute.String("message", outMsg),
				attribute.Int("statusCode", rec.statusCode),
				attribute.Int64("duration_ms", duration.Milliseconds()),
				attribute.String("fullUrl", fullURI),
				attribute.String("client.location", clientLocation),
			))

			// Log di Loki dibuat ringkas sesuai permintaan user: statusCode, method, fullUrl
			outAttrs := []any{
				"statusCode", rec.statusCode,
				"method", r.Method,
				"fullUrl", fullURI,
			}

			// Deteksi slow API response: > 5s warning (kuning/WARN), > 8s critical (merah/ERROR)
			if duration >= 8*time.Second {
				slowMsg := fmt.Sprintf("[SLOW API CRITICAL > 8s] %s", outMsg)
				span.SetStatus(codes.Error, "Latency exceeded critical threshold (8s)")
				span.SetAttributes(
					attribute.Bool("slow_request", true),
					attribute.String("slow_severity", "critical"),
					attribute.Int64("latency_ms", duration.Milliseconds()),
				)
				metrics.RecordSlowRequest(serviceName, r.Method, r.URL.Path, "critical")
				log.ErrorContext(ctx, slowMsg, outAttrs...)
			} else if duration >= 5*time.Second {
				slowMsg := fmt.Sprintf("[SLOW API WARNING > 5s] %s", outMsg)
				span.SetAttributes(
					attribute.Bool("slow_request", true),
					attribute.String("slow_severity", "warning"),
					attribute.Int64("latency_ms", duration.Milliseconds()),
				)
				metrics.RecordSlowRequest(serviceName, r.Method, r.URL.Path, "warning")
				log.WarnContext(ctx, slowMsg, outAttrs...)
			} else if rec.statusCode >= 500 {
				statusDesc := fmt.Sprintf("HTTP %d: %s", rec.statusCode, http.StatusText(rec.statusCode))
				span.SetStatus(codes.Error, statusDesc)
				span.SetAttributes(
					attribute.String("error.message", outMsg),
					attribute.String("error.type", fmt.Sprintf("HTTP %d", rec.statusCode)),
				)
				span.RecordError(fmt.Errorf("%s", outMsg))
				log.ErrorContext(ctx, outMsg, outAttrs...)
			} else if rec.statusCode >= 400 {
				span.SetStatus(codes.Ok, "")
				span.SetAttributes(
					attribute.String("error.message", outMsg),
					attribute.String("error.type", fmt.Sprintf("HTTP %d", rec.statusCode)),
				)
				log.WarnContext(ctx, outMsg, outAttrs...)
			} else {
				span.SetStatus(codes.Ok, "")
				log.InfoContext(ctx, outMsg, outAttrs...)
			}
		})
	}
}
