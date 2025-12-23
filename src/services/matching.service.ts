import stringSimilarity from 'string-similarity';
import { NormalizedMarket, NormalizedOutcome } from '../types/market.types';
import { MarketMatch, OutcomeMatch } from '../types/arbitrage.types';
import logger from '../utils/logger';

export class MatchingService {
  private readonly SIMILARITY_THRESHOLD: number;
  private readonly TITLE_WEIGHT = 0.7;
  private readonly CATEGORY_WEIGHT = 0.3;

  constructor() {
    this.SIMILARITY_THRESHOLD = parseFloat(process.env.SIMILARITY_THRESHOLD || '0.85');
  }

  findMatches(polymarkets: NormalizedMarket[], opinionMarkets: NormalizedMarket[]): MarketMatch[] {
    const matches: MarketMatch[] = [];

    for (const polyMarket of polymarkets) {
      const bestMatch = this.findBestMatch(polyMarket, opinionMarkets);
      if (bestMatch) {
        matches.push(bestMatch);
      }
    }

    logger.info(`Found ${matches.length} market matches`);
    return matches;
  }

  private findBestMatch(polyMarket: NormalizedMarket, opinionMarkets: NormalizedMarket[]): MarketMatch | null {
    let bestMatch: MarketMatch | null = null;
    let bestSimilarity = 0;

    for (const opinionMarket of opinionMarkets) {
      const similarity = this.calculateMarketSimilarity(polyMarket, opinionMarket);

      if (similarity > bestSimilarity && similarity >= this.SIMILARITY_THRESHOLD) {
        const outcomeMatches = this.matchOutcomes(polyMarket.outcomes, opinionMarket.outcomes);

        if (outcomeMatches.length > 0) {
          bestSimilarity = similarity;
          bestMatch = {
            polymarketMarket: polyMarket,
            opinionMarket: opinionMarket,
            similarity,
            confidence: this.getConfidenceLevel(similarity),
            outcomeMatches
          };
        }
      }
    }

    return bestMatch;
  }

  private calculateMarketSimilarity(market1: NormalizedMarket, market2: NormalizedMarket): number {
    const titleSimilarity = this.calculateStringSimilarity(
      this.normalizeText(market1.title),
      this.normalizeText(market2.title)
    );

    let categorySimilarity = 0;
    if (market1.category && market2.category) {
      categorySimilarity = this.calculateStringSimilarity(
        this.normalizeText(market1.category),
        this.normalizeText(market2.category)
      );
    }

    const weightedSimilarity =
      (titleSimilarity * this.TITLE_WEIGHT) +
      (categorySimilarity * this.CATEGORY_WEIGHT);

    return weightedSimilarity;
  }

  private matchOutcomes(outcomes1: NormalizedOutcome[], outcomes2: NormalizedOutcome[]): OutcomeMatch[] {
    const matches: OutcomeMatch[] = [];

    for (const outcome1 of outcomes1) {
      for (const outcome2 of outcomes2) {
        const similarity = this.calculateStringSimilarity(
          this.normalizeText(outcome1.name),
          this.normalizeText(outcome2.name)
        );

        if (similarity >= this.SIMILARITY_THRESHOLD) {
          matches.push({
            polymarketOutcome: outcome1,
            opinionOutcome: outcome2,
            similarity
          });
          break;
        }
      }
    }

    return matches;
  }

  private calculateStringSimilarity(str1: string, str2: string): number {
    return stringSimilarity.compareTwoStrings(str1, str2);
  }

  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ');
  }

  private getConfidenceLevel(similarity: number): 'high' | 'medium' | 'low' {
    if (similarity >= 0.95) return 'high';
    if (similarity >= 0.85) return 'medium';
    return 'low';
  }

  getMatchesByConfidence(matches: MarketMatch[], confidence: 'high' | 'medium' | 'low'): MarketMatch[] {
    return matches.filter(match => match.confidence === confidence);
  }

  getMatchesAboveSimilarity(matches: MarketMatch[], threshold: number): MarketMatch[] {
    return matches.filter(match => match.similarity >= threshold);
  }
}

export default new MatchingService();
