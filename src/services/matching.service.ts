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

    logger.info(`Starting matching: ${polymarkets.length} Polymarket markets vs ${opinionMarkets.length} Opinion markets`);

    for (const polyMarket of polymarkets) {
      const bestMatch = this.findBestMatch(polyMarket, opinionMarkets);
      if (bestMatch) {
        matches.push(bestMatch);
        logger.info(`Match found: "${polyMarket.title}" <-> "${bestMatch.opinionMarket.title}" (similarity: ${bestMatch.similarity.toFixed(2)})`);
      }
    }

    logger.info(`Found ${matches.length} market matches`);
    return matches;
  }

  private findBestMatch(polyMarket: NormalizedMarket, opinionMarkets: NormalizedMarket[]): MarketMatch | null {
    let bestMatch: MarketMatch | null = null;
    let bestSimilarity = 0;
    const candidates: Array<{ title: string; similarity: number }> = [];

    for (const opinionMarket of opinionMarkets) {
      const similarity = this.calculateMarketSimilarity(polyMarket, opinionMarket);

      // Collect top candidates for logging
      candidates.push({ title: opinionMarket.title, similarity });

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
        } else if (similarity >= 0.95) {
          // Log why high similarity markets don't match
          logger.debug(`High similarity (${similarity.toFixed(2)}) but no outcome matches for "${polyMarket.title}"`);
          logger.debug(`Polymarket outcomes: ${polyMarket.outcomes.map(o => o.name).join(', ')}`);
          logger.debug(`Opinion outcomes: ${opinionMarket.outcomes.map(o => o.name).join(', ')}`);
        }
      }
    }

    // Log top 3 candidates if no match found
    if (!bestMatch && candidates.length > 0) {
      const topCandidates = candidates
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 3);

      logger.debug(`No match for "${polyMarket.title}". Top candidates: ${topCandidates.map(c => `"${c.title}" (${c.similarity.toFixed(2)})`).join(', ')}`);
    }

    return bestMatch;
  }

  private calculateMarketSimilarity(market1: NormalizedMarket, market2: NormalizedMarket): number {
    const titleSimilarity = this.calculateStringSimilarity(
      this.normalizeText(market1.title),
      this.normalizeText(market2.title)
    );

    // Only use category similarity if both markets have categories
    if (market1.category && market2.category) {
      const categorySimilarity = this.calculateStringSimilarity(
        this.normalizeText(market1.category),
        this.normalizeText(market2.category)
      );

      const weightedSimilarity =
        (titleSimilarity * this.TITLE_WEIGHT) +
        (categorySimilarity * this.CATEGORY_WEIGHT);

      return weightedSimilarity;
    }

    // If one or both markets don't have categories, use title similarity only
    return titleSimilarity;
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
