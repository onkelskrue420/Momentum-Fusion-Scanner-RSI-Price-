import { Candle, Instrument, MarketType, Timeframe } from '../types';

export const INSTRUMENTS: Instrument[] = [
  // Indices
  { symbol: 'US30', displayName: 'Dow Jones 30', yahooSymbol: '^DJI', type: 'indices' },
  { symbol: 'NAS100', displayName: 'Nasdaq 100', yahooSymbol: '^NDX', type: 'indices' },
  { symbol: 'SPX500', displayName: 'S&P 500', yahooSymbol: '^GSPC', type: 'indices' },
  { symbol: 'GER40', displayName: 'DAX 40', yahooSymbol: '^GDAXI', type: 'indices' },
  // Commodities
  { symbol: 'GOLD', displayName: 'Gold Spot', yahooSymbol: 'GC=F', type: 'commodities' },
  { symbol: 'SILVER', displayName: 'Silver Spot', yahooSymbol: 'SI=F', type: 'commodities' },
  // Forex
  { symbol: 'EURUSD', displayName: 'EUR/USD', yahooSymbol: 'EURUSD=X', type: 'forex' },
  { symbol: 'GBPUSD', displayName: 'GBP/USD', yahooSymbol: 'GBPUSD=X', type: 'forex' },
  { symbol: 'USDJPY', displayName: 'USD/JPY', yahooSymbol: 'USDJPY=X', type: 'forex' },
  // Crypto
  { symbol: 'BTCUSD', displayName: 'Bitcoin / USD', yahooSymbol: 'BTC-USD', binanceSymbol: 'BTCUSDT', type: 'crypto' },
  { symbol: 'ETHUSD', displayName: 'Ethereum / USD', yahooSymbol: 'ETH-USD', binanceSymbol: 'ETHUSDT', type: 'crypto' },
];

export interface CacheEntry {
  candles: Candle[];
  lastFetched: number;
}

// In-memory cache for raw market data
const marketCache: Record<string, CacheEntry> = {};

// Cache duration depending on timeframe
function getCacheDuration(timeframe: Timeframe): number {
  switch (timeframe) {
    case '1m': return 60 * 1000;          // 1 minute
    case '5m': return 3 * 60 * 1000;      // 3 minutes
    case '15m': return 5 * 60 * 1000;     // 5 minutes
    case '30m': return 10 * 60 * 1000;    // 10 minutes
    case '1h': return 15 * 60 * 1000;     // 15 minutes
    case '4h': return 30 * 60 * 1000;     // 30 minutes
    case '1d': return 4 * 60 * 60 * 1000; // 4 hours
    case '1wk': return 12 * 60 * 60 * 1000;// 12 hours
    case '1mo': return 24 * 60 * 60 * 1000;// 24 hours
    default: return 15 * 60 * 1000;
  }
}

// Map Timeframe to Yahoo Finance parameters
interface YahooParams {
  interval: string;
  range: string;
}

function getYahooParams(timeframe: Timeframe): YahooParams {
  switch (timeframe) {
    case '1m': return { interval: '1m', range: '1d' };
    case '5m': return { interval: '5m', range: '5d' };
    case '15m': return { interval: '15m', range: '5d' };
    case '30m': return { interval: '30m', range: '5d' };
    case '1h': return { interval: '1h', range: '30d' };
    case '4h': return { interval: '1h', range: '60d' }; // We fetch 1h and aggregate
    case '1d': return { interval: '1d', range: '1y' };
    case '1wk': return { interval: '1wk', range: '2y' };
    case '1mo': return { interval: '1mo', range: '10y' };
    default: return { interval: '1h', range: '30d' };
  }
}

// Map Timeframe to Binance interval
function getBinanceInterval(timeframe: Timeframe): string | null {
  switch (timeframe) {
    case '1m': return '1m';
    case '5m': return '5m';
    case '15m': return '15m';
    case '30m': return '30m';
    case '1h': return '1h';
    case '4h': return '4h';
    case '1d': return '1d';
    case '1wk': return '1w';
    case '1mo': return '1M';
    default: return '1h';
  }
}

// Helper: Merge hourly candles into H4 candles
export function aggregateTo4H(hourlyCandles: Candle[]): Candle[] {
  const result: Candle[] = [];
  let currentBlock: Candle[] = [];

  for (const candle of hourlyCandles) {
    const date = new Date(candle.timestamp);
    const hour = date.getUTCHours();
    const blockHour = Math.floor(hour / 4) * 4;

    const currentBlockTime = currentBlock.length > 0 ? new Date(currentBlock[0].timestamp) : null;
    const isSameDay = currentBlockTime 
      ? currentBlockTime.getUTCDate() === date.getUTCDate() && 
        currentBlockTime.getUTCMonth() === date.getUTCMonth() &&
        currentBlockTime.getUTCFullYear() === date.getUTCFullYear()
      : false;
    const isSameBlock = currentBlockTime 
      ? Math.floor(currentBlockTime.getUTCHours() / 4) * 4 === blockHour 
      : false;

    if (currentBlock.length > 0 && (!isSameDay || !isSameBlock)) {
      result.push(mergeCandles(currentBlock));
      currentBlock = [];
    }
    currentBlock.push(candle);
  }

  if (currentBlock.length > 0) {
    result.push(mergeCandles(currentBlock));
  }

  return result;
}

function mergeCandles(candles: Candle[]): Candle {
  const first = candles[0];
  const last = candles[candles.length - 1];
  const open = first.open;
  const close = last.close;
  const high = Math.max(...candles.map(c => c.high));
  const low = Math.min(...candles.map(c => c.low));
  const volume = candles.reduce((sum, c) => sum + c.volume, 0);

  return {
    timestamp: first.timestamp,
    open,
    high,
    low,
    close,
    volume
  };
}

// Fetch from Binance (fully public, great fallback for BTC/ETH)
async function fetchBinanceKlines(symbol: string, timeframe: Timeframe): Promise<Candle[]> {
  const binanceInterval = getBinanceInterval(timeframe);
  if (!binanceInterval) throw new Error(`Binance does not support timeframe ${timeframe}`);

  const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${binanceInterval}&limit=300`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Binance API error: ${response.statusText}`);
  }

  const data = await response.json();
  if (!Array.isArray(data)) {
    throw new Error('Invalid response from Binance API');
  }

  return data.map((item: any) => ({
    timestamp: Number(item[0]),
    open: Number(item[1]),
    high: Number(item[2]),
    low: Number(item[3]),
    close: Number(item[4]),
    volume: Number(item[5])
  }));
}

// Fetch from Yahoo Finance
async function fetchYahooFinance(yahooSymbol: string, timeframe: Timeframe): Promise<Candle[]> {
  const params = getYahooParams(timeframe);
  const encodedSymbol = encodeURIComponent(yahooSymbol);
  
  // Set some backup CORS proxies or alternative endpoints just in case,
  // but query1.finance.yahoo.com is fully accessible directly from Node.js
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodedSymbol}?interval=${params.interval}&range=${params.range}`;
  
  console.log(`[DATA PROVIDER] Fetching Yahoo Finance for ${yahooSymbol} (${timeframe}): ${url}`);

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Yahoo Finance error: ${response.status} ${response.statusText}`);
  }

  const data: any = await response.json();
  const result = data.chart?.result?.[0];
  
  if (!result) {
    throw new Error(`Invalid response format from Yahoo Finance for ${yahooSymbol}`);
  }

  const timestamps = result.timestamp || [];
  const quote = result.indicators?.quote?.[0] || {};
  const opens = quote.open || [];
  const highs = quote.high || [];
  const lows = quote.low || [];
  const closes = quote.close || [];
  const volumes = quote.volume || [];

  const candles: Candle[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    // Fill gaps or filter out empty entries
    if (
      opens[i] === null || opens[i] === undefined ||
      highs[i] === null || highs[i] === undefined ||
      lows[i] === null || lows[i] === undefined ||
      closes[i] === null || closes[i] === undefined
    ) {
      continue;
    }
    
    candles.push({
      timestamp: timestamps[i] * 1000, // Yahoo is in seconds
      open: Number(opens[i]),
      high: Number(highs[i]),
      low: Number(lows[i]),
      close: Number(closes[i]),
      volume: Number(volumes[i] || 0)
    });
  }

  if (candles.length === 0) {
    throw new Error(`No candle data returned for ${yahooSymbol}`);
  }

  // Handle special case: aggregate 1h to 4h
  if (timeframe === '4h') {
    return aggregateTo4H(candles);
  }

  return candles;
}

// Master Fetch function with caching and fallback
export async function getMarketData(instrument: Instrument, timeframe: Timeframe, forceRefresh = false): Promise<Candle[]> {
  const cacheKey = `${instrument.symbol}_${timeframe}`;
  const now = Date.now();
  const cached = marketCache[cacheKey];

  if (!forceRefresh && cached && (now - cached.lastFetched < getCacheDuration(timeframe))) {
    // console.log(`[CACHE HIT] Returning cached data for ${cacheKey}`);
    return cached.candles;
  }

  // Try Binance fallback first for cryptos
  if (instrument.type === 'crypto' && instrument.binanceSymbol) {
    try {
      const candles = await fetchBinanceKlines(instrument.binanceSymbol, timeframe);
      marketCache[cacheKey] = { candles, lastFetched: now };
      console.log(`[DATA PROVIDER] Successfully fetched ${instrument.symbol} via Binance`);
      return candles;
    } catch (e) {
      console.warn(`[DATA PROVIDER] Binance fetch failed for ${instrument.symbol}, falling back to Yahoo:`, e);
    }
  }

  // Fetch via Yahoo Finance
  try {
    const candles = await fetchYahooFinance(instrument.yahooSymbol, timeframe);
    marketCache[cacheKey] = { candles, lastFetched: now };
    console.log(`[DATA PROVIDER] Successfully fetched ${instrument.symbol} (${timeframe}) via Yahoo Finance`);
    return candles;
  } catch (e: any) {
    console.error(`[DATA PROVIDER] Yahoo Finance fetch failed for ${instrument.symbol} (${timeframe}):`, e.message);
    
    // If we have cached data, return it even if expired to prevent UI crash
    if (cached) {
      console.warn(`[CACHE FALLBACK] Returning expired cache for ${cacheKey} due to fetch error`);
      return cached.candles;
    }
    throw e;
  }
}
