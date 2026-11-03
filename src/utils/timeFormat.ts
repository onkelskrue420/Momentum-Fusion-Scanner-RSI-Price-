import { MarketType, Timeframe } from '../types';

/**
 * Returns the duration of a timeframe in milliseconds
 */
export function getTimeframeMs(tf: Timeframe | string): number {
  switch (tf) {
    case '1m': return 60 * 1000;
    case '5m': return 5 * 60 * 1000;
    case '15m': return 15 * 60 * 1000;
    case '30m': return 30 * 60 * 1000;
    case '1h': return 60 * 60 * 1000;
    case '4h': return 4 * 60 * 60 * 1000;
    case '1d': return 24 * 60 * 60 * 1000;
    case '1wk': return 7 * 24 * 60 * 60 * 1000;
    case '1mo': return 30 * 24 * 60 * 60 * 1000;
    default: return 60 * 60 * 1000;
  }
}

/**
 * Formats a timestamp to full date and time string
 * e.g., "Sep 15, 12:25:00" or with year if different
 */
export function formatExactTime(timestamp: number, includeSeconds = true): string {
  if (!timestamp || isNaN(timestamp)) return '—';
  const d = new Date(timestamp);
  
  const month = d.toLocaleString('en-US', { month: 'short' });
  const day = d.getDate();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  
  if (includeSeconds) {
    return `${month} ${day}, ${hours}:${minutes}:${seconds}`;
  }
  return `${month} ${day}, ${hours}:${minutes}`;
}

/**
 * Formats a short time string for chart X-axis labels
 * e.g., "12:25" for intraday or "Sep 15" for daily
 */
export function formatChartTime(timestamp: number, timeframe: Timeframe | string): string {
  if (!timestamp || isNaN(timestamp)) return '';
  const d = new Date(timestamp);
  
  if (timeframe === '1d' || timeframe === '1wk' || timeframe === '1mo') {
    return `${d.toLocaleString('en-US', { month: 'short' })} ${d.getDate()}`;
  }
  
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Formats elapsed time in human readable format
 * e.g. "45s ago", "2m 10s ago", "1h 15m ago", "2d 4h ago"
 */
export function formatElapsed(ms: number): string {
  if (ms < 0) ms = 0;
  const totalSeconds = Math.floor(ms / 1000);
  
  if (totalSeconds < 60) {
    return `${totalSeconds}s ago`;
  }
  
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSec = totalSeconds % 60;
  if (minutes < 60) {
    return `${minutes}m ${remainingSec}s ago`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMin = minutes % 60;
  if (hours < 24) {
    return `${hours}h ${remainingMin}m ago`;
  }
  
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return `${days}d ${remainingHours}h ago`;
}

/**
 * Formats countdown seconds (e.g., "00:45" or "02:15")
 */
export function formatCountdown(ms: number): string {
  if (ms <= 0) return '00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remMin = minutes % 60;
    return `${hours}h ${String(remMin).padStart(2, '0')}m`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export interface MarketActivityInfo {
  isMarketOpen: boolean;
  lastCandleTimeStr: string;
  elapsedStr: string;
  elapsedMs: number;
  nextBarCountdownStr: string;
  statusLabel: string;
  statusColor: string; // Tailwind color class
}

/**
 * Checks whether a given market is currently in an active trading session.
 * - Crypto: 24/7/365 open
 * - Forex: Sun 21:00 UTC to Fri 21:00 UTC open
 * - Stocks (US): Mon-Fri 13:30 to 20:00 UTC open (9:30 AM to 4:00 PM EST)
 * - Commodities (Gold/Silver): Sun 22:00 UTC to Fri 21:00 UTC (break 21:00-22:00 UTC)
 * - Indices: US regular/extended futures, GER40 Mon-Fri 07:00-21:00 UTC
 */
export function checkMarketSessionOpen(
  symbol?: string,
  marketType?: MarketType | string,
  now: number = Date.now()
): boolean {
  const d = new Date(now);
  const day = d.getUTCDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const hour = d.getUTCHours();
  const min = d.getUTCMinutes();
  const minuteOfDay = hour * 60 + min;

  let type = marketType;
  const sym = symbol ? symbol.toUpperCase() : '';

  if (!type && sym) {
    if (sym.includes('BTC') || sym.includes('ETH') || sym.includes('SOL')) {
      type = 'crypto';
    } else if (['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'USDCHF'].some(s => sym.includes(s))) {
      type = 'forex';
    } else if (['AAPL', 'NVDA', 'MSFT', 'TSLA', 'AMZN', 'GOOGL', 'META'].includes(sym)) {
      type = 'stocks';
    } else if (['GOLD', 'SILVER', 'OIL'].includes(sym)) {
      type = 'commodities';
    } else if (['SPY', 'VIX', 'SPX500', 'US30', 'NAS100', 'GER40'].includes(sym)) {
      type = 'indices';
    }
  }

  // 1. Crypto is open 24/7/365
  if (type === 'crypto') return true;

  // 2. Forex: Sunday 21:00 UTC (5 PM EST) through Friday 21:00 UTC (5 PM EST)
  if (type === 'forex') {
    if (day === 6) return false; // Saturday completely closed
    if (day === 0 && minuteOfDay < 21 * 60) return false; // Sunday before 21:00 UTC closed
    if (day === 5 && minuteOfDay >= 21 * 60) return false; // Friday after 21:00 UTC closed
    return true;
  }

  // 3. US Stocks (AAPL, NVDA, MSFT, TSLA, etc.): Mon-Fri 13:30 to 20:00 UTC
  if (type === 'stocks') {
    if (day === 0 || day === 6) return false; // Weekend closed
    return minuteOfDay >= 13 * 60 + 30 && minuteOfDay < 20 * 60;
  }

  // 4. Commodities: Sunday 22:00 UTC to Friday 21:00 UTC (daily break 21:00 - 22:00 UTC)
  if (type === 'commodities') {
    if (day === 6) return false; // Saturday closed
    if (day === 0 && minuteOfDay < 22 * 60) return false; // Sunday before 22:00 UTC closed
    if (day === 5 && minuteOfDay >= 21 * 60) return false; // Friday after 21:00 UTC closed
    if (minuteOfDay >= 21 * 60 && minuteOfDay < 22 * 60) return false; // Daily maintenance break
    return true;
  }

  // 5. Indices
  if (type === 'indices') {
    if (sym === 'GER40') {
      if (day === 0 || day === 6) return false;
      return minuteOfDay >= 7 * 60 && minuteOfDay < 21 * 60;
    }
    // US Indices & SPY ETF
    if (day === 0 || day === 6) return false;
    if (sym === 'SPY' || sym === 'VIX') {
      return minuteOfDay >= 13 * 60 + 30 && minuteOfDay < 20 * 60;
    }
    // US Index futures (SPX500, US30, NAS100)
    if (day === 5 && minuteOfDay >= 21 * 60 + 15) return false;
    if (minuteOfDay >= 21 * 60 + 15 && minuteOfDay < 22 * 60) return false;
    return true;
  }

  // Fallback: weekday check
  if (day === 0 || day === 6) return false;
  return true;
}

/**
 * Robust check if a market is currently live:
 * Evaluates session calendar and data recency.
 */
export function isMarketCurrentlyLive(
  symbol?: string,
  marketType?: MarketType | string,
  lastCandleTimestamp?: number,
  timeframe?: Timeframe | string,
  now: number = Date.now()
): boolean {
  // Check session calendar schedule first
  const sessionOpen = checkMarketSessionOpen(symbol, marketType, now);
  if (!sessionOpen) return false;

  // If candle timestamp is provided, check if data feed is reasonably fresh
  if (lastCandleTimestamp && timeframe) {
    const activity = getMarketActivity(lastCandleTimestamp, timeframe, now, symbol, marketType);
    if (!activity.isMarketOpen) return false;
  }

  return true;
}

/**
 * Determines market activity based on latest candle timestamp, timeframe, and session schedule
 */
export function getMarketActivity(
  lastCandleTimestamp: number | undefined,
  timeframe: Timeframe | string,
  now: number = Date.now(),
  symbol?: string,
  marketType?: MarketType | string
): MarketActivityInfo {
  const sessionOpen = checkMarketSessionOpen(symbol, marketType, now);

  if (!lastCandleTimestamp || isNaN(lastCandleTimestamp)) {
    return {
      isMarketOpen: sessionOpen,
      lastCandleTimeStr: 'No data',
      elapsedStr: 'Unknown',
      elapsedMs: 0,
      nextBarCountdownStr: '—',
      statusLabel: sessionOpen ? 'Session Live' : 'Market Closed',
      statusColor: sessionOpen
        ? 'text-emerald-400 bg-emerald-950/40 border-emerald-500/40'
        : 'text-zinc-500 bg-zinc-900 border-zinc-800'
    };
  }

  const intervalMs = getTimeframeMs(timeframe);
  const elapsedMs = Math.max(0, now - lastCandleTimestamp);
  const lastCandleTimeStr = formatExactTime(lastCandleTimestamp, true);
  const elapsedStr = formatElapsed(elapsedMs);

  // Market is considered open/active if session is open AND
  // elapsed time since last candle is within tolerance
  const tolerance = timeframe === '1d' ? 36 * 60 * 60 * 1000 : Math.max(intervalMs * 2.5, 90 * 1000);
  const candleFresh = elapsedMs <= tolerance;
  const isMarketOpen = sessionOpen && candleFresh;

  // Calculate time remaining in current candle window if open
  let nextBarCountdownStr = '—';
  if (isMarketOpen) {
    const timeIntoCandle = elapsedMs % intervalMs;
    const remainingInBar = intervalMs - timeIntoCandle;
    nextBarCountdownStr = formatCountdown(remainingInBar);
  }

  let statusLabel = 'Market Open';
  let statusColor = 'text-emerald-400 bg-emerald-950/40 border-emerald-500/40';

  if (!sessionOpen) {
    statusLabel = 'Market Closed (Session Inactive)';
    statusColor = 'text-amber-400 bg-amber-950/40 border-amber-500/40';
  } else if (!candleFresh) {
    if (elapsedMs > 24 * 60 * 60 * 1000) {
      statusLabel = 'Market Closed (Weekend/Holiday)';
    } else {
      statusLabel = 'Market Idle (No New Ticks)';
    }
    statusColor = 'text-amber-400 bg-amber-950/40 border-amber-500/40';
  }

  return {
    isMarketOpen,
    lastCandleTimeStr,
    elapsedStr,
    elapsedMs,
    nextBarCountdownStr,
    statusLabel,
    statusColor
  };
}
