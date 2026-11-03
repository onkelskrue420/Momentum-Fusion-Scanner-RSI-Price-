import React from 'react';
import { IndicatorData } from '../types';
import { formatExactTime } from '../utils/timeFormat';

interface PureMAChartProps {
  data: IndicatorData[];
  mode: 'price' | 'rsi';
  height?: number;
  showGhostLine?: boolean;
  hoveredIndex: number | null;
  onHoverIndex: (index: number | null) => void;
  fastMaLabel?: string;
  slowMaLabel?: string;
}

export default function PureMAChart({
  data,
  mode,
  height = 140,
  showGhostLine = false,
  hoveredIndex,
  onHoverIndex,
  fastMaLabel = 'Fast MA',
  slowMaLabel = 'Slow MA',
}: PureMAChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-28 text-zinc-600 text-xs font-mono">
        No MA Data Available
      </div>
    );
  }

  const totalPoints = data.length;
  const paddingY = 12;
  const paddingX = 4;
  const chartHeight = height - paddingY * 2;

  // Extract MA Series & Ghost Raw Series
  const fastMAs = mode === 'price'
    ? data.map(d => d.priceMA1)
    : data.map(d => d.rsiMA1);

  const slowMAs = mode === 'price'
    ? data.map(d => d.priceMA2)
    : data.map(d => d.rsiMA2);

  const rawValues = mode === 'price'
    ? data.map(d => d.price)
    : data.map(d => d.rsi ?? 50);

  // Compute bounding box
  let min = 0;
  let max = 100;

  if (mode === 'price') {
    const validMAs: number[] = [];
    fastMAs.forEach(v => { if (v !== null && !isNaN(v)) validMAs.push(v); });
    slowMAs.forEach(v => { if (v !== null && !isNaN(v)) validMAs.push(v); });
    
    if (showGhostLine) {
      rawValues.forEach(v => { if (v !== null && !isNaN(v)) validMAs.push(v); });
    }

    if (validMAs.length > 0) {
      const rawMin = Math.min(...validMAs);
      const rawMax = Math.max(...validMAs);
      const span = rawMax - rawMin;
      const margin = span > 0 ? span * 0.12 : (rawMax * 0.02 || 1);
      min = rawMin - margin;
      max = rawMax + margin;
    }
  } else {
    // RSI Mode bounded typically between 15 and 85, or standard 0 to 100
    const validMAs: number[] = [];
    fastMAs.forEach(v => { if (v !== null && !isNaN(v)) validMAs.push(v); });
    slowMAs.forEach(v => { if (v !== null && !isNaN(v)) validMAs.push(v); });
    
    if (validMAs.length > 0) {
      const rawMin = Math.min(25, ...validMAs);
      const rawMax = Math.max(75, ...validMAs);
      min = Math.max(0, rawMin - 5);
      max = Math.min(100, rawMax + 5);
    } else {
      min = 0;
      max = 100;
    }
  }

  const range = max - min || 1;

  // Coordinate projections (viewBox 0 to 300)
  const viewWidth = 300;
  const getX = (idx: number) => {
    if (totalPoints <= 1) return paddingX;
    return paddingX + (idx / (totalPoints - 1)) * (viewWidth - paddingX * 2);
  };

  const getY = (val: number) => {
    const ratio = (val - min) / range;
    return height - paddingY - ratio * chartHeight;
  };

  // Smooth Bezier path generator for moving averages
  const createSmoothPath = (points: (number | null)[]) => {
    const validCoords: { x: number; y: number; idx: number }[] = [];
    points.forEach((val, idx) => {
      if (val !== null && !isNaN(val)) {
        validCoords.push({ x: getX(idx), y: getY(val), idx });
      }
    });

    if (validCoords.length === 0) return '';
    if (validCoords.length === 1) return `M ${validCoords[0].x} ${validCoords[0].y}`;

    let d = `M ${validCoords[0].x.toFixed(1)} ${validCoords[0].y.toFixed(1)}`;
    for (let i = 0; i < validCoords.length - 1; i++) {
      const p0 = validCoords[i === 0 ? 0 : i - 1];
      const p1 = validCoords[i];
      const p2 = validCoords[i + 1];
      const p3 = validCoords[i + 2 < validCoords.length ? i + 2 : i + 1];

      // Catmull-Rom to Cubic Bezier control points
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
    return d;
  };

  // Ribbon polygon between Fast MA and Slow MA
  const createRibbonPath = (fastPts: (number | null)[], slowPts: (number | null)[]) => {
    const validPairs: { x: number; yFast: number; ySlow: number }[] = [];
    for (let i = 0; i < totalPoints; i++) {
      const f = fastPts[i];
      const s = slowPts[i];
      if (f !== null && !isNaN(f) && s !== null && !isNaN(s)) {
        validPairs.push({ x: getX(i), yFast: getY(f), ySlow: getY(s) });
      }
    }

    if (validPairs.length < 2) return '';

    // Trace forward along Fast MA, then backwards along Slow MA
    let d = `M ${validPairs[0].x.toFixed(1)} ${validPairs[0].yFast.toFixed(1)}`;
    for (let i = 1; i < validPairs.length; i++) {
      d += ` L ${validPairs[i].x.toFixed(1)} ${validPairs[i].yFast.toFixed(1)}`;
    }
    for (let i = validPairs.length - 1; i >= 0; i--) {
      d += ` L ${validPairs[i].x.toFixed(1)} ${validPairs[i].ySlow.toFixed(1)}`;
    }
    d += ' Z';
    return d;
  };

  // Detect Crossovers in the visible series
  const crossovers: { idx: number; x: number; y: number; type: 'bullish' | 'bearish' }[] = [];
  for (let i = 1; i < totalPoints; i++) {
    const fPrev = fastMAs[i - 1];
    const sPrev = slowMAs[i - 1];
    const fCurr = fastMAs[i];
    const sCurr = slowMAs[i];

    if (fPrev !== null && sPrev !== null && fCurr !== null && sCurr !== null) {
      const diffPrev = fPrev - sPrev;
      const diffCurr = fCurr - sCurr;

      if (diffPrev <= 0 && diffCurr > 0) {
        crossovers.push({
          idx: i,
          x: getX(i),
          y: getY(fCurr),
          type: 'bullish',
        });
      } else if (diffPrev >= 0 && diffCurr < 0) {
        crossovers.push({
          idx: i,
          x: getX(i),
          y: getY(fCurr),
          type: 'bearish',
        });
      }
    }
  }

  // Determine current active MA alignment
  const lastFast = fastMAs[fastMAs.length - 1];
  const lastSlow = slowMAs[slowMAs.length - 1];
  const isBullishAlign = lastFast !== null && lastSlow !== null && lastFast >= lastSlow;

  // Colors
  const fastColor = mode === 'price' ? '#f59e0b' : '#c084fc'; // Amber/Gold vs Violet
  const slowColor = mode === 'price' ? '#06b6d4' : '#f43f5e'; // Cyan vs Rose
  const ribbonColor = isBullishAlign ? '#10b981' : '#f43f5e'; // Emerald vs Crimson
  const ghostColor = '#71717a';

  // Hover item details
  const activeIdx = hoveredIndex !== null && hoveredIndex >= 0 && hoveredIndex < totalPoints ? hoveredIndex : null;
  const hoverFastVal = activeIdx !== null ? fastMAs[activeIdx] : null;
  const hoverSlowVal = activeIdx !== null ? slowMAs[activeIdx] : null;
  const hoverRawVal = activeIdx !== null ? rawValues[activeIdx] : null;

  return (
    <div className="relative w-full select-none" id={`pure-ma-chart-${mode}`}>
      <svg
        className="w-full overflow-visible"
        style={{ height }}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const mouseX = e.clientX - rect.left;
          const index = Math.min(
            totalPoints - 1,
            Math.max(0, Math.round((mouseX / rect.width) * (totalPoints - 1)))
          );
          onHoverIndex(index);
        }}
        onMouseLeave={() => {
          onHoverIndex(null);
        }}
      >
        <defs>
          {/* Luminous Glow for Fast MA */}
          <filter id={`ma-glow-${mode}`} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor={fastColor} floodOpacity="0.45" />
          </filter>

          {/* Ribbon Cloud Gradient */}
          <linearGradient id={`ribbon-grad-${mode}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={ribbonColor} stopOpacity={isBullishAlign ? "0.26" : "0.22"} />
            <stop offset="100%" stopColor={ribbonColor} stopOpacity="0.04" />
          </linearGradient>
        </defs>

        <svg width="100%" height={height} viewBox={`0 0 ${viewWidth} ${height}`} preserveAspectRatio="none">
          {/* Subtle horizontal grid lines */}
          {mode === 'rsi' ? (
            <>
              {/* RSI 70 Line */}
              <line
                x1="0"
                y1={getY(70)}
                x2={viewWidth}
                y2={getY(70)}
                stroke="#f43f5e"
                strokeWidth="1"
                strokeDasharray="3,3"
                className="opacity-35"
              />
              <text x="3" y={getY(70) - 3} className="text-[8px] fill-rose-400/70 font-mono">70 OB</text>

              {/* RSI 50 Neutral Line */}
              <line
                x1="0"
                y1={getY(50)}
                x2={viewWidth}
                y2={getY(50)}
                stroke="#52525b"
                strokeWidth="1"
                strokeDasharray="4,4"
                className="opacity-45"
              />
              <text x="3" y={getY(50) - 3} className="text-[8px] fill-zinc-500 font-mono">50</text>

              {/* RSI 30 Line */}
              <line
                x1="0"
                y1={getY(30)}
                x2={viewWidth}
                y2={getY(30)}
                stroke="#10b981"
                strokeWidth="1"
                strokeDasharray="3,3"
                className="opacity-35"
              />
              <text x="3" y={getY(30) + 9} className="text-[8px] fill-emerald-400/70 font-mono">30 OS</text>
            </>
          ) : (
            <>
              {/* Price Mid Guideline */}
              <line
                x1="0"
                y1={height / 2}
                x2={viewWidth}
                y2={height / 2}
                stroke="#27272a"
                strokeWidth="1"
                strokeDasharray="4,4"
                className="opacity-40"
              />
            </>
          )}

          {/* Ribbon Cloud between Fast MA and Slow MA */}
          <path
            d={createRibbonPath(fastMAs, slowMAs)}
            fill={`url(#ribbon-grad-${mode})`}
          />

          {/* Optional Ghost Price/RSI line (subtle faint trace so user can see background price without taking focus away) */}
          {showGhostLine && (
            <path
              d={createSmoothPath(rawValues)}
              fill="none"
              stroke={ghostColor}
              strokeWidth="1"
              strokeDasharray="2,2"
              className="opacity-25"
            />
          )}

          {/* Slow MA Line (Thick, Smooth, Grounded) */}
          <path
            d={createSmoothPath(slowMAs)}
            fill="none"
            stroke={slowColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="opacity-90"
          />

          {/* Fast MA Line (Glowing, Highly Prominent, Responsive) */}
          <path
            d={createSmoothPath(fastMAs)}
            fill="none"
            stroke={fastColor}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter={`url(#ma-glow-${mode})`}
          />

          {/* Crossover Visual Highlights */}
          {crossovers.map((cross, idx) => (
            <g key={`cross-${idx}`}>
              <circle
                cx={cross.x}
                cy={cross.y}
                r="4.5"
                fill={cross.type === 'bullish' ? '#10b981' : '#f43f5e'}
                stroke="#09090b"
                strokeWidth="2"
                className="animate-pulse"
              />
              <circle
                cx={cross.x}
                cy={cross.y}
                r="8"
                fill="none"
                stroke={cross.type === 'bullish' ? '#10b981' : '#f43f5e'}
                strokeWidth="1"
                strokeDasharray="2,2"
                className="opacity-60"
              />
            </g>
          ))}

          {/* Interactive Hover Crosshair */}
          {activeIdx !== null && (
            <>
              {/* Vertical line */}
              <line
                x1={getX(activeIdx)}
                y1={0}
                x2={getX(activeIdx)}
                y2={height}
                stroke="#a1a1aa"
                strokeWidth="1"
                strokeDasharray="2,2"
                className="opacity-50"
              />

              {/* Dot on Slow MA */}
              {hoverSlowVal !== null && (
                <circle
                  cx={getX(activeIdx)}
                  cy={getY(hoverSlowVal)}
                  r="3.5"
                  fill={slowColor}
                  stroke="#09090b"
                  strokeWidth="1.5"
                />
              )}

              {/* Dot on Fast MA */}
              {hoverFastVal !== null && (
                <circle
                  cx={getX(activeIdx)}
                  cy={getY(hoverFastVal)}
                  r="4.5"
                  fill={fastColor}
                  stroke="#09090b"
                  strokeWidth="2"
                />
              )}
            </>
          )}
        </svg>
      </svg>

      {/* Floating Hover Indicator Badge / Value Tooltip */}
      {activeIdx !== null && hoverFastVal !== null && hoverSlowVal !== null && (
        <div className="absolute top-1 right-1 z-10 bg-zinc-950/90 border border-zinc-800 rounded-md px-2 py-1 text-[10px] font-mono shadow-xl backdrop-blur-sm pointer-events-none flex flex-wrap items-center gap-2">
          {data[activeIdx]?.timestamp && (
            <span className="text-amber-400 font-bold border-r border-zinc-800 pr-1.5">
              {formatExactTime(data[activeIdx].timestamp, true)}
            </span>
          )}
          <div className="flex items-center gap-1 text-amber-400 font-bold">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: fastColor }}></span>
            <span>{hoverFastVal > 10 ? hoverFastVal.toFixed(2) : hoverFastVal.toFixed(4)}</span>
          </div>
          <span className="text-zinc-600">vs</span>
          <div className="flex items-center gap-1 font-bold" style={{ color: slowColor }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: slowColor }}></span>
            <span>{hoverSlowVal > 10 ? hoverSlowVal.toFixed(2) : hoverSlowVal.toFixed(4)}</span>
          </div>
          <span className="text-zinc-500 font-normal">
            Δ {((hoverFastVal - hoverSlowVal) / (hoverSlowVal || 1) * 100).toFixed(2)}%
          </span>
        </div>
      )}
    </div>
  );
}
