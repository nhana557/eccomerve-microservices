package main

import (
	"context"
	"fmt"
	"net/http"
	"strings"

	"ecommerce-platform/packages/shared-go/config"
	"ecommerce-platform/packages/shared-go/database"
	"ecommerce-platform/packages/shared-go/logger"
	"ecommerce-platform/packages/shared-go/metrics"
	"ecommerce-platform/packages/shared-go/telemetry"
	"ecommerce-platform/services/payment-service/internal/event"
	"ecommerce-platform/services/payment-service/internal/handler"
	"ecommerce-platform/services/payment-service/internal/infrastructure/entity"
	"ecommerce-platform/services/payment-service/internal/infrastructure/repository"
)

const serviceName = "payment-service"

func main() {
	log := logger.New(serviceName)
	port := config.GetEnv("PORT", "8084")
	metrics.Init(serviceName)

	cleanup, _ := telemetry.InitTracer(context.Background(), serviceName)
	defer cleanup(context.Background())

	dbHost := config.GetEnv("DB_HOST", "localhost")
	dbPort := config.GetEnv("DB_PORT", "6433")
	dbUser := config.GetEnv("DB_USER", "postgres")
	dbPass := config.GetEnv("DB_PASSWORD", "postgrespassword")
	dbName := config.GetEnv("DB_NAME", "payment_db")
	dbSSL := config.GetEnv("DB_SSLMODE", "disable")

	db, err := database.NewPostgresDB(database.Config{
		Host:     dbHost,
		Port:     dbPort,
		User:     dbUser,
		Password: dbPass,
		DBName:      dbName,
		SSLMode:     dbSSL,
		ServiceName: serviceName,
	})

	var paymentHandler *handler.PaymentHandler
	if err != nil {
		log.Warn("Failed to connect to PostgreSQL (running in degraded mode)", "error", err)
	} else {
		if err := db.AutoMigrate(&entity.Payment{}); err != nil {
			log.Error("Failed to auto-migrate database schema", "error", err)
		} else {
			log.Info("Database auto-migration completed successfully")
		}
		repo := repository.NewGormPaymentRepository(db)

		amqpURL := config.GetEnv("RABBITMQ_URL", "amqp://guest:guest@localhost:5672/")
		producer, err := event.NewAmqpPaymentProducer(amqpURL)
		if err != nil {
			log.Warn("Failed to connect to RabbitMQ (running in degraded mode)", "error", err)
			paymentHandler = handler.NewPaymentHandler(repo)
		} else {
			log.Info("Connected to RabbitMQ topic exchange ecommerce.events")
			defer producer.Close()
			paymentHandler = handler.NewPaymentHandlerWithProducer(repo, producer)
		}
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/health", handler.HealthHandler(serviceName))
	mux.HandleFunc("/api/v1/health", handler.HealthHandler(serviceName))
	mux.Handle("/metrics", metrics.Handler())

	if paymentHandler != nil {
		mux.HandleFunc("/api/v1/payments/webhook", func(w http.ResponseWriter, r *http.Request) {
			if r.Method == http.MethodPost {
				paymentHandler.HandleWebhook(w, r)
				return
			}
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		})

		mux.HandleFunc("/api/v1/payments", func(w http.ResponseWriter, r *http.Request) {
			switch r.Method {
			case http.MethodPost:
				paymentHandler.CreatePayment(w, r)
			case http.MethodGet:
				if r.URL.Query().Get("id") != "" {
					paymentHandler.GetPaymentByID(w, r)
				} else if r.URL.Query().Get("order_id") != "" {
					paymentHandler.GetPaymentByOrderID(w, r)
				} else {
					paymentHandler.ListPayments(w, r)
				}
			case http.MethodDelete:
				paymentHandler.DeletePayment(w, r)
			default:
				http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			}
		})

		mux.HandleFunc("/api/v1/payments/", func(w http.ResponseWriter, r *http.Request) {
			if strings.HasSuffix(r.URL.Path, "/simulate") && r.Method == http.MethodPost {
				paymentHandler.SimulatePayment(w, r)
				return
			}
			if strings.Contains(r.URL.Path, "/order/") && r.Method == http.MethodGet {
				paymentHandler.GetPaymentByOrderID(w, r)
				return
			}
			if strings.HasSuffix(r.URL.Path, "/status") && r.Method == http.MethodPut {
				paymentHandler.UpdatePaymentStatus(w, r)
				return
			}
			switch r.Method {
			case http.MethodGet:
				paymentHandler.GetPaymentByID(w, r)
			case http.MethodDelete:
				paymentHandler.DeletePayment(w, r)
			default:
				http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			}
		})
	}

	addr := fmt.Sprintf(":%s", port)
	handlerWithTelemetry := telemetry.HTTPMiddleware(serviceName)(mux)
	log.Info("Starting HTTP server", "addr", addr)
	if err := http.ListenAndServe(addr, handlerWithTelemetry); err != nil {
		log.Error("Server terminated unexpectedly", "error", err)
	}
}
