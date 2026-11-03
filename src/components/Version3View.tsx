import React, { useState, useMemo } from 'react';
import { SetupAnalysis, ScannerConfig, Timeframe, MarketType } from '../types';
import PureMACard from './PureMACard';
import { isMarketCurrentlyLive } from '../utils/timeFormat';
import { 
  Sparkles, 
  Layers, 
  TrendingUp, 
  TrendingDown, 
  Search, 
  Sliders, 
  Zap, 
  Eye, 
  EyeOff,
  Activity,
  Check,
  CandlestickChart as CandlestickChartIcon,
  Columns,
  Rows
} from 'lucide-react';

interface Version3ViewProps {
  setups: SetupAnalysis[];
  config: ScannerConfig;
  onConfigChange: (newConfig: ScannerConfig) => void;
  onSelectSetup: (setup: SetupAnalysis) => void;
  starredSetups: string[];
  onToggleStar: (symbol: string, timeframe: string) => void;
  selectedTimeframes: Timeframe[];
  onTimeframeToggle: (tf: Timeframe) => void;
  selectedMarkets: MarketType[];
  onMarketToggle: (market: MarketType) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export type MAFocusMode = 'both' | 'price' | 'rsi';

export default function Version3View({
  setups,
  config,
  onConfigChange,
  onSelectSetup,
  starredSetups,
  onToggleStar,
  selectedTimeframes,
  onTimeframeToggle,
  selectedMarkets,
  onMarketToggle,
  searchQuery,
  onSearchChange,
}: Version3ViewProps) {
  // 1. Moving Average Focus Mode ('both' | 'price' | 'rsi')
  const [maFocus, setMaFocus] = useState<MAFocusMode>(() => {
    const saved = localStorage.getItem('momentum_v3_ma_focus');
    return (saved === 'both' || saved === 'price' || saved === 'rsi') ? saved : 'both';
  });

  const handleFocusChange = (mode: MAFocusMode) => {
    setMaFocus(mode);
    localStorage.setItem('momentum_v3_ma_focus', mode);
  };

  // 2. Ghost Price/RSI line toggle (default false - pure MA focus)
  const [showGhostLine, setShowGhostLine] = useState<boolean>(false);

  // 3. Real Price Movement with Candlesticks toggle (Third Chart)
  const [showCandlesChart, setShowCandlesChart] = useState<boolean>(() => {
    const saved = localStorage.getItem('momentum_v3_show_candles');
    return saved === 'true';
  });

  const handleToggleCandles = () => {
    const nextVal = !showCandlesChart;
    setShowCandlesChart(nextVal);
    localStorage.setItem('momentum_v3_show_candles', String(nextVal));
  };

  // 4. Charts Layout (side-by-side vs stacked)
  const [chartsLayout, setChartsLayout] = useState<'side-by-side' | 'stacked'>(() => {
    const saved = localStorage.getItem('momentum_v3_charts_layout');
    return (saved === 'side-by-side' || saved === 'stacked') ? saved : 'stacked';
  });

  const handleChartsLayoutChange = (layout: 'side-by-side' | 'stacked') => {
    setChartsLayout(layout);
    localStorage.setItem('momentum_v3_charts_layout', layout);
  };

  // 5. Hide Closed Markets toggle
  const [hideClosedMarkets, setHideClosedMarkets] = useState<boolean>(() => {
    const saved = localStorage.getItem('momentum_v3_hide_closed');
    return saved === 'true';
  });

  const handleToggleHideClosed = () => {
    const nextVal = !hideClosedMarkets;
    setHideClosedMarkets(nextVal);
    localStorage.setItem('momentum_v3_hide_closed', String(nextVal));
  };

  // Count closed / not live markets in current setups
  const closedMarketsCount = useMemo(() => {
    let count = 0;
    for (const s of setups) {
      const pts = s.dataPoints || [];
      const lastTs = pts.length > 0 ? pts[pts.length - 1].timestamp : s.lastUpdated;
      if (!isMarketCurrentlyLive(s.symbol, s.type, lastTs, s.timeframe)) {
        count++;
      }
    }
    return count;
  }, [setups]);

  // 6. MA Alignment / Crossover Filter
  const [alignmentFilter, setAlignmentFilter] = useState<'all' | 'bullish' | 'bearish' | 'crossover' | 'streak'>('all');

  // 4. MA Quick Presets
  const [selectedPresetKey, setSelectedPresetKey] = useState<'9_21_ema' | '20_50_sma' | '50_200_sma' | 'custom'>('9_21_ema');
  const [showCustomConfig, setShowCustomConfig] = useState(false);

  const applyMAPreset = (key: '9_21_ema' | '20_50_sma' | '50_200_sma') => {
    setSelectedPresetKey(key);
    setShowCustomConfig(false);

    if (key === '9_21_ema') {
      onConfigChange({
        ...config,
        priceMA1Type: 'EMA',
        priceMA1Length: 9,
        priceMA2Type: 'EMA',
        priceMA2Length: 21,
        rsiMA1Type: 'EMA',
        rsiMA1Length: 9,
        rsiMA2Type: 'EMA',
        rsiMA2Length: 21,
      });
    } else if (key === '20_50_sma') {
      onConfigChange({
        ...config,
        priceMA1Type: 'SMA',
        priceMA1Length: 20,
        priceMA2Type: 'SMA',
        priceMA2Length: 50,
        rsiMA1Type: 'SMA',
        rsiMA1Length: 14,
        rsiMA2Type: 'SMA',
        rsiMA2Length: 28,
      });
    } else if (key === '50_200_sma') {
      onConfigChange({
        ...config,
        priceMA1Type: 'SMA',
        priceMA1Length: 50,
        priceMA2Type: 'SMA',
        priceMA2Length: 200,
        rsiMA1Type: 'SMA',
        rsiMA1Length: 14,
        rsiMA2Type: 'SMA',
        rsiMA2Length: 28,
      });
    }
  };

  // Filter setups based on search, market, timeframe, and MA alignment
  const filtered = setups.filter((setup) => {
    // 0. Hide Closed / Inactive Markets
    if (hideClosedMarkets) {
      const pts = setup.dataPoints || [];
      const lastTs = pts.length > 0 ? pts[pts.length - 1].timestamp : setup.lastUpdated;
      if (!isMarketCurrentlyLive(setup.symbol, setup.type, lastTs, setup.timeframe)) {
        return false;
      }
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchSym = setup.symbol.toLowerCase().includes(q);
      const matchName = setup.displayName.toLowerCase().includes(q);
      if (!matchSym && !matchName) return false;
    }

    // Market
    if (!selectedMarkets.includes(setup.type)) return false;

    // Timeframe
    if (!selectedTimeframes.includes(setup.timeframe)) return false;

    // MA Alignment Filter
    const latest = setup.dataPoints?.[setup.dataPoints.length - 1];
    const prev = setup.dataPoints?.[setup.dataPoints.length - 2];

    const isPriceBullish = (latest?.priceMA1 ?? 0) >= (latest?.priceMA2 ?? 0);
    const isRsiBullish = (latest?.rsiMA1 ?? 0) >= (latest?.rsiMA2 ?? 0);

    const isBullish = maFocus === 'rsi' ? isRsiBullish : isPriceBullish;

    if (alignmentFilter === 'bullish' && !isBullish) return false;
    if (alignmentFilter === 'bearish' && isBullish) return false;

    if (alignmentFilter === 'crossover') {
      let hasCross = false;
      const pts = setup.dataPoints || [];
      for (let i = pts.length - 1; i >= Math.max(0, pts.length - 4); i--) {
        const p1 = pts[i];
        const p0 = pts[i - 1];
        if (p1 && p0 && p1.priceMA1 && p1.priceMA2 && p0.priceMA1 && p0.priceMA2) {
          if ((p0.priceMA1 - p0.priceMA2) * (p1.priceMA1 - p1.priceMA2) < 0) {
            hasCross = true;
            break;
          }
        }
      }
      if (!hasCross) return false;
    }

    if (alignmentFilter === 'streak') {
      const streak = maFocus === 'rsi' ? (setup.rsiMa1Streak ?? 0) : (setup.priceMa1Streak ?? 0);
      if (streak < 5) return false;
    }

    return true;
  });

  // Calculate live statistics
  const bullishCount = setups.filter(s => {
    const l = s.dataPoints?.[s.dataPoints.length - 1];
    return (l?.priceMA1 ?? 0) >= (l?.priceMA2 ?? 0);
  }).length;
  const bearishCount = setups.length - bullishCount;

  return (
    <div className="space-y-6" id="version-3-engine">
      {/* V3 PURE MOVING AVERAGE CONTROL HEADER */}
      <div className="bg-zinc-950 border border-zinc-800/90 rounded-2xl p-5 shadow-2xl space-y-5">
        
        {/* TOP ROW: FOCUS MODE TOGGLE & GHOST LINE SWITCH */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-zinc-900 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-gradient-to-br from-amber-500 to-amber-700 rounded-lg text-zinc-950 shadow-md">
                <Layers className="h-4 w-4 text-white" />
              </div>
              <h2 className="text-sm font-bold text-zinc-100 font-sans tracking-tight uppercase">
                Version 3: Pure Moving Average Focus
              </h2>
              <span className="text-[10px] font-mono font-extrabold bg-amber-950 border border-amber-500/60 text-amber-300 px-2 py-0.5 rounded-full">
                MA ENGINE
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-light">
              Focuses purely on the curves, ribbons, and alignments of moving averages without noisy price candles.
            </p>
          </div>

          {/* 3-WAY FOCUS SELECTOR: BOTH | PRICE ONLY | RSI ONLY */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-mono text-zinc-500 uppercase tracking-wider hidden sm:inline">
              Focus:
            </span>
            <div className="flex items-center bg-zinc-900 border border-zinc-800 p-1 rounded-xl text-xs font-mono">
              <button
                onClick={() => handleFocusChange('both')}
                className={`px-3 py-1.5 rounded-lg font-bold transition duration-150 flex items-center gap-1.5 ${
                  maFocus === 'both'
                    ? 'bg-amber-500 text-zinc-950 shadow-md'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                }`}
                title="Display both Price MAs and RSI MAs"
              >
                <Layers className="h-3.5 w-3.5" />
                <span>Both MAs</span>
              </button>

              <button
                onClick={() => handleFocusChange('price')}
                className={`px-3 py-1.5 rounded-lg font-bold transition duration-150 flex items-center gap-1.5 ${
                  maFocus === 'price'
                    ? 'bg-amber-500 text-zinc-950 shadow-md'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                }`}
                title="Display Only Price Moving Averages"
              >
                <TrendingUp className="h-3.5 w-3.5" />
                <span>Only Price MAs</span>
              </button>

              <button
                onClick={() => handleFocusChange('rsi')}
                className={`px-3 py-1.5 rounded-lg font-bold transition duration-150 flex items-center gap-1.5 ${
                  maFocus === 'rsi'
                    ? 'bg-amber-500 text-zinc-950 shadow-md'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                }`}
                title="Display Only RSI Moving Averages"
              >
                <Activity className="h-3.5 w-3.5" />
                <span>Only RSI MAs</span>
              </button>
            </div>

            {/* Ghost Price/RSI Line Toggle */}
            <button
              onClick={() => setShowGhostLine(!showGhostLine)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-mono transition flex items-center gap-1.5 ${
                showGhostLine
                  ? 'bg-zinc-800 border-zinc-600 text-zinc-200'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300'
              }`}
              title="Toggle subtle faint background trace of raw Price / RSI"
            >
              {showGhostLine ? <Eye className="h-3.5 w-3.5 text-amber-400" /> : <EyeOff className="h-3.5 w-3.5" />}
              <span>{showGhostLine ? 'Ghost Trace: ON' : 'Ghost Trace: OFF'}</span>
            </button>

            {/* Real Price Candles Chart Toggle (Third Chart) */}
            <button
              onClick={handleToggleCandles}
              className={`px-3 py-1.5 rounded-xl border text-xs font-mono transition flex items-center gap-1.5 ${
                showCandlesChart
                  ? 'bg-emerald-950/80 border-emerald-500/80 text-emerald-300 shadow-md font-bold'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300'
              }`}
              title="Toggle third chart showing real price movement with candles next to the other charts"
            >
              <CandlestickChartIcon className="h-3.5 w-3.5 text-emerald-400" />
              <span>{showCandlesChart ? 'Price Candles: ON' : 'Price Candles: OFF'}</span>
            </button>

            {/* Hide Closed / Not Live Markets Toggle */}
            <button
              onClick={handleToggleHideClosed}
              className={`px-3 py-1.5 rounded-xl border text-xs font-mono transition flex items-center gap-1.5 ${
                hideClosedMarkets
                  ? 'bg-amber-500/20 border-amber-500/80 text-amber-300 shadow-md font-bold'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
              title="Hide markets which are closed or currently not trading live"
            >
              {hideClosedMarkets ? (
                <EyeOff className="h-3.5 w-3.5 text-amber-400" />
              ) : (
                <Eye className="h-3.5 w-3.5 text-zinc-400" />
              )}
              <span>{hideClosedMarkets ? 'Closed Hidden' : 'Hide Closed'}</span>
              {closedMarketsCount > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  hideClosedMarkets ? 'bg-amber-500/30 text-amber-200 font-bold' : 'bg-zinc-800 text-zinc-400'
                }`}>
                  {closedMarketsCount}
                </span>
              )}
            </button>

            {/* Layout Toggle (Side-by-Side vs Stacked) */}
            <button
              onClick={() => handleChartsLayoutChange(chartsLayout === 'side-by-side' ? 'stacked' : 'side-by-side')}
              className="px-2.5 py-1.5 rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-zinc-200 text-xs font-mono transition flex items-center gap-1.5"
              title="Toggle charts layout between side-by-side and stacked"
            >
              {chartsLayout === 'side-by-side' ? (
                <>
                  <Columns className="h-3.5 w-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Side-by-Side</span>
                </>
              ) : (
                <>
                  <Rows className="h-3.5 w-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Stacked</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* MIDDLE ROW: MA PRESETS & ALIGNMENT SCANNER FILTER */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs font-mono">
          
          {/* Preset Selector */}
          <div className="space-y-1.5">
            <span className="text-zinc-400 text-[11px] font-semibold flex items-center gap-1.5">
              <Sliders className="h-3 w-3 text-amber-400" />
              MA Length Combinations:
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => applyMAPreset('9_21_ema')}
                className={`px-2.5 py-1 rounded-lg border transition ${
                  selectedPresetKey === '9_21_ema'
                    ? 'bg-zinc-800 border-amber-500 text-amber-300 font-bold'
                    : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                9/21 EMA (Fast)
              </button>
              <button
                onClick={() => applyMAPreset('20_50_sma')}
                className={`px-2.5 py-1 rounded-lg border transition ${
                  selectedPresetKey === '20_50_sma'
                    ? 'bg-zinc-800 border-amber-500 text-amber-300 font-bold'
                    : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                20/50 SMA (Trend)
              </button>
              <button
                onClick={() => applyMAPreset('50_200_sma')}
                className={`px-2.5 py-1 rounded-lg border transition ${
                  selectedPresetKey === '50_200_sma'
                    ? 'bg-zinc-800 border-amber-500 text-amber-300 font-bold'
                    : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                50/200 SMA (Macro)
              </button>
              <button
                onClick={() => {
                  setSelectedPresetKey('custom');
                  setShowCustomConfig(!showCustomConfig);
                }}
                className={`px-2.5 py-1 rounded-lg border transition ${
                  selectedPresetKey === 'custom'
                    ? 'bg-zinc-800 border-amber-500 text-amber-300 font-bold'
                    : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Custom...
              </button>
            </div>
          </div>

          {/* Alignment & Crossover Filter */}
          <div className="space-y-1.5">
            <span className="text-zinc-400 text-[11px] font-semibold flex items-center gap-1.5">
              <Zap className="h-3 w-3 text-emerald-400" />
              Scan MA Alignment Condition:
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setAlignmentFilter('all')}
                className={`px-2.5 py-1 rounded-lg border transition ${
                  alignmentFilter === 'all'
                    ? 'bg-zinc-800 border-zinc-600 text-zinc-100 font-bold'
                    : 'bg-zinc-900/80 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setAlignmentFilter('bullish')}
                className={`px-2.5 py-1 rounded-lg border transition flex items-center gap-1 ${
                  alignmentFilter === 'bullish'
                    ? 'bg-emerald-950 border-emerald-500 text-emerald-300 font-bold'
                    : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <TrendingUp className="h-3 w-3 text-emerald-400" />
                <span>Bullish (Fast &gt; Slow)</span>
              </button>
              <button
                onClick={() => setAlignmentFilter('bearish')}
                className={`px-2.5 py-1 rounded-lg border transition flex items-center gap-1 ${
                  alignmentFilter === 'bearish'
                    ? 'bg-rose-950 border-rose-500 text-rose-300 font-bold'
                    : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <TrendingDown className="h-3 w-3 text-rose-400" />
                <span>Bearish (Fast &lt; Slow)</span>
              </button>
              <button
                onClick={() => setAlignmentFilter('crossover')}
                className={`px-2.5 py-1 rounded-lg border transition flex items-center gap-1 ${
                  alignmentFilter === 'crossover'
                    ? 'bg-amber-950 border-amber-500 text-amber-300 font-bold'
                    : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Zap className="h-3 w-3 text-amber-400" />
                <span>Fresh Cross (≤3 bars)</span>
              </button>
            </div>
          </div>

          {/* Search Input */}
          <div className="space-y-1.5">
            <span className="text-zinc-400 text-[11px] font-semibold flex items-center gap-1.5">
              <Search className="h-3 w-3 text-violet-400" />
              Filter Asset:
            </span>
            <div className="relative">
              <input
                type="text"
                placeholder="Search BTC, ETH, NVDA, EURUSD..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-amber-500 transition"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute right-2.5 top-1.5 text-zinc-500 hover:text-zinc-300 text-xs"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* CUSTOM MA CONFIGURATION INLINE DRAWER (if Custom is chosen) */}
        {showCustomConfig && (
          <div className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-4 space-y-4 animate-slide-down">
            <div className="flex justify-between items-center border-b border-zinc-800/80 pb-2">
              <h3 className="text-xs font-bold font-mono text-amber-300 uppercase tracking-wider">
                Tune Custom Moving Average Periods & Types
              </h3>
              <span className="text-[10px] text-zinc-500 font-mono">
                Updates indicator parameters dynamically
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono">
              {/* Price Fast MA */}
              <div className="space-y-1.5 bg-zinc-950 p-2.5 rounded-lg border border-zinc-800/60">
                <span className="text-amber-400 font-bold block">Price Fast MA (MA1)</span>
                <div className="flex gap-2">
                  <select
                    value={config.priceMA1Type}
                    onChange={(e) => onConfigChange({ ...config, priceMA1Type: e.target.value as any })}
                    className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-300"
                  >
                    <option value="EMA">EMA</option>
                    <option value="SMA">SMA</option>
                    <option value="WMA">WMA</option>
                  </select>
                  <input
                    type="number"
                    min="3"
                    max="200"
                    value={config.priceMA1Length}
                    onChange={(e) => onConfigChange({ ...config, priceMA1Length: parseInt(e.target.value) || 9 })}
                    className="w-20 bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-300"
                  />
                </div>
              </div>

              {/* Price Slow MA */}
              <div className="space-y-1.5 bg-zinc-950 p-2.5 rounded-lg border border-zinc-800/60">
                <span className="text-cyan-400 font-bold block">Price Slow MA (MA2)</span>
                <div className="flex gap-2">
                  <select
                    value={config.priceMA2Type}
                    onChange={(e) => onConfigChange({ ...config, priceMA2Type: e.target.value as any })}
                    className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-300"
                  >
                    <option value="EMA">EMA</option>
                    <option value="SMA">SMA</option>
                    <option value="WMA">WMA</option>
                  </select>
                  <input
                    type="number"
                    min="5"
                    max="500"
                    value={config.priceMA2Length}
                    onChange={(e) => onConfigChange({ ...config, priceMA2Length: parseInt(e.target.value) || 21 })}
                    className="w-20 bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-300"
                  />
                </div>
              </div>

              {/* RSI Fast MA */}
              <div className="space-y-1.5 bg-zinc-950 p-2.5 rounded-lg border border-zinc-800/60">
                <span className="text-purple-300 font-bold block">RSI Fast MA (MA1)</span>
                <div className="flex gap-2">
                  <select
                    value={config.rsiMA1Type}
                    onChange={(e) => onConfigChange({ ...config, rsiMA1Type: e.target.value as any })}
                    className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-300"
                  >
                    <option value="EMA">EMA</option>
                    <option value="SMA">SMA</option>
                    <option value="WMA">WMA</option>
                  </select>
                  <input
                    type="number"
                    min="3"
                    max="100"
                    value={config.rsiMA1Length}
                    onChange={(e) => onConfigChange({ ...config, rsiMA1Length: parseInt(e.target.value) || 14 })}
                    className="w-20 bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-300"
                  />
                </div>
              </div>

              {/* RSI Slow MA */}
              <div className="space-y-1.5 bg-zinc-950 p-2.5 rounded-lg border border-zinc-800/60">
                <span className="text-rose-400 font-bold block">RSI Slow MA (MA2)</span>
                <div className="flex gap-2">
                  <select
                    value={config.rsiMA2Type}
                    onChange={(e) => onConfigChange({ ...config, rsiMA2Type: e.target.value as any })}
                    className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-300"
                  >
                    <option value="EMA">EMA</option>
                    <option value="SMA">SMA</option>
                    <option value="WMA">WMA</option>
                  </select>
                  <input
                    type="number"
                    min="5"
                    max="200"
                    value={config.rsiMA2Length}
                    onChange={(e) => onConfigChange({ ...config, rsiMA2Length: parseInt(e.target.value) || 28 })}
                    className="w-20 bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-300"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* BOTTOM ROW: TIMEFRAMES & LIVE STATS PILLS */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-zinc-900 text-xs font-mono">
          {/* Quick Timeframes */}
          <div className="flex items-center gap-1">
            <span className="text-zinc-500 text-[11px] mr-1">Timeframe:</span>
            {(['15m', '1h', '4h', '1d', '1wk'] as Timeframe[]).map((tf) => {
              const active = selectedTimeframes.includes(tf);
              return (
                <button
                  key={tf}
                  onClick={() => onTimeframeToggle(tf)}
                  className={`px-2 py-0.5 rounded border transition uppercase font-bold text-[10px] ${
                    active
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {tf}
                </button>
              );
            })}
          </div>

          {/* Quick Stats Pill */}
          <div className="flex items-center gap-2 text-[11px]">
            <span className="text-zinc-400">
              Showing <strong className="text-zinc-100">{filtered.length}</strong> of {setups.length} Setups
              {hideClosedMarkets && closedMarketsCount > 0 && (
                <span className="text-amber-400 font-medium ml-1">
                  ({closedMarketsCount} closed hidden)
                </span>
              )}
            </span>
            <span className="text-zinc-700">•</span>
            <span className="text-emerald-400 font-bold">{bullishCount} Bullish Ribbon</span>
            <span className="text-zinc-700">•</span>
            <span className="text-rose-400 font-bold">{bearishCount} Bearish Ribbon</span>
          </div>
        </div>
      </div>

      {/* GALLERY GRID */}
      {filtered.length === 0 ? (
        <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-12 text-center max-w-lg mx-auto space-y-3 shadow-xl">
          <Activity className="h-8 w-8 text-zinc-600 mx-auto" />
          <h3 className="text-zinc-300 font-bold text-sm">No Setups Matched Current MA Filter</h3>
          <p className="text-xs text-zinc-500 font-light">
            Try switching alignment condition to "All", checking more timeframes, or clearing search.
          </p>
          <button
            onClick={() => {
              setAlignmentFilter('all');
              onSearchChange('');
            }}
            className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-amber-400 border border-zinc-800 rounded-lg text-xs font-mono transition"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className={`grid gap-4 ${
          showCandlesChart && chartsLayout === 'side-by-side'
            ? 'grid-cols-1 lg:grid-cols-2'
            : showCandlesChart
            ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'
            : chartsLayout === 'side-by-side'
            ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'
            : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
        }`}>
          {filtered.map((setup) => (
            <PureMACard
              key={`v3_${setup.symbol}_${setup.timeframe}`}
              setup={setup}
              maFocus={maFocus}
              showGhostLine={showGhostLine}
              showCandlesChart={showCandlesChart}
              globalChartsLayout={chartsLayout}
              config={config}
              onClick={() => onSelectSetup(setup)}
              isStarred={starredSetups.includes(`${setup.symbol}_${setup.timeframe}`)}
              onToggleStar={() => onToggleStar(setup.symbol, setup.timeframe)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
