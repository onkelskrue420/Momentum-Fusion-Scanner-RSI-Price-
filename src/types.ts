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

export type MarketType = 'indices' | 'commodities' | 'forex' | 'crypto' | 'stocks';

export interface Instrument {
  symbol: string;
  displayName: string;
  yahooSymbol: string;
  fallbackYahooSymbols?: string[];
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
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  volume?: number;
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
  priceMa1Streak: number;
  priceMa1StreakDir: 'above' | 'below' | 'neutral';
  priceMa2Streak: number;
  priceMa2StreakDir: 'above' | 'below' | 'neutral';
  rsiMa1Streak: number;
  rsiMa1StreakDir: 'above' | 'below' | 'neutral';
  rsiMa2Streak: number;
  rsiMa2StreakDir: 'above' | 'below' | 'neutral';
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

export interface BacktestTrade {
  id: number;
  entryTime: number; // timestamp in ms
  exitTime: number; // timestamp in ms
  direction: 'LONG' | 'SHORT';
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  exitPrice: number;
  outcome: 'WIN' | 'LOSS';
  pnlR: number; // in R-multiples (e.g. +1.0 or -1.0 net of costs)
  pnlPercent: number; // % gain or loss
  barsHeld: number;
  sampleType: 'IS' | 'OOS'; // In-Sample or Out-of-Sample
}

export interface PeriodPerformance {
  periodKey: string; // e.g. "2024-Q1", "2024-03", or "Jan 2024"
  periodLabel: string;
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  netPnlR: number;
  profitFactor: number;
}

export interface ConfluenceSignalV4 {
  symbol: string;
  displayName: string;
  timeframe: string;
  type: MarketType;
  direction: 'LONG' | 'SHORT' | 'WAIT';
  score: number;
  entry: number;
  stopLoss: number;
  takeProfit: number;
  riskReward: number;
  scoreBreakdown: Record<string, number>;
  oosWinRate: number;
  oosExpectancy: number;
  totalTrades: number;
  pValue: number;
  fdrSignificant: boolean;
  lastUpdate: string;
  dataPoints: IndicatorData[];
  fvgBoxes: {
    type: 'bullish' | 'bearish';
    top: number;
    bottom: number;
    barIndex: number;
  }[];
  ema20: (number | null)[];
  atr14: number;
  adx14: number;
  volSma20: number;
  trades?: BacktestTrade[];
}

// ==========================================
// SCANNER V1.3 RESEARCH-BACKED DEFINITIONS
// ==========================================

export interface ScannerV13Config {
  maType: 'SMA' | 'EMA';
  fastPeriod: number; // default 50
  slowPeriod: number; // default 200
  rsiPeriod: number; // default 14
  rsiOversoldBuy: number; // default 40
  rsiOverboughtSell: number; // default 60
  maTolerancePct: number; // default 0.5%
  enableMarketRegime: boolean; // default true
  enableConnorsRsi: boolean; // default false
  requireStrongTrend: boolean; // fast MA > slow MA for buy, fast MA < slow MA for sell
}

export interface MarketRegimeStatus {
  spyPrice: number;
  spy200Ma: number;
  spyTrend: 'BULLISH' | 'BEARISH';
  vixLevel: number;
  vixSafe: boolean; // VIX < 30
  regimeApprovedForBuys: boolean; // SPY > 200MA && VIX < 30
  regimeApprovedForSells: boolean; // SPY < 200MA
  summary: string;
  updatedAt: number;
}

export interface ScannerV13Result {
  symbol: string;
  displayName: string;
  marketType: MarketType;
  signal: 'BUY' | 'SELL' | 'NEUTRAL';
  timeframe: Timeframe;
  price: number;
  fastMA: number;
  slowMA: number;
  rsi: number;
  prevRsi: number;
  rsiTurning: 'UP' | 'DOWN' | 'FLAT';
  connorsRsi2?: number;
  distanceToFastMaPct: number; // distance in % between price and fast MA
  maToleranceBand: {
    upper: number;
    lower: number;
    isInsideOrTouching: boolean;
  };
  atr14: number;
  suggestedStop: number; // 2 * ATR(14) stop
  stopDistanceDollar: number;
  stopDistancePct: number;
  suggestedTakeProfit1to1: number;
  reason: string;
  timestamp: number;
  confidenceScore: number; // 0 - 100
  passedChecks: {
    trendFilter: boolean;
    strongTrendAlignment: boolean;
    maTouchRespect: boolean;
    rsiThresholdAndTurn: boolean;
    connorsRsiPullback?: boolean;
    marketRegime: boolean;
  };
  candleData: Candle[];
}


