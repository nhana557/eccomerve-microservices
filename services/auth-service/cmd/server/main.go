package main

import (
	"context"
	"fmt"
	"net/http"

	"ecommerce-platform/packages/shared-go/config"
	"ecommerce-platform/packages/shared-go/database"
	"ecommerce-platform/packages/shared-go/logger"
	"ecommerce-platform/packages/shared-go/metrics"
	"ecommerce-platform/packages/shared-go/telemetry"
	"ecommerce-platform/services/auth-service/internal/handler"
	"ecommerce-platform/services/auth-service/internal/infrastructure/entity"
	"ecommerce-platform/services/auth-service/internal/infrastructure/repository"
)

const serviceName = "auth-service"

func main() {
	log := logger.New(serviceName)
	port := config.GetEnv("PORT", "8081")
	metrics.Init(serviceName)

	cleanup, _ := telemetry.InitTracer(context.Background(), serviceName)
	defer cleanup(context.Background())

	dbHost := config.GetEnv("DB_HOST", "localhost")
	dbPort := config.GetEnv("DB_PORT", "6433")
	dbUser := config.GetEnv("DB_USER", "postgres")
	dbPass := config.GetEnv("DB_PASSWORD", "postgrespassword")
	dbName := config.GetEnv("DB_NAME", "auth_db")
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

	jwtSecret := config.GetEnv("JWT_SECRET", "super-secret-key-tokopedia-dark-edition-2026")

	var userHandler *handler.UserHandler
	var authHandler *handler.AuthHandler
	if err != nil {
		log.Warn("Failed to connect to PostgreSQL (running in degraded mode)", "error", err)
	} else {
		if err := db.AutoMigrate(&entity.User{}); err != nil {
			log.Error("Failed to auto-migrate database schema", "error", err)
		} else {
			log.Info("Database auto-migration completed successfully")
		}
		repo := repository.NewGormUserRepository(db)
		_ = repo.SeedDemoUsers(context.Background())
		userHandler = handler.NewUserHandler(repo)
		authHandler = handler.NewAuthHandler(repo, jwtSecret)
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/health", handler.HealthHandler(serviceName))
	mux.HandleFunc("/api/v1/health", handler.HealthHandler(serviceName))
	mux.Handle("/metrics", metrics.Handler())

	if authHandler != nil {
		mux.HandleFunc("/api/v1/auth/register", authHandler.Register)
		mux.HandleFunc("/api/v1/auth/login", authHandler.Login)
		mux.HandleFunc("/api/v1/auth/logout", authHandler.Logout)
		mux.HandleFunc("/api/v1/auth/me", authHandler.Me)
		mux.HandleFunc("/api/v1/auth/sync", authHandler.SyncUser)
		mux.HandleFunc("/api/v1/auth/webhook/clerk", authHandler.ClerkWebhook)
	}

	if userHandler != nil {
		userMux := func(w http.ResponseWriter, r *http.Request) {
			switch r.Method {
			case http.MethodPost:
				userHandler.CreateUser(w, r)
			case http.MethodGet:
				if r.URL.Query().Get("id") != "" {
					userHandler.GetUserByID(w, r)
				} else {
					userHandler.ListUsers(w, r)
				}
			case http.MethodPut:
				userHandler.UpdateUser(w, r)
			case http.MethodDelete:
				userHandler.DeleteUser(w, r)
			default:
				http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			}
		}
		userItemMux := func(w http.ResponseWriter, r *http.Request) {
			switch r.Method {
			case http.MethodGet:
				userHandler.GetUserByID(w, r)
			case http.MethodPut:
				userHandler.UpdateUser(w, r)
			case http.MethodDelete:
				userHandler.DeleteUser(w, r)
			default:
				http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			}
		}

		mux.HandleFunc("/api/v1/users", userMux)
		mux.HandleFunc("/api/v1/users/", userItemMux)
		mux.HandleFunc("/api/v1/auth/users", userMux)
		mux.HandleFunc("/api/v1/auth/users/", userItemMux)
	}

	addr := fmt.Sprintf(":%s", port)
	handlerWithTelemetry := telemetry.HTTPMiddleware(serviceName)(mux)
	log.Info("Starting HTTP server", "addr", addr)
	if err := http.ListenAndServe(addr, handlerWithTelemetry); err != nil {
		log.Error("Server terminated unexpectedly", "error", err)
	}
}
