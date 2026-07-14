import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { INSTRUMENTS, getMarketData } from './src/lib/marketData';
import { analyzeSetup } from './src/lib/indicators';
import { ScannerConfig, Timeframe, MarketType, SetupAnalysis } from './src/types';

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

      // Perform scans across active combinations in parallel/sequential batches
      // We will loop over timeframes and instruments
      const scanPromises: Promise<void>[] = [];

      for (const timeframe of timeframes) {
        for (const inst of activeInstruments) {
          const runScan = async () => {
            try {
              const candles = await getMarketData(inst, timeframe, forceRefresh);
              if (candles && candles.length >= 50) {
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
              // Gracefully continue without this setup card
            }
          };
          scanPromises.push(runScan());
        }
      }

      // Wait for all scans to complete
      await Promise.all(scanPromises);

      // Sort results by overallScore from highest to lowest (premium rankings!)
      scanResults.sort((a, b) => b.overallScore - a.overallScore);

      console.log(`[SCANNER] Scan complete. Found ${scanResults.length} setups.`);
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

  // Background Cache Warmer: warm up standard charts so users get instant load times
  const warmCache = async () => {
    console.log('[BACKGROUND] Warming market data cache for major instruments...');
    const majorSymbols = INSTRUMENTS.slice(0, 8); // pre-cache some key instruments
    const targetTimeframes: Timeframe[] = ['1h', '4h', '1d'];
    
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
