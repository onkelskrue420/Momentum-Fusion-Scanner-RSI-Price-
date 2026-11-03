import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { INSTRUMENTS, getMarketData } from './src/lib/marketData';
import { analyzeSetup } from './src/lib/indicators';
import { getMarketRegimeStatus, scanInstrumentV13, DEFAULT_SCANNER_V13_CONFIG } from './src/lib/scannerV13';
import { ScannerConfig, Timeframe, MarketType, SetupAnalysis, ScannerV13Config, ScannerV13Result } from './src/types';

const PORT = 3000;

const DEFAULT_CONFIG: ScannerConfig = {
  priceMA1Type: 'EMA',
  priceMA1Length: 21,
  priceMA2Type: 'EMA',
  priceMA2Length: 50,
  rsiLength: 14,
  rsiMA1Type: 'EMA',
  rsiMA1Length: 21,
  rsiMA2Type: 'EMA',
  rsiMA2Length: 50,
};

async function startServer() {
  const app = express();
  app.use(express.json());

  console.log(`[SERVER] Initializing Momentum Fusion Scanner Backend...`);

  // API Route: Get available instruments list
  app.get('/api/instruments', (req, res) => {
    res.json(INSTRUMENTS);
  });

  // API Route: Proxy Yahoo Finance requests to eliminate client-side CORS issues
  app.get('/api/proxy/yahoo', async (req, res) => {
    try {
      const symbol = String(req.query.symbol || '');
      const interval = String(req.query.interval || '1d');
      const range = String(req.query.range || '1y');

      if (!symbol) {
        return res.status(400).json({ error: 'Missing symbol parameter' });
      }

      const candidateSymbols = [symbol];
      if (symbol === '^DJI' || symbol === 'US30') candidateSymbols.push('YM=F', 'DIA');
      if (symbol === '^NDX' || symbol === 'NAS100') candidateSymbols.push('NQ=F', 'QQQ');
      if (symbol === '^GSPC' || symbol === 'SPX500') candidateSymbols.push('ES=F', 'SPY');

      for (const curSym of candidateSymbols) {
        const urls = [
          `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(curSym)}?interval=${interval}&range=${range}`,
          `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(curSym)}?interval=${interval}&range=${range}`
        ];

        for (const url of urls) {
          try {
            const upstream = await fetch(url, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept': 'application/json'
              }
            });

            if (upstream.ok) {
              const data = await upstream.json();
              if (data?.chart?.result?.[0]) {
                return res.json(data);
              }
            }
          } catch {
            // try next url
          }
        }
      }

      res.status(502).json({ error: `Upstream Yahoo Finance unreachable for ${symbol}` });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // API Route: Get pre-computed or fetched candles for any symbol
  app.get('/api/candles', async (req, res) => {
    try {
      const symbol = String(req.query.symbol || 'SPY');
      const timeframe = (req.query.timeframe as Timeframe) || '1d';
      const force = req.query.force === 'true';

      let inst = INSTRUMENTS.find(i => i.symbol === symbol || i.yahooSymbol === symbol);
      if (!inst) {
        inst = {
          symbol,
          displayName: symbol,
          yahooSymbol: symbol,
          type: 'stocks'
        };
      }

      const candles = await getMarketData(inst, timeframe, force);
      res.json({ success: true, symbol, timeframe, count: candles.length, candles });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // API Route: Run momentum scan with active preferences
  app.post('/api/scan', async (req, res) => {
    try {
      const timeframes: Timeframe[] = req.body.timeframes || ['1h', '4h', '1d'];
      const markets: MarketType[] = req.body.markets || ['indices', 'commodities', 'forex', 'crypto'];
      const config: ScannerConfig = { ...DEFAULT_CONFIG, ...req.body.config };
      const forceRefresh = !!req.body.forceRefresh;

      const activeInstruments = INSTRUMENTS.filter(inst => markets.includes(inst.type));
      const scanResults: SetupAnalysis[] = [];

      console.log(`[SCANNER] Starting scan: markets=[${markets.join(', ')}], timeframes=[${timeframes.join(', ')}], force=${forceRefresh}`);

      // Perform scans across active combinations with controlled concurrency
      const tasks: { inst: typeof activeInstruments[0]; timeframe: Timeframe }[] = [];
      for (const timeframe of timeframes) {
        for (const inst of activeInstruments) {
          tasks.push({ inst, timeframe });
        }
      }

      // Concurrency worker pool (max 8 concurrent requests)
      const CONCURRENCY = 8;
      let taskIndex = 0;

      const worker = async () => {
        while (taskIndex < tasks.length) {
          const currentIndex = taskIndex++;
          const { inst, timeframe } = tasks[currentIndex];
          try {
            const candles = await getMarketData(inst, timeframe, forceRefresh);
            if (candles && candles.length >= 35) {
              const analysis = analyzeSetup(
                candles,
                inst.displayName,
                inst.symbol,
                inst.type,
                timeframe,
                config
              );
              scanResults.push(analysis);
            }
          } catch (err: any) {
            console.warn(`[SCANNER WARNING] Could not analyze ${inst.symbol} (${timeframe}):`, err.message);
          }
        }
      };

      const workers = Array.from({ length: Math.min(CONCURRENCY, tasks.length) }, () => worker());
      await Promise.all(workers);

      // Sort results by overallScore from highest to lowest (premium rankings!)
      scanResults.sort((a, b) => b.overallScore - a.overallScore);

      console.log(`[SCANNER] Scan complete. Found ${scanResults.length} setups across ${timeframes.length} timeframes (including 1m).`);
      res.json({
        success: true,
        count: scanResults.length,
        setups: scanResults,
        scannedAt: Date.now()
      });
    } catch (error: any) {
      console.error(`[SERVER ERROR] /api/scan failed:`, error);
      res.status(500).json({
        success: false,
        error: error.message || 'Internal Server Error'
      });
    }
  });

  // API Route: Scanner v1.3 Market Regime status (SPY > 200 MA, VIX < 30)
  app.get('/api/v13/regime', async (req, res) => {
    try {
      const regime = await getMarketRegimeStatus();
      res.json({ success: true, regime });
    } catch (error: any) {
      console.error('[SERVER ERROR] /api/v13/regime failed:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // API Route: Scanner v1.3 Moving Average Respect & RSI Pullback Scan
  app.post('/api/v13/scan', async (req, res) => {
    try {
      // Support scanning multiple timeframes simultaneously or a single timeframe
      const targetTimeframes: Timeframe[] = Array.isArray(req.body.timeframes) && req.body.timeframes.length > 0
        ? req.body.timeframes
        : [req.body.timeframe || '1h'];

      const symbols: string[] = req.body.symbols || [];
      const config: ScannerV13Config = { ...DEFAULT_SCANNER_V13_CONFIG, ...req.body.config };
      const forceRefresh = !!req.body.forceRefresh;

      const regime = await getMarketRegimeStatus();

      let targetInsts = INSTRUMENTS;
      if (symbols.length > 0) {
        targetInsts = symbols.map(sym => {
          const existing = INSTRUMENTS.find(i => i.symbol === sym);
          if (existing) return existing;
          return { symbol: sym, displayName: sym, yahooSymbol: sym, type: 'stocks' as MarketType };
        });
      }

      console.log(`[SCANNER v1.3] Scanning ${targetInsts.length} instruments across ${targetTimeframes.length} timeframes: [${targetTimeframes.join(', ')}]...`);

      // Construct task queue across all target timeframes
      const tasks: { inst: typeof targetInsts[0]; timeframe: Timeframe }[] = [];
      for (const timeframe of targetTimeframes) {
        for (const inst of targetInsts) {
          tasks.push({ inst, timeframe });
        }
      }

      const results: ScannerV13Result[] = [];
      const CONCURRENCY = 8;
      let taskIdx = 0;

      const worker = async () => {
        while (taskIdx < tasks.length) {
          const idx = taskIdx++;
          const { inst, timeframe } = tasks[idx];
          try {
            const res = await scanInstrumentV13(inst, timeframe, config, regime, forceRefresh);
            results.push(res);
          } catch (err: any) {
            console.warn(`[SCANNER v1.3 WARNING] Could not analyze ${inst.symbol} on ${timeframe}:`, err.message);
          }
        }
      };

      const workers = Array.from({ length: Math.min(CONCURRENCY, tasks.length) }, () => worker());
      await Promise.all(workers);

      // Sort: Actionable signals (BUY/SELL) first, then by confidence score
      results.sort((a, b) => {
        if (a.signal !== 'NEUTRAL' && b.signal === 'NEUTRAL') return -1;
        if (a.signal === 'NEUTRAL' && b.signal !== 'NEUTRAL') return 1;
        return b.confidenceScore - a.confidenceScore;
      });

      res.json({
        success: true,
        count: results.length,
        timeframes: targetTimeframes,
        regime,
        results,
        scannedAt: Date.now()
      });
    } catch (error: any) {
      console.error('[SERVER ERROR] /api/v13/scan failed:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Background Cache Warmer: warm up standard charts so users get instant load times
  const warmCache = async () => {
    console.log('[BACKGROUND] Warming market data cache for major instruments...');
    const majorSymbols = INSTRUMENTS.slice(0, 8); // pre-cache some key instruments
    const targetTimeframes: Timeframe[] = ['1m', '15m', '1h', '4h', '1d'];
    
    for (const timeframe of targetTimeframes) {
      for (const inst of majorSymbols) {
        try {
          await getMarketData(inst, timeframe, false);
          // Wait 300ms between calls to be highly polite to API limits
          await new Promise(resolve => setTimeout(resolve, 300));
        } catch (e: any) {
          console.warn(`[BACKGROUND] Warm cache failed for ${inst.symbol} ${timeframe}:`, e.message);
        }
      }
    }
    console.log('[BACKGROUND] Standard cache warming phase completed.');
  };

  // Warm cache asynchronously without blocking startup
  setTimeout(warmCache, 2000);

  // Periodically re-warm/scan every 10 minutes in the background
  setInterval(warmCache, 10 * 60 * 1000);

  // Set up frontend asset serving & routing
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // Support single page app fallback in Express
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SERVER] Momentum Fusion Scanner running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('[SERVER CRITICAL] Failed to start server:', err);
});
