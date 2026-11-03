import React, { useState, useEffect } from 'react';
import { SetupAnalysis, ScannerConfig } from '../types';
import PureMAChart from './PureMAChart';
import CandlestickChart from './CandlestickChart';
import { TrendingUp, TrendingDown, Star, Zap, Activity, Columns, Rows, Clock } from 'lucide-react';
import { getMarketActivity } from '../utils/timeFormat';

interface PureMACardProps {
  key?: React.Key;
  setup: SetupAnalysis;
  maFocus: 'both' | 'price' | 'rsi';
  showGhostLine: boolean;
  showCandlesChart?: boolean;
  globalChartsLayout?: 'side-by-side' | 'stacked';
  config: ScannerConfig;
  onClick: () => void;
  isStarred?: boolean;
  onToggleStar?: () => void;
}

export default function PureMACard({
  setup,
  maFocus,
  showGhostLine,
  showCandlesChart = false,
  globalChartsLayout = 'stacked',
  config,
  onClick,
  isStarred,
  onToggleStar,
}: PureMACardProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [localLayout, setLocalLayout] = useState<'side-by-side' | 'stacked' | null>(null);
  const [now, setNow] = useState<number>(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const activeLayout = localLayout ?? globalChartsLayout;

  // Extract latest points
  const points = setup.dataPoints || [];
  const latest = points[points.length - 1];
  const prev = points[points.length - 2];

  const marketInfo = getMarketActivity(latest?.timestamp, setup.timeframe, now);

  // Price MA metrics
  const lastPriceMA1 = latest?.priceMA1 ?? null;
  const lastPriceMA2 = latest?.priceMA2 ?? null;
  const isPriceBullish = lastPriceMA1 !== null && lastPriceMA2 !== null && lastPriceMA1 >= lastPriceMA2;
  const priceMaSpread = (lastPriceMA1 !== null && lastPriceMA2 !== null && lastPriceMA2 !== 0)
    ? ((lastPriceMA1 - lastPriceMA2) / lastPriceMA2) * 100
    : null;

  // Real Candle Price metrics
  const lastOpen = latest?.open ?? latest?.price ?? null;
  const lastClose = latest?.close ?? latest?.price ?? null;
  const candleIsBull = lastOpen !== null && lastClose !== null && lastClose >= lastOpen;
  const candlePctChange = lastOpen !== null && lastClose !== null && lastOpen !== 0
    ? ((lastClose - lastOpen) / lastOpen) * 100
    : 0;

  // Price MA Slope
  const priceMaSlope = (latest?.priceMA1 !== null && prev?.priceMA1 !== null && prev?.priceMA1 !== undefined)
    ? latest.priceMA1 - prev.priceMA1
    : 0;

  // RSI MA metrics
  const lastRsiMA1 = latest?.rsiMA1 ?? null;
  const lastRsiMA2 = latest?.rsiMA2 ?? null;
  const isRsiBullish = lastRsiMA1 !== null && lastRsiMA2 !== null && lastRsiMA1 >= lastRsiMA2;
  const rsiMaSpread = (lastRsiMA1 !== null && lastRsiMA2 !== null)
    ? lastRsiMA1 - lastRsiMA2
    : null;

  // Check if crossover happened in last 3 bars
  const recentPriceCross = (() => {
    if (points.length < 4) return false;
    for (let i = points.length - 1; i >= points.length - 3; i--) {
      const p1 = points[i];
      const p0 = points[i - 1];
      if (p1?.priceMA1 && p1?.priceMA2 && p0?.priceMA1 && p0?.priceMA2) {
        if ((p0.priceMA1 - p0.priceMA2) * (p1.priceMA1 - p1.priceMA2) < 0) {
          return true;
        }
      }
    }
    return false;
  })();

  const formatPrice = (val: number | null) => {
    if (val === null) return '—';
    if (val >= 1000) return `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (val >= 1) return `$${val.toFixed(2)}`;
    return `$${val.toFixed(4)}`;
  };

  // Count active charts for responsive grid
  const activeChartCount = (showCandlesChart ? 1 : 0) + (maFocus === 'both' ? 2 : 1);

  // Dynamic grid classes based on layout and chart count
  const getChartContainerClass = () => {
    if (activeLayout === 'side-by-side') {
      if (activeChartCount >= 3) {
        return 'grid grid-cols-1 md:grid-cols-3 gap-3';
      }
      if (activeChartCount === 2) {
        return 'grid grid-cols-1 md:grid-cols-2 gap-3';
      }
    }
    return 'space-y-3';
  };

  const chartHeight = activeLayout === 'side-by-side' ? 135 : (activeChartCount >= 3 ? 105 : 125);

  return (
    <div
      onClick={onClick}
      className="group relative bg-zinc-950 border border-zinc-900 hover:border-zinc-700/80 rounded-2xl p-4 transition-all duration-200 shadow-lg hover:shadow-2xl hover:shadow-violet-950/10 cursor-pointer flex flex-col justify-between"
      id={`pure-ma-card-${setup.symbol}`}
    >
      {/* CARD HEADER */}
      <div className="space-y-2.5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm text-zinc-100 font-sans tracking-tight">
                  {setup.symbol}
                </span>
                <span className="text-[10px] font-mono font-bold bg-zinc-900 border border-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded uppercase">
                  {setup.timeframe}
                </span>
                {marketInfo.isMarketOpen ? (
                  <span
                    className="flex items-center gap-1 text-[9px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-1.5 py-0.5 rounded font-bold"
                    title={`Live Market • Last bar: ${marketInfo.lastCandleTimeStr} (${marketInfo.elapsedStr})`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    LIVE
                  </span>
                ) : (
                  <span
                    className="flex items-center gap-1 text-[9px] font-mono text-amber-400 bg-amber-950/60 border border-amber-500/30 px-1.5 py-0.5 rounded font-bold"
                    title={`Market Closed / Idle • Last bar: ${marketInfo.lastCandleTimeStr} (${marketInfo.elapsedStr})`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400"></span>
                    CLOSED
                  </span>
                )}
                <span className="text-[9px] font-mono text-zinc-500 uppercase px-1 py-0.5 rounded bg-zinc-950 border border-zinc-900">
                  {setup.type}
                </span>
              </div>
              <span className="text-[11px] text-zinc-400 font-light truncate block max-w-[170px]">
                {setup.displayName}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {recentPriceCross && (
              <span className="flex items-center gap-1 text-[10px] font-bold font-mono px-1.5 py-0.5 rounded bg-amber-950/80 border border-amber-500/50 text-amber-300 animate-pulse" title="Fresh Moving Average Crossover detected within last 3 bars">
                <Zap className="h-3 w-3 text-amber-400" />
                <span>CROSS</span>
              </span>
            )}

            {/* Layout Toggle for this card */}
            {activeChartCount > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setLocalLayout(activeLayout === 'side-by-side' ? 'stacked' : 'side-by-side');
                }}
                className="p-1.5 rounded-lg border border-zinc-800/80 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition"
                title={`Switch layout to ${activeLayout === 'side-by-side' ? 'Stacked' : 'Side-by-Side'}`}
              >
                {activeLayout === 'side-by-side' ? (
                  <Rows className="h-3.5 w-3.5 text-amber-400" />
                ) : (
                  <Columns className="h-3.5 w-3.5 text-amber-400" />
                )}
              </button>
            )}

            {/* Star watchlist button */}
            {onToggleStar && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleStar();
                }}
                className={`p-1.5 rounded-lg border transition ${
                  isStarred
                    ? 'bg-amber-950/60 border-amber-500/80 text-amber-400'
                    : 'bg-zinc-900/60 border-zinc-800 text-zinc-600 hover:text-zinc-300'
                }`}
                title={isStarred ? 'Remove from watchlist' : 'Bookmark to watchlist'}
              >
                <Star className={`h-3.5 w-3.5 ${isStarred ? 'fill-amber-400' : ''}`} />
              </button>
            )}
          </div>
        </div>

        {/* STATUS BADGES: CANDLES, MA ALIGNMENT & SPREAD */}
        <div className="flex flex-wrap items-center gap-1.5 font-mono text-[10px]">
          {showCandlesChart && (
            <div className={`px-2 py-0.5 rounded-md border flex items-center gap-1 font-semibold ${
              candleIsBull
                ? 'bg-emerald-950/50 border-emerald-700/60 text-emerald-300'
                : 'bg-rose-950/50 border-rose-700/60 text-rose-300'
            }`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
              <span>Candle: {candleIsBull ? 'Bullish' : 'Bearish'}</span>
              <span className="opacity-80">({candlePctChange >= 0 ? '+' : ''}{candlePctChange.toFixed(2)}%)</span>
            </div>
          )}

          {(maFocus === 'price' || maFocus === 'both') && (
            <div className={`px-2 py-0.5 rounded-md border flex items-center gap-1 font-semibold ${
              isPriceBullish
                ? 'bg-amber-950/40 border-amber-600/50 text-amber-300'
                : 'bg-rose-950/40 border-rose-800/50 text-rose-300'
            }`}>
              {isPriceBullish ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              <span>Price MAs: {isPriceBullish ? 'Bullish' : 'Bearish'}</span>
              {priceMaSpread !== null && (
                <span className="opacity-75">({priceMaSpread >= 0 ? '+' : ''}{priceMaSpread.toFixed(1)}%)</span>
              )}
            </div>
          )}

          {(maFocus === 'rsi' || maFocus === 'both') && (
            <div className={`px-2 py-0.5 rounded-md border flex items-center gap-1 font-semibold ${
              isRsiBullish
                ? 'bg-violet-950/50 border-violet-800/60 text-violet-300'
                : 'bg-pink-950/50 border-pink-800/60 text-pink-300'
            }`}>
              <Activity className="h-3 w-3" />
              <span>RSI MAs: {isRsiBullish ? 'Bullish' : 'Bearish'}</span>
              {rsiMaSpread !== null && (
                <span className="opacity-75">({rsiMaSpread >= 0 ? '+' : ''}{rsiMaSpread.toFixed(1)} pts)</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* CHARTS CONTAINER (CANDLESTICKS, PRICE MA, RSI MA) */}
      <div className={`my-3 ${getChartContainerClass()}`}>
        {/* 1. REAL PRICE CANDLESTICK SECTION */}
        {showCandlesChart && (
          <div className="space-y-1 min-w-0">
            <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
              <span className="flex items-center gap-1 text-emerald-400 font-semibold truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                Real Price (Candles)
              </span>
              <div className="flex items-center gap-1.5 text-[10px]">
                <span className="text-zinc-300 font-bold">
                  {formatPrice(lastClose)}
                </span>
                <span className={`font-bold ${candleIsBull ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {candlePctChange >= 0 ? '+' : ''}{candlePctChange.toFixed(2)}%
                </span>
              </div>
            </div>

            <div className="bg-zinc-950/80 border border-zinc-900 rounded-xl p-2 group-hover:border-zinc-800 transition">
              <CandlestickChart
                data={points}
                height={chartHeight}
                hoveredIndex={hoveredIdx}
                onHoverIndex={setHoveredIdx}
                showMAs={true}
              />
            </div>
          </div>
        )}

        {/* 2. PRICE MOVING AVERAGE SECTION */}
        {(maFocus === 'price' || maFocus === 'both') && (
          <div className="space-y-1 min-w-0">
            <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
              <span className="flex items-center gap-1 text-amber-400 font-semibold truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                Price Moving Averages
              </span>
              <div className="flex items-center gap-1.5 text-[10px]">
                <span className="text-amber-400 font-bold" title={`Fast MA (${config.priceMA1Type} ${config.priceMA1Length})`}>
                  {config.priceMA1Type}{config.priceMA1Length}: {formatPrice(lastPriceMA1)}
                </span>
                <span className="text-cyan-400 font-bold" title={`Slow MA (${config.priceMA2Type} ${config.priceMA2Length})`}>
                  {config.priceMA2Type}{config.priceMA2Length}: {formatPrice(lastPriceMA2)}
                </span>
              </div>
            </div>

            <div className="bg-zinc-950/80 border border-zinc-900 rounded-xl p-2 group-hover:border-zinc-800 transition">
              <PureMAChart
                data={points}
                mode="price"
                height={chartHeight}
                showGhostLine={showGhostLine}
                hoveredIndex={hoveredIdx}
                onHoverIndex={setHoveredIdx}
                fastMaLabel={`${config.priceMA1Type} ${config.priceMA1Length}`}
                slowMaLabel={`${config.priceMA2Type} ${config.priceMA2Length}`}
              />
            </div>
          </div>
        )}

        {/* 3. RSI MOVING AVERAGE SECTION */}
        {(maFocus === 'rsi' || maFocus === 'both') && (
          <div className="space-y-1 min-w-0">
            <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
              <span className="flex items-center gap-1 text-purple-400 font-semibold truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                RSI Moving Averages
              </span>
              <div className="flex items-center gap-1.5 text-[10px]">
                <span className="text-purple-300 font-bold" title={`RSI Fast MA (${config.rsiMA1Type} ${config.rsiMA1Length})`}>
                  RSI-MA1: {lastRsiMA1 !== null ? lastRsiMA1.toFixed(1) : '—'}
                </span>
                <span className="text-rose-400 font-bold" title={`RSI Slow MA (${config.rsiMA2Type} ${config.rsiMA2Length})`}>
                  RSI-MA2: {lastRsiMA2 !== null ? lastRsiMA2.toFixed(1) : '—'}
                </span>
              </div>
            </div>

            <div className="bg-zinc-950/80 border border-zinc-900 rounded-xl p-2 group-hover:border-zinc-800 transition">
              <PureMAChart
                data={points}
                mode="rsi"
                height={chartHeight}
                showGhostLine={showGhostLine}
                hoveredIndex={hoveredIdx}
                onHoverIndex={setHoveredIdx}
                fastMaLabel={`RSI MA ${config.rsiMA1Length}`}
                slowMaLabel={`RSI MA ${config.rsiMA2Length}`}
              />
            </div>
          </div>
        )}
      </div>

      {/* FOOTER METRICS */}
      <div className="pt-2 border-t border-zinc-900/80 flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono text-zinc-500">
        <div className="flex items-center gap-1 text-zinc-400">
          <Clock className="h-3 w-3 text-zinc-500 flex-shrink-0" />
          <span className="truncate max-w-[140px] sm:max-w-[170px]">
            Bar: <strong className="text-zinc-200">{marketInfo.lastCandleTimeStr}</strong>
          </span>
          <span className={`px-1 py-0.2 rounded text-[9px] border font-bold ${
            marketInfo.isMarketOpen
              ? 'bg-emerald-950/50 text-emerald-300 border-emerald-500/30'
              : 'bg-amber-950/50 text-amber-300 border-amber-500/30'
          }`}>
            {marketInfo.elapsedStr}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <span>Slope:</span>
            <span className={`font-bold ${priceMaSlope > 0 ? 'text-emerald-400' : priceMaSlope < 0 ? 'text-rose-400' : 'text-zinc-500'}`}>
              {priceMaSlope > 0 ? '↑' : priceMaSlope < 0 ? '↓' : '→'}
            </span>
          </div>

          {setup.priceMa1Streak !== undefined && (
            <div className="flex items-center gap-1">
              <span className="font-bold text-amber-300 bg-zinc-900 px-1 py-0.2 rounded border border-zinc-800 text-[9px]">
                {setup.priceMa1Streak}b {setup.priceMa1StreakDir === 'above' ? '↑' : setup.priceMa1StreakDir === 'below' ? '↓' : ''}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

