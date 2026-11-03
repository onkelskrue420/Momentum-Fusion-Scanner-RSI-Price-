import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  MathBacktestConfig,
  SimulatedTrade,
  SimulationSummary,
  SCENARIO_PRESETS,
  ScenarioPreset,
  runMathScenarioSimulation,
  evaluateCustomEquation,
  generateHeatmapMatrix
} from '../lib/mathSimulator';
import {
  Calculator,
  TrendingUp,
  TrendingDown,
  RotateCw,
  Download,
  Percent,
  DollarSign,
  CheckCircle2,
  HelpCircle,
  Sparkles,
  Layers,
  ShieldCheck,
  Scale,
  Activity,
  Code,
  Info,
  Sliders,
  Check,
  Shuffle,
  BarChart2,
  Zap,
  Swords,
  Dice5,
  AlertTriangle,
  Flame,
  ShieldAlert,
  Clock,
  Compass,
  Trophy,
  Maximize2
} from 'lucide-react';

type LabSubTab = 'equity' | 'monte_carlo' | 'duel' | 'risk_ruin' | 'heatmap';

export default function Version5View() {
  // Active Sub-Tab within Version 5 Math Lab
  const [activeTab, setActiveTab] = useState<LabSubTab>('equity');

  // 1. Primary Strategy Configuration (Scenario A)
  const [config, setConfig] = useState<MathBacktestConfig>(() => ({
    tradesCount: 100,
    winRate: 50,
    riskRewardRatio: 2.0,
    riskMode: 'percent',
    riskValue: 1.0,
    compoundEquity: false,
    initialCapital: 10000,
    equation: 'isWin ? (risk * rrr) : -risk',
    feePerTrade: 0,
    distributionMode: 'exact',
    sequenceArrangement: 'shuffled',
    enableMonteCarlo: true,
    monteCarloSimulationsCount: 100,
    randomSeed: Math.floor(Math.random() * 1000000)
  }));

  // 2. Secondary Strategy Configuration for Strategy Duel (Scenario B)
  const [configB, setConfigB] = useState<MathBacktestConfig>(() => ({
    tradesCount: 100,
    winRate: 40,
    riskRewardRatio: 3.0,
    riskMode: 'percent',
    riskValue: 1.0,
    compoundEquity: false,
    initialCapital: 10000,
    equation: 'isWin ? (risk * rrr) : -risk',
    feePerTrade: 0,
    distributionMode: 'exact',
    sequenceArrangement: 'shuffled',
    enableMonteCarlo: false,
    monteCarloSimulationsCount: 50,
    randomSeed: Math.floor(Math.random() * 1000000)
  }));

  const [selectedPresetId, setSelectedPresetId] = useState<string>('classic_trend_1_2');
  const [showEquationHelp, setShowEquationHelp] = useState(false);
  const [chartViewMode, setChartViewMode] = useState<'equity' | 'drawdown'>('equity');
  const [tableFilter, setTableFilter] = useState<'ALL' | 'WINS' | 'LOSSES'>('ALL');
  const [tablePage, setTablePage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [hoveredTradeIndex, setHoveredTradeIndex] = useState<number | null>(null);

  // Responsive Chart Container measurement
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [chartWidth, setChartWidth] = useState<number>(900);

  useEffect(() => {
    if (!chartContainerRef.current) return;
    const updateWidth = () => {
      if (chartContainerRef.current) {
        const clientW = chartContainerRef.current.clientWidth;
        if (clientW > 50) {
          setChartWidth(clientW);
        }
      }
    };
    updateWidth();

    const observer = new ResizeObserver(updateWidth);
    observer.observe(chartContainerRef.current);
    window.addEventListener('resize', updateWidth);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateWidth);
    };
  }, [activeTab]);

  // Primary Simulation Summary (Strategy A)
  const summary: SimulationSummary = useMemo(() => {
    return runMathScenarioSimulation(config);
  }, [config]);

  // Secondary Simulation Summary for Duel (Strategy B)
  const summaryB: SimulationSummary = useMemo(() => {
    return runMathScenarioSimulation(configB);
  }, [configB]);

  // 2D Parameter Heatmap Grid
  const heatmapData = useMemo(() => {
    return generateHeatmapMatrix(
      config.winRate,
      config.riskRewardRatio,
      config.tradesCount,
      config.riskMode === 'percent' ? config.riskValue : (config.riskValue / config.initialCapital) * 100
    );
  }, [config.winRate, config.riskRewardRatio, config.tradesCount, config.riskMode, config.riskValue, config.initialCapital]);

  // Live equation syntax dry-run
  const equationTest = useMemo(() => {
    const testRisk = config.riskMode === 'percent' ? (config.initialCapital * config.riskValue) / 100 : config.riskValue;
    const winResult = evaluateCustomEquation(config.equation, {
      equity: config.initialCapital,
      initialCapital: config.initialCapital,
      risk: testRisk,
      rrr: config.riskRewardRatio,
      winRate: config.winRate / 100,
      isWin: true,
      streak: 1,
      fee: config.feePerTrade || 0,
      tradeNum: 1,
      randomVal: 0.5
    });
    const lossResult = evaluateCustomEquation(config.equation, {
      equity: config.initialCapital,
      initialCapital: config.initialCapital,
      risk: testRisk,
      rrr: config.riskRewardRatio,
      winRate: config.winRate / 100,
      isWin: false,
      streak: -1,
      fee: config.feePerTrade || 0,
      tradeNum: 2,
      randomVal: 0.5
    });

    return {
      isValid: !winResult.error && !lossResult.error,
      error: winResult.error || lossResult.error,
      sampleWinPnl: winResult.pnl,
      sampleLossPnl: lossResult.pnl
    };
  }, [config.equation, config.initialCapital, config.riskMode, config.riskValue, config.riskRewardRatio, config.winRate, config.feePerTrade]);

  // Re-roll seed
  const handleReroll = () => {
    const newSeed = Math.floor(Math.random() * 10000000);
    setConfig(prev => ({ ...prev, randomSeed: newSeed }));
  };

  // Load a preset
  const handleLoadPreset = (preset: ScenarioPreset) => {
    setSelectedPresetId(preset.id);
    setConfig(prev => ({
      ...prev,
      ...preset.config,
      distributionMode: 'exact',
      enableMonteCarlo: true,
      randomSeed: Math.floor(Math.random() * 10000000)
    }));
    setTablePage(1);
  };

  // Insert equation snippet helper
  const insertEquationSnippet = (snippet: string) => {
    setConfig(prev => ({ ...prev, equation: snippet }));
  };

  // Export trade-by-trade ledger to CSV
  const handleExportCSV = () => {
    if (!summary.trades.length) return;
    const headers = ['Trade#', 'Result', 'EquityBefore', 'RiskAmount', 'RealizedR', 'PnL($)', 'PnL(%)', 'EquityAfter', 'Drawdown(%)', 'Streak'];
    const rows = summary.trades.map(t => [
      t.tradeNum,
      t.isWin ? 'WIN' : 'LOSS',
      t.equityBefore.toFixed(2),
      t.riskAmount.toFixed(2),
      t.rewardMultiplier.toFixed(2),
      t.pnlDollar.toFixed(2),
      t.pnlPercent.toFixed(2),
      t.equityAfter.toFixed(2),
      t.drawdownPercent.toFixed(2),
      t.streak
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `trade_scenario_${config.winRate}wr_${config.riskRewardRatio}rrr.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered & Paginated Trades
  const filteredTrades = useMemo(() => {
    if (tableFilter === 'WINS') return summary.trades.filter(t => t.isWin);
    if (tableFilter === 'LOSSES') return summary.trades.filter(t => !t.isWin);
    return summary.trades;
  }, [summary.trades, tableFilter]);

  const totalPages = Math.ceil(filteredTrades.length / pageSize) || 1;
  const paginatedTrades = useMemo(() => {
    const start = (tablePage - 1) * pageSize;
    return filteredTrades.slice(start, start + pageSize);
  }, [filteredTrades, tablePage, pageSize]);

  // SVG Geometry for Primary Equity Chart
  const svgHeight = 280;
  const padLeft = 14;
  const padRight = chartWidth < 480 ? 60 : 75;
  const padTop = 20;
  const padBottom = 25;
  const plotWidth = Math.max(50, chartWidth - padLeft - padRight);
  const plotHeight = Math.max(50, svgHeight - padTop - padBottom);

  const equityValues = useMemo(() => [summary.initialCapital, ...summary.trades.map(t => t.equityAfter)], [summary]);
  const minEquity = useMemo(() => Math.min(...equityValues) * 0.98, [equityValues]);
  const maxEquity = useMemo(() => Math.max(...equityValues) * 1.02, [equityValues]);
  const equityRange = maxEquity - minEquity || 1;

  const getX = (idx: number, count: number) => padLeft + (idx / Math.max(1, count)) * plotWidth;
  const getY = (val: number) => padTop + plotHeight - ((val - minEquity) / equityRange) * plotHeight;

  // Primary Path String
  const equityPathString = useMemo(() => {
    return equityValues.map((val, idx) => {
      const x = getX(idx, equityValues.length - 1);
      const y = getY(val);
      return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  }, [equityValues, plotWidth, plotHeight, minEquity, equityRange]);

  // Area under curve
  const equityAreaString = useMemo(() => {
    if (equityValues.length === 0) return '';
    const firstX = getX(0, equityValues.length - 1);
    const lastX = getX(equityValues.length - 1, equityValues.length - 1);
    const bottomY = padTop + plotHeight;
    return `${equityPathString} L ${lastX.toFixed(1)},${bottomY} L ${firstX.toFixed(1)},${bottomY} Z`;
  }, [equityPathString, equityValues.length, plotWidth, plotHeight]);

  // Peak Watermark Line
  const peakValues = useMemo(() => [summary.initialCapital, ...summary.trades.map(t => t.peakEquity)], [summary]);
  const peakPathString = useMemo(() => {
    return peakValues.map((val, idx) => {
      const x = getX(idx, peakValues.length - 1);
      const y = getY(val);
      return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  }, [peakValues, plotWidth, plotHeight, minEquity, equityRange]);

  // Dual Chart (Strategy B) Path
  const equityValuesB = useMemo(() => [summaryB.initialCapital, ...summaryB.trades.map(t => t.equityAfter)], [summaryB]);
  const combinedMin = Math.min(minEquity, ...equityValuesB) * 0.98;
  const combinedMax = Math.max(maxEquity, ...equityValuesB) * 1.02;
  const combinedRange = combinedMax - combinedMin || 1;

  const getDuelY = (val: number) => padTop + plotHeight - ((val - combinedMin) / combinedRange) * plotHeight;

  const duelPathA = useMemo(() => {
    return equityValues.map((val, idx) => {
      const x = getX(idx, equityValues.length - 1);
      const y = getDuelY(val);
      return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  }, [equityValues, plotWidth, plotHeight, combinedMin, combinedRange]);

  const duelPathB = useMemo(() => {
    return equityValuesB.map((val, idx) => {
      const x = getX(idx, equityValuesB.length - 1);
      const y = getDuelY(val);
      return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  }, [equityValuesB, plotWidth, plotHeight, combinedMin, combinedRange]);

  // Monte Carlo SVG paths
  const mc = summary.monteCarlo;
  const mcP5 = mc?.percentiles.p5 || [];
  const mcP25 = mc?.percentiles.p25 || [];
  const mcP50 = mc?.percentiles.p50 || [];
  const mcP75 = mc?.percentiles.p75 || [];
  const mcP95 = mc?.percentiles.p95 || [];

  const mcAllValues = useMemo(() => {
    if (!mc) return [];
    return [...mcP5, ...mcP95];
  }, [mc, mcP5, mcP95]);

  const mcMinEquity = useMemo(() => mcAllValues.length ? Math.min(...mcAllValues) * 0.95 : minEquity, [mcAllValues, minEquity]);
  const mcMaxEquity = useMemo(() => mcAllValues.length ? Math.max(...mcAllValues) * 1.05 : maxEquity, [mcAllValues, maxEquity]);
  const mcRange = mcMaxEquity - mcMinEquity || 1;

  const getMcY = (val: number) => padTop + plotHeight - ((val - mcMinEquity) / mcRange) * plotHeight;

  const makeMcPath = (arr: number[]) => {
    return arr.map((val, idx) => {
      const x = getX(idx, arr.length - 1);
      const y = getMcY(val);
      return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  };

  const makeMcArea = (topArr: number[], bottomArr: number[]) => {
    if (!topArr.length || !bottomArr.length) return '';
    const topStr = topArr.map((val, idx) => `${idx === 0 ? 'M' : 'L'} ${getX(idx, topArr.length - 1).toFixed(1)},${getMcY(val).toFixed(1)}`).join(' ');
    const bottomRev = [...bottomArr].reverse().map((val, idx) => {
      const origIdx = bottomArr.length - 1 - idx;
      return `L ${getX(origIdx, bottomArr.length - 1).toFixed(1)},${getMcY(val).toFixed(1)}`;
    }).join(' ');
    return `${topStr} ${bottomRev} Z`;
  };

  return (
    <div className="w-full space-y-6 pb-12 font-sans select-none">
      {/* 1. MATH LAB HEADER & SUB-NAVIGATION */}
      <div className="bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 border border-zinc-800/80 rounded-2xl p-4 sm:p-5 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-400">
                <Calculator className="h-5 w-5" />
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                Version 5: Quantitative Math Lab
                <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300">
                  Exact Theoretical Engine
                </span>
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
              Backtest theoretical trading models, custom payout equations, Monte Carlo uncertainty cones, and duel strategy variants.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              type="button"
              onClick={handleReroll}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 text-zinc-200 text-xs font-bold transition shadow-sm"
              title="Generate a new randomized sequence that preserves exact win rate count"
            >
              <RotateCw className="h-3.5 w-3.5 text-cyan-400" />
              <span>Reshuffle Sequence</span>
            </button>
            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-950/70 hover:bg-cyan-900/80 border border-cyan-500/40 text-cyan-300 text-xs font-bold transition shadow-sm"
              title="Download Trade-by-Trade Ledger as CSV"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* SUB-TABS STRIP */}
        <div className="mt-5 pt-4 border-t border-zinc-800/70 flex items-center gap-1 sm:gap-2 overflow-x-auto scrollbar-none flex-nowrap">
          <button
            type="button"
            onClick={() => setActiveTab('equity')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              activeTab === 'equity'
                ? 'bg-cyan-500 text-zinc-950 font-black shadow-lg shadow-cyan-500/20'
                : 'bg-zinc-900/90 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850 border border-zinc-800'
            }`}
          >
            <BarChart2 className="h-3.5 w-3.5" />
            <span>Equity Curve &amp; Ledger</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('monte_carlo')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              activeTab === 'monte_carlo'
                ? 'bg-cyan-500 text-zinc-950 font-black shadow-lg shadow-cyan-500/20'
                : 'bg-zinc-900/90 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850 border border-zinc-800'
            }`}
          >
            <Dice5 className="h-3.5 w-3.5" />
            <span>Monte Carlo Fan ({summary.monteCarlo?.simulationsRun || 100} Runs)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('duel')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              activeTab === 'duel'
                ? 'bg-amber-400 text-zinc-950 font-black shadow-lg shadow-amber-400/20'
                : 'bg-zinc-900/90 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850 border border-zinc-800'
            }`}
          >
            <Swords className="h-3.5 w-3.5" />
            <span>Strategy Duel (A vs B)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('risk_ruin')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              activeTab === 'risk_ruin'
                ? 'bg-rose-500 text-white font-black shadow-lg shadow-rose-500/20'
                : 'bg-zinc-900/90 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850 border border-zinc-800'
            }`}
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            <span>Risk, Ruin &amp; Streaks</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('heatmap')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              activeTab === 'heatmap'
                ? 'bg-emerald-500 text-zinc-950 font-black shadow-lg shadow-emerald-500/20'
                : 'bg-zinc-900/90 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850 border border-zinc-800'
            }`}
          >
            <Compass className="h-3.5 w-3.5" />
            <span>2D Edge Heatmap</span>
          </button>
        </div>
      </div>

      {/* 2. PRESET ARCHETYPES BAR */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
            Quantitative Presets &amp; Archetypes
          </span>
          <span className="text-[10px] text-zinc-500 hidden sm:inline">
            Click any preset to test established market edges &amp; sizing strategies
          </span>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1 flex-nowrap">
          {SCENARIO_PRESETS.map(preset => (
            <button
              key={preset.id}
              type="button"
              onClick={() => handleLoadPreset(preset)}
              className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold border transition text-left flex items-center gap-2 ${
                selectedPresetId === preset.id
                  ? 'bg-cyan-950/80 border-cyan-500/80 text-cyan-200 shadow-sm shadow-cyan-950'
                  : 'bg-zinc-900/80 border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white'
              }`}
            >
              <span className="font-bold">{preset.title.split('(')[0]}</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800/80 text-zinc-400 border border-zinc-700/60 font-mono">
                {preset.tag}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 3. SIMULATION INPUTS & CONFIGURATION PANEL */}
      <div className="bg-zinc-950/90 border border-zinc-800/90 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
          <div className="flex items-center gap-2">
            <Sliders className="h-4 w-4 text-cyan-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              {activeTab === 'duel' ? 'Strategy A Parameters' : 'Scenario Parameters'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-zinc-400">Distribution Mode:</span>
            <div className="inline-flex rounded-lg bg-zinc-900 p-0.5 border border-zinc-800 text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setConfig(prev => ({ ...prev, distributionMode: 'exact' }))}
                className={`px-2 py-0.5 rounded-md transition ${
                  config.distributionMode === 'exact'
                    ? 'bg-cyan-500 text-zinc-950 font-black'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Exact Wins (100% Guaranteed)
              </button>
              <button
                type="button"
                onClick={() => setConfig(prev => ({ ...prev, distributionMode: 'random' }))}
                className={`px-2 py-0.5 rounded-md transition ${
                  config.distributionMode === 'random'
                    ? 'bg-cyan-500 text-zinc-950 font-black'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Stochastic (Coin Flip)
              </button>
            </div>
          </div>
        </div>

        {/* 5-COLUMN RESPONSIVE INPUTS GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3.5 text-xs font-mono">
          {/* Number of Trades */}
          <div className="bg-zinc-900/90 p-3 rounded-xl border border-zinc-800/80 space-y-1.5">
            <label className="text-zinc-400 text-[11px] font-bold block flex items-center justify-between">
              <span>Trades Count</span>
              <span className="text-cyan-400 font-bold">{config.tradesCount}</span>
            </label>
            <input
              type="range"
              min="10"
              max="1000"
              step="10"
              value={config.tradesCount}
              onChange={e => setConfig(prev => ({ ...prev, tradesCount: Number(e.target.value) }))}
              className="w-full accent-cyan-400 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-zinc-500">
              <span>10</span>
              <span>500</span>
              <span>1000</span>
            </div>
          </div>

          {/* Win Rate */}
          <div className="bg-zinc-900/90 p-3 rounded-xl border border-zinc-800/80 space-y-1.5">
            <label className="text-zinc-400 text-[11px] font-bold block flex items-center justify-between">
              <span>Win Rate (%)</span>
              <span className="text-emerald-400 font-bold">{config.winRate}%</span>
            </label>
            <input
              type="range"
              min="5"
              max="95"
              step="1"
              value={config.winRate}
              onChange={e => setConfig(prev => ({ ...prev, winRate: Number(e.target.value) }))}
              className="w-full accent-emerald-400 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-zinc-500">
              <span>5%</span>
              <span className="text-amber-400 font-bold">BE: {summary.theoreticalBreakevenWinRate.toFixed(1)}%</span>
              <span>95%</span>
            </div>
          </div>

          {/* Risk to Reward Ratio */}
          <div className="bg-zinc-900/90 p-3 rounded-xl border border-zinc-800/80 space-y-1.5">
            <label className="text-zinc-400 text-[11px] font-bold block flex items-center justify-between">
              <span>Risk : Reward (R:R)</span>
              <span className="text-cyan-400 font-bold">1 : {config.riskRewardRatio.toFixed(1)}</span>
            </label>
            <input
              type="range"
              min="0.3"
              max="8.0"
              step="0.1"
              value={config.riskRewardRatio}
              onChange={e => setConfig(prev => ({ ...prev, riskRewardRatio: Number(e.target.value) }))}
              className="w-full accent-cyan-400 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-zinc-500">
              <span>1:0.3</span>
              <span>1:3.0</span>
              <span>1:8.0</span>
            </div>
          </div>

          {/* Risk % or $ */}
          <div className="bg-zinc-900/90 p-3 rounded-xl border border-zinc-800/80 space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-zinc-400 text-[11px] font-bold">Risk Sizing</label>
              <div className="inline-flex rounded bg-zinc-800 p-0.5 text-[9px] font-bold">
                <button
                  type="button"
                  onClick={() => setConfig(prev => ({ ...prev, riskMode: 'percent', riskValue: prev.riskMode === 'percent' ? prev.riskValue : 1.0 }))}
                  className={`px-1.5 py-0.5 rounded ${config.riskMode === 'percent' ? 'bg-cyan-500 text-zinc-950' : 'text-zinc-400'}`}
                >
                  %
                </button>
                <button
                  type="button"
                  onClick={() => setConfig(prev => ({ ...prev, riskMode: 'dollar', riskValue: prev.riskMode === 'dollar' ? prev.riskValue : 100 }))}
                  className={`px-1.5 py-0.5 rounded ${config.riskMode === 'dollar' ? 'bg-cyan-500 text-zinc-950' : 'text-zinc-400'}`}
                >
                  $
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0.1"
                step={config.riskMode === 'percent' ? '0.1' : '10'}
                value={config.riskValue}
                onChange={e => setConfig(prev => ({ ...prev, riskValue: Math.max(0.1, Number(e.target.value)) }))}
                className="w-full bg-zinc-950 border border-zinc-700/80 rounded-lg px-2.5 py-1 text-white font-bold text-xs"
              />
              <span className="text-zinc-400 text-xs">{config.riskMode === 'percent' ? '%' : '$'}</span>
            </div>
            <div className="flex items-center justify-between text-[10px] text-zinc-400 pt-0.5">
              <span>Per Trade:</span>
              <span className="font-bold text-white">
                ${config.riskMode === 'percent'
                  ? ((config.initialCapital * config.riskValue) / 100).toFixed(0)
                  : config.riskValue.toFixed(0)}
              </span>
            </div>
          </div>

          {/* Starting Capital & Compounding */}
          <div className="bg-zinc-900/90 p-3 rounded-xl border border-zinc-800/80 space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-zinc-400 text-[11px] font-bold">Capital &amp; Compounding</label>
              <button
                type="button"
                onClick={() => setConfig(prev => ({ ...prev, compoundEquity: !prev.compoundEquity }))}
                className={`text-[9px] font-bold px-1.5 py-0.5 rounded border transition ${
                  config.compoundEquity
                    ? 'bg-emerald-950 border-emerald-500/50 text-emerald-300'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                }`}
              >
                {config.compoundEquity ? 'Compounding' : 'Linear ($)'}
              </button>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-zinc-500 text-xs">$</span>
              <input
                type="number"
                min="100"
                step="1000"
                value={config.initialCapital}
                onChange={e => setConfig(prev => ({ ...prev, initialCapital: Math.max(100, Number(e.target.value)) }))}
                className="w-full bg-zinc-950 border border-zinc-700/80 rounded-lg px-2.5 py-1 text-white font-bold text-xs"
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-zinc-400">
              <span>Fee/Slippage:</span>
              <input
                type="number"
                min="0"
                step="1"
                value={config.feePerTrade}
                onChange={e => setConfig(prev => ({ ...prev, feePerTrade: Math.max(0, Number(e.target.value)) }))}
                className="w-14 bg-zinc-950 border border-zinc-700 text-white rounded px-1 text-right text-[10px]"
                title="Commission / spread fee per trade in $"
              />
            </div>
          </div>
        </div>

        {/* EQUATION EDITOR & HELPER SNIPPETS */}
        <div className="bg-zinc-900/60 rounded-xl p-3 border border-zinc-800/80 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <div className="flex items-center gap-2">
              <Code className="h-3.5 w-3.5 text-cyan-400" />
              <span className="text-xs font-bold text-white font-mono">Custom Payout Equation</span>
              {equationTest.isValid ? (
                <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
                  <CheckCircle2 className="h-3 w-3" /> Syntax OK (Win: +${equationTest.sampleWinPnl.toFixed(0)}, Loss: -${Math.abs(equationTest.sampleLossPnl).toFixed(0)})
                </span>
              ) : (
                <span className="text-[10px] text-rose-400 flex items-center gap-1 font-mono">
                  <AlertTriangle className="h-3 w-3" /> Error: {equationTest.error}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowEquationHelp(!showEquationHelp)}
              className="text-[11px] text-cyan-400 hover:text-cyan-300 font-bold self-start sm:self-auto flex items-center gap-1"
            >
              <HelpCircle className="h-3 w-3" />
              <span>{showEquationHelp ? 'Hide Variables' : 'Show Equation Guide'}</span>
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={config.equation}
              onChange={e => setConfig(prev => ({ ...prev, equation: e.target.value }))}
              placeholder="isWin ? (risk * rrr - fee) : (-risk - fee)"
              className="flex-1 bg-zinc-950 border border-zinc-700/80 rounded-xl px-3 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-cyan-400"
            />
            <button
              type="button"
              onClick={() => setConfig(prev => ({ ...prev, equation: 'isWin ? (risk * rrr) : -risk' }))}
              className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-mono font-bold transition shrink-0"
            >
              Reset Default
            </button>
          </div>

          {/* Quick Clickable Equation Macro Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none flex-nowrap pt-1 text-[10px] font-mono">
            <span className="text-zinc-500 shrink-0">Quick Equations:</span>
            <button
              type="button"
              onClick={() => insertEquationSnippet('isWin ? (risk * rrr) : -risk')}
              className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white shrink-0"
            >
              Standard 1:R
            </button>
            <button
              type="button"
              onClick={() => insertEquationSnippet('isWin ? (risk * 0.5 * 1.0 + risk * 0.5 * rrr) : -risk')}
              className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white shrink-0"
            >
              50% Partial TP
            </button>
            <button
              type="button"
              onClick={() => insertEquationSnippet('isWin ? (risk * rrr - fee) : (-risk - fee)')}
              className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white shrink-0"
            >
              + Fee Drag
            </button>
            <button
              type="button"
              onClick={() => insertEquationSnippet('let dd = (initialCapital > equity) ? (initialCapital - equity)/initialCapital : 0; let activeRisk = dd > 0.10 ? risk * 0.5 : risk; isWin ? (activeRisk * rrr) : -activeRisk')}
              className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white shrink-0"
            >
              Drawdown Defense (-50%)
            </button>
            <button
              type="button"
              onClick={() => insertEquationSnippet('let mult = streak > 0 ? (1 + Math.min(3, streak) * 0.20) : 1; isWin ? (risk * mult * rrr) : (-risk * mult)')}
              className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white shrink-0"
            >
              Hot Hand Streak
            </button>
          </div>

          {showEquationHelp && (
            <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 text-xs space-y-1.5 font-mono text-zinc-300 mt-2">
              <div className="font-bold text-cyan-400">Available Scope Variables in Equation Sandbox:</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                <div><code className="text-white font-bold">isWin</code>: true if trade is a win</div>
                <div><code className="text-white font-bold">risk</code>: dollar risk size for trade</div>
                <div><code className="text-white font-bold">rrr</code>: risk-to-reward ratio</div>
                <div><code className="text-white font-bold">equity</code>: current account balance</div>
                <div><code className="text-white font-bold">streak</code>: consecutive wins (+N) or losses (-N)</div>
                <div><code className="text-white font-bold">fee</code>: broker commission / slippage</div>
                <div><code className="text-white font-bold">tradeNum</code>: trade index (1..N)</div>
                <div><code className="text-white font-bold">Math.random()</code>: uniform random [0..1)</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4. OVERSIKT & EXACT CALCULATION SUMMARY BANNER */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-lg space-y-3 font-mono">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-zinc-800 gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Exact Oversikt &bull; Theoretical Calculation
            </h3>
          </div>
          <div className="text-[11px] text-zinc-400">
            Formula: <span className="text-cyan-300 font-bold">{summary.exactCalculation.formulaDisplay}</span>
          </div>
        </div>

        {/* 4 Hero Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800/80">
            <span className="text-[10px] text-zinc-500 uppercase block">Theoretical Net Profit</span>
            <div className={`text-lg sm:text-xl font-black mt-0.5 ${summary.exactCalculation.theoreticalNetPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {summary.exactCalculation.theoreticalNetPnL >= 0 ? '+' : ''}${Math.round(summary.exactCalculation.theoreticalNetPnL).toLocaleString()}
              <span className="text-xs ml-1 font-semibold">({summary.exactCalculation.theoreticalReturnPct >= 0 ? '+' : ''}{summary.exactCalculation.theoreticalReturnPct.toFixed(1)}%)</span>
            </div>
            <span className="text-[10px] text-zinc-400">Ending: ${Math.round(summary.exactCalculation.theoreticalFinalEquity).toLocaleString()}</span>
          </div>

          <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800/80">
            <span className="text-[10px] text-zinc-500 uppercase block">Win / Loss Breakdown</span>
            <div className="text-lg sm:text-xl font-black text-white mt-0.5">
              <span className="text-emerald-400">{summary.exactCalculation.exactWinsCount}W</span>
              <span className="text-zinc-600 mx-1">/</span>
              <span className="text-rose-400">{summary.exactCalculation.exactLossesCount}L</span>
            </div>
            <span className="text-[10px] text-zinc-400">Realized: {summary.exactCalculation.exactWinRate.toFixed(1)}% ({config.distributionMode === 'exact' ? 'Exact Sync' : 'Simulated'})</span>
          </div>

          <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800/80">
            <span className="text-[10px] text-zinc-500 uppercase block">Expectancy &bull; EV per Trade</span>
            <div className={`text-lg sm:text-xl font-black mt-0.5 ${summary.exactCalculation.theoreticalEVPerTrade >= 0 ? 'text-cyan-300' : 'text-rose-400'}`}>
              {summary.exactCalculation.theoreticalEVPerTrade >= 0 ? '+' : ''}${summary.exactCalculation.theoreticalEVPerTrade.toFixed(1)}
              <span className="text-xs ml-1 font-semibold">({summary.exactCalculation.theoreticalEV_R >= 0 ? '+' : ''}{summary.exactCalculation.theoreticalEV_R.toFixed(2)}R)</span>
            </div>
            <span className="text-[10px] text-zinc-400">Profit Factor: {summary.exactCalculation.theoreticalProfitFactor.toFixed(2)}</span>
          </div>

          <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800/80">
            <span className="text-[10px] text-zinc-500 uppercase block">Van Tharp SQN &bull; System Rating</span>
            <div className="text-lg sm:text-xl font-black text-white mt-0.5 flex items-center gap-2">
              <span>{summary.sqn.toFixed(2)}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded font-black uppercase ${
                summary.sqnRating === 'Holy Grail' || summary.sqnRating === 'Superb'
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/50'
                  : summary.sqnRating === 'Excellent' || summary.sqnRating === 'Good'
                  ? 'bg-blue-950 text-blue-300 border border-blue-500/50'
                  : 'bg-zinc-800 text-zinc-400'
              }`}>
                {summary.sqnRating}
              </span>
            </div>
            <span className="text-[10px] text-zinc-400">Max DD: {summary.maxDrawdownPercent.toFixed(1)}% &bull; Sortino: {summary.sortinoRatio.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* 5. MAIN TAB CONTENT PANELS */}
      {/* TAB A: EQUITY CURVE & TRADE LEDGER */}
      {activeTab === 'equity' && (
        <div className="space-y-6">
          {/* Equity Chart Box */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 sm:p-5 space-y-3 font-mono shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-zinc-900 gap-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-cyan-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  {chartViewMode === 'equity' ? 'Equity Growth Curve ($)' : 'Underwater Drawdown Curve (%)'}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setChartViewMode('equity')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                    chartViewMode === 'equity' ? 'bg-cyan-500 text-zinc-950 font-black' : 'bg-zinc-900 text-zinc-400 hover:text-white'
                  }`}
                >
                  Equity Curve
                </button>
                <button
                  type="button"
                  onClick={() => setChartViewMode('drawdown')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                    chartViewMode === 'drawdown' ? 'bg-rose-500 text-white font-black' : 'bg-zinc-900 text-zinc-400 hover:text-white'
                  }`}
                >
                  Drawdown (%)
                </button>
              </div>
            </div>

            {/* Dynamic Rescaling SVG Chart */}
            <div
              ref={chartContainerRef}
              className="relative w-full overflow-hidden bg-zinc-950/80 rounded-xl"
              onMouseLeave={() => setHoveredTradeIndex(null)}
            >
              <svg
                width={chartWidth}
                height={svgHeight}
                className="w-full h-auto block select-none"
                onMouseMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = e.clientX - rect.left - padLeft;
                  const idx = Math.round((x / plotWidth) * (summary.trades.length - 1));
                  if (idx >= 0 && idx < summary.trades.length) {
                    setHoveredTradeIndex(idx);
                  }
                }}
                onTouchMove={(e) => {
                  const touch = e.touches[0];
                  if (!touch) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = touch.clientX - rect.left - padLeft;
                  const idx = Math.round((x / plotWidth) * (summary.trades.length - 1));
                  if (idx >= 0 && idx < summary.trades.length) {
                    setHoveredTradeIndex(idx);
                  }
                }}
              >
                <defs>
                  <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Horizontal Grid Ticks */}
                {[0, 0.25, 0.5, 0.75, 1.0].map((pct, idx) => {
                  const y = padTop + plotHeight * pct;
                  const val = maxEquity - pct * equityRange;
                  return (
                    <g key={idx}>
                      <line x1={padLeft} y1={y} x2={padLeft + plotWidth} y2={y} stroke="#27272a" strokeDasharray="3 3" strokeWidth="1" />
                      <text x={padLeft + plotWidth + 6} y={y + 3} fill="#71717a" fontSize="9" fontFamily="monospace">
                        ${val >= 1000 ? Math.round(val).toLocaleString() : val.toFixed(1)}
                      </text>
                    </g>
                  );
                })}

                {/* Watermark Peak Line */}
                <path d={peakPathString} fill="none" stroke="#52525b" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />

                {/* Area under curve */}
                <path d={equityAreaString} fill="url(#eqGrad)" />

                {/* Main Equity Path */}
                <path d={equityPathString} fill="none" stroke="#22d3ee" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

                {/* Trade Dots */}
                {summary.trades.map((t, i) => {
                  const x = getX(i + 1, summary.trades.length);
                  const y = getY(t.equityAfter);
                  const isHovered = hoveredTradeIndex === i;
                  return (
                    <circle
                      key={t.tradeNum}
                      cx={x}
                      cy={y}
                      r={isHovered ? 5 : 2}
                      fill={t.isWin ? '#10b981' : '#f43f5e'}
                      stroke={isHovered ? '#ffffff' : 'none'}
                      strokeWidth={isHovered ? 2 : 0}
                    />
                  );
                })}

                {/* Crosshair Cursor */}
                {hoveredTradeIndex !== null && summary.trades[hoveredTradeIndex] && (
                  <g>
                    <line
                      x1={getX(hoveredTradeIndex + 1, summary.trades.length)}
                      y1={padTop}
                      x2={getX(hoveredTradeIndex + 1, summary.trades.length)}
                      y2={padTop + plotHeight}
                      stroke="#ffffff"
                      strokeWidth="1"
                      strokeDasharray="2 2"
                    />
                  </g>
                )}
              </svg>

              {/* Tooltip Card */}
              {hoveredTradeIndex !== null && summary.trades[hoveredTradeIndex] && (
                <div
                  className="absolute pointer-events-none bg-zinc-900/95 border border-zinc-700 rounded-xl p-2.5 text-[11px] font-mono shadow-2xl z-20 space-y-1"
                  style={{
                    left: `${Math.min(chartWidth - 160, Math.max(10, getX(hoveredTradeIndex + 1, summary.trades.length) - 70))}px`,
                    top: '12px'
                  }}
                >
                  <div className="flex items-center justify-between gap-3 font-bold border-b border-zinc-800 pb-1">
                    <span>Trade #{summary.trades[hoveredTradeIndex].tradeNum}</span>
                    <span className={summary.trades[hoveredTradeIndex].isWin ? 'text-emerald-400' : 'text-rose-400'}>
                      {summary.trades[hoveredTradeIndex].isWin ? 'WIN' : 'LOSS'} ({summary.trades[hoveredTradeIndex].rewardMultiplier.toFixed(1)}R)
                    </span>
                  </div>
                  <div className="flex justify-between gap-3 text-zinc-300">
                    <span>PnL:</span>
                    <span className={summary.trades[hoveredTradeIndex].pnlDollar >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                      {summary.trades[hoveredTradeIndex].pnlDollar >= 0 ? '+' : ''}${summary.trades[hoveredTradeIndex].pnlDollar.toFixed(1)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3 text-zinc-400">
                    <span>Equity:</span>
                    <span className="font-bold text-white">${Math.round(summary.trades[hoveredTradeIndex].equityAfter).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between gap-3 text-zinc-400">
                    <span>Drawdown:</span>
                    <span className="text-rose-400">{summary.trades[hoveredTradeIndex].drawdownPercent.toFixed(1)}%</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* TRADE-BY-TRADE INTERACTIVE LEDGER */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden font-mono text-xs shadow-xl">
            <div className="p-4 border-b border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-cyan-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Trade-by-Trade Analytical Ledger
                </h3>
                <span className="text-[10px] text-zinc-500">({summary.trades.length} total executions)</span>
              </div>

              <div className="flex items-center gap-2">
                <div className="inline-flex rounded-lg bg-zinc-900 p-0.5 border border-zinc-800 text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => { setTableFilter('ALL'); setTablePage(1); }}
                    className={`px-2 py-0.5 rounded ${tableFilter === 'ALL' ? 'bg-zinc-700 text-white' : 'text-zinc-400'}`}
                  >
                    All ({summary.trades.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => { setTableFilter('WINS'); setTablePage(1); }}
                    className={`px-2 py-0.5 rounded ${tableFilter === 'WINS' ? 'bg-emerald-600 text-white' : 'text-zinc-400'}`}
                  >
                    Wins ({summary.wins})
                  </button>
                  <button
                    type="button"
                    onClick={() => { setTableFilter('LOSSES'); setTablePage(1); }}
                    className={`px-2 py-0.5 rounded ${tableFilter === 'LOSSES' ? 'bg-rose-600 text-white' : 'text-zinc-400'}`}
                  >
                    Losses ({summary.losses})
                  </button>
                </div>
              </div>
            </div>

            {/* Sticky First Column Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-zinc-900/95 border-b border-zinc-800 text-zinc-400 text-[11px] uppercase tracking-wider">
                    <th className="sticky left-0 z-20 bg-zinc-900 py-2.5 px-3 shadow-[1px_0_0_0_#27272a]">#Trade</th>
                    <th className="py-2.5 px-3">Result</th>
                    <th className="py-2.5 px-3 text-right">Risk Amount</th>
                    <th className="py-2.5 px-3 text-right">Realized R</th>
                    <th className="py-2.5 px-3 text-right">PnL ($)</th>
                    <th className="py-2.5 px-3 text-right">PnL (%)</th>
                    <th className="py-2.5 px-3 text-right">Account Balance</th>
                    <th className="py-2.5 px-3 text-right">Drawdown</th>
                    <th className="py-2.5 px-3 text-center">Streak</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900">
                  {paginatedTrades.map((t) => (
                    <tr
                      key={t.tradeNum}
                      className={`hover:bg-zinc-900/60 transition ${
                        t.isWin ? 'bg-emerald-950/10' : 'bg-rose-950/10'
                      }`}
                    >
                      <td className="sticky left-0 z-10 bg-zinc-950 py-2 px-3 font-bold text-white shadow-[1px_0_0_0_#27272a]">
                        #{t.tradeNum}
                      </td>
                      <td className="py-2 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                          t.isWin ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40' : 'bg-rose-950/80 text-rose-300 border border-rose-500/40'
                        }`}>
                          {t.isWin ? 'WIN' : 'LOSS'}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-zinc-300">${t.riskAmount.toFixed(1)}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-cyan-300">{t.rewardMultiplier.toFixed(2)}R</td>
                      <td className={`py-2 px-3 text-right font-mono font-bold ${t.pnlDollar >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {t.pnlDollar >= 0 ? '+' : ''}${t.pnlDollar.toFixed(1)}
                      </td>
                      <td className={`py-2 px-3 text-right font-mono ${t.pnlPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {t.pnlPercent >= 0 ? '+' : ''}{t.pnlPercent.toFixed(2)}%
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-white">${Math.round(t.equityAfter).toLocaleString()}</td>
                      <td className="py-2 px-3 text-right font-mono text-rose-400">{t.drawdownPercent.toFixed(1)}%</td>
                      <td className="py-2 px-3 text-center font-mono">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                          t.streak > 0 ? 'text-emerald-400 bg-emerald-950/50' : 'text-rose-400 bg-rose-950/50'
                        }`}>
                          {t.streak > 0 ? `+${t.streak}W` : `${t.streak}L`}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="p-3 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
                <span>Page {tablePage} of {totalPages}</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={tablePage === 1}
                    onClick={() => setTablePage(p => Math.max(1, p - 1))}
                    className="px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800 disabled:opacity-30"
                  >
                    Prev
                  </button>
                  <button
                    type="button"
                    disabled={tablePage === totalPages}
                    onClick={() => setTablePage(p => Math.min(totalPages, p + 1))}
                    className="px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800 disabled:opacity-30"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB B: MONTE CARLO CONE OF UNCERTAINTY */}
      {activeTab === 'monte_carlo' && (
        <div className="space-y-6">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 sm:p-5 space-y-4 font-mono shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-zinc-900 gap-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Dice5 className="h-4 w-4 text-cyan-400" />
                  Monte Carlo Uncertainty Cone ({summary.monteCarlo?.simulationsRun || 100} Simulated Paths)
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Visualizes 5th to 95th percentile distribution envelopes across {config.tradesCount} trades.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-400">Simulations:</span>
                {[50, 100, 250].map(cnt => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => setConfig(prev => ({ ...prev, monteCarloSimulationsCount: cnt, enableMonteCarlo: true }))}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                      config.monteCarloSimulationsCount === cnt ? 'bg-cyan-500 text-zinc-950 font-black' : 'bg-zinc-900 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {cnt}
                  </button>
                ))}
              </div>
            </div>

            {/* Monte Carlo Visualizer */}
            <div ref={chartContainerRef} className="relative w-full overflow-hidden bg-zinc-950/80 rounded-xl">
              <svg width={chartWidth} height={svgHeight} className="w-full h-auto block select-none">
                {/* Horizontal Ticks */}
                {[0, 0.25, 0.5, 0.75, 1.0].map((pct, idx) => {
                  const y = padTop + plotHeight * pct;
                  const val = mcMaxEquity - pct * mcRange;
                  return (
                    <g key={idx}>
                      <line x1={padLeft} y1={y} x2={padLeft + plotWidth} y2={y} stroke="#27272a" strokeDasharray="3 3" strokeWidth="1" />
                      <text x={padLeft + plotWidth + 6} y={y + 3} fill="#71717a" fontSize="9" fontFamily="monospace">
                        ${val >= 1000 ? Math.round(val).toLocaleString() : val.toFixed(1)}
                      </text>
                    </g>
                  );
                })}

                {/* 5th to 95th Percentile Fan (Outer Cone) */}
                {mcP95.length > 0 && (
                  <path d={makeMcArea(mcP95, mcP5)} fill="#06b6d4" fillOpacity="0.10" />
                )}

                {/* 25th to 75th Percentile Fan (Inner Core) */}
                {mcP75.length > 0 && (
                  <path d={makeMcArea(mcP75, mcP25)} fill="#06b6d4" fillOpacity="0.22" />
                )}

                {/* Sample Paths */}
                {summary.monteCarlo?.samplePaths.map((path, idx) => {
                  const pathStr = path.map((val, step) => `${step === 0 ? 'M' : 'L'} ${getX(step, path.length - 1).toFixed(1)},${getMcY(val).toFixed(1)}`).join(' ');
                  return (
                    <path key={idx} d={pathStr} fill="none" stroke="#22d3ee" strokeWidth="1" opacity="0.35" />
                  );
                })}

                {/* Median Path (50th Percentile) */}
                {mcP50.length > 0 && (
                  <path d={makeMcPath(mcP50)} fill="none" stroke="#38bdf8" strokeWidth="2.5" />
                )}

                {/* 5th Percentile Worst Case Line */}
                {mcP5.length > 0 && (
                  <path d={makeMcPath(mcP5)} fill="none" stroke="#f43f5e" strokeWidth="1.5" strokeDasharray="4 2" />
                )}

                {/* 95th Percentile Best Case Line */}
                {mcP95.length > 0 && (
                  <path d={makeMcPath(mcP95)} fill="none" stroke="#10b981" strokeWidth="1.5" strokeDasharray="4 2" />
                )}
              </svg>
            </div>

            {/* Monte Carlo Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="bg-zinc-900/80 p-3 rounded-xl border border-zinc-800">
                <span className="text-[10px] text-zinc-500 block uppercase">Median Outcome (50th)</span>
                <span className="text-base font-black text-cyan-300 mt-1 block">
                  ${Math.round(summary.monteCarlo?.medianFinalEquity || summary.initialCapital).toLocaleString()}
                </span>
                <span className="text-[10px] text-zinc-400">Most probable trajectory</span>
              </div>

              <div className="bg-zinc-900/80 p-3 rounded-xl border border-zinc-800">
                <span className="text-[10px] text-zinc-500 block uppercase">Worst 5% Outcome</span>
                <span className="text-base font-black text-rose-400 mt-1 block">
                  ${Math.round(summary.monteCarlo?.percentiles.p5.slice(-1)[0] || 0).toLocaleString()}
                </span>
                <span className="text-[10px] text-zinc-400">Unfavorable sequence drag</span>
              </div>

              <div className="bg-zinc-900/80 p-3 rounded-xl border border-zinc-800">
                <span className="text-[10px] text-zinc-500 block uppercase">Best 95% Outcome</span>
                <span className="text-base font-black text-emerald-400 mt-1 block">
                  ${Math.round(summary.monteCarlo?.percentiles.p95.slice(-1)[0] || 0).toLocaleString()}
                </span>
                <span className="text-[10px] text-zinc-400">Cluster momentum peak</span>
              </div>

              <div className="bg-zinc-900/80 p-3 rounded-xl border border-zinc-800">
                <span className="text-[10px] text-zinc-500 block uppercase">Simulated Ruin Risk</span>
                <span className={`text-base font-black mt-1 block ${
                  (summary.monteCarlo?.ruinProbability || 0) > 5 ? 'text-rose-400' : 'text-emerald-400'
                }`}>
                  {summary.monteCarlo?.ruinProbability || 0}%
                </span>
                <span className="text-[10px] text-zinc-400">&lt;20% capital wipeout rate</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB C: STRATEGY DUEL (A vs B) */}
      {activeTab === 'duel' && (
        <div className="space-y-6">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 sm:p-5 space-y-4 font-mono shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-zinc-900 gap-2">
              <div className="flex items-center gap-2">
                <Swords className="h-4 w-4 text-amber-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Side-by-Side Strategy Duel: Strategy A vs Strategy B
                </h3>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5 font-bold text-cyan-300">
                  <span className="h-2 w-2 rounded-full bg-cyan-400" /> Strategy A
                </span>
                <span className="flex items-center gap-1.5 font-bold text-amber-400">
                  <span className="h-2 w-2 rounded-full bg-amber-400" /> Strategy B
                </span>
              </div>
            </div>

            {/* Duel Parameters Form for Strategy B */}
            <div className="bg-zinc-900/70 p-3.5 rounded-xl border border-zinc-800/90 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <Sliders className="h-3.5 w-3.5" /> Adjust Strategy B Rival Parameters
                </span>
                <button
                  type="button"
                  onClick={() => setConfigB({ ...config, randomSeed: Math.floor(Math.random() * 1000000) })}
                  className="text-[10px] text-zinc-400 hover:text-white underline"
                >
                  Clone A to B
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="bg-zinc-950 p-2.5 rounded-lg border border-zinc-800">
                  <span className="text-[10px] text-zinc-500 block">Win Rate</span>
                  <div className="flex items-center gap-1 mt-1">
                    <input
                      type="number"
                      min="10"
                      max="90"
                      value={configB.winRate}
                      onChange={e => setConfigB(prev => ({ ...prev, winRate: Number(e.target.value) }))}
                      className="w-16 bg-zinc-900 border border-zinc-700 text-white rounded px-1.5 py-0.5 text-xs font-bold font-mono"
                    />
                    <span className="text-zinc-400">%</span>
                  </div>
                </div>

                <div className="bg-zinc-950 p-2.5 rounded-lg border border-zinc-800">
                  <span className="text-[10px] text-zinc-500 block">Risk:Reward</span>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-zinc-400">1:</span>
                    <input
                      type="number"
                      min="0.3"
                      max="6"
                      step="0.1"
                      value={configB.riskRewardRatio}
                      onChange={e => setConfigB(prev => ({ ...prev, riskRewardRatio: Number(e.target.value) }))}
                      className="w-16 bg-zinc-900 border border-zinc-700 text-white rounded px-1.5 py-0.5 text-xs font-bold font-mono"
                    />
                  </div>
                </div>

                <div className="bg-zinc-950 p-2.5 rounded-lg border border-zinc-800">
                  <span className="text-[10px] text-zinc-500 block">Risk per Trade</span>
                  <div className="flex items-center gap-1 mt-1">
                    <input
                      type="number"
                      min="0.2"
                      max="10"
                      step="0.1"
                      value={configB.riskValue}
                      onChange={e => setConfigB(prev => ({ ...prev, riskValue: Number(e.target.value) }))}
                      className="w-16 bg-zinc-900 border border-zinc-700 text-white rounded px-1.5 py-0.5 text-xs font-bold font-mono"
                    />
                    <span className="text-zinc-400">{configB.riskMode === 'percent' ? '%' : '$'}</span>
                  </div>
                </div>

                <div className="bg-zinc-950 p-2.5 rounded-lg border border-zinc-800">
                  <span className="text-[10px] text-zinc-500 block">Compounding</span>
                  <button
                    type="button"
                    onClick={() => setConfigB(prev => ({ ...prev, compoundEquity: !prev.compoundEquity }))}
                    className={`mt-1 px-2 py-0.5 rounded text-[10px] font-bold border ${
                      configB.compoundEquity ? 'bg-amber-950 text-amber-300 border-amber-500/50' : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                    }`}
                  >
                    {configB.compoundEquity ? 'Compounding' : 'Linear ($)'}
                  </button>
                </div>
              </div>
            </div>

            {/* Duel Overlay Chart */}
            <div ref={chartContainerRef} className="relative w-full overflow-hidden bg-zinc-950/80 rounded-xl">
              <svg width={chartWidth} height={svgHeight} className="w-full h-auto block select-none">
                {/* Horizontal Ticks */}
                {[0, 0.25, 0.5, 0.75, 1.0].map((pct, idx) => {
                  const y = padTop + plotHeight * pct;
                  const val = combinedMax - pct * combinedRange;
                  return (
                    <g key={idx}>
                      <line x1={padLeft} y1={y} x2={padLeft + plotWidth} y2={y} stroke="#27272a" strokeDasharray="3 3" strokeWidth="1" />
                      <text x={padLeft + plotWidth + 6} y={y + 3} fill="#71717a" fontSize="9" fontFamily="monospace">
                        ${val >= 1000 ? Math.round(val).toLocaleString() : val.toFixed(1)}
                      </text>
                    </g>
                  );
                })}

                {/* Strategy A Path (Cyan) */}
                <path d={duelPathA} fill="none" stroke="#22d3ee" strokeWidth="2.5" strokeLinecap="round" />

                {/* Strategy B Path (Amber) */}
                <path d={duelPathB} fill="none" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="5 2" />
              </svg>
            </div>

            {/* Head-to-Head Duel Comparison Scorecard */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Strategy A Card */}
              <div className="bg-cyan-950/20 border border-cyan-500/40 rounded-xl p-4 space-y-2.5">
                <div className="flex items-center justify-between pb-2 border-b border-cyan-500/30">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-cyan-400" />
                    <h4 className="font-bold text-white text-sm">Strategy A</h4>
                  </div>
                  {summary.netProfitDollar >= summaryB.netProfitDollar && (
                    <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold text-[10px] flex items-center gap-1 border border-cyan-500/30">
                      <Trophy className="h-3 w-3" /> Profit Leader
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-zinc-500 block text-[10px]">Net Return</span>
                    <span className="font-black text-cyan-300 text-sm">
                      {summary.netProfitPercent >= 0 ? '+' : ''}{summary.netProfitPercent.toFixed(1)}% (${Math.round(summary.netProfitDollar).toLocaleString()})
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[10px]">Max Drawdown</span>
                    <span className="font-bold text-rose-400 text-sm">{summary.maxDrawdownPercent.toFixed(1)}%</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[10px]">Profit Factor</span>
                    <span className="font-bold text-white">{summary.profitFactor.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[10px]">SQN Quality</span>
                    <span className="font-bold text-white">{summary.sqn.toFixed(2)} ({summary.sqnRating})</span>
                  </div>
                </div>
              </div>

              {/* Strategy B Card */}
              <div className="bg-amber-950/20 border border-amber-500/40 rounded-xl p-4 space-y-2.5">
                <div className="flex items-center justify-between pb-2 border-b border-amber-500/30">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-amber-400" />
                    <h4 className="font-bold text-white text-sm">Strategy B</h4>
                  </div>
                  {summaryB.netProfitDollar > summary.netProfitDollar && (
                    <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold text-[10px] flex items-center gap-1 border border-amber-500/30">
                      <Trophy className="h-3 w-3" /> Profit Leader
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-zinc-500 block text-[10px]">Net Return</span>
                    <span className="font-black text-amber-300 text-sm">
                      {summaryB.netProfitPercent >= 0 ? '+' : ''}{summaryB.netProfitPercent.toFixed(1)}% (${Math.round(summaryB.netProfitDollar).toLocaleString()})
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[10px]">Max Drawdown</span>
                    <span className="font-bold text-rose-400 text-sm">{summaryB.maxDrawdownPercent.toFixed(1)}%</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[10px]">Profit Factor</span>
                    <span className="font-bold text-white">{summaryB.profitFactor.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[10px]">SQN Quality</span>
                    <span className="font-bold text-white">{summaryB.sqn.toFixed(2)} ({summaryB.sqnRating})</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB D: RISK, RUIN & CONSECUTIVE LOSSES */}
      {activeTab === 'risk_ruin' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Consecutive Losses Probability Matrix */}
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 sm:p-5 space-y-3 font-mono shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-zinc-900 gap-1.5">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-rose-400" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Consecutive Loss Probability &amp; Drawdown Matrix
                  </h3>
                </div>
                <span className="text-[10px] text-zinc-500">Over {config.tradesCount} trades @ {config.winRate}% WR</span>
              </div>

              <div className="flex items-center justify-between bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-2.5 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-zinc-400 text-[11px]">Expected Max Streak:</span>
                  <span className="font-bold text-rose-400">
                    {summary.theoreticalExpectedMaxLossStreak} losses
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-zinc-400 text-[11px]">Max Streak DD in R:</span>
                  <span className="px-2 py-0.5 rounded font-black bg-rose-950/80 text-rose-300 border border-rose-800/60">
                    -{summary.theoreticalExpectedMaxLossStreak}.0R
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-zinc-800">
                <table className="w-full text-xs text-left min-w-[460px]">
                  <thead>
                    <tr className="bg-zinc-900 text-zinc-400 text-[10px] uppercase">
                      <th className="py-2.5 px-3">Streak</th>
                      <th className="py-2.5 px-3 text-right">Drawdown in R</th>
                      <th className="py-2.5 px-3 text-right">Account Impact</th>
                      <th className="py-2.5 px-3 text-right">Probability</th>
                      <th className="py-2.5 px-3 text-right">Expected Count</th>
                      <th className="py-2.5 px-3 text-right">Psychological Hazard</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900">
                    {summary.consecutiveLossProbabilities.map(streak => (
                      <tr key={streak.streakLen} className="hover:bg-zinc-900/50">
                        <td className="py-2.5 px-3 font-bold text-white whitespace-nowrap">
                          {streak.streakLen} in a row
                        </td>
                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded font-mono font-bold text-xs ${
                            Math.abs(streak.drawdownR) >= 10
                              ? 'bg-rose-950/90 text-rose-300 border border-rose-700/60'
                              : Math.abs(streak.drawdownR) >= 6
                              ? 'bg-amber-950/90 text-amber-300 border border-amber-700/60'
                              : 'bg-zinc-900 text-cyan-300 border border-zinc-700/60'
                          }`}>
                            {streak.drawdownR.toFixed(1)}R
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          <div className="flex flex-col items-end">
                            <span className="font-bold text-rose-400">
                              -{streak.drawdownPct.toFixed(1)}%
                            </span>
                            <span className="text-[10px] text-zinc-500 font-mono">
                              -${Math.round(streak.drawdownDollar).toLocaleString()}
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold whitespace-nowrap">
                          <span className={streak.probabilityPct > 70 ? 'text-rose-400' : streak.probabilityPct > 30 ? 'text-amber-400' : 'text-zinc-400'}>
                            {streak.probabilityPct.toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right text-zinc-300 whitespace-nowrap">
                          {streak.expectedOccurrences}x
                        </td>
                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                            streak.probabilityPct > 80 ? 'bg-rose-950 text-rose-300' : streak.probabilityPct > 40 ? 'bg-amber-950 text-amber-300' : 'bg-zinc-900 text-zinc-500'
                          }`}>
                            {streak.probabilityPct > 80 ? 'Guaranteed Event' : streak.probabilityPct > 40 ? 'High Likelihood' : 'Rare Tail'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[11px] text-zinc-500">
                &bull; <span className="text-zinc-400 font-semibold">1R</span> = your defined stop-loss risk per trade. For example, hitting 5 losses in a row generates exactly <span className="text-rose-400 font-mono font-bold">-5.0R</span> in drawdown, requiring <span className="text-emerald-400 font-mono font-bold">+{ (5 / config.riskRewardRatio).toFixed(1) } wins</span> at 1:{config.riskRewardRatio.toFixed(1)} R:R to recover.
              </p>
            </div>

            {/* Kelly Criterion & Institutional Ratios */}
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 sm:p-5 space-y-4 font-mono shadow-xl">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-900">
                <div className="flex items-center gap-2">
                  <Scale className="h-4 w-4 text-cyan-400" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Kelly Sizing &amp; Institutional Risk Ratios
                  </h3>
                </div>
              </div>

              {/* Kelly Sizing Box */}
              <div className="bg-zinc-900/80 p-3.5 rounded-xl border border-zinc-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">Kelly Criterion Optimal Fraction:</span>
                  <span className="text-sm font-black text-cyan-400">{summary.theoreticalKellyFraction.toFixed(1)}%</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-zinc-950 p-2 rounded-lg border border-zinc-800">
                    <span className="text-[10px] text-zinc-500 block">Quarter-Kelly (Safe)</span>
                    <span className="font-bold text-emerald-400">{summary.theoreticalQuarterKelly.toFixed(1)}%</span>
                  </div>
                  <div className="bg-zinc-950 p-2 rounded-lg border border-zinc-800">
                    <span className="text-[10px] text-zinc-500 block">Half-Kelly (Optimal)</span>
                    <span className="font-bold text-cyan-400">{summary.theoreticalHalfKelly.toFixed(1)}%</span>
                  </div>
                  <div className="bg-zinc-950 p-2 rounded-lg border border-zinc-800">
                    <span className="text-[10px] text-zinc-500 block">Full Kelly (Violent)</span>
                    <span className="font-bold text-amber-400">{summary.theoreticalKellyFraction.toFixed(1)}%</span>
                  </div>
                </div>
              </div>

              {/* Institutional Ratios */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-zinc-900/80 p-3 rounded-xl border border-zinc-800">
                  <span className="text-[10px] text-zinc-500 uppercase block">Sortino Ratio (Downside)</span>
                  <span className="text-base font-black text-white mt-1 block">{summary.sortinoRatio.toFixed(2)}</span>
                  <span className="text-[10px] text-zinc-400">Penalizes only downside volatility</span>
                </div>

                <div className="bg-zinc-900/80 p-3 rounded-xl border border-zinc-800">
                  <span className="text-[10px] text-zinc-500 uppercase block">Calmar Ratio</span>
                  <span className="text-base font-black text-white mt-1 block">{summary.calmarRatio.toFixed(2)}</span>
                  <span className="text-[10px] text-zinc-400">Return / Max Drawdown ratio</span>
                </div>

                <div className="bg-zinc-900/80 p-3 rounded-xl border border-zinc-800">
                  <span className="text-[10px] text-zinc-500 uppercase block">Max Underwater Trades</span>
                  <span className="text-base font-black text-amber-400 mt-1 block">{summary.maxUnderwaterTrades} trades</span>
                  <span className="text-[10px] text-zinc-400">Longest period spent below peak</span>
                </div>

                <div className="bg-zinc-900/80 p-3 rounded-xl border border-zinc-800">
                  <span className="text-[10px] text-zinc-500 uppercase block">Gain-to-Pain Ratio</span>
                  <span className="text-base font-black text-white mt-1 block">{summary.gainToPainRatio.toFixed(2)}</span>
                  <span className="text-[10px] text-zinc-400">Gross profit / Gross loss</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB E: 2D PARAMETER HEATMAP */}
      {activeTab === 'heatmap' && (
        <div className="space-y-6">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 sm:p-5 space-y-4 font-mono shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-zinc-900 gap-2">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Compass className="h-4 w-4 text-emerald-400" />
                  2D Mathematical Landscape &bull; Win Rate vs R:R Expected Return
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Green indicates positive mathematical edge. Your current strategy is highlighted with a cyan ring.
                </p>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5 text-zinc-400">
                  <span className="h-2.5 w-2.5 rounded bg-emerald-500/80" /> Positive Edge
                </span>
                <span className="flex items-center gap-1.5 text-zinc-400">
                  <span className="h-2.5 w-2.5 rounded bg-rose-950/80" /> Negative Drag
                </span>
              </div>
            </div>

            {/* Heatmap Grid */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-center border-collapse">
                <thead>
                  <tr className="bg-zinc-900 text-zinc-400 text-[10px]">
                    <th className="py-2 px-3 text-left">R:R \ WinRate</th>
                    {[30, 35, 40, 45, 50, 55, 60, 65, 70].map(w => (
                      <th key={w} className="py-2 px-2.5">{w}%</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900">
                  {heatmapData.map((row, rIdx) => (
                    <tr key={rIdx}>
                      <td className="py-2 px-3 text-left font-bold text-zinc-300 bg-zinc-900/60">
                        1 : {row[0].rrr.toFixed(1)}
                      </td>
                      {row.map((cell, cIdx) => (
                        <td
                          key={cIdx}
                          className={`py-2 px-2 text-[11px] font-bold transition ${
                            cell.isCurrent ? 'ring-2 ring-cyan-400 rounded-md font-black' : ''
                          } ${
                            cell.evR > 0.4
                              ? 'bg-emerald-900/60 text-emerald-300'
                              : cell.evR > 0
                              ? 'bg-emerald-950/30 text-emerald-400'
                              : cell.evR === 0
                              ? 'bg-zinc-900 text-zinc-500'
                              : 'bg-rose-950/30 text-rose-400'
                          }`}
                          title={`Win Rate: ${cell.winRate}%, R:R: 1:${cell.rrr} -> EV: ${cell.evR > 0 ? '+' : ''}${cell.evR}R, Net Return: ${cell.netReturnPct}%`}
                        >
                          {cell.evR > 0 ? '+' : ''}{cell.evR.toFixed(2)}R
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
