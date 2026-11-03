# 1:1 Confluence Scanner v4

A production-ready quantitative trading and research dashboard built with Python 3.11, Streamlit, and Plotly. It continuously scans multi-asset financial markets across multiple timeframes for high-probability 1:1 risk-reward setups with rigorous statistical validation.

---

## Key Features

1. **Multi-Asset & Multi-Exchange**:
   - Crypto via `ccxt` (Binance, Coinbase, Kraken).
   - Stocks, ETFs, Forex, Commodities via `yfinance` (SPY, QQQ, AAPL, EURUSD=X, XAUUSD=X, etc.).
   - Timeframes: `1m`, `5m`, `15m`, `1h`, `4h`, `1d`.

2. **1:1 Confluence Strategy**:
   - Trend alignment: Price vs. EMA20.
   - Momentum: RSI14 > 40 (Long) / < 60 (Short).
   - Volume: Volume > 20-period Volume SMA.
   - Trend Strength: ADX14 > 20.
   - Fair Value Gap (FVG): Institutional imbalance detection in the last 5 bars.
   - Price Action: Reversal candle patterns (Pin Bar, Hammer, Engulfing) closing back across EMA20 after pullbacks.
   - Normalised confluence score (0–100) with configurable minimum threshold (default 70).

3. **Strict 1:1 Risk-Reward Execution**:
   - **Entry**: Current candle close.
   - **Stop Loss (SL)**: $\min(\text{trigger low}, \text{swing low}) - 0.5 \times \text{ATR14}$ for Longs; $\max(\text{trigger high}, \text{swing high}) + 0.5 \times \text{ATR14}$ for Shorts.
   - **Take Profit (TP)**: Set to exactly $1.00 \times \text{Risk}$, creating pure 1:1 asymmetric execution.

4. **Rigorous Backtest & Statistical Validation**:
   - 70% In-Sample training, 30% Out-Of-Sample holdout.
   - Realistic costs: 0.05% commission + 0.02% slippage per trade.
   - Benjamini-Hochberg False Discovery Rate (FDR) correction across all tested instruments.
   - Filters out any asset with negative out-of-sample expectancy after frictional costs.

5. **Risk Sizing & 300-Trade Simulator**:
   - Position sizing calculation based on account balance and max 1% dollar risk.
   - Dynamic simulation of 300 trades comparing **Flat Risk**, **Fixed Fractional**, **Half-Kelly** ($f^* = \frac{2p - 1}{2}$), and **Reverse Martingale** (double after win up to $N$ wins, reset on loss).

6. **Interactive Visual Charts**:
   - Plotly Candlestick chart.
   - EMA20 overlay.
   - Blue solid Entry line, Red dashed SL, and Green dotted TP extended 20 bars into the future with price labels.
   - Volume subplots and institutional FVG shaded rectangles.

7. **Alert Integration**:
   - Automated Discord / Slack webhook and Telegram notifications for high-confluence setups ($\ge 80$).

---

## Local Setup Instructions (Python 3.11)

### 1. Clone the repository and navigate to the directory
```bash
git clone <your-repo-url>
cd momentum-scanner
```

### 2. Create and activate a virtual environment
```bash
python3.11 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 3. Install dependencies
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### 4. Run the Streamlit application
```bash
streamlit run app.py
```
The app will open automatically in your browser at `http://localhost:8501`.

---

## Deploying to Streamlit Cloud

1. Push this repository to **GitHub**.
2. Visit [share.streamlit.io](https://share.streamlit.io/) and log in with your GitHub account.
3. Click **New app**.
4. Select your repository, the `main` branch, and set the main file path to `app.py`.
5. Click **Deploy!**. Streamlit Cloud will automatically read `requirements.txt` and boot the application.

---

## Disclaimer
> **This tool is for research only. Past performance does not guarantee future results.**
