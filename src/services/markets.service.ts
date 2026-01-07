import { PolymarketMarket, OpinionMarket, NormalizedMarket, NormalizedOutcome } from '../types/market.types';
import polymarketClient from '../api/polymarket.client';
import opinionClient from '../api/opinion.client';
import logger from '../utils/logger';

export class MarketsService {
  async getPolymarketMarkets(): Promise<NormalizedMarket[]> {
    try {
      const markets = await polymarketClient.getMarkets({
        limit: 100,
        active: true,
        closed: false,
        liquidity_num_min: 100
      });

      const normalized = await Promise.all(
        markets.map(market => this.normalizePolymarketMarket(market))
      );

      return normalized;
    } catch (error) {
      if (error instanceof Error) {
        logger.error(`Error getting Polymarket markets: ${error.message}`);
      } else {
        logger.error(`Error getting Polymarket markets: ${String(error)}`);
      }
      return [];
    }
  }

  async getOpinionMarkets(): Promise<NormalizedMarket[]> {
    try {
      const markets = await opinionClient.getAllMarkets();

      // Process markets in batches to avoid rate limiting
      const BATCH_SIZE = 5; // Process 5 markets at a time
      const DELAY_BETWEEN_BATCHES = 1000; // 1 second delay between batches
      const normalized: NormalizedMarket[] = [];

      for (let i = 0; i < markets.length; i += BATCH_SIZE) {
        const batch = markets.slice(i, i + BATCH_SIZE);
        const batchResults = await Promise.all(
          batch.map(market => this.normalizeOpinionMarket(market))
        );
        normalized.push(...batchResults);

        // Add delay between batches (except for the last batch)
        if (i + BATCH_SIZE < markets.length) {
          await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
        }
      }

      return normalized;
    } catch (error) {
      if (error instanceof Error) {
        logger.error(`Error getting Opinion markets: ${error.message}`);
      } else {
        logger.error(`Error getting Opinion markets: ${String(error)}`);
      }
      return [];
    }
  }

  private async normalizePolymarketMarket(market: PolymarketMarket): Promise<NormalizedMarket> {
    const outcomes: NormalizedOutcome[] = [];

    if (market.parsedOutcomes) {
      for (const outcome of market.parsedOutcomes) {
        const [yesAsk, noAsk, yesVolume] = await Promise.all([
          polymarketClient.getBestAskPrice(outcome.tokenId),
          Promise.resolve(null),
          polymarketClient.getAvailableVolume(outcome.tokenId, 'ask')
        ]);

        outcomes.push({
          id: outcome.tokenId,
          name: outcome.name,
          yesPrice: outcome.price,
          noPrice: 1 - outcome.price,
          yesAsk: yesAsk || outcome.price,
          noAsk: noAsk || (1 - outcome.price),
          tokenId: outcome.tokenId,
          yesVolume
        });
      }
    }

    return {
      id: market.id,
      platform: 'polymarket',
      title: market.question,
      category: market.category,
      outcomes,
      volume: market.volumeNum,
      liquidity: market.liquidityNum,
      endDate: market.endDate,
      active: market.active,
      rawData: market
    };
  }

  private async normalizeOpinionMarket(market: OpinionMarket): Promise<NormalizedMarket> {
    const outcomes: NormalizedOutcome[] = [];

    // Check if this is a multi-outcome market with childMarkets
    if (market.childMarkets && Array.isArray(market.childMarkets) && market.childMarkets.length > 0) {
      // Multi-outcome market (marketType: 1)
      for (const childMarket of market.childMarkets) {
        const [yesAsk, noAsk, yesVolume, noVolume] = await Promise.all([
          opinionClient.getBestAskPrice(childMarket.yesTokenId),
          opinionClient.getBestAskPrice(childMarket.noTokenId),
          opinionClient.getAvailableVolume(childMarket.yesTokenId, 'ask'),
          opinionClient.getAvailableVolume(childMarket.noTokenId, 'ask')
        ]);

        // Only add outcome if we have real prices from orderbook
        if (yesAsk !== null && noAsk !== null) {
          outcomes.push({
            id: childMarket.marketId.toString(),
            name: childMarket.marketTitle,
            yesPrice: yesAsk,
            noPrice: noAsk,
            yesAsk: yesAsk,
            noAsk: noAsk,
            yesTokenId: childMarket.yesTokenId,
            noTokenId: childMarket.noTokenId,
            yesVolume,
            noVolume
          });
        } else {
          logger.debug(`Skipping outcome "${childMarket.marketTitle}" - no orderbook data (yesAsk: ${yesAsk}, noAsk: ${noAsk})`);
        }
      }
    } else if (market.yesTokenId && market.noTokenId) {
      // Simple yes/no market (marketType: 0)
      const [yesAsk, noAsk, yesVolume, noVolume] = await Promise.all([
        opinionClient.getBestAskPrice(market.yesTokenId),
        opinionClient.getBestAskPrice(market.noTokenId),
        opinionClient.getAvailableVolume(market.yesTokenId, 'ask'),
        opinionClient.getAvailableVolume(market.noTokenId, 'ask')
      ]);

      // Only add outcome if we have real prices from orderbook
      if (yesAsk !== null && noAsk !== null) {
        // Create ONE outcome with standardized "Yes/No" structure
        outcomes.push({
          id: market.marketId.toString(),
          name: 'Yes',  // Standardized name for matching with Polymarket
          yesPrice: yesAsk,
          noPrice: noAsk,
          yesAsk: yesAsk,
          noAsk: noAsk,
          yesTokenId: market.yesTokenId,
          noTokenId: market.noTokenId,
          yesVolume,
          noVolume
        });
      } else {
        logger.debug(`Skipping market "${market.marketTitle}" - no orderbook data (yesAsk: ${yesAsk}, noAsk: ${noAsk})`);
      }
    }

    return {
      id: market.marketId.toString(),
      platform: 'opinion',
      title: market.marketTitle,
      outcomes,
      volume: parseFloat(market.volume || '0'),
      active: market.status === 1,
      rawData: market
    };
  }

  async getAllMarkets(): Promise<{ polymarket: NormalizedMarket[]; opinion: NormalizedMarket[] }> {
    const [polymarket, opinion] = await Promise.all([
      this.getPolymarketMarkets(),
      this.getOpinionMarkets()
    ]);

    logger.info(`Fetched ${polymarket.length} Polymarket markets and ${opinion.length} Opinion markets`);

    return { polymarket, opinion };
  }
}

export default new MarketsService();
