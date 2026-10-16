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
	"ecommerce-platform/packages/shared-go/response"
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

// seedDefaultProductsIfEmpty populates initial store products when database is completely empty.
func seedDefaultProductsIfEmpty(db *gorm.DB, esClient elasticsearch.Client, log *slog.Logger) {
	var count int64
	if err := db.Model(&entity.Product{}).Count(&count).Error; err != nil {
		log.Warn("Failed to count products for seeder check", "error", err)
		return
	}
	if count > 0 {
		return
	}

	log.Info("Product catalog is empty. Auto-seeding initial store catalog...")

	catElecID := "cat-electronics"
	catAccID := "cat-accessories"
	catAppID := "cat-apparel"

	categories := []entity.Category{
		{
			ID:      catElecID,
			Name:    "Electronics",
			Slug:    "electronics",
			IconURL: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80",
			Level:   1,
		},
		{
			ID:      catAccID,
			Name:    "Accessories",
			Slug:    "accessories",
			IconURL: "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=600&q=80",
			Level:   1,
		},
		{
			ID:      catAppID,
			Name:    "Apparel",
			Slug:    "apparel",
			IconURL: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=600&q=80",
			Level:   1,
		},
	}

	for _, c := range categories {
		var existing entity.Category
		if err := db.First(&existing, "id = ?", c.ID).Error; err != nil {
			_ = db.Create(&c).Error
		}
	}

	defaultProducts := []entity.Product{
		{
			ID:          "prod-default-1",
			Name:        "Mechanical Keyboard Pro",
			Description: "Wireless 75% hot-swappable RGB mechanical keyboard with gasket mount",
			Price:       1450000,
			Stock:       25,
			Category:    "Electronics",
			CategoryID:  &catElecID,
			ImageURL:    "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=600&q=80",
		},
		{
			ID:          "prod-default-2",
			Name:        "Studio Headphone Wireless",
			Description: "Active Noise Cancelling over-ear high-fidelity studio headphone",
			Price:       2100000,
			Stock:       12,
			Category:    "Electronics",
			CategoryID:  &catElecID,
			ImageURL:    "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80",
		},
		{
			ID:          "prod-default-3",
			Name:        "Ergonomic Desk Mat",
			Description: "Waterproof microfiber leather 90x40cm with anti-slip base",
			Price:       185000,
			Stock:       40,
			Category:    "Accessories",
			CategoryID:  &catAccID,
			ImageURL:    "https://images.unsplash.com/photo-1616440347437-b1c73416efc2?auto=format&fit=crop&w=600&q=80",
		},
		{
			ID:          "prod-default-4",
			Name:        "Minimalist Developer Hoodie",
			Description: "Heavyweight 380gsm premium cotton fleece with discrete embroidery",
			Price:       420000,
			Stock:       18,
			Category:    "Apparel",
			CategoryID:  &catAppID,
			ImageURL:    "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=600&q=80",
		},
		{
			ID:          "prod-default-5",
			Name:        "USB-C Aluminum Dock 10-in-1",
			Description: "Dual 4K HDMI, 100W Power Delivery, Gigabit Ethernet & SD Card slot",
			Price:       680000,
			Stock:       15,
			Category:    "Electronics",
			CategoryID:  &catElecID,
			ImageURL:    "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80",
		},
		{
			ID:          "prod-default-6",
			Name:        "Precision Gaming Mouse Ultralight",
			Description: "Ultralight 58g wireless sensor 26K DPI with optical switches",
			Price:       790000,
			Stock:       20,
			Category:    "Electronics",
			CategoryID:  &catElecID,
			ImageURL:    "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?auto=format&fit=crop&w=600&q=80",
		},
		{
			ID:          "prod-default-7",
			Name:        "Curved Ultrawide Monitor 34 Inch 144Hz",
			Description: "WQHD 3440x1440 HDR400 sRGB 120% with USB-C 90W Hub",
			Price:       4850000,
			Stock:       8,
			Category:    "Electronics",
			CategoryID:  &catElecID,
			ImageURL:    "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=600&q=80",
		},
		{
			ID:          "prod-default-8",
			Name:        "Mechanical Linear Switch Lubed 45pcs",
			Description: "Custom factory pre-lubed 45g linear switches with POM stem",
			Price:       240000,
			Stock:       35,
			Category:    "Accessories",
			CategoryID:  &catAccID,
			ImageURL:    "https://images.unsplash.com/photo-1595225476474-87563907a212?auto=format&fit=crop&w=600&q=80",
		},
		{
			ID:          "prod-default-9",
			Name:        "Retro Cream PBT Dye-Sub Keycaps",
			Description: "Cherry profile thick PBT 142 keys with ISO & ANSI layout support",
			Price:       360000,
			Stock:       19,
			Category:    "Accessories",
			CategoryID:  &catAccID,
			ImageURL:    "https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?auto=format&fit=crop&w=600&q=80",
		},
		{
			ID:          "prod-default-10",
			Name:        "Aluminum Ergonomic Laptop Riser",
			Description: "Foldable 360 rotating aerospace-grade aluminum stand with ventilation",
			Price:       285000,
			Stock:       22,
			Category:    "Accessories",
			CategoryID:  &catAccID,
			ImageURL:    "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=600&q=80",
		},
		{
			ID:          "prod-default-11",
			Name:        "Smart Watch AMOLED 1.43 Inch",
			Description: "Always-On AMOLED Display with heart rate monitor, SpO2 & 5ATM water resistance",
			Price:       890000,
			Stock:       14,
			Category:    "Electronics",
			CategoryID:  &catElecID,
			ImageURL:    "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80",
		},
		{
			ID:          "prod-default-12",
			Name:        "65W GaN Fast Charger Dual USB-C",
			Description: "Ultra-compact Gallium Nitride fast charger for laptops, tablets, and smartphones",
			Price:       215000,
			Stock:       45,
			Category:    "Electronics",
			CategoryID:  &catElecID,
			ImageURL:    "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=600&q=80",
		},
	}

	if err := db.CreateInBatches(defaultProducts, len(defaultProducts)).Error; err != nil {
		log.Warn("Failed to seed default products", "error", err)
	} else {
		log.Info("Default products successfully seeded into database", "count", len(defaultProducts))
		if esClient != nil {
			go func() {
				time.Sleep(1 * time.Second)
				_, _ = esClient.BulkIndexProducts(context.Background(), defaultProducts)
			}()
		}
	}
}

// setupDatabaseSchema ensures database tables and indexes exist.
func setupDatabaseSchema(db *gorm.DB, esClient elasticsearch.Client, log *slog.Logger) error {
	hasProduct := db.Migrator().HasTable(&entity.Product{})
	hasCategory := db.Migrator().HasTable(&entity.Category{})
	forceMigrate := config.GetEnv("AUTO_MIGRATE", "false") == "true"

	migrationDB := db.Session(&gorm.Session{
		Logger: gormlogger.Default.LogMode(gormlogger.Error),
	})

	// 1. Ensure extensions exist
	migrationDB.Exec("CREATE EXTENSION IF NOT EXISTS pg_trgm;")
	migrationDB.Exec("CREATE EXTENSION IF NOT EXISTS btree_gin;")

	// 2. Run AutoMigrate FIRST so that tables exist before index creation
	if !hasCategory || !hasProduct || forceMigrate {
		log.Info("Running database schema migration...")
		if err := migrationDB.AutoMigrate(&entity.Category{}, &entity.Product{}); err != nil {
			return fmt.Errorf("failed to auto-migrate schema: %w", err)
		}
	}

	// 3. Ensure high-performance indexes exist safely on created tables
	migrationDB.Exec("CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON products USING gin (LOWER(name) gin_trgm_ops);")
	migrationDB.Exec("CREATE INDEX IF NOT EXISTS idx_products_cat_name_trgm ON products USING gin (category, LOWER(name) gin_trgm_ops);")
	migrationDB.Exec("CREATE INDEX IF NOT EXISTS idx_products_catid_name_trgm ON products USING gin (category_id, LOWER(name) gin_trgm_ops);")
	migrationDB.Exec("CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);")
	migrationDB.Exec("CREATE INDEX IF NOT EXISTS idx_products_name_lower ON products(LOWER(name));")
	migrationDB.Exec("CREATE INDEX IF NOT EXISTS idx_products_cat_name ON products(category, name);")
	migrationDB.Exec("CREATE INDEX IF NOT EXISTS idx_products_catid_name ON products(category_id, name);")
	migrationDB.Exec("CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);")
	migrationDB.Exec("CREATE INDEX IF NOT EXISTS idx_products_created_at_desc ON products(created_at DESC);")
	migrationDB.Exec("CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);")
	migrationDB.Exec("CREATE INDEX IF NOT EXISTS idx_products_stock ON products(stock);")
	migrationDB.Exec("CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);")
	migrationDB.Exec("CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);")
	migrationDB.Exec("CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);")
	migrationDB.Exec("ANALYZE products;")
	migrationDB.Exec("ANALYZE categories;")

	log.Info("Database schema verified (products, categories, and indexes exist)")

	// 4. Auto-seed initial store catalog if table is currently empty
	seedDefaultProductsIfEmpty(db, esClient, log)
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

	// Retry loop for PostgreSQL connection on startup (up to 10 attempts)
	var db *gorm.DB
	var err error
	maxRetries := 10
	for attempt := 1; attempt <= maxRetries; attempt++ {
		db, err = database.NewPostgresDB(database.Config{
			Host:        dbHost,
			Port:        dbPort,
			User:        dbUser,
			Password:    dbPass,
			DBName:      dbName,
			SSLMode:     dbSSL,
			ServiceName: serviceName,
		})
		if err == nil {
			log.Info("Connected to PostgreSQL successfully", "attempt", attempt)
			break
		}
		if attempt < maxRetries {
			log.Warn("Waiting for PostgreSQL connection...", "attempt", attempt, "max", maxRetries, "error", err)
			time.Sleep(2 * time.Second)
		}
	}

	var productHandler *handler.ProductHandler
	var categoryHandler *handler.CategoryHandler
	if err != nil {
		log.Warn("Failed to connect to PostgreSQL (running in degraded mode)", "error", err)
	} else {
		esURL := config.GetEnv("ELASTICSEARCH_URL", "http://localhost:9200")
		esClient := elasticsearch.NewClient(esURL)

		if err := setupDatabaseSchema(db, esClient, log); err != nil {
			log.Error("Failed to setup database schema", "error", err)
		}

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
	} else {
		serviceUnavailableHandler := func(w http.ResponseWriter, r *http.Request) {
			response.Error(w, http.StatusServiceUnavailable, "SERVICE_DEGRADED", "Category service database is temporarily unavailable", serviceName)
		}
		mux.HandleFunc("/api/v1/categories", serviceUnavailableHandler)
		mux.HandleFunc("/api/v1/categories/", serviceUnavailableHandler)
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
	} else {
		serviceUnavailableHandler := func(w http.ResponseWriter, r *http.Request) {
			response.Error(w, http.StatusServiceUnavailable, "SERVICE_DEGRADED", "Product service database is temporarily unavailable", serviceName)
		}
		mux.HandleFunc("/api/v1/products/cache/purge", serviceUnavailableHandler)
		mux.HandleFunc("/api/v1/products/purge", serviceUnavailableHandler)
		mux.HandleFunc("/api/v1/products/sync-es", serviceUnavailableHandler)
		mux.HandleFunc("/api/v1/products/direct", serviceUnavailableHandler)
		mux.HandleFunc("/api/v1/products", serviceUnavailableHandler)
		mux.HandleFunc("/api/v1/products/", serviceUnavailableHandler)
	}

	addr := fmt.Sprintf(":%s", port)
	handlerWithTelemetry := telemetry.HTTPMiddleware(serviceName)(mux)
	log.Info("Starting HTTP server", "addr", addr)
	if err := http.ListenAndServe(addr, handlerWithTelemetry); err != nil {
		log.Error("Server terminated unexpectedly", "error", err)
	}
}
