# Makefile
.PHONY: help start stop seed sync-es seed-products infra-up infra-down infra-logs build build-be build-fe test clean dev-fe dev-gateway dev-auth dev-product dev-order dev-payment

help:
	@echo "Available commands in E-Commerce Monorepo:"
	@echo "  make start         - Start all microservices & Next.js web application"
	@echo "  make stop          - Stop all running microservices & Next.js web application"
	@echo "  make seed          - Seed categories & products to PostgreSQL and sync to Elasticsearch"
	@echo "  make sync-es       - Sync products from PostgreSQL to Elasticsearch"
	@echo "  make infra-up      - Start Postgres, Redis, RabbitMQ (Docker)"
	@echo "  make infra-down    - Stop infrastructure containers"
	@echo "  make infra-logs    - View infrastructure container logs"
	@echo "  make test          - Run all Go unit tests"
	@echo "  make build         - Compile all Go services to bin/ & build Next.js"
	@echo "  make build-be      - Compile all Go microservices into bin/"
	@echo "  make build-fe      - Build Next.js application"
	@echo "  make seed-products - Generate and seed 1M products & Tokopedia categories"
	@echo "  make dev-fe        - Start Next.js web application (port 3000)"
	@echo "  make dev-gateway   - Start API Gateway (port 8080)"
	@echo "  make dev-auth      - Start Auth Service (port 8081)"
	@echo "  make dev-product   - Start Product Service (port 8082)"
	@echo "  make dev-order     - Start Order Service (port 8083)"
	@echo "  make dev-payment   - Start Payment Service (port 8084)"
	@echo "  make clean         - Remove build artifacts and temporary files"

start:
	./start-all.sh

stop:
	./stop-all.sh

seed:
	./seed-data.sh $(if $(COUNT),--count $(COUNT),) $(if $(SYNC),--sync-count $(SYNC),) $(if $(BATCH),--batch $(BATCH),) $(if $(RECREATE),--recreate,) $(if $(DB_ONLY),--db-only,) $(if $(ES_ONLY),--es-only,)

sync-es:
	./sync-es.sh $(if $(COUNT),--count $(COUNT),) $(if $(BATCH),--batch $(BATCH),) $(if $(RECREATE),--recreate,)

infra-up:
	docker compose -f docker/docker-compose.yml up -d

infra-down:
	docker compose -f docker/docker-compose.yml down

infra-logs:
	docker compose -f docker/docker-compose.yml logs -f

test-go:
	go test -v ./packages/shared-go/... ./services/api-gateway/... ./services/auth-service/... ./services/product-service/... ./services/payment-service/...

test-fe:
	bun run --cwd apps/web test

test-order:
	bun run --cwd services/order-service test

test-e2e:
	bun run --cwd apps/web test:e2e

test: test-go test-fe test-order

build-be:
	mkdir -p bin
	go build -o bin/api-gateway ./services/api-gateway/cmd/server
	go build -o bin/auth-service ./services/auth-service/cmd/server
	go build -o bin/product-service ./services/product-service/cmd/server
	go build -o bin/payment-service ./services/payment-service/cmd/server
	bun run --cwd services/order-service build

build-fe:
	bun run --cwd apps/web build

build: build-be build-fe

dev-fe:
	bun run --cwd apps/web dev

dev-gateway:
	go run ./services/api-gateway/cmd/server/main.go

dev-auth:
	go run ./services/auth-service/cmd/server/main.go

dev-product:
	go run ./services/product-service/cmd/server/main.go

dev-order:
	bun run --cwd services/order-service start:dev

dev-payment:
	go run ./services/payment-service/cmd/server/main.go

seed-products:
	DB_PORT=$${DB_PORT:-5433} go run ./services/product-service/cmd/seeder/main.go $(if $(COUNT),--count=$(COUNT),) $(if $(BATCH),--batch-size=$(BATCH),) $(if $(RECREATE),--recreate=$(RECREATE),)

clean:
	rm -rf bin/ tmp/ .turbo/ apps/web/.next services/order-service/dist
