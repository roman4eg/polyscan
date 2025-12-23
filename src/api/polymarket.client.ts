import axios, { AxiosInstance } from 'axios';
import { PolymarketMarket, Orderbook, PolymarketOutcome } from '../types/market.types';
import logger from '../utils/logger';
import cache from '../utils/cache';

export class PolymarketClient {
  private gammaApi: AxiosInstance;
  private clobApi: AxiosInstance;
  private readonly CACHE_PREFIX = 'polymarket:';

  constructor() {
    this.gammaApi = axios.create({
      baseURL: 'https://gamma-api.polymarket.com',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    this.clobApi = axios.create({
      baseURL: 'https://clob.polymarket.com',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    this.gammaApi.interceptors.response.use(
      response => response,
      error => {
        logger.error('Polymarket Gamma API error:', {
          url: error.config?.url,
          status: error.response?.status,
          message: error.message
        });
        return Promise.reject(error);
      }
    );

    this.clobApi.interceptors.response.use(
      response => response,
      error => {
        logger.error('Polymarket CLOB API error:', {
          url: error.config?.url,
          status: error.response?.status,
          message: error.message
        });
        return Promise.reject(error);
      }
    );
  }

  async getMarkets(params?: {
    limit?: number;
    offset?: number;
    active?: boolean;
    closed?: boolean;
    liquidity_num_min?: number;
    volume_num_min?: number;
  }): Promise<PolymarketMarket[]> {
    const cacheKey = `${this.CACHE_PREFIX}markets:${JSON.stringify(params || {})}`;
    const cached = await cache.get<PolymarketMarket[]>(cacheKey);

    if (cached) {
      logger.debug('Returning cached Polymarket markets');
      return cached;
    }

    try {
      const defaultParams = {
        limit: 100,
        offset: 0,
        active: true,
        closed: false,
        liquidity_num_min: 100,
        ...params
      };

      logger.info('Fetching Polymarket markets', defaultParams);
      const response = await this.gammaApi.get<PolymarketMarket[]>('/markets', {
        params: defaultParams
      });

      const markets = response.data.map(market => this.parseMarket(market));
      await cache.set(cacheKey, markets, 60);

      logger.info(`Fetched ${markets.length} Polymarket markets`);
      return markets;
    } catch (error) {
      logger.error('Error fetching Polymarket markets:', error);
      throw error;
    }
  }

  async getMarket(id: string): Promise<PolymarketMarket | null> {
    const cacheKey = `${this.CACHE_PREFIX}market:${id}`;
    const cached = await cache.get<PolymarketMarket>(cacheKey);

    if (cached) {
      return cached;
    }

    try {
      const response = await this.gammaApi.get<PolymarketMarket>(`/markets/${id}`);
      const market = this.parseMarket(response.data);
      await cache.set(cacheKey, market, 60);
      return market;
    } catch (error) {
      logger.error(`Error fetching Polymarket market ${id}:`, error);
      return null;
    }
  }

  async getOrderbook(tokenId: string): Promise<Orderbook | null> {
    const cacheKey = `${this.CACHE_PREFIX}orderbook:${tokenId}`;
    const cached = await cache.get<Orderbook>(cacheKey);

    if (cached) {
      return cached;
    }

    try {
      logger.debug(`Fetching orderbook for token ${tokenId}`);
      const response = await this.clobApi.get<Orderbook>('/book', {
        params: { token_id: tokenId }
      });

      await cache.set(cacheKey, response.data, 30);
      return response.data;
    } catch (error) {
      logger.error(`Error fetching orderbook for token ${tokenId}:`, error);
      return null;
    }
  }

  private parseMarket(market: PolymarketMarket): PolymarketMarket {
    try {
      const outcomes = JSON.parse(market.outcomes || '[]');
      const prices = JSON.parse(market.outcomePrices || '[]');
      const tokenIds = JSON.parse(market.clobTokenIds || '[]');

      const parsedOutcomes: PolymarketOutcome[] = outcomes.map((name: string, index: number) => ({
        tokenId: tokenIds[index] || '',
        name,
        price: parseFloat(prices[index] || '0')
      }));

      return {
        ...market,
        parsedOutcomes
      };
    } catch (error) {
      logger.error('Error parsing market outcomes:', error);
      return market;
    }
  }

  async getBestAskPrice(tokenId: string): Promise<number | null> {
    const orderbook = await this.getOrderbook(tokenId);
    if (!orderbook || !orderbook.asks || orderbook.asks.length === 0) {
      return null;
    }

    return parseFloat(orderbook.asks[0].price);
  }

  async getBestBidPrice(tokenId: string): Promise<number | null> {
    const orderbook = await this.getOrderbook(tokenId);
    if (!orderbook || !orderbook.bids || orderbook.bids.length === 0) {
      return null;
    }

    return parseFloat(orderbook.bids[0].price);
  }

  async getAvailableVolume(tokenId: string, side: 'ask' | 'bid'): Promise<number> {
    const orderbook = await this.getOrderbook(tokenId);
    if (!orderbook) {
      return 0;
    }

    const orders = side === 'ask' ? orderbook.asks : orderbook.bids;
    const totalVolume = orders.reduce((sum, order) => sum + parseFloat(order.size), 0);
    return totalVolume;
  }
}

export default new PolymarketClient();
