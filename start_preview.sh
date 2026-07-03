#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
#  Goddest Metals — Preview Launcher  (macOS / Linux)
#  Usage:  ./start_preview.sh
# ─────────────────────────────────────────────────────────────
set -e

CYAN='\033[0;36m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
RESET='\033[0m'
BOLD='\033[1m'

echo ""
echo -e "${CYAN}${BOLD} ================================================${RESET}"
echo -e "${CYAN}${BOLD}   Goddest Metals Company — Preview Mode         ${RESET}"
echo -e "${CYAN}${BOLD}   Silver Transaction Management Software         ${RESET}"
echo -e "${CYAN}${BOLD} ================================================${RESET}"
echo ""

# ── Check Node.js ─────────────────────────────────────────────
if ! command -v node &>/dev/null; then
    echo -e "${RED}[ERROR] Node.js is not installed.${RESET}"
    echo ""
    echo "  Install Node.js from https://nodejs.org  (LTS recommended)"
    echo "  Or via nvm:  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash"
    echo ""
    exit 1
fi

NODE_VER=$(node -v)
echo -e "  ${GREEN}✓${RESET} Node.js found: ${NODE_VER}"

# ── Move into preview directory ───────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/preview"

# ── Install dependencies if needed ───────────────────────────
if [ ! -d "node_modules" ]; then
    echo ""
    echo -e "  ${YELLOW}Installing dependencies — runs only once, please wait...${RESET}"
    echo ""
    npm install
    echo ""
    echo -e "  ${GREEN}✓${RESET} Dependencies installed."
fi

# ── Open browser (best-effort) ────────────────────────────────
open_browser() {
    local url="$1"
    sleep 1.5
    if command -v xdg-open &>/dev/null; then
        xdg-open "$url" &>/dev/null &
    elif command -v open &>/dev/null; then
        open "$url" &
    fi
}

# ── Launch ────────────────────────────────────────────────────
echo ""
echo -e "  ${GREEN}${BOLD}Starting preview server...${RESET}"
echo -e "  App URL  :  ${CYAN}http://localhost:3000${RESET}"
echo -e "  Login    :  ${YELLOW}admin${RESET} / ${YELLOW}admin123${RESET}"
echo ""
echo -e "  Press ${BOLD}Ctrl+C${RESET} to stop the server."
echo "  ──────────────────────────────────────────────"
echo ""

open_browser "http://localhost:3000" &
npx vite --port 3000
