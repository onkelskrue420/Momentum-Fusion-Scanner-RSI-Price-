import React, { useState, useMemo, useEffect } from 'react';
import { ConfluenceSignalV4 } from '../types';
import {
  formatExactTime,
  formatChartTime,
  getMarketActivity
} from '../utils/timeFormat';
import { Clock, AlertCircle } from 'lucide-react';

interface ConfluenceChartV4Props {
  signal: ConfluenceSignalV4;
  height?: number;
}

export default function ConfluenceChartV4({ signal, height = 520 }: ConfluenceChartV4Props) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [now, setNow] = useState<number>(Date.now());

  // Live timer tick every second for real-time elapsed seconds & countdowns
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Take recent bars for sharp readability
  const bars = useMemo(() => {
    const pts = signal.dataPoints || [];
    return pts.slice(-65);
  }, [signal.dataPoints]);

  const emaVals = useMemo(() => {
    const raw = signal.ema20 || [];
    return raw.slice(-bars.length);
  }, [signal.ema20, bars.length]);

  const numBars = bars.length;
  if (numBars === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-zinc-500 font-mono text-xs">
        No bar data available for chart.
      </div>
    );
  }

  // Layout geometry with room for X-axis time labels
  const width = 850;
  const paddingLeft = 15;
  const paddingRight = 130; // Space for right-side price labels & extension
  const paddingTop = 25;
  const priceChartHeight = Math.floor(height * 0.65);
  const volumeChartHeight = Math.floor(height * 0.15);
  const chartGap = 12;
  const volumeTop = paddingTop + priceChartHeight + chartGap;
  const totalSvgHeight = height;

  // Compute price min/max including SL and TP so they never clip
  let minPrice = Infinity;
  let maxPrice = -Infinity;
  let maxVol = 0;

  for (let i = 0; i < numBars; i++) {
    const b = bars[i];
    const h = b.high ?? b.price;
    const l = b.low ?? b.price;
    if (h > maxPrice) maxPrice = h;
    if (l < minPrice) minPrice = l;
    if ((b.volume ?? 0) > maxVol) maxVol = b.volume ?? 0;
  }

  // Incorporate Entry, SL, TP into price bounds
  minPrice = Math.min(minPrice, signal.stopLoss, signal.entry, signal.takeProfit);
  maxPrice = Math.max(maxPrice, signal.stopLoss, signal.entry, signal.takeProfit);

  // Buffer margins
  const priceRange = maxPrice - minPrice || 1;
  minPrice -= priceRange * 0.05;
  maxPrice += priceRange * 0.05;
  const effectivePriceRange = maxPrice - minPrice;

  // Coordinate scales
  const barSpacing = (width - paddingLeft - paddingRight) / (numBars + 20); // Extra 20 bars space for extension
  const barWidth = Math.max(3, Math.min(10, barSpacing * 0.7));

  const getY = (price: number) => {
    return paddingTop + priceChartHeight - ((price - minPrice) / effectivePriceRange) * priceChartHeight;
  };

  const getVolY = (vol: number) => {
    if (maxVol <= 0) return volumeTop + volumeChartHeight;
    return volumeTop + volumeChartHeight - (vol / maxVol) * volumeChartHeight;
  };

  const getX = (idx: number) => paddingLeft + idx * barSpacing + barSpacing / 2;

  // Projected line coordinates extended 20 bars
  const lastBarX = getX(numBars - 1);
  const extendedX = getX(numBars - 1 + 20);

  const entryY = getY(signal.entry);
  const slY = getY(signal.stopLoss);
  const tpY = getY(signal.takeProfit);

  // Format prices cleanly
  const formatP = (v: number | null | undefined) => {
    if (v === null || v === undefined || isNaN(v)) return '—';
    if (v >= 1000) return v.toFixed(2);
    if (v >= 1) return v.toFixed(4);
    return v.toFixed(5);
  };

  const latestCandle = bars[numBars - 1];
  const marketInfo = getMarketActivity(latestCandle?.timestamp, signal.timeframe, now);

  const hoveredBar = hoverIdx !== null && hoverIdx >= 0 && hoverIdx < numBars ? bars[hoverIdx] : bars[numBars - 1];
  const hoveredEma = hoverIdx !== null && hoverIdx >= 0 && hoverIdx < emaVals.length ? emaVals[hoverIdx] : emaVals[emaVals.length - 1];

  // Generate X-axis time marks evenly distributed across bars
  const xTicks = useMemo(() => {
    if (numBars <= 3) return [];
    const count = Math.min(6, Math.max(3, Math.floor(numBars / 10)));
    const step = Math.max(1, Math.floor((numBars - 1) / (count - 1)));
    const ticks: { x: number; timeStr: string; dateStr: string; timestamp: number; isLast: boolean }[] = [];
    const seenIndices = new Set<number>();

    for (let i = 0; i < numBars; i += step) {
      seenIndices.add(i);
      const b = bars[i];
      ticks.push({
        x: getX(i),
        timeStr: formatChartTime(b.timestamp, signal.timeframe),
        dateStr: formatExactTime(b.timestamp, false),
        timestamp: b.timestamp,
        isLast: false,
      });
    }

    // Ensure the latest candle is explicitly labeled on the axis
    if (!seenIndices.has(numBars - 1)) {
      const b = bars[numBars - 1];
      ticks.push({
        x: getX(numBars - 1),
        timeStr: formatChartTime(b.timestamp, signal.timeframe),
        dateStr: formatExactTime(b.timestamp, false),
        timestamp: b.timestamp,
        isLast: true,
      });
    } else {
      ticks[ticks.length - 1].isLast = true;
    }

    return ticks;
  }, [bars, numBars, signal.timeframe]);

  return (
    <div className="bg-zinc-950 border border-zinc-800/90 rounded-2xl p-4 select-none space-y-3">
      {/* Chart Top Info Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-zinc-900 font-mono text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-bold text-sm text-zinc-100">{signal.symbol}</span>
          <span className="text-[11px] px-2 py-0.5 rounded bg-zinc-900 text-amber-400 border border-amber-500/30 font-bold">
            {signal.timeframe.toUpperCase()}
          </span>
          <span
            className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
              signal.direction === 'LONG'
                ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-300'
                : signal.direction === 'SHORT'
                ? 'bg-rose-950/60 border-rose-500/60 text-rose-300'
                : 'bg-zinc-900 border-zinc-700 text-zinc-400'
            }`}
          >
            {signal.direction} (1:1 R:R)
          </span>
          <span className="text-zinc-500">
            Score: <strong className="text-amber-400">{signal.score.toFixed(0)}/100</strong>
          </span>
        </div>

        {/* Dynamic Live Market Status & Candle Timer Badge */}
        <div className="flex flex-wrap items-center gap-2">
          <div className={`px-2.5 py-1 rounded-lg border text-xs font-mono flex items-center gap-2 shadow-sm ${marketInfo.statusColor}`}>
            {marketInfo.isMarketOpen ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="font-bold">LIVE MARKET</span>
                <span className="opacity-40">•</span>
                <span>Last Bar: <strong>{marketInfo.lastCandleTimeStr}</strong></span>
                <span className="text-[10px] bg-emerald-900/60 px-1.5 py-0.5 rounded border border-emerald-400/30">
                  {marketInfo.elapsedStr}
                </span>
                {marketInfo.nextBarCountdownStr !== '—' && (
                  <>
                    <span className="opacity-40">•</span>
                    <span className="flex items-center gap-1 text-cyan-300">
                      <Clock className="h-3 w-3" />
                      Next bar: <strong>{marketInfo.nextBarCountdownStr}</strong>
                    </span>
                  </>
                )}
              </>
            ) : (
              <>
                <span className="h-2 w-2 rounded-full bg-amber-400"></span>
                <span className="font-bold">MARKET CLOSED / IDLE</span>
                <span className="opacity-40">•</span>
                <span>Last Bar: <strong>{marketInfo.lastCandleTimeStr}</strong></span>
                <span className="text-[10px] bg-amber-900/60 text-amber-200 px-1.5 py-0.5 rounded border border-amber-400/30">
                  Closed {marketInfo.elapsedStr}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Market Closed Explanatory Notice (if price is stationary because market is closed) */}
      {!marketInfo.isMarketOpen && (
        <div className="bg-amber-950/20 border border-amber-900/50 rounded-xl px-3.5 py-2 text-xs font-mono text-amber-300/90 flex items-center gap-2.5">
          <AlertCircle className="h-4 w-4 text-amber-400 flex-shrink-0" />
          <span>
            <strong>Market Inactive:</strong> No incoming ticks because this asset's exchange is currently closed (last bar was printed <strong>{marketInfo.lastCandleTimeStr}</strong>, {marketInfo.elapsedStr}). Chart and signals will resume live tick movement upon market open.
          </span>
        </div>
      )}

      {/* Dynamic Bar Inspection Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-1.5 bg-zinc-900/60 rounded-xl border border-zinc-900 font-mono text-xs">
        <div className="flex items-center gap-2 text-zinc-400">
          <Clock className="h-3.5 w-3.5 text-blue-400" />
          <span>
            {hoverIdx !== null ? (
              <>
                Inspecting Bar: <strong className="text-blue-300">{formatExactTime(hoveredBar.timestamp, true)}</strong>
              </>
            ) : (
              <>
                Latest Candle Time: <strong className="text-zinc-200">{formatExactTime(latestCandle.timestamp, true)}</strong>
                <span className="text-zinc-500 text-[10px] ml-1.5">({marketInfo.elapsedStr})</span>
              </>
            )}
          </span>
        </div>

        {hoveredBar && (
          <div className="flex flex-wrap items-center gap-3 text-[11px] text-zinc-400">
            <span>
              O: <strong className="text-zinc-200">{formatP(hoveredBar.open ?? hoveredBar.price)}</strong>
            </span>
            <span>
              H: <strong className="text-emerald-400">{formatP(hoveredBar.high ?? hoveredBar.price)}</strong>
            </span>
            <span>
              L: <strong className="text-rose-400">{formatP(hoveredBar.low ?? hoveredBar.price)}</strong>
            </span>
            <span>
              C: <strong className="text-zinc-100">{formatP(hoveredBar.close ?? hoveredBar.price)}</strong>
            </span>
            <span>
              EMA20:{' '}
              <strong className="text-amber-400">{hoveredEma !== null ? formatP(hoveredEma) : '—'}</strong>
            </span>
          </div>
        )}
      </div>

      {/* SVG Candlestick & Confluence Plot */}
      <div className="relative w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${totalSvgHeight}`}
          className="w-full h-auto cursor-crosshair"
          onMouseLeave={() => setHoverIdx(null)}
        >
          <defs>
            <linearGradient id="bullFvgGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.05" />
            </linearGradient>
            <linearGradient id="bearFvgGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0.05" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
            const gridY = paddingTop + priceChartHeight * pct;
            const priceAtGrid = maxPrice - pct * effectivePriceRange;
            return (
              <g key={`grid_${pct}`}>
                <line
                  x1={paddingLeft}
                  y1={gridY}
                  x2={width - paddingRight + 20}
                  y2={gridY}
                  stroke="#27272a"
                  strokeWidth="0.8"
                  strokeDasharray="3 3"
                />
                <text
                  x={width - paddingRight + 25}
                  y={gridY + 3}
                  fill="#71717a"
                  fontSize="10"
                  fontFamily="monospace"
                >
                  {formatP(priceAtGrid)}
                </text>
              </g>
            );
          })}

          {/* FVG Highlight Boxes */}
          {signal.fvgBoxes?.map((fvg, fIdx) => {
            const boxTopY = getY(fvg.top);
            const boxBottomY = getY(fvg.bottom);
            const boxH = Math.max(2, Math.abs(boxBottomY - boxTopY));
            const startX = getX(Math.max(0, numBars - 5));
            return (
              <g key={`fvg_${fIdx}`}>
                <rect
                  x={startX}
                  y={Math.min(boxTopY, boxBottomY)}
                  width={width - paddingRight - startX + 15}
                  height={boxH}
                  fill={fvg.type === 'bullish' ? 'url(#bullFvgGrad)' : 'url(#bearFvgGrad)'}
                  stroke={fvg.type === 'bullish' ? '#10b981' : '#ef4444'}
                  strokeWidth="0.7"
                  strokeDasharray="2 2"
                />
                <text
                  x={width - paddingRight - 65}
                  y={Math.min(boxTopY, boxBottomY) + boxH / 2 + 3}
                  fill={fvg.type === 'bullish' ? '#6ee7b7' : '#fca5a5'}
                  fontSize="9"
                  fontFamily="monospace"
                >
                  {fvg.type.toUpperCase()} FVG
                </text>
              </g>
            );
          })}

          {/* 20-Period Exponential Moving Average Line */}
          {emaVals.length > 1 && (
            <path
              d={emaVals.reduce((acc, val, i) => {
                if (val === null) return acc;
                const x = getX(i);
                const y = getY(val);
                return acc === '' ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
              }, '')}
              fill="none"
              stroke="#f59e0b"
              strokeWidth="1.8"
            />
          )}

          {/* Candlesticks with hover detection */}
          {bars.map((bar, i) => {
            const x = getX(i);
            const openY = getY(bar.open ?? bar.price);
            const closeY = getY(bar.close ?? bar.price);
            const highY = getY(bar.high ?? bar.price);
            const lowY = getY(bar.low ?? bar.price);
            const isBull = (bar.close ?? bar.price) >= (bar.open ?? bar.price);
            const color = isBull ? '#10b981' : '#ef4444';
            const bodyTop = Math.min(openY, closeY);
            const bodyHeight = Math.max(1.5, Math.abs(closeY - openY));

            return (
              <g
                key={`candle_${i}`}
                onMouseEnter={() => setHoverIdx(i)}
                className="cursor-pointer"
              >
                {/* Invisible hover area for reliable mouse interaction */}
                <rect
                  x={x - barSpacing / 2}
                  y={paddingTop}
                  width={barSpacing}
                  height={priceChartHeight + volumeChartHeight + chartGap}
                  fill="transparent"
                />

                {/* Wick */}
                <line x1={x} y1={highY} x2={x} y2={lowY} stroke={color} strokeWidth="1.2" />

                {/* Body */}
                <rect
                  x={x - barWidth / 2}
                  y={bodyTop}
                  width={barWidth}
                  height={bodyHeight}
                  fill={isBull ? '#059669' : '#dc2626'}
                  stroke={color}
                  strokeWidth="0.8"
                  rx="0.5"
                />
              </g>
            );
          })}

          {/* 1:1 TRADE PLAN OVERLAYS */}
          {/* 1. ENTRY (BLUE SOLID) */}
          <g>
            <line
              x1={lastBarX}
              y1={entryY}
              x2={extendedX}
              y2={entryY}
              stroke="#3b82f6"
              strokeWidth="2"
            />
            <rect
              x={extendedX + 4}
              y={entryY - 10}
              width={120}
              height={20}
              fill="#1e3a8a"
              stroke="#3b82f6"
              strokeWidth="1"
              rx="4"
            />
            <text
              x={extendedX + 9}
              y={entryY + 4}
              fill="#93c5fd"
              fontSize="10"
              fontFamily="monospace"
              fontWeight="bold"
            >
              ENTRY: {formatP(signal.entry)}
            </text>
          </g>

          {/* 2. STOP LOSS (RED DASHED) */}
          <g>
            <line
              x1={lastBarX}
              y1={slY}
              x2={extendedX}
              y2={slY}
              stroke="#ef4444"
              strokeWidth="2"
              strokeDasharray="5 3"
            />
            <rect
              x={extendedX + 4}
              y={slY - 10}
              width={105}
              height={20}
              fill="#7f1d1d"
              stroke="#ef4444"
              strokeWidth="1"
              rx="4"
            />
            <text
              x={extendedX + 9}
              y={slY + 4}
              fill="#fca5a5"
              fontSize="10"
              fontFamily="monospace"
              fontWeight="bold"
            >
              SL: {formatP(signal.stopLoss)}
            </text>
          </g>

          {/* 3. TAKE PROFIT 1:1 (GREEN DOTTED) */}
          <g>
            <line
              x1={lastBarX}
              y1={tpY}
              x2={extendedX}
              y2={tpY}
              stroke="#10b981"
              strokeWidth="2"
              strokeDasharray="2 3"
            />
            <rect
              x={extendedX + 4}
              y={tpY - 10}
              width={112}
              height={20}
              fill="#064e3b"
              stroke="#10b981"
              strokeWidth="1"
              rx="4"
            />
            <text
              x={extendedX + 9}
              y={tpY + 4}
              fill="#6ee7b7"
              fontSize="10"
              fontFamily="monospace"
              fontWeight="bold"
            >
              TP (1:1): {formatP(signal.takeProfit)}
            </text>
          </g>

          {/* Divider between Price and Volume */}
          <line
            x1={paddingLeft}
            y1={volumeTop - 6}
            x2={width - paddingRight + 20}
            y2={volumeTop - 6}
            stroke="#27272a"
            strokeWidth="1"
          />
          <text
            x={paddingLeft}
            y={volumeTop + 8}
            fill="#71717a"
            fontSize="9"
            fontFamily="monospace"
            fontWeight="bold"
          >
            VOLUME
          </text>

          {/* Volume Subplot */}
          {bars.map((bar, i) => {
            const x = getX(i);
            const vol = bar.volume ?? 10000;
            const y = getVolY(vol);
            const h = volumeTop + volumeChartHeight - y;
            const isBull = (bar.close ?? bar.price) >= (bar.open ?? bar.price);
            return (
              <rect
                key={`vol_${i}`}
                x={x - barWidth / 2}
                y={y}
                width={barWidth}
                height={Math.max(1, h)}
                fill={isBull ? '#059669' : '#dc2626'}
                opacity={0.65}
                rx="1"
              />
            );
          })}

          {/* Divider between Volume and Time Axis */}
          <line
            x1={paddingLeft}
            y1={volumeTop + volumeChartHeight + 4}
            x2={width - paddingRight + 20}
            y2={volumeTop + volumeChartHeight + 4}
            stroke="#27272a"
            strokeWidth="0.8"
          />

          {/* Time Axis Ticks & Exact Timestamp Labels */}
          {xTicks.map((t, idx) => (
            <g key={`time_tick_${idx}`}>
              <line
                x1={t.x}
                y1={volumeTop + volumeChartHeight + 4}
                x2={t.x}
                y2={volumeTop + volumeChartHeight + 9}
                stroke={t.isLast ? '#f59e0b' : '#3f3f46'}
                strokeWidth={t.isLast ? '1.5' : '1'}
              />
              <text
                x={t.x}
                y={volumeTop + volumeChartHeight + 20}
                textAnchor="middle"
                fill={t.isLast ? '#fbbf24' : '#71717a'}
                fontSize="10"
                fontFamily="monospace"
                fontWeight={t.isLast ? 'bold' : 'normal'}
              >
                {t.timeStr}
              </text>
            </g>
          ))}

          {/* Hover Crosshair & Bottom X-Axis Time Badge */}
          {hoverIdx !== null && (
            <g pointerEvents="none">
              <line
                x1={getX(hoverIdx)}
                y1={paddingTop}
                x2={getX(hoverIdx)}
                y2={volumeTop + volumeChartHeight + 4}
                stroke="#a1a1aa"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
              {/* Floating hovered time tag on X-axis */}
              <rect
                x={Math.max(10, Math.min(width - 150, getX(hoverIdx) - 60))}
                y={volumeTop + volumeChartHeight + 5}
                width={120}
                height={18}
                fill="#18181b"
                stroke="#3b82f6"
                strokeWidth="1"
                rx="3"
              />
              <text
                x={Math.max(10, Math.min(width - 150, getX(hoverIdx) - 60)) + 60}
                y={volumeTop + volumeChartHeight + 18}
                textAnchor="middle"
                fill="#93c5fd"
                fontSize="10"
                fontFamily="monospace"
                fontWeight="bold"
              >
                {formatExactTime(hoveredBar.timestamp, true)}
              </text>
            </g>
          )}
        </svg>
      </div>

      {/* Chart Legend Footer with Time Info */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-zinc-900 text-[11px] font-mono text-zinc-400">
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-blue-500 inline-block"></span>
            Entry
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-rose-500 border-dashed border-b border-rose-500 inline-block"></span>
            Stop-Loss (0.5 ATR buffer)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-emerald-500 border-dotted border-b-2 border-emerald-500 inline-block"></span>
            Take-Profit (Strict 1:1 R:R)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-amber-500 inline-block"></span>
            EMA 20
          </span>
        </div>
        <div className="flex items-center gap-3 text-zinc-500">
          <span>Closed bars only • Zero lookahead</span>
          <span>•</span>
          <span className="text-zinc-400">
            Last Bar: <strong className="text-zinc-300">{formatExactTime(latestCandle.timestamp, false)}</strong>
          </span>
        </div>
      </div>
    </div>
  );
}
