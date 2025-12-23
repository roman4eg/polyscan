import axios, { AxiosInstance } from 'axios';
import { OpinionMarket, Orderbook } from '../types/market.types';
import logger from '../utils/logger';
import cache from '../utils/cache';

interface OpinionApiResponse<T> {
  code: number;
  msg: string;
  result: T;
}

interface OpinionMarketsResult {
  total: number;
  list: OpinionMarket[];
}

export class OpinionClient {
  private api: AxiosInstance;
  private readonly CACHE_PREFIX = 'opinion:';
  private readonly apiKey: string;
  private readonly eoaAddress: string;

  constructor() {
    this.apiKey = process.env.OPINION_API_KEY || '';
    this.eoaAddress = process.env.OPINION_EOA_ADDRESS || '';

    if (!this.apiKey) {
      logger.warn('OPINION_API_KEY not set. API requests may fail.');
    }

    if (!this.eoaAddress) {
      logger.warn('OPINION_EOA_ADDRESS not set. API requests may fail.');
    }

    this.api = axios.create({
      baseURL: 'https://proxy.opinion.trade:8443/openapi',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'apikey': this.apiKey,
        'address': this.eoaAddress
      }
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    this.api.interceptors.request.use(
      config => {
        logger.info('=== Opinion API Request ===');
        logger.info(`URL: ${config.url}`);
        logger.info(`Method: ${config.method}`);
        logger.info(`Headers: ${JSON.stringify(config.headers, null, 2)}`);
        logger.info(`Params: ${JSON.stringify(config.params, null, 2)}`);
        logger.info('===========================');
        return config;
      }
    );

    this.api.interceptors.response.use(
      response => {
        logger.info('=== Opinion API Response ===');
        logger.info(`URL: ${response.config.url}`);
        logger.info(`Status: ${response.status}`);
        logger.info(`Data: ${JSON.stringify(response.data, null, 2)}`);
        logger.info('============================');
        return response;
      },
      error => {
        logger.error('=== Opinion API Error ===');
        logger.error(`URL: ${error.config?.url}`);
        logger.error(`Method: ${error.config?.method}`);
        logger.error(`Headers: ${JSON.stringify(error.config?.headers, null, 2)}`);
        logger.error(`Status: ${error.response?.status}`);
        logger.error(`Status Text: ${error.response?.statusText}`);
        logger.error(`Error Message: ${error.message}`);
        logger.error(`Response Data: ${JSON.stringify(error.response?.data, null, 2)}`);
        logger.error('=========================');
        return Promise.reject(error);
      }
    );
  }

  async getMarkets(params?: {
    page?: number;
    limit?: number;
    status?: 'activated' | 'resolved';
    marketType?: 0 | 1 | 2;
    sortBy?: number;
  }): Promise<OpinionMarket[]> {
    const cacheKey = `${this.CACHE_PREFIX}markets:${JSON.stringify(params || {})}`;
    const cached = await cache.get<OpinionMarket[]>(cacheKey);

    if (cached) {
      logger.debug('Returning cached Opinion markets');
      return cached;
    }

    try {
      const defaultParams = {
        page: 1,
        limit: 20,
        status: 'activated' as const,
        marketType: 2 as const,
        ...params
      };

      logger.info('Fetching Opinion markets', defaultParams);
      const response = await this.api.get<OpinionApiResponse<OpinionMarketsResult>>('/market', {
        params: defaultParams
      });

      if (response.data.code !== 0) {
        throw new Error(`Opinion API error: ${response.data.msg}`);
      }

      const markets = response.data.result.list;
      await cache.set(cacheKey, markets, 60);

      logger.info(`Fetched ${markets.length} Opinion markets`);
      return markets;
    } catch (error) {
      logger.error('Error fetching Opinion markets:', error);
      throw error;
    }
  }

  async getAllMarkets(): Promise<OpinionMarket[]> {
    const allMarkets: OpinionMarket[] = [];
    let page = 1;
    const limit = 20;
    let hasMore = true;

    try {
      while (hasMore) {
        const markets = await this.getMarkets({ page, limit });
        if (markets.length === 0) {
          hasMore = false;
        } else {
          allMarkets.push(...markets);
          page++;
          if (markets.length < limit) {
            hasMore = false;
          }
        }
      }

      logger.info(`Fetched total ${allMarkets.length} Opinion markets`);
      return allMarkets;
    } catch (error) {
      logger.error('Error fetching all Opinion markets:', error);
      return allMarkets;
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
      const response = await this.api.get<OpinionApiResponse<Orderbook>>('/token/orderbook', {
        params: { token_id: tokenId }
      });

      if (response.data.code !== 0) {
        throw new Error(`Opinion API error: ${response.data.msg}`);
      }

      await cache.set(cacheKey, response.data.result, 30);
      return response.data.result;
    } catch (error) {
      logger.error(`Error fetching orderbook for token ${tokenId}:`, error);
      return null;
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

  async getYesNoPrice(yesTokenId: string, noTokenId: string): Promise<{ yesAsk: number | null; noAsk: number | null }> {
    const [yesAsk, noAsk] = await Promise.all([
      this.getBestAskPrice(yesTokenId),
      this.getBestAskPrice(noTokenId)
    ]);

    return { yesAsk, noAsk };
  }
}

export default new OpinionClient();
