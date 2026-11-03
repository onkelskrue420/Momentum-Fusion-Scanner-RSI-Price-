import React, { useState, useMemo } from 'react';
import { ConfluenceSignalV4, Timeframe } from '../types';
import { formatExactTime, formatChartTime, getMarketActivity, isMarketCurrentlyLive } from '../utils/timeFormat';
import {
  Zap,
  TrendingUp,
  TrendingDown,
  LayoutGrid,
  Columns,
  Search,
  Filter,
  Eye,
  EyeOff,
  Clock,
  Activity,
  Maximize2
} from 'lucide-react';

interface QuickCharts1to1ViewProps {
  signals: ConfluenceSignalV4[];
  onSelectSignal?: (sig: ConfluenceSignalV4) => void;
  now: number;
}

export default function QuickCharts1to1View({
  signals,
  onSelectSignal,
  now
}: QuickCharts1to1ViewProps) {
  const [selectedTf, setSelectedTf] = useState<string>('ALL');
  const [directionFilter, setDirectionFilter] = useState<'ALL' | 'LONG' | 'SHORT'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [gridCols, setGridCols] = useState<1 | 2 | 3>(1);
  const [hoveredSignalKey, setHoveredSignalKey] = useState<string | null>(null);
  const [hoverBarIdx, setHoverBarIdx] = useState<{ [key: string]: number | null }>({});

  // Hide closed / not live markets toggle
  const [hideClosedMarkets, setHideClosedMarkets] = useState<boolean>(() => {
    const saved = localStorage.getItem('momentum_v4_qc_hide_closed');
    return saved === 'true';
  });

  const closedMarketsCount = useMemo(() => {
    let count = 0;
    for (const s of signals) {
      const pts = s.dataPoints || [];
      const lastTs = pts.length > 0 ? pts[pts.length - 1].timestamp : undefined;
      if (!isMarketCurrentlyLive(s.symbol, s.type, lastTs, s.timeframe, now)) {
        count++;
      }
    }
    return count;
  }, [signals, now]);

  // Filter signals
  const displaySignals = useMemo(() => {
    return signals.filter((sig) => {
      if (selectedTf !== 'ALL' && sig.timeframe !== selectedTf) return false;
      if (directionFilter !== 'ALL' && sig.direction !== directionFilter) return false;
      if (hideClosedMarkets) {
        const pts = sig.dataPoints || [];
        const lastTs = pts.length > 0 ? pts[pts.length - 1].timestamp : undefined;
        if (!isMarketCurrentlyLive(sig.symbol, sig.type, lastTs, sig.timeframe, now)) {
          return false;
        }
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!sig.symbol.toLowerCase().includes(q) && !sig.displayName.toLowerCase().includes(q)) {
          return false;
        }
      }
      return true;
    }).sort((a, b) => {
      // Sort by score or win rate
      if (b.score !== a.score) return b.score - a.score;
      return b.oosWinRate - a.oosWinRate;
    });
  }, [signals, selectedTf, directionFilter, hideClosedMarkets, now, searchQuery]);

  return (
    <div className="space-y-4 font-mono select-none" id="quick-charts-1to1-container">
      {/* Minimalist Top Control Bar */}
      <div className="bg-zinc-950/90 border border-zinc-800/90 rounded-2xl p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-md">
        <div className="flex flex-wrap items-center gap-2">
          {/* Section badge */}
          <div className="flex items-center gap-2 mr-2">
            <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30">
              <Activity className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black text-white tracking-wider">2.1. CHART (1:1 LINES)</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 font-bold border border-emerald-500/30">
                  RAPID SCROLL
                </span>
              </div>
              <span className="text-[10px] text-zinc-500">Only charts, times & names • Minimalist for work</span>
            </div>
          </div>

          {/* Timeframe Buttons */}
          <div className="flex flex-wrap items-center gap-1 bg-zinc-900/90 p-1 rounded-xl border border-zinc-800 text-xs">
            {(['ALL', '1m', '5m', '15m', '30m', '1h', '4h', '1d'] as const).map((tf) => {
              const isSelected = selectedTf === tf;
              const count = tf === 'ALL'
                ? signals.length
                : signals.filter((s) => s.timeframe === tf).length;
              return (
                <button
                  key={tf}
                  onClick={() => setSelectedTf(tf)}
                  className={`px-2.5 py-1 rounded-lg transition font-bold flex items-center gap-1 ${
                    isSelected
                      ? tf === '1m'
                        ? 'bg-amber-500 text-zinc-950 font-black shadow-sm'
                        : 'bg-blue-600 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
                  }`}
                >
                  {tf === '1m' && <Zap className="h-3 w-3 fill-current" />}
                  <span>{tf}</span>
                  <span className="text-[9px] opacity-70">({count})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right side: Direction, Search, Layout toggles & count */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          {/* Direction */}
          <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-xl border border-zinc-800">
            {(['ALL', 'LONG', 'SHORT'] as const).map((dir) => (
              <button
                key={dir}
                onClick={() => setDirectionFilter(dir)}
                className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition ${
                  directionFilter === dir
                    ? dir === 'LONG'
                      ? 'bg-emerald-600 text-white'
                      : dir === 'SHORT'
                      ? 'bg-rose-600 text-white'
                      : 'bg-zinc-700 text-white'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {dir}
              </button>
            ))}
          </div>

          {/* Hide Closed / Not Live Markets Toggle */}
          <button
            type="button"
            onClick={() => setHideClosedMarkets(!hideClosedMarkets)}
            className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition flex items-center gap-1 border ${
              hideClosedMarkets
                ? 'bg-amber-500/20 border-amber-500/80 text-amber-300 shadow-sm'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
            title="Hide markets which are closed or currently not trading live"
          >
            {hideClosedMarkets ? (
              <EyeOff className="h-3 w-3 text-amber-400" />
            ) : (
              <Eye className="h-3 w-3 text-zinc-400" />
            )}
            <span>{hideClosedMarkets ? 'Closed Hidden' : 'Hide Closed'}</span>
            {closedMarketsCount > 0 && (
              <span className={`text-[9px] px-1 rounded-full font-mono ${
                hideClosedMarkets ? 'bg-amber-500/30 text-amber-200 font-bold' : 'bg-zinc-800 text-zinc-400'
              }`}>
                {closedMarketsCount}
              </span>
            )}
          </button>

          {/* Search input */}
          <div className="relative">
            <Search className="h-3 w-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-7 pr-2.5 py-1 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs focus:outline-none focus:border-blue-500 w-28"
            />
          </div>

          {/* Grid Layout Toggles */}
          <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-xl border border-zinc-800 text-zinc-400">
            <button
              onClick={() => setGridCols(1)}
              className={`p-1 rounded-lg transition ${gridCols === 1 ? 'bg-zinc-700 text-white' : 'hover:text-zinc-200'}`}
              title="1-Column Full Width Scroll"
            >
              <Columns className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setGridCols(2)}
              className={`p-1 rounded-lg transition ${gridCols === 2 ? 'bg-zinc-700 text-white' : 'hover:text-zinc-200'}`}
              title="2-Column Grid"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setGridCols(3)}
              className={`p-1 rounded-lg transition ${gridCols === 3 ? 'bg-zinc-700 text-white' : 'hover:text-zinc-200'}`}
              title="3-Column Compact Grid"
            >
              <span className="text-[10px] font-bold px-1">3x</span>
            </button>
          </div>

          {/* Counter */}
          <span className="px-2.5 py-1 rounded-xl bg-blue-950/60 border border-blue-800/40 text-blue-300 font-bold text-[11px]">
            {displaySignals.length} {displaySignals.length === 1 ? 'chart' : 'charts'}
          </span>
        </div>
      </div>

      {/* Main Charts Stream */}
      {displaySignals.length === 0 ? (
        <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-2xl p-12 text-center text-zinc-500 text-xs">
          No instruments found matching criteria. Try adjusting timeframe or direction filter.
        </div>
      ) : (
        <div
          className={`grid gap-4 ${
            gridCols === 1
              ? 'grid-cols-1'
              : gridCols === 2
              ? 'grid-cols-1 lg:grid-cols-2'
              : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'
          }`}
        >
          {displaySignals.map((sig) => {
            const key = `${sig.symbol}_${sig.timeframe}`;
            const activeHoverIdx = hoverBarIdx[key] ?? null;

            return (
              <QuickSingleChartCard
                key={key}
                signal={sig}
                now={now}
                hoverIdx={activeHoverIdx}
                onHoverIdx={(idx) => setHoverBarIdx((prev) => ({ ...prev, [key]: idx }))}
                onSelect={() => onSelectSignal && onSelectSignal(sig)}
                isCompact={gridCols === 3}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

interface QuickSingleChartCardProps {
  key?: string;
  signal: ConfluenceSignalV4;
  now: number;
  hoverIdx: number | null;
  onHoverIdx: (idx: number | null) => void;
  onSelect?: () => void;
  isCompact?: boolean;
}

function QuickSingleChartCard({
  signal,
  now,
  hoverIdx,
  onHoverIdx,
  onSelect,
  isCompact = false
}: QuickSingleChartCardProps) {
  const bars = signal.dataPoints || [];
  const numBars = bars.length;
  const isLong = signal.direction === 'LONG';
  const isShort = signal.direction === 'SHORT';

  const latestCandle = bars[numBars - 1];
  const marketInfo = getMarketActivity(latestCandle?.timestamp, signal.timeframe, now);

  // SVG Geometry
  const width = 800;
  const height = isCompact ? 210 : 250;
  const paddingLeft = 14;
  const paddingRight = 85;
  const paddingTop = 20;
  const paddingBottom = 26;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  // Safe price formatting
  const formatP = (v: number | null | undefined) => {
    if (v === null || v === undefined || isNaN(v)) return '—';
    if (v >= 1000) return v.toFixed(2);
    if (v >= 1) return v.toFixed(4);
    return v.toFixed(5);
  };

  // Price Extents including 1:1 levels
  const { minPrice, maxPrice, effectivePriceRange } = useMemo(() => {
    if (numBars === 0) return { minPrice: 0, maxPrice: 100, effectivePriceRange: 100 };
    let min = Infinity;
    let max = -Infinity;

    for (let i = 0; i < numBars; i++) {
      const b = bars[i];
      const h = b.high ?? b.price;
      const l = b.low ?? b.price;
      if (h > max) max = h;
      if (l < min) min = l;
    }

    // Include 1:1 SL & TP
    if (signal.stopLoss < min) min = signal.stopLoss;
    if (signal.stopLoss > max) max = signal.stopLoss;
    if (signal.takeProfit < min) min = signal.takeProfit;
    if (signal.takeProfit > max) max = signal.takeProfit;
    if (signal.entry < min) min = signal.entry;
    if (signal.entry > max) max = signal.entry;

    const span = max - min || 1;
    const pad = span * 0.08;
    const finalMin = min - pad;
    const finalMax = max + pad;
    return {
      minPrice: finalMin,
      maxPrice: finalMax,
      effectivePriceRange: finalMax - finalMin || 1
    };
  }, [bars, numBars, signal]);

  // Coordinate projections
  const totalSlots = numBars + 20; // 20 bars extension for 1:1 lines
  const getX = (i: number) => paddingLeft + (i / (totalSlots - 1 || 1)) * chartWidth;
  const getY = (val: number) => paddingTop + (1 - (val - minPrice) / effectivePriceRange) * chartHeight;

  // Candle width
  const candleSpacing = chartWidth / (totalSlots || 1);
  const candleW = Math.max(2.5, Math.min(6, candleSpacing * 0.75));

  // EMA20 line path
  const emaVals = signal.ema20 || [];
  const emaPath = useMemo(() => {
    const coords: { x: number; y: number }[] = [];
    for (let i = 0; i < numBars; i++) {
      const val = emaVals[i];
      if (val !== null && val !== undefined && !isNaN(val)) {
        coords.push({ x: getX(i), y: getY(val) });
      }
    }
    if (coords.length < 2) return '';
    return coords.map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`).join(' ');
  }, [emaVals, numBars, minPrice, effectivePriceRange]);

  // Extended 1:1 lines coords
  const lastBarX = getX(numBars - 1);
  const extendedX = getX(numBars - 1 + 20);

  const entryY = getY(signal.entry);
  const slY = getY(signal.stopLoss);
  const tpY = getY(signal.takeProfit);

  // Hovered candle
  const activeCandle = hoverIdx !== null && hoverIdx >= 0 && hoverIdx < numBars ? bars[hoverIdx] : latestCandle;

  // Evenly spaced X time ticks
  const xTicks = useMemo(() => {
    if (numBars <= 3) return [];
    const count = isCompact ? 4 : 6;
    const step = Math.max(1, Math.floor((numBars - 1) / (count - 1)));
    const ticks: { x: number; timeStr: string; isLast: boolean }[] = [];
    for (let i = 0; i < numBars; i += step) {
      ticks.push({
        x: getX(i),
        timeStr: formatChartTime(bars[i].timestamp, signal.timeframe),
        isLast: false,
      });
    }
    // Always include latest candle
    ticks.push({
      x: getX(numBars - 1),
      timeStr: formatChartTime(latestCandle.timestamp, signal.timeframe),
      isLast: true,
    });
    return ticks;
  }, [bars, numBars, signal.timeframe, latestCandle, isCompact]);

  return (
    <div className="bg-zinc-950 border border-zinc-800/90 rounded-2xl overflow-hidden shadow-sm hover:border-zinc-700 transition group">
      {/* CARD HEADER: Strictly Instrument Name, Timeframe, Exact Time, and 1:1 Direction */}
      <div className="px-4 py-2.5 bg-zinc-900/80 border-b border-zinc-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
        {/* Left: Name, Symbol, Timeframe, Live indicator */}
        <div className="flex items-center gap-2.5">
          <strong className="text-zinc-100 text-sm font-black tracking-tight">{signal.symbol}</strong>
          <span className="text-zinc-400 text-[11px] truncate max-w-[140px]" title={signal.displayName}>
            {signal.displayName}
          </span>
          <span
            className={`text-[10px] px-2 py-0.5 rounded font-black border ${
              signal.timeframe === '1m'
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                : 'bg-zinc-800 border-zinc-700 text-zinc-300'
            }`}
          >
            {signal.timeframe}
          </span>

          {marketInfo.isMarketOpen ? (
            <span className="flex items-center gap-1 text-[9px] text-emerald-400 font-bold">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              LIVE
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[9px] text-amber-400">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400"></span>
              CLOSED
            </span>
          )}
        </div>

        {/* Right: Exact Timestamp, Direction pill & 1:1 Price levels */}
        <div className="flex items-center gap-3 font-mono text-[11px]">
          {/* Time */}
          <div className="flex items-center gap-1 text-zinc-400" title="Latest bar timestamp">
            <Clock className="h-3 w-3 text-blue-400" />
            <span className="text-zinc-300 font-bold">{formatExactTime(latestCandle?.timestamp, true)}</span>
          </div>

          {/* Direction Pill */}
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-bold border flex items-center gap-1 ${
              isLong
                ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-300'
                : isShort
                ? 'bg-rose-950/70 border-rose-500/50 text-rose-300'
                : 'bg-zinc-800 border-zinc-700 text-zinc-400'
            }`}
          >
            {isLong ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {signal.direction} 1:1
          </span>

          {/* Expand button */}
          {onSelect && (
            <button
              onClick={onSelect}
              className="p-1 rounded bg-zinc-800 hover:bg-blue-600 hover:text-white text-zinc-400 transition"
              title="Open full interactive deep chart"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* SVG Candlestick Plot with 1:1 Extended Lines */}
      <div className="relative w-full overflow-hidden bg-zinc-950">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto cursor-crosshair select-none"
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const relX = (mouseX / rect.width) * width;
            const barIndex = Math.min(
              numBars - 1,
              Math.max(0, Math.round(((relX - paddingLeft) / chartWidth) * (totalSlots - 1)))
            );
            if (barIndex >= 0 && barIndex < numBars) {
              onHoverIdx(barIndex);
            }
          }}
          onMouseLeave={() => onHoverIdx(null)}
        >
          {/* Subtle Grid Lines */}
          {[0, 0.33, 0.66, 1].map((pct) => {
            const y = paddingTop + chartHeight * pct;
            const priceVal = maxPrice - pct * effectivePriceRange;
            return (
              <g key={`grid_${pct}`}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={width - paddingRight + 10}
                  y2={y}
                  stroke="#1e1e24"
                  strokeWidth="0.8"
                  strokeDasharray="2 2"
                />
                <text
                  x={width - paddingRight + 14}
                  y={y + 3}
                  fill="#52525b"
                  fontSize="9"
                  fontFamily="monospace"
                >
                  {formatP(priceVal)}
                </text>
              </g>
            );
          })}

          {/* Candlesticks */}
          {bars.map((bar, i) => {
            const x = getX(i);
            const open = bar.open ?? bar.price;
            const high = bar.high ?? bar.price;
            const low = bar.low ?? bar.price;
            const close = bar.close ?? bar.price;

            const isBull = close >= open;
            const candleColor = isBull ? '#10b981' : '#ef4444';

            const yHigh = getY(high);
            const yLow = getY(low);
            const yOpen = getY(open);
            const yClose = getY(close);

            const bodyTop = Math.min(yOpen, yClose);
            const bodyHeight = Math.max(1.2, Math.abs(yOpen - yClose));

            return (
              <g key={`c_${i}`}>
                {/* Wick */}
                <line
                  x1={x}
                  y1={yHigh}
                  x2={x}
                  y2={yLow}
                  stroke={candleColor}
                  strokeWidth="1"
                />
                {/* Body */}
                <rect
                  x={x - candleW / 2}
                  y={bodyTop}
                  width={candleW}
                  height={bodyHeight}
                  fill={candleColor}
                  rx="0.5"
                />
              </g>
            );
          })}

          {/* EMA20 Line */}
          {emaPath && (
            <path
              d={emaPath}
              fill="none"
              stroke="#f59e0b"
              strokeWidth="1.3"
              strokeOpacity="0.85"
            />
          )}

          {/* 1:1 EXTENDED LEVEL LINES (ENTRY, SL, TP) */}
          {/* Entry Line (Blue) */}
          <line
            x1={lastBarX}
            y1={entryY}
            x2={extendedX}
            y2={entryY}
            stroke="#3b82f6"
            strokeWidth="1.8"
            strokeDasharray="4 3"
          />
          {/* Take Profit Line (Emerald) */}
          <line
            x1={lastBarX}
            y1={tpY}
            x2={extendedX}
            y2={tpY}
            stroke="#10b981"
            strokeWidth="1.8"
            strokeDasharray="4 3"
          />
          {/* Stop Loss Line (Rose) */}
          <line
            x1={lastBarX}
            y1={slY}
            x2={extendedX}
            y2={slY}
            stroke="#ef4444"
            strokeWidth="1.8"
            strokeDasharray="4 3"
          />

          {/* Price Tags on Right Axis */}
          {/* Entry Tag */}
          <g transform={`translate(${extendedX + 4}, ${entryY - 7})`}>
            <rect width="68" height="15" rx="3" fill="#1e3a8a" stroke="#3b82f6" strokeWidth="0.8" />
            <text x="4" y="11" fill="#93c5fd" fontSize="9" fontWeight="bold" fontFamily="monospace">
              E: {formatP(signal.entry)}
            </text>
          </g>

          {/* TP Tag */}
          <g transform={`translate(${extendedX + 4}, ${tpY - 7})`}>
            <rect width="68" height="15" rx="3" fill="#064e3b" stroke="#10b981" strokeWidth="0.8" />
            <text x="4" y="11" fill="#6ee7b7" fontSize="9" fontWeight="bold" fontFamily="monospace">
              TP: {formatP(signal.takeProfit)}
            </text>
          </g>

          {/* SL Tag */}
          <g transform={`translate(${extendedX + 4}, ${slY - 7})`}>
            <rect width="68" height="15" rx="3" fill="#4c0519" stroke="#ef4444" strokeWidth="0.8" />
            <text x="4" y="11" fill="#fca5a5" fontSize="9" fontWeight="bold" fontFamily="monospace">
              SL: {formatP(signal.stopLoss)}
            </text>
          </g>

          {/* X Axis Time Marks */}
          {xTicks.map((t, idx) => (
            <g key={`t_${idx}`}>
              <line
                x1={t.x}
                y1={height - paddingBottom}
                x2={t.x}
                y2={height - paddingBottom + 3}
                stroke="#3f3f46"
                strokeWidth="0.8"
              />
              <text
                x={t.x}
                y={height - paddingBottom + 13}
                textAnchor="middle"
                fill={t.isLast ? '#e4e4e7' : '#71717a'}
                fontSize="9"
                fontWeight={t.isLast ? 'bold' : 'normal'}
                fontFamily="monospace"
              >
                {t.timeStr}
              </text>
            </g>
          ))}

          {/* Hover Crosshair */}
          {hoverIdx !== null && hoverIdx >= 0 && hoverIdx < numBars && (
            <g pointerEvents="none">
              <line
                x1={getX(hoverIdx)}
                y1={paddingTop}
                x2={getX(hoverIdx)}
                y2={height - paddingBottom}
                stroke="#60a5fa"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
              <circle
                cx={getX(hoverIdx)}
                cy={getY(bars[hoverIdx].close ?? bars[hoverIdx].price)}
                r="3"
                fill="#60a5fa"
              />
            </g>
          )}
        </svg>
      </div>

      {/* FOOTER BAR: Compact candle stats bar when hovered or default latest candle stats */}
      <div className="px-4 py-1.5 bg-zinc-950/90 border-t border-zinc-900 flex flex-wrap items-center justify-between text-[11px] text-zinc-400 font-mono">
        <div className="flex items-center gap-2">
          <span className="text-zinc-500">
            {hoverIdx !== null ? 'Inspecting:' : 'Current:'}
          </span>
          <span className="text-zinc-200 font-semibold">
            {formatExactTime(activeCandle?.timestamp, true)}
          </span>
        </div>

        {activeCandle && (
          <div className="flex items-center gap-3">
            <span>
              O: <strong className="text-zinc-200">{formatP(activeCandle.open ?? activeCandle.price)}</strong>
            </span>
            <span>
              H: <strong className="text-emerald-400">{formatP(activeCandle.high ?? activeCandle.price)}</strong>
            </span>
            <span>
              L: <strong className="text-rose-400">{formatP(activeCandle.low ?? activeCandle.price)}</strong>
            </span>
            <span>
              C: <strong className="text-zinc-100">{formatP(activeCandle.close ?? activeCandle.price)}</strong>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
