package main

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"time"

	"ecommerce-platform/packages/shared-go/config"
	"ecommerce-platform/packages/shared-go/database"
	"ecommerce-platform/packages/shared-go/logger"
	"ecommerce-platform/packages/shared-go/metrics"
	"ecommerce-platform/packages/shared-go/telemetry"
	"ecommerce-platform/services/product-service/internal/event"
	"ecommerce-platform/services/product-service/internal/handler"
	"ecommerce-platform/services/product-service/internal/infrastructure/elasticsearch"
	"ecommerce-platform/services/product-service/internal/infrastructure/entity"
	"ecommerce-platform/services/product-service/internal/infrastructure/repository"

	"gorm.io/gorm"
	gormlogger "gorm.io/gorm/logger"
)

const serviceName = "product-service"

// setupDatabaseSchema ensures database tables and indexes exist.
// To avoid scanning 1M rows on every server startup, full AutoMigrate and DDL introspection
// are only executed when tables are missing or when AUTO_MIGRATE=true is explicitly set.
func setupDatabaseSchema(db *gorm.DB, log *slog.Logger) error {
	hasProduct := db.Migrator().HasTable(&entity.Product{})
	hasCategory := db.Migrator().HasTable(&entity.Category{})
	forceMigrate := config.GetEnv("AUTO_MIGRATE", "false") == "true"

	migrationDB := db.Session(&gorm.Session{
		Logger: gormlogger.Default.LogMode(gormlogger.Error),
	})

	// Ensure GIN Trigram and B-Tree indexing extensions exist for fast text search
	migrationDB.Exec("CREATE EXTENSION IF NOT EXISTS pg_trgm;")
	migrationDB.Exec("CREATE EXTENSION IF NOT EXISTS btree_gin;")
	migrationDB.Exec("CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON products USING gin (LOWER(name) gin_trgm_ops);")
	migrationDB.Exec("CREATE INDEX IF NOT EXISTS idx_products_cat_name_trgm ON products USING gin (category, LOWER(name) gin_trgm_ops);")
	migrationDB.Exec("CREATE INDEX IF NOT EXISTS idx_products_catid_name_trgm ON products USING gin (category_id, LOWER(name) gin_trgm_ops);")

	if !hasCategory || !hasProduct || forceMigrate {
		log.Info("Running database schema migration...")
		if err := migrationDB.AutoMigrate(&entity.Category{}, &entity.Product{}); err != nil {
			return fmt.Errorf("failed to auto-migrate schema: %w", err)
		}

		// Ensure high-performance indexes for 5M rows
		migrationDB.Exec("CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);")
		migrationDB.Exec("CREATE INDEX IF NOT EXISTS idx_products_created_at_desc ON products(created_at DESC);")
		migrationDB.Exec("CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);")
		migrationDB.Exec("CREATE INDEX IF NOT EXISTS idx_products_stock ON products(stock);")
		migrationDB.Exec("CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);")
		migrationDB.Exec("CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);")
		migrationDB.Exec("CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);")
		log.Info("Database schema migration completed successfully")
	} else {
		log.Info("Database schema verified (products, categories, and GIN Trigram indexes exist)")
	}
	return nil
}

func main() {
	log := logger.New(serviceName)
	port := config.GetEnv("PORT", "8082")
	metrics.Init(serviceName)

	cleanup, _ := telemetry.InitTracer(context.Background(), serviceName)
	defer cleanup(context.Background())

	dbHost := config.GetEnv("DB_HOST", "localhost")
	dbPort := config.GetEnv("DB_PORT", "5433")
	dbUser := config.GetEnv("DB_USER", "postgres")
	dbPass := config.GetEnv("DB_PASSWORD", "postgrespassword")
	dbName := config.GetEnv("DB_NAME", "product_db")
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

	var productHandler *handler.ProductHandler
	var categoryHandler *handler.CategoryHandler
	if err != nil {
		log.Warn("Failed to connect to PostgreSQL (running in degraded mode)", "error", err)
	} else {
		if err := setupDatabaseSchema(db, log); err != nil {
			log.Error("Failed to setup database schema", "error", err)
		}

		esURL := config.GetEnv("ELASTICSEARCH_URL", "http://localhost:9200")
		esClient := elasticsearch.NewClient(esURL)

		go func() {
			ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
			defer cancel()
			if err := esClient.Ping(ctx); err != nil {
				log.Warn("Elasticsearch is currently unreachable (CQRS queries will fallback to PostgreSQL B-Tree)", "url", esURL, "error", err)
			} else {
				log.Info("Elasticsearch connected successfully for CQRS read-model", "url", esURL)
				if err := esClient.EnsureIndex(context.Background()); err != nil {
					log.Warn("Failed to ensure Elasticsearch products index", "error", err)
				} else {
					log.Info("Elasticsearch products index verified and ready")
				}
			}
		}()

		repo := repository.NewGormProductRepositoryWithES(db, esClient)
		productHandler = handler.NewProductHandlerWithES(repo, esClient)
		categoryRepo := repository.NewGormCategoryRepository(db)
		categoryHandler = handler.NewCategoryHandler(categoryRepo)

		amqpURL := config.GetEnv("RABBITMQ_URL", "amqp://guest:guest@localhost:5672/")
		go func() {
			if _, _, err := event.StartStockConsumer(amqpURL, db); err != nil {
				log.Warn("Failed to start RabbitMQ stock consumer (running in standalone mode)", "error", err)
			} else {
				log.Info("RabbitMQ stock consumer listening on ecommerce.events")
			}
		}()
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/health", handler.HealthHandler(serviceName))
	mux.HandleFunc("/api/v1/health", handler.HealthHandler(serviceName))
	mux.Handle("/metrics", metrics.Handler())

	if categoryHandler != nil {
		mux.HandleFunc("/api/v1/categories", func(w http.ResponseWriter, r *http.Request) {
			if r.Method == http.MethodGet {
				categoryHandler.ListCategories(w, r)
				return
			}
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		})
		mux.HandleFunc("/api/v1/categories/", func(w http.ResponseWriter, r *http.Request) {
			if r.Method == http.MethodGet {
				categoryHandler.GetCategoryByID(w, r)
				return
			}
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		})
	}

	if productHandler != nil {
		mux.HandleFunc("/api/v1/products/cache/purge", productHandler.PurgeCache)
		mux.HandleFunc("/api/v1/products/purge", productHandler.PurgeCache)
		mux.HandleFunc("/api/v1/products/sync-es", func(w http.ResponseWriter, r *http.Request) {
			if r.Method == http.MethodPost {
				productHandler.SyncElasticsearch(w, r)
				return
			}
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		})
		mux.HandleFunc("/api/v1/products/direct", func(w http.ResponseWriter, r *http.Request) {
			if r.Method == http.MethodGet {
				productHandler.ListProductsDirect(w, r)
				return
			}
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		})
		mux.HandleFunc("/api/v1/products", func(w http.ResponseWriter, r *http.Request) {
			switch r.Method {
			case http.MethodPost:
				productHandler.CreateProduct(w, r)
			case http.MethodGet:
				if r.URL.Query().Get("id") != "" {
					productHandler.GetProductByID(w, r)
				} else {
					productHandler.ListProducts(w, r)
				}
			case http.MethodPut:
				productHandler.UpdateProduct(w, r)
			case http.MethodDelete:
				productHandler.DeleteProduct(w, r)
			default:
				http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			}
		})
		mux.HandleFunc("/api/v1/products/", func(w http.ResponseWriter, r *http.Request) {
			switch r.Method {
			case http.MethodGet:
				productHandler.GetProductByID(w, r)
			case http.MethodPut:
				productHandler.UpdateProduct(w, r)
			case http.MethodDelete:
				productHandler.DeleteProduct(w, r)
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
