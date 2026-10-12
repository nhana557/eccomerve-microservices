#!/usr/bin/env bash
# ==============================================================================
# T.STORE: STOP DATABASE & OBSERVABILITY STACK ON VPS
# ==============================================================================

set -e

GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

COMPOSE="docker compose"
if ! docker compose version &> /dev/null; then
    COMPOSE="docker-compose"
fi

if [ "$1" == "--volumes" ] || [ "$1" == "--clean" ]; then
    echo -e "${RED}[PERINGATAN] Menghentikan container dan MENGHAPUS SEMUA DATA VOLUME...${NC}"
    $COMPOSE -f docker-compose.infra.yml down -v
    echo -e "${GREEN}[OK] Stack dihentikan dan volume dibersihkan.${NC}"
else
    echo -e "${YELLOW}Menghentikan stack database & observability (data volume tetap aman)...${NC}"
    $COMPOSE -f docker-compose.infra.yml down
    echo -e "${GREEN}[OK] Seluruh container berhasil dihentikan.${NC}"
    echo -e "Catatan: Untuk menghapus data volume secara permanen, gunakan: ${CYAN}./stop-infra.sh --clean${NC}"
fi
