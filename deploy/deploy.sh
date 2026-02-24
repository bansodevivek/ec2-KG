#!/bin/bash
# ============================================================
#  HARDENED EC2 Deployment Script — Connected Auto Dashboard
#  Architecture: Ubuntu 22.04 LTS (t3.micro Free Tier)
# ============================================================
set -e

REPO="https://github.com/bansodevivek/ec2-KG.git"
APP_DIR="/home/ubuntu/ec2-KG"
USER="ubuntu"

echo "==> 1. Securing Home Directory Permissions for Nginx..."
chmod 755 /home/ubuntu

echo "==> 2. Creating 2GB Swap File (Preventing RAM Crash)..."
if [ ! -f /swapfile ]; then
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    # Make it permanent across reboots
    echo '/swapfile none swap sw 0 0' | tee -a /etc/fstab
    echo "Swap file created."
else
    echo "Swap file already exists."
fi

echo "==> 3. Installing System Dependencies (Ubuntu 22.04 Native)..."
apt-get update -q
apt-get install -y python3-venv python3-pip nginx nodejs npm git redis-server

echo "==> 4. Starting Redis..."
systemctl enable redis-server
systemctl start redis-server

echo "==> 5. Cloning / Updating Repository..."
if [ -d "$APP_DIR" ]; then
    cd "$APP_DIR" && git pull
else
    git clone "$REPO" "$APP_DIR"
    chown -R $USER:$USER "$APP_DIR"
fi

echo "==> 6. Setting up Python Virtual Environment..."
cd "$APP_DIR/backend"
python3 -m venv .venv
.venv/bin/pip install --upgrade pip -q
.venv/bin/pip install -r requirements.txt -q

echo "==> 7. Checking .env file configuration..."
if [ ! -f ".env" ]; then
    echo "SECRET_KEY=django-insecure-replace-me-later" > .env
    echo "DEBUG=False" >> .env
    echo "ALLOWED_HOSTS=*" >> .env
    echo "DB_NAME=ev_telematics" >> .env
    echo "DB_USER=postgres" >> .env
    echo "DB_PASSWORD=Password" >> .env
    echo "DB_HOST=REPLACE_WITH_NGROK_URL" >> .env
    echo "DB_PORT=REPLACE_WITH_NGROK_PORT" >> .env
    echo "REDIS_URL=redis://127.0.0.1:6379/0" >> .env
    echo "REDIS_CACHE_URL=redis://127.0.0.1:6379/1" >> .env
    echo "CORS_ALLOW_ALL_ORIGINS=True" >> .env

    echo ""
    echo "🚨 DEPLOYMENT HALTED TO PREVENT CRASH 🚨"
    echo "I created a blank .env file for you, but it lacks your database credentials."
    echo "Do this right now:"
    echo "  1. Run: nano $APP_DIR/backend/.env"
    echo "  2. Enter your friend's Ngrok DB_HOST and DB_PORT."
    echo "  3. Save the file."
    echo "  4. Run this deploy script one more time: sudo ./deploy/deploy.sh"
    exit 1
fi

echo "==> 8. Running Migrations & Collecting Static Files..."
.venv/bin/python manage.py migrate --noinput
.venv/bin/python manage.py collectstatic --noinput

echo "==> 9. Building React Frontend (Using Swap RAM)..."
cd "$APP_DIR/frontend"
npm ci --silent
npm run build

echo "==> 10. Configuring Systemd Service (Uvicorn)..."
cp "$APP_DIR/deploy/kg-backend.service" /etc/systemd/system/
systemctl daemon-reload
systemctl enable kg-backend
systemctl restart kg-backend

echo "==> 11. Configuring Nginx Reverse Proxy..."
cp "$APP_DIR/deploy/nginx.conf" /etc/nginx/sites-available/kg
ln -sf /etc/nginx/sites-available/kg /etc/nginx/sites-enabled/kg
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx

echo ""
echo "✅ DEPLOYMENT COMPLETE & SECURED."
echo "   Visit your public EC2 IP in your browser now."
echo ""