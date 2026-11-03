// Mathematical Backtesting & Scenario Simulation Engine
// Version 5: Theoretical Scenario Simulator for Trading Quant Ideas

export interface MathBacktestConfig {
  tradesCount: number; // Number of trades (e.g., 100)
  winRate: number; // Win rate as percentage 0..100 (e.g., 55 for 55%)
  riskRewardRatio: number; // Risk to reward ratio (e.g., 2.0 for 1:2)
  riskMode: 'percent' | 'dollar'; // '% of Account' or 'Fixed $'
  riskValue: number; // e.g. 1.5 for 1.5% or 150 for $150
  compoundEquity: boolean; // if true, % risk scales with current equity; if false, based on initial capital
  initialCapital: number; // Starting account balance (e.g., $10,000)
  equation: string; // Equation expression for trade outcome
  feePerTrade: number; // Commission / slippage per trade in $
  distributionMode?: 'exact' | 'random'; // 'exact' strictly enforces exact win count; 'random' uses stochastic coin flips
  sequenceArrangement?: 'shuffled' | 'smooth'; // 'shuffled': exact count shuffled; 'smooth': evenly interleaved
  enableMonteCarlo: boolean; // Run multi-path simulation
  monteCarloSimulationsCount: number; // e.g., 100 runs
  randomSeed?: number; // Optional seed for deterministic reproducibility
}

export interface SimulatedTrade {
  tradeNum: number;
  equityBefore: number;
  riskAmount: number;
  isWin: boolean;
  rewardMultiplier: number; // Realized R
  pnlDollar: number;
  pnlPercent: number;
  equityAfter: number;
  peakEquity: number;
  drawdownDollar: number;
  drawdownPercent: number;
  streak: number; // Positive = win streak count, negative = loss streak count
}

export interface MonteCarloPercentiles {
  p5: number[];
  p25: number[];
  p50: number[];
  p75: number[];
  p95: number[];
}

export interface ConsecutiveLossProbability {
  streakLen: number;
  drawdownR: number; // e.g. -3.0
  drawdownPct: number; // e.g. 3.0%
  drawdownDollar: number; // e.g. $300
  recoveryRNeeded: number; // e.g. 3.0
  probabilityPct: number;
  expectedOccurrences: number;
}

export interface HeatmapCell {
  winRate: number;
  rrr: number;
  evR: number;
  netReturnPct: number;
  isProfitable: boolean;
  isCurrent: boolean;
}

export interface SimulationSummary {
  config: MathBacktestConfig;
  initialCapital: number;
  finalEquity: number;
  netProfitDollar: number;
  netProfitPercent: number;
  totalTrades: number;
  wins: number;
  losses: number;
  realizedWinRate: number;
  grossProfit: number;
  grossLoss: number;
  profitFactor: number;
  maxDrawdownDollar: number;
  maxDrawdownPercent: number;
  maxUnderwaterTrades: number; // Maximum consecutive trades spent in drawdown
  expectancyDollarPerTrade: number;
  expectancyR: number;
  theoreticalEVPerTrade: number;
  theoreticalBreakevenWinRate: number;
  theoreticalKellyFraction: number;
  theoreticalHalfKelly: number;
  theoreticalQuarterKelly: number;
  riskOfRuinPercent: number;
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;
  theoreticalExpectedMaxLossStreak: number;
  consecutiveLossProbabilities: ConsecutiveLossProbability[];
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  gainToPainRatio: number;
  sqn: number;
  sqnRating: 'Holy Grail' | 'Superb' | 'Excellent' | 'Good' | 'Average' | 'Poor';
  recoveryFactor: number;
  exactCalculation: {
    exactWinsCount: number;
    exactLossesCount: number;
    exactWinRate: number;
    perWinPnL: number;
    perLossPnL: number;
    theoreticalGrossProfit: number;
    theoreticalGrossLoss: number;
    theoreticalNetPnL: number;
    theoreticalReturnPct: number;
    theoreticalFinalEquity: number;
    theoreticalProfitFactor: number;
    theoreticalEVPerTrade: number;
    theoreticalEV_R: number;
    breakevenWinRate: number;
    formulaDisplay: string;
  };
  trades: SimulatedTrade[];
  monteCarlo?: {
    percentiles: MonteCarloPercentiles;
    samplePaths: number[][]; // 8 distinct visible paths for overlay
    finalEquities: number[];
    ruinCount: number;
    ruinProbability: number;
    medianFinalEquity: number;
    bestFinalEquity: number;
    worstFinalEquity: number;
    simulationsRun: number;
  };
}

export interface ScenarioPreset {
  id: string;
  title: string;
  tag: string;
  description: string;
  config: Partial<MathBacktestConfig>;
  explanation: string;
}

export const SCENARIO_PRESETS: ScenarioPreset[] = [
  {
    id: 'classic_trend_1_2',
    title: 'Classic Trend Following (1:2 R:R)',
    tag: 'Baseline Edge',
    description: '50% win rate with 1:2 Risk-Reward ratio. A robust institutional benchmark.',
    config: {
      tradesCount: 200,
      winRate: 50,
      riskRewardRatio: 2.0,
      riskMode: 'percent',
      riskValue: 1.0,
      compoundEquity: true,
      initialCapital: 10000,
      equation: 'isWin ? (risk * rrr) : -risk',
      feePerTrade: 0
    },
    explanation: 'With a 1:2 R:R, breakeven is 33.3%. At 50% win rate, your mathematical expectancy is +0.50R per trade. Even with 5-6 consecutive losses, the account compounds geometrically.'
  },
  {
    id: 'high_win_rate_scalper',
    title: 'High Win-Rate Scalper (70% Win, 1:0.8 R:R)',
    tag: 'Scalping & Friction',
    description: '70% win rate with quick takes and $3 commission/slippage drag per execution.',
    config: {
      tradesCount: 300,
      winRate: 70,
      riskRewardRatio: 0.8,
      riskMode: 'dollar',
      riskValue: 100,
      compoundEquity: false,
      initialCapital: 10000,
      equation: 'isWin ? (risk * rrr - fee) : (-risk - fee)',
      feePerTrade: 3
    },
    explanation: 'Scalpers rely on high win rates. Notice how a small $3 fee per trade drags total expectancy down over 300 trades ($900 in broker friction). Test reducing win rate by 5% to see if the edge vanishes.'
  },
  {
    id: 'convex_trend_fat_tail',
    title: 'Convex Fat-Tail Trader (35% Win, 1:3.5 R:R)',
    tag: 'Fat-Tail Asymmetry',
    description: 'Low win rate (35%) but large asymmetric winners (1:3.5 standard + 12% chance of a 7R blowout runner).',
    config: {
      tradesCount: 250,
      winRate: 35,
      riskRewardRatio: 3.5,
      riskMode: 'percent',
      riskValue: 1.0,
      compoundEquity: true,
      initialCapital: 10000,
      equation: 'isWin ? (risk * (Math.random() < 0.12 ? rrr * 2 : rrr)) : -risk',
      feePerTrade: 0
    },
    explanation: 'Pure trend followers (e.g. Turtle traders, CTA funds) tolerate 8-10 consecutive losses because the rare 7R fat-tail winners propel equity to new all-time highs.'
  },
  {
    id: 'two_stage_scaling',
    title: 'Two-Stage Scaling (50% TP1 @ 1R, 50% TP2 @ 2.5R)',
    tag: 'Partial Profit',
    description: 'Bank half the position at 1:1 to de-risk, and let the remaining half run to 2.5R.',
    config: {
      tradesCount: 200,
      winRate: 52,
      riskRewardRatio: 2.5,
      riskMode: 'percent',
      riskValue: 1.0,
      compoundEquity: true,
      initialCapital: 10000,
      equation: 'isWin ? (risk * 0.5 * 1.0 + risk * 0.5 * rrr) : -risk',
      feePerTrade: 1
    },
    explanation: 'Taking partial profit smooths out the equity curve variance and reduces maximum drawdown duration, though it slightly clips maximum theoretical upside.'
  },
  {
    id: 'half_kelly_optimal',
    title: 'Half-Kelly Geometric Optimizer',
    tag: 'Capital Growth',
    description: '55% win rate, 1:2 R:R using Half-Kelly fraction sizing for rapid compounding with dampened drawdown.',
    config: {
      tradesCount: 200,
      winRate: 55,
      riskRewardRatio: 2.0,
      riskMode: 'percent',
      riskValue: 1.6, // Approximate Half-Kelly for 55% at 2:1
      compoundEquity: true,
      initialCapital: 10000,
      equation: 'isWin ? (risk * rrr) : -risk',
      feePerTrade: 0
    },
    explanation: 'Full Kelly maximizes log wealth but suffers brutal 50%+ drawdowns. Half-Kelly achieves ~75% of peak geometric growth with only ~1/3 of the drawdown volatility.'
  },
  {
    id: 'crypto_breakout_momentum',
    title: 'Crypto Breakout Momentum (38% Win, 1:3.2 R:R)',
    tag: 'Crypto Volatility',
    description: 'Asymmetric breakout model capturing sudden crypto expansions with tight stop losses.',
    config: {
      tradesCount: 250,
      winRate: 38,
      riskRewardRatio: 3.2,
      riskMode: 'percent',
      riskValue: 1.25,
      compoundEquity: true,
      initialCapital: 10000,
      equation: 'isWin ? (risk * rrr - fee) : (-risk - fee)',
      feePerTrade: 2
    },
    explanation: 'Crypto pairs consolidate for weeks before violent moves. This archetype relies on positive skewness to produce exceptional SQN despite a sub-40% win rate.'
  },
  {
    id: 'drawdown_defense_strategy',
    title: 'Drawdown Defense Circuit Breaker',
    tag: 'Capital Preservation',
    description: 'Risks 1.5% normally, but cuts risk by 50% (to 0.75%) whenever current drawdown exceeds 10%.',
    config: {
      tradesCount: 200,
      winRate: 50,
      riskRewardRatio: 2.0,
      riskMode: 'percent',
      riskValue: 1.5,
      compoundEquity: true,
      initialCapital: 10000,
      equation: 'let dd = (initialCapital > equity) ? (initialCapital - equity)/initialCapital : 0; let activeRisk = dd > 0.10 ? risk * 0.5 : risk; isWin ? (activeRisk * rrr) : -activeRisk',
      feePerTrade: 0
    },
    explanation: 'Automated capital protection. By throttling bet size during unfavorable drawdowns, catastrophic tail risk is neutralized and emotional stability is preserved.'
  },
  {
    id: 'anti_martingale_streak',
    title: 'Anti-Martingale Hot-Hand (Scale on Wins)',
    tag: 'Streak Scaling',
    description: 'Risk 1% baseline, but scale risk up +20% per consecutive win (capped at +60%) to press winning streaks.',
    config: {
      tradesCount: 200,
      winRate: 55,
      riskRewardRatio: 1.8,
      riskMode: 'percent',
      riskValue: 1.0,
      compoundEquity: true,
      initialCapital: 10000,
      equation: 'let mult = streak > 0 ? (1 + Math.min(3, streak) * 0.20) : 1; isWin ? (risk * mult * rrr) : (-risk * mult)',
      feePerTrade: 0
    },
    explanation: 'Anti-martingale presses bets during favorable momentum clusters. When a loss occurs, risk immediately drops back to baseline, preventing catastrophic drawdowns.'
  },
  {
    id: 'martingale_ruin_demo',
    title: 'Martingale Trap (Doubling Down Hazard)',
    tag: 'Ruin Hazard Demo',
    description: 'Doubles risk after each consecutive loss to "recover" quickly. Warning: High risk of total account wipeout!',
    config: {
      tradesCount: 150,
      winRate: 50,
      riskRewardRatio: 1.0,
      riskMode: 'dollar',
      riskValue: 50,
      compoundEquity: false,
      initialCapital: 10000,
      equation: 'let mult = streak < 0 ? Math.pow(2, Math.min(6, Math.abs(streak))) : 1; isWin ? (risk * mult * rrr) : (-risk * mult)',
      feePerTrade: 0
    },
    explanation: 'A classic gambler fallacy demonstration. It looks smooth until a 6-loss streak occurs, requiring a 64x bet ($3,200 risk on a single trade), causing instant ruin or severe liquidation.'
  }
];

// Seeded PRNG for reproducible runs
class SeededRandom {
  private seed: number;
  constructor(seed: number) {
    this.seed = seed % 2147483647;
    if (this.seed <= 0) this.seed += 2147483646;
  }
  next(): number {
    this.seed = (this.seed * 16807) % 2147483647;
    return (this.seed - 1) / 2147483646;
  }
}

// Safe equation evaluator
export function evaluateCustomEquation(
  equationStr: string,
  context: {
    equity: number;
    initialCapital: number;
    risk: number;
    rrr: number;
    winRate: number; // 0..1
    isWin: boolean;
    streak: number;
    fee: number;
    tradeNum: number;
    randomVal: number;
  }
): { pnl: number; error: string | null } {
  try {
    const trimmed = equationStr.trim();
    if (!trimmed) {
      return {
        pnl: context.isWin ? (context.risk * context.rrr - context.fee) : (-context.risk - context.fee),
        error: null
      };
    }

    // Build function safely
    let codeBody = trimmed;
    if (!codeBody.includes('return')) {
      codeBody = `return (${codeBody});`;
    }

    const { equity, initialCapital, risk, rrr, winRate, streak, fee, tradeNum } = context;
    const isWin = context.isWin;
    const random = () => context.randomVal;

    const evaluator = new Function(
      'equity',
      'initialCapital',
      'risk',
      'rrr',
      'winRate',
      'isWin',
      'streak',
      'fee',
      'tradeNum',
      'Math',
      'random',
      codeBody
    );

    const result = evaluator(
      equity,
      initialCapital,
      risk,
      rrr,
      winRate,
      isWin,
      streak,
      fee,
      tradeNum,
      Math,
      random
    );

    if (typeof result !== 'number' || isNaN(result)) {
      return { pnl: 0, error: 'Equation did not return a valid number' };
    }

    return { pnl: result, error: null };
  } catch (err: any) {
    return { pnl: 0, error: err.message || 'Syntax error in equation' };
  }
}

// Calculate exact probability and drawdown in R for experiencing N consecutive losses
export function calculateConsecutiveLossProbabilities(
  winRatePct: number,
  totalTrades: number,
  riskMode: 'percent' | 'dollar' = 'percent',
  riskValue: number = 1.0,
  initialCapital: number = 10000,
  compoundEquity: boolean = true
): ConsecutiveLossProbability[] {
  const lossP = 1 - Math.min(100, Math.max(0, winRatePct)) / 100;
  const streakLengths = [3, 4, 5, 6, 7, 8, 10, 12, 15];

  return streakLengths.map((k) => {
    // 1 loss = 1R of risk. Therefore k consecutive losses = -k R
    const drawdownR = -k;
    const recoveryRNeeded = k;

    // Calculate account drawdown impact
    let drawdownPct = 0;
    let drawdownDollar = 0;

    if (riskMode === 'percent') {
      if (compoundEquity) {
        // Compounded: 1 - (1 - riskValue/100)^k
        drawdownPct = (1 - Math.pow(Math.max(0, 1 - riskValue / 100), k)) * 100;
      } else {
        drawdownPct = k * riskValue;
      }
      drawdownDollar = initialCapital * (drawdownPct / 100);
    } else {
      drawdownDollar = k * riskValue;
      drawdownPct = initialCapital > 0 ? (drawdownDollar / initialCapital) * 100 : 0;
    }

    if (lossP <= 0 || totalTrades < k) {
      return {
        streakLen: k,
        drawdownR,
        drawdownPct: Number(drawdownPct.toFixed(1)),
        drawdownDollar: Number(drawdownDollar.toFixed(0)),
        recoveryRNeeded,
        probabilityPct: 0,
        expectedOccurrences: 0
      };
    }

    const pStreak = Math.pow(lossP, k);
    const trials = totalTrades - k + 1;
    const expectedOccurrences = trials * pStreak;
    // P(at least 1 streak of length k) approx = 1 - (1 - pStreak)^trials
    const probAtLeastOne = (1 - Math.pow(1 - pStreak, trials)) * 100;

    return {
      streakLen: k,
      drawdownR,
      drawdownPct: Number(drawdownPct.toFixed(1)),
      drawdownDollar: Number(drawdownDollar.toFixed(0)),
      recoveryRNeeded,
      probabilityPct: Math.min(100, Math.max(0, probAtLeastOne)),
      expectedOccurrences: Number(expectedOccurrences.toFixed(2))
    };
  });
}

// Generate 2D Heatmap Grid of Win Rate vs R:R Expected Return
export function generateHeatmapMatrix(
  currentWinRate: number,
  currentRRR: number,
  tradesCount: number = 100,
  riskPct: number = 1.0
): HeatmapCell[][] {
  const winRates = [30, 35, 40, 45, 50, 55, 60, 65, 70];
  const rrrs = [0.8, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0];

  return rrrs.map((r) => {
    return winRates.map((w) => {
      const wP = w / 100;
      const lP = 1 - wP;
      // EV in R = wP * r - lP
      const evR = wP * r - lP;
      // Compounded return estimate: (1 + riskPct/100 * r)^wins * (1 - riskPct/100)^losses - 1
      const wins = Math.round(tradesCount * wP);
      const losses = tradesCount - wins;
      const winMult = 1 + (riskPct / 100) * r;
      const lossMult = Math.max(0, 1 - riskPct / 100);
      const netReturnPct = (Math.pow(winMult, wins) * Math.pow(lossMult, losses) - 1) * 100;

      const isCurrent = Math.abs(currentWinRate - w) < 3 && Math.abs(currentRRR - r) < 0.25;

      return {
        winRate: w,
        rrr: r,
        evR: Number(evR.toFixed(3)),
        netReturnPct: Number(netReturnPct.toFixed(1)),
        isProfitable: evR > 0,
        isCurrent
      };
    });
  });
}

// Run single simulation path
export function runSingleSimulation(
  config: MathBacktestConfig,
  customRng?: () => number
): { trades: SimulatedTrade[]; error: string | null } {
  const rng = customRng || Math.random;
  const trades: SimulatedTrade[] = [];
  let currentEquity = Math.max(0, config.initialCapital);
  let peakEquity = currentEquity;
  let streak = 0; // > 0 wins, < 0 losses
  const winProb = Math.min(100, Math.max(0, config.winRate)) / 100;
  let equationError: string | null = null;

  // Exact distribution mode: strictly guarantee exact number of wins and losses
  const isExactMode = config.distributionMode !== 'random';
  const outcomes: boolean[] = [];

  if (isExactMode) {
    const totalTrades = Math.max(1, config.tradesCount);
    const exactWins = Math.round(totalTrades * winProb);
    const exactLosses = totalTrades - exactWins;

    if (config.sequenceArrangement === 'smooth') {
      // Bresenham smooth interleaved distribution
      for (let i = 0; i < totalTrades; i++) {
        outcomes.push(
          Math.floor(((i + 1) * exactWins) / totalTrades) >
            Math.floor((i * exactWins) / totalTrades)
        );
      }
    } else {
      // Exact win count shuffled with PRNG
      for (let i = 0; i < exactWins; i++) outcomes.push(true);
      for (let i = 0; i < exactLosses; i++) outcomes.push(false);
      // Fisher-Yates shuffle
      for (let i = outcomes.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        const temp = outcomes[i];
        outcomes[i] = outcomes[j];
        outcomes[j] = temp;
      }
    }
  }

  for (let i = 1; i <= config.tradesCount; i++) {
    if (currentEquity <= 0) {
      // Account blown / wiped out
      trades.push({
        tradeNum: i,
        equityBefore: 0,
        riskAmount: 0,
        isWin: false,
        rewardMultiplier: 0,
        pnlDollar: 0,
        pnlPercent: 0,
        equityAfter: 0,
        peakEquity,
        drawdownDollar: peakEquity,
        drawdownPercent: 100,
        streak: streak - 1
      });
      streak--;
      continue;
    }

    // Determine dollar risk
    let tradeRiskDollar = 0;
    if (config.riskMode === 'percent') {
      const baseCapital = config.compoundEquity ? currentEquity : config.initialCapital;
      tradeRiskDollar = baseCapital * (config.riskValue / 100);
    } else {
      tradeRiskDollar = config.riskValue;
    }

    // Risk cannot exceed current equity
    tradeRiskDollar = Math.max(0.01, Math.min(tradeRiskDollar, currentEquity));

    // Win outcome: exact pre-determined or random roll
    const isWin = isExactMode ? (outcomes[i - 1] ?? false) : rng() < winProb;

    // Evaluate equation
    const { pnl, error } = evaluateCustomEquation(config.equation, {
      equity: currentEquity,
      initialCapital: config.initialCapital,
      risk: tradeRiskDollar,
      rrr: config.riskRewardRatio,
      winRate: winProb,
      isWin,
      streak,
      fee: config.feePerTrade || 0,
      tradeNum: i,
      randomVal: rng()
    });

    if (error && !equationError) {
      equationError = error;
    }

    // Update streak
    if (isWin) {
      streak = streak >= 0 ? streak + 1 : 1;
    } else {
      streak = streak <= 0 ? streak - 1 : -1;
    }

    const equityBefore = currentEquity;
    currentEquity = Math.max(0, currentEquity + pnl);
    if (currentEquity > peakEquity) {
      peakEquity = currentEquity;
    }

    const drawdownDollar = peakEquity - currentEquity;
    const drawdownPercent = peakEquity > 0 ? (drawdownDollar / peakEquity) * 100 : 0;
    const pnlPercent = equityBefore > 0 ? (pnl / equityBefore) * 100 : 0;
    const rewardMultiplier = tradeRiskDollar > 0 ? pnl / tradeRiskDollar : 0;

    trades.push({
      tradeNum: i,
      equityBefore,
      riskAmount: tradeRiskDollar,
      isWin,
      rewardMultiplier,
      pnlDollar: pnl,
      pnlPercent,
      equityAfter: currentEquity,
      peakEquity,
      drawdownDollar,
      drawdownPercent,
      streak
    });
  }

  return { trades, error: equationError };
}

// Run complete backtesting scenario with analytical metrics and Monte Carlo
export function runMathScenarioSimulation(config: MathBacktestConfig): SimulationSummary {
  const seed = config.randomSeed ?? Date.now();
  const rng = new SeededRandom(seed);
  const primaryRng = () => rng.next();

  // Primary path run
  const { trades } = runSingleSimulation(config, primaryRng);

  // Calculate statistics for primary path
  const initialCapital = config.initialCapital;
  const finalEquity = trades.length > 0 ? trades[trades.length - 1].equityAfter : initialCapital;
  const netProfitDollar = finalEquity - initialCapital;
  const netProfitPercent = initialCapital > 0 ? (netProfitDollar / initialCapital) * 100 : 0;

  const wins = trades.filter((t) => t.isWin).length;
  const losses = trades.length - wins;
  const realizedWinRate = trades.length > 0 ? (wins / trades.length) * 100 : 0;

  const grossProfit = trades.reduce((acc, t) => (t.pnlDollar > 0 ? acc + t.pnlDollar : acc), 0);
  const grossLoss = Math.abs(trades.reduce((acc, t) => (t.pnlDollar < 0 ? acc + t.pnlDollar : acc), 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 999 : 0;

  let maxDrawdownDollar = 0;
  let maxDrawdownPercent = 0;
  let maxConsecutiveWins = 0;
  let maxConsecutiveLosses = 0;
  let currConsecWins = 0;
  let currConsecLosses = 0;

  let maxUnderwaterTrades = 0;
  let currentUnderwaterTrades = 0;

  for (const t of trades) {
    if (t.drawdownDollar > maxDrawdownDollar) maxDrawdownDollar = t.drawdownDollar;
    if (t.drawdownPercent > maxDrawdownPercent) maxDrawdownPercent = t.drawdownPercent;

    if (t.equityAfter < t.peakEquity) {
      currentUnderwaterTrades++;
      if (currentUnderwaterTrades > maxUnderwaterTrades) {
        maxUnderwaterTrades = currentUnderwaterTrades;
      }
    } else {
      currentUnderwaterTrades = 0;
    }

    if (t.isWin) {
      currConsecWins++;
      currConsecLosses = 0;
      if (currConsecWins > maxConsecutiveWins) maxConsecutiveWins = currConsecWins;
    } else {
      currConsecLosses++;
      currConsecWins = 0;
      if (currConsecLosses > maxConsecutiveLosses) maxConsecutiveLosses = currConsecLosses;
    }
  }

  const expectancyDollarPerTrade = trades.length > 0 ? netProfitDollar / trades.length : 0;
  const totalR = trades.reduce((acc, t) => acc + t.rewardMultiplier, 0);
  const expectancyR = trades.length > 0 ? totalR / trades.length : 0;

  // Theoretical Mathematical Metrics:
  const winP = Math.min(100, Math.max(0, config.winRate)) / 100;
  const lossP = 1 - winP;
  const rrr = config.riskRewardRatio;

  // Theoretical Expectancy in R: E(R) = (W * RRR) - (L * 1)
  const theoreticalEV_R = winP * rrr - lossP;
  const baseRiskUnit = config.riskMode === 'percent' ? (config.initialCapital * config.riskValue) / 100 : config.riskValue;
  const theoreticalEVPerTrade = theoreticalEV_R * baseRiskUnit - (config.feePerTrade || 0);

  // Breakeven Win Rate: 1 / (1 + RRR)
  const theoreticalBreakevenWinRate = rrr > 0 ? (1 / (1 + rrr)) * 100 : 100;

  // Kelly Criterion fraction: f* = (p*(b+1) - 1) / b, where b = RRR, p = win rate
  const theoreticalKellyFraction = rrr > 0 ? Math.max(0, (winP * (rrr + 1) - 1) / rrr) * 100 : 0;
  const theoreticalHalfKelly = theoreticalKellyFraction / 2;
  const theoreticalQuarterKelly = theoreticalKellyFraction / 4;

  // Risk of Ruin estimation (Perry Kaufman / Vince formula)
  let riskOfRuinPercent = 0;
  if (theoreticalEV_R <= 0) {
    riskOfRuinPercent = 100;
  } else {
    const a = Math.min(0.99, Math.max(0.01, theoreticalEV_R / (rrr + 1)));
    const ratio = (1 - a) / (1 + a);
    const unitsOfCapital = baseRiskUnit > 0 ? initialCapital / baseRiskUnit : 20;
    riskOfRuinPercent = Math.min(100, Math.max(0, Math.pow(ratio, unitsOfCapital) * 100));
  }

  // Theoretical Expected Max Loss Streak over N trades:
  let theoreticalExpectedMaxLossStreak = 0;
  if (lossP > 0 && lossP < 1 && config.tradesCount > 1) {
    theoreticalExpectedMaxLossStreak = Math.round(Math.log(config.tradesCount) / Math.log(1 / lossP));
  }

  const consecutiveLossProbabilities = calculateConsecutiveLossProbabilities(
    config.winRate,
    config.tradesCount,
    config.riskMode,
    config.riskValue,
    config.initialCapital,
    config.compoundEquity
  );

  // Sharpe and Sortino Ratios (per trade basis)
  const pnls = trades.map((t) => t.pnlDollar);
  const meanPnl = pnls.length > 0 ? pnls.reduce((a, b) => a + b, 0) / pnls.length : 0;
  const variance = pnls.length > 1
    ? pnls.reduce((acc, p) => acc + Math.pow(p - meanPnl, 2), 0) / (pnls.length - 1)
    : 0;
  const stdDev = Math.sqrt(variance);
  const sharpeRatio = stdDev > 0 ? (meanPnl / stdDev) * Math.sqrt(config.tradesCount) : 0;

  // Sortino uses downside deviation
  const downsideVariance = pnls.length > 1
    ? pnls.reduce((acc, p) => acc + (p < 0 ? Math.pow(p, 2) : 0), 0) / (pnls.length - 1)
    : 0;
  const downsideStdDev = Math.sqrt(downsideVariance);
  const sortinoRatio = downsideStdDev > 0 ? (meanPnl / downsideStdDev) * Math.sqrt(config.tradesCount) : 0;

  // Calmar ratio: Net Profit % / Max Drawdown %
  const calmarRatio = maxDrawdownPercent > 0 ? netProfitPercent / maxDrawdownPercent : netProfitPercent > 0 ? 99 : 0;

  // Gain to Pain Ratio: Gross Profit / Gross Loss
  const gainToPainRatio = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 99 : 0;

  // Van Tharp System Quality Number (SQN)
  // SQN = (Expectancy R / StdDev R) * sqrt(min(100, N))
  const rMultipliers = trades.map((t) => t.rewardMultiplier);
  const meanR = rMultipliers.length > 0 ? rMultipliers.reduce((a, b) => a + b, 0) / rMultipliers.length : 0;
  const rVariance = rMultipliers.length > 1
    ? rMultipliers.reduce((acc, r) => acc + Math.pow(r - meanR, 2), 0) / (rMultipliers.length - 1)
    : 0;
  const rStdDev = Math.sqrt(rVariance);
  const sqnTradesCount = Math.min(100, trades.length);
  const sqn = rStdDev > 0 ? (meanR / rStdDev) * Math.sqrt(sqnTradesCount) : 0;

  let sqnRating: SimulationSummary['sqnRating'] = 'Poor';
  if (sqn >= 7.0) sqnRating = 'Holy Grail';
  else if (sqn >= 5.0) sqnRating = 'Superb';
  else if (sqn >= 3.0) sqnRating = 'Excellent';
  else if (sqn >= 2.0) sqnRating = 'Good';
  else if (sqn >= 1.6) sqnRating = 'Average';
  else sqnRating = 'Poor';

  const recoveryFactor = maxDrawdownDollar > 0 ? netProfitDollar / maxDrawdownDollar : netProfitDollar > 0 ? 99 : 0;

  // Exact closed-form theoretical calculation
  const exactWinsCount = Math.round(config.tradesCount * winP);
  const exactLossesCount = config.tradesCount - exactWinsCount;
  const exactWinRate = config.tradesCount > 0 ? (exactWinsCount / config.tradesCount) * 100 : 0;

  const perWinPnL = baseRiskUnit * rrr - (config.feePerTrade || 0);
  const perLossPnL = -baseRiskUnit - (config.feePerTrade || 0);

  const theoreticalGrossProfit = exactWinsCount * (baseRiskUnit * rrr);
  const theoreticalGrossLoss = exactLossesCount * baseRiskUnit + (config.tradesCount * (config.feePerTrade || 0));

  let theoreticalNetPnL = 0;
  let theoreticalFinalEquity = initialCapital;

  if (config.compoundEquity && config.riskMode === 'percent') {
    const winMult = 1 + (config.riskValue / 100) * rrr;
    const lossMult = Math.max(0, 1 - (config.riskValue / 100));
    theoreticalFinalEquity = initialCapital * Math.pow(winMult, exactWinsCount) * Math.pow(lossMult, exactLossesCount) - (config.tradesCount * (config.feePerTrade || 0));
    theoreticalNetPnL = theoreticalFinalEquity - initialCapital;
  } else {
    theoreticalNetPnL = exactWinsCount * perWinPnL + exactLossesCount * perLossPnL;
    theoreticalFinalEquity = initialCapital + theoreticalNetPnL;
  }

  const theoreticalReturnPct = initialCapital > 0 ? (theoreticalNetPnL / initialCapital) * 100 : 0;
  const theoreticalProfitFactor = theoreticalGrossLoss > 0 ? theoreticalGrossProfit / theoreticalGrossLoss : (theoreticalGrossProfit > 0 ? 99 : 0);
  const formulaDisplay = `(${exactWinsCount} Wins × +$${Math.round(perWinPnL)}) + (${exactLossesCount} Losses × -$${Math.round(Math.abs(perLossPnL))}) = ${theoreticalNetPnL >= 0 ? '+' : ''}$${Math.round(theoreticalNetPnL).toLocaleString()}`;

  // Run Monte Carlo if enabled
  let monteCarloData: SimulationSummary['monteCarlo'] | undefined;
  if (config.enableMonteCarlo && config.monteCarloSimulationsCount > 0) {
    const mcRuns = Math.min(500, Math.max(10, config.monteCarloSimulationsCount));
    const allPaths: number[][] = [];
    const finalEquities: number[] = [];
    let ruinCount = 0;

    for (let run = 0; run < mcRuns; run++) {
      const { trades: pathTrades } = runSingleSimulation(config, Math.random);
      const equities = [initialCapital, ...pathTrades.map((t) => t.equityAfter)];
      allPaths.push(equities);
      const fe = equities[equities.length - 1];
      finalEquities.push(fe);
      if (fe <= initialCapital * 0.2) ruinCount++; // < 20% capital = catastrophic ruin
    }

    finalEquities.sort((a, b) => a - b);
    const medianFinalEquity = finalEquities[Math.floor(finalEquities.length / 2)] || initialCapital;
    const worstFinalEquity = finalEquities[0] || 0;
    const bestFinalEquity = finalEquities[finalEquities.length - 1] || initialCapital;

    // Calculate percentiles at each step
    const stepsCount = config.tradesCount + 1;
    const p5: number[] = [];
    const p25: number[] = [];
    const p50: number[] = [];
    const p75: number[] = [];
    const p95: number[] = [];

    for (let step = 0; step < stepsCount; step++) {
      const valuesAtStep = allPaths.map((p) => p[step] ?? 0).sort((a, b) => a - b);
      p5.push(valuesAtStep[Math.floor(valuesAtStep.length * 0.05)] || 0);
      p25.push(valuesAtStep[Math.floor(valuesAtStep.length * 0.25)] || 0);
      p50.push(valuesAtStep[Math.floor(valuesAtStep.length * 0.50)] || 0);
      p75.push(valuesAtStep[Math.floor(valuesAtStep.length * 0.75)] || 0);
      p95.push(valuesAtStep[Math.floor(valuesAtStep.length * 0.95)] || 0);
    }

    // Keep 8 sample paths for overlay rendering
    const samplePaths = allPaths.slice(0, 8);

    monteCarloData = {
      percentiles: { p5, p25, p50, p75, p95 },
      samplePaths,
      finalEquities,
      ruinCount,
      ruinProbability: Number(((ruinCount / mcRuns) * 100).toFixed(1)),
      medianFinalEquity,
      bestFinalEquity,
      worstFinalEquity,
      simulationsRun: mcRuns
    };
  }

  return {
    config,
    initialCapital,
    finalEquity,
    netProfitDollar,
    netProfitPercent,
    totalTrades: trades.length,
    wins,
    losses,
    realizedWinRate,
    grossProfit,
    grossLoss,
    profitFactor,
    maxDrawdownDollar,
    maxDrawdownPercent,
    maxUnderwaterTrades,
    expectancyDollarPerTrade,
    expectancyR,
    theoreticalEVPerTrade,
    theoreticalBreakevenWinRate,
    theoreticalKellyFraction,
    theoreticalHalfKelly,
    theoreticalQuarterKelly,
    riskOfRuinPercent,
    maxConsecutiveWins,
    maxConsecutiveLosses,
    theoreticalExpectedMaxLossStreak,
    consecutiveLossProbabilities,
    sharpeRatio,
    sortinoRatio,
    calmarRatio,
    gainToPainRatio,
    sqn,
    sqnRating,
    recoveryFactor,
    exactCalculation: {
      exactWinsCount,
      exactLossesCount,
      exactWinRate,
      perWinPnL,
      perLossPnL,
      theoreticalGrossProfit,
      theoreticalGrossLoss,
      theoreticalNetPnL,
      theoreticalReturnPct,
      theoreticalFinalEquity,
      theoreticalProfitFactor,
      theoreticalEVPerTrade,
      theoreticalEV_R,
      breakevenWinRate: theoreticalBreakevenWinRate,
      formulaDisplay
    },
    trades,
    monteCarlo: monteCarloData
  };
}
