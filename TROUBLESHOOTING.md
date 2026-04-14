# Troubleshooting Guide

## Common Issues & Solutions

### 1. Backend won't start

**Error**: `Cannot find module 'express'`

**Solution**:
```bash
cd backend
npm install
npm run dev
```

**Error**: `ECONNREFUSED 127.0.0.1:3306` (MySQL connection failed)

**Solution**:
1. Ensure MySQL is running: `systemctl status mysql`
2. Check MySQL credentials in `.env` file
3. Verify MySQL is accessible: `mysql -u root -p -e "SELECT 1"`

**Error**: Port 3001 already in use

**Solution**:
```bash
# Find and kill the process using port 3001
lsof -i :3001
kill -9 <PID>

# Or change PORT in .env to 3002, 3003, etc.
```

### 2. Frontend won't build

**Error**: `VITE_API_URL is not defined`

**Solution**:
```bash
cd frontend
# Create .env.production file
echo "VITE_API_URL=/api" > .env.production
npm run build
```

**Error**: `npm ERR! code EACCES: permission denied`

**Solution**:
```bash
sudo chown -R $USER:$USER ~/.npm
npm install
```

### 3. SSL Certificate Issues

**Error**: `Let's Encrypt certificate not found`

**Solution**:
```bash
# Check certificate status
sudo certbot certificates

# Renew certificate
sudo certbot renew --force-renewal

# Regenerate if expired
sudo certbot certonly --standalone -d ai.xiliumonline.net
```

**Error**: `ERR_SSL_PROTOCOL_ERROR`

**Solution**:
```bash
# Verify SSL files exist
ls -la /etc/letsencrypt/live/ai.xiliumonline.net/

# Test SSL
openssl s_client -connect ai.xiliumonline.net:443

# Reload Nginx
sudo nginx -t && sudo systemctl reload nginx
```

### 4. Nginx Issues

**Error**: `nginx: [emerg] bind() to 0.0.0.0:80 failed`

**Solution**:
```bash
# Port 80 or 443 already in use
sudo lsof -i :80
sudo lsof -i :443
kill -9 <PID>

# Or check other services
sudo systemctl status apache2  # Stop if running
```

**Error**: `502 Bad Gateway`

**Solution**:
```bash
# Backend not running
pm2 status

# Restart backend
pm2 restart crm-analytics-backend

# Check backend logs
pm2 logs crm-analytics-backend

# Check Nginx proxy connection
sudo tail -f /var/log/nginx/crm-analytics-error.log
```

### 5. DNS Issues

**Issue**: Domain not resolving

**Solution**:
```bash
# Test DNS
nslookup ai.xiliumonline.net

# Flush DNS cache (if needed)
sudo systemctl restart systemd-resolved

# Check DNS propagation
dig ai.xiliumonline.net

# From terminal, test IP connection
curl -I http://YOUR_VM_IP
```

**Issue**: Browser shows "DNS server not found"

**Solution**:
1. Wait 5-48 hours for global DNS propagation
2. Verify A record is correct: `dig ai.xiliumonline.net A`
3. Check your domain registrar DNS settings
4. Try using Google DNS: 8.8.8.8, 8.8.4.4

### 6. Application Performance

**Issue**: Slow response times

**Solution**:
```bash
# Check system resources
pm2 monit

# Check memory usage
free -h

# Check disk space
df -h

# View slow queries in MySQL
# Enable slow query log and analyze
```

**Issue**: High CPU usage

**Solution**:
```bash
# Check what's consuming CPU
top
ps aux | grep node

# Increase PM2 memory limit
# Edit ecosystem.config.js:
# max_memory_restart: "2G"

pm2 restart all
```

### 7. Database Issues

**Error**: `MySQL query timeout`

**Solution**:
- Increase `max_allowed_packet` in MySQL config
- Optimize slow queries
- Add database indexes for frequently queried fields

```bash
# Connect to MySQL
mysql -u root -p crm_analytics

# Check database size
SELECT table_name, ROUND(((data_length + index_length) / 1024 / 1024), 2) AS size_mb FROM information_schema.tables WHERE table_schema = 'crm_analytics' ORDER BY size_mb DESC;

# Backup database
mysqldump -u root -p crm_analytics > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 8. Authentication Issues

**Error**: `Google OAuth redirect_uri_mismatch`

**Solution**:
1. Go to Google Cloud Console
2. OAuth 2.0 Credentials
3. Edit the credential
4. Add authorized redirect URIs:
   - `https://ai.xiliumonline.net`
   - `https://ai.xiliumonline.net/login`
   - `http://localhost:5173` (if testing locally)

**Error**: `Invalid JWT token` or `401 Unauthorized`

**Solution**:
```bash
# Clear local storage in browser (Developer Tools)
# localStorage.clear()

# Or login again

# Check JWT secret in backend/.env matches across sessions
JWT_SECRET=your-consistent-secret
```

### 9. Chroma DB Issues

**Error**: `ChromaDB connection refused`

**Solution**:
```bash
# ChromaDB not running
docker ps | grep chroma

# Start ChromaDB
docker run -d -p 8000:8000 chromadb/chroma

# Or update .env
CHROMA_HOST=0.0.0.0  # Allow external connections
CHROMA_PORT=8000
```

### 10. SuiteCRM Integration Issues

**Error**: `401 Unauthorized` from SuiteCRM

**Solution**:
```bash
# Verify SuiteCRM credentials are correct
# Check that OAuth2 is enabled in SuiteCRM
# Verify CLIENT_ID and CLIENT_SECRET match SuiteCRM settings

# Test SuiteCRM connection:
curl -X POST https://your-suitecrm.com/service/v4_1/rest.php \
  -d "method=login&input_type=JSON&response_type=JSON&rest_data={...}"
```

## Useful Commands

```bash
# Application Management
pm2 list                          # List all processes
pm2 stop crm-analytics-backend    # Stop specific app
pm2 restart all                   # Restart all
pm2 delete crm-analytics-backend  # Remove from PM2
pm2 flush                         # Clear all logs
pm2 save                          # Save startup config

# Nginx Management
sudo nginx -t                     # Test config
sudo systemctl start nginx        # Start
sudo systemctl stop nginx         # Stop
sudo systemctl restart nginx      # Restart
sudo systemctl reload nginx       # Reload (graceful)

# SSL Management
sudo certbot certificates         # List certs
sudo certbot renew               # Renew all
sudo certbot revoke -d ai.xiliumonline.net  # Revoke cert

# Database Management
mysql -u root -p crm_analytics   # Connect
mysqldump -u root -p crm_analytics > backup.sql  # Backup
mysql -u root -p crm_analytics < backup.sql      # Restore

# System Management
journalctl -u nginx -f           # View Nginx logs
tail -f /var/log/pm2/*.log       # View PM2 logs
systemctl status pm2             # Check PM2 service
df -h                            # Disk space
free -h                          # Memory usage
```

## Getting Help

1. **Check logs first**:
   ```bash
   pm2 logs crm-analytics-backend
   sudo tail -f /var/log/nginx/crm-analytics-error.log
   ```

2. **Enable debug mode** in backend:
   ```env
   NODE_DEBUG=*
   NODE_ENV=development
   ```

3. **Test connectivity**:
   ```bash
   curl -I https://ai.xiliumonline.net           # Frontend
   curl -I https://ai.xiliumonline.net/api/health # Backend
   ```

4. **Check configurations**:
   - Backend: `cat backend/.env`
   - Nginx: `cat /etc/nginx/sites-available/ai.xiliumonline.net`
   - PM2: `cat ecosystem.config.js`
