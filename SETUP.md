# Polyscan - Detailed Setup Guide

## Step-by-Step Installation

### 1. Prerequisites

Make sure you have installed:
- **Node.js 18+**: Download from https://nodejs.org/
- **npm** or **yarn**: Comes with Node.js
- **Redis** (optional): Download from https://redis.io/
  - macOS: `brew install redis`
  - Ubuntu: `sudo apt-get install redis-server`
  - Windows: Use WSL or Docker

### 2. Get Opinion API Key

1. Visit https://docs.opinion.trade/
2. Sign up for API access
3. Copy your API key
4. Save it for later use

### 3. Install Backend

```bash
cd polyscan
npm install
```

This will install all backend dependencies:
- express
- axios
- cors
- dotenv
- ioredis
- winston
- string-similarity
- natural

### 4. Install Frontend

```bash
cd frontend
npm install
```

This will install all frontend dependencies:
- react
- react-dom
- vite
- tailwindcss
- axios

### 5. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` file:
```env
PORT=3001
NODE_ENV=development
REDIS_HOST=localhost
REDIS_PORT=6379
OPINION_API_KEY=your_actual_api_key_here
CACHE_TTL=60
UPDATE_INTERVAL=30000
MIN_PROFIT_THRESHOLD=0.01
SIMILARITY_THRESHOLD=0.85
```

**Important:** Replace `your_actual_api_key_here` with your real Opinion API key!

### 6. Start Redis (Optional)

If you have Redis installed:
```bash
redis-server
```

If you don't have Redis, the app will still work but without caching.

### 7. Run the Application

**Development mode (recommended):**
```bash
npm run dev
```

This command starts both backend and frontend concurrently.

**Or run separately:**

Terminal 1:
```bash
npm run dev:backend
```

Terminal 2:
```bash
cd frontend
npm run dev
```

### 8. Open in Browser

Navigate to: http://localhost:3000

You should see the Polyscan interface with 4 tabs.

## Verification

### Check Backend

1. Open http://localhost:3001/api/health
2. You should see:
```json
{
  "status": "ok",
  "timestamp": "2025-12-23T...",
  "lastUpdate": "2025-12-23T..."
}
```

### Check Frontend

1. Open http://localhost:3000
2. You should see the dashboard
3. Data should load within 30 seconds

### Check Logs

```bash
tail -f logs/combined.log
```

You should see:
```
2025-12-23 12:00:00 info: Starting Polyscan server...
2025-12-23 12:00:01 info: Fetching Polymarket markets
2025-12-23 12:00:02 info: Fetched 100 Polymarket markets
2025-12-23 12:00:03 info: Server running on port 3001
```

## Common Issues

### Issue 1: "OPINION_API_KEY not set"

**Solution:**
1. Open `.env` file
2. Add your API key: `OPINION_API_KEY=your_key`
3. Restart the server

### Issue 2: Redis connection error

**Solution:**
Either:
- Start Redis: `redis-server`
- Or ignore (app works without Redis)

### Issue 3: Port 3000 already in use

**Solution:**
```bash
# Find process using port
lsof -ti:3000

# Kill process
kill -9 <PID>

# Or change port in frontend/vite.config.ts
```

### Issue 4: Port 3001 already in use

**Solution:**
```bash
# Change port in .env
PORT=3002

# Update frontend proxy in frontend/vite.config.ts
target: 'http://localhost:3002'
```

### Issue 5: No data showing

**Solution:**
1. Check backend logs: `tail -f logs/combined.log`
2. Verify API key is correct
3. Check network connection
4. Try manual refresh: `curl http://localhost:3001/api/refresh -X POST`

## Production Deployment

### Build for Production

```bash
# Build backend
npm run build:backend

# Build frontend
cd frontend
npm run build
```

### Run in Production

```bash
NODE_ENV=production npm start
```

### Deploy to Server

1. **Using PM2:**
```bash
npm install -g pm2
pm2 start dist/index.js --name polyscan
pm2 save
pm2 startup
```

2. **Using Docker:**
```dockerfile
FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3001
CMD ["npm", "start"]
```

3. **Using systemd:**
```ini
[Unit]
Description=Polyscan Service
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/polyscan
ExecStart=/usr/bin/node dist/index.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

## Environment Variables Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3001 | Backend server port |
| `NODE_ENV` | development | Environment (development/production) |
| `REDIS_HOST` | localhost | Redis server host |
| `REDIS_PORT` | 6379 | Redis server port |
| `REDIS_PASSWORD` | - | Redis password (if required) |
| `OPINION_API_KEY` | - | Opinion API key (required) |
| `CACHE_TTL` | 60 | Cache TTL in seconds |
| `UPDATE_INTERVAL` | 30000 | Data update interval in ms |
| `MIN_PROFIT_THRESHOLD` | 0.01 | Minimum profit % to show |
| `SIMILARITY_THRESHOLD` | 0.85 | Minimum similarity for matching |

## Testing the API

### Get Polymarket Markets
```bash
curl http://localhost:3001/api/polymarket/markets
```

### Get Opinion Markets
```bash
curl http://localhost:3001/api/opinion/markets
```

### Get Matched Markets
```bash
curl http://localhost:3001/api/matches?confidence=high
```

### Get Arbitrage Opportunities
```bash
curl "http://localhost:3001/api/arbitrage?minProfit=1&minVolume=100"
```

### Get Statistics
```bash
curl http://localhost:3001/api/stats
```

### Force Refresh
```bash
curl -X POST http://localhost:3001/api/refresh
```

## Next Steps

1. Open http://localhost:3000
2. Explore the 4 tabs
3. Look for arbitrage opportunities
4. Monitor the logs
5. Adjust settings in `.env` as needed

## Support

If you encounter issues:
1. Check logs: `logs/combined.log` and `logs/error.log`
2. Verify environment variables
3. Test API endpoints manually
4. Check network connectivity

Happy arbitraging! 🚀
