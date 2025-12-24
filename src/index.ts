import dotenv from 'dotenv';

// Load environment variables FIRST, before any other imports
dotenv.config();

import express, { Request, Response } from 'express';
import cors from 'cors';
import logger from './utils/logger';
import marketsService from './services/markets.service';
import matchingService from './services/matching.service';
import arbitrageService from './services/arbitrage.service';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

let cachedData: {
  polymarketMarkets: any[];
  opinionMarkets: any[];
  matches: any[];
  arbitrageOpportunities: any[];
  lastUpdate: Date;
} | null = null;

async function updateData() {
  try {
    logger.info('Starting data update...');

    logger.info('Fetching markets from Polymarket and Opinion...');
    const { polymarket, opinion } = await marketsService.getAllMarkets();
    logger.info(`Received ${polymarket.length} Polymarket and ${opinion.length} Opinion markets`);

    logger.info('Finding market matches...');
    const matches = matchingService.findMatches(polymarket, opinion);
    logger.info(`Found ${matches.length} matches`);

    logger.info('Detecting arbitrage opportunities...');
    const arbitrageOpportunities = arbitrageService.detectArbitrage(matches);
    logger.info(`Detected ${arbitrageOpportunities.length} arbitrage opportunities`);

    cachedData = {
      polymarketMarkets: polymarket,
      opinionMarkets: opinion,
      matches,
      arbitrageOpportunities,
      lastUpdate: new Date()
    };

    logger.info(`Data updated: ${polymarket.length} Polymarket markets, ${opinion.length} Opinion markets, ${matches.length} matches, ${arbitrageOpportunities.length} arbitrage opportunities`);
  } catch (error) {
    if (error instanceof Error) {
      logger.error(`Error updating data: ${error.message}`);
      logger.error(`Stack trace: ${error.stack}`);
    } else {
      logger.error(`Error updating data: ${String(error)}`);
    }
  }
}

app.get('/api/health', (_req: Request, res: Response) => {
  return res.json({
    status: 'ok',
    timestamp: new Date(),
    lastUpdate: cachedData?.lastUpdate
  });
});

app.get('/api/polymarket/markets', (_req: Request, res: Response) => {
  if (!cachedData) {
    return res.status(503).json({ error: 'Data not yet available' });
  }

  return res.json({
    markets: cachedData.polymarketMarkets,
    count: cachedData.polymarketMarkets.length,
    lastUpdate: cachedData.lastUpdate
  });
});

app.get('/api/opinion/markets', (_req: Request, res: Response) => {
  if (!cachedData) {
    return res.status(503).json({ error: 'Data not yet available' });
  }

  return res.json({
    markets: cachedData.opinionMarkets,
    count: cachedData.opinionMarkets.length,
    lastUpdate: cachedData.lastUpdate
  });
});

app.get('/api/matches', (req: Request, res: Response) => {
  if (!cachedData) {
    return res.status(503).json({ error: 'Data not yet available' });
  }

  const { confidence } = req.query;

  let matches = cachedData.matches;

  if (confidence && typeof confidence === 'string') {
    matches = matchingService.getMatchesByConfidence(
      matches,
      confidence as 'high' | 'medium' | 'low'
    );
  }

  return res.json({
    matches,
    count: matches.length,
    lastUpdate: cachedData.lastUpdate
  });
});

app.get('/api/arbitrage', (req: Request, res: Response) => {
  if (!cachedData) {
    return res.status(503).json({ error: 'Data not yet available' });
  }

  const { minProfit, minVolume } = req.query;

  let opportunities = cachedData.arbitrageOpportunities;

  if (minProfit) {
    opportunities = arbitrageService.filterByProfitThreshold(
      opportunities,
      parseFloat(minProfit as string)
    );
  }

  if (minVolume) {
    opportunities = arbitrageService.filterByVolume(
      opportunities,
      parseFloat(minVolume as string)
    );
  }

  const stats = arbitrageService.calculateStats(opportunities);

  return res.json({
    opportunities,
    count: opportunities.length,
    stats,
    lastUpdate: cachedData.lastUpdate
  });
});

app.get('/api/stats', (_req: Request, res: Response) => {
  if (!cachedData) {
    return res.status(503).json({ error: 'Data not yet available' });
  }

  const stats = arbitrageService.calculateStats(cachedData.arbitrageOpportunities);

  return res.json({
    polymarketMarketsCount: cachedData.polymarketMarkets.length,
    opinionMarketsCount: cachedData.opinionMarkets.length,
    matchesCount: cachedData.matches.length,
    arbitrageOpportunitiesCount: cachedData.arbitrageOpportunities.length,
    arbitrageStats: stats,
    lastUpdate: cachedData.lastUpdate
  });
});

app.post('/api/refresh', async (_req: Request, res: Response) => {
  try {
    await updateData();
    return res.json({ success: true, message: 'Data refreshed' });
  } catch (error) {
    logger.error('Error refreshing data:', error);
    return res.status(500).json({ error: 'Failed to refresh data' });
  }
});

async function startServer() {
  try {
    logger.info('Starting Polyscan server...');

    await updateData();

    const updateInterval = parseInt(process.env.UPDATE_INTERVAL || '30000');
    setInterval(updateData, updateInterval);

    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Health check: http://localhost:${PORT}/api/health`);
      logger.info(`Data updates every ${updateInterval / 1000} seconds`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
