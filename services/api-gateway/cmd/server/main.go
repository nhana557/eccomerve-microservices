package main

import (
	"context"
	"fmt"
	"net/http"

	"ecommerce-platform/packages/shared-go/config"
	"ecommerce-platform/packages/shared-go/logger"
	"ecommerce-platform/packages/shared-go/metrics"
	"ecommerce-platform/packages/shared-go/telemetry"
	"ecommerce-platform/services/api-gateway/internal/handler"
	"ecommerce-platform/services/api-gateway/internal/middleware"
	"ecommerce-platform/services/api-gateway/internal/proxy"
)

const serviceName = "api-gateway"

func main() {
	log := logger.New(serviceName)
	port := config.GetEnv("PORT", "8080")
	metrics.Init(serviceName)

	cleanup, _ := telemetry.InitTracer(context.Background(), serviceName)
	defer cleanup(context.Background())

	authTarget := config.GetEnv("AUTH_SERVICE_URL", "http://localhost:8081")
	productTarget := config.GetEnv("PRODUCT_SERVICE_URL", "http://localhost:8082")
	orderTarget := config.GetEnv("ORDER_SERVICE_URL", "http://localhost:8083")
	paymentTarget := config.GetEnv("PAYMENT_SERVICE_URL", "http://localhost:8084")

	servicesMap := map[string]string{
		"auth-service":    authTarget,
		"product-service": productTarget,
		"order-service":   orderTarget,
		"payment-service": paymentTarget,
	}

	mux := http.NewServeMux()
	mux.Handle("/metrics", metrics.Handler())

	healthH := handler.NewHealthHandler(serviceName, servicesMap)
	mux.Handle("/health", healthH)
	mux.Handle("/api/v1/health", healthH)

	authProxy, _ := proxy.NewReverseProxy(authTarget, "auth-service")
	mux.Handle("/api/v1/auth/", authProxy)
	mux.Handle("/api/v1/users", authProxy)
	mux.Handle("/api/v1/users/", authProxy)

	productProxy, _ := proxy.NewReverseProxy(productTarget, "product-service")
	mux.Handle("/api/v1/products", productProxy)
	mux.Handle("/api/v1/products/", productProxy)
	mux.Handle("/api/v1/categories", productProxy)
	mux.Handle("/api/v1/categories/", productProxy)

	jwtSecret := config.GetEnv("JWT_SECRET", "super-secret-key-tokopedia-dark-edition-2026")
	clerkPublicKey := config.GetEnv("CLERK_PEM_PUBLIC_KEY", "")

	orderProxy, _ := proxy.NewReverseProxy(orderTarget, "order-service")
	mux.Handle("/api/v1/orders", orderProxy)
	mux.Handle("/api/v1/orders/", orderProxy)
	mux.Handle("/api/v1/cart", orderProxy)
	mux.Handle("/api/v1/cart/", orderProxy)
	mux.Handle("/api/v1/promos", orderProxy)
	mux.Handle("/api/v1/promos/", orderProxy)

	paymentProxy, _ := proxy.NewReverseProxy(paymentTarget, "payment-service")
	mux.Handle("/api/v1/payments", paymentProxy)
	mux.Handle("/api/v1/payments/", paymentProxy)

	handlerWithAuth := middleware.DualEngineAuth(jwtSecret, clerkPublicKey)(mux)
	handlerWithCORS := middleware.CORS(handlerWithAuth)
	handlerWithMetrics := middleware.ResponseTime(handlerWithCORS)
	handlerWithTelemetry := telemetry.HTTPMiddleware(serviceName)(handlerWithMetrics)

	addr := fmt.Sprintf(":%s", port)
	log.Info("API Gateway running", "addr", addr)
	if err := http.ListenAndServe(addr, handlerWithTelemetry); err != nil {
		log.Error("API Gateway stopped", "error", err)
	}
}
