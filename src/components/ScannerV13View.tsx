import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  ScannerV13Config, 
  ScannerV13Result, 
  MarketRegimeStatus, 
  Timeframe, 
  MarketType, 
  Instrument,
  Candle
} from '../types';
import { 
  DEFAULT_SCANNER_V13_CONFIG, 
  getMarketRegimeStatus, 
  scanInstrumentV13, 
  evaluateCandlesV13 
} from '../lib/scannerV13';
import { runScannerV13Tests } from '../lib/scannerV13.test';
import { INSTRUMENTS, getMarketData } from '../lib/marketData';
import { isMarketCurrentlyLive } from '../utils/timeFormat';
import { 
  Search, 
  RotateCw, 
  Filter, 
  Sliders, 
  TrendingUp, 
  TrendingDown, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  Download, 
  Zap, 
  ExternalLink, 
  Activity, 
  Target, 
  BarChart3, 
  Layers, 
  X,
  Play,
  Crosshair,
  Gauge,
  CheckCircle,
  HelpCircle,
  Eye,
  EyeOff,
  ShieldAlert,
  ArrowDownRight,
  ArrowUpRight
} from 'lucide-react';

interface ScannerV13ViewProps {
  onSelectSetup?: (setup: any) => void;
}

export default function ScannerV13View({ onSelectSetup }: ScannerV13ViewProps) {
  // Config state
  const [config, setConfig] = useState<ScannerV13Config>(() => {
    const saved = localStorage.getItem('scanner_v13_config');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return DEFAULT_SCANNER_V13_CONFIG;
  });

  useEffect(() => {
    localStorage.setItem('scanner_v13_config', JSON.stringify(config));
  }, [config]);

  // Standard timeframes available for multi-timeframe simultaneous scanning
  const ALL_SCAN_TIMEFRAMES: Timeframe[] = ['1m', '5m', '15m', '30m', '1h', '4h', '1d'];

  // Scan parameters state
  const [timeframeMode, setTimeframeMode] = useState<'all' | 'single'>('all'); // Default to 'all' so users scan all timeframes at once
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>('1h');
  const [resultsTimeframeFilter, setResultsTimeframeFilter] = useState<string>('all');
  const [confluenceOnlyFilter, setConfluenceOnlyFilter] = useState<boolean>(false);
  const [selectedMarket, setSelectedMarket] = useState<string>('all');
  const [customSymbols, setCustomSymbols] = useState<string>('');
  const [scanScope, setScanScope] = useState<'watchlist' | 'single'>('watchlist');
  const [singleSymbol, setSingleSymbol] = useState<string>('BTCUSD');

  // Scanner results & status
  const [results, setResults] = useState<ScannerV13Result[]>([]);
  const [marketRegime, setMarketRegime] = useState<MarketRegimeStatus | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState<{ current: number; total: number; symbol: string }>({ current: 0, total: 0, symbol: '' });
  const [lastScannedAt, setLastScannedAt] = useState<number | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  // Filters state
  const [directionFilter, setDirectionFilter] = useState<'all' | 'actionable' | 'buy' | 'sell'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [minConfidence, setMinConfidence] = useState(0);

  // Live markets filter (hide closed / not live markets)
  const [hideClosedMarkets, setHideClosedMarkets] = useState<boolean>(() => {
    const saved = localStorage.getItem('momentum_v13_hide_closed');
    return saved === 'true';
  });

  useEffect(() => {
    localStorage.setItem('momentum_v13_hide_closed', String(hideClosedMarkets));
  }, [hideClosedMarkets]);

  // Active modal/inspected chart
  const [inspectedResult, setInspectedResult] = useState<ScannerV13Result | null>(null);
  const [showConfigDrawer, setShowConfigDrawer] = useState(false);
  const [showTestsModal, setShowTestsModal] = useState(false);
  const [testResults, setTestResults] = useState<{ name: string; passed: boolean; message: string }[]>([]);

  // Safe formatting helpers
  const formatP = (v: number | null | undefined, digits = 2) => {
    if (v === null || v === undefined || isNaN(v)) return '—';
    if (v >= 1000) return v.toFixed(2);
    if (v >= 1) return v.toFixed(digits);
    return v.toFixed(4);
  };

  const formatNum = (v: number | null | undefined, digits = 1, fallback = '—') => {
    if (v === null || v === undefined || isNaN(v)) return fallback;
    return v.toFixed(digits);
  };

  // Fetch initial Market Regime
  const refreshMarketRegime = useCallback(async () => {
    try {
      const regime = await getMarketRegimeStatus();
      setMarketRegime(regime);
    } catch (e: any) {
      console.warn('Failed to fetch market regime status:', e);
    }
  }, []);

  useEffect(() => {
    refreshMarketRegime();
  }, [refreshMarketRegime]);

  // Target instruments list based on selectedMarket or customSymbols
  const targetInstruments = useMemo<Instrument[]>(() => {
    if (customSymbols.trim()) {
      const symbols = customSymbols.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
      return symbols.map(sym => {
        const found = INSTRUMENTS.find(i => i.symbol === sym);
        if (found) return found;
        return {
          symbol: sym,
          displayName: sym,
          yahooSymbol: sym,
          type: 'stocks' as MarketType
        };
      });
    }

    if (selectedMarket === 'all') return INSTRUMENTS;
    return INSTRUMENTS.filter(i => i.type === selectedMarket);
  }, [selectedMarket, customSymbols]);

  // Master Scan Runner - Supports scanning all timeframes simultaneously or a single timeframe
  const runScan = useCallback(async (forceRefresh = false, overrideTimeframeMode?: 'all' | 'single') => {
    setIsScanning(true);
    setScanError(null);

    try {
      // 1. Refresh market regime first
      const regime = await getMarketRegimeStatus();
      setMarketRegime(regime);

      // 2. Determine target list & timeframe scope
      const currentTfMode = overrideTimeframeMode || timeframeMode;
      const instrumentsToScan = scanScope === 'single'
        ? targetInstruments.filter(i => i.symbol === singleSymbol).length > 0
          ? targetInstruments.filter(i => i.symbol === singleSymbol)
          : [{ symbol: singleSymbol, displayName: singleSymbol, yahooSymbol: singleSymbol, type: 'crypto' as MarketType }]
        : targetInstruments;

      const activeTimeframes: Timeframe[] = currentTfMode === 'all'
        ? ALL_SCAN_TIMEFRAMES
        : [selectedTimeframe];

      const totalTasks = instrumentsToScan.length * activeTimeframes.length;
      setScanProgress({
        current: 0,
        total: totalTasks,
        symbol: `${instrumentsToScan[0]?.symbol || ''} (${activeTimeframes.join(', ')})`
      });

      // 3. Try high-performance backend API with concurrent Node worker pool
      try {
        const response = await fetch('/api/v13/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            timeframes: activeTimeframes,
            symbols: instrumentsToScan.map(i => i.symbol),
            config,
            forceRefresh
          })
        });

        if (response.ok) {
          const data = await response.json();
          if (data?.success && Array.isArray(data?.results)) {
            setResults(data.results);
            setLastScannedAt(Date.now());
            setIsScanning(false);
            return;
          }
        }
      } catch (backendErr: any) {
        console.warn('[V1.3 SCANNER] Backend scan API unavailable, falling back to client-side runner:', backendErr?.message);
      }

      // 4. Fallback client-side execution if backend is unreachable
      const newResults: ScannerV13Result[] = [];
      let completed = 0;

      for (const tf of activeTimeframes) {
        for (let i = 0; i < instrumentsToScan.length; i++) {
          const inst = instrumentsToScan[i];
          completed++;
          setScanProgress({ current: completed, total: totalTasks, symbol: `${inst.symbol} [${tf}]` });

          try {
            const res = await scanInstrumentV13(inst, tf, config, regime, forceRefresh);
            newResults.push(res);
          } catch (err: any) {
            console.warn(`[V1.3 SCANNER] Warning scanning ${inst.symbol} on ${tf}:`, err.message);
          }

          if (instrumentsToScan.length > 5) {
            await new Promise(r => setTimeout(r, 40));
          }
        }
      }

      // Sort: BUYs first, then SELLs, then highest confidence NEUTRALs
      newResults.sort((a, b) => {
        if (a.signal !== 'NEUTRAL' && b.signal === 'NEUTRAL') return -1;
        if (a.signal === 'NEUTRAL' && b.signal !== 'NEUTRAL') return 1;
        return b.confidenceScore - a.confidenceScore;
      });

      setResults(newResults);
      setLastScannedAt(Date.now());
    } catch (err: any) {
      setScanError(err.message || 'An error occurred during scanning.');
    } finally {
      setIsScanning(false);
    }
  }, [scanScope, singleSymbol, targetInstruments, timeframeMode, selectedTimeframe, config, ALL_SCAN_TIMEFRAMES]);

  // Handler to scan all timeframes simultaneously with a single click
  const handleScanAllTimeframes = useCallback(() => {
    setTimeframeMode('all');
    setResultsTimeframeFilter('all');
    runScan(true, 'all');
  }, [runScan]);

  // Auto-scan on mount if empty
  useEffect(() => {
    if (results.length === 0 && !isScanning) {
      runScan(false);
    }
  }, []);

  // Multi-Timeframe Confluence Map: Detect symbols aligning on 2+ timeframes
  const confluenceMap = useMemo(() => {
    const map: Record<string, { buys: Timeframe[]; sells: Timeframe[]; maxSignals: number }> = {};
    for (const r of results) {
      if (!map[r.symbol]) {
        map[r.symbol] = { buys: [], sells: [], maxSignals: 0 };
      }
      if (r.signal === 'BUY') {
        map[r.symbol].buys.push(r.timeframe);
      } else if (r.signal === 'SELL') {
        map[r.symbol].sells.push(r.timeframe);
      }
      map[r.symbol].maxSignals = Math.max(map[r.symbol].buys.length, map[r.symbol].sells.length);
    }
    return map;
  }, [results]);

  // Count closed / not live markets in current results
  const closedMarketsCount = useMemo(() => {
    let count = 0;
    for (const r of results) {
      if (!isMarketCurrentlyLive(r.symbol, r.marketType, r.timestamp, r.timeframe)) {
        count++;
      }
    }
    return count;
  }, [results]);

  // Filtered results
  const filteredResults = useMemo(() => {
    return results.filter(item => {
      // Hide closed / not live markets filter
      if (hideClosedMarkets && !isMarketCurrentlyLive(item.symbol, item.marketType, item.timestamp, item.timeframe)) {
        return false;
      }

      // Timeframe filter in results table
      if (resultsTimeframeFilter !== 'all' && item.timeframe !== resultsTimeframeFilter) {
        return false;
      }

      // Multi-TF Confluence filter
      if (confluenceOnlyFilter) {
        const conf = confluenceMap[item.symbol];
        if (!conf || conf.maxSignals < 2) return false;
      }

      // Direction filter
      if (directionFilter === 'actionable' && item.signal === 'NEUTRAL') return false;
      if (directionFilter === 'buy' && item.signal !== 'BUY') return false;
      if (directionFilter === 'sell' && item.signal !== 'SELL') return false;

      // Confidence filter
      if (item.confidenceScore < minConfidence) return false;

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return item.symbol.toLowerCase().includes(q) || item.displayName.toLowerCase().includes(q);
      }

      return true;
    });
  }, [results, hideClosedMarkets, resultsTimeframeFilter, confluenceOnlyFilter, confluenceMap, directionFilter, minConfidence, searchQuery]);

  // Aggregated summary metrics
  const stats = useMemo(() => {
    const buys = results.filter(r => r.signal === 'BUY').length;
    const sells = results.filter(r => r.signal === 'SELL').length;
    const neutrals = results.filter(r => r.signal === 'NEUTRAL').length;
    const confluenceEntries = Object.values(confluenceMap) as Array<{ buys: Timeframe[]; sells: Timeframe[]; maxSignals: number }>;
    const confluenceCount = confluenceEntries.filter(c => c.maxSignals >= 2).length;
    const avgConfidence = results.length > 0 
      ? results.reduce((acc, r) => acc + r.confidenceScore, 0) / results.length 
      : 0;

    return { total: results.length, buys, sells, neutrals, confluenceCount, avgConfidence };
  }, [results, confluenceMap]);

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredResults.length === 0) return;
    const headers = [
      'Symbol',
      'Signal',
      'Timeframe',
      'Price',
      'Fast MA',
      'Slow MA',
      'RSI',
      'Distance to MA %',
      'ATR(14)',
      'Suggested Stop',
      'Stop Dist %',
      '1:1 TP',
      'Confidence %',
      'Reason',
      'Timestamp'
    ];

    const rows = filteredResults.map(r => [
      r.symbol,
      r.signal,
      r.timeframe,
      r.price,
      r.fastMA.toFixed(4),
      r.slowMA.toFixed(4),
      r.rsi.toFixed(2),
      r.distanceToFastMaPct.toFixed(2) + '%',
      r.atr14.toFixed(4),
      r.suggestedStop.toFixed(4),
      r.stopDistancePct.toFixed(2) + '%',
      r.suggestedTakeProfit1to1.toFixed(4),
      r.confidenceScore,
      `"${r.reason.replace(/"/g, '""')}"`,
      new Date(r.timestamp).toISOString()
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const tfLabel = timeframeMode === 'all' ? 'all_timeframes' : selectedTimeframe;
    link.setAttribute('download', `scanner_v1.3_${tfLabel}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Run Test Suite
  const handleRunTests = () => {
    const res = runScannerV13Tests();
    setTestResults(res);
    setShowTestsModal(true);
  };

  return (
    <div className="space-y-6 font-sans text-zinc-100 pb-16">
      {/* HEADER SECTION */}
      <div className="bg-zinc-950/90 border border-zinc-800/80 rounded-3xl p-6 shadow-xl relative overflow-hidden backdrop-blur-md">
        {/* Subtle accent gradient behind header */}
        <div className="absolute top-0 right-0 w-96 h-48 bg-gradient-to-bl from-blue-600/10 via-emerald-600/5 to-transparent blur-2xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-2.5 py-1 rounded-lg bg-blue-950/80 border border-blue-500/40 text-blue-300 text-xs font-mono font-extrabold flex items-center gap-1.5 shadow-sm">
                <Target className="h-3.5 w-3.5 text-blue-400" />
                SCANNER V1.3
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-bold">
                RESEARCH-BACKED PARAMETERS
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs font-mono">
                RSI Shifted 40/60 &bull; 50/200 MA Respect &bull; 2×ATR Stop
              </span>
            </div>

            <h1 className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-2 font-sans">
              Moving Average Respect & RSI Pullback Scanner
            </h1>
            <p className="text-xs md:text-sm text-zinc-400 max-w-3xl leading-relaxed">
              Scans charts for symbols where price respects the fast MA (50 EMA/SMA) and RSI is oversold in an uptrend (<strong className="text-emerald-400">RSI &lt; 40 turning UP</strong> above 200 MA) or overbought in a downtrend (<strong className="text-rose-400">RSI &gt; 60 turning DOWN</strong> below 200 MA), protected by <strong className="text-amber-400">2×ATR(14)</strong> trailing stops.
            </p>
          </div>

          {/* Action Buttons & Tests */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleRunTests}
              className="px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700/80 text-zinc-300 text-xs font-mono font-semibold hover:bg-zinc-800 hover:text-white transition flex items-center gap-1.5 shadow-sm"
              title="Run unit tests & verify research parameters math"
            >
              <CheckCircle className="h-4 w-4 text-emerald-400" />
              <span>Test Suite</span>
            </button>

            <button
              type="button"
              onClick={() => setShowConfigDrawer(!showConfigDrawer)}
              className={`px-3.5 py-2 rounded-xl border text-xs font-mono font-semibold transition flex items-center gap-2 shadow-sm ${
                showConfigDrawer 
                  ? 'bg-blue-600 border-blue-500 text-white' 
                  : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
              }`}
            >
              <Sliders className="h-4 w-4 text-blue-400" />
              <span>Parameters</span>
            </button>

            {/* SCAN ALL TIMEFRAMES BUTTON */}
            <button
              type="button"
              onClick={handleScanAllTimeframes}
              disabled={isScanning}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 via-indigo-600 to-blue-600 hover:from-amber-500 hover:to-blue-500 text-white text-xs font-mono font-extrabold flex items-center gap-2 shadow-lg shadow-amber-950/30 transition disabled:opacity-50"
              title="Scan all 7 standard timeframes (1m, 5m, 15m, 30m, 1h, 4h, 1d) simultaneously"
            >
              <Zap className={`h-4 w-4 text-amber-300 ${isScanning && timeframeMode === 'all' ? 'animate-bounce' : ''}`} />
              <span>{isScanning && timeframeMode === 'all' ? 'Scanning All TFs...' : 'Scan All Timeframes'}</span>
            </button>

            {/* SCAN CURRENT SELECTION BUTTON */}
            <button
              type="button"
              onClick={() => runScan(true)}
              disabled={isScanning}
              className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white text-xs font-mono font-bold flex items-center gap-2 shadow-sm transition disabled:opacity-50"
              title={timeframeMode === 'all' ? 'Rescan all timeframes' : `Scan ${selectedTimeframe} timeframe`}
            >
              <RotateCw className={`h-4 w-4 ${isScanning && timeframeMode !== 'all' ? 'animate-spin' : ''}`} />
              <span>{isScanning && timeframeMode !== 'all' ? 'Scanning...' : timeframeMode === 'all' ? 'Rescan' : `Scan ${selectedTimeframe}`}</span>
            </button>
          </div>
        </div>

        {/* MARKET REGIME STATUS BAR (SPY > 200 MA and VIX < 30) */}
        {marketRegime && (
          <div className="mt-5 pt-4 border-t border-zinc-900/90 flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800">
                <Gauge className="h-3.5 w-3.5 text-blue-400" />
                <span className="text-zinc-400">Market Regime:</span>
                <span className="text-white font-bold">{marketRegime.summary}</span>
              </div>

              <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800">
                <span className="text-zinc-500">SPY:</span>
                <strong className={marketRegime.spyPrice >= marketRegime.spy200Ma ? 'text-emerald-400' : 'text-rose-400'}>
                  ${marketRegime.spyPrice.toFixed(2)}
                </strong>
                <span className="text-zinc-600">vs 200MA:</span>
                <span className="text-zinc-300">${marketRegime.spy200Ma.toFixed(2)}</span>
              </div>

              <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800">
                <span className="text-zinc-500">VIX:</span>
                <strong className={marketRegime.vixSafe ? 'text-emerald-400' : 'text-rose-400'}>
                  {marketRegime.vixLevel.toFixed(2)}
                </strong>
                <span className="text-zinc-500">({marketRegime.vixSafe ? '< 30 Safe' : '>= 30 High Volatility'})</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border flex items-center gap-1 ${
                marketRegime.regimeApprovedForBuys 
                  ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300' 
                  : 'bg-amber-950/60 border-amber-500/40 text-amber-300'
              }`}>
                {marketRegime.regimeApprovedForBuys ? <CheckCircle2 className="h-3 w-3 text-emerald-400" /> : <AlertTriangle className="h-3 w-3 text-amber-400" />}
                {marketRegime.regimeApprovedForBuys ? 'LONGS PERMITTED' : 'LONGS RESTRICTED'}
              </span>

              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border flex items-center gap-1 ${
                marketRegime.regimeApprovedForSells 
                  ? 'bg-rose-950/60 border-rose-500/40 text-rose-300' 
                  : 'bg-zinc-900 border-zinc-800 text-zinc-500'
              }`}>
                {marketRegime.regimeApprovedForSells ? <TrendingDown className="h-3 w-3 text-rose-400" /> : null}
                {marketRegime.regimeApprovedForSells ? 'SHORTS PERMITTED' : 'SHORTS INACTIVE'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* PARAMETERS DRAWER (COLLAPSIBLE) */}
      {showConfigDrawer && (
        <div className="bg-zinc-950/95 border border-blue-900/60 rounded-3xl p-6 shadow-2xl font-mono text-xs space-y-5 animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <Sliders className="h-4 w-4 text-blue-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Scanner v1.3 Research Parameters
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setConfig(DEFAULT_SCANNER_V13_CONFIG)}
              className="text-[11px] text-blue-400 hover:text-blue-300 underline"
            >
              Reset to Research Defaults
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* MA Type & Periods */}
            <div className="space-y-3 bg-zinc-900/80 p-4 rounded-2xl border border-zinc-800">
              <h4 className="text-zinc-300 font-bold uppercase text-[11px] flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-blue-400" /> Moving Averages
              </h4>
              
              <div>
                <label className="text-[10px] text-zinc-400 block mb-1">MA Type</label>
                <div className="grid grid-cols-2 gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setConfig(c => ({ ...c, maType: 'EMA' }))}
                    className={`py-1 rounded-lg font-bold text-xs ${config.maType === 'EMA' ? 'bg-blue-600 text-white' : 'text-zinc-400'}`}
                  >
                    EMA
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfig(c => ({ ...c, maType: 'SMA' }))}
                    className={`py-1 rounded-lg font-bold text-xs ${config.maType === 'SMA' ? 'bg-blue-600 text-white' : 'text-zinc-400'}`}
                  >
                    SMA
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Fast MA (Respect)</label>
                  <input
                    type="number"
                    min="5"
                    max="100"
                    value={config.fastPeriod}
                    onChange={e => setConfig(c => ({ ...c, fastPeriod: Math.max(5, Number(e.target.value)) }))}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-white text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Slow MA (Trend)</label>
                  <input
                    type="number"
                    min="50"
                    max="500"
                    value={config.slowPeriod}
                    onChange={e => setConfig(c => ({ ...c, slowPeriod: Math.max(50, Number(e.target.value)) }))}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-white text-xs font-bold"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[10px] mb-1">
                  <span className="text-zinc-400">MA Tolerance Band:</span>
                  <strong className="text-blue-400">{config.maTolerancePct}%</strong>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="2.0"
                  step="0.1"
                  value={config.maTolerancePct}
                  onChange={e => setConfig(c => ({ ...c, maTolerancePct: Number(e.target.value) }))}
                  className="w-full accent-blue-500 cursor-pointer"
                />
              </div>
            </div>

            {/* RSI Thresholds */}
            <div className="space-y-3 bg-zinc-900/80 p-4 rounded-2xl border border-zinc-800">
              <h4 className="text-zinc-300 font-bold uppercase text-[11px] flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5 text-emerald-400" /> RSI Shifted Ranges
              </h4>

              <div>
                <label className="text-[10px] text-zinc-400 block mb-1">RSI Period</label>
                <input
                  type="number"
                  min="2"
                  max="50"
                  value={config.rsiPeriod}
                  onChange={e => setConfig(c => ({ ...c, rsiPeriod: Math.max(2, Number(e.target.value)) }))}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-white text-xs font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Oversold BUY (&lt;)</label>
                  <input
                    type="number"
                    min="10"
                    max="50"
                    value={config.rsiOversoldBuy}
                    onChange={e => setConfig(c => ({ ...c, rsiOversoldBuy: Number(e.target.value) }))}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-emerald-400 font-bold"
                  />
                  <span className="text-[9px] text-zinc-500 block mt-0.5">Default: 40 in trend</span>
                </div>
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Overbought SELL (&gt;)</label>
                  <input
                    type="number"
                    min="50"
                    max="90"
                    value={config.rsiOverboughtSell}
                    onChange={e => setConfig(c => ({ ...c, rsiOverboughtSell: Number(e.target.value) }))}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-rose-400 font-bold"
                  />
                  <span className="text-[9px] text-zinc-500 block mt-0.5">Default: 60 in trend</span>
                </div>
              </div>
            </div>

            {/* Risk & Strong Trend Toggles */}
            <div className="space-y-3 bg-zinc-900/80 p-4 rounded-2xl border border-zinc-800">
              <h4 className="text-zinc-300 font-bold uppercase text-[11px] flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-amber-400" /> Filter Toggles
              </h4>

              <label className="flex items-center justify-between p-2 rounded-xl bg-zinc-950 border border-zinc-800/80 cursor-pointer hover:border-zinc-700">
                <span className="text-zinc-300">SPY/VIX Market Regime</span>
                <input
                  type="checkbox"
                  checked={config.enableMarketRegime}
                  onChange={e => setConfig(c => ({ ...c, enableMarketRegime: e.target.checked }))}
                  className="rounded text-blue-600 focus:ring-0 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-2 rounded-xl bg-zinc-950 border border-zinc-800/80 cursor-pointer hover:border-zinc-700">
                <span className="text-zinc-300">Strong Trend (50 &gt; 200)</span>
                <input
                  type="checkbox"
                  checked={config.requireStrongTrend}
                  onChange={e => setConfig(c => ({ ...c, requireStrongTrend: e.target.checked }))}
                  className="rounded text-blue-600 focus:ring-0 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-2 rounded-xl bg-zinc-950 border border-zinc-800/80 cursor-pointer hover:border-zinc-700">
                <span className="text-zinc-300">Connors RSI(2) Pullback</span>
                <input
                  type="checkbox"
                  checked={config.enableConnorsRsi}
                  onChange={e => setConfig(c => ({ ...c, enableConnorsRsi: e.target.checked }))}
                  className="rounded text-blue-600 focus:ring-0 cursor-pointer"
                />
              </label>
            </div>

            {/* Quick Research Note */}
            <div className="bg-zinc-900/80 p-4 rounded-2xl border border-zinc-800 space-y-2 text-[11px] text-zinc-400">
              <h4 className="text-zinc-300 font-bold uppercase text-[11px] flex items-center gap-1.5">
                <HelpCircle className="h-3.5 w-3.5 text-blue-400" /> Why 40/60 RSI?
              </h4>
              <p className="leading-relaxed">
                Academic research (Cardwell, Brown) shows RSI does <em>not</em> oscillate between 30 and 70 during persistent trends.
              </p>
              <p className="leading-relaxed text-zinc-300">
                • In an uptrend, RSI finds support around <strong className="text-emerald-400">40</strong> and peaks near 80.<br />
                • In a downtrend, RSI encounters resistance at <strong className="text-rose-400">60</strong> and bottoms near 20.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SCANNER CONTROL BAR: TIMEFRAMES, MARKETS, WATCHLIST, AND EXECUTION */}
      <div className="bg-zinc-950 border border-zinc-800/90 rounded-2xl p-4 shadow-lg flex flex-col xl:flex-row xl:items-center justify-between gap-4 font-mono text-xs">
        {/* Left: Timeframe Pills & Markets */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Timeframes: ALL Timeframes (Simultaneous) and Individual Selectors */}
          <div className="flex items-center bg-zinc-900 p-1 rounded-xl border border-zinc-800">
            <button
              type="button"
              onClick={() => {
                setTimeframeMode('all');
                setResultsTimeframeFilter('all');
                runScan(false, 'all');
              }}
              className={`px-3 py-1 rounded-lg font-bold text-xs transition flex items-center gap-1.5 ${
                timeframeMode === 'all'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
              }`}
              title="Scan all 7 standard timeframes (1m, 5m, 15m, 30m, 1h, 4h, 1d) simultaneously"
            >
              <Zap className="h-3 w-3 text-amber-300" />
              <span>ALL TIMEFRAMES</span>
            </button>

            <div className="h-4 w-px bg-zinc-800 mx-1" />

            {ALL_SCAN_TIMEFRAMES.map(tf => (
              <button
                key={tf}
                type="button"
                onClick={() => {
                  setTimeframeMode('single');
                  setSelectedTimeframe(tf);
                  setResultsTimeframeFilter('all');
                }}
                className={`px-2.5 py-1 rounded-lg font-bold text-xs transition ${
                  timeframeMode === 'single' && selectedTimeframe === tf
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Market Category Selector */}
          <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-xl border border-zinc-800">
            {[
              { id: 'all', label: 'All' },
              { id: 'crypto', label: 'Crypto' },
              { id: 'stocks', label: 'Equities' },
              { id: 'indices', label: 'Indices' },
              { id: 'forex', label: 'Forex' },
              { id: 'commodities', label: 'Metals' },
            ].map(m => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  setSelectedMarket(m.id);
                  setCustomSymbols('');
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                  selectedMarket === m.id && !customSymbols
                    ? 'bg-zinc-800 text-zinc-100 font-bold border border-zinc-700/60'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Scan Scope Toggle: Whole Watchlist vs Single Symbol */}
          <div className="flex items-center bg-zinc-900 p-1 rounded-xl border border-zinc-800">
            <button
              type="button"
              onClick={() => setScanScope('watchlist')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                scanScope === 'watchlist' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              All Watchlist
            </button>
            <button
              type="button"
              onClick={() => setScanScope('single')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                scanScope === 'single' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Single Symbol
            </button>
          </div>

          {scanScope === 'single' && (
            <select
              value={singleSymbol}
              onChange={e => setSingleSymbol(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white font-bold text-xs"
            >
              {INSTRUMENTS.map(i => (
                <option key={i.symbol} value={i.symbol}>
                  {i.symbol} - {i.displayName}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Right: Custom Symbols Input & Quick CSV Export */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Custom symbols: AAPL, BTCUSD, EURUSD..."
              value={customSymbols}
              onChange={e => setCustomSymbols(e.target.value)}
              className="w-64 px-3 py-1.5 pl-8 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs placeholder:text-zinc-600 focus:outline-none focus:border-blue-500"
            />
            <Search className="h-3.5 w-3.5 text-zinc-500 absolute left-2.5 top-2.5" />
          </div>

          <button
            type="button"
            onClick={handleExportCSV}
            disabled={filteredResults.length === 0}
            className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-bold flex items-center gap-1.5 transition disabled:opacity-40"
            title="Export filtered scan results to CSV"
          >
            <Download className="h-3.5 w-3.5 text-emerald-400" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* ACTIVE SCAN PROGRESS BAR */}
      {isScanning && (
        <div className="bg-blue-950/40 border border-blue-900/60 rounded-2xl p-4 text-xs font-mono space-y-2">
          <div className="flex items-center justify-between text-blue-300">
            <span className="flex items-center gap-2">
              <RotateCw className="h-3.5 w-3.5 animate-spin text-blue-400" />
              Scanning <strong>{scanProgress.symbol}</strong> ({timeframeMode === 'all' ? 'All Timeframes' : selectedTimeframe})...
            </span>
            <span className="font-bold">
              {scanProgress.current} / {scanProgress.total} checks
            </span>
          </div>
          <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-150"
              style={{
                width: `${scanProgress.total > 0 ? (scanProgress.current / scanProgress.total) * 100 : 0}%`
              }}
            />
          </div>
        </div>
      )}

      {/* METRICS & QUICK SUMMARY CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 font-mono">
        <div className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-3.5">
          <span className="text-[10px] text-zinc-500 uppercase block">Total Scanned</span>
          <strong className="text-lg text-white font-bold">{stats.total}</strong>
          <span className="text-[10px] text-zinc-500 block">
            {timeframeMode === 'all' ? '7 Timeframes (1m-1d)' : `${selectedTimeframe} closes`}
          </span>
        </div>

        <div className="bg-zinc-950 border border-emerald-900/40 rounded-2xl p-3.5">
          <span className="text-[10px] text-emerald-400 uppercase block flex items-center gap-1">
            <TrendingUp className="h-3 w-3" /> Active BUYs
          </span>
          <strong className="text-lg text-emerald-400 font-bold">{stats.buys}</strong>
          <span className="text-[10px] text-zinc-500 block">RSI &lt; 40 + 50 MA bounce</span>
        </div>

        <div className="bg-zinc-950 border border-rose-900/40 rounded-2xl p-3.5">
          <span className="text-[10px] text-rose-400 uppercase block flex items-center gap-1">
            <TrendingDown className="h-3 w-3" /> Active SELLs
          </span>
          <strong className="text-lg text-rose-400 font-bold">{stats.sells}</strong>
          <span className="text-[10px] text-zinc-500 block">RSI &gt; 60 + 50 MA reject</span>
        </div>

        <div 
          onClick={() => setConfluenceOnlyFilter(!confluenceOnlyFilter)}
          className={`bg-zinc-950 border rounded-2xl p-3.5 cursor-pointer transition ${
            confluenceOnlyFilter 
              ? 'border-amber-500/80 bg-amber-950/20' 
              : 'border-zinc-800/80 hover:border-zinc-700'
          }`}
          title="Click to filter symbols with multi-timeframe confluence"
        >
          <span className="text-[10px] text-amber-400 uppercase block flex items-center gap-1">
            <Zap className="h-3 w-3 text-amber-400" /> Multi-TF Confluence
          </span>
          <strong className="text-lg text-amber-300 font-bold">{stats.confluenceCount}</strong>
          <span className="text-[10px] text-zinc-400 block">
            {confluenceOnlyFilter ? 'Filter active (click to reset)' : 'Aligned on 2+ TFs'}
          </span>
        </div>

        <div className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-3.5 col-span-2 sm:col-span-1">
          <span className="text-[10px] text-blue-400 uppercase block">Risk Management</span>
          <strong className="text-lg text-blue-300 font-bold">2×ATR(14)</strong>
          <span className="text-[10px] text-zinc-500 block">Trailing stop sizing</span>
        </div>
      </div>

      {/* FILTER BAR: DIRECTION, TIMEFRAME VIEW, SEARCH & MIN CONFIDENCE */}
      <div className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-3 space-y-3 text-xs font-mono">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Direction filters */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-zinc-500 text-[11px] uppercase mr-1">Signal:</span>
            
            <button
              type="button"
              onClick={() => setDirectionFilter('all')}
              className={`px-3 py-1.5 rounded-xl font-bold transition ${
                directionFilter === 'all'
                  ? 'bg-zinc-800 text-white border border-zinc-700'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              All ({results.length})
            </button>

            <button
              type="button"
              onClick={() => setDirectionFilter('actionable')}
              className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 ${
                directionFilter === 'actionable'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-blue-400 hover:text-blue-300'
              }`}
            >
              <Zap className="h-3.5 w-3.5" />
              <span>Actionable ({stats.buys + stats.sells})</span>
            </button>

            <button
              type="button"
              onClick={() => setDirectionFilter('buy')}
              className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1 ${
                directionFilter === 'buy'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-emerald-400 hover:text-emerald-300'
              }`}
            >
              <TrendingUp className="h-3 w-3" />
              <span>BUY ({stats.buys})</span>
            </button>

            <button
              type="button"
              onClick={() => setDirectionFilter('sell')}
              className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1 ${
                directionFilter === 'sell'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-rose-400 hover:text-rose-300'
              }`}
            >
              <TrendingDown className="h-3 w-3" />
              <span>SELL ({stats.sells})</span>
            </button>

            {/* Multi-TF Confluence Quick Toggle */}
            <button
              type="button"
              onClick={() => setConfluenceOnlyFilter(!confluenceOnlyFilter)}
              className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 border ${
                confluenceOnlyFilter
                  ? 'bg-amber-500/20 border-amber-500/80 text-amber-300 shadow-sm'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Zap className="h-3.5 w-3.5 text-amber-400" />
              <span>Confluence Only ({stats.confluenceCount})</span>
            </button>

            {/* Hide Closed / Not Live Markets Toggle */}
            <button
              type="button"
              onClick={() => setHideClosedMarkets(!hideClosedMarkets)}
              className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 border ${
                hideClosedMarkets
                  ? 'bg-amber-500/20 border-amber-500/80 text-amber-300 shadow-sm'
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
          </div>

          {/* Search and Confidence */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-zinc-500 text-[10px]">Min Conf:</span>
              <input
                type="range"
                min="0"
                max="90"
                step="5"
                value={minConfidence}
                onChange={e => setMinConfidence(Number(e.target.value))}
                className="w-20 accent-blue-500"
              />
              <span className="text-zinc-300 font-bold min-w-[28px]">{minConfidence}%</span>
            </div>

            <div className="relative">
              <input
                type="text"
                placeholder="Search table..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="px-2.5 py-1 pl-7 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-blue-500 text-xs"
              />
              <Search className="h-3 w-3 text-zinc-500 absolute left-2 top-2" />
            </div>
          </div>
        </div>

        {/* Timeframe View Tabs (when multi-timeframe results exist) */}
        {(timeframeMode === 'all' || new Set(results.map(r => r.timeframe)).size > 1) && (
          <div className="pt-2 border-t border-zinc-900 flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className="text-zinc-500 uppercase text-[10px] mr-1">Timeframe View:</span>
            <button
              type="button"
              onClick={() => setResultsTimeframeFilter('all')}
              className={`px-2.5 py-1 rounded-lg font-bold transition ${
                resultsTimeframeFilter === 'all'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
              }`}
            >
              All Timeframes ({results.length})
            </button>

            {ALL_SCAN_TIMEFRAMES.map(tf => {
              const count = results.filter(r => r.timeframe === tf).length;
              const buyCount = results.filter(r => r.timeframe === tf && r.signal === 'BUY').length;
              const sellCount = results.filter(r => r.timeframe === tf && r.signal === 'SELL').length;
              if (count === 0 && resultsTimeframeFilter !== tf) return null;

              return (
                <button
                  key={tf}
                  type="button"
                  onClick={() => setResultsTimeframeFilter(tf)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1.5 border ${
                    resultsTimeframeFilter === tf
                      ? 'bg-blue-600 border-blue-500 text-white shadow-sm'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <span>{tf}</span>
                  <span className="text-[10px] opacity-75">({count})</span>
                  {buyCount > 0 && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                  {sellCount > 0 && <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ERROR MESSAGE IF ANY */}
      {scanError && (
        <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-900/60 text-rose-300 text-xs font-mono flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-rose-400 flex-shrink-0" />
          <span>{scanError}</span>
        </div>
      )}

      {/* OUTPUT TABLE (REQUIREMENT 5) */}
      <div className="bg-zinc-950 border border-zinc-800/90 rounded-2xl overflow-hidden shadow-2xl">
        <div className="px-4 py-2.5 bg-zinc-900/50 border-b border-zinc-800/80 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
          <span className="text-zinc-400">
            Showing <strong className="text-zinc-100">{filteredResults.length}</strong> of {results.length} scan results
            {hideClosedMarkets && closedMarketsCount > 0 && (
              <span className="text-amber-400 font-medium ml-1">
                ({closedMarketsCount} closed hidden)
              </span>
            )}
          </span>
          {results.length > 0 && (
            <span className="text-[11px] text-zinc-500">
              Click any row to inspect full indicators, chart &amp; ATR stops
            </span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs border-collapse">
            <thead>
              <tr className="bg-zinc-900/95 border-b border-zinc-800 text-zinc-400 text-[11px] uppercase tracking-wider">
                <th className="sticky left-0 z-20 bg-zinc-900 py-3 px-3 shadow-[1px_0_0_0_#27272a]">Symbol</th>
                <th className="py-3 px-3">Signal</th>
                <th className="py-3 px-3 text-center">TF</th>
                <th className="py-3 px-3 text-right">
                  <div className="flex items-center justify-end gap-1 text-cyan-300 font-black">
                    <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
                    <span>ENTRY</span>
                  </div>
                </th>
                <th className="py-3 px-3 text-right">
                  <div className="flex items-center justify-end gap-1 text-rose-300 font-black">
                    <ShieldAlert className="h-3 w-3 text-rose-400" />
                    <span>STOP LOSS (SL)</span>
                  </div>
                </th>
                <th className="py-3 px-3 text-right">
                  <div className="flex items-center justify-end gap-1 text-emerald-300 font-black">
                    <Target className="h-3 w-3 text-emerald-400" />
                    <span>TAKE PROFIT (TP)</span>
                  </div>
                </th>
                <th className="py-3 px-3 text-right">Fast MA ({config.fastPeriod})</th>
                <th className="py-3 px-3 text-right">Slow MA ({config.slowPeriod})</th>
                <th className="py-3 px-3 text-right">RSI ({config.rsiPeriod})</th>
                <th className="py-3 px-3 text-right">Dist to MA</th>
                <th className="py-3 px-3 text-right">ATR(14)</th>
                <th className="py-3 px-3 text-center">Confidence</th>
                <th className="py-3 px-4 min-w-[280px]">Reason</th>
                <th className="py-3 px-3 text-center">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-zinc-900">
              {filteredResults.length === 0 ? (
                <tr>
                  <td colSpan={14} className="py-12 text-center text-zinc-500">
                    {isScanning ? 'Scanning all timeframes...' : 'No setups match the current filters. Adjust your criteria or click "Scan Now".'}
                  </td>
                </tr>
              ) : (
                filteredResults.map(item => {
                  const isBuy = item.signal === 'BUY';
                  const isSell = item.signal === 'SELL';
                  const isNeutral = item.signal === 'NEUTRAL';
                  const confInfo = confluenceMap[item.symbol];
                  const hasConfluence = confInfo && confInfo.maxSignals >= 2;

                  return (
                    <tr
                      key={`${item.symbol}_${item.timeframe}`}
                      onClick={() => setInspectedResult(item)}
                      className={`group hover:bg-zinc-900/70 transition cursor-pointer ${
                        isBuy 
                          ? 'bg-emerald-950/15' 
                          : isSell 
                          ? 'bg-rose-950/15' 
                          : ''
                      }`}
                    >
                      {/* Symbol + Multi-TF Confluence Badge */}
                      <td className={`sticky left-0 z-10 py-3 px-3 font-bold text-white shadow-[1px_0_0_0_#27272a] ${
                        isBuy 
                          ? 'bg-zinc-950 group-hover:bg-zinc-900' 
                          : isSell 
                          ? 'bg-zinc-950 group-hover:bg-zinc-900' 
                          : 'bg-zinc-950 group-hover:bg-zinc-900'
                      }`}>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span>{item.symbol}</span>
                            <span className="text-[10px] text-zinc-500 block truncate max-w-[90px]">
                              {item.displayName}
                            </span>
                          </div>
                          {hasConfluence && confInfo.buys.length >= 2 && (
                            <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-[9px] font-bold">
                              <Zap className="h-2.5 w-2.5 text-emerald-400" />
                              <span>{confInfo.buys.length}x Buy Align ({confInfo.buys.join(', ')})</span>
                            </div>
                          )}
                          {hasConfluence && confInfo.sells.length >= 2 && (
                            <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-950/80 border border-rose-500/40 text-rose-300 text-[9px] font-bold">
                              <Zap className="h-2.5 w-2.5 text-rose-400" />
                              <span>{confInfo.sells.length}x Sell Align ({confInfo.sells.join(', ')})</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Signal Badge */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-md text-[11px] font-extrabold flex items-center gap-1 w-fit border ${
                          isBuy
                            ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300 shadow-sm shadow-emerald-950/50'
                            : isSell
                            ? 'bg-rose-950/80 border-rose-500/60 text-rose-300 shadow-sm shadow-rose-950/50'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                        }`}>
                          {isBuy && <TrendingUp className="h-3 w-3" />}
                          {isSell && <TrendingDown className="h-3 w-3" />}
                          {item.signal}
                        </span>
                      </td>

                      {/* Timeframe pill with clear visual styling */}
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          item.timeframe === '1m' || item.timeframe === '5m'
                            ? 'bg-amber-950/40 border-amber-500/30 text-amber-300'
                            : item.timeframe === '15m' || item.timeframe === '30m'
                            ? 'bg-blue-950/40 border-blue-500/30 text-blue-300'
                            : item.timeframe === '1h' || item.timeframe === '4h'
                            ? 'bg-indigo-950/40 border-indigo-500/30 text-indigo-300'
                            : 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                        }`}>
                          {item.timeframe}
                        </span>
                      </td>

                      {/* HIGHLIGHTED ENTRY */}
                      <td className="py-3 px-3 text-right font-mono whitespace-nowrap">
                        <div className="inline-flex flex-col items-end">
                          <span className="px-2.5 py-1 rounded-lg bg-cyan-950/80 border border-cyan-500/60 text-cyan-200 font-black text-xs shadow-md shadow-cyan-950/40">
                            ${formatP(item.price)}
                          </span>
                          <span className="text-[9px] text-cyan-400 font-semibold mt-0.5 tracking-wider uppercase">
                            Market Fill
                          </span>
                        </div>
                      </td>

                      {/* HIGHLIGHTED STOP LOSS (SL - 2×ATR) */}
                      <td className="py-3 px-3 text-right font-mono whitespace-nowrap">
                        <div className="inline-flex flex-col items-end">
                          <span className="px-2.5 py-1 rounded-lg bg-rose-950/90 border border-rose-500/70 text-rose-200 font-black text-xs shadow-md shadow-rose-950/40">
                            ${formatP(item.suggestedStop)}
                          </span>
                          <span className="text-[10px] text-rose-400 font-bold mt-0.5 flex items-center gap-1">
                            <span>-{item.stopDistancePct.toFixed(1)}%</span>
                            <span className="text-zinc-500 font-normal">(${formatP(item.stopDistanceDollar)})</span>
                          </span>
                        </div>
                      </td>

                      {/* HIGHLIGHTED TAKE PROFIT (TP - 1:1 Target) */}
                      <td className="py-3 px-3 text-right font-mono whitespace-nowrap">
                        <div className="inline-flex flex-col items-end">
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-950/90 border border-emerald-500/70 text-emerald-200 font-black text-xs shadow-md shadow-emerald-950/40">
                            ${formatP(item.suggestedTakeProfit1to1)}
                          </span>
                          <span className="text-[10px] text-emerald-400 font-bold mt-0.5 flex items-center gap-1">
                            <span>+{item.stopDistancePct.toFixed(1)}%</span>
                            <span className="text-emerald-500/70 font-semibold">(1:1 R:R)</span>
                          </span>
                        </div>
                      </td>

                      {/* Fast MA */}
                      <td className="py-3 px-3 text-right text-cyan-400 font-mono">
                        ${formatP(item.fastMA)}
                      </td>

                      {/* Slow MA */}
                      <td className="py-3 px-3 text-right text-amber-400 font-mono">
                        ${formatP(item.slowMA)}
                      </td>

                      {/* RSI(14) with direction arrow */}
                      <td className="py-3 px-3 text-right font-mono">
                        <div className="flex items-center justify-end gap-1">
                          <span className={`font-bold ${
                            item.rsi < config.rsiOversoldBuy
                              ? 'text-emerald-400'
                              : item.rsi > config.rsiOverboughtSell
                              ? 'text-rose-400'
                              : 'text-zinc-300'
                          }`}>
                            {item.rsi.toFixed(1)}
                          </span>
                          {item.rsiTurning === 'UP' && <TrendingUp className="h-3 w-3 text-emerald-400" />}
                          {item.rsiTurning === 'DOWN' && <TrendingDown className="h-3 w-3 text-rose-400" />}
                          {item.rsiTurning === 'FLAT' && <span className="text-zinc-600 text-xs">―</span>}
                        </div>
                      </td>

                      {/* Distance to Fast MA % */}
                      <td className="py-3 px-3 text-right font-mono">
                        <span className={Math.abs(item.distanceToFastMaPct) <= config.maTolerancePct ? 'text-blue-400 font-bold' : 'text-zinc-400'}>
                          {item.distanceToFastMaPct >= 0 ? '+' : ''}{item.distanceToFastMaPct.toFixed(2)}%
                        </span>
                      </td>

                      {/* ATR(14) */}
                      <td className="py-3 px-3 text-right text-zinc-400 font-mono">
                        ${formatP(item.atr14)}
                      </td>

                      {/* Confidence Score */}
                      <td className="py-3 px-3 text-center">
                        <div className="inline-flex items-center gap-1.5 font-bold">
                          <div className="w-10 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${
                                item.confidenceScore >= 75
                                  ? 'bg-emerald-500'
                                  : item.confidenceScore >= 50
                                  ? 'bg-blue-500'
                                  : 'bg-zinc-600'
                              }`}
                              style={{ width: `${item.confidenceScore}%` }}
                            />
                          </div>
                          <span className={item.confidenceScore >= 75 ? 'text-emerald-400' : 'text-zinc-300'}>
                            {item.confidenceScore}%
                          </span>
                        </div>
                      </td>

                      {/* Reason */}
                      <td className="py-3 px-4 text-zinc-300 text-[11px] leading-snug">
                        {item.reason}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-3 text-center whitespace-nowrap" onClick={e => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setInspectedResult(item)}
                          className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-blue-600 hover:text-white text-zinc-300 text-[10px] font-bold transition flex items-center gap-1 mx-auto"
                        >
                          <BarChart3 className="h-3 w-3" />
                          <span>Chart</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* INTERACTIVE CHART DRAWER / MODAL */}
      {inspectedResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl font-mono">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-zinc-900 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-950/80 border border-blue-500/40 text-blue-300">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-black text-white">
                      {inspectedResult.symbol} &bull; {inspectedResult.timeframe}
                    </h2>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                      inspectedResult.signal === 'BUY'
                        ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300'
                        : inspectedResult.signal === 'SELL'
                        ? 'bg-rose-950/80 border-rose-500/60 text-rose-300'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                    }`}>
                      {inspectedResult.signal}
                    </span>
                  </div>
                  <span className="text-xs text-zinc-500 block">
                    {inspectedResult.displayName} &bull; Research-Backed Setup Inspection
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3">
                {/* Switch timeframe for inspected symbol if available in scan results */}
                <div className="flex items-center overflow-x-auto scrollbar-none max-w-[140px] xs:max-w-[220px] sm:max-w-none bg-zinc-900 p-1 rounded-xl border border-zinc-800 shrink-0">
                  {ALL_SCAN_TIMEFRAMES.map(tf => {
                    const match = results.find(r => r.symbol === inspectedResult.symbol && r.timeframe === tf);
                    return (
                      <button
                        key={tf}
                        type="button"
                        onClick={() => {
                          if (match) {
                            setInspectedResult(match);
                          }
                        }}
                        disabled={!match}
                        className={`px-2 py-0.5 rounded-lg text-xs font-bold transition ${
                          inspectedResult.timeframe === tf
                            ? 'bg-blue-600 text-white shadow-sm'
                            : match
                            ? match.signal === 'BUY'
                              ? 'text-emerald-400 hover:bg-zinc-800'
                              : match.signal === 'SELL'
                              ? 'text-rose-400 hover:bg-zinc-800'
                              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                            : 'text-zinc-700 opacity-30 cursor-not-allowed'
                        }`}
                        title={match ? `${tf}: ${match.signal} (${match.confidenceScore}%)` : `${tf} not yet scanned`}
                      >
                        {tf}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => setInspectedResult(null)}
                  className="p-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
              {/* HERO TRADE EXECUTION PLAN: ENTRY, STOP LOSS (SL), TAKE PROFIT (TP) */}
              <div className="bg-gradient-to-br from-zinc-900 via-zinc-900/90 to-zinc-950 border-2 border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-2xl relative overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-4 border-b border-zinc-800 text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <Crosshair className="h-4 w-4 text-cyan-400" />
                    <span className="text-white font-black uppercase tracking-wider text-sm">
                      Trade Execution Plan &amp; Risk Parameters
                    </span>
                    <span className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-300 text-[10px] font-bold">
                      1:1 R:R Baseline
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-400 text-xs">
                    <span>ATR(14): <strong className="text-zinc-200 font-bold">${formatP(inspectedResult.atr14)}</strong></span>
                    <span className="text-zinc-600">&bull;</span>
                    <span>2×ATR Buffer: <strong className="text-amber-400 font-bold">${formatP(inspectedResult.stopDistanceDollar)}</strong></span>
                  </div>
                </div>

                {/* 3 Prominent Execution Hero Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 font-mono">
                  {/* 1. ENTRY CARD */}
                  <div className="p-4 rounded-xl bg-cyan-950/40 border-2 border-cyan-500/60 shadow-lg shadow-cyan-950/30 flex flex-col justify-between relative overflow-hidden group">
                    <div className="absolute -top-6 -right-6 w-24 h-24 bg-cyan-500/10 rounded-full blur-xl pointer-events-none group-hover:bg-cyan-500/20 transition" />
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-cyan-300 font-black uppercase tracking-wider flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
                          ENTRY PRICE
                        </span>
                        <span className="px-2 py-0.5 rounded bg-cyan-900/70 border border-cyan-500/40 text-cyan-200 text-[10px] font-extrabold">
                          {inspectedResult.signal === 'BUY' ? 'LONG ENTRY' : inspectedResult.signal === 'SELL' ? 'SHORT ENTRY' : 'TRIGGER'}
                        </span>
                      </div>
                      <div className="text-2xl sm:text-3xl font-black text-white tracking-tight my-1.5">
                        ${formatP(inspectedResult.price)}
                      </div>
                    </div>
                    <div className="pt-2.5 border-t border-cyan-800/40 text-[11px] text-cyan-300/90 flex items-center justify-between">
                      <span>Order: <strong className="text-white">Market / Retest</strong></span>
                      <span>Dist to Fast MA: <strong className="text-cyan-200">{inspectedResult.distanceToFastMaPct >= 0 ? '+' : ''}{inspectedResult.distanceToFastMaPct.toFixed(2)}%</strong></span>
                    </div>
                  </div>

                  {/* 2. STOP LOSS (SL) CARD */}
                  <div className="p-4 rounded-xl bg-rose-950/40 border-2 border-rose-500/70 shadow-lg shadow-rose-950/30 flex flex-col justify-between relative overflow-hidden group">
                    <div className="absolute -top-6 -right-6 w-24 h-24 bg-rose-500/10 rounded-full blur-xl pointer-events-none group-hover:bg-rose-500/20 transition" />
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-rose-300 font-black uppercase tracking-wider flex items-center gap-1.5">
                          <ShieldAlert className="h-3.5 w-3.5 text-rose-400" />
                          STOP LOSS (SL)
                        </span>
                        <span className="px-2 py-0.5 rounded bg-rose-900/70 border border-rose-500/40 text-rose-200 text-[10px] font-extrabold">
                          2× ATR Stop
                        </span>
                      </div>
                      <div className="text-2xl sm:text-3xl font-black text-rose-100 tracking-tight my-1.5">
                        ${formatP(inspectedResult.suggestedStop)}
                      </div>
                    </div>
                    <div className="pt-2.5 border-t border-rose-800/40 text-[11px] text-rose-300/90 flex items-center justify-between">
                      <span>Max Risk: <strong className="text-rose-200">-${formatP(inspectedResult.stopDistanceDollar)}</strong></span>
                      <span className="text-rose-400 font-extrabold">-{inspectedResult.stopDistancePct.toFixed(2)}%</span>
                    </div>
                  </div>

                  {/* 3. TAKE PROFIT (TP) CARD */}
                  <div className="p-4 rounded-xl bg-emerald-950/40 border-2 border-emerald-500/70 shadow-lg shadow-emerald-950/30 flex flex-col justify-between relative overflow-hidden group">
                    <div className="absolute -top-6 -right-6 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl pointer-events-none group-hover:bg-emerald-500/20 transition" />
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-emerald-300 font-black uppercase tracking-wider flex items-center gap-1.5">
                          <Target className="h-3.5 w-3.5 text-emerald-400" />
                          TAKE PROFIT (TP)
                        </span>
                        <span className="px-2 py-0.5 rounded bg-emerald-900/70 border border-emerald-500/40 text-emerald-200 text-[10px] font-extrabold">
                          1:1 R:R Target
                        </span>
                      </div>
                      <div className="text-2xl sm:text-3xl font-black text-emerald-100 tracking-tight my-1.5">
                        ${formatP(inspectedResult.suggestedTakeProfit1to1)}
                      </div>
                    </div>
                    <div className="pt-2.5 border-t border-emerald-800/40 text-[11px] text-emerald-300/90 flex items-center justify-between">
                      <span>Target Gain: <strong className="text-emerald-200">+${formatP(inspectedResult.stopDistanceDollar)}</strong></span>
                      <span className="text-emerald-400 font-extrabold">+{inspectedResult.stopDistancePct.toFixed(2)}%</span>
                    </div>
                  </div>
                </div>

                {/* Proportional Risk-Reward Visual Meter */}
                <div className="mt-4 pt-3 border-t border-zinc-800/80 font-mono">
                  <div className="flex items-center justify-between text-[11px] mb-1.5">
                    <span className="text-rose-400 font-bold flex items-center gap-1">
                      <ArrowDownRight className="h-3.5 w-3.5" />
                      Stop Loss Risk (-{inspectedResult.stopDistancePct.toFixed(1)}%)
                    </span>
                    <span className="text-cyan-300 font-black flex items-center gap-1">
                      &bull; Entry Level &bull;
                    </span>
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      Target Gain (+{inspectedResult.stopDistancePct.toFixed(1)}%)
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                  <div className="h-2.5 w-full bg-zinc-800 rounded-full overflow-hidden flex shadow-inner">
                    <div 
                      className="w-1/2 bg-gradient-to-r from-rose-600 to-rose-500" 
                      title={`Risk: -${inspectedResult.stopDistancePct.toFixed(2)}%`} 
                    />
                    <div className="w-1 bg-cyan-400 shadow-sm shadow-cyan-400" title="Entry Price Trigger" />
                    <div 
                      className="w-1/2 bg-gradient-to-r from-emerald-500 to-emerald-600" 
                      title={`Reward: +${inspectedResult.stopDistancePct.toFixed(2)}%`} 
                    />
                  </div>
                </div>
              </div>

              {/* Secondary Technical Indicators Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2 text-xs font-mono">
                <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-xl p-2.5">
                  <span className="text-[10px] text-zinc-500 uppercase block">Fast MA ({config.fastPeriod})</span>
                  <strong className="text-sm text-cyan-400 font-bold">${formatP(inspectedResult.fastMA)}</strong>
                </div>
                <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-xl p-2.5">
                  <span className="text-[10px] text-zinc-500 uppercase block">Slow MA ({config.slowPeriod})</span>
                  <strong className="text-sm text-amber-400 font-bold">${formatP(inspectedResult.slowMA)}</strong>
                </div>
                <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-xl p-2.5">
                  <span className="text-[10px] text-zinc-500 uppercase block">RSI({config.rsiPeriod})</span>
                  <strong className="text-sm text-emerald-400 font-bold">{inspectedResult.rsi.toFixed(1)}</strong>
                  <span className="text-[9px] text-zinc-500 ml-1">({inspectedResult.rsiTurning})</span>
                </div>
                <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-xl p-2.5">
                  <span className="text-[10px] text-zinc-500 uppercase block">Confidence</span>
                  <strong className="text-sm text-white font-bold">{inspectedResult.confidenceScore}%</strong>
                </div>
                <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-xl p-2.5 col-span-2 sm:col-span-1">
                  <span className="text-[10px] text-zinc-500 uppercase block">Trend Respect</span>
                  <strong className="text-sm text-blue-400 font-bold">
                    {inspectedResult.passedChecks.maTouchRespect ? 'MA Respected' : 'Pullback Zone'}
                  </strong>
                </div>
              </div>

              {/* Candlestick & Indicator Chart SVG */}
              <div className="bg-zinc-950 border border-zinc-800/90 rounded-2xl p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs mb-3 font-mono">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/50 text-cyan-300 font-extrabold text-[11px]">
                      <span className="h-2 w-2 rounded-full bg-cyan-400" /> ENTRY Level
                    </span>
                    <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-rose-950/80 border border-rose-500/50 text-rose-300 font-extrabold text-[11px]">
                      <span className="h-2 w-2 rounded-full bg-rose-400" /> 2×ATR SL
                    </span>
                    <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 font-extrabold text-[11px]">
                      <span className="h-2 w-2 rounded-full bg-emerald-400" /> 1:1 TP
                    </span>
                    <span className="flex items-center gap-1 text-cyan-400 font-bold text-[11px]">
                      <span className="h-1.5 w-3 bg-cyan-400 inline-block" /> Fast {config.maType} ({config.fastPeriod})
                    </span>
                    <span className="flex items-center gap-1 text-amber-400 font-bold text-[11px]">
                      <span className="h-1.5 w-3 bg-amber-400 inline-block" /> Slow {config.maType} ({config.slowPeriod})
                    </span>
                  </div>
                  <span className="text-zinc-500 text-[11px]">Last 60 candles with execution zones</span>
                </div>

                {/* SVG Render */}
                <ChartCandleView result={inspectedResult} config={config} />
              </div>

              {/* Research Logic Breakdown */}
              <div className="bg-zinc-900/80 border border-zinc-800/90 rounded-2xl p-4 text-xs space-y-2">
                <h4 className="text-zinc-300 font-bold uppercase text-[11px] flex items-center gap-1.5">
                  <Info className="h-3.5 w-3.5 text-blue-400" /> Detailed Signal Diagnosis
                </h4>
                <p className="text-zinc-300 leading-relaxed font-sans">{inspectedResult.reason}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* UNIT TESTS / VERIFICATION SUITE MODAL */}
      {showTestsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl max-w-2xl w-full p-6 space-y-5 font-mono shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white uppercase">
                  Scanner v1.3 Verification Suite
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowTestsModal(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              {testResults.map((t, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-xl border text-xs flex items-start gap-3 ${
                    t.passed
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                      : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                  }`}
                >
                  {t.passed ? (
                    <CheckCircle className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-rose-400 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1">
                    <strong className="block text-white">{t.name}</strong>
                    <p className="text-zinc-300 text-[11px]">{t.message}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-zinc-900 flex justify-end">
              <button
                type="button"
                onClick={() => setShowTestsModal(false)}
                className="px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs font-bold hover:bg-zinc-800"
              >
                Close Tests
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Sub-Component: Candlestick & Indicator Chart View
function ChartCandleView({ result, config }: { result: ScannerV13Result; config: ScannerV13Config }) {
  const candles = (result.candleData || []).slice(-60);
  const n = candles.length;

  if (n < 5) {
    return (
      <div className="h-64 flex items-center justify-center text-zinc-500 text-xs font-mono">
        Insufficient candle data to render interactive chart.
      </div>
    );
  }

  const width = 880;
  const height = 320;
  const padLeft = 10;
  const padRight = 95;
  const padTop = 20;
  const padBottom = 25;

  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  // Price range encompassing candles, entry price, SL, TP, and MAs
  let minP = Infinity;
  let maxP = -Infinity;
  candles.forEach(c => {
    if (c.low < minP) minP = c.low;
    if (c.high > maxP) maxP = c.high;
  });

  if (result.price > 0) {
    minP = Math.min(minP, result.price);
    maxP = Math.max(maxP, result.price);
  }
  if (result.suggestedStop > 0) {
    minP = Math.min(minP, result.suggestedStop);
    maxP = Math.max(maxP, result.suggestedStop);
  }
  if (result.suggestedTakeProfit1to1 > 0) {
    minP = Math.min(minP, result.suggestedTakeProfit1to1);
    maxP = Math.max(maxP, result.suggestedTakeProfit1to1);
  }
  if (result.fastMA > 0) {
    minP = Math.min(minP, result.fastMA);
    maxP = Math.max(maxP, result.fastMA);
  }
  if (result.slowMA > 0) {
    minP = Math.min(minP, result.slowMA);
    maxP = Math.max(maxP, result.slowMA);
  }

  // Add 5% comfortable margin so labels and lines don't collide with canvas edges
  const rawRange = maxP - minP || 1;
  const margin = rawRange * 0.05;
  minP -= margin;
  maxP += margin;
  const pRange = maxP - minP;

  const getY = (p: number) => padTop + chartH - ((p - minP) / pRange) * chartH;
  const barW = Math.max(3, (chartW / n) * 0.65);
  const getX = (idx: number) => padLeft + idx * (chartW / (n - 1));

  // Compute key price points
  const entryY = getY(result.price);
  const stopY = getY(result.suggestedStop);
  const tpY = getY(result.suggestedTakeProfit1to1);
  const fastMaY = getY(result.fastMA);
  const slowMaY = getY(result.slowMA);

  return (
    <div className="relative w-full overflow-hidden bg-zinc-950/90 rounded-xl">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto block select-none">
        {/* Horizontal grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
          const y = padTop + chartH * pct;
          const p = maxP - pct * pRange;
          return (
            <g key={idx}>
              <line x1={padLeft} y1={y} x2={padLeft + chartW} y2={y} stroke="#27272a" strokeDasharray="3 3" strokeWidth="1" />
              <text x={padLeft + chartW + 6} y={y + 3} fill="#52525b" fontSize="8" fontFamily="monospace">
                ${p >= 1000 ? p.toFixed(1) : p.toFixed(3)}
              </text>
            </g>
          );
        })}

        {/* STOP LOSS RISK ZONE (SHADED RED) */}
        {result.suggestedStop > 0 && (
          <g>
            <rect
              x={padLeft}
              y={Math.min(entryY, stopY)}
              width={chartW}
              height={Math.max(2, Math.abs(entryY - stopY))}
              fill="#f43f5e"
              fillOpacity="0.12"
              stroke="#f43f5e"
              strokeWidth="0.5"
              strokeDasharray="4 2"
            />
            {/* Risk Zone Watermark Text */}
            <text
              x={padLeft + 15}
              y={Math.min(entryY, stopY) + Math.abs(entryY - stopY) / 2 + 3}
              fill="#f43f5e"
              fillOpacity="0.6"
              fontSize="9"
              fontWeight="bold"
              fontFamily="monospace"
            >
              RISK ZONE (-{result.stopDistancePct.toFixed(1)}%)
            </text>
          </g>
        )}

        {/* TAKE PROFIT REWARD ZONE (SHADED GREEN) */}
        {result.suggestedTakeProfit1to1 > 0 && (
          <g>
            <rect
              x={padLeft}
              y={Math.min(entryY, tpY)}
              width={chartW}
              height={Math.max(2, Math.abs(entryY - tpY))}
              fill="#10b981"
              fillOpacity="0.12"
              stroke="#10b981"
              strokeWidth="0.5"
              strokeDasharray="4 2"
            />
            {/* Reward Zone Watermark Text */}
            <text
              x={padLeft + 15}
              y={Math.min(entryY, tpY) + Math.abs(entryY - tpY) / 2 + 3}
              fill="#10b981"
              fillOpacity="0.6"
              fontSize="9"
              fontWeight="bold"
              fontFamily="monospace"
            >
              PROFIT TARGET (+{result.stopDistancePct.toFixed(1)}%)
            </text>
          </g>
        )}

        {/* Fast MA Line */}
        <line
          x1={padLeft}
          y1={fastMaY}
          x2={padLeft + chartW}
          y2={fastMaY}
          stroke="#22d3ee"
          strokeWidth="1.5"
          strokeDasharray="4 2"
          strokeOpacity="0.7"
        />

        {/* Slow MA Line */}
        <line
          x1={padLeft}
          y1={slowMaY}
          x2={padLeft + chartW}
          y2={slowMaY}
          stroke="#f59e0b"
          strokeWidth="1.5"
          strokeDasharray="6 3"
          strokeOpacity="0.7"
        />

        {/* Candlesticks */}
        {candles.map((c, i) => {
          const x = getX(i);
          const isUp = c.close >= c.open;
          const candleColor = isUp ? '#10b981' : '#f43f5e';
          const topY = getY(Math.max(c.open, c.close));
          const botY = getY(Math.min(c.open, c.close));
          const candleH = Math.max(1.5, botY - topY);

          const highY = getY(c.high);
          const lowY = getY(c.low);

          return (
            <g key={i}>
              {/* Wick */}
              <line x1={x} y1={highY} x2={x} y2={lowY} stroke={candleColor} strokeWidth="1.2" />
              {/* Body */}
              <rect
                x={x - barW / 2}
                y={topY}
                width={barW}
                height={candleH}
                fill={candleColor}
                rx="1"
              />
            </g>
          );
        })}

        {/* 1. STOP LOSS (SL) LINE & HIGH-CONTRAST BADGE */}
        {result.suggestedStop > 0 && (
          <g>
            <line
              x1={padLeft}
              y1={stopY}
              x2={padLeft + chartW}
              y2={stopY}
              stroke="#f43f5e"
              strokeWidth="2.5"
              strokeDasharray="4 2"
            />
            <rect
              x={padLeft + chartW + 3}
              y={stopY - 10}
              width={88}
              height={20}
              rx="4"
              fill="#e11d48"
              stroke="#fda4af"
              strokeWidth="0.5"
            />
            <text
              x={padLeft + chartW + 47}
              y={stopY + 4}
              fill="#ffffff"
              fontSize="9"
              fontWeight="900"
              textAnchor="middle"
              fontFamily="monospace"
            >
              SL ${result.suggestedStop >= 1000 ? result.suggestedStop.toFixed(1) : result.suggestedStop.toFixed(3)}
            </text>
          </g>
        )}

        {/* 2. TAKE PROFIT (TP) LINE & HIGH-CONTRAST BADGE */}
        {result.suggestedTakeProfit1to1 > 0 && (
          <g>
            <line
              x1={padLeft}
              y1={tpY}
              x2={padLeft + chartW}
              y2={tpY}
              stroke="#10b981"
              strokeWidth="2.5"
              strokeDasharray="4 2"
            />
            <rect
              x={padLeft + chartW + 3}
              y={tpY - 10}
              width={88}
              height={20}
              rx="4"
              fill="#059669"
              stroke="#6ee7b7"
              strokeWidth="0.5"
            />
            <text
              x={padLeft + chartW + 47}
              y={tpY + 4}
              fill="#ffffff"
              fontSize="9"
              fontWeight="900"
              textAnchor="middle"
              fontFamily="monospace"
            >
              TP ${result.suggestedTakeProfit1to1 >= 1000 ? result.suggestedTakeProfit1to1.toFixed(1) : result.suggestedTakeProfit1to1.toFixed(3)}
            </text>
          </g>
        )}

        {/* 3. ENTRY LEVEL LINE & HIGH-CONTRAST BADGE */}
        <g>
          <line
            x1={padLeft}
            y1={entryY}
            x2={padLeft + chartW}
            y2={entryY}
            stroke="#38bdf8"
            strokeWidth="2.5"
            strokeDasharray="6 3"
          />
          <rect
            x={padLeft + chartW + 3}
            y={entryY - 10}
            width={88}
            height={20}
            rx="4"
            fill="#0284c7"
            stroke="#7dd3fc"
            strokeWidth="0.5"
          />
          <text
            x={padLeft + chartW + 47}
            y={entryY + 4}
            fill="#ffffff"
            fontSize="9"
            fontWeight="900"
            textAnchor="middle"
            fontFamily="monospace"
          >
            ENTRY ${result.price >= 1000 ? result.price.toFixed(1) : result.price.toFixed(3)}
          </text>
        </g>
      </svg>
    </div>
  );
}
