export interface PolymarketOutcome {
  tokenId: string;
  name: string;
  price: number;
  volume?: number;
}

export interface PolymarketMarket {
  id: string;
  question: string;
  conditionId: string;
  slug: string;
  category: string;
  outcomes: string;
  outcomePrices: string;
  volume: string;
  volumeNum: number;
  liquidityNum: number;
  clobTokenIds: string;
  active: boolean;
  closed: boolean;
  endDate: string;
  parsedOutcomes?: PolymarketOutcome[];
}

export interface OpinionChildMarket {
  marketId: number;
  marketTitle: string;
  yesTokenId: string;
  noTokenId: string;
  volume: string;
  quoteToken: string;
  chainId: string;
}

export interface OpinionMarket {
  marketId: number;
  marketTitle: string;
  status: number;
  statusEnum: string;
  marketType: number;
  childMarkets: OpinionChildMarket[];
  volume: string;
  volume24h: string;
  volume7d: string;
  quoteToken: string;
  chainId: string;
}

export interface OrderbookEntry {
  price: string;
  size: string;
}

export interface Orderbook {
  market: string;
  asset_id?: string;
  tokenId?: string;
  timestamp: string | number;
  bids: OrderbookEntry[];
  asks: OrderbookEntry[];
  min_order_size?: string;
  tick_size?: string;
}

export interface NormalizedMarket {
  id: string;
  platform: 'polymarket' | 'opinion';
  title: string;
  category?: string;
  outcomes: NormalizedOutcome[];
  volume: number;
  liquidity?: number;
  endDate?: string;
  active: boolean;
  rawData: PolymarketMarket | OpinionMarket;
}

export interface NormalizedOutcome {
  id: string;
  name: string;
  yesPrice: number;
  noPrice: number;
  yesAsk?: number;
  noAsk?: number;
  yesBid?: number;
  noBid?: number;
  yesVolume?: number;
  noVolume?: number;
  tokenId?: string;
  yesTokenId?: string;
  noTokenId?: string;
}
