import { SavedPreset, ScannerConfig } from '../types';

export const DEFAULT_SCANNER_CONFIG: ScannerConfig = {
  priceMA1Type: 'EMA',
  priceMA1Length: 21,
  priceMA2Type: 'EMA',
  priceMA2Length: 50,
  rsiLength: 14,
  rsiMA1Type: 'EMA',
  rsiMA1Length: 21,
  rsiMA2Type: 'EMA',
  rsiMA2Length: 50,
};

export const PRESET_CONFIGS: SavedPreset[] = [
  {
    id: 'swing_momentum',
    name: 'Swing Momentum',
    description: 'Long-term momentum scanning on H4 & Daily timeframes with tight RSI & Price correlation filters.',
    timeframes: ['4h', '1d'],
    markets: ['indices', 'commodities', 'forex', 'crypto'],
    minScore: 75,
    directionFilter: 'all',
    config: {
      priceMA1Type: 'EMA',
      priceMA1Length: 21,
      priceMA2Type: 'EMA',
      priceMA2Length: 50,
      rsiLength: 14,
      rsiMA1Type: 'EMA',
      rsiMA1Length: 21,
      rsiMA2Type: 'EMA',
      rsiMA2Length: 50,
    }
  },
  {
    id: 'intraday_momentum',
    name: 'Intraday Momentum',
    description: 'Fast-paced momentum scanning on M15 & H1 timeframes looking for immediate breakouts.',
    timeframes: ['15m', '30m', '1h'],
    markets: ['indices', 'forex', 'crypto'],
    minScore: 65,
    directionFilter: 'all',
    config: {
      priceMA1Type: 'EMA',
      priceMA1Length: 9,
      priceMA2Type: 'EMA',
      priceMA2Length: 21,
      rsiLength: 14,
      rsiMA1Type: 'EMA',
      rsiMA1Length: 9,
      rsiMA2Type: 'EMA',
      rsiMA2Length: 21,
    }
  },
  {
    id: 'strong_trends',
    name: 'Strong Trends',
    description: 'Scans for pristine high-probability setups with overall scores above 85% and clean moving average alignments.',
    timeframes: ['1h', '4h', '1d'],
    markets: ['indices', 'commodities', 'forex', 'crypto'],
    minScore: 85,
    directionFilter: 'all',
    config: {
      priceMA1Type: 'EMA',
      priceMA1Length: 21,
      priceMA2Type: 'EMA',
      priceMA2Length: 50,
      rsiLength: 14,
      rsiMA1Type: 'EMA',
      rsiMA1Length: 21,
      rsiMA2Type: 'EMA',
      rsiMA2Length: 50,
    }
  },
  {
    id: 'crypto_only',
    name: 'Crypto Momentum',
    description: 'Strictly scans major crypto assets (BTC, ETH) across multiple timeframes to find extreme momentum swings.',
    timeframes: ['5m', '15m', '1h', '4h', '1d'],
    markets: ['crypto'],
    minScore: 60,
    directionFilter: 'all',
    config: {
      priceMA1Type: 'EMA',
      priceMA1Length: 12,
      priceMA2Type: 'EMA',
      priceMA2Length: 26,
      rsiLength: 14,
      rsiMA1Type: 'EMA',
      rsiMA1Length: 12,
      rsiMA2Type: 'EMA',
      rsiMA2Length: 26,
    }
  }
];
