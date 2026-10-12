package proxy

import (
	"fmt"
	"net/http"
	"net/http/httputil"
	"net/url"

	"ecommerce-platform/packages/shared-go/logger"
	"ecommerce-platform/packages/shared-go/response"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/propagation"
	"go.opentelemetry.io/otel/trace"
)

func NewReverseProxy(targetURL string, serviceName string) (http.Handler, error) {
	target, err := url.Parse(targetURL)
	if err != nil {
		return nil, err
	}

	proxy := httputil.NewSingleHostReverseProxy(target)
	originalDirector := proxy.Director
	proxy.Director = func(req *http.Request) {
		originalDirector(req)
		// Inject active OpenTelemetry W3C trace context into downstream headers
		otel.GetTextMapPropagator().Inject(req.Context(), propagation.HeaderCarrier(req.Header))
	}

	proxy.ModifyResponse = func(resp *http.Response) error {
		// Strip any upstream CORS headers to avoid conflicting/duplicate headers with Gateway CORS
		resp.Header.Del("Access-Control-Allow-Origin")
		resp.Header.Del("Access-Control-Allow-Credentials")
		resp.Header.Del("Access-Control-Allow-Methods")
		resp.Header.Del("Access-Control-Allow-Headers")
		resp.Header.Del("Access-Control-Expose-Headers")
		return nil
	}

	proxy.ErrorHandler = func(w http.ResponseWriter, r *http.Request, e error) {
		errMsg := fmt.Sprintf("Service %s is unavailable or unreachable: %v", serviceName, e)
		span := trace.SpanFromContext(r.Context())
		if span.SpanContext().IsValid() {
			span.RecordError(e)
			span.SetStatus(codes.Error, errMsg)
			span.SetAttributes(
				attribute.String("error.message", errMsg),
				attribute.String("message", errMsg),
				attribute.String("service.target", serviceName),
			)
			span.AddEvent("proxy.error", trace.WithAttributes(
				attribute.String("error.message", errMsg),
				attribute.String("service.target", serviceName),
			))
		}
		logger.New("api-gateway").ErrorContext(r.Context(), errMsg,
			"service_target", serviceName,
			"error", e.Error(),
		)
		response.Error(
			w,
			http.StatusBadGateway,
			"BAD_GATEWAY",
			errMsg,
			"api-gateway",
		)
	}

	return proxy, nil
}
