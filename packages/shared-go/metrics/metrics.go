package metrics

import (
	"fmt"
	"net/http"
	"regexp"
	"strconv"
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

var (
	httpRequestsTotal = prometheus.NewCounterVec(prometheus.CounterOpts{
		Name: "http_requests_total",
		Help: "Total HTTP requests processed",
	}, []string{"service", "method", "path", "status_code"})

	httpRequestDuration = prometheus.NewHistogramVec(prometheus.HistogramOpts{
		Name:    "http_request_duration_seconds",
		Help:    "HTTP request latency in seconds",
		Buckets: []float64{.005, .01, .025, .05, .1, .25, .5, 1, 2.5, 5, 8, 12, 15, 30},
	}, []string{"service", "method", "path"})

	httpRequestsInFlight = prometheus.NewGaugeVec(prometheus.GaugeOpts{
		Name: "http_requests_in_flight",
		Help: "Current number of HTTP requests being handled",
	}, []string{"service"})

	slowRequestsTotal = prometheus.NewCounterVec(prometheus.CounterOpts{
		Name: "http_slow_requests_total",
		Help: "Total HTTP requests exceeding latency thresholds (warning >8s, critical >12s)",
	}, []string{"service", "method", "path", "severity"})

	slowQueriesTotal = prometheus.NewCounterVec(prometheus.CounterOpts{
		Name: "db_slow_queries_total",
		Help: "Total database queries exceeding latency thresholds (warning >8s, critical >12s)",
	}, []string{"service", "severity"})

	// idPattern normalizes dynamic path segments (UUIDs, numeric IDs) to :id
	idPattern = regexp.MustCompile(`/[0-9a-fA-F]{8,}|/\d+`)
)

// Init registers all metrics with the default Prometheus registry.
func Init(serviceName string) {
	prometheus.MustRegister(
		httpRequestsTotal,
		httpRequestDuration,
		httpRequestsInFlight,
		slowRequestsTotal,
		slowQueriesTotal,
	)
	// Pre-initialize in-flight gauge so it shows up immediately
	httpRequestsInFlight.WithLabelValues(serviceName)
}

// Handler returns the Prometheus HTTP handler for the /metrics endpoint.
func Handler() http.Handler {
	return promhttp.Handler()
}

// Record increments request counter, observes latency, and decrements in-flight gauge.
func Record(serviceName, method, path string, statusCode int, duration time.Duration) {
	norm := NormalizePath(path)
	status := strconv.Itoa(statusCode)
	httpRequestsTotal.WithLabelValues(serviceName, method, norm, status).Inc()
	httpRequestDuration.WithLabelValues(serviceName, method, norm).Observe(duration.Seconds())
}

// RecordSlowRequest increments counter for requests exceeding latency thresholds (warning: >8s, critical: >12s).
func RecordSlowRequest(serviceName, method, path, severity string) {
	norm := NormalizePath(path)
	slowRequestsTotal.WithLabelValues(serviceName, method, norm, severity).Inc()
}

// RecordSlowQuery increments counter for database queries exceeding latency thresholds.
func RecordSlowQuery(serviceName, severity string) {
	if serviceName == "" {
		serviceName = "database"
	}
	slowQueriesTotal.WithLabelValues(serviceName, severity).Inc()
}

// TrackInFlight increments the in-flight gauge and returns a func to decrement it.
// Usage: defer metrics.TrackInFlight("my-service")()
func TrackInFlight(serviceName string) func() {
	httpRequestsInFlight.WithLabelValues(serviceName).Inc()
	return func() {
		httpRequestsInFlight.WithLabelValues(serviceName).Dec()
	}
}

// NormalizePath replaces UUID/numeric ID segments with :id to reduce cardinality.
func NormalizePath(path string) string {
	// Skip metrics endpoint itself
	if path == "/metrics" || path == "/health" {
		return path
	}
	result := idPattern.ReplaceAllStringFunc(path, func(s string) string {
		return fmt.Sprintf("/:id")
	})
	if result == "" {
		return path
	}
	return result
}
