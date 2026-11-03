import React, { useState, useEffect } from 'react';
import { SetupAnalysis, Timeframe } from '../types';
import { X, ExternalLink, ShieldCheck, HelpCircle, Activity, Info, Clock, AlertCircle } from 'lucide-react';
import { getMarketActivity } from '../utils/timeFormat';

interface SetupDetailsModalProps {
  setup: SetupAnalysis;
  onClose: () => void;
}

// Map local symbols to standard TradingView ticker names
export function getTradingViewSymbol(symbol: string): string {
  switch (symbol) {
    case 'US30': return 'FOREXCOM:SPX500'; // or DJI
    case 'NAS100': return 'NASDAQ:NDX';
    case 'SPX500': return 'SP:SPX';
    case 'GER40': return 'INDEX:DEU40';
    case 'GOLD': return 'TVC:GOLD';
    case 'SILVER': return 'TVC:SILVER';
    case 'EURUSD': return 'FX:EURUSD';
    case 'GBPUSD': return 'FX:GBPUSD';
    case 'USDJPY': return 'FX:USDJPY';
    case 'BTCUSD': return 'BINANCE:BTCUSDT';
    case 'ETHUSD': return 'BINANCE:ETHUSDT';
    default: return symbol;
  }
}

// Map timeframes to TradingView widget intervals
export function getTradingViewInterval(tf: Timeframe): string {
  switch (tf) {
    case '1m': return '1';
    case '5m': return '5';
    case '15m': return '15';
    case '30m': return '30';
    case '1h': return '60';
    case '4h': return '240';
    case '1d': return 'D';
    case '1wk': return 'W';
    case '1mo': return 'M';
    default: return '60';
  }
}

export default function SetupDetailsModal({ setup, onClose }: SetupDetailsModalProps) {
  const [now, setNow] = useState<number>(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const lastCandleTimestamp = setup.dataPoints && setup.dataPoints.length > 0
    ? setup.dataPoints[setup.dataPoints.length - 1].timestamp
    : undefined;

  const marketInfo = getMarketActivity(lastCandleTimestamp, setup.timeframe, now);

  const tvSymbol = getTradingViewSymbol(setup.symbol);
  const tvInterval = getTradingViewInterval(setup.timeframe);

  // Deep TradingView Chart Iframe URL
  const tvWidgetUrl = `https://s.tradingview.com/widgetembed/?frameElementId=tradingview_chart&symbol=${encodeURIComponent(
    tvSymbol
  )}&interval=${tvInterval}&theme=dark&style=1&timezone=exchange&withdateranges=true`;

  const externalTvUrl = `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(tvSymbol)}&interval=${tvInterval}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm transition-all duration-300 animate-fade-in" id="setup-details-modal">
      <div className="relative w-full max-w-6xl h-[90vh] bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* MODAL HEADER */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold text-zinc-100">{setup.symbol} Analysis</h2>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-violet-950 border border-violet-800 text-violet-300 uppercase tracking-wider">
                  {setup.timeframe} Setup
                </span>
                <span className="text-xs font-mono text-zinc-500 hidden sm:inline">
                  {setup.displayName}
                </span>

                {/* Market Live/Closed Indicator & Candle Time Badge */}
                <div className={`px-2.5 py-0.5 rounded-lg border text-xs font-mono flex items-center gap-2 ${marketInfo.statusColor}`}>
                  {marketInfo.isMarketOpen ? (
                    <>
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span className="font-bold">LIVE</span>
                      <span className="opacity-40">•</span>
                      <span>Last Bar: <strong>{marketInfo.lastCandleTimeStr}</strong></span>
                      <span className="text-[10px] bg-emerald-900/60 px-1.5 py-0.2 rounded border border-emerald-400/30">
                        {marketInfo.elapsedStr}
                      </span>
                      {marketInfo.nextBarCountdownStr !== '—' && (
                        <span className="flex items-center gap-1 text-cyan-300">
                          <Clock className="h-3 w-3" />
                          Next: <strong>{marketInfo.nextBarCountdownStr}</strong>
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      <span className="h-2 w-2 rounded-full bg-amber-400"></span>
                      <span className="font-bold">CLOSED</span>
                      <span className="opacity-40">•</span>
                      <span>Last Bar: <strong>{marketInfo.lastCandleTimeStr}</strong></span>
                      <span className="text-[10px] bg-amber-900/60 text-amber-200 px-1.5 py-0.2 rounded border border-amber-400/30">
                        Closed {marketInfo.elapsedStr}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5 font-light">
                Momentum scanning model: <strong className="text-zinc-300 font-semibold">{setup.setupQualityDesc}</strong>
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* External TradingView Trigger CTA */}
            <a
              href={externalTvUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-xs font-semibold rounded-lg text-white transition-colors shadow-lg shadow-violet-950/20 font-sans"
            >
              Open TradingView
              <ExternalLink className="h-3 w-3" />
            </a>
            
            <button
              onClick={onClose}
              className="p-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Closed market banner in modal if stationary */}
        {!marketInfo.isMarketOpen && (
          <div className="bg-amber-950/30 border-b border-amber-900/40 px-4 py-1.5 text-xs font-mono text-amber-300 flex items-center gap-2">
            <AlertCircle className="h-3.5 w-3.5 text-amber-400 flex-shrink-0" />
            <span>
              Exchange currently closed for {setup.symbol}. Last candle printed at <strong>{marketInfo.lastCandleTimeStr}</strong> ({marketInfo.elapsedStr}). Live quote streaming resumes during standard session hours.
            </span>
          </div>
        )}

        {/* MODAL BODY */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden bg-zinc-950">
          
          {/* LEFT PANEL: 8 cols - Interactive TradingView charting */}
          <div className="lg:col-span-8 flex flex-col border-r border-zinc-900 h-full relative">
            <div className="absolute top-2 left-2 bg-zinc-900/90 border border-zinc-800 px-2 py-1 rounded text-[10px] text-zinc-400 font-mono z-10 flex items-center gap-1 backdrop-blur-sm">
              <Activity className="h-3 w-3 text-emerald-400" />
              Live Interactive TV Widget
            </div>
            
            <div className="flex-1 w-full h-full bg-zinc-900">
              <iframe
                title={`TradingView Chart for ${setup.symbol}`}
                src={tvWidgetUrl}
                className="w-full h-full border-0"
                allowFullScreen
                referrerPolicy="no-referrer"
              />
            </div>
          </div>

          {/* RIGHT PANEL: 4 cols - Quantitative breakdown metrics */}
          <div className="lg:col-span-4 p-5 overflow-y-auto space-y-6 h-full bg-zinc-950 flex flex-col justify-between">
            <div className="space-y-6">
              {/* Score Highlight Box */}
              <div className="bg-zinc-900/40 border border-zinc-900 rounded-xl p-4 text-center space-y-1">
                <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono font-bold block">
                  Aggregate Scanner Score
                </span>
                <div className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-violet-400 to-amber-400 font-sans tracking-tight">
                  {setup.overallScore} / 100
                </div>
                <div className="text-xs font-mono text-zinc-400 font-light mt-1">
                  Direction: <strong className="text-zinc-200">{setup.direction}</strong>
                </div>
              </div>

              {/* MA Trend Respect & Persistence Streaks */}
              {setup.priceMa1Streak !== undefined && (
                <div className="bg-zinc-900/60 border border-zinc-800 p-3.5 rounded-xl space-y-2 font-mono">
                  <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">
                    Moving Average Trend Respect Streaks
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-zinc-950 p-2 rounded border border-zinc-900">
                      <span className="text-[10px] text-zinc-500 uppercase block">Price vs MA1</span>
                      <span className="font-bold text-amber-300">
                        {setup.priceMa1Streak} candles ({setup.priceMa1StreakDir})
                      </span>
                    </div>
                    <div className="bg-zinc-950 p-2 rounded border border-zinc-900">
                      <span className="text-[10px] text-zinc-500 uppercase block">Price vs MA2</span>
                      <span className="font-bold text-amber-300">
                        {setup.priceMa2Streak} candles ({setup.priceMa2StreakDir})
                      </span>
                    </div>
                    <div className="bg-zinc-950 p-2 rounded border border-zinc-900">
                      <span className="text-[10px] text-zinc-500 uppercase block">RSI vs RSI MA1</span>
                      <span className="font-bold text-violet-300">
                        {setup.rsiMa1Streak} candles ({setup.rsiMa1StreakDir})
                      </span>
                    </div>
                    <div className="bg-zinc-950 p-2 rounded border border-zinc-900">
                      <span className="text-[10px] text-zinc-500 uppercase block">RSI vs RSI MA2</span>
                      <span className="font-bold text-violet-300">
                        {setup.rsiMa2Streak} candles ({setup.rsiMa2StreakDir})
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Mathematical Metrics breakdown */}
              <div className="space-y-4">
                <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-violet-500" />
                  Score Breakdown
                </h3>

                <div className="space-y-3 font-mono text-xs">
                  {/* Price Trend Quality */}
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Price Trend Quality</span>
                      <span className="text-zinc-300 font-bold">{setup.priceTrendQuality} / 25</span>
                    </div>
                    <div className="h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${(setup.priceTrendQuality / 25) * 100}%` }}
                      ></div>
                    </div>
                    <p className="text-[10px] text-zinc-500 leading-normal font-sans italic mt-0.5">
                      {setup.priceTrendDesc}
                    </p>
                  </div>

                  {/* RSI Trend Quality */}
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-zinc-400">RSI Trend Quality</span>
                      <span className="text-zinc-300 font-bold">{setup.rsiTrendQuality} / 25</span>
                    </div>
                    <div className="h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${(setup.rsiTrendQuality / 25) * 100}%` }}
                      ></div>
                    </div>
                    <p className="text-[10px] text-zinc-500 leading-normal font-sans italic mt-0.5">
                      {setup.rsiTrendDesc}
                    </p>
                  </div>

                  {/* Price/RSI Alignment */}
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Price + RSI Alignment</span>
                      <span className="text-zinc-300 font-bold">{setup.correlationValue} / 30</span>
                    </div>
                    <div className="h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-violet-500 rounded-full"
                        style={{ width: `${(setup.correlationValue / 30) * 100}%` }}
                      ></div>
                    </div>
                    <p className="text-[10px] text-zinc-500 leading-normal font-sans mt-0.5">
                      Pearson correlation: <strong className="text-zinc-400">{setup.correlationScore}%</strong>
                    </p>
                  </div>

                  {/* Trend Smoothness */}
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Trend Smoothness</span>
                      <span className="text-zinc-300 font-bold">{setup.smoothness} / 10</span>
                    </div>
                    <div className="h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-pink-500 rounded-full"
                        style={{ width: `${(setup.smoothness / 10) * 100}%` }}
                      ></div>
                    </div>
                    <p className="text-[10px] text-zinc-500 leading-normal font-sans mt-0.5">
                      Kaufman Efficiency Ratio (ER) filter
                    </p>
                  </div>

                  {/* Momentum Velocity */}
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Momentum Strength</span>
                      <span className="text-zinc-300 font-bold">{setup.momentumStrength} / 10</span>
                    </div>
                    <div className="h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full"
                        style={{ width: `${(setup.momentumStrength / 10) * 100}%` }}
                      ></div>
                    </div>
                    <p className="text-[10px] text-zinc-500 leading-normal font-sans mt-0.5">
                      Price/MA expansion and RSI velocity
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Disclaimer and warnings */}
            <div className="bg-zinc-900/30 border border-zinc-900/80 p-3 rounded-lg space-y-1.5 mt-4">
              <span className="text-[10px] font-mono text-zinc-400 flex items-center gap-1">
                <Info className="h-3.5 w-3.5 text-zinc-500" />
                QUANTITATIVE FOOTNOTE
              </span>
              <p className="text-[10px] leading-normal text-zinc-500">
                This scanner analyzes historical price data and relative strength indices to rank technical structures. It does not predict trend directions, recommend trade entries, or constitute financial advice. Conduct thorough risk analysis before placing orders.
              </p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
