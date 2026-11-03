import React, { useState, useEffect } from 'react';
import { SetupAnalysis } from '../types';
import SparklineChart from './SparklineChart';
import { TrendingUp, TrendingDown, Eye, RefreshCw, Zap, Columns, Rows, Star, Clock } from 'lucide-react';
import { getMarketActivity } from '../utils/timeFormat';

interface SetupCardProps {
  key?: string;
  setup: SetupAnalysis;
  onClick: () => void;
  rsiLength?: number;
  globalStacked?: boolean;
  isStarred?: boolean;
  onToggleStar?: (e: React.MouseEvent) => void;
}

export default function SetupCard({ setup, onClick, rsiLength, globalStacked, isStarred, onToggleStar }: SetupCardProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 640 : false);
  const [isStacked, setIsStacked] = useState(false);
  const [now, setNow] = useState<number>(Date.now());

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const lastCandleTimestamp = setup.dataPoints && setup.dataPoints.length > 0 
    ? setup.dataPoints[setup.dataPoints.length - 1].timestamp 
    : undefined;

  const marketInfo = getMarketActivity(lastCandleTimestamp, setup.timeframe, now);

  const chartHeight = isMobile 
    ? (isStacked ? 120 : 175) 
    : (isStacked ? 150 : 295);

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-400 border-emerald-500/30 bg-emerald-950/20';
    if (score >= 75) return 'text-teal-400 border-teal-500/20 bg-teal-950/10';
    if (score >= 55) return 'text-amber-400 border-amber-500/20 bg-amber-950/10';
    return 'text-rose-400 border-rose-500/20 bg-rose-950/10';
  };

  const getDirectionBadge = (dir: string) => {
    switch (dir) {
      case 'Strong Bullish':
        return (
          <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-950/50 border border-emerald-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
            <TrendingUp className="h-3 w-3" />
            Strong Bullish
          </span>
        );
      case 'Bullish':
        return (
          <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-500/80 bg-emerald-950/20 border border-emerald-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
            <TrendingUp className="h-3 w-3" />
            Bullish
          </span>
        );
      case 'Strong Bearish':
        return (
          <span className="flex items-center gap-1 text-[10px] font-semibold text-rose-400 bg-rose-950/50 border border-rose-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
            <TrendingDown className="h-3 w-3" />
            Strong Bearish
          </span>
        );
      case 'Bearish':
        return (
          <span className="flex items-center gap-1 text-[10px] font-semibold text-rose-500/80 bg-rose-950/20 border border-rose-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
            <TrendingDown className="h-3 w-3" />
            Bearish
          </span>
        );
      default:
        return (
          <span className="text-[10px] font-semibold text-zinc-500 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-full uppercase tracking-wider">
            Neutral Range
          </span>
        );
    }
  };

  // Convert timeframe keys to nice labels
  const getTimeframeLabel = (tf: string) => {
    switch (tf) {
      case '1m': return '1-Min';
      case '5m': return '5-Min';
      case '15m': return '15-Min';
      case '30m': return '30-Min';
      case '1h': return '1-Hour';
      case '4h': return '4-Hour';
      case '1d': return 'Daily';
      case '1wk': return 'Weekly';
      case '1mo': return 'Monthly';
      default: return tf;
    }
  };

  // Human-readable asset class indicator
  const getAssetLabel = (type: string) => {
    switch (type) {
      case 'indices': return 'Index';
      case 'commodities': return 'Commodity';
      case 'forex': return 'Forex Pair';
      case 'crypto': return 'Crypto Coin';
      default: return type;
    }
  };

  const scoreClass = getScoreColor(setup.overallScore);

  return (
    <div
      onClick={onClick}
      className={`group relative bg-zinc-950 border ${
        setup.overallScore >= 90 ? 'border-violet-500/30 shadow-violet-950/5' : 'border-zinc-800/80'
      } hover:border-violet-500/70 rounded-xl p-4 transition-all duration-300 flex flex-col justify-between cursor-pointer hover:shadow-xl hover:shadow-black/50 overflow-hidden`}
      id={`setup-card-${setup.symbol}-${setup.timeframe}`}
    >
      {/* Top Banner highlight for pristine setups */}
      {setup.overallScore >= 90 && (
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-500 via-violet-600 to-amber-500"></div>
      )}

      {/* HEADER SECTION */}
      <div className="flex items-start justify-between gap-2 border-b border-zinc-900 pb-3 mb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-zinc-100 tracking-tight group-hover:text-violet-400 transition-colors">
              {setup.symbol}
            </h3>
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
              {getTimeframeLabel(setup.timeframe)}
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
            {onToggleStar && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleStar(e);
                }}
                className={`p-1 rounded transition ${
                  isStarred
                    ? 'text-amber-400 hover:text-amber-300'
                    : 'text-zinc-600 hover:text-zinc-300'
                }`}
                title={isStarred ? 'Remove from Watchlist' : 'Add to Watchlist'}
              >
                <Star className={`h-4 w-4 ${isStarred ? 'fill-amber-400' : ''}`} />
              </button>
            )}
          </div>
          <span className="text-[11px] text-zinc-500 mt-0.5 block truncate">
            {setup.displayName} • {getAssetLabel(setup.type)}
          </span>
        </div>

        {/* Scoring circle or indicator */}
        <div className={`border rounded-lg px-2.5 py-1.5 font-mono text-center flex flex-col items-center justify-center min-w-[55px] ${scoreClass}`}>
          <span className="text-xs text-zinc-500 uppercase tracking-wider font-bold">Score</span>
          <span className="text-sm font-extrabold font-sans leading-tight">{setup.overallScore}</span>
        </div>
      </div>

      {/* MID SECTION - KEY TREND STATISTICS AND BADGES */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-zinc-500 font-sans">Momentum Direction:</span>
          {getDirectionBadge(setup.direction)}
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[11px] text-zinc-500 font-sans">Price + RSI Alignment:</span>
          <span className="text-[11px] font-bold font-mono text-violet-400">
            {setup.correlationScore}%
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[11px] text-zinc-500 font-sans">Setup Quality:</span>
          <span className="text-[11px] font-bold font-mono text-zinc-300">
            {setup.setupQualityDesc}
          </span>
        </div>

        {setup.priceMa1Streak !== undefined && (
          <div className="flex items-center justify-between text-[11px] font-mono border-t border-zinc-900/60 pt-2">
            <span className="text-zinc-500 font-sans">MA Respect Streak:</span>
            <div className="flex items-center gap-1.5 text-[10px]">
              <span className="bg-zinc-900 border border-zinc-800 text-amber-300 px-1.5 py-0.5 rounded font-bold" title="Price MA1 Respect Streak (consecutive candles respecting MA1)">
                Price: {setup.priceMa1Streak} {setup.priceMa1StreakDir === 'above' ? '↑' : setup.priceMa1StreakDir === 'below' ? '↓' : '—'}
              </span>
              <span className="bg-zinc-900 border border-zinc-800 text-violet-300 px-1.5 py-0.5 rounded font-bold" title="RSI MA1 Respect Streak (consecutive candles respecting RSI MA1)">
                RSI: {setup.rsiMa1Streak} {setup.rsiMa1StreakDir === 'above' ? '↑' : setup.rsiMa1StreakDir === 'below' ? '↓' : '—'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* LOCAL LAYOUT TOGGLE & LABEL */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500">
          Visual Synchrony
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation(); // Avoid triggering card click modal
            setIsStacked(!isStacked);
          }}
          className="flex items-center gap-1.5 px-2 py-0.5 text-[9px] font-mono rounded bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-zinc-200 border border-zinc-800 transition duration-150"
          title="Toggle chart layout for this setup card"
        >
          {isStacked ? (
            <>
              <Columns className="h-2.5 w-2.5 text-violet-400" />
              <span>Side-by-Side</span>
            </>
          ) : (
            <>
              <Rows className="h-2.5 w-2.5 text-violet-400" />
              <span>Stack</span>
            </>
          )}
        </button>
      </div>

      {/* CHARTS CONTAINER - PRICE AND RSI SYNCHRONIZED */}
      <div className={`grid ${isStacked ? 'grid-cols-1 gap-3' : 'grid-cols-2 gap-4'} mb-4 bg-zinc-900/40 p-2.5 rounded-lg border border-zinc-900/60`}>
        {/* PRICE TREND SPARKLINE */}
        <div className="space-y-1 min-w-0">
          <div className="flex justify-between items-center text-[10px] font-mono text-zinc-400">
            <span className="flex items-center gap-1">
              Price Structure
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 opacity-80" title="MA1"></span>
              <span className="h-1.5 w-1.5 rounded-full bg-blue-400 opacity-80" title="MA2"></span>
            </span>
            <span className="text-zinc-500 text-[9px] font-light truncate max-w-[80px]" title={setup.priceTrendDesc}>
              {setup.priceTrendDesc}
            </span>
          </div>
          <SparklineChart
            data={setup.dataPoints}
            type="price"
            height={chartHeight}
            hoveredIndex={hoveredIndex}
            onHoverIndex={setHoveredIndex}
          />
        </div>

        {/* RSI MOMENTUM SPARKLINE */}
        <div className="space-y-1 min-w-0">
          <div className="flex justify-between items-center text-[10px] font-mono text-zinc-400">
            <span className="flex items-center gap-1">
              RSI ({rsiLength || 14})
              <span className="h-1.5 w-1.5 rounded-full bg-blue-400 opacity-80" title="MA1"></span>
              <span className="h-1.5 w-1.5 rounded-full bg-pink-400 opacity-80" title="MA2"></span>
            </span>
            <span className="text-zinc-500 text-[9px] font-light truncate max-w-[80px]" title={setup.rsiTrendDesc}>
              {setup.rsiTrendDesc}
            </span>
          </div>
          <SparklineChart
            data={setup.dataPoints}
            type="rsi"
            height={chartHeight}
            hoveredIndex={hoveredIndex}
            onHoverIndex={setHoveredIndex}
          />
        </div>
      </div>

      {/* BOTTOM METADATA BAR CHART AND LINK BUTTONS */}
      <div className="border-t border-zinc-900/80 pt-2.5 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-400">
          <Clock className="h-3 w-3 text-zinc-500 flex-shrink-0" />
          <span className="truncate max-w-[150px] sm:max-w-[200px]">
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
        
        {/* CTA Hover button */}
        <span className="text-xs font-semibold text-violet-500 group-hover:text-violet-400 transition-colors flex items-center gap-1 font-mono">
          <Eye className="h-3.5 w-3.5" />
          Analyze Setup
        </span>
      </div>

      {/* Setup Score Breakdown Details hidden sidebar hover visual */}
      <div className="absolute bottom-1 right-2 w-1.5 h-1.5 rounded-full bg-violet-500/20 group-hover:bg-violet-500/90 transition-all duration-300 group-hover:scale-150"></div>
    </div>
  );
}
