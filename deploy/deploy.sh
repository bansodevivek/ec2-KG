#!/bin/bash
# ============================================================
#  EC2 Deployment Script — Connected Auto Dashboard
#  Run once on a fresh Ubuntu 22.04 EC2 instance:
#      chmod +x deploy.sh && sudo ./deploy.sh
# ============================================================
set -e

REPO="https://github.com/bansodevivek/ec2-KG.git"
APP_DIR="/home/ubuntu/ec2-KG"
USER="ubuntu"

echo "==> Installing system dependencies..."
apt-get update -q
apt-get install -y python3.11 python3.11-venv python3-pip nginx nodejs npm git redis-server

echo "==> Starting Redis..."
systemctl enable redis-server
systemctl start redis-server

echo "==> Cloning / updating repository..."
if [ -d "$APP_DIR" ]; then
    cd "$APP_DIR" && git pull
else
    git clone "$REPO" "$APP_DIR"
    chown -R $USER:$USER "$APP_DIR"
fi

# ── Backend ──────────────────────────────────────────────────
echo "==> Setting up Python venv..."
cd "$APP_DIR/backend"
python3.11 -m venv .venv
.venv/bin/pip install --upgrade pip -q
.venv/bin/pip install -r requirements.txt -q

echo "==> Checking .env file..."
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo ""
    echo "  ⚠️  IMPORTANT: Edit /home/ubuntu/ec2-KG/backend/.env before continuing!"
    echo "      Set SECRET_KEY, DB_PASSWORD, ALLOWED_HOSTS, CORS_ALLOWED_ORIGINS"
    echo ""
    read -p "Press ENTER after editing .env to continue..."
fi

echo "==> Running migrations..."
.venv/bin/python manage.py migrate --noinput

echo "==> Collecting static files..."
.venv/bin/python manage.py collectstatic --noinput

# ── Frontend ─────────────────────────────────────────────────
echo "==> Building frontend..."
cd "$APP_DIR/frontend"
npm ci --silent
npm run build

# ── Systemd service ──────────────────────────────────────────
echo "==> Installing systemd service..."
cp "$APP_DIR/deploy/kg-backend.service" /etc/systemd/system/
systemctl daemon-reload
systemctl enable kg-backend
systemctl restart kg-backend

# ── Nginx ────────────────────────────────────────────────────
echo "==> Configuring Nginx..."
cp "$APP_DIR/deploy/nginx.conf" /etc/nginx/sites-available/kg
ln -sf /etc/nginx/sites-available/kg /etc/nginx/sites-enabled/kg
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx

echo ""
echo "✅ Deployment complete!"
echo "   Backend : http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):8000"
echo "   Frontend: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)"
echo ""
echo "   Useful commands:"
echo "     sudo systemctl status kg-backend"
echo "     sudo journalctl -u kg-backend -f"
echo "     sudo systemctl restart kg-backend"
