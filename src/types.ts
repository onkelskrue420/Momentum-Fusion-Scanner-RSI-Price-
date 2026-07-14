export type MAType = 'SMA' | 'EMA' | 'WMA' | 'RMA';

export interface ScannerConfig {
  priceMA1Type: MAType;
  priceMA1Length: number;
  priceMA2Type: MAType;
  priceMA2Length: number;
  rsiLength: number;
  rsiMA1Type: MAType;
  rsiMA1Length: number;
  rsiMA2Type: MAType;
  rsiMA2Length: number;
}

export type MarketType = 'indices' | 'commodities' | 'forex' | 'crypto';

export interface Instrument {
  symbol: string;
  displayName: string;
  yahooSymbol: string;
  binanceSymbol?: string;
  type: MarketType;
}

export type Timeframe = '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d' | '1wk' | '1mo';

export interface Candle {
  timestamp: number; // in ms
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface IndicatorData {
  timestamp: number;
  price: number;
  priceMA1: number | null;
  priceMA2: number | null;
  rsi: number | null;
  rsiMA1: number | null;
  rsiMA2: number | null;
}

export interface SetupAnalysis {
  symbol: string;
  displayName: string;
  type: MarketType;
  timeframe: Timeframe;
  overallScore: number;
  direction: 'Strong Bullish' | 'Bullish' | 'Neutral' | 'Bearish' | 'Strong Bearish';
  correlationScore: number; // 0-100%
  priceTrendQuality: number; // 0-25
  rsiTrendQuality: number; // 0-25
  correlationValue: number; // 0-30
  smoothness: number; // 0-10
  momentumStrength: number; // 0-10
  lastUpdated: number; // ms timestamp
  priceTrendDesc: string;
  rsiTrendDesc: string;
  setupQualityDesc: string;
  dataPoints: IndicatorData[];
}

export interface SavedPreset {
  id: string;
  name: string;
  description: string;
  timeframes: Timeframe[];
  markets: MarketType[];
  minScore: number;
  directionFilter: 'all' | 'bullish' | 'bearish';
  config: ScannerConfig;
}
