#!/usr/bin/env bash
# ==============================================================================
# T.STORE - Quick Stop Script
# Menghentikan seluruh proses Microservices (8080-8084) dan Frontend Web (3000)
# ==============================================================================

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m'

echo -e "${YELLOW}${BOLD}Menghentikan seluruh microservices dan frontend web...${NC}"

PORTS=(8080 8081 8082 8083 8084 3000)
KILLED=0

for port in "${PORTS[@]}"; do
    pids=$(lsof -ti :"$port" 2>/dev/null || true)
    if [ -n "$pids" ]; then
        echo -e "  • Menutup port :$port (PID: $pids)"
        kill -9 $pids 2>/dev/null || true
        KILLED=$((KILLED + 1))
    fi
done

if [ $KILLED -gt 0 ]; then
    echo -e "${GREEN}${BOLD}✓ Berhasil menghentikan seluruh services!${NC}"
else
    echo -e "${CYAN}Seluruh port (8080-8084 & 3000) sudah dalam keadaan mati/bersih.${NC}"
fi
