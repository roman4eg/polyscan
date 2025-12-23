import axios from 'axios';
import { NormalizedMarket, MarketMatch, ArbitrageOpportunity, ArbitrageStats } from '../types';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000
});

export const apiService = {
  async getPolymarketMarkets(): Promise<{ markets: NormalizedMarket[]; count: number; lastUpdate: string }> {
    const response = await api.get('/polymarket/markets');
    return response.data;
  },

  async getOpinionMarkets(): Promise<{ markets: NormalizedMarket[]; count: number; lastUpdate: string }> {
    const response = await api.get('/opinion/markets');
    return response.data;
  },

  async getMatches(confidence?: 'high' | 'medium' | 'low'): Promise<{ matches: MarketMatch[]; count: number; lastUpdate: string }> {
    const response = await api.get('/matches', {
      params: confidence ? { confidence } : undefined
    });
    return response.data;
  },

  async getArbitrageOpportunities(minProfit?: number, minVolume?: number): Promise<{
    opportunities: ArbitrageOpportunity[];
    count: number;
    stats: ArbitrageStats;
    lastUpdate: string;
  }> {
    const response = await api.get('/arbitrage', {
      params: {
        minProfit,
        minVolume
      }
    });
    return response.data;
  },

  async getStats(): Promise<{
    polymarketMarketsCount: number;
    opinionMarketsCount: number;
    matchesCount: number;
    arbitrageOpportunitiesCount: number;
    arbitrageStats: ArbitrageStats;
    lastUpdate: string;
  }> {
    const response = await api.get('/stats');
    return response.data;
  },

  async refreshData(): Promise<void> {
    await api.post('/refresh');
  }
};
