#!/usr/bin/env bash
# ==============================================================================
# T.STORE: START DATABASE & OBSERVABILITY STACK ON VPS
# ==============================================================================

set -e

GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo -e "${CYAN}================================================================${NC}"
echo -e "${CYAN}    T.STORE: MENJALANKAN DATABASE & OBSERVABILITY STACK (VPS)   ${NC}"
echo -e "${CYAN}================================================================${NC}"

# 1. Cek Docker Engine & Docker Compose
if ! command -v docker &> /dev/null; then
    echo -e "${RED}[ERROR] Docker belum terpasang di VPS ini.${NC}"
    echo "Pasang Docker: curl -fsSL https://get.docker.com | sh"
    exit 1
fi

COMPOSE="docker compose"
if ! docker compose version &> /dev/null; then
    if command -v docker-compose &> /dev/null; then
        COMPOSE="docker-compose"
    else
        echo -e "${RED}[ERROR] Docker Compose plugin tidak ditemukan.${NC}"
        exit 1
    fi
fi

# 2. Periksa File .env
if [ ! -f .env ]; then
    echo -e "${YELLOW}[!] File .env tidak ditemukan. Menyalin dari .env.infra.example...${NC}"
    cp .env.infra.example .env
    echo -e "${GREEN}[OK] File .env berhasil dibuat. Silakan sesuaikan password jika diperlukan.${NC}"
fi

# Load variables
set -a
[ -f .env ] && . .env
set +a

# 3. Jalankan Docker Compose Stack
echo -e "\n${YELLOW}[1/3] Menyalakan container database & observability...${NC}"
$COMPOSE -f docker-compose.infra.yml up -d

# 4. Menunggu Healthcheck Service Kunci
echo -e "\n${YELLOW}[2/3] Menunggu status healthcheck aktif...${NC}"
WAIT_SECS=0
MAX_SECS=45

check_health() {
    local name="$1"
    local status=$(docker inspect --format='{{json .State.Health.Status}}' "$name" 2>/dev/null || echo '"unknown"')
    echo "$status" | tr -d '"'
}

echo -n "Memeriksa PostgreSQL, Redis, RabbitMQ, Elasticsearch: "
while [ $WAIT_SECS -lt $MAX_SECS ]; do
    PG_H=$(check_health "ecommerce-postgres")
    RD_H=$(check_health "ecommerce-redis")
    RM_H=$(check_health "ecommerce-rabbitmq")
    ES_H=$(check_health "ecommerce-elasticsearch")

    if [ "$PG_H" == "healthy" ] && [ "$RD_H" == "healthy" ] && [ "$RM_H" == "healthy" ] && [ "$ES_H" == "healthy" ]; then
        echo -e "${GREEN} SEMUA SEHAT!${NC}"
        break
    fi

    echo -n "."
    sleep 2
    WAIT_SECS=$((WAIT_SECS + 2))
done

if [ $WAIT_SECS -ge $MAX_SECS ]; then
    echo -e "${YELLOW} (Beberapa service masih proses inisialisasi awal)${NC}"
fi

# 5. Tampilkan Status & Ringkasan Port
echo -e "\n${YELLOW}[3/3] Ringkasan Status Container:${NC}"
$COMPOSE -f docker-compose.infra.yml ps

GRAFANA_P=${GRAFANA_PORT:-3010}
RABBITMQ_P=${RABBITMQ_MGMT_PORT:-15672}
JAEGER_P=${JAEGER_PORT:-16686}
PROM_P=${PROMETHEUS_PORT:-9090}
ES_P=${ES_PORT:-9200}
ALLOY_P=${ALLOY_UI_PORT:-12345}

echo -e "\n${GREEN}================================================================${NC}"
echo -e "${GREEN}  DATABASE & OBSERVABILITY BERHASIL AKTIF DI VPS!               ${NC}"
echo -e "${GREEN}================================================================${NC}"
echo -e "  📊 Grafana Dashboard       : ${CYAN}http://<IP-VPS>:${GRAFANA_P}${NC}  (User: ${GRAFANA_USER:-admin})"
echo -e "  🐰 RabbitMQ Management UI  : ${CYAN}http://<IP-VPS>:${RABBITMQ_P}${NC}  (User: ${RABBITMQ_USER:-guest})"
echo -e "  🔍 Jaeger Distributed Trace: ${CYAN}http://<IP-VPS>:${JAEGER_P}${NC}"
echo -e "  📈 Prometheus Metrics      : ${CYAN}http://<IP-VPS>:${PROM_P}${NC}"
echo -e "  🔎 Elasticsearch CQRS      : ${CYAN}http://<IP-VPS>:${ES_P}${NC}"
echo -e "  ⚙️  Grafana Alloy Pipeline  : ${CYAN}http://<IP-VPS>:${ALLOY_P}${NC}"
echo -e "  🐘 PostgreSQL (Direct)     : ${CYAN}Port ${POSTGRES_PORT:-5432}${NC}"
echo -e "  ⚡ PgBouncer (Pooler)      : ${CYAN}Port ${PGBOUNCER_PORT:-6432}${NC}"
echo -e "  🔴 Redis Cache             : ${CYAN}Port ${REDIS_PORT:-6379}${NC}"
echo -e "${GREEN}================================================================${NC}"
echo -e "Semua service terhubung ke Docker network: ${CYAN}ecommerce-network${NC}\n"
