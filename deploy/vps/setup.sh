#!/usr/bin/env bash
# ==============================================================================
# T.STORE STANDALONE VPS SETUP SCRIPT (Zero Source Code Required)
# ==============================================================================

set -e

GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${CYAN}====================================================${NC}"
echo -e "${CYAN}  T.STORE: STANDALONE VPS DEPLOYMENT & WATCHTOWER   ${NC}"
echo -e "${CYAN}  (Tanpa Source Code / Murni Container Dari GHCR)   ${NC}"
echo -e "${CYAN}====================================================${NC}"

# 1. Cek Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}[ERROR] Docker belum terpasang.${NC}"
    echo "Pasang docker: curl -fsSL https://get.docker.com | sh"
    exit 1
fi

COMPOSE="docker compose"
if ! docker compose version &> /dev/null; then
    COMPOSE="docker-compose"
fi

# 2. Login ke GHCR jika belum
CONFIG_FILE="${HOME}/.docker/config.json"
if [ ! -f "$CONFIG_FILE" ] || ! grep -q "ghcr.io" "$CONFIG_FILE" 2>/dev/null; then
    echo -e "\n${YELLOW}[1/3] Login ke GitHub Container Registry (ghcr.io)...${NC}"
    read -p "GitHub Username (misal: nhana557): " GH_USER
    read -s -p "GitHub Personal Access Token (scope read:packages): " GH_TOKEN
    echo ""
    echo "$GH_TOKEN" | docker login ghcr.io -u "$GH_USER" --password-stdin
    echo -e "${GREEN}[OK] Berhasil login ke ghcr.io!${NC}"
else
    echo -e "${GREEN}[OK] Autentikasi ghcr.io sudah aktif.${NC}"
fi

# 3. Setup .env
echo -e "\n${YELLOW}[2/3] Memeriksa file .env...${NC}"
if [ ! -f .env ]; then
    cp .env.example .env
    echo -e "${GREEN}[OK] File .env dibuat dari .env.example.${NC}"
fi

# 4. Pull & Jalankan
echo -e "\n${YELLOW}[3/3] Menjalankan Stack Container & Watchtower...${NC}"
$COMPOSE pull || true
$COMPOSE up -d

echo -e "\n${GREEN}====================================================${NC}"
echo -e "${GREEN}  DEPLOYMENT BERHASIL!                             ${NC}"
echo -e "${GREEN}====================================================${NC}"
$COMPOSE ps

echo -e "\n${CYAN}Log Watchtower:${NC}"
docker logs --tail 10 ecommerce-watchtower || true
echo -e "\n${GREEN}Watchtower aktif memantau GHCR setiap 60 detik.${NC}\n"
