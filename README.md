# Polyscan - Arbitrage Scanner

Real-time arbitrage detection system for prediction markets: **Polymarket** vs **Opinion**.

![Architecture](architecture-diagram.png)

## Overview

Polyscan monitors and compares prediction markets from Polymarket and Opinion to identify arbitrage opportunities where you can guarantee profit regardless of the outcome.

### How It Works

The arbitrage opportunity exists when:
```
Price_YES (Platform A) + Price_NO (Platform B) < $1.00
```

Example:
- Buy YES on Polymarket for $0.65
- Buy NO on Opinion for $0.32
- Total cost: $0.97
- Guaranteed payout: $1.00
- **Profit: $0.03 (3.09%)**

## Features

- **4 Interactive Tabs:**
  - 📊 Polymarket Markets - All active markets from Polymarket
  - 📈 Opinion Markets - All active markets from Opinion
  - 🔗 Matched Events - Markets matched between platforms using fuzzy matching
  - 💰 Arbitrage Opportunities - Detected arbitrage with profit calculations

- **Real-time Updates** - Data refreshes every 30 seconds
- **Smart Matching** - Fuzzy matching algorithm to find equivalent events
- **Profit Calculations** - Automatic profit percentage and volume analysis
- **Modern UI** - React + Tailwind CSS responsive interface

## Tech Stack

### Backend
- **Node.js** + **TypeScript**
- **Express** - REST API server
- **Axios** - HTTP client for external APIs
- **Redis** - Caching layer
- **Winston** - Logging

### Frontend
- **React** + **TypeScript**
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Axios** - API client

## Installation

### Prerequisites

- Node.js 18+
- Redis (optional, for caching)
- Opinion API Key (get from https://docs.opinion.trade/)

### Setup

1. **Clone and install backend:**
```bash
cd polyscan
npm install
```

2. **Install frontend:**
```bash
cd frontend
npm install
```

3. **Configure environment:**
```bash
cp .env.example .env
```

Edit `.env` and add your Opinion API key:
```env
OPINION_API_KEY=your_api_key_here
REDIS_HOST=localhost
REDIS_PORT=6379
PORT=3001
```

## Running the Application

### Development Mode

**Option 1: Run everything together**
```bash
npm run dev
```

**Option 2: Run separately**

Terminal 1 - Backend:
```bash
npm run dev:backend
```

Terminal 2 - Frontend:
```bash
cd frontend
npm run dev
```

### Production Mode

```bash
# Build backend
npm run build:backend

# Build frontend
cd frontend
npm run build

# Start server
npm start
```

## API Endpoints

- `GET /api/health` - Health check
- `GET /api/polymarket/markets` - Get all Polymarket markets
- `GET /api/opinion/markets` - Get all Opinion markets
- `GET /api/matches?confidence=high` - Get matched markets
- `GET /api/arbitrage?minProfit=1&minVolume=100` - Get arbitrage opportunities
- `GET /api/stats` - Get overall statistics
- `POST /api/refresh` - Force data refresh

## Project Structure

```
polyscan/
├── src/
│   ├── api/                    # API clients
│   │   ├── polymarket.client.ts
│   │   └── opinion.client.ts
│   ├── services/               # Business logic
│   │   ├── markets.service.ts
│   │   ├── matching.service.ts
│   │   └── arbitrage.service.ts
│   ├── types/                  # TypeScript types
│   │   ├── market.types.ts
│   │   └── arbitrage.types.ts
│   ├── utils/                  # Utilities
│   │   ├── cache.ts
│   │   └── logger.ts
│   └── index.ts               # Server entry point
├── frontend/
│   ├── src/
│   │   ├── components/        # React components
│   │   ├── hooks/             # Custom hooks
│   │   ├── services/          # API service
│   │   └── types/             # TypeScript types
│   └── index.html
└── README.md
```

## Algorithms

### Fuzzy Matching Algorithm

Markets are matched using string similarity with weighted scoring:
- **Title similarity:** 70% weight
- **Category similarity:** 30% weight
- **Threshold:** 85% minimum match

Uses Jaro-Winkler distance via `string-similarity` library.

### Arbitrage Detection

For each matched outcome:
1. Check if `YES_ASK_A + NO_ASK_B < 1.0`
2. Check if `NO_ASK_A + YES_ASK_B < 1.0`
3. Calculate profit percentage: `(1.0 - total_cost) / total_cost * 100`
4. Filter opportunities above minimum profit threshold

## Configuration

Environment variables in `.env`:

```env
# Server
PORT=3001
NODE_ENV=development

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# API Keys
OPINION_API_KEY=your_key

# Cache
CACHE_TTL=60
UPDATE_INTERVAL=30000

# Arbitrage
MIN_PROFIT_THRESHOLD=0.01
SIMILARITY_THRESHOLD=0.85
```

## Logs

Logs are written to:
- `logs/error.log` - Error logs
- `logs/combined.log` - All logs
- Console (development mode)

## Development

### Adding New Features

1. **New API endpoint:**
   - Add route in `src/index.ts`
   - Implement logic in services

2. **New UI tab:**
   - Create component in `frontend/src/components/`
   - Add tab to `App.tsx`

### Testing

```bash
npm test
```

## Troubleshooting

**Issue: Redis connection error**
- Make sure Redis is running: `redis-server`
- Or disable Redis (app works without cache)

**Issue: Opinion API errors**
- Check API key is valid
- Verify rate limits (15 req/sec)

**Issue: No arbitrage found**
- This is normal - arbitrage is rare
- Try adjusting `MIN_PROFIT_THRESHOLD` in `.env`

## Performance

- **Backend:** ~100ms response time
- **API calls:** Cached for 30-60 seconds
- **Update interval:** 30 seconds default
- **Concurrent users:** Supports 100+

## Security Notes

- Never commit `.env` file
- Use environment variables for secrets
- API keys stored securely
- CORS configured for production

## Future Enhancements

- [ ] WebSocket for real-time updates
- [ ] Email/SMS alerts for arbitrage
- [ ] Historical data tracking
- [ ] Advanced filtering options
- [ ] Mobile responsive improvements
- [ ] Trade execution integration

## License

MIT

## Support

For issues and questions:
- GitHub Issues
- Documentation: See technical spec document

---

**Built with ❤️ for the prediction markets community**
