#!/usr/bin/env bash
# ==============================================================================
# T.STORE: CHECK STATUS DATABASE & OBSERVABILITY STACK ON VPS
# ==============================================================================

GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

COMPOSE="docker compose"
if ! docker compose version &> /dev/null; then
    COMPOSE="docker-compose"
fi

echo -e "${CYAN}================================================================${NC}"
echo -e "${CYAN}    T.STORE: STATUS CONTAINER INFRASTRUKTUR & OBSERVABILITY     ${NC}"
echo -e "${CYAN}================================================================${NC}"

$COMPOSE -f docker-compose.infra.yml ps

echo -e "\n${YELLOW}Penggunaan Resource Memory & CPU (Live Snapshot):${NC}"
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}\t{{.NetIO}}" \
    ecommerce-postgres ecommerce-pgbouncer ecommerce-redis ecommerce-rabbitmq \
    ecommerce-elasticsearch ecommerce-jaeger ecommerce-loki ecommerce-alloy \
    ecommerce-prometheus ecommerce-grafana 2>/dev/null || true

echo ""
