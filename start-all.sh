#!/usr/bin/env bash
# ==============================================================================
# T.STORE - Local Development Orchestrator Script
# Menjalankan seluruh Microservices Backend dan Frontend Web Next.js
# ==============================================================================

set -e

# Warna Terminal
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
MAGENTA='\033[0;35m'
BLUE='\033[0;34m'
DIM='\033[2m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Direktori Proyek
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

LOGS_DIR="$PROJECT_ROOT/logs"
mkdir -p "$LOGS_DIR"

echo -e "${CYAN}${BOLD}"
echo "=================================================================="
echo "    🚀 T.STORE E-COMMERCE PLATFORM - LOCAL RUNNER"
echo "=================================================================="
echo -e "${NC}"

# Array untuk menyimpan PID proses
PIDS=()

# Fungsi untuk membersihkan port jika masih dipakai oleh proses sebelumnya
cleanup_port() {
    local port=$1
    local pids=$(lsof -ti :"$port" 2>/dev/null || true)
    if [ -n "$pids" ]; then
        echo -e "${YELLOW}  • Menutup proses lama pada port :$port (PID: $pids)...${NC}"
        kill -9 $pids 2>/dev/null || true
    fi
}

# Fungsi Graceful Shutdown saat Ctrl+C ditekan
cleanup_all() {
    echo -e "\n${YELLOW}${BOLD}⚠️  Menghentikan seluruh microservices dan frontend...${NC}"
    for pid in "${PIDS[@]}"; do
        if kill -0 "$pid" 2>/dev/null; then
            kill -TERM "$pid" 2>/dev/null || true
        fi
    done

    # Tunggu sebentar dan pastikan semua port bersih
    sleep 1
    for port in 8080 8081 8082 8083 8084 3000; do
        local remaining=$(lsof -ti :"$port" 2>/dev/null || true)
        if [ -n "$remaining" ]; then
            kill -9 $remaining 2>/dev/null || true
        fi
    done

    echo -e "${GREEN}${BOLD}✅ Seluruh services dan web berhasil dihentikan secara bersih.${NC}"
    exit 0
}

# Tangkap signal interupsi
trap cleanup_all SIGINT SIGTERM EXIT

echo -e "${YELLOW}[1/3] Memeriksa ketersediaan port (8080-8084 & 3000)...${NC}"
for p in 8080 8081 8082 8083 8084 3000; do
    cleanup_port "$p"
done
echo -e "${GREEN}  ✓ Port siap digunakan.${NC}\n"

echo -e "${CYAN}[2/3] Menjalankan Microservices Backend & Frontend...${NC}"

# 1. API Gateway (Port 8080 - Go)
echo -ne "  • Memulai ${BOLD}API Gateway${NC} (:8080)... "
go run ./services/api-gateway/cmd/server/main.go > "$LOGS_DIR/gateway.log" 2>&1 &
PIDS+=($!)
echo -e "${GREEN}PID ${PIDS[-1]}${NC}"

# 2. Auth Service (Port 8081 - Go)
echo -ne "  • Memulai ${BOLD}Auth Service${NC} (:8081)... "
go run ./services/auth-service/cmd/server/main.go > "$LOGS_DIR/auth.log" 2>&1 &
PIDS+=($!)
echo -e "${GREEN}PID ${PIDS[-1]}${NC}"

# 3. Product Service (Port 8082 - Go)
echo -ne "  • Memulai ${BOLD}Product Service${NC} (:8082)... "
go run ./services/product-service/cmd/server/main.go > "$LOGS_DIR/product.log" 2>&1 &
PIDS+=($!)
echo -e "${GREEN}PID ${PIDS[-1]}${NC}"

# 4. Order Service (Port 8083 - NestJS via Bun)
echo -ne "  • Memulai ${BOLD}Order Service (NestJS)${NC} (:8083)... "
bun run --cwd services/order-service start:dev > "$LOGS_DIR/order.log" 2>&1 &
PIDS+=($!)
echo -e "${GREEN}PID ${PIDS[-1]}${NC}"

# 5. Payment Service (Port 8084 - Go)
echo -ne "  • Memulai ${BOLD}Payment Service${NC} (:8084)... "
go run ./services/payment-service/cmd/server/main.go > "$LOGS_DIR/payment.log" 2>&1 &
PIDS+=($!)
echo -e "${GREEN}PID ${PIDS[-1]}${NC}"

# 6. Frontend Web (Port 3000 - Next.js via Bun)
echo -ne "  • Memulai ${BOLD}Frontend Next.js Web${NC} (:3000)... "
bun run --cwd apps/web dev > "$LOGS_DIR/web.log" 2>&1 &
PIDS+=($!)
echo -e "${GREEN}PID ${PIDS[-1]}${NC}"

echo -e "\n${YELLOW}[3/3] Menunggu inisialisasi services...${NC}"
sleep 3

# Menampilkan tabel status & daftar endpoint
echo -e "\n${GREEN}${BOLD}✨ SEMUA LAYANAN SEDANG BERJALAN DENGAN SUKSES!${NC}\n"
echo -e "${DIM}------------------------------------------------------------------${NC}"
echo -e " ${BOLD}KOMPONEN${NC}             ${BOLD}PORT${NC}     ${BOLD}URL / HEALTHCHECK${NC}"
echo -e "${DIM}------------------------------------------------------------------${NC}"
echo -e " 🌐 Frontend Web       ${CYAN}:3000${NC}    http://localhost:3000"
echo -e " 🚪 API Gateway        ${CYAN}:8080${NC}    http://localhost:8080/api/v1/health"
echo -e " 🔐 Auth Service       ${CYAN}:8081${NC}    http://localhost:8081/health"
echo -e " 📦 Product Service    ${CYAN}:8082${NC}    http://localhost:8082/health"
echo -e " 🛒 Order Service      ${CYAN}:8083${NC}    http://localhost:8083/health"
echo -e " 💳 Payment Service    ${CYAN}:8084${NC}    http://localhost:8084/health"
echo -e "${DIM}------------------------------------------------------------------${NC}"
echo -e " 📜 File Log tersimpan di: ${BOLD}$LOGS_DIR/${NC}"
echo -e "    • tail -f logs/web.log        (Log Frontend)"
echo -e "    • tail -f logs/order.log      (Log NestJS Order Service)"
echo -e "    • tail -f logs/gateway.log    (Log API Gateway)"
echo -e "${DIM}------------------------------------------------------------------${NC}"
echo -e "${MAGENTA}${BOLD}Tekan [Ctrl + C] untuk menghentikan semua service sekaligus.${NC}\n"

# Jaga agar proses tetap hidup sampai pengguna menekan Ctrl+C
wait
