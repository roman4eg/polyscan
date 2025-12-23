import { NormalizedMarket, NormalizedOutcome } from './market.types';

export interface MarketMatch {
  polymarketMarket: NormalizedMarket;
  opinionMarket: NormalizedMarket;
  similarity: number;
  confidence: 'high' | 'medium' | 'low';
  outcomeMatches: OutcomeMatch[];
}

export interface OutcomeMatch {
  polymarketOutcome: NormalizedOutcome;
  opinionOutcome: NormalizedOutcome;
  similarity: number;
}

export interface ArbitrageOpportunity {
  marketMatch: MarketMatch;
  outcomeMatch: OutcomeMatch;
  type: 'poly_yes_opinion_no' | 'poly_no_opinion_yes';
  buyPlatform1: 'polymarket' | 'opinion';
  buyPlatform2: 'polymarket' | 'opinion';
  buyType1: 'yes' | 'no';
  buyType2: 'yes' | 'no';
  price1: number;
  price2: number;
  totalCost: number;
  guaranteedReturn: number;
  profitPercent: number;
  volume1?: number;
  volume2?: number;
  maxInvestment?: number;
  detectedAt: Date;
  expiresAt?: Date;
}

export interface ArbitrageStats {
  totalOpportunities: number;
  averageProfit: number;
  maxProfit: number;
  totalVolume: number;
  byCategory: Record<string, number>;
}
