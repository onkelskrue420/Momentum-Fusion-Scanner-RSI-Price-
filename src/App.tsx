import React, { useState, useEffect } from 'react';
import { SavedPreset, ScannerConfig, SetupAnalysis, Timeframe, MarketType } from './types';
import { DEFAULT_SCANNER_CONFIG, PRESET_CONFIGS } from './lib/presets';
import ConfigurationPanel from './components/ConfigurationPanel';
import FilterToolbar from './components/FilterToolbar';
import SetupCard from './components/SetupCard';
import SetupDetailsModal from './components/SetupDetailsModal';
import { 
  Sparkles, 
  Layers, 
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
  Gauge
} from 'lucide-react';

export default function App() {
  // Scanner state
  const [config, setConfig] = useState<ScannerConfig>(DEFAULT_SCANNER_CONFIG);
  const [selectedTimeframes, setSelectedTimeframes] = useState<Timeframe[]>(['1h', '4h', '1d']);
  const [selectedMarkets, setSelectedMarkets] = useState<MarketType[]>(['indices', 'commodities', 'forex', 'crypto']);
  
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
  const runScan = async (forceRefresh = false) => {
    setIsScanning(true);
    setScanError(null);
    try {
      const response = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timeframes: selectedTimeframes,
          markets: selectedMarkets,
          config,
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
      } else {
        throw new Error(data.error || 'Unknown scanner error');
      }
    } catch (err: any) {
      console.error('[SCAN ERROR]', err);
      setScanError(err.message || 'Connecting to the scanning service failed.');
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
      setIsScanning(true);
      fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timeframes: preset.timeframes,
          markets: preset.markets,
          config: preset.config,
          forceRefresh: false
        })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setSetups(data.setups);
          setLastScannedAt(data.scannedAt);
        }
      })
      .catch(e => console.error(e))
      .finally(() => setIsScanning(false));
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

  // Filters setup logic
  const filteredSetups = setups.filter(setup => {
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

    return matchesSearch && matchesScore && matchesDirection;
  }).slice(0, gallerySize);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300 font-sans antialiased selection:bg-violet-500/30 selection:text-violet-200">
      
      {/* GLOW DECORATIONS */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-600/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute top-1/3 right-10 w-80 h-80 bg-blue-600/5 rounded-full blur-3xl pointer-events-none"></div>

      {/* TOP NAVIGATION BAR */}
      <header className="sticky top-0 z-40 bg-zinc-950/85 backdrop-blur-md border-b border-zinc-900/85">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col sm:flex-row justify-between items-center gap-3">
          
          {/* Logo Title */}
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-gradient-to-br from-violet-600 to-indigo-700 rounded-xl shadow-lg shadow-violet-950/20">
              <Gauge className="h-5 w-5 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-sm font-extrabold tracking-tight text-white font-sans uppercase">
                  Momentum Fusion
                </h1>
                <span className="text-[10px] bg-violet-900/60 border border-violet-800 text-violet-300 px-1.5 py-0.2 rounded font-mono font-bold tracking-wider">
                  SCANNER V1
                </span>
              </div>
              <span className="text-[11px] text-zinc-500 font-light block">
                RSI & Price Trend Gallery
              </span>
            </div>
          </div>

          {/* Clock & Refresh Metrics */}
          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="hidden md:flex items-center gap-1.5 text-zinc-500 bg-zinc-900/50 border border-zinc-800/40 px-2.5 py-1 rounded-md">
              <Clock className="h-3.5 w-3.5 text-zinc-400" />
              <span>{utcTime}</span>
            </div>
            {lastScannedAt && (
              <span className="text-zinc-500 text-[11px]">
                Scanned: <strong className="text-zinc-400">{new Date(lastScannedAt).toLocaleTimeString()}</strong>
              </span>
            )}
          </div>
        </div>
      </header>

      {/* MAIN APPLICATION CONTAINER */}
      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        
        {/* PRESET CHOOSER GALLERY */}
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

        {/* PARAMETERS CONFIGURATION PANEL ACCORDION */}
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
          <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
            <h2 className="text-sm font-extrabold tracking-tight text-zinc-100 flex items-center gap-2">
              <Layers className="h-4 w-4 text-violet-500" />
              Active Momentum Gallery
            </h2>
            <span className="text-xs font-mono text-zinc-500">
              Showing {filteredSetups.length} of {setups.length} technical setups found
            </span>
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
          ) : (
            /* ACTIVE GRID GALLERY */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredSetups.map((setup) => (
                <SetupCard
                  key={`${setup.symbol}_${setup.timeframe}`}
                  setup={setup}
                  onClick={() => setSelectedSetup(setup)}
                  rsiLength={config.rsiLength}
                  globalStacked={chartsLayout === 'stacked'}
                />
              ))}
            </div>
          )}
        </section>

      </main>

      {/* FOOTER */}
      <footer className="border-t border-zinc-900/60 mt-16 py-8 bg-zinc-950">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-mono text-zinc-600">
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
