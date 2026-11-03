import React, { useState, useEffect } from 'react';
import { SavedPreset, ScannerConfig, SetupAnalysis, Timeframe, MarketType } from './types';
import { DEFAULT_SCANNER_CONFIG, PRESET_CONFIGS } from './lib/presets';
import ConfigurationPanel from './components/ConfigurationPanel';
import FilterToolbar from './components/FilterToolbar';
import SetupCard from './components/SetupCard';
import SetupDetailsModal from './components/SetupDetailsModal';
import Version3View from './components/Version3View';
import Version4View from './components/Version4View';
import ScannerV13View from './components/ScannerV13View';
import Version5View from './components/Version5View';
import { INSTRUMENTS, getMarketData } from './lib/marketData';
import { analyzeSetup } from './lib/indicators';
import { isMarketCurrentlyLive } from './utils/timeFormat';
import { 
  Sparkles, 
  Layers, 
  Target,
  RotateCw, 
  Save, 
  Trash2, 
  Plus, 
  Cpu, 
  AlertTriangle, 
  CheckCircle,
  HelpCircle,
  TrendingUp,
  Clock,
  Gauge,
  Server,
  Globe,
  ShieldCheck,
  Star,
  Download,
  LayoutGrid,
  BarChart2,
  ListFilter,
  Eye,
  Crosshair,
  Calculator
} from 'lucide-react';

export default function App() {
  // App Version Switcher ('v1' | 'v2' | 'v3' | 'v4' | 'v1.3' | 'v5')
  const [appVersion, setAppVersion] = useState<'v1' | 'v2' | 'v3' | 'v4' | 'v1.3' | 'v5'>(() => {
    const saved = localStorage.getItem('momentum_app_version');
    return (saved === 'v1' || saved === 'v2' || saved === 'v3' || saved === 'v4' || saved === 'v1.3' || saved === 'v5') ? (saved as any) : 'v5';
  });

  useEffect(() => {
    localStorage.setItem('momentum_app_version', appVersion);
  }, [appVersion]);

  // V2 Watchlist & MA Trend Respect Streak Filters
  const [starredSetups, setStarredSetups] = useState<string[]>(() => {
    const saved = localStorage.getItem('momentum_v2_starred');
    return saved ? JSON.parse(saved) : [];
  });
  const [onlyStarred, setOnlyStarred] = useState(false);
  const [v2ViewMode, setV2ViewMode] = useState<'cards' | 'matrix'>('cards');
  
  // V2 MA Respect Streak Scanner State
  const [v2MinPriceStreak, setV2MinPriceStreak] = useState<number>(0);
  const [v2PriceStreakDir, setV2PriceStreakDir] = useState<'any' | 'above' | 'below'>('any');
  const [v2MinRsiStreak, setV2MinRsiStreak] = useState<number>(0);
  const [v2RsiStreakDir, setV2RsiStreakDir] = useState<'any' | 'above' | 'below'>('any');

  const toggleStarSetup = (symbol: string, timeframe: string) => {
    const key = `${symbol}_${timeframe}`;
    setStarredSetups(prev => {
      const updated = prev.includes(key)
        ? prev.filter(k => k !== key)
        : [...prev, key];
      localStorage.setItem('momentum_v2_starred', JSON.stringify(updated));
      return updated;
    });
  };

  const exportScanCSV = () => {
    if (setups.length === 0) return;
    const headers = ["Symbol", "Name", "Type", "Timeframe", "Overall Score", "Direction", "Correlation %", "Price MA Streak", "Price MA Dir", "RSI MA Streak", "RSI MA Dir"];
    const rows = setups.map(s => [
      s.symbol,
      `"${s.displayName.replace(/"/g, '""')}"`,
      s.type,
      s.timeframe,
      s.overallScore,
      s.direction,
      s.correlationScore,
      s.priceMa1Streak ?? 0,
      s.priceMa1StreakDir ?? 'neutral',
      s.rsiMa1Streak ?? 0,
      s.rsiMa1StreakDir ?? 'neutral'
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `momentum_scan_v2_${new Date().toISOString().substring(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportScanJSON = () => {
    if (setups.length === 0) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(setups, null, 2));
    const link = document.createElement("a");
    link.setAttribute("href", dataStr);
    link.setAttribute("download", `momentum_scan_v2_${new Date().toISOString().substring(0,10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Scanner state
  const [config, setConfig] = useState<ScannerConfig>(DEFAULT_SCANNER_CONFIG);
  const [selectedTimeframes, setSelectedTimeframes] = useState<Timeframe[]>(['1m', '5m', '15m', '30m', '1h', '4h', '1d']);
  const [selectedMarkets, setSelectedMarkets] = useState<MarketType[]>(['indices', 'commodities', 'forex', 'crypto']);
  const [scanMode, setScanMode] = useState<'server' | 'client'>('server');
  
  // Scanned setups list
  const [setups, setSetups] = useState<SetupAnalysis[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [lastScannedAt, setLastScannedAt] = useState<number | null>(null);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [minScore, setMinScore] = useState(60);
  const [directionFilter, setDirectionFilter] = useState<'all' | 'bullish' | 'bearish'>('all');
  const [gallerySize, setGallerySize] = useState(12);
  const [chartsLayout, setChartsLayout] = useState<'side-by-side' | 'stacked'>('side-by-side');

  // Live markets filter for V1 & V2 (hide closed / not live markets)
  const [hideClosedMarkets, setHideClosedMarkets] = useState<boolean>(() => {
    const saved = localStorage.getItem('momentum_hide_closed');
    return saved === 'true';
  });

  useEffect(() => {
    localStorage.setItem('momentum_hide_closed', String(hideClosedMarkets));
  }, [hideClosedMarkets]);

  // Modal and details state
  const [selectedSetup, setSelectedSetup] = useState<SetupAnalysis | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  
  // Custom presets state
  const [presets, setPresets] = useState<SavedPreset[]>(() => {
    const saved = localStorage.getItem('momentum_scanner_presets_v1');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved presets:', e);
      }
    }
    return PRESET_CONFIGS;
  });
  
  const [activePresetId, setActivePresetId] = useState<string>('swing_momentum');
  const [newPresetName, setNewPresetName] = useState('');
  const [newPresetDesc, setNewPresetDesc] = useState('');
  const [showSavePresetModal, setShowSavePresetModal] = useState(false);
  const [presetSavedSuccess, setPresetSavedSuccess] = useState(false);

  // Live Clock UTC string
  const [utcTime, setUtcTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setUtcTime(now.toISOString().replace('T', ' ').substring(0, 19) + ' UTC');
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Primary scan action
  const runScan = async (
    forceRefresh = false,
    timeframesOverride?: Timeframe[],
    marketsOverride?: MarketType[],
    configOverride?: ScannerConfig
  ) => {
    setIsScanning(true);
    setScanError(null);

    const targetTimeframes = timeframesOverride || selectedTimeframes;
    const targetMarkets = marketsOverride || selectedMarkets;
    const targetConfig = configOverride || config;

    try {
      const response = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timeframes: targetTimeframes,
          markets: targetMarkets,
          config: targetConfig,
          forceRefresh
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to scan: server returned code ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        setSetups(data.setups);
        setLastScannedAt(data.scannedAt);
        setScanMode('server');
      } else {
        throw new Error(data.error || 'Unknown scanner error');
      }
    } catch (err: any) {
      console.warn('[SCAN SERVER UNREACHABLE] Falling back to high-speed client-side indicator calculation:', err.message);
      
      try {
        const scanResults: SetupAnalysis[] = [];
        const activeInstruments = INSTRUMENTS.filter(inst => targetMarkets.includes(inst.type));
        
        const scanPromises: Promise<void>[] = [];

        for (const timeframe of targetTimeframes) {
          for (const inst of activeInstruments) {
            const runClientScan = async () => {
              try {
                const candles = await getMarketData(inst, timeframe, forceRefresh);
                if (candles && candles.length >= 35) {
                  const analysis = analyzeSetup(
                    candles,
                    inst.displayName,
                    inst.symbol,
                    inst.type,
                    timeframe,
                    targetConfig
                  );
                  scanResults.push(analysis);
                }
              } catch (innerErr: any) {
                console.warn(`[CLIENT SCANNER WARNING] Could not analyze ${inst.symbol} (${timeframe}):`, innerErr.message);
              }
            };
            scanPromises.push(runClientScan());
          }
        }

        await Promise.all(scanPromises);
        
        scanResults.sort((a, b) => b.overallScore - a.overallScore);
        
        setSetups(scanResults);
        setLastScannedAt(Date.now());
        setScanMode('client');
      } catch (clientErr: any) {
        console.error('[CLIENT SCAN ERROR]', clientErr);
        setScanError('Connecting to the scanning service failed, and client fallback failed.');
      }
    } finally {
      setIsScanning(false);
    }
  };

  // Run scan on mount
  useEffect(() => {
    runScan(false);
  }, []);

  // Auto scan when config changes (with 600ms debounce to avoid multiple rapid API calls)
  useEffect(() => {
    if (lastScannedAt === null) return;
    const timer = setTimeout(() => {
      runScan(false);
    }, 600);
    return () => clearTimeout(timer);
  }, [config]);

  // Preset operations
  const applyPreset = (preset: SavedPreset) => {
    setActivePresetId(preset.id);
    setConfig(preset.config);
    setSelectedTimeframes(preset.timeframes);
    setSelectedMarkets(preset.markets);
    setMinScore(preset.minScore);
    setDirectionFilter(preset.directionFilter);
    
    // Auto trigger scanning with new preset parameters
    setTimeout(() => {
      runScan(false, preset.timeframes, preset.markets, preset.config);
    }, 50);
  };

  const handleSaveCustomPreset = () => {
    if (!newPresetName.trim()) return;

    const newPreset: SavedPreset = {
      id: 'custom_' + Date.now(),
      name: newPresetName.trim(),
      description: newPresetDesc.trim() || 'Custom user configurations template',
      timeframes: selectedTimeframes,
      markets: selectedMarkets,
      minScore,
      directionFilter,
      config
    };

    const updated = [...presets, newPreset];
    setPresets(updated);
    localStorage.setItem('momentum_scanner_presets_v1', JSON.stringify(updated));
    setActivePresetId(newPreset.id);
    
    // reset form
    setNewPresetName('');
    setNewPresetDesc('');
    setShowSavePresetModal(false);
    setPresetSavedSuccess(true);
    setTimeout(() => setPresetSavedSuccess(false), 3000);
  };

  const handleDeletePreset = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // prevent applying deleted preset
    const updated = presets.filter(p => p.id !== id);
    setPresets(updated);
    localStorage.setItem('momentum_scanner_presets_v1', JSON.stringify(updated));
    if (activePresetId === id && updated.length > 0) {
      applyPreset(updated[0]);
    }
  };

  // Toggles for checkboxes/multiselect
  const handleTimeframeToggle = (tf: Timeframe) => {
    const updated = selectedTimeframes.includes(tf)
      ? selectedTimeframes.filter(t => t !== tf)
      : [...selectedTimeframes, tf];
    
    // Ensure at least one timeframe is selected
    if (updated.length > 0) {
      setSelectedTimeframes(updated);
    }
  };

  const handleMarketToggle = (market: MarketType) => {
    const updated = selectedMarkets.includes(market)
      ? selectedMarkets.filter(m => m !== market)
      : [...selectedMarkets, market];
    
    // Ensure at least one market is selected
    if (updated.length > 0) {
      setSelectedMarkets(updated);
    }
  };

  const handleRsiLengthChange = (length: number) => {
    setConfig(prev => ({
      ...prev,
      rsiLength: length
    }));
    setActivePresetId('custom_active');
  };

  // Count how many markets in current setups are closed / not live
  const closedMarketsCount = React.useMemo(() => {
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

  // Filters setup logic
  const filteredSetups = setups.filter(setup => {
    // 0. Hide markets which are currently not live
    if (hideClosedMarkets) {
      const pts = setup.dataPoints || [];
      const lastTs = pts.length > 0 ? pts[pts.length - 1].timestamp : setup.lastUpdated;
      if (!isMarketCurrentlyLive(setup.symbol, setup.type, lastTs, setup.timeframe)) {
        return false;
      }
    }

    // 1. Text Search query (symbol or display name)
    const matchesSearch = setup.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          setup.displayName.toLowerCase().includes(searchQuery.toLowerCase());
    
    // 2. Minimum Score
    const matchesScore = setup.overallScore >= minScore;
    
    // 3. Direction
    let matchesDirection = true;
    if (directionFilter === 'bullish') {
      matchesDirection = setup.direction.includes('Bullish');
    } else if (directionFilter === 'bearish') {
      matchesDirection = setup.direction.includes('Bearish');
    }

    // 4. Version 2 Watchlist Filter
    if (appVersion === 'v2' && onlyStarred) {
      const key = `${setup.symbol}_${setup.timeframe}`;
      if (!starredSetups.includes(key)) return false;
    }

    // 5. Version 2 Moving Average Persistence / Streak Filters
    if (appVersion === 'v2') {
      if (v2MinPriceStreak > 0) {
        if ((setup.priceMa1Streak ?? 0) < v2MinPriceStreak) return false;
        if (v2PriceStreakDir !== 'any' && setup.priceMa1StreakDir !== v2PriceStreakDir) return false;
      }
      if (v2MinRsiStreak > 0) {
        if ((setup.rsiMa1Streak ?? 0) < v2MinRsiStreak) return false;
        if (v2RsiStreakDir !== 'any' && setup.rsiMa1StreakDir !== v2RsiStreakDir) return false;
      }
    }

    return matchesSearch && matchesScore && matchesDirection;
  }).slice(0, gallerySize);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300 font-sans antialiased selection:bg-violet-500/30 selection:text-violet-200">
      
      {/* GLOW DECORATIONS */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-600/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute top-1/3 right-10 w-80 h-80 bg-blue-600/5 rounded-full blur-3xl pointer-events-none"></div>

      {/* TOP NAVIGATION BAR - FLUID RESCALING ON ALL SCREENS */}
      <header className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-900/85">
        <div className="w-full max-w-[1920px] 2xl:max-w-[2200px] mx-auto px-2.5 sm:px-4 md:px-6 lg:px-8 py-2.5 sm:py-3 flex flex-col xl:flex-row justify-between items-stretch xl:items-center gap-2.5 sm:gap-3">
          
          {/* Logo Title & Version Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="flex items-center gap-2.5 shrink-0">
              <div className="p-2 bg-gradient-to-br from-violet-600 to-indigo-700 rounded-xl shadow-lg shadow-violet-950/20 shrink-0">
                <Gauge className="h-5 w-5 text-white animate-pulse" />
              </div>
              <h1 className="text-sm font-extrabold tracking-tight text-white font-sans uppercase shrink-0">
                Momentum Fusion
              </h1>
            </div>

            <div className="min-w-0">
              {/* VERSION BUTTONS - HORIZONTALLY SCROLLABLE ON MOBILE WITHOUT WRAPPING */}
              <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800/80 p-0.5 rounded-lg text-xs font-mono overflow-x-auto scrollbar-none py-1 max-w-full flex-nowrap">
                <button
                  onClick={() => setAppVersion('v1')}
                  className={`px-2.5 py-1 rounded transition duration-150 flex items-center gap-1 font-bold whitespace-nowrap shrink-0 text-xs ${
                    appVersion === 'v1'
                      ? 'bg-violet-600 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
                  }`}
                  title="Version 1: Stable & Frozen"
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Ver 1</span>
                </button>
                <button
                  onClick={() => setAppVersion('v2')}
                  className={`px-2.5 py-1 rounded transition duration-150 flex items-center gap-1 font-bold whitespace-nowrap shrink-0 text-xs ${
                    appVersion === 'v2'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
                  }`}
                  title="Version 2: MA Trend Respect Scanner"
                >
                  <Sparkles className="h-3.5 w-3.5 text-emerald-300" />
                  <span>Ver 2</span>
                </button>
                <button
                  onClick={() => setAppVersion('v3')}
                  className={`px-2.5 py-1 rounded transition duration-150 flex items-center gap-1 font-bold whitespace-nowrap shrink-0 text-xs ${
                    appVersion === 'v3'
                      ? 'bg-amber-500 text-zinc-950 shadow-sm font-extrabold'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
                  }`}
                  title="Version 3: Pure Moving Average Focus (Price & RSI MAs)"
                >
                  <Layers className="h-3.5 w-3.5" />
                  <span>Ver 3</span>
                  <span className="text-[9px] bg-amber-950 text-amber-300 border border-amber-500/60 px-1 rounded font-extrabold hidden sm:inline">PURE MA</span>
                </button>
                <button
                  onClick={() => {
                    setAppVersion('v4');
                    if (!selectedTimeframes.includes('1m')) {
                      const allTfs: Timeframe[] = ['1m', '5m', '15m', '30m', '1h', '4h', '1d'];
                      setSelectedTimeframes(allTfs);
                      runScan(false, allTfs);
                    }
                  }}
                  className={`px-2.5 py-1 rounded transition duration-150 flex items-center gap-1 font-bold whitespace-nowrap shrink-0 text-xs ${
                    appVersion === 'v4'
                      ? 'bg-blue-600 text-white shadow-sm font-extrabold'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
                  }`}
                  title="Version 4: 1:1 Confluence Scanner (Multi-Asset & Risk Simulator)"
                >
                  <Target className="h-3.5 w-3.5" />
                  <span>Ver 4</span>
                  <span className="text-[9px] bg-blue-950 text-blue-300 border border-blue-500/60 px-1 rounded font-extrabold hidden sm:inline">1:1</span>
                </button>
                <button
                  onClick={() => setAppVersion('v1.3')}
                  className={`px-2.5 sm:px-3 py-1 rounded transition duration-150 flex items-center gap-1.5 font-bold whitespace-nowrap shrink-0 text-xs ${
                    appVersion === 'v1.3'
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-900/30 font-extrabold'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
                  }`}
                  title="Scanner v1.3: Moving Average Respect & RSI Pullback Scanner"
                >
                  <Target className="h-3.5 w-3.5 text-blue-300" />
                  <span>Scanner v1.3</span>
                  <span className="text-[9px] bg-blue-950/80 text-blue-300 border border-blue-400/50 px-1 rounded font-extrabold hidden sm:inline">RESEARCH</span>
                </button>
                <button
                  onClick={() => setAppVersion('v5')}
                  className={`px-2.5 sm:px-3 py-1 rounded transition duration-150 flex items-center gap-1.5 font-bold whitespace-nowrap shrink-0 text-xs ${
                    appVersion === 'v5'
                      ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-violet-600 text-white shadow-md shadow-indigo-900/40 font-extrabold'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
                  }`}
                  title="Version 5: Backtesting Mathematical Scenarios (Trades, Win Rate, R:R, Risk %, Equation)"
                >
                  <Calculator className="h-3.5 w-3.5 text-indigo-300" />
                  <span>Ver 5</span>
                  <span className="text-[9px] bg-indigo-950/90 text-indigo-300 border border-indigo-400/60 px-1 rounded font-extrabold">MATH LAB</span>
                </button>
              </div>
              <span className="text-[10px] sm:text-[11px] text-zinc-500 font-light block truncate max-w-xs sm:max-w-md md:max-w-xl lg:max-w-none mt-0.5">
                {appVersion === 'v5'
                  ? 'Mathematical Scenario Lab & Strategy Edge Backtester (Version 5)'
                  : appVersion === 'v1.3'
                  ? 'Moving Average Respect & RSI Shifted Pullback Scanner (Version 1.3)'
                  : appVersion === 'v1' 
                  ? 'RSI & Price Trend Gallery (Version 1 - Stable)' 
                  : appVersion === 'v2'
                  ? 'MA Trend Respect & Chart Scanner (Version 2)'
                  : appVersion === 'v3'
                  ? 'Pure Moving Average Focus Engine (Version 3)'
                  : '1:1 Confluence Scanner v4 (Multi-Asset, OOS Backtest & Risk Simulator)'}
              </span>
            </div>
          </div>

          {/* Clock & Refresh Metrics */}
          <div className="flex items-center gap-2 sm:gap-3 text-xs font-mono shrink-0 self-start sm:self-auto">
            {scanMode === 'client' ? (
              <div className="flex items-center gap-1 bg-amber-950/40 border border-amber-900/60 text-amber-400 px-2 py-1 rounded-md text-[10px] sm:text-xs" title="Running indicator calculations directly in your browser. Fully functional, bypasses server CORS!">
                <Globe className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                <span className="font-bold uppercase tracking-wider">Local Engine</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 bg-violet-950/30 border border-violet-900/50 text-violet-400 px-2 py-1 rounded-md text-[10px] sm:text-xs" title="Connected to cloud scanning microservice">
                <Server className="h-3.5 w-3.5 text-violet-400 animate-pulse shrink-0" />
                <span className="font-bold uppercase tracking-wider">Cloud Run</span>
              </div>
            )}

            <div className="hidden sm:flex items-center gap-1.5 text-zinc-500 bg-zinc-900/50 border border-zinc-800/40 px-2.5 py-1 rounded-md">
              <Clock className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
              <span>{utcTime}</span>
            </div>
            {lastScannedAt && (
              <span className="text-zinc-500 text-[10px] sm:text-[11px] truncate">
                Scanned: <strong className="text-zinc-400">{new Date(lastScannedAt).toLocaleTimeString()}</strong>
              </span>
            )}
          </div>
        </div>
      </header>

      {/* MAIN APPLICATION CONTAINER - FLUID RESCALING ACROSS ANY SCREEN */}
      <main className="w-full max-w-[1920px] 2xl:max-w-[2200px] mx-auto px-2 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-6 space-y-4 sm:space-y-6">
        {appVersion === 'v5' ? (
          <Version5View />
        ) : appVersion === 'v1.3' ? (
          <ScannerV13View onSelectSetup={setSelectedSetup} />
        ) : appVersion === 'v4' ? (
          <Version4View
            setups={setups}
            onSelectSetup={setSelectedSetup}
            selectedTimeframes={selectedTimeframes}
            onTimeframeToggle={handleTimeframeToggle}
            onScanAllTimeframes={() => {
              const allTfs: Timeframe[] = ['1m', '5m', '15m', '30m', '1h', '4h', '1d'];
              setSelectedTimeframes(allTfs);
              runScan(true, allTfs);
            }}
            onScanTimeframes={(tfs, force = true) => {
              setSelectedTimeframes(tfs);
              runScan(force, tfs);
            }}
            isScanning={isScanning}
          />
        ) : appVersion === 'v3' ? (
          <Version3View
            setups={setups}
            config={config}
            onConfigChange={(newConfig) => {
              setConfig(newConfig);
              runScan(false, undefined, undefined, newConfig);
            }}
            onSelectSetup={(setup) => setSelectedSetup(setup)}
            starredSetups={starredSetups}
            onToggleStar={toggleStarSetup}
            selectedTimeframes={selectedTimeframes}
            onTimeframeToggle={handleTimeframeToggle}
            selectedMarkets={selectedMarkets}
            onMarketToggle={handleMarketToggle}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
        ) : (
          <>
            {/* VERSION 1 STABLE NOTICE BANNER */}
            {appVersion === 'v1' && (
          <div className="bg-violet-950/30 border border-violet-900/60 rounded-xl px-4 py-2.5 text-xs text-violet-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 font-mono shadow-sm">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-violet-400 flex-shrink-0" />
              <span>
                <strong className="text-violet-200">VERSION 1 (STABLE & FROZEN)</strong> — You are viewing Version 1. All new feature edits apply strictly to Version 2.
              </span>
            </div>
            <button
              onClick={() => setAppVersion('v2')}
              className="text-emerald-400 hover:text-emerald-300 hover:underline flex items-center gap-1 text-[11px] font-bold flex-shrink-0"
            >
              Switch to Version 2 <Sparkles className="h-3 w-3" />
            </button>
          </div>
        )}

        {/* VERSION 1 ONLY: PRESET CHOOSER GALLERY */}
        {appVersion === 'v1' && (
          <section className="space-y-3">
            <div className="flex justify-between items-center">
              <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500 font-mono flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-violet-500" />
                Scanning Templates & Presets
              </h2>
              <button
                onClick={() => setShowSavePresetModal(true)}
                className="text-xs text-violet-400 hover:text-violet-300 transition duration-150 font-mono flex items-center gap-1"
              >
                <Plus className="h-3 w-3" />
                Save Active Preset
              </button>
            </div>

            {presetSavedSuccess && (
              <div className="bg-emerald-950/40 border border-emerald-900 p-3 rounded-lg text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Custom preset saved successfully and persisted in localStorage!
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {presets.map((preset) => {
                const active = activePresetId === preset.id;
                const isCustom = preset.id.startsWith('custom_');
                return (
                  <div
                    key={preset.id}
                    onClick={() => applyPreset(preset)}
                    className={`relative p-3.5 rounded-xl border text-left cursor-pointer transition duration-200 flex flex-col justify-between ${
                      active
                        ? 'bg-zinc-900/50 border-violet-500/80 shadow-md shadow-violet-950/5'
                        : 'bg-zinc-950 border-zinc-900 hover:border-zinc-800 hover:bg-zinc-900/20'
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-start">
                        <h3 className={`text-xs font-bold font-sans ${active ? 'text-violet-400' : 'text-zinc-200'}`}>
                          {preset.name}
                        </h3>
                        {isCustom && (
                          <button
                            onClick={(e) => handleDeletePreset(preset.id, e)}
                            className="text-zinc-600 hover:text-rose-400 p-0.5 transition"
                            title="Delete Custom Preset"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-500 leading-normal mt-1 block">
                        {preset.description}
                      </p>
                    </div>
                    
                    {/* Footer metadata */}
                    <div className="flex justify-between items-center mt-3 pt-2 border-t border-zinc-900/40 text-[10px] font-mono text-zinc-500">
                      <span>{preset.timeframes.map(t => t.toUpperCase()).join('/')}</span>
                      <span>Min Score: {preset.minScore}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* VERSION 1 ONLY: PARAMETERS CONFIGURATION PANEL ACCORDION */}
        {appVersion === 'v1' && (
          <section className="space-y-2">
            <button
              onClick={() => setShowConfig(!showConfig)}
              className="w-full flex items-center justify-between bg-zinc-950 hover:bg-zinc-900/30 border border-zinc-900 rounded-xl px-4 py-3 transition duration-150"
            >
              <span className="text-xs font-bold uppercase tracking-widest text-zinc-400 font-mono flex items-center gap-2">
                <Cpu className="h-4 w-4 text-violet-500" />
                Adjust Scanning Parameters Engine
              </span>
              <span className="text-xs text-violet-400 font-mono font-medium">
                {showConfig ? 'Collapse Settings' : 'Expand Settings'}
              </span>
            </button>

            {showConfig && (
              <div className="animate-slide-down">
                <ConfigurationPanel
                  config={config}
                  onChange={(newConfig) => {
                    setConfig(newConfig);
                    setActivePresetId('custom_active');
                  }}
                  onReset={() => {
                    setConfig(DEFAULT_SCANNER_CONFIG);
                    setActivePresetId('default');
                  }}
                />
              </div>
            )}
          </section>
        )}

        {/* FILTERS TOOLBAR */}
        <section>
          <FilterToolbar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedTimeframes={selectedTimeframes}
            onTimeframeToggle={handleTimeframeToggle}
            selectedMarkets={selectedMarkets}
            onMarketToggle={handleMarketToggle}
            minScore={minScore}
            onMinScoreChange={setMinScore}
            directionFilter={directionFilter}
            onDirectionFilterChange={setDirectionFilter}
            gallerySize={gallerySize}
            onGallerySizeChange={setGallerySize}
            onForceRefresh={() => runScan(true)}
            isScanning={isScanning}
            rsiLength={config.rsiLength}
            onRsiLengthChange={handleRsiLengthChange}
            chartsLayout={chartsLayout}
            onChartsLayoutChange={setChartsLayout}
            appVersion={appVersion}
            v2MinPriceStreak={v2MinPriceStreak}
            onV2MinPriceStreakChange={setV2MinPriceStreak}
            v2PriceStreakDir={v2PriceStreakDir}
            onV2PriceStreakDirChange={setV2PriceStreakDir}
            v2MinRsiStreak={v2MinRsiStreak}
            onV2MinRsiStreakChange={setV2MinRsiStreak}
            v2RsiStreakDir={v2RsiStreakDir}
            onV2RsiStreakDirChange={setV2RsiStreakDir}
            hideClosedMarkets={hideClosedMarkets}
            onHideClosedMarketsChange={setHideClosedMarkets}
            closedMarketsCount={closedMarketsCount}
          />
        </section>

        {/* SCANNING ALERTS AND ERRORS */}
        {scanError && (
          <div className="bg-rose-950/55 border border-rose-900 rounded-xl p-4 text-rose-300 text-xs flex gap-3 items-start shadow-xl">
            <AlertTriangle className="h-5 w-5 text-rose-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold">Scanner engine API request failure:</p>
              <p className="font-light">{scanError}</p>
              <p className="text-[10px] text-rose-400 mt-2">
                Make sure you have an active network connection. We will attempt fallback caching or retry using fallback pools.
              </p>
            </div>
          </div>
        )}

        {/* GALLERY SCANS LIST VIEW GRID */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-zinc-900 pb-3">
            <h2 className="text-sm font-extrabold tracking-tight text-zinc-100 flex items-center gap-2">
              <Layers className="h-4 w-4 text-violet-500" />
              <span>{appVersion === 'v1' ? 'Active Momentum Gallery' : 'Version 2 Setup Engine'}</span>
            </h2>

            <div className="flex items-center gap-3">
              {appVersion === 'v2' && (
                <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 p-0.5 rounded-lg text-xs font-mono">
                  <button
                    onClick={() => setV2ViewMode('cards')}
                    className={`px-2.5 py-1 rounded flex items-center gap-1 transition ${
                      v2ViewMode === 'cards' ? 'bg-violet-600 text-white font-bold' : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                    <span>Cards</span>
                  </button>
                  <button
                    onClick={() => setV2ViewMode('matrix')}
                    className={`px-2.5 py-1 rounded flex items-center gap-1 transition ${
                      v2ViewMode === 'matrix' ? 'bg-violet-600 text-white font-bold' : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <BarChart2 className="h-3.5 w-3.5" />
                    <span>Confluence Matrix</span>
                  </button>
                </div>
              )}

              <span className="text-xs font-mono text-zinc-500">
                Showing {filteredSetups.length} of {setups.length} technical setups found
                {hideClosedMarkets && closedMarketsCount > 0 && (
                  <span className="text-amber-400/90 font-medium ml-1">
                    ({closedMarketsCount} closed hidden)
                  </span>
                )}
              </span>
            </div>
          </div>

          {/* LOADING SKELETONS */}
          {isScanning && setups.length === 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array(8).fill(null).map((_, idx) => (
                <div key={idx} className="bg-zinc-950 border border-zinc-900 rounded-xl p-5 space-y-4 animate-pulse">
                  <div className="flex justify-between items-center">
                    <div className="h-5 w-24 bg-zinc-900 rounded"></div>
                    <div className="h-5 w-12 bg-zinc-900 rounded"></div>
                  </div>
                  <div className="h-3 w-40 bg-zinc-900 rounded"></div>
                  <div className="space-y-2 pt-2">
                    <div className="h-16 bg-zinc-900 rounded"></div>
                    <div className="h-16 bg-zinc-900 rounded"></div>
                  </div>
                  <div className="h-3 w-28 bg-zinc-900 rounded ml-auto"></div>
                </div>
              ))}
            </div>
          ) : filteredSetups.length === 0 ? (
            /* EMPTY STATE */
            <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-12 text-center max-w-xl mx-auto space-y-4 shadow-xl">
              <div className="mx-auto w-12 h-12 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-zinc-500" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-zinc-300 font-semibold text-sm">
                  No valid setups found matching filters
                </h3>
                <p className="text-xs text-zinc-500 leading-normal font-light">
                  No market segments fulfilled your scoring minimums or search queries. Try lowering the "Min Score" threshold, checking additional timeframes, or resetting parameter defaults.
                </p>
              </div>
            </div>
          ) : appVersion === 'v2' && v2ViewMode === 'matrix' ? (
            /* V2 CONFLUENCE MATRIX TABLE */
            <div className="overflow-x-auto border border-zinc-900 rounded-xl bg-zinc-950/60 shadow-xl">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-zinc-900/80 border-b border-zinc-800 text-zinc-400 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3 w-10">★</th>
                    <th className="p-3">Symbol / Asset</th>
                    <th className="p-3">TF</th>
                    <th className="p-3">Score</th>
                    <th className="p-3">Direction</th>
                    <th className="p-3">Price MA Streak</th>
                    <th className="p-3">RSI MA Streak</th>
                    <th className="p-3">RSI</th>
                    <th className="p-3">SMA Alignment</th>
                    <th className="p-3">Volume Ratio</th>
                    <th className="p-3 text-right">Inspect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900 text-zinc-300">
                  {filteredSetups.map((setup) => {
                    const isStarred = starredSetups.includes(`${setup.symbol}_${setup.timeframe}`);
                    return (
                      <tr 
                        key={`matrix_${setup.symbol}_${setup.timeframe}`}
                        onClick={() => setSelectedSetup(setup)}
                        className="hover:bg-zinc-900/50 cursor-pointer transition"
                      >
                        <td className="p-3" onClick={(e) => { e.stopPropagation(); toggleStarSetup(setup.symbol, setup.timeframe); }}>
                          <button className={`p-1 rounded ${isStarred ? 'text-amber-400' : 'text-zinc-600 hover:text-zinc-400'}`}>
                            <Star className={`h-4 w-4 ${isStarred ? 'fill-amber-400' : ''}`} />
                          </button>
                        </td>
                        <td className="p-3 font-sans font-bold text-zinc-100">
                          <div className="flex items-center gap-2">
                            <span>{setup.symbol}</span>
                            <span className="text-[10px] font-mono text-zinc-500 font-normal">({setup.displayName})</span>
                          </div>
                        </td>
                        <td className="p-3 uppercase font-bold text-zinc-400">{setup.timeframe}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded font-extrabold font-sans text-xs ${
                            setup.overallScore >= 90 ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                            setup.overallScore >= 75 ? 'bg-teal-950 text-teal-400 border border-teal-800' :
                            setup.overallScore >= 55 ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                            'bg-rose-950 text-rose-400 border border-rose-800'
                          }`}>
                            {setup.overallScore}
                          </span>
                        </td>
                        <td className="p-3 font-bold">
                          <span className={setup.direction.includes('Bullish') ? 'text-emerald-400' : setup.direction.includes('Bearish') ? 'text-rose-400' : 'text-zinc-400'}>
                            {setup.direction}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-amber-300 font-bold">
                          {setup.priceMa1Streak ?? 0} bars <span className="text-[10px] text-zinc-500">({setup.priceMa1StreakDir ?? '—'})</span>
                        </td>
                        <td className="p-3 font-mono text-violet-300 font-bold">
                          {setup.rsiMa1Streak ?? 0} bars <span className="text-[10px] text-zinc-500">({setup.rsiMa1StreakDir ?? '—'})</span>
                        </td>
                        <td className="p-3">
                          {typeof setup.rsi === 'number' ? setup.rsi.toFixed(1) : '—'}{' '}
                          <span className="text-[10px] text-zinc-500">({setup.rsiState ?? '—'})</span>
                        </td>
                        <td className="p-3 text-[11px] text-zinc-400">
                          50: ${typeof setup.sma50 === 'number' ? setup.sma50.toFixed(2) : '—'} | 200: ${typeof setup.sma200 === 'number' ? setup.sma200.toFixed(2) : '—'}
                        </td>
                        <td className="p-3 text-zinc-300 font-mono">
                          {typeof setup.volumeRatio === 'number' ? setup.volumeRatio.toFixed(2) : '—'}x
                        </td>
                        <td className="p-3 text-right">
                          <button className="p-1.5 bg-zinc-900 hover:bg-zinc-800 text-violet-400 rounded-lg transition border border-zinc-800">
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            /* ACTIVE GRID GALLERY - AUTO RESCALED GRID */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3.5 sm:gap-4">
              {filteredSetups.map((setup) => (
                <SetupCard
                  key={`${setup.symbol}_${setup.timeframe}`}
                  setup={setup}
                  onClick={() => setSelectedSetup(setup)}
                  rsiLength={config.rsiLength}
                  globalStacked={chartsLayout === 'stacked'}
                  isStarred={appVersion === 'v2' ? starredSetups.includes(`${setup.symbol}_${setup.timeframe}`) : undefined}
                  onToggleStar={appVersion === 'v2' ? () => toggleStarSetup(setup.symbol, setup.timeframe) : undefined}
                />
              ))}
            </div>
          )}
        </section>
          </>
        )}

      </main>

      {/* FOOTER */}
      <footer className="border-t border-zinc-900/60 mt-16 py-8 bg-zinc-950">
        <div className="w-full max-w-[1920px] 2xl:max-w-[2200px] mx-auto px-2.5 sm:px-4 md:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-mono text-zinc-600">
          <div>
            © 2026 Momentum Fusion Scanner. All Rights Reserved.
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 justify-center text-[10px] md:text-xs">
            <span>Server Proxy: Node.js</span>
            <span>API Engine: Yahoo Finance / Binance fallbacks</span>
            <span>Client: React + Tailwind v4 + SVGs</span>
          </div>
        </div>
      </footer>

      {/* MODAL WINDOWS */}
      
      {/* 1. Setup details TradingView deep dive modal */}
      {selectedSetup && (
        <SetupDetailsModal
          setup={selectedSetup}
          onClose={() => setSelectedSetup(null)}
        />
      )}

      {/* 2. Custom Preset Creator popup */}
      {showSavePresetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-zinc-900 pb-2">
              <h3 className="font-bold text-sm text-zinc-200">Save Current Setup as Preset</h3>
              <button
                onClick={() => setShowSavePresetModal(false)}
                className="text-zinc-500 hover:text-zinc-300"
              >
                Cancel
              </button>
            </div>
            
            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-zinc-400 block font-mono">Preset Name</label>
                <input
                  type="text"
                  placeholder="e.g. My Fast Scalping Setup"
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-xs text-zinc-300 focus:outline-none focus:border-violet-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400 block font-mono">Short Description</label>
                <textarea
                  placeholder="Describe your template rules or target sectors..."
                  value={newPresetDesc}
                  rows={2}
                  onChange={(e) => setNewPresetDesc(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-xs text-zinc-300 focus:outline-none focus:border-violet-500"
                />
              </div>
            </div>

            <button
              onClick={handleSaveCustomPreset}
              disabled={!newPresetName.trim()}
              className="w-full py-2 bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-900 disabled:text-zinc-600 text-white font-medium rounded text-xs transition font-mono"
            >
              Save Configuration Template
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
