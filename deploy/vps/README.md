# Panduan Deployment VPS: Database & Observability Stack

Direktori ini (`deploy/vps/`) dirancang secara mandiri (*self-contained*) untuk memudahkan deployment **Infrastruktur Database & Observability Stack** ke server VPS sebelum menjalankan microservices dan web frontend.

---

## 📦 Layanan yang Dijalankan

| Layanan | Image | Port VPS | Fungsi |
| :--- | :--- | :--- | :--- |
| **PostgreSQL 16** | `postgres:16-alpine` | `5432` | Relational database (`auth_db`, `product_db`, `order_db`, `payment_db`) |
| **PgBouncer** | `edoburu/pgbouncer:latest` | `6432` | Connection pooler transaksi tinggi |
| **Redis 7** | `redis:7-alpine` | `6379` | In-memory caching store |
| **RabbitMQ 3** | `rabbitmq:3-management-alpine` | `5672` / `15672` | Event message broker & Web Dashboard UI |
| **Elasticsearch 8.15** | `elasticsearch:8.15.0` | `9200` | Search engine inverted index (CQRS) |
| **Grafana 11.2** | `grafana/grafana:11.2.0` | `3010` | Dashboard metrik & live logs monitoring |
| **Jaeger Tracing** | `jaegertracing/all-in-one:1.60.0` | `16686` | Visualisasi W3C distributed tracing |
| **Grafana Loki 3.1** | `grafana/loki:3.1.0` | `3100` | Centralized log ingestion |
| **Grafana Alloy v1.3** | `grafana/alloy:v1.3.0` | `4317` / `4318` / `12345` | OTel pipeline collector & receiver |
| **Prometheus v2.54** | `prom/prometheus:v2.54.0` | `9090` | Time-series metric scraper |
| **Cloudflare Exporter** | `ghcr.io/lablabs/cloudflare-exporter:v0.0.16` | `8085` | Edge analytics, WAF threats, & cache ratio scraper |

Semua container otomatis terhubung ke Docker network bernama **`ecommerce-network`**.

---

## 🚀 Cara Menjalankan di VPS (Quick Start)

### 1. Salin Folder ke VPS
Dari komputer lokal Anda, kirim folder `deploy/vps` ke VPS:
```bash
# Contoh menggunakan rsync:
rsync -avz deploy/vps/ user@<IP-VPS>:~/ecommerce-infra/

# Atau clone git di VPS dan masuk ke foldernya:
cd ~/ecommerce-platform/deploy/vps
```

### 2. Konfigurasi Variabel Lingkungan
Salin template konfigurasi `.env`:
```bash
cp .env.infra.example .env
```
*(Opsional)* Sesuaikan password database dan alokasi memory Elasticsearch di file `.env`:
```ini
POSTGRES_PASSWORD=password_aman_pilihan_anda
ES_JAVA_OPTS=-Xms1g -Xmx1g  # Gunakan 512m jika RAM VPS hanya 2GB
```

### 3. Jalankan Stack
Cukup jalankan satu perintah:
```bash
./start-infra.sh
```
Skrip ini akan otomatis:
1. Memverifikasi Docker & Docker Compose.
2. Menyalakan seluruh 10 container database dan observabilitas.
3. Menunggu healthcheck aktif (`postgres`, `redis`, `rabbitmq`, `elasticsearch`).
4. Memvalidasi pembuatan otomatis 4 database (`auth_db`, `product_db`, `order_db`, `payment_db`).
5. Menampilkan rangkuman URL akses & port.

---

## 📊 Akses Dashboard di Browser

Setelah stack berjalan, Anda dapat mengakses dashboard monitoring dari browser:

- **Grafana Dashboard**: `http://<IP-VPS>:3010`
  - *Default Login*: `admin` / `adminpassword_change_me_in_vps`
  - *Data Source*: Loki, Jaeger, dan Prometheus sudah terkonfigurasi otomatis (*pre-provisioned*).
- **RabbitMQ Management**: `http://<IP-VPS>:15672`
  - *Default Login*: `guest` / `guestpassword_change_me_in_vps`
- **Jaeger Distributed Trace**: `http://<IP-VPS>:16686`
- **Prometheus Metrics**: `http://<IP-VPS>:9090`
- **Elasticsearch Health**: `http://<IP-VPS>:9200/_cat/health?v`
- **Alloy Pipeline UI**: `http://<IP-VPS>:12345`

---

## 🛠️ Perintah Operasional

```bash
# Memeriksa status dan pemakaian RAM container (Live Snapshot)
./status-infra.sh

# Melihat log container tertentu
docker logs -f ecommerce-postgres
docker logs -f ecommerce-elasticsearch
docker logs -f ecommerce-alloy

# Menghentikan stack (data database tetap aman tersimpan di volume)
./stop-infra.sh

# Menghentikan stack dan MENGHAPUS seluruh volume data secara permanen
./stop-infra.sh --clean
```

---

## 🔌 Menghubungkan Microservices Nanti

Saat Anda siap menjalankan microservice (Go / NestJS / Web Next.js):
- **Di dalam Docker**: Cukup cantumkan `networks: - ecommerce-network` di docker-compose service Anda. Host internal langsung dikenali: `postgres:5432`, `redis:6379`, `rabbitmq:5672`, `elasticsearch:9200`, `alloy:4318`.
- **Di luar Docker (Host VPS)**: Microservices dapat menembak port lokal `localhost:5432` (atau PgBouncer `localhost:6432`), `localhost:6379`, `localhost:5672`, dsb.
