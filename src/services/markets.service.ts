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
      // if (error instanceof Error) {
      //   logger.error(`Error getting Polymarket markets: ${error.message}`);
      // } else {
      //   logger.error(`Error getting Polymarket markets: ${String(error)}`);
      // }
      return [];
    }
  }

  async getOpinionMarkets(): Promise<NormalizedMarket[]> {
    try {
      const markets = await opinionClient.getAllMarkets();
      const normalized = await Promise.all(
        markets.map(market => this.normalizeOpinionMarket(market))
      );

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

    for (const childMarket of market.childMarkets) {
      const [yesAsk, noAsk, yesVolume, noVolume] = await Promise.all([
        opinionClient.getBestAskPrice(childMarket.yesTokenId),
        opinionClient.getBestAskPrice(childMarket.noTokenId),
        opinionClient.getAvailableVolume(childMarket.yesTokenId, 'ask'),
        opinionClient.getAvailableVolume(childMarket.noTokenId, 'ask')
      ]);

      outcomes.push({
        id: childMarket.marketId.toString(),
        name: childMarket.marketTitle,
        yesPrice: yesAsk || 0.5,
        noPrice: noAsk || 0.5,
        yesAsk: yesAsk || 0.5,
        noAsk: noAsk || 0.5,
        yesTokenId: childMarket.yesTokenId,
        noTokenId: childMarket.noTokenId,
        yesVolume,
        noVolume
      });
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
