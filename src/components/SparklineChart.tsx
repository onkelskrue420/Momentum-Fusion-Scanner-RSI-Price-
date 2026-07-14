import { IndicatorData } from '../types';

interface SparklineChartProps {
  data: IndicatorData[];
  type: 'price' | 'rsi';
  height?: number;
  hoveredIndex: number | null;
  onHoverIndex: (index: number | null) => void;
}

export default function SparklineChart({
  data,
  type,
  height = 100,
  hoveredIndex,
  onHoverIndex,
}: SparklineChartProps) {
  if (data.length === 0) return <div className="text-zinc-500 text-xs">No data available</div>;

  const totalPoints = data.length;
  const padding = 8;
  const chartHeight = height - padding * 2;

  // Extract values
  const values = type === 'price' 
    ? data.map(d => d.price) 
    : data.map(d => d.rsi || 50);

  const ma1Values = type === 'price' 
    ? data.map(d => d.priceMA1) 
    : data.map(d => d.rsiMA1);

  const ma2Values = type === 'price' 
    ? data.map(d => d.priceMA2) 
    : data.map(d => d.rsiMA2);

  // Bounds
  let min = 0;
  let max = 100;

  if (type === 'price') {
    // Collect all present values to find min/max
    const allNums = [...values];
    ma1Values.forEach(v => { if (v !== null) allNums.push(v); });
    ma2Values.forEach(v => { if (v !== null) allNums.push(v); });

    const rawMin = Math.min(...allNums);
    const rawMax = Math.max(...allNums);
    const range = rawMax - rawMin;
    min = rawMin - (range * 0.08 || 1);
    max = rawMax + (range * 0.08 || 1);
  } else {
    // RSI is 0 to 100
    min = 0;
    max = 100;
  }

  const range = max - min;

  // Coordinate projection
  const getX = (index: number, width: number) => {
    if (totalPoints <= 1) return 0;
    return (index / (totalPoints - 1)) * width;
  };

  const getY = (val: number) => {
    const ratio = range === 0 ? 0.5 : (val - min) / range;
    return height - padding - ratio * chartHeight;
  };

  // Build SVG Paths
  const createPath = (points: (number | null)[], width: number) => {
    let d = '';
    let started = false;
    for (let i = 0; i < points.length; i++) {
      const val = points[i];
      if (val !== null && !isNaN(val)) {
        const x = getX(i, width);
        const y = getY(val);
        if (!started) {
          d += `M ${x} ${y}`;
          started = true;
        } else {
          d += ` L ${x} ${y}`;
        }
      }
    }
    return d;
  };

  const createAreaPath = (points: (number | null)[], width: number) => {
    let d = createPath(points, width);
    if (!d) return '';
    
    // Connect to the bottom to close the polygon
    const lastValidIdx = points.reduce((acc: number, val, idx) => (val !== null ? idx : acc), 0);
    const firstValidIdx = points.findIndex(val => val !== null);
    
    if (firstValidIdx === -1 || lastValidIdx === -1) return '';
    
    const xLast = getX(lastValidIdx, width);
    const xFirst = getX(firstValidIdx, width);
    const yBottom = height;
    
    d += ` L ${xLast} ${yBottom} L ${xFirst} ${yBottom} Z`;
    return d;
  };

  // Determine colors based on direction of last point
  const isBullish = type === 'price'
    ? values[values.length - 1] > (ma2Values[ma2Values.length - 1] || values[0])
    : (ma1Values[ma1Values.length - 1] || 50) > (ma2Values[ma2Values.length - 1] || 50);

  const mainColor = type === 'price'
    ? (isBullish ? '#10b981' : '#ef4444') // Emerald vs Rose
    : '#8b5cf6'; // Purple for RSI

  return (
    <div className="relative w-full" id={`sparkline-${type}`}>
      <svg
        className="w-full select-none overflow-visible"
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
          <linearGradient id={`gradient-${type}-${isBullish ? 'up' : 'down'}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={mainColor} stopOpacity="0.18" />
            <stop offset="100%" stopColor={mainColor} stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* RSI Threshold Reference Lines */}
        {type === 'rsi' && (
          <>
            {/* Overbought line 70 */}
            <line
              x1="0"
              y1={getY(70)}
              x2="100%"
              y2={getY(70)}
              stroke="#ef4444"
              strokeWidth="1"
              strokeDasharray="3,3"
              className="opacity-40"
            />
            {/* Neutral line 50 */}
            <line
              x1="0"
              y1={getY(50)}
              x2="100%"
              y2={getY(50)}
              stroke="#52525b"
              strokeWidth="1"
              strokeDasharray="4,4"
              className="opacity-55"
            />
            {/* Oversold line 30 */}
            <line
              x1="0"
              y1={getY(30)}
              x2="100%"
              y2={getY(30)}
              stroke="#10b981"
              strokeWidth="1"
              strokeDasharray="3,3"
              className="opacity-40"
            />

            {/* Threshold text labels */}
            <text x="4" y={getY(70) - 4} className="text-[9px] fill-red-400 font-mono opacity-60">70</text>
            <text x="4" y={getY(50) - 4} className="text-[9px] fill-zinc-500 font-mono opacity-60">50</text>
            <text x="4" y={getY(30) + 10} className="text-[9px] fill-emerald-400 font-mono opacity-60">30</text>
          </>
        )}

        {/* Dynamic content rendering using SVG path with responsive parent widths */}
        {/* We use an SVG that scales with its viewBox or container width */}
        <svg width="100%" height={height} viewBox={`0 0 300 ${height}`} preserveAspectRatio="none">
          {/* Subtle area gradient */}
          <path
            d={createAreaPath(values, 300)}
            fill={`url(#gradient-${type}-${isBullish ? 'up' : 'down'})`}
          />

          {/* Slow MA2 Line */}
          <path
            d={createPath(ma2Values, 300)}
            fill="none"
            stroke={type === 'price' ? '#3b82f6' : '#ec4899'} // Blue vs Pink
            strokeWidth="1.2"
            strokeDasharray="2,2"
            className="opacity-75"
          />

          {/* Fast MA1 Line */}
          <path
            d={createPath(ma1Values, 300)}
            fill="none"
            stroke={type === 'price' ? '#f59e0b' : '#3b82f6'} // Amber vs Blue
            strokeWidth="1.2"
            className="opacity-80"
          />

          {/* Main Price/RSI line */}
          <path
            d={createPath(values, 300)}
            fill="none"
            stroke={mainColor}
            strokeWidth="1.8"
          />

          {/* Hover Crosshair Cursor */}
          {hoveredIndex !== null && hoveredIndex < totalPoints && (
            <>
              <line
                x1={getX(hoveredIndex, 300)}
                y1="0"
                x2={getX(hoveredIndex, 300)}
                y2={height}
                stroke="#a1a1aa"
                strokeWidth="1"
                strokeDasharray="2,2"
                className="opacity-60"
              />
              <circle
                cx={getX(hoveredIndex, 300)}
                cy={getY(values[hoveredIndex])}
                r="3.5"
                fill={mainColor}
                stroke="#18181b"
                strokeWidth="1.5"
              />
              {/* Also draw circles for MA if present */}
              {ma1Values[hoveredIndex] !== null && (
                <circle
                  cx={getX(hoveredIndex, 300)}
                  cy={getY(ma1Values[hoveredIndex]!)}
                  r="2.5"
                  fill={type === 'price' ? '#f59e0b' : '#3b82f6'}
                  stroke="#18181b"
                  strokeWidth="1"
                />
              )}
              {ma2Values[hoveredIndex] !== null && (
                <circle
                  cx={getX(hoveredIndex, 300)}
                  cy={getY(ma2Values[hoveredIndex]!)}
                  r="2.5"
                  fill={type === 'price' ? '#3b82f6' : '#ec4899'}
                  stroke="#18181b"
                  strokeWidth="1"
                />
              )}
            </>
          )}
        </svg>
      </svg>

      {/* Floating details overlay on hover */}
      {hoveredIndex !== null && hoveredIndex < totalPoints && (
        <div className="absolute top-1 right-2 bg-zinc-900/90 border border-zinc-800 rounded px-1.5 py-0.5 text-[10px] font-mono text-zinc-300 pointer-events-none flex gap-2 z-10 backdrop-blur-sm shadow-md">
          {type === 'price' ? (
            <>
              <span>Price: <strong className="text-zinc-100">{values[hoveredIndex].toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 5 })}</strong></span>
              {ma1Values[hoveredIndex] !== null && (
                <span className="text-amber-400">MA1: {ma1Values[hoveredIndex]!.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 5 })}</span>
              )}
              {ma2Values[hoveredIndex] !== null && (
                <span className="text-blue-400">MA2: {ma2Values[hoveredIndex]!.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 5 })}</span>
              )}
            </>
          ) : (
            <>
              <span>RSI: <strong className="text-violet-400">{Math.round(values[hoveredIndex])}</strong></span>
              {ma1Values[hoveredIndex] !== null && (
                <span className="text-blue-400">MA1: {Math.round(ma1Values[hoveredIndex]!)}</span>
              )}
              {ma2Values[hoveredIndex] !== null && (
                <span className="text-pink-400">MA2: {Math.round(ma2Values[hoveredIndex]!)}</span>
              )}
            </>
          )}
          <span className="text-zinc-500">{new Date(data[hoveredIndex].timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      )}
    </div>
  );
}
