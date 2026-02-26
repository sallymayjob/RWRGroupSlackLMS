#!/usr/bin/env bash
# setup.sh — First-time local development setup for RWRGroup Agentic LMS
#
# Usage:
#   chmod +x scripts/setup.sh
#   ./scripts/setup.sh
#
# What it does:
#   1. Checks required tools (Node 20+, Docker, Docker Compose, psql)
#   2. Installs npm dependencies
#   3. Creates .env from .env.example (if not already present)
#   4. Starts Postgres and Redis via Docker Compose
#   5. Waits for Postgres to be healthy
#   6. Applies the database schema
#   7. Prints next steps

set -euo pipefail

# ── Colour helpers ─────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Colour

info()    { echo -e "${CYAN}[setup]${NC} $*"; }
success() { echo -e "${GREEN}[setup]${NC} $*"; }
warn()    { echo -e "${YELLOW}[setup]${NC} $*"; }
error()   { echo -e "${RED}[setup] ERROR:${NC} $*" >&2; }

# ── Step 1: Tool checks ────────────────────────────────────────────────────────
info "Checking required tools…"

check_tool() {
  local tool="$1"
  local min_version="$2"
  local install_hint="$3"

  if ! command -v "$tool" &>/dev/null; then
    error "$tool is not installed. $install_hint"
    exit 1
  fi
}

check_tool node  "20" "Install from https://nodejs.org (use Node 20 LTS)"
check_tool npm   "10" "Comes with Node — update Node to 20+"
check_tool docker "" "Install from https://docs.docker.com/get-docker/"
check_tool docker "" ""

# Verify Docker Compose v2
if ! docker compose version &>/dev/null; then
  error "Docker Compose v2 is required. Update Docker Desktop or install the plugin."
  exit 1
fi

# Verify Node major version
NODE_MAJOR=$(node --version | sed 's/v//' | cut -d. -f1)
if [ "$NODE_MAJOR" -lt 20 ]; then
  error "Node.js 20+ is required (found v$(node --version | sed 's/v//')). Install from https://nodejs.org"
  exit 1
fi

# psql is optional for the schema step — warn if missing
if ! command -v psql &>/dev/null; then
  warn "psql not found — schema will be applied via Docker instead."
  PSQL_AVAILABLE=false
else
  PSQL_AVAILABLE=true
fi

success "All required tools found."

# ── Step 2: npm install ────────────────────────────────────────────────────────
info "Installing npm dependencies…"
npm install
success "Dependencies installed."

# ── Step 3: .env setup ────────────────────────────────────────────────────────
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if [ -f "$REPO_ROOT/.env" ]; then
  warn ".env already exists — skipping copy. Edit it manually if needed."
else
  cp "$REPO_ROOT/.env.example" "$REPO_ROOT/.env"
  success ".env created from .env.example"
  echo ""
  warn "IMPORTANT: Open .env and fill in the required values before continuing:"
  warn "  SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET, N8N_BASE_URL, DATABASE_URL, REDIS_URL"
  echo ""
  read -r -p "Press Enter once .env is configured, or Ctrl-C to stop and edit it now…"
fi

# Source .env to get DATABASE_URL for schema step
set -a
# shellcheck disable=SC1091
source "$REPO_ROOT/.env"
set +a

# ── Step 4: Start backing services ────────────────────────────────────────────
info "Starting Postgres and Redis via Docker Compose…"
docker compose up postgres redis -d
success "Services started."

# ── Step 5: Wait for Postgres ─────────────────────────────────────────────────
info "Waiting for Postgres to be healthy…"
RETRIES=20
until docker compose exec -T postgres pg_isready -U "${POSTGRES_USER:-lms_user}" -d "${POSTGRES_DB:-lms_db}" &>/dev/null; do
  RETRIES=$((RETRIES - 1))
  if [ "$RETRIES" -le 0 ]; then
    error "Postgres did not become healthy in time. Check: docker compose logs postgres"
    exit 1
  fi
  sleep 2
done
success "Postgres is ready."

# ── Step 6: Apply schema ──────────────────────────────────────────────────────
info "Applying database schema (db/schema.sql)…"
if [ "$PSQL_AVAILABLE" = true ] && [ -n "${DATABASE_URL:-}" ]; then
  psql "$DATABASE_URL" -f "$REPO_ROOT/db/schema.sql"
else
  # Fallback: apply via docker exec
  docker compose exec -T postgres psql \
    -U "${POSTGRES_USER:-lms_user}" \
    -d "${POSTGRES_DB:-lms_db}" \
    < "$REPO_ROOT/db/schema.sql"
fi
success "Schema applied."

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
success "Setup complete!"
echo ""
echo "  Next steps:"
echo "  1. Start the app:          npm run dev"
echo "  2. Expose to Slack:        ngrok http 3000"
echo "  3. Update Slack manifest:  paste the ngrok HTTPS URL as the app URL"
echo "  4. Import n8n workflows:   see DEPLOYMENT.md § 8"
echo ""
echo "  Useful commands:"
echo "  make help          List all Makefile targets"
echo "  make test          Run the test suite"
echo "  make shell-db      Open a Postgres shell"
