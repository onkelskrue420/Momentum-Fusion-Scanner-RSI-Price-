import { MAType, ScannerConfig } from '../types';

interface ConfigurationPanelProps {
  config: ScannerConfig;
  onChange: (newConfig: ScannerConfig) => void;
  onReset: () => void;
}

const MA_TYPES: MAType[] = ['EMA', 'SMA', 'WMA', 'RMA'];

export default function ConfigurationPanel({
  config,
  onChange,
  onReset,
}: ConfigurationPanelProps) {
  const updateField = (key: keyof ScannerConfig, val: any) => {
    onChange({
      ...config,
      [key]: val,
    });
  };

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 shadow-2xl space-y-6" id="config-panel">
      <div>
        <h3 className="text-zinc-100 font-medium text-sm flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-violet-500"></span>
          MA Calculation Engine
        </h3>
        <p className="text-xs text-zinc-500 mt-1">
          Customize indicators below to scan and score different trend setups.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
        {/* PRICE TREND SETTINGS */}
        <div className="space-y-4 border-r border-zinc-900 pr-0 md:pr-4">
          <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex justify-between">
            <span>Price Trend Indicators</span>
            <span className="text-[10px] text-zinc-500 lowercase normal-case">EMA21 + EMA50 recommended</span>
          </h4>

          {/* Price MA1 */}
          <div className="space-y-2">
            <label className="text-[11px] text-zinc-400 font-mono block">Fast Price Moving Average (MA1)</label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <select
                  value={config.priceMA1Type}
                  onChange={(e) => updateField('priceMA1Type', e.target.value as MAType)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-violet-500 font-mono"
                >
                  {MA_TYPES.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <div>
                <input
                  type="number"
                  min="2"
                  max="200"
                  value={config.priceMA1Length}
                  onChange={(e) => updateField('priceMA1Length', parseInt(e.target.value) || 2)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-violet-500 font-mono text-center"
                />
              </div>
            </div>
          </div>

          {/* Price MA2 */}
          <div className="space-y-2">
            <label className="text-[11px] text-zinc-400 font-mono block">Slow Price Moving Average (MA2)</label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <select
                  value={config.priceMA2Type}
                  onChange={(e) => updateField('priceMA2Type', e.target.value as MAType)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-violet-500 font-mono"
                >
                  {MA_TYPES.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <div>
                <input
                  type="number"
                  min="2"
                  max="200"
                  value={config.priceMA2Length}
                  onChange={(e) => updateField('priceMA2Length', parseInt(e.target.value) || 2)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-violet-500 font-mono text-center"
                />
              </div>
            </div>
          </div>
        </div>

        {/* RSI MOMENTUM SETTINGS */}
        <div className="space-y-4">
          <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex justify-between">
            <span>RSI Momentum Indicators</span>
            <span className="text-[10px] text-zinc-500 lowercase normal-case">Default RSI length is 14</span>
          </h4>

          {/* RSI Length */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-[11px] text-zinc-400 font-mono block">Relative Strength Index (RSI) Period</label>
              <span className="text-xs text-zinc-500 font-mono">{config.rsiLength}</span>
            </div>
            <input
              type="range"
              min="5"
              max="50"
              value={config.rsiLength}
              onChange={(e) => updateField('rsiLength', parseInt(e.target.value))}
              className="w-full accent-violet-500 h-1 bg-zinc-800 rounded-lg cursor-pointer"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* RSI MA1 */}
            <div className="space-y-1.5">
              <label className="text-[10px] text-zinc-500 font-mono block">Fast RSI MA1</label>
              <div className="grid grid-cols-5 gap-1">
                <select
                  value={config.rsiMA1Type}
                  onChange={(e) => updateField('rsiMA1Type', e.target.value as MAType)}
                  className="col-span-3 bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-[11px] text-zinc-300 focus:outline-none focus:border-violet-500 font-mono"
                >
                  {MA_TYPES.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                <input
                  type="number"
                  min="2"
                  max="100"
                  value={config.rsiMA1Length}
                  onChange={(e) => updateField('rsiMA1Length', parseInt(e.target.value) || 2)}
                  className="col-span-2 bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-[11px] text-zinc-300 focus:outline-none focus:border-violet-500 font-mono text-center"
                />
              </div>
            </div>

            {/* RSI MA2 */}
            <div className="space-y-1.5">
              <label className="text-[10px] text-zinc-500 font-mono block">Slow RSI MA2</label>
              <div className="grid grid-cols-5 gap-1">
                <select
                  value={config.rsiMA2Type}
                  onChange={(e) => updateField('rsiMA2Type', e.target.value as MAType)}
                  className="col-span-3 bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-[11px] text-zinc-300 focus:outline-none focus:border-violet-500 font-mono"
                >
                  {MA_TYPES.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                <input
                  type="number"
                  min="2"
                  max="100"
                  value={config.rsiMA2Length}
                  onChange={(e) => updateField('rsiMA2Length', parseInt(e.target.value) || 2)}
                  className="col-span-2 bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-[11px] text-zinc-300 focus:outline-none focus:border-violet-500 font-mono text-center"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-3 border-t border-zinc-900 gap-3">
        <button
          onClick={onReset}
          className="px-3.5 py-1.5 border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 rounded text-xs transition duration-200 font-mono"
        >
          Reset Engine Defaults
        </button>
      </div>
    </div>
  );
}
