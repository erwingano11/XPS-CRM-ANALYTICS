# Quick Deploy to ai.xiliumonline.net on Google Cloud VM

## Prerequisites
- Google Cloud account with Compute Engine VM (Ubuntu 22.04)
- Static external IP assigned
- Domain `ai.xiliumonline.net` ready to point to the IP
- SSH access to the VM

## Step 1: SSH into Your Google VM

```bash
# Using gcloud CLI
gcloud compute ssh your-instance-name --zone=your-zone

# Or directly with SSH using the public IP
ssh -i ~/.ssh/your-key.pub your-username@YOUR_VM_PUBLIC_IP
```

## Step 2: Quick Deploy

```bash
# Become root
sudo su

# Download and run deployment script
cd /root
git clone https://github.com/your-repo/CRMAnalytrics.git
cd CRMAnalytrics
chmod +x deploy.sh
./deploy.sh
```

The script will:
- ✅ Install all dependencies (Node.js, PM2, Nginx, Certbot)
- ✅ Clone/pull your repository
- ✅ Build the frontend
- ✅ Setup SSL with Let's Encrypt
- ✅ Configure Nginx reverse proxy
- ✅ Start the backend with PM2

## Step 3: Configure DNS

1. Go to your domain registrar (Google Domains, Namecheap, etc.)
2. Add/Update A record:
   - Name: `ai.xiliumonline.net` (or just `ai` if you can)
   - Type: `A`
   - Value: `YOUR_VM_PUBLIC_IP`
3. Wait for DNS propagation (usually 5 minutes to 48 hours)

Verify: `nslookup ai.xiliumonline.net`

## Step 4: Configure Backend

```bash
# On your VM, edit the environment file
sudo nano /opt/CRMAnalytrics/backend/.env
```

Update these values:
```env
SUITECRM_URL=https://your-suitecrm-url/service/v4_1/rest.php
SUITECRM_USERNAME=your_username
SUITECRM_PASSWORD=your_password
CLIENT_ID=your_client_id
CLIENT_SECRET=your_client_secret
OPENAI_API_KEY=sk-your-key-here
MYSQL_PASSWORD=your_secure_password
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
JWT_SECRET=generate-a-random-secure-string
```

Restart backend:
```bash
cd /opt/CRMAnalytrics
pm2 restart crm-analytics-backend
pm2 logs crm-analytics-backend
```

## Step 5: Access Your Application

Open your browser and go to: `https://ai.xiliumonline.net`

## Monitoring & Troubleshooting

```bash
# Check service status
pm2 status

# View real-time logs
pm2 logs crm-analytics-backend

# View system resource usage
pm2 monit

# Check Nginx status
sudo systemctl status nginx

# View Nginx error logs
sudo tail -f /var/log/nginx/crm-analytics-error.log

# Restart services
pm2 restart all
sudo systemctl restart nginx

# Check SSL certificate
sudo certbot certificates

# Renew SSL (automatic, but can be manual)
sudo certbot renew --dry-run
```

## Database Management

```bash
# SSH into VM
sudo mysql -u root -p

# Inside MySQL
USE crm_analytics;
SHOW TABLES;

# Backup database
mysqldump -u root -p crm_analytics > backup_$(date +%Y%m%d).sql

# Restore backup
mysql -u root -p crm_analytics < backup_20240414.sql
```

## Update Application

```bash
# On your VM
cd /opt/CRMAnalytrics
git pull origin main

# Rebuild frontend
cd frontend
npm run build

# Restart backend
pm2 restart crm-analytics-backend

# View logs to confirm
pm2 logs
```

## Performance Tips

1. **Enable gzip compression** in Nginx (edit `/etc/nginx/sites-available/ai.xiliumonline.net`):
```nginx
gzip on;
gzip_types text/plain text/css text/javascript application/json application/javascript;
```

2. **Setup rate limiting**:
```nginx
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
location /api/ {
    limit_req zone=api_limit burst=20 nodelay;
    ...
}
```

3. **Monitor with PM2+**:
```bash
pm2 install pm2-auto-pull  # Auto-update from git
pm2 install pm2-logrotate  # Rotate logs
pm2 save
```

## Firewall Configuration (Google Cloud)

In Google Cloud Console:
1. VPC Network → Firewall rules
2. Create rules allowing:
   - Ingress on port 80 (HTTP)
   - Ingress on port 443 (HTTPS)
   - Egress on all ports (default)

## Security Considerations

- [ ] Change MySQL root password
- [ ] Disable SSH password login (use keys only)
- [ ] Set up firewall properly
- [ ] Enable automatic backups
- [ ] Use strong JWT_SECRET
- [ ] Regularly update packages: `sudo apt update && sudo apt upgrade`
- [ ] Monitor logs for suspicious activity
- [ ] Setup uptime monitoring with PM2+

## Estimate Costs (Google Cloud)

For a small-to-medium deployment:
- **VM**: e2-standard-2 → ~$60/month
- **Storage**: 100GB → ~$5/month
- **Network egress**: ~$0.12/GB (if applicable)
- **Total**: ~$65-70/month

Consider auto-scaling and load balancing if traffic grows.
