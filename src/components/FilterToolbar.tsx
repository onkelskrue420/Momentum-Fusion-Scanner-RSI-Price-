import { MarketType, Timeframe } from '../types';
import { Search, SlidersHorizontal, ArrowUpDown, Columns, Rows, Sparkles, Eye, EyeOff } from 'lucide-react';

interface FilterToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedTimeframes: Timeframe[];
  onTimeframeToggle: (tf: Timeframe) => void;
  selectedMarkets: MarketType[];
  onMarketToggle: (market: MarketType) => void;
  minScore: number;
  onMinScoreChange: (score: number) => void;
  directionFilter: 'all' | 'bullish' | 'bearish';
  onDirectionFilterChange: (dir: 'all' | 'bullish' | 'bearish') => void;
  gallerySize: number;
  onGallerySizeChange: (size: number) => void;
  onForceRefresh: () => void;
  isScanning: boolean;
  rsiLength: number;
  onRsiLengthChange: (length: number) => void;
  chartsLayout: 'side-by-side' | 'stacked';
  onChartsLayoutChange: (layout: 'side-by-side' | 'stacked') => void;
  appVersion?: 'v1' | 'v2' | 'v3' | 'v4';
  v2MinPriceStreak?: number;
  onV2MinPriceStreakChange?: (val: number) => void;
  v2PriceStreakDir?: 'any' | 'above' | 'below';
  onV2PriceStreakDirChange?: (dir: 'any' | 'above' | 'below') => void;
  v2MinRsiStreak?: number;
  onV2MinRsiStreakChange?: (val: number) => void;
  v2RsiStreakDir?: 'any' | 'above' | 'below';
  onV2RsiStreakDirChange?: (dir: 'any' | 'above' | 'below') => void;
  hideClosedMarkets?: boolean;
  onHideClosedMarketsChange?: (val: boolean) => void;
  closedMarketsCount?: number;
}

const TIMEFRAMES: { value: Timeframe; label: string }[] = [
  { value: '1m', label: 'M1' },
  { value: '5m', label: 'M5' },
  { value: '15m', label: 'M15' },
  { value: '30m', label: 'M30' },
  { value: '1h', label: 'H1' },
  { value: '4h', label: 'H4' },
  { value: '1d', label: 'D1' },
  { value: '1wk', label: 'W1' },
  { value: '1mo', label: 'MN' },
];

const MARKETS: { value: MarketType; label: string }[] = [
  { value: 'indices', label: 'Indices' },
  { value: 'commodities', label: 'Commodities' },
  { value: 'forex', label: 'Forex' },
  { value: 'crypto', label: 'Crypto' },
];

const GALLERY_SIZES = [4, 6, 9, 12, 16, 20];

export default function FilterToolbar({
  searchQuery,
  onSearchChange,
  selectedTimeframes,
  onTimeframeToggle,
  selectedMarkets,
  onMarketToggle,
  minScore,
  onMinScoreChange,
  directionFilter,
  onDirectionFilterChange,
  gallerySize,
  onGallerySizeChange,
  onForceRefresh,
  isScanning,
  rsiLength,
  onRsiLengthChange,
  chartsLayout,
  onChartsLayoutChange,
  appVersion,
  v2MinPriceStreak = 0,
  onV2MinPriceStreakChange,
  v2PriceStreakDir = 'any',
  onV2PriceStreakDirChange,
  v2MinRsiStreak = 0,
  onV2MinRsiStreakChange,
  v2RsiStreakDir = 'any',
  onV2RsiStreakDirChange,
  hideClosedMarkets = false,
  onHideClosedMarketsChange,
  closedMarketsCount = 0,
}: FilterToolbarProps) {
  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 shadow-xl space-y-4" id="filter-toolbar">
      {/* Search and Quick Parameters */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">
        {/* Search */}
        <div className="lg:col-span-4 relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search instrument (e.g. NAS100, BTCUSD)..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-4 py-2 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-violet-500 font-sans"
          />
        </div>

        {/* Direction Filter */}
        <div className="lg:col-span-3 flex bg-zinc-900 p-0.5 rounded-lg border border-zinc-800">
          <button
            onClick={() => onDirectionFilterChange('all')}
            className={`flex-1 text-center py-1 rounded text-xs transition duration-150 font-medium ${
              directionFilter === 'all'
                ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            All Trend Directions
          </button>
          <button
            onClick={() => onDirectionFilterChange('bullish')}
            className={`flex-1 text-center py-1 rounded text-xs transition duration-150 font-medium ${
              directionFilter === 'bullish'
                ? 'bg-emerald-950/45 text-emerald-400 border border-emerald-900/40 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Bullish Only
          </button>
          <button
            onClick={() => onDirectionFilterChange('bearish')}
            className={`flex-1 text-center py-1 rounded text-xs transition duration-150 font-medium ${
              directionFilter === 'bearish'
                ? 'bg-rose-950/45 text-rose-400 border border-rose-900/40 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Bearish Only
          </button>
        </div>

        {/* Gallery Size & Charts Layout Toggles */}
        <div className="lg:col-span-3 flex flex-wrap lg:flex-nowrap items-center justify-between lg:justify-end gap-3 px-1">
          {/* Charts Layout Switcher */}
          <div className="flex items-center gap-1.5 bg-zinc-900 p-0.5 rounded border border-zinc-800">
            <button
              onClick={() => onChartsLayoutChange('side-by-side')}
              className={`flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono rounded transition duration-150 ${
                chartsLayout === 'side-by-side'
                  ? 'bg-violet-600 text-white font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Side-by-side layout"
            >
              <Columns className="h-3 w-3" />
              <span>Side</span>
            </button>
            <button
              onClick={() => onChartsLayoutChange('stacked')}
              className={`flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono rounded transition duration-150 ${
                chartsLayout === 'stacked'
                  ? 'bg-violet-600 text-white font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Stacked layout (on top of each other)"
            >
              <Rows className="h-3 w-3" />
              <span>Stack</span>
            </button>
          </div>

          {/* Gallery Size */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-zinc-500 font-mono flex items-center gap-1">
              <SlidersHorizontal className="h-3 w-3" />
              Limit:
            </span>
            <div className="flex bg-zinc-900 p-0.5 rounded border border-zinc-800">
              {GALLERY_SIZES.map((size) => (
                <button
                  key={size}
                  onClick={() => onGallerySizeChange(size)}
                  className={`px-1.5 py-0.5 text-[10px] font-mono rounded transition duration-150 ${
                    gallerySize === size
                      ? 'bg-violet-600 text-white'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Dynamic Scan Trigger Button */}
        <div className="lg:col-span-2">
          <button
            onClick={onForceRefresh}
            disabled={isScanning}
            className="w-full bg-violet-600 hover:bg-violet-500 active:bg-violet-700 disabled:bg-violet-950 disabled:text-violet-500 text-zinc-100 font-medium rounded-lg text-xs py-2 transition duration-150 shadow-lg shadow-violet-950/30 flex justify-center items-center gap-1.5"
          >
            {isScanning ? (
              <>
                <svg className="animate-spin h-3.5 w-3.5 text-zinc-100" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Scanning...
              </>
            ) : (
              <>
                <ArrowUpDown className="h-3.5 w-3.5" />
                Scan Markets Now
              </>
            )}
          </button>
        </div>
      </div>

      {/* Multi-Select Toggles */}
      <div className="border-t border-zinc-900/60 pt-3 flex flex-wrap gap-y-4 gap-x-6 items-center">
        {/* Timeframes Scanned */}
        <div className="space-y-1.5">
          <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-zinc-500 block">
            Timeframes Scanned:
          </span>
          <div className="flex flex-wrap gap-1">
            {TIMEFRAMES.map((tf) => {
              const active = selectedTimeframes.includes(tf.value);
              return (
                <button
                  key={tf.value}
                  onClick={() => onTimeframeToggle(tf.value)}
                  className={`px-2.5 py-1 text-xs font-mono rounded border transition duration-150 ${
                    active
                      ? 'bg-zinc-800 text-zinc-100 border-zinc-700 shadow-sm'
                      : 'bg-zinc-900/30 text-zinc-500 border-zinc-900 hover:text-zinc-300 hover:border-zinc-800'
                  }`}
                >
                  {tf.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Market Sectors Scanned */}
        <div className="space-y-1.5">
          <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-zinc-500 block">
            Market Sectors:
          </span>
          <div className="flex flex-wrap gap-1">
            {MARKETS.map((market) => {
              const active = selectedMarkets.includes(market.value);
              return (
                <button
                  key={market.value}
                  onClick={() => onMarketToggle(market.value)}
                  className={`px-2.5 py-1 text-xs rounded border transition duration-150 ${
                    active
                      ? 'bg-zinc-800 text-zinc-100 border-zinc-700 shadow-sm'
                      : 'bg-zinc-900/30 text-zinc-500 border-zinc-900 hover:text-zinc-300 hover:border-zinc-800'
                  }`}
                >
                  {market.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Live Markets Filter: Hide Closed / Inactive Markets */}
        {onHideClosedMarketsChange && (
          <div className="space-y-1.5">
            <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-zinc-500 block">
              Market Session:
            </span>
            <button
              type="button"
              onClick={() => onHideClosedMarketsChange(!hideClosedMarkets)}
              className={`px-3 py-1 text-xs font-mono rounded border transition duration-150 flex items-center gap-1.5 ${
                hideClosedMarkets
                  ? 'bg-amber-500/20 border-amber-500/80 text-amber-300 font-bold shadow-sm'
                  : 'bg-zinc-900/30 text-zinc-400 border-zinc-900 hover:text-zinc-200 hover:border-zinc-800'
              }`}
              title="Hide markets which are closed or currently not trading live"
            >
              {hideClosedMarkets ? (
                <EyeOff className="h-3.5 w-3.5 text-amber-400" />
              ) : (
                <Eye className="h-3.5 w-3.5 text-zinc-400" />
              )}
              <span>{hideClosedMarkets ? 'Closed Hidden' : 'Hide Closed Markets'}</span>
              {closedMarketsCount > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                  hideClosedMarkets ? 'bg-amber-500/30 text-amber-200' : 'bg-zinc-800 text-zinc-400'
                }`}>
                  {closedMarketsCount}
                </span>
              )}
            </button>
          </div>
        )}

        {/* Sliders Container */}
        <div className="flex flex-col sm:flex-row gap-4 items-center flex-grow max-w-xl sm:ml-auto w-full sm:w-auto">
          {/* Score Threshold */}
          <div className="space-y-1 bg-zinc-900/40 border border-zinc-900/80 rounded px-3.5 py-1.5 w-full sm:w-1/2">
            <div className="flex justify-between items-center text-[10px] font-mono">
              <span className="text-zinc-500">Min Overall Score:</span>
              <span className="text-violet-400 font-bold">{minScore}/100</span>
            </div>
            <input
              type="range"
              min="30"
              max="95"
              step="5"
              value={minScore}
              onChange={(e) => onMinScoreChange(parseInt(e.target.value))}
              className="w-full accent-violet-500 h-1 bg-zinc-800 rounded cursor-pointer"
            />
          </div>

          {/* RSI Period Slider */}
          <div className="space-y-1 bg-zinc-900/40 border border-zinc-900/80 rounded px-3.5 py-1.5 w-full sm:w-1/2">
            <div className="flex justify-between items-center text-[10px] font-mono">
              <span className="text-zinc-500">RSI Period (14):</span>
              <span className="text-violet-400 font-bold">{rsiLength}</span>
            </div>
            <input
              type="range"
              min="5"
              max="50"
              step="1"
              value={rsiLength}
              onChange={(e) => onRsiLengthChange(parseInt(e.target.value))}
              className="w-full accent-violet-500 h-1 bg-zinc-800 rounded cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* VERSION 2: MA RESPECT TREND STREAK SCAN OPTIONS */}
      {appVersion === 'v2' && (
        <div className="border-t border-emerald-900/40 bg-emerald-950/15 rounded-xl p-3.5 space-y-3 font-sans">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-400 flex-shrink-0 animate-pulse" />
              <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider font-mono">
                Version 2 Trend Respect Scanner: Moving Average Persistence
              </span>
            </div>
            <span className="text-[10px] text-zinc-500 font-mono">
              Filters setups where Price or RSI has respected the MA for X consecutive time intervals
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Price MA Respect Filter */}
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-3 space-y-2">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-zinc-300 font-semibold flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-amber-400"></span>
                  Price MA Respect Streak:
                </span>
                <span className="text-amber-400 font-bold bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">
                  {v2MinPriceStreak > 0 ? `≥ ${v2MinPriceStreak} candles` : 'Disabled (Any)'}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0"
                  max="30"
                  step="1"
                  value={v2MinPriceStreak}
                  onChange={(e) => onV2MinPriceStreakChange && onV2MinPriceStreakChange(parseInt(e.target.value))}
                  className="flex-grow accent-amber-500 h-1.5 bg-zinc-800 rounded cursor-pointer"
                />

                <select
                  value={v2PriceStreakDir}
                  onChange={(e) => onV2PriceStreakDirChange && onV2PriceStreakDirChange(e.target.value as any)}
                  className="bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1 text-xs text-zinc-300 font-mono focus:outline-none focus:border-amber-500"
                >
                  <option value="any">Either (Above/Below)</option>
                  <option value="above">Above MA ↑</option>
                  <option value="below">Below MA ↓</option>
                </select>
              </div>
            </div>

            {/* RSI MA Respect Filter */}
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-3 space-y-2">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-zinc-300 font-semibold flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-violet-400"></span>
                  RSI MA Respect Streak:
                </span>
                <span className="text-violet-400 font-bold bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">
                  {v2MinRsiStreak > 0 ? `≥ ${v2MinRsiStreak} candles` : 'Disabled (Any)'}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0"
                  max="30"
                  step="1"
                  value={v2MinRsiStreak}
                  onChange={(e) => onV2MinRsiStreakChange && onV2MinRsiStreakChange(parseInt(e.target.value))}
                  className="flex-grow accent-violet-500 h-1.5 bg-zinc-800 rounded cursor-pointer"
                />

                <select
                  value={v2RsiStreakDir}
                  onChange={(e) => onV2RsiStreakDirChange && onV2RsiStreakDirChange(e.target.value as any)}
                  className="bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1 text-xs text-zinc-300 font-mono focus:outline-none focus:border-violet-500"
                >
                  <option value="any">Either (Above/Below)</option>
                  <option value="above">Above MA ↑</option>
                  <option value="below">Below MA ↓</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
