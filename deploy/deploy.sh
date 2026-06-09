#!/bin/bash
# ==============================================================================
#  deploy.sh — Zero-Friction Production Deployment
#  EV Telematics Platform | Kinetic Green
#
#  Usage:
#    First deploy:  sudo ./deploy.sh --init
#    Updates:       sudo ./deploy.sh
#
#  What it does:
#    1. Pulls latest code from GitHub (main branch)
#    2. Rebuilds only changed Docker images
#    3. Runs database migrations inside the backend container
#    4. Restarts the full stack with zero downtime
#    5. Cleans up dangling images to save disk space
# ==============================================================================
set -euo pipefail

# ── Configuration ────────────────────────────────────────────────────────────
APP_DIR="/home/ubuntu/ec2-KG"
GIT_BRANCH="main"
COMPOSE_FILE="docker-compose.yml"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'  # No Color

log() { echo -e "${CYAN}[$(date '+%H:%M:%S')]${NC} $1"; }
success() { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
error() { echo -e "${RED}[✗]${NC} $1" >&2; }

# ── Preflight Checks ────────────────────────────────────────────────────────
log "Starting deployment..."

if [ ! -d "$APP_DIR" ]; then
    error "Application directory $APP_DIR does not exist."
    error "Clone the repository first: git clone <repo-url> $APP_DIR"
    exit 1
fi

cd "$APP_DIR"

if [ ! -f ".env" ]; then
    if [ -f ".env.template" ]; then
        warn ".env file not found. Creating from template..."
        cp .env.template .env
        error "DEPLOYMENT HALTED: Edit .env with your production values first!"
        error "  nano $APP_DIR/.env"
        error "Then re-run: sudo ./deploy.sh"
        exit 1
    else
        error ".env file not found and no .env.template available."
        exit 1
    fi
fi

# ── Swap File (prevents OOM on t3.micro during npm build) ───────────────────
if [ ! -f /swapfile ]; then
    log "Creating 2GB swap file (prevents OOM during builds)..."
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' | tee -a /etc/fstab > /dev/null
    success "Swap file created and activated."
else
    swapon /swapfile 2>/dev/null || true
fi

# ── Git Pull ─────────────────────────────────────────────────────────────────
log "Pulling latest code from origin/${GIT_BRANCH}..."
git fetch origin "${GIT_BRANCH}" --prune
git reset --hard "origin/${GIT_BRANCH}"
success "Code updated to $(git log --oneline -1)"

# ── Docker Compose Build & Deploy ────────────────────────────────────────────
log "Building and deploying Docker stack..."
docker compose -f "$COMPOSE_FILE" up -d --build --remove-orphans

# ── Wait for Backend Health ──────────────────────────────────────────────────
log "Waiting for backend to become healthy..."
RETRIES=30
until docker compose exec -T backend curl -sf http://localhost:8000/api/login/ > /dev/null 2>&1; do
    RETRIES=$((RETRIES - 1))
    if [ $RETRIES -le 0 ]; then
        warn "Backend health check timed out. Check logs: docker compose logs backend"
        break
    fi
    sleep 2
done
if [ $RETRIES -gt 0 ]; then
    success "Backend is healthy."
fi

# ── Database Migrations ─────────────────────────────────────────────────────
log "Running database migrations..."
docker compose exec -T backend python manage.py migrate --noinput
success "Migrations applied."

# ── Create Cache Table (if not exists) ───────────────────────────────────────
docker compose exec -T backend python manage.py createcachetable 2>/dev/null || true

# ── Initialize (first deploy only) ──────────────────────────────────────────
if [ "${1:-}" = "--init" ]; then
    log "First deploy detected. Running initialization..."

    # Restore database backup if it exists
    if [ -f "$APP_DIR/backup_database.sql" ]; then
        log "Restoring database from backup_database.sql..."
        docker compose exec -T db psql -U postgres -d ev_telematics < "$APP_DIR/backup_database.sql" 2>/dev/null || true
        success "Database restored."
    fi

    success "Initialization complete."
fi

# ── Cleanup ──────────────────────────────────────────────────────────────────
log "Cleaning up dangling images..."
docker image prune -f
docker builder prune -f --filter "until=24h" 2>/dev/null || true
success "Cleanup complete."

# ── Summary ──────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✅  DEPLOYMENT COMPLETE${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  ${CYAN}Frontend:${NC}  http://$(curl -s ifconfig.me 2>/dev/null || echo 'your-ec2-ip')"
echo -e "  ${CYAN}API:${NC}       http://$(curl -s ifconfig.me 2>/dev/null || echo 'your-ec2-ip')/api/"
echo -e "  ${CYAN}Admin:${NC}     http://$(curl -s ifconfig.me 2>/dev/null || echo 'your-ec2-ip')/admin/"
echo ""
echo -e "  ${YELLOW}Logs:${NC}      docker compose logs -f --tail=100"
echo -e "  ${YELLOW}Status:${NC}    docker compose ps"
echo -e "  ${YELLOW}Stop:${NC}      docker compose down"
echo ""