# SuiteCRM Analytics - AI Chat Assistant

An AI-powered analytics platform for SuiteCRM data using natural language queries.

## Tech Stack

- **Frontend**: React.js (Vite) + Bootstrap 5 + GSAP
- **Backend**: Node.js (Express)
- **Vector DB**: ChromaDB (for semantic search & RAG)
- **Database**: MySQL (conversation storage)
- **CRM**: SuiteCRM V8 REST API (OAuth2)
- **AI**: OpenAI API (GPT-4) with RAG pipeline

## Project Structure

```
CRMAnalytrics/
├── backend/                  # Express.js backend
│   ├── src/
│   │   ├── server.js         # Entry point
│   │   ├── config.js         # Configuration
│   │   ├── services/
│   │   │   ├── suitecrmService.js   # SuiteCRM API client
│   │   │   ├── chromaService.js     # ChromaDB vector store
│   │   │   ├── mysqlService.js      # MySQL conversations
│   │   │   ├── aiService.js         # OpenAI + RAG
│   │   │   └── syncService.js       # Data sync pipeline
│   │   └── routes/
│   │       ├── chat.js       # Chat endpoints
│   │       └── analytics.js  # Dashboard & sync endpoints
│   ├── package.json
│   └── .env.example
├── frontend/                 # React + Vite frontend
│   ├── src/
│   │   ├── components/Layout.jsx
│   │   ├── pages/ChatPage.jsx
│   │   ├── pages/DashboardPage.jsx
│   │   ├── services/api.js
│   │   └── App.jsx
│   ├── package.json
│   └── vite.config.js
└── docker-compose.yml
```

## Quick Start

### Prerequisites
- Node.js 18+
- MySQL 8.0
- ChromaDB (via Docker: `docker run -p 8000:8000 chromadb/chroma`)
- SuiteCRM instance with API credentials
- OpenAI API key

### Backend
```bash
cd backend
cp .env.example .env  # Edit with your credentials
npm install
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Docker
```bash
docker-compose up --build
```

## Environment Variables

| Variable | Description |
|---|---|
| `SUITECRM_URL` | SuiteCRM instance URL |
| `SUITECRM_USERNAME` | SuiteCRM admin username |
| `SUITECRM_PASSWORD` | SuiteCRM admin password |
| `CLIENT_ID` | SuiteCRM OAuth2 client ID |
| `CLIENT_SECRET` | SuiteCRM OAuth2 client secret |
| `OPENAI_API_KEY` | OpenAI API key |
| `CHROMA_HOST` | ChromaDB host (default: localhost) |
| `CHROMA_PORT` | ChromaDB port (default: 8000) |
| `MYSQL_HOST` | MySQL host |
| `MYSQL_DATABASE` | MySQL database name |

## Production Deployment

### Deploy to Google Cloud VM

See [QUICK_DEPLOY.md](QUICK_DEPLOY.md) for quick setup or [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for detailed instructions.

**One-liner deployment (on Google VM)**:
```bash
sudo su
git clone https://github.com/your-repo/CRMAnalytrics.git
cd CRMAnalytrics
chmod +x deploy.sh
./deploy.sh
```

**Then configure DNS**:
1. Point `ai.xiliumonline.net` A record to your VM's static IP
2. Wait for DNS propagation (5 minutes to 48 hours)
3. Application will auto-redirect to HTTPS with Let's Encrypt SSL

### Features
- ✅ Automatic Let's Encrypt SSL certificate
- ✅ Nginx reverse proxy with caching
- ✅ PM2 process management & auto-restart
- ✅ Automatic SSL renewal
- ✅ Production-optimized builds

### Monitoring
```bash
pm2 status              # Check service status
pm2 logs               # View real-time logs
pm2 monit              # Monitor system resources
pm2 restart all        # Restart services
```

### Database Setup
```bash
# On your VM
mysql -u root -p crm_analytics < setup.sql
```

## API Endpoints

- **Health Check**: `GET /api/health`
- **Chat**: `POST /api/chat/message` (authenticated)
- **Conversations**: `GET /api/chat/conversations` (authenticated)
- **Analytics**: `GET /api/analytics/stats` (authenticated)
- **Auth**: `POST /api/auth/google` (public)

## Architecture

```
┌─────────────────────────────────────────┐
│         Frontend (React + Vite)         │
│     Static SPA served by Nginx          │
└──────────────────┬──────────────────────┘
                   │ HTTP/HTTPS
                   ↓
┌─────────────────────────────────────────┐
│    Nginx Reverse Proxy & SSL Termination│
│         ai.xiliumonline.net:443         │
└──────────────────┬──────────────────────┘
                   │ Proxy Pass
                   ↓
┌─────────────────────────────────────────┐
│     Express Backend (Node.js PM2)       │
│     Localhost:3001                      │
├─────────────────────────────────────────┤
│ • OpenAI GPT-4 Integration              │
│ • SuiteCRM OAuth2 Authentication        │
│ • ChromaDB Vector Search (RAG)          │
│ • MySQL Conversation Storage            │
└─────────────────────────────────────────┘
                   │
        ┌──────────┼──────────┐
        ↓          ↓          ↓
   ┌────────┐ ┌────────┐ ┌────────┐
   │OpenAI  │ │SuiteCRM│ │MySQL DB│
   │API     │ │API     │ │        │
   └────────┘ └────────┘ └────────┘
```

## License

MIT
