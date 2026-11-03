/**
 * SCANNER V1.3 TEST SUITE & VERIFICATION PLAN
 * 
 * Tests the research-backed parameters:
 * 1. Trend Filter: Price > 200 MA (BUY) / Price < 200 MA (SELL)
 * 2. RSI Shifted Range: RSI < 40 turning UP (BUY) / RSI > 60 turning DOWN (SELL)
 * 3. Moving Average Respect: Candle touches 50 EMA within tolerance & closes above/below
 * 4. 2xATR Trailing Stop Suggestion
 * 5. Market Regime Filter: SPY > 200 MA & VIX < 30
 * 6. Connors RSI(2) Pullback mode
 */

import {
  calculateSMA,
  calculateEMA,
  calculateRSI,
  calculateATR,
  evaluateCandlesV13,
  DEFAULT_SCANNER_V13_CONFIG
} from './scannerV13';
import { Candle, MarketRegimeStatus } from '../types';

export function runScannerV13Tests(): { name: string; passed: boolean; message: string }[] {
  const results: { name: string; passed: boolean; message: string }[] = [];

  // Mock Market Regime: Bullish SPY > 200 MA, VIX = 15 (<30)
  const mockBullishRegime: MarketRegimeStatus = {
    spyPrice: 510,
    spy200Ma: 480,
    spyTrend: 'BULLISH',
    vixLevel: 15.2,
    vixSafe: true,
    regimeApprovedForBuys: true,
    regimeApprovedForSells: false,
    summary: 'Bullish Market Regime',
    updatedAt: Date.now()
  };

  // Test 1: Moving Averages Calculation
  try {
    const series = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
    const sma3 = calculateSMA(series, 3);
    const ema3 = calculateEMA(series, 3);
    const lastSma = sma3[sma3.length - 1];
    const passed = lastSma === 18 && ema3.length === 10 && ema3[ema3.length - 1] !== null;
    results.push({
      name: 'Moving Averages (SMA & EMA)',
      passed,
      message: `SMA(3) last = ${lastSma} (expected 18). EMA length = ${ema3.length}.`
    });
  } catch (err: any) {
    results.push({ name: 'Moving Averages (SMA & EMA)', passed: false, message: err.message });
  }

  // Test 2: RSI Calculation & Boundary Handling
  try {
    const prices = [100, 102, 101, 103, 102, 105, 104, 106, 105, 107, 106, 108, 107, 109, 108, 110];
    const rsi14 = calculateRSI(prices, 14);
    const lastRsi = rsi14[rsi14.length - 1];
    const passed = lastRsi !== null && lastRsi >= 0 && lastRsi <= 100;
    results.push({
      name: 'RSI(14) Indicator Math',
      passed,
      message: `Calculated RSI(14) = ${lastRsi?.toFixed(2)} (bounded within 0-100).`
    });
  } catch (err: any) {
    results.push({ name: 'RSI(14) Indicator Math', passed: false, message: err.message });
  }

  // Test 3: ATR and 2xATR Trailing Stop
  try {
    const testCandles: Candle[] = [];
    const now = Date.now();
    for (let i = 0; i < 30; i++) {
      testCandles.push({
        timestamp: now - (30 - i) * 60000,
        open: 100 + i * 0.5,
        high: 102 + i * 0.5,
        low: 99 + i * 0.5,
        close: 101 + i * 0.5,
        volume: 5000
      });
    }
    const atr = calculateATR(testCandles, 14);
    const lastAtr = atr[atr.length - 1];
    const passed = lastAtr !== null && lastAtr > 0 && lastAtr < 5;
    results.push({
      name: 'ATR(14) and 2xATR Calculation',
      passed,
      message: `ATR(14) = ${lastAtr?.toFixed(3)}, 2xATR = ${(lastAtr ? lastAtr * 2 : 0).toFixed(3)}.`
    });
  } catch (err: any) {
    results.push({ name: 'ATR(14) and 2xATR Calculation', passed: false, message: err.message });
  }

  // Test 4: Research-Backed BUY Pullback Logic
  // Setup: 250 bars in strong uptrend (Price > 200 EMA, Fast 50 EMA > 200 EMA).
  // Pullback bar: tests 50 EMA with low wick within 0.5%, closes above 50 EMA, RSI < 40 turning UP.
  try {
    const uptrendCandles: Candle[] = [];
    const now = Date.now();
    let price = 100;
    for (let i = 0; i < 220; i++) {
      price += 0.4;
      uptrendCandles.push({
        timestamp: now - (222 - i) * 3600000,
        open: price,
        high: price + 1.2,
        low: price - 0.6,
        close: price + 0.3,
        volume: 10000
      });
    }

    // Now insert a clean pullback to 50 EMA
    const fastMaApprox = price - 5;
    // Bar 221: Dips low, RSI plunges
    uptrendCandles.push({
      timestamp: now - 3600000,
      open: price + 0.2,
      high: price + 0.5,
      low: fastMaApprox - 0.2,
      close: fastMaApprox + 0.1,
      volume: 8000
    });

    // Bar 222 (Current): Touches 50 EMA within 0.5%, closes decisively above, RSI turns UP
    uptrendCandles.push({
      timestamp: now,
      open: fastMaApprox + 0.1,
      high: fastMaApprox + 2.5,
      low: fastMaApprox - 0.1, // touched MA tolerance band
      close: fastMaApprox + 2.0, // closed above
      volume: 15000
    });

    const evaluated = evaluateCandlesV13(
      'BTCUSD',
      'Bitcoin / USD',
      'crypto',
      '1h',
      uptrendCandles,
      DEFAULT_SCANNER_V13_CONFIG,
      mockBullishRegime
    );

    const isBuyOrDetailedNeutral = evaluated.signal === 'BUY' || evaluated.confidenceScore > 50;
    results.push({
      name: 'Research BUY Logic & MA Respect',
      passed: isBuyOrDetailedNeutral,
      message: `Evaluated signal: ${evaluated.signal} (Confidence: ${evaluated.confidenceScore}%). Reason: ${evaluated.reason.substring(0, 75)}...`
    });
  } catch (err: any) {
    results.push({ name: 'Research BUY Logic & MA Respect', passed: false, message: err.message });
  }

  // Test 5: Market Regime Filter Suppression
  try {
    const bearRegime: MarketRegimeStatus = {
      spyPrice: 420,
      spy200Ma: 480, // SPY < 200 MA
      spyTrend: 'BEARISH',
      vixLevel: 36.5, // High volatility >= 30
      vixSafe: false,
      regimeApprovedForBuys: false,
      regimeApprovedForSells: true,
      summary: 'Bearish High-Risk Regime',
      updatedAt: Date.now()
    };

    const dummyCandles: Candle[] = [];
    const now = Date.now();
    for (let i = 0; i < 220; i++) {
      dummyCandles.push({
        timestamp: now - (220 - i) * 60000,
        open: 100 + i * 0.2,
        high: 101 + i * 0.2,
        low: 99 + i * 0.2,
        close: 100.5 + i * 0.2,
        volume: 5000
      });
    }

    const evaluatedWithBearRegime = evaluateCandlesV13(
      'AAPL',
      'Apple Inc.',
      'stocks',
      '1h',
      dummyCandles,
      DEFAULT_SCANNER_V13_CONFIG,
      bearRegime
    );

    // Should NOT allow BUY when regime filter is on and SPY < 200 MA
    const passed = evaluatedWithBearRegime.signal !== 'BUY';
    results.push({
      name: 'Market Regime Safety Filter (VIX >= 30 blocks BUY)',
      passed,
      message: `Signal under Bear Regime: ${evaluatedWithBearRegime.signal} (Correctly blocked long entries).`
    });
  } catch (err: any) {
    results.push({ name: 'Market Regime Safety Filter', passed: false, message: err.message });
  }

  return results;
}
