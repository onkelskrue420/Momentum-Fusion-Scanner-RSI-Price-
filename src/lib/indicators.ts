import { Candle, MAType, IndicatorData, SetupAnalysis, ScannerConfig, MarketType } from '../types';

// Moving Average Utilities
export function calculateSMA(values: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else {
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += values[i - j];
      }
      result.push(sum / period);
    }
  }
  return result;
}

export function calculateEMA(values: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  if (values.length === 0) return result;
  
  const k = 2 / (period + 1);
  
  // First value initialized as SMA or just the first item
  let firstValidSma = 0;
  let count = 0;
  for (let i = 0; i < period && i < values.length; i++) {
    firstValidSma += values[i];
    count++;
  }
  const initialEma = firstValidSma / count;
  
  let prevEma = initialEma;
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else if (i === period - 1) {
      result.push(initialEma);
      prevEma = initialEma;
    } else {
      const curEma = values[i] * k + prevEma * (1 - k);
      result.push(curEma);
      prevEma = curEma;
    }
  }
  return result;
}

export function calculateWMA(values: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  const weightSum = (period * (period + 1)) / 2;
  
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else {
      let sum = 0;
      for (let j = 0; j < period; j++) {
        const weight = period - j;
        sum += values[i - j] * weight;
      }
      result.push(sum / weightSum);
    }
  }
  return result;
}

export function calculateRMA(values: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  if (values.length === 0) return result;
  
  const alpha = 1 / period;
  
  // Initialize first value as SMA
  let sum = 0;
  for (let i = 0; i < period && i < values.length; i++) {
    sum += values[i];
  }
  const initialSma = sum / Math.min(period, values.length);
  
  let prevRma = initialSma;
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else if (i === period - 1) {
      result.push(initialSma);
      prevRma = initialSma;
    } else {
      const curRma = values[i] * alpha + prevRma * (1 - alpha);
      result.push(curRma);
      prevRma = curRma;
    }
  }
  return result;
}

export function calculateMA(values: number[], period: number, type: MAType): (number | null)[] {
  switch (type) {
    case 'SMA': return calculateSMA(values, period);
    case 'EMA': return calculateEMA(values, period);
    case 'WMA': return calculateWMA(values, period);
    case 'RMA': return calculateRMA(values, period);
    default: return calculateSMA(values, period);
  }
}

// RSI Calculation
export function calculateRSI(closes: number[], period: number): (number | null)[] {
  const rsi: (number | null)[] = [];
  if (closes.length < period + 1) {
    return Array(closes.length).fill(null);
  }
  
  const gains: number[] = [0];
  const losses: number[] = [0];
  
  for (let i = 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? -change : 0);
  }
  
  // RMA of gains and losses
  const avgGains = calculateRMA(gains, period);
  const avgLosses = calculateRMA(losses, period);
  
  for (let i = 0; i < closes.length; i++) {
    const avgGain = avgGains[i];
    const avgLoss = avgLosses[i];
    
    if (avgGain === null || avgLoss === null) {
      rsi.push(null);
    } else if (avgLoss === 0) {
      rsi.push(100);
    } else {
      const rs = avgGain / avgLoss;
      rsi.push(100 - 100 / (1 + rs));
    }
  }
  
  return rsi;
}

// Pearson Correlation Coefficient
export function calculatePearsonCorrelation(arr1: number[], arr2: number[]): number {
  const n = arr1.length;
  if (n === 0 || n !== arr2.length) return 0;
  
  let sum1 = 0;
  let sum2 = 0;
  let sum1Sq = 0;
  let sum2Sq = 0;
  let pSum = 0;
  
  for (let i = 0; i < n; i++) {
    const x = arr1[i];
    const y = arr2[i];
    sum1 += x;
    sum2 += y;
    sum1Sq += x * x;
    sum2Sq += y * y;
    pSum += x * y;
  }
  
  const num = pSum - (sum1 * sum2) / n;
  const den = Math.sqrt((sum1Sq - (sum1 * sum1) / n) * (sum2Sq - (sum2 * sum2) / n));
  
  if (den === 0) return 0;
  return num / den;
}

// Kaufman's Efficiency Ratio (ER) for Smoothness
// ER = |Close_t - Close_t-N| / Sum(|Close_i - Close_i-1|)
export function calculateEfficiencyRatio(closes: number[], period: number): number {
  if (closes.length < period + 1) return 0.5; // Neutral default
  
  const len = closes.length;
  const priceChange = Math.abs(closes[len - 1] - closes[len - period - 1]);
  
  let totalVolatility = 0;
  for (let i = len - period; i < len; i++) {
    totalVolatility += Math.abs(closes[i] - closes[i - 1]);
  }
  
  if (totalVolatility === 0) return 1.0; // Flat but perfectly smooth
  return Math.min(1.0, priceChange / totalVolatility);
}

// Full analysis engine
export function analyzeSetup(
  candles: Candle[],
  displayName: string,
  symbol: string,
  type: MarketType,
  timeframe: string,
  config: ScannerConfig
): SetupAnalysis {
  const len = candles.length;
  
  // Check if we have sufficient data
  const minRequired = Math.max(
    config.priceMA1Length,
    config.priceMA2Length,
    config.rsiLength + config.rsiMA1Length,
    config.rsiLength + config.rsiMA2Length,
    50
  );
  
  if (len < minRequired) {
    throw new Error(`Insufficient data for ${displayName}: got ${len}, need at least ${minRequired}`);
  }
  
  const closes = candles.map(c => c.close);
  const timestamps = candles.map(c => c.timestamp);
  
  // 1. Calculate Price Moving Averages
  const priceMA1 = calculateMA(closes, config.priceMA1Length, config.priceMA1Type);
  const priceMA2 = calculateMA(closes, config.priceMA2Length, config.priceMA2Type);
  
  // 2. Calculate RSI & RSI Moving Averages
  const rsiRaw = calculateRSI(closes, config.rsiLength);
  // Extract non-null RSI values to calculate moving averages of RSI
  const rsiValid: number[] = [];
  const rsiIndices: number[] = [];
  rsiRaw.forEach((val, idx) => {
    if (val !== null) {
      rsiValid.push(val);
      rsiIndices.push(idx);
    }
  });
  
  const rsiMA1Valid = calculateMA(rsiValid, config.rsiMA1Length, config.rsiMA1Type);
  const rsiMA2Valid = calculateMA(rsiValid, config.rsiMA2Length, config.rsiMA2Type);
  
  // Re-align RSI moving averages with the original closes timeline
  const rsiMA1: (number | null)[] = Array(len).fill(null);
  const rsiMA2: (number | null)[] = Array(len).fill(null);
  
  rsiIndices.forEach((origIdx, validIdx) => {
    rsiMA1[origIdx] = rsiMA1Valid[validIdx];
    rsiMA2[origIdx] = rsiMA2Valid[validIdx];
  });
  
  // Compile time-series data for display
  const displayPoints: IndicatorData[] = [];
  // Take last 50 points for gallery visualization
  const showCount = Math.min(len, 60);
  for (let i = len - showCount; i < len; i++) {
    displayPoints.push({
      timestamp: timestamps[i],
      price: closes[i],
      priceMA1: priceMA1[i],
      priceMA2: priceMA2[i],
      rsi: rsiRaw[i],
      rsiMA1: rsiMA1[i],
      rsiMA2: rsiMA2[i],
    });
  }
  
  // SCORING MODULE (Looks at last 20 bars)
  const scoreLookback = 20;
  const lastIndex = len - 1;
  
  const curClose = closes[lastIndex];
  const curPriceMA1 = priceMA1[lastIndex]!;
  const curPriceMA2 = priceMA2[lastIndex]!;
  
  const curRSI = rsiRaw[lastIndex]!;
  const curRsiMA1 = rsiMA1[lastIndex]!;
  const curRsiMA2 = rsiMA2[lastIndex]!;
  
  // -- A. Price Trend Quality (Max 25 pts) --
  let priceTrendQuality = 0;
  let isPriceBullish = false;
  let isPriceBearish = false;
  
  // 1. Moving average alignment (10 pts)
  if (curPriceMA1 > curPriceMA2) {
    // Bullish alignment
    priceTrendQuality += 10;
    isPriceBullish = true;
  } else if (curPriceMA1 < curPriceMA2) {
    // Bearish alignment
    priceTrendQuality += 10;
    isPriceBearish = true;
  }
  
  // 2. Moving average slopes (10 pts)
  // Check changes in MAs over past 5 bars
  const ma1Change = curPriceMA1 - (priceMA1[lastIndex - 5] || curPriceMA1);
  const ma2Change = curPriceMA2 - (priceMA2[lastIndex - 5] || curPriceMA2);
  
  if (isPriceBullish && ma1Change > 0 && ma2Change > 0) {
    priceTrendQuality += 10;
  } else if (isPriceBearish && ma1Change < 0 && ma2Change < 0) {
    priceTrendQuality += 10;
  } else if ((isPriceBullish && ma1Change > 0) || (isPriceBearish && ma1Change < 0)) {
    priceTrendQuality += 5;
  }
  
  // 3. Higher Highs/Lows structural validation (5 pts)
  // Simple check: compare averages of first half vs second half of the lookback
  const segmentSize = 10;
  const firstHalfCloses = closes.slice(lastIndex - 19, lastIndex - 10);
  const secondHalfCloses = closes.slice(lastIndex - segmentSize + 1, lastIndex + 1);
  
  const avgFirstHalf = firstHalfCloses.reduce((a, b) => a + b, 0) / segmentSize;
  const avgSecondHalf = secondHalfCloses.reduce((a, b) => a + b, 0) / segmentSize;
  
  if (isPriceBullish && avgSecondHalf > avgFirstHalf) {
    priceTrendQuality += 5;
  } else if (isPriceBearish && avgSecondHalf < avgFirstHalf) {
    priceTrendQuality += 5;
  }
  
  // -- B. RSI Trend Quality (Max 25 pts) --
  let rsiTrendQuality = 0;
  let isRsiBullish = false;
  let isRsiBearish = false;
  
  // 1. RSI MA Alignment (10 pts)
  if (curRsiMA1 > curRsiMA2) {
    rsiTrendQuality += 10;
    isRsiBullish = true;
  } else if (curRsiMA1 < curRsiMA2) {
    rsiTrendQuality += 10;
    isRsiBearish = true;
  }
  
  // 2. RSI MA Slope (10 pts)
  const rsiMa1Change = curRsiMA1 - (rsiMA1[lastIndex - 5] || curRsiMA1);
  const rsiMa2Change = curRsiMA2 - (rsiMA2[lastIndex - 5] || curRsiMA2);
  
  if (isRsiBullish && rsiMa1Change > 0 && rsiMa2Change > 0) {
    rsiTrendQuality += 10;
  } else if (isRsiBearish && rsiMa1Change < 0 && rsiMa2Change < 0) {
    rsiTrendQuality += 10;
  } else if ((isRsiBullish && rsiMa1Change > 0) || (isRsiBearish && rsiMa1Change < 0)) {
    rsiTrendQuality += 5;
  }
  
  // 3. RSI Levels (5 pts)
  // Optimal trending ranges: Bullish RSI [50-70] (or >70 for high momentum), Bearish RSI [30-50] (or <30)
  if (isRsiBullish) {
    if (curRSI >= 50 && curRSI <= 70) {
      rsiTrendQuality += 5;
    } else if (curRSI > 70) {
      rsiTrendQuality += 3; // Extreme bullish (overbought, slightly exhausted but strong)
    } else if (curRSI > 45) {
      rsiTrendQuality += 1;
    }
  } else if (isRsiBearish) {
    if (curRSI >= 30 && curRSI <= 50) {
      rsiTrendQuality += 5;
    } else if (curRSI < 30) {
      rsiTrendQuality += 3; // Extreme bearish (oversold, strong momentum but exhausted)
    } else if (curRSI < 55) {
      rsiTrendQuality += 1;
    }
  }
  
  // Determine overall structure direction
  let direction: 'Strong Bullish' | 'Bullish' | 'Neutral' | 'Bearish' | 'Strong Bearish' = 'Neutral';
  const totalBullishScore = (isPriceBullish ? 1 : 0) + (isRsiBullish ? 1 : 0);
  const totalBearishScore = (isPriceBearish ? 1 : 0) + (isRsiBearish ? 1 : 0);
  
  if (totalBullishScore === 2 && priceTrendQuality >= 20 && rsiTrendQuality >= 20) {
    direction = 'Strong Bullish';
  } else if (totalBullishScore >= 1 && curClose > curPriceMA1) {
    direction = 'Bullish';
  } else if (totalBearishScore === 2 && priceTrendQuality >= 20 && rsiTrendQuality >= 20) {
    direction = 'Strong Bearish';
  } else if (totalBearishScore >= 1 && curClose < curPriceMA1) {
    direction = 'Bearish';
  }
  
  // -- C. Price + RSI Correlation (Max 30 pts) --
  // Calculate Pearson correlation of Price vs RSI over past 20 bars
  const priceLookbackSlice = closes.slice(lastIndex - scoreLookback + 1, lastIndex + 1);
  const rsiLookbackSlice = rsiRaw.slice(lastIndex - scoreLookback + 1, lastIndex + 1).map(v => v || 50);
  
  const pearsonR = calculatePearsonCorrelation(priceLookbackSlice, rsiLookbackSlice);
  
  // Score is scaled by the Pearson coefficient and direction alignment.
  // In normal healthy trends, Price and RSI are positively correlated (they move together).
  // Divergence (Price up, RSI down) leads to a negative correlation, reducing the score!
  let correlationValue = 0;
  if (direction.includes('Bullish') || direction.includes('Bearish')) {
    if (pearsonR > 0) {
      // Clean direction alignment
      correlationValue = Math.round(pearsonR * 30);
    } else {
      // Negative correlation = divergence (0 points for correlation)
      correlationValue = 0;
    }
  } else {
    // Neutral market or absolute disagreement
    correlationValue = Math.round(Math.max(0, pearsonR) * 15); // penalize neutral
  }
  
  const correlationPercentage = Math.round(Math.max(0, pearsonR) * 100);
  
  // -- D. Smoothness (Max 10 pts) --
  // Use Kaufman's Efficiency Ratio
  const erVal = calculateEfficiencyRatio(closes, scoreLookback);
  const smoothness = Math.round(erVal * 10);
  
  // -- E. Momentum Strength (Max 10 pts) --
  // 1. Is the distance |Price - SlowMA| expanding compared to 5 bars ago? (5 pts)
  // 2. Is RSI in high-velocity territory (>60 bullish, <40 bearish)? (5 pts)
  let momentumStrength = 0;
  
  const curMaDistance = Math.abs(curClose - curPriceMA2);
  const prevMaDistance = Math.abs(closes[lastIndex - 5] - (priceMA2[lastIndex - 5] || curPriceMA2));
  
  if (curMaDistance > prevMaDistance) {
    momentumStrength += 5; // expanding distance indicates trend acceleration
  } else {
    momentumStrength += 2; // steady/contracting
  }
  
  if (direction.includes('Bullish') && curRSI > 55) {
    momentumStrength += 5;
  } else if (direction.includes('Bearish') && curRSI < 45) {
    momentumStrength += 5;
  } else if (curRSI > 45 && curRSI < 55) {
    momentumStrength += 1; // sideways
  } else {
    momentumStrength += 2;
  }
  
  // Adjust cap at 10
  momentumStrength = Math.min(10, momentumStrength);
  
  // Combined overall score out of 100
  const overallScore = priceTrendQuality + rsiTrendQuality + correlationValue + smoothness + momentumStrength;
  
  // Descriptive metadata
  const priceTrendDesc = isPriceBullish
    ? (priceTrendQuality >= 20 ? 'Strong Clean Bullish Trend' : 'Moderate Bullish Trend')
    : isPriceBearish
      ? (priceTrendQuality >= 20 ? 'Strong Clean Bearish Trend' : 'Moderate Bearish Trend')
      : 'No Clear Price Trend';
      
  const rsiTrendDesc = isRsiBullish
    ? (rsiTrendQuality >= 20 ? 'Strong Bullish Momentum Confirmation' : 'Moderate Bullish Momentum')
    : isRsiBearish
      ? (rsiTrendQuality >= 20 ? 'Strong Bearish Momentum Confirmation' : 'Moderate Bearish Momentum')
      : 'Neutral Momentum Structure';
      
  let setupQualityDesc = 'Neutral Market Structure';
  if (overallScore >= 90) {
    setupQualityDesc = 'Excellent Momentum Structure';
  } else if (overallScore >= 75) {
    setupQualityDesc = 'High Quality Trend Setup';
  } else if (overallScore >= 55) {
    setupQualityDesc = 'Moderate Trend Setup';
  } else if (overallScore >= 40) {
    setupQualityDesc = 'Weak Structure - Trend Reversing';
  } else {
    setupQualityDesc = 'Noisy Market - Do Not Trade';
  }
  
  return {
    symbol,
    displayName,
    type,
    timeframe: timeframe as any,
    overallScore,
    direction,
    correlationScore: correlationPercentage,
    priceTrendQuality,
    rsiTrendQuality,
    correlationValue,
    smoothness,
    momentumStrength,
    lastUpdated: Date.now(),
    priceTrendDesc,
    rsiTrendDesc,
    setupQualityDesc,
    dataPoints: displayPoints
  };
}
