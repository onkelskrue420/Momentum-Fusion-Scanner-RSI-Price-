import React from 'react';
import { IndicatorData } from '../types';
import { formatExactTime } from '../utils/timeFormat';

interface CandlestickChartProps {
  data: IndicatorData[];
  height?: number;
  hoveredIndex: number | null;
  onHoverIndex: (index: number | null) => void;
  showMAs?: boolean;
}

export default function CandlestickChart({
  data,
  height = 140,
  hoveredIndex,
  onHoverIndex,
  showMAs = true,
}: CandlestickChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-28 text-zinc-600 text-xs font-mono">
        No Candlestick Data Available
      </div>
    );
  }

  const totalPoints = data.length;
  const paddingY = 14;
  const paddingX = 8;
  const viewWidth = 300;
  const chartHeight = height - paddingY * 2;

  // Extract OHLC & calculate bounds
  let min = Infinity;
  let max = -Infinity;

  data.forEach((d) => {
    const l = d.low !== undefined ? d.low : d.price;
    const h = d.high !== undefined ? d.high : d.price;
    if (l < min) min = l;
    if (h > max) max = h;
  });

  if (min === Infinity || max === -Infinity) {
    min = 0;
    max = 100;
  }

  const span = max - min;
  const margin = span > 0 ? span * 0.08 : (max * 0.02 || 1);
  min = min - margin;
  max = max + margin;
  const range = max - min || 1;

  // Coordinate projection
  const getX = (idx: number) => {
    if (totalPoints <= 1) return viewWidth / 2;
    return paddingX + (idx / (totalPoints - 1)) * (viewWidth - paddingX * 2);
  };

  const getY = (val: number) => {
    const ratio = (val - min) / range;
    return height - paddingY - ratio * chartHeight;
  };

  // Candle width based on number of bars
  const availableWidth = viewWidth - paddingX * 2;
  const candleSpacing = availableWidth / (totalPoints || 1);
  const candleWidth = Math.max(2, Math.min(6.5, candleSpacing * 0.72));

  // Hovered item details
  const activeIdx = hoveredIndex !== null && hoveredIndex >= 0 && hoveredIndex < totalPoints ? hoveredIndex : null;
  const activeItem = activeIdx !== null ? data[activeIdx] : null;

  const activeOpen = activeItem?.open ?? activeItem?.price ?? null;
  const activeHigh = activeItem?.high ?? activeItem?.price ?? null;
  const activeLow = activeItem?.low ?? activeItem?.price ?? null;
  const activeClose = activeItem?.close ?? activeItem?.price ?? null;
  const activeIsBullish = activeOpen !== null && activeClose !== null && activeClose >= activeOpen;
  const activePctChange = activeOpen !== null && activeClose !== null && activeOpen !== 0
    ? ((activeClose - activeOpen) / activeOpen) * 100
    : 0;

  const formatPrice = (val: number | null) => {
    if (val === null) return '—';
    if (val >= 1000) return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (val >= 1) return val.toFixed(2);
    return val.toFixed(4);
  };

  // Generate smooth path for optional subtle MA overlays on candlestick chart
  const createSmoothPath = (points: (number | null)[]) => {
    const validCoords: { x: number; y: number }[] = [];
    points.forEach((val, idx) => {
      if (val !== null && !isNaN(val)) {
        validCoords.push({ x: getX(idx), y: getY(val) });
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

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
    return d;
  };

  return (
    <div className="relative w-full select-none" id="real-price-candlestick-chart">
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
        <svg width="100%" height={height} viewBox={`0 0 ${viewWidth} ${height}`} preserveAspectRatio="none">
          {/* Subtle grid lines for high, mid, low */}
          <line
            x1="0"
            y1={getY(min + range * 0.75)}
            x2={viewWidth}
            y2={getY(min + range * 0.75)}
            stroke="#27272a"
            strokeWidth="1"
            strokeDasharray="3,3"
            className="opacity-40"
          />
          <line
            x1="0"
            y1={getY(min + range * 0.25)}
            x2={viewWidth}
            y2={getY(min + range * 0.25)}
            stroke="#27272a"
            strokeWidth="1"
            strokeDasharray="3,3"
            className="opacity-40"
          />

          {/* Optional Subtle Moving Average Guide Lines */}
          {showMAs && (
            <>
              {/* Slow MA */}
              <path
                d={createSmoothPath(data.map((d) => d.priceMA2))}
                fill="none"
                stroke="#06b6d4"
                strokeWidth="1.2"
                strokeDasharray="2,2"
                className="opacity-40"
              />
              {/* Fast MA */}
              <path
                d={createSmoothPath(data.map((d) => d.priceMA1))}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="1.5"
                className="opacity-60"
              />
            </>
          )}

          {/* CANDLESTICKS RENDERING */}
          <g shapeRendering="crispEdges">
            {data.map((d, i) => {
              const x = getX(i);
              const o = d.open !== undefined ? d.open : d.price;
              const h = d.high !== undefined ? d.high : d.price;
              const l = d.low !== undefined ? d.low : d.price;
              const c = d.close !== undefined ? d.close : d.price;

              const isBull = c >= o;
              const color = isBull ? '#10b981' : '#f43f5e';

              const yHigh = getY(h);
              const yLow = getY(l);
              const yOpen = getY(o);
              const yClose = getY(c);

              const bodyTop = Math.min(yOpen, yClose);
              const bodyHeight = Math.max(1.5, Math.abs(yOpen - yClose));
              const bodyX = x - candleWidth / 2;

              return (
                <g key={`candle-${i}`}>
                  {/* Upper & Lower Wick Line */}
                  <line
                    x1={x}
                    y1={yHigh}
                    x2={x}
                    y2={yLow}
                    stroke={color}
                    strokeWidth="1"
                    className={activeIdx === i ? 'opacity-100' : 'opacity-85'}
                  />

                  {/* Candle Body Rect */}
                  <rect
                    x={bodyX}
                    y={bodyTop}
                    width={candleWidth}
                    height={bodyHeight}
                    fill={color}
                    stroke={color}
                    strokeWidth="0.5"
                    rx={0.5}
                    className={activeIdx === i ? 'opacity-100 stroke-zinc-100' : 'opacity-90'}
                  />
                </g>
              );
            })}
          </g>

          {/* Hover Interactive Crosshair */}
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
                className="opacity-60"
              />

              {/* Close price dot */}
              {activeClose !== null && (
                <circle
                  cx={getX(activeIdx)}
                  cy={getY(activeClose)}
                  r="3.5"
                  fill={activeIsBullish ? '#10b981' : '#f43f5e'}
                  stroke="#09090b"
                  strokeWidth="1.5"
                />
              )}
            </>
          )}
        </svg>
      </svg>

      {/* Floating Hover OHLC Badge with Exact Time */}
      {activeIdx !== null && activeOpen !== null && (
        <div className="absolute top-1 right-1 z-10 bg-zinc-950/95 border border-zinc-800 rounded-md px-2 py-1 text-[9px] font-mono shadow-xl backdrop-blur-sm pointer-events-none flex flex-wrap items-center gap-1.5">
          {activeItem?.timestamp && (
            <span className="text-amber-400 font-bold border-r border-zinc-800 pr-1.5">
              {formatExactTime(activeItem.timestamp, true)}
            </span>
          )}
          <span className="text-zinc-500">O:</span>
          <span className="text-zinc-300 font-semibold">{formatPrice(activeOpen)}</span>
          <span className="text-zinc-500">H:</span>
          <span className="text-zinc-300 font-semibold">{formatPrice(activeHigh)}</span>
          <span className="text-zinc-500">L:</span>
          <span className="text-zinc-300 font-semibold">{formatPrice(activeLow)}</span>
          <span className="text-zinc-500">C:</span>
          <span className={`font-bold ${activeIsBullish ? 'text-emerald-400' : 'text-rose-400'}`}>
            {formatPrice(activeClose)}
          </span>
          <span className={`font-bold text-[8px] px-1 py-0.2 rounded ${
            activeIsBullish ? 'bg-emerald-950/60 text-emerald-300' : 'bg-rose-950/60 text-rose-300'
          }`}>
            {activePctChange >= 0 ? '+' : ''}{activePctChange.toFixed(2)}%
          </span>
        </div>
      )}
    </div>
  );
}
