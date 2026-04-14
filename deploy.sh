#!/bin/bash

# CRM Analytics Deployment Script for Google Cloud VM
# Usage: ./deploy.sh

set -e

echo "================================"
echo "CRM Analytics Deployment Script"
echo "================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root for system package installation
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}This script must be run as root for system packages${NC}"
   exit 1
fi

DOMAIN="ai.xiliumonline.net"
APP_DIR="/opt/CRMAnalytrics"
REPO_URL="https://github.com/your-username/CRMAnalytrics.git"

echo -e "${YELLOW}Starting setup for $DOMAIN${NC}"

# Step 1: System Updates
echo -e "\n${YELLOW}[1/8] Updating system...${NC}"
apt update && apt upgrade -y

# Step 2: Install dependencies
echo -e "\n${YELLOW}[2/8] Installing system dependencies...${NC}"
apt install -y \
    curl \
    git \
    build-essential \
    libssl-dev \
    libffi-dev \
    python3-dev \
    mysql-client \
    nginx \
    certbot \
    python3-certbot-nginx \
    curl

# Step 3: Install Node.js
echo -e "\n${YELLOW}[3/8] Installing Node.js...${NC}"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt install -y nodejs
else
    echo "Node.js already installed: $(node --version)"
fi

# Step 4: Install PM2
echo -e "\n${YELLOW}[4/8] Installing PM2...${NC}"
npm install -g pm2
pm2 startup

# Step 5: Clone repository
echo -e "\n${YELLOW}[5/8] Cloning repository...${NC}"
if [ -d "$APP_DIR" ]; then
    echo "Directory exists, pulling latest changes..."
    cd $APP_DIR
    git pull origin main
else
    git clone $REPO_URL $APP_DIR
    cd $APP_DIR
fi

# Step 6: Install dependencies
echo -e "\n${YELLOW}[6/8] Installing Node dependencies...${NC}"
cd $APP_DIR/backend
npm install

cd $APP_DIR/frontend
npm install

# Step 7: Setup SSL with Let's Encrypt
echo -e "\n${YELLOW}[7/8] Setting up SSL Certificate...${NC}"
if [ -d "/etc/letsencrypt/live/$DOMAIN" ]; then
    echo "SSL certificate already exists for $DOMAIN"
else
    certbot certonly --standalone -d $DOMAIN --non-interactive --agree-tos --register-unsafely-without-email
fi

# Step 8: Configure and start services
echo -e "\n${YELLOW}[8/8] Configuring services...${NC}"

# Copy Nginx config
cat > /etc/nginx/sites-available/$DOMAIN << 'NGINX_CONFIG'
upstream backend {
    server 127.0.0.1:3001;
}

server {
    listen 80;
    server_name ai.xiliumonline.net;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name ai.xiliumonline.net;

    ssl_certificate /etc/letsencrypt/live/ai.xiliumonline.net/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ai.xiliumonline.net/privkey.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;

    # Logging
    access_log /var/log/nginx/crm-analytics-access.log;
    error_log /var/log/nginx/crm-analytics-error.log;

    # Frontend root
    root /opt/CRMAnalytrics/frontend/dist;
    index index.html;

    # Serve static files with caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # API proxy
    location /api/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
        proxy_send_timeout 60s;
    }

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Deny access to hidden files
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
}
NGINX_CONFIG

# Enable Nginx site
ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/$DOMAIN

# Remove default config
rm -f /etc/nginx/sites-enabled/default

# Test and reload Nginx
nginx -t && systemctl reload nginx

# Build frontend
echo -e "\n${YELLOW}Building frontend...${NC}"
cd $APP_DIR/frontend
npm run build

# Start backend with PM2
echo -e "\n${YELLOW}Starting backend with PM2...${NC}"
cd $APP_DIR
pm2 start ecosystem.config.js
pm2 save

# Create log directory
mkdir -p /var/log/pm2
chown nobody:nogroup /var/log/pm2

echo -e "\n${GREEN}================================${NC}"
echo -e "${GREEN}Deployment Complete!${NC}"
echo -e "${GREEN}================================${NC}"
echo -e "\nApplication is running at: ${GREEN}https://$DOMAIN${NC}"
echo -e "\nNext steps:"
echo "1. Update backend/.env with your configuration"
echo "2. Restart backend: pm2 restart crm-analytics-backend"
echo "3. View logs: pm2 logs crm-analytics-backend"
echo ""
echo "DNS Records:"
echo "- Point $DOMAIN A record to your VM's public IP"
echo ""
echo "Useful commands:"
echo "  pm2 status              - Check service status"
echo "  pm2 logs                - View service logs"
echo "  pm2 restart all         - Restart all services"
echo "  sudo systemctl restart nginx  - Restart Nginx"
echo "  sudo certbot renew      - Renew SSL certificate"
