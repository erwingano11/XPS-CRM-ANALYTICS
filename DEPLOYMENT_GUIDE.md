# Deployment Guide: ai.xiliumonline.net on Google Cloud VM

## Prerequisites
- Google Cloud account with a VM instance (Ubuntu 20.04 LTS or 22.04)
- Domain `ai.xiliumonline.net` with DNS access
- MySQL database access (local or managed)
- Node.js 16+ installed
- OpenAI API key

## Step 1: Google Cloud VM Setup

### 1.1 Create/Configure VM
1. Create Ubuntu 22.04 LTS instance (e.g., e2-medium or e2-standard-2)
2. Allocate static external IP address
3. Configure firewall rules:
   - Allow HTTP (80)
   - Allow HTTPS (443)
   - Allow SSH (22)
   - Allow ports 3001 (backend), 3306 (MySQL if local)

### 1.2 Connect to VM
```bash
gcloud compute ssh your-instance-name --zone=your-zone
# Or use SSH client with the VM's external IP
```

## Step 2: Install Dependencies on VM

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install MySQL client (if using managed database)
sudo apt install -y mysql-client

# Install Nginx (reverse proxy)
sudo apt install -y nginx

# Install Certbot for Let's Encrypt SSL
sudo apt install -y certbot python3-certbot-nginx

# Install PM2 (process manager)
sudo npm install -g pm2
```

## Step 3: DNS Configuration

1. Go to your domain registrar (Google Domains, GoDaddy, etc.)
2. Point `ai.xiliumonline.net` A record to your VM's static external IP
3. Wait for propagation (can take up to 48 hours, usually 5-30 minutes)

Verify with:
```bash
nslookup ai.xiliumonline.net
```

## Step 4: Clone and Setup Application on VM

```bash
cd /opt
sudo git clone https://github.com/your-repo/CRMAnalytrics.git
cd CRMAnalytrics
sudo chown -R $USER:$USER .

# Install dependencies
npm install --prefix backend
npm install --prefix frontend
```

## Step 5: Create Backend .env File

Create `/opt/CRMAnalytrics/backend/.env`:
```env
PORT=3001
NODE_ENV=production

# SuiteCRM Configuration
SUITECRM_URL=https://your-suitecrm-instance.com
SUITECRM_USERNAME=your_username
SUITECRM_PASSWORD=your_password
CLIENT_ID=your_client_id
CLIENT_SECRET=your_client_secret

# OpenAI Configuration
OPENAI_API_KEY=sk-your-api-key-here
OPENAI_MODEL=gpt-4o-mini

# MySQL Configuration
MYSQL_HOST=localhost  # Use IP if managed database
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_mysql_password
MYSQL_DATABASE=crm_analytics

# Google OAuth (for frontend login)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# JWT
JWT_SECRET=generate-a-secure-random-string-here
```

## Step 6: Setup Nginx Reverse Proxy

Create `/etc/nginx/sites-available/ai.xiliumonline.net`:
```nginx
upstream backend {
    server 127.0.0.1:3001;
}

server {
    listen 80;
    server_name ai.xiliumonline.net;
    
    location / {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /static/ {
        alias /opt/CRMAnalytrics/frontend/dist/;
        expires 7d;
        add_header Cache-Control "public, immutable";
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/ai.xiliumonline.net /etc/nginx/sites-enabled/
sudo nginx -t  # Test configuration
sudo systemctl restart nginx
```

## Step 7: Setup Let's Encrypt SSL Certificate

```bash
sudo certbot --nginx -d ai.xiliumonline.net

# Follow prompts:
# - Enter email
# - Agree to terms
# - Choose to redirect HTTP to HTTPS (recommended)
```

Auto-renewal setup:
```bash
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

## Step 8: Build Frontend

```bash
cd /opt/CRMAnalytrics/frontend

# Create .env file for frontend
cat > .env.production << EOF
VITE_API_URL=https://ai.xiliumonline.net
VITE_GOOGLE_CLIENT_ID=your_google_client_id
EOF

# Build
npm run build
```

## Step 9: Setup Backend with PM2

Create `/opt/CRMAnalytrics/ecosystem.config.js`:
```javascript
module.exports = {
  apps: [
    {
      name: 'crm-analytics-backend',
      script: './src/server.js',
      cwd: '/opt/CRMAnalytrics/backend',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      error_file: '/var/log/pm2/backend-error.log',
      out_file: '/var/log/pm2/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ]
};
```

Start the application:
```bash
cd /opt/CRMAnalytrics
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## Step 10: Setup Nginx Reverse Proxy for Frontend

Update `/etc/nginx/sites-available/ai.xiliumonline.net`:
```nginx
upstream backend {
    server 127.0.0.1:3001;
}

server {
    listen 80;
    listen 443 ssl http2;
    server_name ai.xiliumonline.net;

    ssl_certificate /etc/letsencrypt/live/ai.xiliumonline.net/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ai.xiliumonline.net/privkey.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Frontend
    root /opt/CRMAnalytrics/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
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
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    if ($scheme != "https") {
        return 301 https://$server_name$request_uri;
    }
}
```

Reload Nginx:
```bash
sudo nginx -t && sudo systemctl reload nginx
```

## Step 11: Update Backend Routes to Use /api Prefix

Update backend `src/server.js` to serve frontend files and handle API routes properly:
```javascript
// Serve frontend
app.use(express.static(path.join(__dirname, '../../frontend/dist')));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/analytics', analyticsRoutes);

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/dist/index.html'));
});
```

## Step 12: Monitor and Logs

```bash
# View PM2 logs
pm2 logs crm-analytics-backend

# View Nginx access logs
sudo tail -f /var/log/nginx/access.log

# View Nginx error logs
sudo tail -f /var/log/nginx/error.log

# Monitor system resources
pm2 monit
```

## Step 13: Backup & Maintenance

```bash
# Backup MySQL database
mysqldump -u root -p crm_analytics > /backups/crm_analytics_$(date +%Y%m%d).sql

# Setup automated backup (crontab)
# 0 2 * * * mysqldump -u root -pPASSWORD crm_analytics > /backups/crm_analytics_$(date +\%Y\%m\%d).sql
```

## Testing

Visit: `https://ai.xiliumonline.net`

## Troubleshooting

```bash
# Check if backend is running
pm2 status

# Restart backend
pm2 restart crm-analytics-backend

# Check Nginx status
sudo systemctl status nginx

# Rebuild frontend after changes
cd frontend && npm run build

# Test SSL certificate
curl -I https://ai.xiliumonline.net
```

## Security Considerations

- [ ] Change all default passwords
- [ ] Keep SSH key secure; disable password auth
- [ ] Setup firewall rules properly
- [ ] Enable 2FA on Google Cloud
- [ ] Regularly update dependencies: `npm audit fix`
- [ ] Setup monitoring/alerting
- [ ] Configure CORS properly if needed
- [ ] Use environment variables for sensitive data
