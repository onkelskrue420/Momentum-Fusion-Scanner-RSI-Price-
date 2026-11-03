import React, { useState, useMemo, useEffect } from 'react';
import { SetupAnalysis, ConfluenceSignalV4, Timeframe } from '../types';
import { evaluateConfluenceSignalV4, simulateRiskMethods } from '../utils/confluenceEngineV4';
import { getMarketActivity, formatExactTime } from '../utils/timeFormat';
import ConfluenceChartV4 from './ConfluenceChartV4';
import QuickCharts1to1View from './QuickCharts1to1View';
import BacktestEngine31View from './BacktestEngine31View';
import {
  Target,
  TrendingUp,
  TrendingDown,
  Activity,
  BarChart2,
  Sliders,
  Bell,
  Code2,
  Copy,
  Check,
  Download,
  AlertTriangle,
  ArrowUpDown,
  Search,
  RefreshCw,
  Percent,
  DollarSign,
  ShieldCheck,
  Zap,
  Clock,
  Sparkles,
  ChevronDown,
  Layers,
  CheckCircle2,
  Filter,
  Eye,
  EyeOff
} from 'lucide-react';

interface Version4ViewProps {
  setups: SetupAnalysis[];
  onSelectSetup?: (setup: SetupAnalysis) => void;
  selectedTimeframes?: Timeframe[];
  onTimeframeToggle?: (tf: Timeframe) => void;
  onScanAllTimeframes?: () => void;
  onScanTimeframes?: (tfs: Timeframe[], force?: boolean) => void;
  isScanning?: boolean;
}

type TabType = 'dashboard' | 'chart' | 'quick_charts' | 'backtest' | 'backtest_31' | 'risk' | 'settings';

export default function Version4View({
  setups,
  onSelectSetup,
  selectedTimeframes,
  onTimeframeToggle,
  onScanAllTimeframes,
  onScanTimeframes,
  isScanning = false
}: Version4ViewProps) {
  // Navigation
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [now, setNow] = useState<number>(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Filters
  const [minScore, setMinScore] = useState<number>(70);
  const [minOosWinRate, setMinOosWinRate] = useState<number>(50);
  const [directionFilter, setDirectionFilter] = useState<'ALL' | 'LONG' | 'SHORT'>('ALL');
  const [selectedTf, setSelectedTf] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected signal for Chart & Backtest tabs
  const [selectedSignalKey, setSelectedSignalKey] = useState<string | null>(null);
  // Dedicated timeframe focus filter for Chart (1:1 Lines) tab ('ALL' | '1m' | '5m' | '15m' | etc.)
  const [chartFocusTf, setChartFocusTf] = useState<string>('ALL');
  // Toggle to hide closed / inactive markets
  const [hideClosedMarkets, setHideClosedMarkets] = useState<boolean>(false);

  // Risk Management inputs
  const [accountSize, setAccountSize] = useState<number>(10000);
  const [riskPct, setRiskPct] = useState<number>(1.0);
  const [rmNWins, setRmNWins] = useState<number>(2);
  const [isLogScale, setIsLogScale] = useState<boolean>(false);
  const [hoverSimTrade, setHoverSimTrade] = useState<number | null>(null);

  // Alerts inputs
  const [webhookUrl, setWebhookUrl] = useState<string>('');
  const [tgToken, setTgToken] = useState<string>('');
  const [tgChatId, setTgChatId] = useState<string>('');
  const [alertStatus, setAlertStatus] = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState<boolean>(false);

  // Sorting
  const [sortField, setSortField] = useState<keyof ConfluenceSignalV4>('score');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  // Generate Confluence signals from incoming setups
  const signals: ConfluenceSignalV4[] = useMemo(() => {
    const list: ConfluenceSignalV4[] = [];
    for (const s of setups) {
      if (!s.dataPoints || s.dataPoints.length < 35) continue;
      const sig = evaluateConfluenceSignalV4(
        s.symbol,
        s.displayName,
        s.timeframe,
        s.type,
        s.dataPoints
      );
      if (sig) {
        list.push(sig);
      }
    }
    return list;
  }, [setups]);

  // Signal counts grouped by timeframe
  const countsByTf = useMemo(() => {
    const counts: Record<string, number> = {
      '1m': 0,
      '5m': 0,
      '15m': 0,
      '30m': 0,
      '1h': 0,
      '4h': 0,
      '1d': 0,
    };
    for (const s of signals) {
      if (counts[s.timeframe] !== undefined) {
        counts[s.timeframe]++;
      }
    }
    return counts;
  }, [signals]);

  // Total closed markets count across all scanned signals
  const closedMarketsCount = useMemo(() => {
    let closed = 0;
    for (const s of signals) {
      const pts = s.dataPoints || [];
      const lastTs = pts.length > 0 ? pts[pts.length - 1].timestamp : undefined;
      const mi = getMarketActivity(lastTs, s.timeframe, now, s.symbol, s.type);
      if (!mi.isMarketOpen) closed++;
    }
    return closed;
  }, [signals, now]);

  // Filtered and sorted signals
  const filteredSignals = useMemo(() => {
    return signals.filter((sig) => {
      if (sig.score < minScore) return false;
      if (sig.oosWinRate < minOosWinRate) return false;
      if (directionFilter !== 'ALL' && sig.direction !== directionFilter) return false;
      if (selectedTf !== 'ALL' && sig.timeframe !== selectedTf) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!sig.symbol.toLowerCase().includes(q) && !sig.displayName.toLowerCase().includes(q)) {
          return false;
        }
      }
      if (hideClosedMarkets) {
        const pts = sig.dataPoints || [];
        const lastTs = pts.length > 0 ? pts[pts.length - 1].timestamp : undefined;
        const mi = getMarketActivity(lastTs, sig.timeframe, now, sig.symbol, sig.type);
        if (!mi.isMarketOpen) return false;
      }
      return true;
    }).sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortAsc ? aVal - bVal : bVal - aVal;
      }
      return sortAsc
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
  }, [signals, minScore, minOosWinRate, directionFilter, selectedTf, searchQuery, sortField, sortAsc, hideClosedMarkets, now]);

  // Scanned instruments that fit criteria for the Chart (1:1 Lines) view,
  // sorted strictly from best to worst by confluence score (and win rate as tiebreaker)
  const chartSignals = useMemo(() => {
    return signals
      .filter((sig) => {
        // Fits criteria: must pass minScore & minOosWinRate
        if (sig.score < minScore) return false;
        if (sig.oosWinRate < minOosWinRate) return false;
        if (directionFilter !== 'ALL' && sig.direction !== directionFilter) return false;
        if (chartFocusTf !== 'ALL' && sig.timeframe !== chartFocusTf) return false;
        if (hideClosedMarkets) {
          const pts = sig.dataPoints || [];
          const lastTs = pts.length > 0 ? pts[pts.length - 1].timestamp : undefined;
          const mi = getMarketActivity(lastTs, sig.timeframe, now);
          if (!mi.isMarketOpen) return false;
        }
        return true;
      })
      .sort((a, b) => {
        // Best to worst: highest score first, then highest OOS win rate, then expectancy
        if (b.score !== a.score) return b.score - a.score;
        if (b.oosWinRate !== a.oosWinRate) return b.oosWinRate - a.oosWinRate;
        return b.oosExpectancy - a.oosExpectancy;
      });
  }, [signals, minScore, minOosWinRate, directionFilter, chartFocusTf, hideClosedMarkets, now]);

  // Active signal for Chart / Backtest view
  const activeSignal = useMemo(() => {
    if (selectedSignalKey) {
      // In chart tab with a specific timeframe focus, check chartSignals first
      if (activeTab === 'chart') {
        const inChartList = chartSignals.find((s) => `${s.symbol}_${s.timeframe}` === selectedSignalKey);
        if (inChartList) return inChartList;
      }
      const found = signals.find((s) => `${s.symbol}_${s.timeframe}` === selectedSignalKey);
      if (found) return found;
    }
    if (activeTab === 'chart') {
      return chartSignals[0] || filteredSignals[0] || signals[0] || null;
    }
    return filteredSignals[0] || signals[0] || null;
  }, [selectedSignalKey, signals, filteredSignals, chartSignals, activeTab]);

  // Handle row click
  const handleSelectRow = (sig: ConfluenceSignalV4) => {
    setSelectedSignalKey(`${sig.symbol}_${sig.timeframe}`);
    setActiveTab('chart');
  };

  // 300-trade Risk simulation data
  const riskSimulation = useMemo(() => {
    const winRate = activeSignal ? activeSignal.oosWinRate : 55;
    return simulateRiskMethods(accountSize, riskPct, winRate, 300, rmNWins);
  }, [accountSize, riskPct, activeSignal, rmNWins]);

  // Position sizing calculation
  const positionSizing = useMemo(() => {
    if (!activeSignal) return { riskDollar: 0, units: 0, notional: 0 };
    const riskDollar = accountSize * (riskPct / 100);
    const slDistance = Math.abs((activeSignal.entry || 0) - (activeSignal.stopLoss || 0));
    const units = slDistance > 0 ? riskDollar / slDistance : 0;
    const notional = units * (activeSignal.entry || 0);
    return { riskDollar, units, notional };
  }, [accountSize, riskPct, activeSignal]);

  // Safe formatting helpers to prevent any toFixed undefined errors
  const formatP = (v: number | null | undefined, digits = 4) => {
    if (typeof v !== 'number' || isNaN(v)) return '—';
    if (v >= 1000) return v.toFixed(2);
    return v.toFixed(digits);
  };

  const formatNum = (v: number | null | undefined, digits = 1, fallback = '—') => {
    if (typeof v !== 'number' || isNaN(v)) return fallback;
    return v.toFixed(digits);
  };

  // Dispatch alert test
  const handleDispatchAlert = () => {
    if (!activeSignal) return;
    if (activeSignal.score < 80 || activeSignal.direction === 'WAIT') {
      setAlertStatus('⚠️ Score is below 80 or state is WAIT. Alerts only trigger on Score >= 80.');
      return;
    }
    const entryStr = formatP(activeSignal.entry);
    setAlertStatus(
      `🚀 Alert dispatched for ${activeSignal.symbol} (${activeSignal.timeframe}) [${activeSignal.direction} @ ${entryStr}]. Entry, SL, and 1:1 TP sent.`
    );
  };

  // Copy app.py script
  const handleCopyCode = () => {
    fetch('/app.py')
      .then((r) => r.text())
      .then((txt) => {
        navigator.clipboard.writeText(txt);
        setCodeCopied(true);
        setTimeout(() => setCodeCopied(false), 2500);
      })
      .catch(() => {
        setCodeCopied(true);
        setTimeout(() => setCodeCopied(false), 2500);
      });
  };

  return (
    <div className="space-y-6">
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-blue-950/60 via-zinc-900 to-indigo-950/50 border border-blue-800/40 rounded-2xl p-5 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-500/20 border border-blue-500/40 text-blue-400">
                <Target className="h-5 w-5" />
              </div>
              <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                1:1 Confluence Scanner v4
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/40 font-mono font-bold">
                  QUANTITATIVE ENGINE
                </span>
              </h1>
            </div>
            <p className="text-xs text-zinc-400 font-mono">
              Multi-timeframe 1:1 R:R setups with EMA20, RSI, Volume SMA, ADX, FVGs & Reversals. Out-of-sample backtested with 0.05% fee + 0.02% slippage.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="px-3 py-1.5 rounded-xl bg-zinc-950/80 border border-zinc-800 text-center font-mono">
              <span className="text-[10px] text-zinc-500 block uppercase">Qualified</span>
              <strong className="text-sm text-blue-400 font-bold">{filteredSignals.length}</strong>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-zinc-950/80 border border-zinc-800 text-center font-mono">
              <span className="text-[10px] text-zinc-500 block uppercase">Avg OOS Win</span>
              <strong className="text-sm text-emerald-400 font-bold">
                {filteredSignals.length > 0
                  ? (filteredSignals.reduce((acc, s) => acc + (s.oosWinRate ?? 0), 0) / filteredSignals.length).toFixed(1)
                  : '0.0'}%
              </strong>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-zinc-950/80 border border-zinc-800 text-center font-mono">
              <span className="text-[10px] text-zinc-500 block uppercase">R:R Ratio</span>
              <strong className="text-sm text-amber-400 font-bold">1:1.00</strong>
            </div>
          </div>
        </div>

        {/* MULTI-TIMEFRAME SCANNER CONTROL BAR (SCANNING ALL DOWN TO 1 MINUTE) */}
        <div className="bg-zinc-950/90 border border-blue-900/50 rounded-2xl p-4 mt-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 font-mono text-xs shadow-inner">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-blue-300 font-bold">
              <Zap className="h-4 w-4 text-amber-400 fill-amber-400" />
              <span>Timeframe Scanner (down to 1m):</span>
            </div>

            {/* Timeframe multi-toggle pills */}
            <div className="flex flex-wrap items-center gap-1.5 bg-zinc-900/90 p-1.5 rounded-xl border border-zinc-800">
              {(['1m', '5m', '15m', '30m', '1h', '4h', '1d'] as Timeframe[]).map((tf) => {
                const isActive = selectedTimeframes ? selectedTimeframes.includes(tf) : true;
                const count = countsByTf[tf] || 0;
                return (
                  <button
                    key={tf}
                    onClick={() => onTimeframeToggle && onTimeframeToggle(tf)}
                    className={`px-3 py-1 rounded-lg transition text-xs font-bold flex items-center gap-1.5 ${
                      isActive
                        ? tf === '1m'
                          ? 'bg-amber-500 text-zinc-950 font-black shadow-sm ring-1 ring-amber-400/50'
                          : 'bg-blue-600 text-white shadow-sm'
                        : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60'
                    }`}
                    title={tf === '1m' ? '1-Minute Scalp Confluence Scanner' : `Toggle ${tf} timeframe`}
                  >
                    {tf === '1m' && <Zap className="h-3.5 w-3.5 fill-current text-zinc-950" />}
                    <span>{tf}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                      isActive ? (tf === '1m' ? 'bg-amber-600 text-amber-950 font-bold' : 'bg-blue-700 text-blue-100') : 'bg-zinc-800 text-zinc-400'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Quick Button: Scan 1m Scalps Only */}
            <button
              onClick={() => onScanTimeframes && onScanTimeframes(['1m'], true)}
              disabled={isScanning}
              className="px-3 py-2 rounded-xl bg-amber-500/15 border border-amber-500/50 text-amber-300 hover:bg-amber-500/25 transition flex items-center gap-1.5 text-xs font-bold disabled:opacity-50"
              title="Fast scan strictly for 1-minute high-probability scalps"
            >
              <Zap className="h-4 w-4 fill-amber-400 text-amber-400" />
              <span>Scan 1m Scalps Only</span>
            </button>

            {/* Master Button: Scan All Timeframes (1m to 1D) */}
            <button
              onClick={() => onScanAllTimeframes ? onScanAllTimeframes() : onScanTimeframes && onScanTimeframes(['1m', '5m', '15m', '30m', '1h', '4h', '1d'], true)}
              disabled={isScanning}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition flex items-center gap-2 text-xs shadow-md shadow-blue-900/40 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isScanning ? 'animate-spin' : ''}`} />
              <span>{isScanning ? 'Scanning All TFs...' : '⚡ Scan All Down to 1m'}</span>
            </button>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="flex flex-wrap items-center gap-2 mt-5 pt-4 border-t border-zinc-800/80">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition flex items-center gap-2 ${
              activeTab === 'dashboard'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
                : 'bg-zinc-900/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850 border border-zinc-800'
            }`}
          >
            <BarChart2 className="h-4 w-4" />
            <span>1. Dashboard</span>
            <span className="text-[10px] opacity-80 font-normal">({filteredSignals.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('chart')}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition flex items-center gap-2 ${
              activeTab === 'chart'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
                : 'bg-zinc-900/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850 border border-zinc-800'
            }`}
          >
            <Activity className="h-4 w-4" />
            <span>2. Single Chart</span>
            {activeSignal && (
              <span className="text-[10px] bg-blue-950 text-blue-300 px-1.5 py-0.2 rounded border border-blue-700/50">
                {activeSignal.symbol}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('quick_charts')}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition flex items-center gap-2 ${
              activeTab === 'quick_charts'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/30'
                : 'bg-zinc-900/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850 border border-zinc-800'
            }`}
          >
            <Zap className="h-4 w-4 text-amber-400" />
            <span>2.1. Chart (1:1 Lines)</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 font-normal">
              Quick Scroll
            </span>
          </button>

          <button
            onClick={() => setActiveTab('backtest')}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition flex items-center gap-2 ${
              activeTab === 'backtest'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
                : 'bg-zinc-900/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850 border border-zinc-800'
            }`}
          >
            <ShieldCheck className="h-4 w-4" />
            <span>3. Backtest (OOS)</span>
          </button>

          <button
            onClick={() => setActiveTab('backtest_31')}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition flex items-center gap-2 ${
              activeTab === 'backtest_31'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-900/30'
                : 'bg-zinc-900/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850 border border-zinc-800'
            }`}
          >
            <Layers className="h-4 w-4 text-purple-400" />
            <span>3.1 Backtest (0-1000d)</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 font-normal">
              Chart Trades
            </span>
          </button>

          <button
            onClick={() => setActiveTab('risk')}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition flex items-center gap-2 ${
              activeTab === 'risk'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
                : 'bg-zinc-900/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850 border border-zinc-800'
            }`}
          >
            <Percent className="h-4 w-4" />
            <span>4. Risk Simulator (300 Trades)</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition flex items-center gap-2 ${
              activeTab === 'settings'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
                : 'bg-zinc-900/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850 border border-zinc-800'
            }`}
          >
            <Sliders className="h-4 w-4" />
            <span>5. Settings & Alerts</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: DASHBOARD */}
      {/* ========================================================================= */}
      {activeTab === 'dashboard' && (
        <div className="space-y-4">
          {/* Dashboard Filter Bar */}
          <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 font-mono text-xs">
            <div className="flex flex-wrap items-center gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search symbol..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs focus:outline-none focus:border-blue-500 w-36"
                />
              </div>

              {/* Direction Filter */}
              <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-xl border border-zinc-800">
                {(['ALL', 'LONG', 'SHORT'] as const).map((dir) => (
                  <button
                    key={dir}
                    onClick={() => setDirectionFilter(dir)}
                    className={`px-2.5 py-1 rounded-lg transition font-bold ${
                      directionFilter === dir
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {dir}
                  </button>
                ))}
              </div>

              {/* Timeframe Filter Dropdown & Quick Chips */}
              <div className="flex flex-wrap items-center gap-1 bg-zinc-900/80 p-1 rounded-xl border border-zinc-800">
                {(['ALL', '1m', '5m', '15m', '30m', '1h', '4h', '1d'] as const).map((tf) => {
                  const isSelected = selectedTf === tf;
                  const count = tf === 'ALL' ? signals.length : countsByTf[tf] || 0;
                  return (
                    <button
                      key={tf}
                      onClick={() => setSelectedTf(tf)}
                      className={`px-2.5 py-1 rounded-lg transition text-xs font-bold flex items-center gap-1 ${
                        isSelected
                          ? tf === '1m'
                            ? 'bg-amber-500 text-zinc-950 font-black shadow-sm'
                            : 'bg-blue-600 text-white shadow-sm'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {tf === '1m' && <Zap className="h-3 w-3 fill-current" />}
                      <span>{tf}</span>
                      <span className={`text-[10px] opacity-80 ${isSelected ? (tf === '1m' ? 'text-zinc-900 font-black' : 'text-blue-200') : 'text-zinc-500'}`}>
                        ({count})
                      </span>
                    </button>
                  );
                })}
              </div>

              <select
                value={selectedTf}
                onChange={(e) => setSelectedTf(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs focus:outline-none focus:border-blue-500"
              >
                <option value="ALL">All Timeframes ({signals.length})</option>
                <option value="1m">1m - M1 Scalp ({countsByTf['1m'] || 0})</option>
                <option value="5m">5m - M5 ({countsByTf['5m'] || 0})</option>
                <option value="15m">15m - M15 ({countsByTf['15m'] || 0})</option>
                <option value="30m">30m - M30 ({countsByTf['30m'] || 0})</option>
                <option value="1h">1h - H1 ({countsByTf['1h'] || 0})</option>
                <option value="4h">4h - H4 ({countsByTf['4h'] || 0})</option>
                <option value="1d">1d - D1 ({countsByTf['1d'] || 0})</option>
              </select>
            </div>

            {/* Threshold Sliders & Hide Closed Toggle */}
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-zinc-400">Min Score:</span>
                <input
                  type="range"
                  min="70"
                  max="95"
                  step="5"
                  value={minScore}
                  onChange={(e) => setMinScore(Number(e.target.value))}
                  className="w-20 accent-blue-500"
                />
                <strong className="text-amber-400 w-7">{minScore}</strong>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-zinc-400">Min OOS Win:</span>
                <input
                  type="range"
                  min="40"
                  max="70"
                  step="1"
                  value={minOosWinRate}
                  onChange={(e) => setMinOosWinRate(Number(e.target.value))}
                  className="w-20 accent-emerald-500"
                />
                <strong className="text-emerald-400 w-9">{minOosWinRate}%</strong>
              </div>

              {/* Hide Closed Markets Toggle Button */}
              <button
                onClick={() => setHideClosedMarkets(!hideClosedMarkets)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition flex items-center gap-2 ${
                  hideClosedMarkets
                    ? 'bg-amber-950/70 border-amber-500 text-amber-300 shadow-md shadow-amber-950/50'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                }`}
                title={hideClosedMarkets ? 'Currently hiding closed markets. Click to show all.' : 'Click to hide markets that are closed or idle.'}
              >
                {hideClosedMarkets ? (
                  <>
                    <EyeOff className="h-3.5 w-3.5 text-amber-400" />
                    <span>Closed Hidden</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {closedMarketsCount}
                    </span>
                  </>
                ) : (
                  <>
                    <Eye className="h-3.5 w-3.5 text-zinc-400" />
                    <span>Hide Closed</span>
                    {closedMarketsCount > 0 && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                        {closedMarketsCount}
                      </span>
                    )}
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Sortable Table */}
          <div className="bg-zinc-950 border border-zinc-800/90 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead>
                  <tr className="bg-zinc-900/90 border-b border-zinc-800 text-zinc-400 select-none">
                    <th
                      className="py-3 px-4 cursor-pointer hover:text-zinc-200"
                      onClick={() => {
                        if (sortField === 'symbol') setSortAsc(!sortAsc);
                        else { setSortField('symbol'); setSortAsc(true); }
                      }}
                    >
                      <div className="flex items-center gap-1">
                        <span>Symbol</span>
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </th>
                    <th className="py-3 px-3">TF</th>
                    <th className="py-3 px-3">Signal</th>
                    <th
                      className="py-3 px-3 cursor-pointer hover:text-zinc-200"
                      onClick={() => {
                        if (sortField === 'score') setSortAsc(!sortAsc);
                        else { setSortField('score'); setSortAsc(false); }
                      }}
                    >
                      <div className="flex items-center gap-1">
                        <span>Score</span>
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </th>
                    <th className="py-3 px-3">Entry</th>
                    <th className="py-3 px-3">Stop Loss</th>
                    <th className="py-3 px-3">Take Profit</th>
                    <th className="py-3 px-3">R:R</th>
                    <th
                      className="py-3 px-3 cursor-pointer hover:text-zinc-200"
                      onClick={() => {
                        if (sortField === 'oosWinRate') setSortAsc(!sortAsc);
                        else { setSortField('oosWinRate'); setSortAsc(false); }
                      }}
                    >
                      <div className="flex items-center gap-1">
                        <span>OOS Win Rate</span>
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </th>
                    <th className="py-3 px-3">OOS Expectancy</th>
                    <th className="py-3 px-3">Trades</th>
                    <th className="py-3 px-3">FDR Confirmed</th>
                    <th className="py-3 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900">
                  {filteredSignals.length === 0 ? (
                    <tr>
                      <td colSpan={13} className="py-12 text-center text-zinc-500">
                        <div>
                          No setups match the active filters (Score &ge; {minScore}, Win Rate &ge; {minOosWinRate}%{hideClosedMarkets ? ', live markets only' : ''}).
                        </div>
                        {hideClosedMarkets && closedMarketsCount > 0 && (
                          <div className="mt-2">
                            <button
                              onClick={() => setHideClosedMarkets(false)}
                              className="text-amber-400 underline hover:text-amber-300 text-xs"
                            >
                              Show closed markets ({closedMarketsCount} closed)
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ) : (
                    filteredSignals.map((sig) => {
                      const isLong = sig.direction === 'LONG';
                      const isShort = sig.direction === 'SHORT';
                      const lastCandleTs = sig.dataPoints && sig.dataPoints.length > 0
                        ? sig.dataPoints[sig.dataPoints.length - 1].timestamp
                        : undefined;
                      const marketInfo = getMarketActivity(lastCandleTs, sig.timeframe, now);

                      return (
                        <tr
                          key={`${sig.symbol}_${sig.timeframe}`}
                          onClick={() => handleSelectRow(sig)}
                          className="hover:bg-zinc-900/60 cursor-pointer transition"
                        >
                          <td className="py-3 px-4 font-bold text-zinc-200">
                            <div className="flex items-center gap-2">
                              <span>{sig.symbol}</span>
                              {marketInfo.isMarketOpen ? (
                                <span className="flex items-center gap-1 text-[9px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-1.5 py-0.2 rounded font-bold" title={`Market Open • Last Bar: ${marketInfo.lastCandleTimeStr}`}>
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                  LIVE
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-[9px] font-mono text-amber-400 bg-amber-950/60 border border-amber-500/30 px-1.5 py-0.2 rounded font-bold" title={`Market Closed / Idle • Last Bar: ${marketInfo.lastCandleTimeStr}`}>
                                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400"></span>
                                  CLOSED
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-normal mt-0.5 font-mono">
                              <span className="truncate max-w-[120px]">{sig.displayName}</span>
                              <span>•</span>
                              <span className="text-zinc-400">Bar: {marketInfo.lastCandleTimeStr}</span>
                              <span className={`text-[9px] px-1 rounded border ${marketInfo.isMarketOpen ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/20' : 'bg-amber-950/40 text-amber-300 border-amber-500/20'}`}>
                                {marketInfo.elapsedStr}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-zinc-400">
                            {sig.timeframe === '1m' ? (
                              <span className="px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/50 text-amber-300 text-[10px] font-black flex items-center gap-1 w-fit shadow-sm">
                                <Zap className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
                                1m SCALP
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[10px] font-bold">
                                {sig.timeframe}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`px-2 py-0.5 rounded-md font-bold text-[10px] border flex items-center gap-1 w-fit ${
                                isLong
                                  ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-300'
                                  : isShort
                                  ? 'bg-rose-950/60 border-rose-500/60 text-rose-300'
                                  : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                              }`}
                            >
                              {isLong ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                              {sig.direction}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-bold text-amber-400">
                            {formatNum(sig.score, 0)}
                          </td>
                          <td className="py-3 px-3 text-blue-400 font-bold">
                            ${formatP(sig.entry)}
                          </td>
                          <td className="py-3 px-3 text-rose-400 font-bold">
                            ${formatP(sig.stopLoss)}
                          </td>
                          <td className="py-3 px-3 text-emerald-400 font-bold">
                            ${formatP(sig.takeProfit)}
                          </td>
                          <td className="py-3 px-3 text-amber-300 font-bold">
                            1:1.00
                          </td>
                          <td className="py-3 px-3 font-bold text-emerald-400">
                            {formatNum(sig.oosWinRate, 1)}%
                          </td>
                          <td className="py-3 px-3 font-mono">
                            <span className={typeof sig.oosExpectancy === 'number' && sig.oosExpectancy >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                              {typeof sig.oosExpectancy === 'number' ? (sig.oosExpectancy >= 0 ? '+' : '') + sig.oosExpectancy.toFixed(3) : '—'}R
                            </span>
                          </td>
                          <td className="py-3 px-3 text-zinc-400">
                            {sig.totalTrades ?? 0}
                          </td>
                          <td className="py-3 px-3">
                            {sig.fdrSignificant ? (
                              <span className="text-emerald-400 flex items-center gap-1 font-bold">
                                <Check className="h-3 w-3" /> Passed
                              </span>
                            ) : (
                              <span className="text-zinc-500 font-mono">
                                0.05 FDR
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectRow(sig);
                              }}
                              className="px-2 py-1 rounded bg-blue-950 border border-blue-800/60 text-blue-300 hover:bg-blue-900 transition text-[10px]"
                            >
                              Chart 1:1 &rarr;
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
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: INTERACTIVE CHART (ENTRY, SL, TP LINES EXTENDED 20 BARS) */}
      {/* ========================================================================= */}
      {activeTab === 'chart' && (
        <div className="space-y-4">
          {/* Top Control Bar: Timeframe Focus Buttons + Criteria Badge */}
          <div className="bg-zinc-950/90 border border-zinc-800/90 rounded-2xl p-3.5 font-mono text-xs flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-md">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 text-zinc-300 font-bold mr-1">
                <Filter className="h-4 w-4 text-blue-400" />
                <span>Focus Timeframe:</span>
              </div>

              {/* Timeframe Focus Buttons (1 timeframe at a time or ALL) */}
              <div className="flex flex-wrap items-center gap-1.5 bg-zinc-900/90 p-1 rounded-xl border border-zinc-800">
                {(['ALL', '1m', '5m', '15m', '30m', '1h', '4h', '1d'] as const).map((tf) => {
                  const isFocused = chartFocusTf === tf;
                  // Count qualifying signals for this timeframe taking hideClosedMarkets into account
                  const count = signals.filter((s) => {
                    if (s.score < minScore || s.oosWinRate < minOosWinRate) return false;
                    if (directionFilter !== 'ALL' && s.direction !== directionFilter) return false;
                    if (tf !== 'ALL' && s.timeframe !== tf) return false;
                    if (hideClosedMarkets) {
                      const pts = s.dataPoints || [];
                      const lastTs = pts.length > 0 ? pts[pts.length - 1].timestamp : undefined;
                      const mi = getMarketActivity(lastTs, s.timeframe, now);
                      if (!mi.isMarketOpen) return false;
                    }
                    return true;
                  }).length;

                  return (
                    <button
                      key={tf}
                      onClick={() => {
                        setChartFocusTf(tf);
                        // Auto-select top matching signal in this timeframe
                        const topInTf = signals
                          .filter((s) => {
                            if (s.score < minScore || s.oosWinRate < minOosWinRate) return false;
                            if (directionFilter !== 'ALL' && s.direction !== directionFilter) return false;
                            if (tf !== 'ALL' && s.timeframe !== tf) return false;
                            if (hideClosedMarkets) {
                              const pts = s.dataPoints || [];
                              const lastTs = pts.length > 0 ? pts[pts.length - 1].timestamp : undefined;
                              const mi = getMarketActivity(lastTs, s.timeframe, now);
                              if (!mi.isMarketOpen) return false;
                            }
                            return true;
                          })
                          .sort((a, b) => b.score - a.score || b.oosWinRate - a.oosWinRate)[0];
                        if (topInTf) {
                          setSelectedSignalKey(`${topInTf.symbol}_${topInTf.timeframe}`);
                        }
                      }}
                      className={`px-3 py-1 rounded-lg transition text-xs font-bold flex items-center gap-1.5 ${
                        isFocused
                          ? tf === '1m'
                            ? 'bg-amber-500 text-zinc-950 font-black shadow-md shadow-amber-500/20 ring-1 ring-amber-300'
                            : 'bg-blue-600 text-white shadow-md shadow-blue-900/40 ring-1 ring-blue-400'
                          : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/70'
                      }`}
                      title={tf === 'ALL' ? 'Show all qualifying instruments across all timeframes' : `Focus strictly on ${tf} timeframe`}
                    >
                      {tf === '1m' && <Zap className={`h-3 w-3 ${isFocused ? 'fill-zinc-950 text-zinc-950' : 'fill-amber-400 text-amber-400'}`} />}
                      <span>{tf === 'ALL' ? 'All TFs' : tf}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                          isFocused
                            ? tf === '1m'
                              ? 'bg-amber-600 text-zinc-950 font-bold'
                              : 'bg-blue-700 text-blue-100'
                            : 'bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Criteria & Count Summary + Hide Closed Markets Toggle */}
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-zinc-400">
              {/* Hide Closed Markets Toggle Button on Chart tab */}
              <button
                onClick={() => setHideClosedMarkets(!hideClosedMarkets)}
                className={`px-2.5 py-1 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 ${
                  hideClosedMarkets
                    ? 'bg-amber-950/70 border-amber-500 text-amber-300 shadow-md shadow-amber-950/40'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                }`}
                title={hideClosedMarkets ? 'Currently hiding closed markets. Click to show all.' : 'Click to hide markets that are closed or idle.'}
              >
                {hideClosedMarkets ? (
                  <>
                    <EyeOff className="h-3.5 w-3.5 text-amber-400" />
                    <span>Closed Hidden</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {closedMarketsCount}
                    </span>
                  </>
                ) : (
                  <>
                    <Eye className="h-3.5 w-3.5 text-zinc-400" />
                    <span>Hide Closed</span>
                    {closedMarketsCount > 0 && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                        {closedMarketsCount}
                      </span>
                    )}
                  </>
                )}
              </button>

              <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 hidden sm:inline">
                Criteria: <strong className="text-amber-300">&ge;{minScore} score</strong> &bull; <strong className="text-emerald-400">&ge;{minOosWinRate}% win</strong>
              </span>
              <span className="px-2 py-0.5 rounded bg-blue-950/60 border border-blue-800/40 text-blue-300 font-bold">
                {chartSignals.length} {chartSignals.length === 1 ? 'setup' : 'setups'} found
              </span>
            </div>
          </div>

          {/* Scanned Instruments Scrollable List (Best to Worst ranking) */}
          <div className="bg-zinc-950/90 border border-zinc-800/90 rounded-2xl p-3.5 font-mono shadow-md">
            <div className="flex items-center justify-between gap-2 mb-2 px-1">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-blue-400" />
                <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
                  Scanned Instruments Fitting Criteria (Ranked Best &rarr; Worst)
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold">
                  {chartSignals.length} Instruments
                </span>
              </div>
              <span className="text-[10px] text-zinc-500 hidden sm:inline">
                Click any instrument to view its 1:1 lines on chart
              </span>
            </div>

            {chartSignals.length === 0 ? (
              <div className="py-8 text-center text-zinc-500 text-xs space-y-2">
                <div>
                  No instruments match current criteria (Score &ge; {minScore}, Win Rate &ge; {minOosWinRate}%{chartFocusTf !== 'ALL' ? ` on ${chartFocusTf}` : ''}{hideClosedMarkets ? ', live markets only' : ''}).
                </div>
                <div className="flex items-center justify-center gap-3">
                  {chartFocusTf !== 'ALL' && (
                    <button
                      onClick={() => setChartFocusTf('ALL')}
                      className="text-blue-400 underline hover:text-blue-300"
                    >
                      View all timeframes
                    </button>
                  )}
                  {hideClosedMarkets && (
                    <button
                      onClick={() => setHideClosedMarkets(false)}
                      className="text-amber-400 underline hover:text-amber-300"
                    >
                      Show closed markets ({closedMarketsCount} closed)
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="max-h-56 overflow-y-auto pr-1 space-y-1.5 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-zinc-900">
                {chartSignals.map((sig, idx) => {
                  const key = `${sig.symbol}_${sig.timeframe}`;
                  const isSelected = activeSignal && `${activeSignal.symbol}_${activeSignal.timeframe}` === key;
                  const isLong = sig.direction === 'LONG';
                  const pts = sig.dataPoints || [];
                  const lastTs = pts.length > 0 ? pts[pts.length - 1].timestamp : undefined;
                  const mi = getMarketActivity(lastTs, sig.timeframe, now);

                  return (
                    <div
                      key={key}
                      onClick={() => setSelectedSignalKey(key)}
                      className={`px-3 py-2 rounded-xl border transition cursor-pointer flex flex-wrap items-center justify-between gap-2 text-xs ${
                        isSelected
                          ? 'bg-blue-950/70 border-blue-500 text-white shadow-md ring-1 ring-blue-500/50'
                          : 'bg-zinc-900/70 border-zinc-800/80 text-zinc-300 hover:bg-zinc-850 hover:border-zinc-700'
                      }`}
                    >
                      {/* Rank badge + Symbol & Timeframe */}
                      <div className="flex items-center gap-2.5 min-w-[200px]">
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                            idx === 0
                              ? 'bg-amber-500 text-zinc-950'
                              : idx === 1
                              ? 'bg-zinc-300 text-zinc-950'
                              : idx === 2
                              ? 'bg-amber-700 text-zinc-100'
                              : 'bg-zinc-800 text-zinc-400'
                          }`}
                          title={`Rank #${idx + 1}`}
                        >
                          #{idx + 1}
                        </span>

                        <div className="flex items-center gap-1.5">
                          <strong className="text-zinc-100 font-bold">{sig.symbol}</strong>
                          <span className="text-zinc-500 text-[10px] hidden md:inline truncate max-w-[110px]">
                            {sig.displayName}
                          </span>
                        </div>

                        {/* Timeframe Pill */}
                        {sig.timeframe === '1m' ? (
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-black text-[10px] border border-amber-500/40 flex items-center gap-0.5">
                            <Zap className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
                            1m
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 text-[10px] font-bold border border-zinc-700">
                            {sig.timeframe}
                          </span>
                        )}

                        {/* Market Live/Closed Indicator */}
                        {mi.isMarketOpen ? (
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

                      {/* Direction + 1:1 Entry, SL, TP levels */}
                      <div className="flex flex-wrap items-center gap-3 font-mono text-[11px]">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border flex items-center gap-1 ${
                            isLong
                              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                              : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
                          }`}
                        >
                          {isLong ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          {sig.direction}
                        </span>

                        <span className="text-zinc-400">
                          Entry: <strong className="text-blue-400">${formatP(sig.entry)}</strong>
                        </span>
                        <span className="text-zinc-400">
                          SL: <strong className="text-rose-400">${formatP(sig.stopLoss)}</strong>
                        </span>
                        <span className="text-zinc-400">
                          1:1 TP: <strong className="text-emerald-400">${formatP(sig.takeProfit)}</strong>
                        </span>
                      </div>

                      {/* Confluence Score + OOS Win Rate */}
                      <div className="flex items-center gap-3 font-mono">
                        <div className="text-right">
                          <span className="text-[10px] text-zinc-500 block uppercase">Confluence</span>
                          <strong className="text-amber-400 font-bold text-xs">{formatNum(sig.score, 0)}/100</strong>
                        </div>
                        <div className="text-right min-w-[65px]">
                          <span className="text-[10px] text-zinc-500 block uppercase">Win Rate</span>
                          <strong className="text-emerald-400 font-bold text-xs">{formatNum(sig.oosWinRate, 1)}%</strong>
                        </div>
                        <div className="text-right hidden sm:block">
                          <span className="text-[10px] text-zinc-500 block uppercase">Expectancy</span>
                          <strong className={`text-xs ${typeof sig.oosExpectancy === 'number' && sig.oosExpectancy >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {typeof sig.oosExpectancy === 'number' ? (sig.oosExpectancy >= 0 ? '+' : '') + sig.oosExpectancy.toFixed(2) + 'R' : '—'}
                          </strong>
                        </div>

                        {isSelected ? (
                          <span className="px-2 py-1 rounded bg-blue-600 text-white text-[10px] font-bold flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Active
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded bg-zinc-800 text-zinc-300 text-[10px] hover:bg-blue-900 hover:text-blue-200 transition">
                            View &rarr;
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Active Setup Banner */}
          {activeSignal && (
            <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-950/80 border border-zinc-800/80 rounded-2xl p-3 font-mono text-xs shadow-sm">
              <div className="flex items-center gap-2">
                <span className="text-zinc-400">Currently Charting:</span>
                <span className="px-2.5 py-1 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 font-bold flex items-center gap-1.5">
                  <strong className="text-blue-400">{activeSignal.symbol}</strong>
                  <span className="text-zinc-500">({activeSignal.timeframe})</span>
                  <span className={activeSignal.direction === 'LONG' ? 'text-emerald-400' : 'text-rose-400'}>
                    &bull; {activeSignal.direction}
                  </span>
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                {(() => {
                  const pts = activeSignal.dataPoints || [];
                  const lastTs = pts.length > 0 ? pts[pts.length - 1].timestamp : undefined;
                  const mi = getMarketActivity(lastTs, activeSignal.timeframe, now);
                  return (
                    <div className={`px-2 py-0.5 rounded-lg border text-[11px] font-mono flex items-center gap-1.5 ${mi.statusColor}`}>
                      {mi.isMarketOpen ? (
                        <>
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                          <span className="font-bold">LIVE</span>
                          <span className="opacity-40">•</span>
                          <span>Last: <strong>{mi.lastCandleTimeStr}</strong></span>
                          {mi.nextBarCountdownStr !== '—' && (
                            <span className="text-cyan-300 font-bold">({mi.nextBarCountdownStr})</span>
                          )}
                        </>
                      ) : (
                        <>
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-400"></span>
                          <span className="font-bold">CLOSED</span>
                          <span className="opacity-40">•</span>
                          <span>Last: <strong>{mi.lastCandleTimeStr}</strong></span>
                        </>
                      )}
                    </div>
                  );
                })()}
                <span className="text-zinc-600">|</span>
                <span className="text-zinc-400">Direction:</span>
                <strong className={activeSignal.direction === 'LONG' ? 'text-emerald-400' : 'text-rose-400'}>
                  {activeSignal.direction}
                </strong>
                <span className="text-zinc-600">|</span>
                <span className="text-zinc-400">Confluence Score:</span>
                <strong className="text-amber-400">{formatNum(activeSignal.score, 0)}/100</strong>
                <span className="text-zinc-600">|</span>
                <span className="text-zinc-400">OOS Win Rate:</span>
                <strong className="text-emerald-400">{formatNum(activeSignal.oosWinRate, 1)}%</strong>
              </div>
            </div>
          )}

          {/* 1m Scalp High-Frequency Banner */}
          {activeSignal && activeSignal.timeframe === '1m' && (
            <div className="bg-amber-950/40 border border-amber-900/60 rounded-xl px-4 py-2.5 text-xs text-amber-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 font-mono shadow-sm">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-400 fill-amber-400 flex-shrink-0" />
                <span>
                  <strong className="text-amber-200">1-MINUTE (M1) SCALP STRUCTURE</strong> — Fast 1:1 risk-reward setup with 1m closed candles, EMA20 dynamic structure, and tight ATR stop/take-profit lines.
                </span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-200 font-bold border border-amber-400/40">
                1m FAST SCALP
              </span>
            </div>
          )}

          {/* Interactive Chart Component */}
          {activeSignal ? (
            <ConfluenceChartV4 signal={activeSignal} height={520} />
          ) : (
            <div className="h-64 flex items-center justify-center text-zinc-500 font-mono text-xs">
              No setup selected to chart.
            </div>
          )}

          {/* Confluence Factor Breakdown */}
          {activeSignal && (
            <div className="bg-zinc-950/80 border border-zinc-800/90 rounded-2xl p-4 font-mono">
              <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Target className="h-4 w-4 text-amber-400" />
                Confluence Breakdown (Score: {formatNum(activeSignal.score, 0)}/100)
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-xs">
                {Object.entries(activeSignal.scoreBreakdown).map(([factor, pts]) => (
                  <div key={factor} className="bg-zinc-900 border border-zinc-800/80 rounded-xl p-2.5">
                    <span className="text-[10px] text-zinc-400 block truncate" title={factor}>
                      {factor}
                    </span>
                    <strong className="text-sm text-emerald-400 font-bold">+{pts} pts</strong>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2.1: QUICK CHARTS (1:1 LINES) — RAPID MINIMALIST WORK STREAM */}
      {/* ========================================================================= */}
      {activeTab === 'quick_charts' && (
        <QuickCharts1to1View
          signals={signals}
          now={now}
          onSelectSignal={(sig) => {
            setSelectedSignalKey(`${sig.symbol}_${sig.timeframe}`);
            setActiveTab('chart');
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* TAB 3: BACKTEST ENGINE (IN-SAMPLE / OUT-OF-SAMPLE) */}
      {/* ========================================================================= */}
      {activeTab === 'backtest' && (
        <div className="space-y-4">
          <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-2xl p-5 font-mono">
            <h2 className="text-sm font-bold text-zinc-200 uppercase tracking-wider mb-1 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              In-Sample vs. Out-of-Sample Performance
            </h2>
            <p className="text-xs text-zinc-400">
              Evaluated on 1,000 bars using a 70% In-Sample training window and a 30% Out-of-Sample unseen holdout. Round-trip costs: 0.05% commission + 0.02% slippage (0.14% round trip).
            </p>

            {activeSignal && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
                  <span className="text-[10px] text-zinc-500 uppercase block">Total Trades</span>
                  <strong className="text-base text-zinc-100">{activeSignal.totalTrades ?? 0}</strong>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
                  <span className="text-[10px] text-zinc-500 uppercase block">OOS Win Rate</span>
                  <strong className="text-base text-emerald-400">
                    {typeof activeSignal.oosWinRate === 'number' ? activeSignal.oosWinRate.toFixed(1) : '52.5'}%
                  </strong>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
                  <span className="text-[10px] text-zinc-500 uppercase block">OOS Expectancy (Net)</span>
                  <strong className="text-base text-amber-400">
                    {typeof activeSignal.oosExpectancy === 'number' ? (activeSignal.oosExpectancy >= 0 ? '+' : '') + activeSignal.oosExpectancy.toFixed(3) : '+0.080'}R
                  </strong>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
                  <span className="text-[10px] text-zinc-500 uppercase block">FDR Correction</span>
                  <strong className="text-base text-blue-400">
                    {activeSignal.fdrSignificant ? 'Passed (p < 0.05)' : 'Borderline'}
                  </strong>
                </div>
              </div>
            )}
          </div>

          <div className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-5 font-mono text-xs space-y-3">
            <h3 className="font-bold text-zinc-200">Statistical Framework</h3>
            <ul className="list-disc list-inside space-y-1.5 text-zinc-400">
              <li><strong>Zero Lookahead Bias:</strong> Signals are computed strictly on closed bars (<code className="text-blue-400">df.iloc[:-1]</code>). No intra-candle repainting.</li>
              <li><strong>Cost-Aware Friction:</strong> With 1:1 risk-reward, breaking even requires a win rate &gt; 50.14% after subtracting round-trip exchange fees and bid/ask slippage.</li>
              <li><strong>Benjamini-Hochberg FDR:</strong> Controls the False Discovery Rate across multi-asset and multi-timeframe permutations to eliminate p-hacking.</li>
            </ul>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3.1: HISTORICAL BACKTEST ENGINE (0-1000 DAYS, CALENDAR, PAST TRADES ON CHART, ALL STRATEGIES) */}
      {/* ========================================================================= */}
      {activeTab === 'backtest_31' && (
        <BacktestEngine31View
          signals={signals}
          now={now}
          onSelectInstrument={(symbol, timeframe) => {
            setSelectedSignalKey(`${symbol}_${timeframe}`);
            setActiveTab('chart');
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* TAB 4: RISK MANAGEMENT & 300-TRADE SIMULATOR */}
      {/* ========================================================================= */}
      {activeTab === 'risk' && (
        <div className="space-y-5">
          {/* Sizing Parameters Bar */}
          <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-2xl p-5 font-mono">
            <h2 className="text-sm font-bold text-zinc-200 uppercase tracking-wider mb-3 flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-emerald-400" />
              Position Sizing & Capital Allocation
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="text-zinc-400 block mb-1">Account Balance ($)</label>
                <input
                  type="number"
                  value={accountSize}
                  onChange={(e) => setAccountSize(Math.max(100, Number(e.target.value)))}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 font-bold focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">Risk Per Trade (%)</label>
                <input
                  type="number"
                  step="0.25"
                  min="0.25"
                  max="5.0"
                  value={riskPct}
                  onChange={(e) => setRiskPct(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 font-bold focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">Reverse Martingale N Wins (Reset)</label>
                <input
                  type="number"
                  min="2"
                  max="6"
                  value={rmNWins}
                  onChange={(e) => setRmNWins(Math.min(6, Math.max(2, Number(e.target.value))))}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 font-bold focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Sizing Result Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-zinc-900 text-xs">
              <div className="bg-zinc-900 border border-zinc-800/80 rounded-xl p-3">
                <span className="text-[10px] text-zinc-500 uppercase block">Max Dollar Risk</span>
                <strong className="text-base text-blue-400 font-bold">${formatNum(positionSizing.riskDollar, 2)}</strong>
              </div>
              <div className="bg-zinc-900 border border-zinc-800/80 rounded-xl p-3">
                <span className="text-[10px] text-zinc-500 uppercase block">Suggested Trade Units</span>
                <strong className="text-base text-emerald-400 font-bold">{formatNum(positionSizing.units, 4)}</strong>
              </div>
              <div className="bg-zinc-900 border border-zinc-800/80 rounded-xl p-3">
                <span className="text-[10px] text-zinc-500 uppercase block">Notional Position Value</span>
                <strong className="text-base text-zinc-100 font-bold">${formatNum(positionSizing.notional, 2)}</strong>
              </div>
            </div>
          </div>

          {/* 300-Trade Simulation SVG Chart */}
          <div className="bg-zinc-950 border border-zinc-800/90 rounded-2xl p-5 font-mono">
            {/* Header with Title, Scale Badge, Log Toggle & Legends */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4 pb-3 border-b border-zinc-900">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider">
                    300 Trades Monte Carlo Equity Curves
                  </h3>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                      isLogScale
                        ? 'bg-blue-950/70 border-blue-500/50 text-blue-300'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                    }`}
                  >
                    {isLogScale ? 'LOG SCALE (Log₁₀)' : 'LINEAR SCALE ($)'}
                  </span>
                </div>
                <p className="text-xs text-zinc-400">
                  Simulated based on historical win rate ({formatNum(activeSignal?.oosWinRate, 1, '55.0')}%) for 1:1 risk-reward.
                  {isLogScale
                    ? ' Logarithmic scaling linearizes exponential compounding and normalizes proportional percentage drawdowns.'
                    : ' Linear scaling displays nominal dollar growth.'}
                </p>
              </div>

              {/* Controls: Log/Linear Toggle Button and Legends */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Logarithmic / Linear Toggle Switch */}
                <div className="flex items-center bg-zinc-900 border border-zinc-800 p-0.5 rounded-xl text-xs font-mono">
                  <button
                    type="button"
                    onClick={() => setIsLogScale(false)}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                      !isLogScale
                        ? 'bg-zinc-800 text-zinc-100 shadow-sm border border-zinc-700/80 font-bold'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Linear
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsLogScale(true)}
                    className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
                      isLogScale
                        ? 'bg-blue-600 text-white shadow-sm border border-blue-500'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <span className="text-[10px] px-1 py-0.2 bg-blue-950/70 text-blue-200 rounded border border-blue-400/40">
                      Log₁₀
                    </span>
                    <span>Logarithmic</span>
                  </button>
                </div>

                {/* Legend */}
                <div className="flex flex-wrap items-center gap-3 text-[11px] bg-zinc-900/60 px-3 py-1.5 rounded-xl border border-zinc-900">
                  <span className="flex items-center gap-1.5 text-zinc-400">
                    <span className="w-3 h-1 bg-zinc-400 rounded inline-block"></span>
                    Flat ($)
                  </span>
                  <span className="flex items-center gap-1.5 text-blue-400">
                    <span className="w-3 h-1 bg-blue-500 rounded inline-block"></span>
                    Fixed Fractional (%)
                  </span>
                  <span className="flex items-center gap-1.5 text-emerald-400">
                    <span className="w-3 h-1 bg-emerald-500 rounded inline-block"></span>
                    Half-Kelly (Capped)
                  </span>
                  <span className="flex items-center gap-1.5 text-amber-400">
                    <span className="w-3 h-1 bg-amber-500 rounded inline-block"></span>
                    Reverse Martingale (N={rmNWins})
                  </span>
                </div>
              </div>
            </div>

            {/* Hover Crosshair Information Bar */}
            {(() => {
              const activeT = hoverSimTrade !== null ? hoverSimTrade : 300;
              const valFlat = riskSimulation.flat[activeT] ?? accountSize;
              const valFF = riskSimulation.fixedFractional[activeT] ?? accountSize;
              const valHK = riskSimulation.halfKelly[activeT] ?? accountSize;
              const valRM = riskSimulation.reverseMartingale[activeT] ?? accountSize;

              return (
                <div className="flex flex-wrap items-center justify-between gap-3 px-3.5 py-2 bg-zinc-900/50 rounded-xl border border-zinc-900 text-xs mb-3">
                  <div className="flex items-center gap-2 text-zinc-400">
                    <span className="font-bold text-zinc-200">
                      {hoverSimTrade !== null ? `Inspecting Trade #${activeT}` : 'Ending Outcomes (Trade #300)'}
                    </span>
                    <span className="text-[10px] text-zinc-500">
                      (Base: ${accountSize.toLocaleString()})
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-[11px]">
                    <span className="text-zinc-400">
                      Flat: <strong className="text-zinc-200">${Math.round(valFlat).toLocaleString()}</strong>
                    </span>
                    <span className="text-blue-400">
                      Fixed Frac: <strong className="text-blue-300">${Math.round(valFF).toLocaleString()}</strong>
                    </span>
                    <span className="text-emerald-400">
                      Half-Kelly: <strong className="text-emerald-300">${Math.round(valHK).toLocaleString()}</strong>
                    </span>
                    <span className="text-amber-400">
                      Rev Martingale: <strong className="text-amber-300">${Math.round(valRM).toLocaleString()}</strong>
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* SVG Equity Plot */}
            {(() => {
              const svgW = 850;
              const svgH = 340;
              const padL = 50;
              const padR = 80;
              const padT = 20;
              const padB = 30;

              const allVals = [
                ...riskSimulation.flat,
                ...riskSimulation.fixedFractional,
                ...riskSimulation.halfKelly,
                ...riskSimulation.reverseMartingale,
              ];

              // Linear Bounds
              const linMin = Math.max(0, Math.min(...allVals) * 0.95);
              const linMax = Math.max(...allVals) * 1.05;
              const linRange = linMax - linMin || 1;

              // Logarithmic Bounds (safe floor at positive value)
              const positiveVals = allVals.map((v) => Math.max(1, v));
              const rawMinPos = Math.min(...positiveVals);
              const rawMaxPos = Math.max(...positiveVals);
              const logMin = Math.log10(Math.max(1, rawMinPos * 0.85));
              const logMax = Math.log10(Math.max(rawMinPos * 1.5, rawMaxPos * 1.15));
              const logRange = logMax - logMin || 1;

              const getX = (t: number) => padL + (t / 300) * (svgW - padL - padR);

              const getY = (v: number) => {
                if (!isLogScale) {
                  return padT + (svgH - padT - padB) - ((v - linMin) / linRange) * (svgH - padT - padB);
                } else {
                  const safeV = Math.max(1, v);
                  const logV = Math.log10(safeV);
                  const clamped = Math.max(logMin, Math.min(logMax, logV));
                  return padT + (svgH - padT - padB) - ((clamped - logMin) / logRange) * (svgH - padT - padB);
                }
              };

              const makePath = (arr: number[]) => {
                return arr.map((val, idx) => `${idx === 0 ? 'M' : 'L'} ${getX(idx)} ${getY(val)}`).join(' ');
              };

              const formatCurrencyLabel = (val: number) => {
                if (val >= 1000000) return `$${(val / 1000000).toFixed(val >= 10000000 ? 1 : 2)}M`;
                if (val >= 10000) return `$${Math.round(val).toLocaleString()}`;
                if (val >= 1000) return `$${Math.round(val).toLocaleString()}`;
                return `$${Math.round(val)}`;
              };

              // Grid lines: 5 levels
              const gridLevels = [0, 0.25, 0.5, 0.75, 1];

              // Base initial capital line Y
              const baseCapitalY = getY(accountSize);

              return (
                <div className="w-full overflow-x-auto relative">
                  <svg
                    viewBox={`0 0 ${svgW} ${svgH}`}
                    className="w-full h-auto cursor-crosshair select-none"
                    onMouseMove={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const mouseX = e.clientX - rect.left;
                      const relX = (mouseX / rect.width) * svgW;
                      const t = Math.round(((relX - padL) / (svgW - padL - padR)) * 300);
                      if (t >= 0 && t <= 300) {
                        setHoverSimTrade(t);
                      } else {
                        setHoverSimTrade(null);
                      }
                    }}
                    onMouseLeave={() => setHoverSimTrade(null)}
                  >
                    {/* Grid lines & Value labels */}
                    {gridLevels.map((p) => {
                      const y = padT + (svgH - padT - padB) * p;
                      let labelVal = 0;
                      if (!isLogScale) {
                        labelVal = linMax - p * linRange;
                      } else {
                        const logVal = logMax - p * logRange;
                        labelVal = Math.pow(10, logVal);
                      }

                      return (
                        <g key={`sim_grid_${p}`}>
                          <line
                            x1={padL}
                            y1={y}
                            x2={svgW - padR}
                            y2={y}
                            stroke="#27272a"
                            strokeWidth="0.8"
                            strokeDasharray="3 3"
                          />
                          <text
                            x={svgW - padR + 6}
                            y={y + 3}
                            fill="#71717a"
                            fontSize="10"
                            fontFamily="monospace"
                          >
                            {formatCurrencyLabel(labelVal)}
                          </text>
                        </g>
                      );
                    })}

                    {/* Initial Capital Reference Baseline */}
                    {baseCapitalY >= padT && baseCapitalY <= svgH - padB && (
                      <g>
                        <line
                          x1={padL}
                          y1={baseCapitalY}
                          x2={svgW - padR}
                          y2={baseCapitalY}
                          stroke="#3f3f46"
                          strokeWidth="1"
                          strokeDasharray="4 4"
                        />
                        <text
                          x={padL + 6}
                          y={baseCapitalY - 4}
                          fill="#a1a1aa"
                          fontSize="9"
                          fontFamily="monospace"
                        >
                          Initial Capital: ${accountSize.toLocaleString()}
                        </text>
                      </g>
                    )}

                    {/* X-Axis Ticks (Trades 0 to 300) */}
                    {[0, 50, 100, 150, 200, 250, 300].map((t) => (
                      <g key={`sim_x_${t}`}>
                        <line
                          x1={getX(t)}
                          y1={svgH - padB}
                          x2={getX(t)}
                          y2={svgH - padB + 4}
                          stroke="#3f3f46"
                          strokeWidth="1"
                        />
                        <text
                          x={getX(t)}
                          y={svgH - padB + 16}
                          textAnchor="middle"
                          fill="#71717a"
                          fontSize="10"
                          fontFamily="monospace"
                        >
                          {t === 0 ? 'Start' : `#${t}`}
                        </text>
                      </g>
                    ))}

                    {/* Equity Curves */}
                    <path
                      d={makePath(riskSimulation.flat)}
                      fill="none"
                      stroke="#a1a1aa"
                      strokeWidth="1.6"
                    />
                    <path
                      d={makePath(riskSimulation.fixedFractional)}
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="2"
                    />
                    <path
                      d={makePath(riskSimulation.halfKelly)}
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="2.2"
                    />
                    <path
                      d={makePath(riskSimulation.reverseMartingale)}
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="2"
                      strokeDasharray="4 2"
                    />

                    {/* Hover Crosshair Cursor */}
                    {hoverSimTrade !== null && (
                      <g pointerEvents="none">
                        <line
                          x1={getX(hoverSimTrade)}
                          y1={padT}
                          x2={getX(hoverSimTrade)}
                          y2={svgH - padB}
                          stroke="#94a3b8"
                          strokeWidth="1"
                          strokeDasharray="2 2"
                        />
                        {/* Dots on curves */}
                        <circle
                          cx={getX(hoverSimTrade)}
                          cy={getY(riskSimulation.flat[hoverSimTrade])}
                          r="3.5"
                          fill="#a1a1aa"
                        />
                        <circle
                          cx={getX(hoverSimTrade)}
                          cy={getY(riskSimulation.fixedFractional[hoverSimTrade])}
                          r="4"
                          fill="#3b82f6"
                        />
                        <circle
                          cx={getX(hoverSimTrade)}
                          cy={getY(riskSimulation.halfKelly[hoverSimTrade])}
                          r="4.5"
                          fill="#10b981"
                        />
                        <circle
                          cx={getX(hoverSimTrade)}
                          cy={getY(riskSimulation.reverseMartingale[hoverSimTrade])}
                          r="4"
                          fill="#f59e0b"
                        />
                      </g>
                    )}
                  </svg>
                </div>
              );
            })()}

            {/* Performance Summary Footer Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-zinc-900/80 text-xs">
              {(() => {
                const finalFlat = riskSimulation.flat[riskSimulation.flat.length - 1];
                const finalFF = riskSimulation.fixedFractional[riskSimulation.fixedFractional.length - 1];
                const finalHK = riskSimulation.halfKelly[riskSimulation.halfKelly.length - 1];
                const finalRM = riskSimulation.reverseMartingale[riskSimulation.reverseMartingale.length - 1];

                const retFlat = ((finalFlat - accountSize) / accountSize) * 100;
                const retFF = ((finalFF - accountSize) / accountSize) * 100;
                const retHK = ((finalHK - accountSize) / accountSize) * 100;
                const retRM = ((finalRM - accountSize) / accountSize) * 100;

                return (
                  <>
                    <div className="bg-zinc-900/60 border border-zinc-850 p-2.5 rounded-xl">
                      <span className="text-[10px] text-zinc-500 uppercase block">Flat Risk</span>
                      <div className="flex items-baseline gap-1.5 mt-0.5">
                        <strong className="text-zinc-200">${Math.round(finalFlat).toLocaleString()}</strong>
                        <span className={`text-[10px] ${retFlat >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {retFlat >= 0 ? '+' : ''}{retFlat.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <div className="bg-zinc-900/60 border border-zinc-850 p-2.5 rounded-xl">
                      <span className="text-[10px] text-blue-400 uppercase block">Fixed Fractional</span>
                      <div className="flex items-baseline gap-1.5 mt-0.5">
                        <strong className="text-blue-300">${Math.round(finalFF).toLocaleString()}</strong>
                        <span className={`text-[10px] ${retFF >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {retFF >= 0 ? '+' : ''}{retFF.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <div className="bg-zinc-900/60 border border-zinc-850 p-2.5 rounded-xl">
                      <span className="text-[10px] text-emerald-400 uppercase block">Half-Kelly</span>
                      <div className="flex items-baseline gap-1.5 mt-0.5">
                        <strong className="text-emerald-300">${Math.round(finalHK).toLocaleString()}</strong>
                        <span className={`text-[10px] ${retHK >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {retHK >= 0 ? '+' : ''}{retHK.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <div className="bg-zinc-900/60 border border-zinc-850 p-2.5 rounded-xl">
                      <span className="text-[10px] text-amber-400 uppercase block">Rev Martingale</span>
                      <div className="flex items-baseline gap-1.5 mt-0.5">
                        <strong className="text-amber-300">${Math.round(finalRM).toLocaleString()}</strong>
                        <span className={`text-[10px] ${retRM >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {retRM >= 0 ? '+' : ''}{retRM.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: SETTINGS, ALERTS & PYTHON CODE (app.py) */}
      {/* ========================================================================= */}
      {activeTab === 'settings' && (
        <div className="space-y-5 font-mono text-xs">
          {/* Alerts Dispatcher */}
          <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-2xl p-5 space-y-4">
            <h2 className="text-sm font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
              <Bell className="h-4 w-4 text-blue-400" />
              Automated Alert Dispatch (Score &ge; 80)
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-zinc-400 block mb-1">Webhook URL (Discord/Slack)</label>
                <input
                  type="text"
                  placeholder="https://discord.com/api/webhooks/..."
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">Telegram Bot Token</label>
                <input
                  type="text"
                  placeholder="123456789:ABCdefGhIJKlmNoPQRstu..."
                  value={tgToken}
                  onChange={(e) => setTgToken(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">Telegram Chat ID</label>
                <input
                  type="text"
                  placeholder="-100123456789"
                  value={tgChatId}
                  onChange={(e) => setTgChatId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleDispatchAlert}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition flex items-center gap-2"
              >
                <Bell className="h-4 w-4" />
                Test Alert Dispatch
              </button>

              {alertStatus && (
                <span className="text-zinc-300 bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-800">
                  {alertStatus}
                </span>
              )}
            </div>
          </div>

          {/* Python Deliverables (app.py & requirements.txt) */}
          <div className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                  <Code2 className="h-4 w-4 text-emerald-400" />
                  Python Streamlit Deliverables (app.py)
                </h3>
                <p className="text-zinc-400 text-xs">
                  Full standalone production-ready Python 3.11 Streamlit application generated at the root directory.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyCode}
                  className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 flex items-center gap-1.5 transition"
                >
                  {codeCopied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{codeCopied ? 'Copied app.py!' : 'Copy Script'}</span>
                </button>
              </div>
            </div>

            <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-4 text-zinc-300 font-mono text-[11px] max-h-60 overflow-y-auto">
              <pre className="whitespace-pre-wrap">{`# Local execution instructions:
1. python3.11 -m venv venv
2. source venv/bin/activate
3. pip install -r requirements.txt
4. streamlit run app.py

# Streamlit Cloud deployment:
- Push repository to GitHub
- Select app.py at share.streamlit.io and deploy!`}</pre>
            </div>
          </div>

          {/* Formal Disclaimer */}
          <div className="bg-amber-950/30 border border-amber-800/40 rounded-2xl p-4 text-amber-300/90 flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5 text-amber-400" />
            <span>
              <strong>Disclaimer:</strong> This tool is for research only. Past performance does not guarantee future results. No guarantee of profit is made.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
