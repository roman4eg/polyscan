import { MarketMatch, OutcomeMatch, ArbitrageOpportunity, ArbitrageStats } from '../types/arbitrage.types';
import logger from '../utils/logger';

export class ArbitrageService {
  private readonly MIN_PROFIT_THRESHOLD: number;

  constructor() {
    this.MIN_PROFIT_THRESHOLD = parseFloat(process.env.MIN_PROFIT_THRESHOLD || '0.01');
  }

  detectArbitrage(matches: MarketMatch[]): ArbitrageOpportunity[] {
    const opportunities: ArbitrageOpportunity[] = [];

    for (const match of matches) {
      for (const outcomeMatch of match.outcomeMatches) {
        const opps = this.checkOutcomeForArbitrage(match, outcomeMatch);
        opportunities.push(...opps);
      }
    }

    const filteredOpportunities = opportunities.filter(
      opp => opp.profitPercent >= this.MIN_PROFIT_THRESHOLD
    );

    logger.info(`Detected ${filteredOpportunities.length} arbitrage opportunities`);
    return filteredOpportunities.sort((a, b) => b.profitPercent - a.profitPercent);
  }

  private checkOutcomeForArbitrage(
    marketMatch: MarketMatch,
    outcomeMatch: OutcomeMatch
  ): ArbitrageOpportunity[] {
    const opportunities: ArbitrageOpportunity[] = [];

    const polyOutcome = outcomeMatch.polymarketOutcome;
    const opinionOutcome = outcomeMatch.opinionOutcome;

    if (!polyOutcome.yesAsk || !polyOutcome.noAsk || !opinionOutcome.yesAsk || !opinionOutcome.noAsk) {
      return opportunities;
    }

    const arb1 = this.calculateArbitrage(
      'poly_yes_opinion_no',
      polyOutcome.yesAsk,
      opinionOutcome.noAsk,
      polyOutcome.yesVolume,
      opinionOutcome.noVolume
    );

    if (arb1 && arb1.profitPercent > 0) {
      opportunities.push({
        marketMatch,
        outcomeMatch,
        type: 'poly_yes_opinion_no',
        buyPlatform1: 'polymarket',
        buyPlatform2: 'opinion',
        buyType1: 'yes',
        buyType2: 'no',
        price1: polyOutcome.yesAsk,
        price2: opinionOutcome.noAsk,
        totalCost: arb1.totalCost,
        guaranteedReturn: arb1.guaranteedReturn,
        profitPercent: arb1.profitPercent,
        volume1: polyOutcome.yesVolume,
        volume2: opinionOutcome.noVolume,
        maxInvestment: arb1.maxInvestment,
        detectedAt: new Date(),
        expiresAt: marketMatch.polymarketMarket.endDate
          ? new Date(marketMatch.polymarketMarket.endDate)
          : undefined
      });
    }

    const arb2 = this.calculateArbitrage(
      'poly_no_opinion_yes',
      polyOutcome.noAsk,
      opinionOutcome.yesAsk,
      polyOutcome.noVolume,
      opinionOutcome.yesVolume
    );

    if (arb2 && arb2.profitPercent > 0) {
      opportunities.push({
        marketMatch,
        outcomeMatch,
        type: 'poly_no_opinion_yes',
        buyPlatform1: 'polymarket',
        buyPlatform2: 'opinion',
        buyType1: 'no',
        buyType2: 'yes',
        price1: polyOutcome.noAsk,
        price2: opinionOutcome.yesAsk,
        totalCost: arb2.totalCost,
        guaranteedReturn: arb2.guaranteedReturn,
        profitPercent: arb2.profitPercent,
        volume1: polyOutcome.noVolume,
        volume2: opinionOutcome.yesVolume,
        maxInvestment: arb2.maxInvestment,
        detectedAt: new Date(),
        expiresAt: marketMatch.polymarketMarket.endDate
          ? new Date(marketMatch.polymarketMarket.endDate)
          : undefined
      });
    }

    return opportunities;
  }

  private calculateArbitrage(
    _type: string,
    price1: number,
    price2: number,
    volume1?: number,
    volume2?: number
  ): { totalCost: number; guaranteedReturn: number; profitPercent: number; maxInvestment: number } | null {
    const totalCost = price1 + price2;

    if (totalCost >= 1.0) {
      return null;
    }

    const guaranteedReturn = 1.0;
    const profit = guaranteedReturn - totalCost;
    const profitPercent = (profit / totalCost) * 100;

    const maxInvestment = Math.min(volume1 || Infinity, volume2 || Infinity);

    return {
      totalCost,
      guaranteedReturn,
      profitPercent,
      maxInvestment
    };
  }

  calculateStats(opportunities: ArbitrageOpportunity[]): ArbitrageStats {
    if (opportunities.length === 0) {
      return {
        totalOpportunities: 0,
        averageProfit: 0,
        maxProfit: 0,
        totalVolume: 0,
        byCategory: {}
      };
    }

    const totalProfit = opportunities.reduce((sum, opp) => sum + opp.profitPercent, 0);
    const maxProfit = Math.max(...opportunities.map(opp => opp.profitPercent));
    const totalVolume = opportunities.reduce((sum, opp) => sum + (opp.maxInvestment || 0), 0);

    const byCategory: Record<string, number> = {};
    for (const opp of opportunities) {
      const category = opp.marketMatch.polymarketMarket.category || 'Unknown';
      byCategory[category] = (byCategory[category] || 0) + 1;
    }

    return {
      totalOpportunities: opportunities.length,
      averageProfit: totalProfit / opportunities.length,
      maxProfit,
      totalVolume,
      byCategory
    };
  }

  filterByProfitThreshold(opportunities: ArbitrageOpportunity[], minProfit: number): ArbitrageOpportunity[] {
    return opportunities.filter(opp => opp.profitPercent >= minProfit);
  }

  filterByVolume(opportunities: ArbitrageOpportunity[], minVolume: number): ArbitrageOpportunity[] {
    return opportunities.filter(opp => (opp.maxInvestment || 0) >= minVolume);
  }

  groupByMarket(opportunities: ArbitrageOpportunity[]): Map<string, ArbitrageOpportunity[]> {
    const grouped = new Map<string, ArbitrageOpportunity[]>();

    for (const opp of opportunities) {
      const marketId = opp.marketMatch.polymarketMarket.id;
      if (!grouped.has(marketId)) {
        grouped.set(marketId, []);
      }
      grouped.get(marketId)!.push(opp);
    }

    return grouped;
  }
}

export default new ArbitrageService();
