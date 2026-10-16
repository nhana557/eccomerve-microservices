# T.STORE — E-Commerce Microservices & Full-Stack Observability Platform

Platform e-commerce modern berskala enterprise berbasis arsitektur **Microservices (Go & NestJS)** dan **Next.js 15 (React 19)**, dilengkapi sistem **Full-Stack Observability** (OpenTelemetry, Grafana, Loki, Jaeger, Prometheus, Alloy), **Dual-Engine Authentication** (Clerk SSO + Internal JWT), **CQRS Search (Elasticsearch + PostgreSQL GIN Trigram)**, serta proteksi **Race Condition** tingkat transaksi.

---

## Daftar Isi
- [Arsitektur & Alur Data](#arsitektur--alur-data)
- [Teknologi yang Digunakan (Tech Stack)](#teknologi-yang-digunakan-tech-stack)
- [Penjelasan Aplikasi & Layanan](#penjelasan-aplikasi--layanan)
  - [1. Frontend Web (`apps/web`)](#1-frontend-web-appsweb)
  - [2. API Gateway (`services/api-gateway`)](#2-api-gateway-servicesapi-gateway)
  - [3. Auth Service (`services/auth-service`)](#3-auth-service-servicesauth-service)
  - [4. Product Service (`services/product-service`)](#4-product-service-servicesproduct-service)
  - [5. Order Service (`services/order-service`)](#5-order-service-servicesorder-service)
  - [6. Payment Service (`services/payment-service`)](#6-payment-service-servicespayment-service)
  - [7. Shared Go Packages (`packages/shared-go`)](#7-shared-go-packages-packagesshared-go)
  - [8. Protocol Buffers (`packages/proto`)](#8-protocol-buffers-packagesproto)
- [Infrastruktur & Observability Stack](#infrastruktur--observability-stack)
- [Daftar Alokasi Port](#daftar-alokasi-port)
- [Panduan Menjalankan Project](#panduan-menjalankan-project)
- [Branching Strategy & CI/CD (Trunk-Based Development)](docs/trunk-based-development.md)

---

## Arsitektur & Alur Data

```text
[ Browser / Client ]
       │
       │ HTTP / W3C traceparent header
       ▼
[ Next.js 15 Storefront & Dashboard (apps/web :3000) ]
       │ ── Logs ───────────────► [ Loki :3100 ]
       │ ── Client Spans ───────► [ Grafana Alloy :4318 ] ──► [ Jaeger :16686 ]
       │
       │ REST / JSON (W3C traceparent propagated)
       ▼
[ API Gateway (services/api-gateway :8080) ]
  ├── CORS, Auth Validation (Internal JWT & Clerk PEM Public Key)
  ├── OpenTelemetry HTTP Middleware (Latency, GeoIP, Structured Logging)
  ├── Prometheus Metrics Exporter (/metrics)
  └── Reverse Proxy Routing
       │
       ├───────────────────┬───────────────────┬───────────────────┐
       ▼                   ▼                   ▼                   ▼
 [ auth-service ]   [ product-service ] [ order-service ]   [ payment-service ]
     (:8081)             (:8082)             (:8083)             (:8084)
       │                   │                   │                   │
   [auth_db]       [product_db] / [ES]     [order_db]         [payment_db]
                           ▲                   │                   ▲
                           │                   │ AMQP (order.new)  │
                           │                   ▼                   │
                           │           [ RabbitMQ Broker ] ────────┘
                           │                   ▲ (payment.completed)
                           │                   │
                           └───────────────────┘ (Stock adjustments)
```

---

## Teknologi yang Digunakan (Tech Stack)

### Frontend Layer
- **Framework:** Next.js 15 (App Router, Turbopack, React 19)
- **Bahasa:** TypeScript
- **Styling:** Tailwind CSS, Lucide React, Class Variance Authority (`cva`)
- **Runtime & Package Manager:** Bun
- **Autentikasi:** Clerk SDK (`@clerk/nextjs`) + Native HttpOnly Cookie Authentication

### Backend Microservices
- **Bahasa:** Go 1.22+ (Go Workspaces)
- **Web & Router:** Native Go `net/http` ServeMux
- **Database ORM:** GORM dengan Postgres Driver (PgBouncer compatible)
- **Komunikasi Asinkron:** RabbitMQ (`amqp091-go`) dengan Topic Exchange
- **Search Engine:** Elasticsearch 8 (Go official client `elasticsearch/v8`)
- **Password Hashing:** `golang.org/x/crypto/bcrypt`
- **Token Security:** `golang-jwt/jwt/v5`

### Observability & Monitoring
- **Tracing:** OpenTelemetry Go SDK (`go.opentelemetry.io/otel`), Jaeger All-in-One
- **Logs:** Grafana Loki, Structured JSON Logging (`log/slog`)
- **Metrics:** Prometheus Go Client (`prometheus/client_golang`), Prometheus Server
- **Collector:** Grafana Alloy (OTLP receiver via gRPC 4317 & HTTP 4318)
- **Visualisasi:** Grafana 11 (Provisioned Dashboards & Trace-to-Log Correlation)

### Database & Infrastruktur
- **RDBMS:** PostgreSQL 16 (Multi-Database: `auth_db`, `product_db`, `order_db`, `payment_db`)
- **Connection Pooler:** PgBouncer (Transaction Pooling Mode)
- **In-Memory Cache:** Redis 7
- **Message Broker:** RabbitMQ 3 Management Alpine

---

## Penjelasan Aplikasi & Layanan

### 1. Frontend Web (`apps/web`)

Aplikasi web modern berbasis **Feature-Driven Architecture** yang berfungsi sebagai etalase toko (storefront), dashboard monitoring, dan checkout flow.

#### Struktur Folder:
```text
apps/web/
├── app/
│   ├── checkout/page.tsx           # Halaman checkout & simulasi transaksi
│   ├── dashboard/page.tsx          # Dashboard admin & KPI sistem
│   ├── sign-in/[[...sign-in]]/     # Rute autentikasi Clerk
│   ├── api/telemetry/              # BFF handler logs, traces, dan GeoIP
│   └── page.tsx                    # Storefront utama e-commerce
├── features/
│   ├── auth/                       # Modal autentikasi, context, demo login
│   ├── cart/                       # Slide-over keranjang belanja & kalkulasi
│   ├── orders/                     # Riwayat pesanan & manajemen status
│   ├── payments/                   # Riwayat & simulasi status pembayaran
│   ├── products/                   # Grid produk, filter kategori, search bar
│   └── shared/                     # Navbar, MultiTierCacheBar, Toast, Modal
└── lib/
    ├── api-client.ts               # HTTP client dengan W3C traceparent injection
    ├── logger.ts                   # Client-side logger forwarding to Loki
    └── telemetry.ts                # OTLP span exporter ke Grafana Alloy
```

#### Fitur Utama:
- **Dual-Engine Authentication**: Mendukung Google SSO via Clerk serta login cepat Akun Demo (Budi Santoso & Admin T.STORE) via JWT lokal.
- **Multi-Tier Caching Tracker**: Visualisasi status cache per request (T1 ISR, T3 CQRS Elasticsearch, T4 Client-side Cache).
- **Halaman Checkout Penuh**: Simulasi sukses bayar, simulasi error HTTP 402, dan uji coba Race Condition webhook secara real-time.
- **Client Tracing**: Menginjeksi header W3C `traceparent` pada setiap request API agar waterfall trace di Jaeger tersambung dari browser hingga database.

---

### 2. API Gateway (`services/api-gateway`)
**Port:** `8080` (HTTP)

Pintu gerbang tunggal (BFF/API Gateway) yang menghubungkan frontend dengan seluruh microservice internal.

#### Struktur Folder:
```text
services/api-gateway/
├── cmd/server/main.go              # Entrypoint server & mapping route proxy
└── internal/
    ├── handler/health.go           # Aggregated health check seluruh services
    ├── middleware/                 # CORS, DualEngineAuth, ResponseTime
    └── proxy/proxy.go              # Dynamic ReverseProxy dengan OpenTelemetry tracing
```

#### Tanggung Jawab & Fitur:
- **Centralized Routing & Reverse Proxy**: Merutekan request ke auth, product, order, dan payment service.
- **Dual-Engine Auth Middleware**: Memvalidasi token JWT internal (HMAC-SHA256) maupun token Clerk (RS256 Public Key) sebelum diteruskan ke service internal.
- **Trace Propagation**: Menerima dan meneruskan W3C `traceparent` ke upstream microservice.
- **Aggregated Health Check (`/api/v1/health`)**: Memeriksa ketersediaan seluruh microservice secara paralel.
- **Metrics Exporter (`/metrics`)**: Mengekspos metrik throughput dan durasi ke Prometheus.

---

### 3. Auth Service (`services/auth-service`)
**Port:** `8081` (REST) | **Database:** `auth_db`

Layanan manajemen identitas pengguna, hak akses, dan sinkronisasi SSO.

#### Struktur Folder:
```text
services/auth-service/
├── cmd/server/main.go              # Inisialisasi DB, auto-seed demo, & HTTP server
└── internal/
    ├── handler/auth_handler.go     # Register, Login, Logout, Me, Sync User
    └── infrastructure/
        ├── entity/user.go          # GORM model entity User
        └── repository/user_repo.go # Operasi database & Seeder akun demo
```

#### Tanggung Jawab & Fitur:
- **Autentikasi Internal**: Pendaftaran akun dan login menggunakan password terenkripsi bcrypt.
- **Sesi Aman**: Menerbitkan JWT yang disimpan di dalam `HttpOnly Cookie`.
- **Auto-Seed Akun Demo**: Otomatis membuat akun `budi@example.com` (Customer) dan `admin@tstore.com` (Admin) saat startup.
- **Clerk Webhook Synchronization**: Sinkronisasi data user dari Clerk ke database lokal PostgreSQL.

---

### 4. Product Service (`services/product-service`)
**Port:** `8082` (REST) | **Database:** `product_db` & **Elasticsearch 8**

Layanan katalog produk skala besar dengan optimasi query jutaan data.

#### Struktur Folder:
```text
services/product-service/
├── cmd/
│   ├── server/main.go              # HTTP server katalog produk & kategori
│   ├── seeder/main.go              # Streaming batch seeder 1.000.000 produk
│   └── sync-es/main.go             # Worker sinkronisasi Postgres ke Elasticsearch
└── internal/
    ├── handler/product_handler.go  # Controller REST produk & kategori
    └── infrastructure/
        ├── elasticsearch/          # CQRS Search engine (BM25 & Typo Tolerance)
        ├── entity/product.go       # Entitas Product & Category (Hierarkis Tokopedia)
        └── repository/             # GORM repository dengan GIN Trigram index
```

#### Tanggung Jawab & Fitur:
- **Katalog 1 Juta Produk**: Seeder batch streaming (~20.000 baris/detik) dengan 10 kategori utama dan 40 sub-kategori Tokopedia.
- **Optimasi Database GIN Trigram**: Ekstensi `pg_trgm` dan `btree_gin` pada kolom nama dan kategori untuk pencarian SQL di bawah 10ms.
- **Pencarian CQRS Elasticsearch**: Pencarian full-text toleran typo (fuzzy matching) dan scoring relevansi BM25.

---

### 5. Order Service (`services/order-service`)
**Port:** `8083` (REST) | **Database:** `order_db` | **Tech:** **NestJS 10 (TypeScript) + TypeORM**

Layanan pengelola keranjang belanja, voucher promo, dan siklus transaksi order yang dibangun menggunakan framework **NestJS**.

#### Struktur Folder:
```text
services/order-service/
├── src/
│   ├── main.ts                         # Bootstrap NestJS app, CORS, Port 8083
│   ├── app.module.ts                   # Root module (TypeORM, feature modules, telemetry middleware)
│   ├── common/
│   │   ├── dto/response.dto.ts         # Standard response envelope interface
│   │   ├── interceptors/               # TransformInterceptor { success, data, error, meta }
│   │   ├── filters/                    # HttpExceptionFilter untuk standard error envelope
│   │   ├── logger/loki-logger.service.ts # Structured JSON logger forwarding to Loki
│   │   └── middleware/                 # TelemetryMiddleware (W3C traceparent, OTLP Alloy span exporter)
│   ├── database/                       # TypeORM config & PromoSeeder
│   ├── metrics/                        # Exporter Prometheus (/metrics)
│   ├── health/                         # Healthcheck (/health & /api/v1/health)
│   ├── orders/                         # Entities (Order, OrderItem), DTO, Controller, Service
│   ├── cart/                           # Entities (Cart, CartItem), DTO, Controller, Service
│   ├── promo/                          # Entity Promo, DTO, Controller, Service
│   └── rabbitmq/                       # PaymentConsumerService (amqplib queue 'order.payment-completed')
├── package.json
└── tsconfig.json
```

#### Tanggung Jawab & Fitur:
- **Framework NestJS Moduler**: Dibangun dengan TypeScript murni dan Dependency Injection (DI) khas NestJS.
- **ORM TypeORM**: Mapping relasional langsung ke tabel PostgreSQL `orders`, `order_items`, `carts`, `cart_items`, dan `promos` dengan transformer bigint.
- **Manajemen Keranjang (Cart)**: Penyimpanan dan kalkulasi item belanja per user.
- **Validasi Promo**: Penerapan potongan harga diskon persentase dan nominal.
- **Event-Driven Lifecycle**: Consumer RabbitMQ mendengarkan event `payment.completed` dari exchange `ecommerce.events` untuk memperbarui status pesanan dari `PENDING_PAYMENT` menjadi `PAID`.
- **Full Observability**: Mendukung W3C `traceparent` propagation ke Jaeger via Alloy, shipping log terstruktur ke Loki, metrik Prometheus di `/metrics`, dan peringatan latency (>5s warning, >8s critical).

---

### 6. Payment Service (`services/payment-service`)
**Port:** `8084` (REST) | **Database:** `payment_db`

Layanan gateway pembayaran dengan simulasi transaksi dan proteksi race condition.

#### Struktur Folder:
```text
services/payment-service/
├── cmd/server/main.go              # HTTP server & RabbitMQ producer setup
└── internal/
    ├── event/payment_producer.go   # Publisher event pembayaran ke RabbitMQ
    ├── handler/payment_handler.go  # Webhook handler, status updater, simulasi
    └── infrastructure/
        ├── entity/payment.go       # Entitas Payment
        └── repository/payment_repo.go # Atomic CAS query & mutex logic
```

#### Tanggung Jawab & Fitur:
- **Proteksi Race Condition Ganda**:
  1. **Mutex Per-Payment ID**: Menggunakan `sync.Map` untuk mengunci proses webhook ID yang sama secara konkuren.
  2. **Atomic CAS (Compare-And-Swap)**: Query `UPDATE payments SET status='SUCCESS' WHERE id=? AND status='PENDING'` dengan validasi `RowsAffected`.
- **Idempotensi Webhook**: Webhook duplikat tidak akan memicu penerbitan event ganda ke RabbitMQ.
- **Simulasi Transaksi**: Endpoint simulasi pembayaran sukses, gagal (HTTP 402), dan simulasi webhook konkuren untuk pengujian frontend.

---

### 7. Shared Go Packages (`packages/shared-go`)

Pustaka utilitas bersama yang diimpor oleh seluruh microservice:

- **`config/`**: Helper pembacaan environment variable dengan nilai fallback default.
- **`database/`**: Inisialisasi koneksi PostgreSQL via PgBouncer dengan custom **`slowQueryLogger`** (otomatis mendeteksi dan mengirim log warning/error ke Loki jika query database $>5\text{s}$ atau $>8\text{s}$, serta slow query $\ge 200\text{ms}$).
- **`logger/`**: Structured JSON logging (`log/slog`) dengan push langsung ke Grafana Loki menggunakan stream labels (`service_name`, `level`).
- **`metrics/`**: Exporter Prometheus:
  - `http_requests_total`: Counter request per method, status, dan service.
  - `http_request_duration_seconds`: Histogram latensi request.
  - `http_requests_in_flight`: Gauge jumlah request aktif.
  - `http_slow_requests_total` & `db_slow_queries_total`: Counter metrik request/query lambat.
- **`response/`**: Standard JSON envelope response (`success`, `data`, `error`, `meta`).
- **`telemetry/`**: Setup OTel Tracer Provider, W3C propagator, dan HTTP middleware yang otomatis mendeteksi slow response ($>5\text{s}$ kuning/WARN, $>8\text{s}$ merah/ERROR).

---

### 8. Protocol Buffers (`packages/proto`)

Skema gRPC/Protobuf terpusat untuk komunikasi sinkron antar-layanan (inter-service communication):
- `auth/v1/auth.proto`
- `product/v1/product.proto`
- `order/v1/order.proto`
- `payment/v1/payment.proto`

---

## Infrastruktur & Observability Stack

Dikelola melalui `docker/docker-compose.yml`:

| Kontainer | Gambar Docker | Port | Keterangan |
| :--- | :--- | :--- | :--- |
| **PostgreSQL** | `postgres:16-alpine` | `5433:5432` | Multi-database e-commerce RDBMS |
| **PgBouncer** | `edoburu/pgbouncer:latest` | `6433:6432` | Connection pooler (Transaction mode) |
| **Redis** | `redis:7-alpine` | `6379:6379` | In-memory caching & distributed locks |
| **RabbitMQ** | `rabbitmq:3-management-alpine` | `5672`, `15672` | AMQP broker & dashboard antrean |
| **Elasticsearch** | `elasticsearch:8.15.0` | `9200:9200` | Search engine katalog produk CQRS |
| **Grafana Alloy** | `grafana/alloy:v1.3.0` | `4317`, `4318`, `12345` | OTLP collector receiver untuk traces & logs |
| **Jaeger** | `jaegertracing/all-in-one:1.60.0` | `16686:16686` | Distributed tracing waterfall visualizer |
| **Grafana Loki** | `grafana/loki:3.1.0` | `3100:3100` | Structured JSON log storage engine |
| **Prometheus** | `prom/prometheus:v2.54.0` | `9090:9090` | Time-series metrics scraper & engine |
| **Grafana** | `grafana/grafana:11.2.0` | `3010:3000` | Unified observability dashboard |

---

## Daftar Alokasi Port

```text
3000   : Next.js Frontend (Storefront & Dashboard)
3010   : Grafana Observability Dashboard
8080   : API Gateway (Entrypoint Utama)
8081   : Auth Service
8082   : Product Service
8083   : Order Service
8084   : Payment Service
9090   : Prometheus Server
3100   : Grafana Loki
4317   : Alloy OTLP gRPC Receiver
4318   : Alloy OTLP HTTP Receiver
5433   : PostgreSQL (Host Port)
6433   : PgBouncer (Host Port)
6379   : Redis
5672   : RabbitMQ AMQP Protocol
15672  : RabbitMQ Management Web UI
16686  : Jaeger Web UI
```

---

## Panduan Menjalankan Project

### 1. Prasyarat (Prerequisites)
- **Go**: `1.22+`
- **Bun**: `1.1+`
- **Docker & Docker Compose**

### 2. Menjalankan Infrastruktur Docker
```bash
# Jalankan seluruh database, broker, dan stack observability
docker compose -f docker/docker-compose.yml up -d
```

### 3. Menjalankan Semua Microservices & Frontend Sekaligus (Rekomendasi)
Anda dapat menjalankan seluruh 5 microservice backend dan aplikasi web Next.js dengan 1 perintah:

```bash
# Menggunakan skrip bash langsung:
./start-all.sh

# Atau menggunakan Makefile:
make start
```
*Skrip otomatis memeriksa ketersediaan port, menjalankan services di background, mencatat log ke folder `logs/`, dan mematikan seluruh proses secara aman saat menekan `Ctrl + C`.*

Untuk mematikan seluruh services sewaktu-waktu:
```bash
./stop-all.sh
# Atau: make stop
```

---

### 4. Menjalankan Secara Manual Per-Layanan (Opsi Terminal Terpisah)
Gunakan perintah `make` pada terminal terpisah jika ingin melihat output langsung:

```bash
make dev-gateway   # Menjalankan API Gateway (Port 8080)
make dev-auth      # Menjalankan Auth Service (Port 8081)
make dev-product   # Menjalankan Product Service (Port 8082)
make dev-order     # Menjalankan Order Service (Port 8083)
make dev-payment   # Menjalankan Payment Service (Port 8084)
make dev-fe        # Menjalankan Frontend Next.js Web (Port 3000)
```

Atau kompilasi seluruh backend sekaligus:
```bash
make build-be
./bin/api-gateway &
./bin/auth-service &
./bin/product-service &
./bin/payment-service &
bun run --cwd services/order-service start:prod &
```

### 5. Injeksi & Sinkronisasi Data (PostgreSQL & Elasticsearch)
Untuk memasukkan data katalog kategori & produk ke PostgreSQL (`product_db`) dan menyinkronkannya ke **Elasticsearch** secara otomatis:

```bash
# Injeksi database PostgreSQL dan sync ke Elasticsearch:
./seed-data.sh
# Atau: make seed

# Custom jumlah produk dan reset bersih dari awal (--recreate):
./seed-data.sh --count 100000 --recreate
# Atau: make seed COUNT=100000 RECREATE=1

# Opsi hanya sinkronisasi produk dari PostgreSQL ke Elasticsearch (Dedicated ES Sync):
./sync-es.sh                  # Sinkronkan SELURUH produk database ke Elasticsearch
./sync-es.sh -r               # Reset index dan sinkronkan SEMUA data dari nol
./sync-es.sh --count 100000   # Sinkronkan 100.000 data
# Atau: make sync-es
```

### 6. Mengakses Dashboard & Observability
- **Storefront E-Commerce:** [http://localhost:3000](http://localhost:3000)
- **Halaman Checkout:** [http://localhost:3000/checkout](http://localhost:3000/checkout)
- **Grafana Observability:** [http://localhost:3010](http://localhost:3010) (Login: `admin` / `admin`)
  - Dashboard: **T.STORE Fullstack Observability Overview** (Live Logs & Jaeger Correlation)
  - Dashboard: **T.STORE Metrics (Prometheus)** (RPS, Latency P50/P95, Slow Alerts)
- **Jaeger Distributed Tracing:** [http://localhost:16686](http://localhost:16686)
- **Prometheus Targets:** [http://localhost:9090/targets](http://localhost:9090/targets)
- **RabbitMQ Dashboard:** [http://localhost:15672](http://localhost:15672) (User: `guest` / `guest`)

---

## Branching Strategy & Otomatisasi CI/CD

Repositori ini menerapkan strategi percabangan **Trunk-Based Development (TBD)** dengan branch **`production`** sebagai cabang utama (*single trunk*). Setiap perubahan fitur dibuat melalui cabang berumur pendek (*short-lived branch*), divalidasi oleh **Selective Path Filtering CI**, dan dideploy secara otomatis ke VPS menggunakan **Watchtower** dan **GitHub Container Registry (GHCR)**.

📘 **Dokumentasi Lengkap:** [Panduan Trunk-Based Development & CI/CD Deployment](docs/trunk-based-development.md)
