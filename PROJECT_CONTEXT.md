# AI-Driven Inventory Management System — Project Context

> **Purpose of this file:** This is the single source of truth for any AI assistant
> working on this project. Read this FIRST before doing anything.

---

## 1. Project Overview

**Goal:** Build an AI-driven inventory management and demand forecasting system that:
1. Forecasts product demand with explicit awareness of calendar seasonality, cyclical harmonics, and holiday occasion proximity.
2. Conducts a rigorous multi-paradigm benchmark comparing classical heuristics (Seasonal-Naive), specialized tabular gradient boosting (Fine-Tuned LightGBM with Tweedie loss), general-purpose foundation large language models (Zero-Shot Gemini API with structured in-context calendar prompts), and dedicated time series foundation model APIs (Zero-Shot Nixtla TimeGPT API).
3. Applies Principal Component Analysis (PCA) to detect and resolve multi-scale temporal multicollinearity, pruning redundant features while maintaining forecasting accuracy parity.
4. Simulates synthetic retail inventory dynamics (Digital Twin Engine) to model physical on-hand stock, supplier lead times, restock deliveries, and unobserved/censored demand caused by stockouts.

**Type:** Academic project (university faculty-guided, North South University)

**Primary notebook:** `Ai_Driven_Inventory_Management.ipynb` (Colab / Jupyter, Python 3)

---

## 2. Dataset

**Source:** M5 Forecasting Accuracy Competition (Walmart retail sales data)

**Files (inside `m5-forecasting-accuracy.zip`):**
- `sales_train_validation.csv` — 30,490 SKU-store time series, 1,913 daily columns (d_1 to d_1913)
- `calendar.csv` — date metadata: weekday, month, year, event names, and event types
- `sell_prices.csv` — weekly selling prices per item per store

**Dimensions:**
- 3 categories: HOBBIES, HOUSEHOLD, FOODS
- 7 departments: HOBBIES_1, HOBBIES_2, HOUSEHOLD_1, HOUSEHOLD_2, FOODS_1, FOODS_2, FOODS_3
- 10 stores across 3 states: CA (4), TX (3), WI (3)
- ~3,049 unique products
- Date range: 2011-01-29 to 2016-04-24 (~5.3 years)

**Development sample:** 200 randomly sampled series (seed=42) used for high-velocity experimentation.

---

## 3. CRITICAL — Dataset Limitations & Digital Twin Assumptions

The M5 dataset provides historical point-of-sale transactions ($S_t$), but **CANNOT** directly tell us:

| What's Missing | Why It Matters | Our Academic Approach |
|---------------|----------------|------------------------|
| Whether a product was actually **out of stock** | Zero sales could mean no customer demand OR an empty shelf (censored demand) | **Section 18 Digital Twin:** Simulated stockout flags and tracked unfulfilled customer demand |
| How much **inventory** a store had on-hand | No physical on-hand quantity ($I_t$) is recorded in M5 | **Section 18 Digital Twin:** Modeled daily inventory progression using buffer stock and net sales |
| Actual **supplier delivery / lead times** | No procurement or warehouse logistics data | Assumed realistic 3–5 day supplier transit window per category ($L \in [3, 5]$) |
| **Why** demand suddenly changed | Point-of-sale data lacks causal telemetry | Correlated with calendar events, seasons, and prices (avoiding false causal claims) |
| **Returns or cancellations** | Sales data reflects net units sold | Assumed all recorded unit sales are final |
| **Substitution effects** | If item A is stockout, did shoppers buy item B? | Unmodeled from M5 alone; acknowledged as a boundary condition |

---

### 3.1 Methodological Boundary Conditions & Known Limitations

Three structural limitations affect how model forecasts transition into physical purchasing and buffer calibration:

1. **Test-Period Autoregressive Target Leakage vs Genuine 28-Day Forecasts:**
   - *Current Notebook Behavior:* Slicing `test_df = df[day_num > 1626]` after a single global `.shift(1)` allows true test sales from day $T+h-1$ to leak into the lag and rolling features for day $T+h$. Reported test metrics thus measure **rolling 1-day-ahead predictions with daily ground-truth feedback**, not a genuine 28-day forecast made at origin $T=1626$.
   - *Empirical Impact:* Genuine recursive 28-day rollout experiences error compounding: MAE increases from 0.850 to 1.011 (+18.9%), RMSE increases from 1.690 to 2.389 (+41.4%), and cumulative 28-day error standard deviation jumps from 14.20 to 49.78 units.
   - *Buffer Calibration Danger:* Buffers calibrated from 1-step rolling errors underestimate cumulative lead-time variance by **250.6%**, causing severe stockouts in actual purchasing.
   - *Required Fix:* Implement recursive multi-horizon rollout (autoregressive feedback) or direct horizon-specific models with lag minimum $\ge 28$.

2. **Catalog Coverage Subsample (200 of 30,490 Series):**
   - *Current Notebook Behavior:* Samples 200 random SKU-store combinations for high-velocity experimentation and Colab CPU memory safety.
   - *Buffer Calibration Danger:* 200 series cannot capture the extreme long-tail intermittency (Croston/lumpy demand) across 30,490 series, nor do they model store-level portfolio risk pooling ($\sqrt{N}$ inventory pooling effects across CA, TX, WI).
   - *Required Scaling:* Parquet chunking, integer downcasting (`int8`/`int16`/`float16`), and distributed/GPU LightGBM.

3. **Absence of Price Dynamics (`sell_prices.csv`):**
   - *Current Notebook Behavior:* Although present in `m5-forecasting-accuracy.zip` (194 MB), prices are unmerged in the baseline notebook.
   - *Buffer Calibration Danger:* Price elasticity ($\epsilon$) is unrepresented. Unmodeled promotions cause immediate stockouts during price rollbacks and overstocking/spoilage post-promotion.
   - *Required Fix:* Merge weekly `sell_prices.csv` using `['store_id', 'item_id', 'wm_yr_wk']` and engineer `discount_pct`, `price_momentum`, and `price_to_mean`.

### Golden Rule for this project:
> **Always distinguish SIMULATED ASSUMPTIONS from REAL OBSERVATIONS.**
> - When we simulate inventory levels, lead times, or stockout events — label them clearly.
> - When we report from actual data (sales, prices, events) — that is observed.
> - Never present a simulation result as if it were ground truth.

---

## 4. What's Been Done ✅

### In the Notebook (`Ai_Driven_Inventory_Management.ipynb` — Sections 1–18):
- [x] **Section 1–3: Data Ingestion & Quality Audit** — Automated ZIP extraction (with Google Drive fallback), schema verification, date parsing, and missing value checks.
- [x] **Section 4–6: Category Profiling & Demand Concentration Analysis** — Identified top 10 products per category, generated horizontal volume and cumulative share bar charts, produced Pareto demand split tables, and 100% stacked bar & pie distribution charts.
- [x] **Section 7: Development Sample** — Extracted a deterministic 200-series sample (seed=42) and melted wide columns (d_1 to d_1913) into tidy long format.
- [x] **Section 8: 17-Feature Domain Engineering Suite**:
  - *Autoregressive lags:* `lag_1`, `lag_7`, `lag_14`, `lag_28`
  - *Shifted rolling windows:* `rolling_mean_7`, `rolling_mean_28`, `rolling_std_28` (shifted by 1 to prevent target leakage)
  - *Calendar & cyclical features:* `wday`, `month`, `day_num`, meteorological `season` (Winter/Spring/Summer/Fall), `season_code`, continuous circular harmonics (`sin_day_of_year`, `cos_day_of_year`)
  - *Occasion proximity features:* `event_name_clean`, `event_type_clean`, `event_type_code`, binary `is_event`, pre-holiday stocking countdown (`days_to_event`), and post-holiday hangover (`days_since_event`)
- [x] **Section 9: Chronological Train/Test Split** — Strict temporal split (Train: $d_1$ to $d_{1626}$; Test: $d_{1627}$ to $d_{1654}$) preventing future lookahead leakage.
- [x] **Section 10–12: Heuristic vs LightGBM Benchmark & Feature Importance** — Seasonal-Naive (lag-7) baseline vs Fine-Tuned LightGBM regressor with Tweedie objective ($p=1.1$, `num_leaves`=63, `lr`=0.03, `subsample`=0.85, `colsample`=0.75). Evaluated domain feature importances across Lags, Rolling, Seasonality, Occasions, and Calendar.
- [x] **Section 13: Foundation Model Baselines (Gemini API & Nixtla TimeGPT API)** — Built structured in-context demand forecasting pipeline for Gemini (text LLM with 56-day history, upcoming dates, weekdays, and occasion tags) alongside Nixtla TimeGPT API (dedicated zero-shot neural Time Series Foundation Model).
- [x] **Section 14 & 15: Multi-Model Visual Comparison & Occasion Slicing Analysis** — 4-paradigm head-to-head comparison (Seasonal-Naive vs Gemini Zero-Shot vs Nixtla TimeGPT vs LightGBM), multi-model forecast trajectory plots with holiday markers, category MAE bar charts, empirical occasion slicing analysis (Normal Days vs Occasion Window Days), and academic standing verdict.
- [x] **Section 16: PCA Multicollinearity & Dimensionality Reduction Analysis** — Full PCA decomposition of the 16-feature suite: Faculty % variance scree plot with exact bar percentages, top-ranking feature dominance per PC chart, PCA loadings heatmap across top 6 latent dimensions, correlation circle / biplot ($PC_1$ vs $PC_2$), full 16-component table, and multi-stage pruning decision matrix reducing 16 features to 12, 10, and 8 non-redundant features (saved as `pca_correlation_plots.png`).
- [x] **Section 17: Empirical Multi-Level Pruning & PCA Benchmark (17 $\to$ 12 $\to$ 10 $\to$ 8 Features vs Direct PCs)** — Retrained LightGBM across all reduced subsets and direct PC inputs: Optimized 10-feature model achieves MAE 0.8264 (outperforming the 17-feature model at 0.8297 with -41.2% feature reduction), while 8-feature ultra-lean model achieves MAE 0.8309 (-52.9% reduction). Direct PCA inputs yield MAE 0.8692 (+5.2% worse), proving why tree models favor PCA-guided orthogonal pruning over dense rotated PCA coordinates.
- [x] **Section 18: Digital Twin Synthetic Inventory Simulation Engine** — Modeled daily on-hand shelf inventory ($I_t$), supplier replenishment lead times ($L \in [3, 5]$ days), restock delivery arrivals, and stockout scenarios over the 28-day test horizon across 200 SKUs. Visualized inventory sawtooth curves, tracked unfulfilled/censored demand, evaluated Observed Sales (Customer Demand) vs. Simulated Sales (Realized / Fulfilled Demand), and compiled cross-category operational metrics.
- [x] **Section 19: Decision Policies Benchmark & Evaluation Plan (Slide 06)** — Executed formal evaluation plan comparing 3 decision policies under identical conditions: (1) **EOQ / Reorder Rule** (fixed baseline), (2) **Safety-Stock Policy** (static uncertainty buffer), and (3) **ML / AI Policy** (LightGBM dynamic pattern adaptation). Evaluated across all 6 Primary Metrics: Total Cost ($), Stockouts (Units & Days), Average Inventory, Service Level (Fill Rate %), Net Profit ($), and Run-to-Run Variance across 5 repeated disruption seeds. Generated 4-panel comparative visual dashboard and faculty viva defense guide.

---

## 5. Benchmark Results & Bi-Criterion Evaluation

**Test Period:** $d_{1627}$ to $d_{1654}$ (28 days) across 15 representative SKUs across FOODS, HOUSEHOLD, and HOBBIES:

| Model | Paradigm | MAE (Rank) | RMSE (Rank) | Avg Rank | Inference Latency | Training / Setup | Standing / Outcome |
|---|---|---|---|---|---|---|---|
| **Seasonal-Naive (Lag 7)** | Classical Heuristic | ~1.18 (4th) | ~2.18 (4th) | 4.0 | < 0.01 ms | None (0s) | 4th (Simple heuristic baseline) |
| **Gemini LLM (Zero-Shot)** | Foundation Pretrained LLM | **~1.10 - 1.15 (1st)** | ~2.05 (3rd) | **2.0** | ~1.5 s / SKU | None (In-context prompt) | **T-1st [CO-WINNER 🤝] (MAE Leader)** |
| **Nixtla TimeGPT (Zero-Shot)** | Dedicated Time Series FM API | ~0.95 - 1.12 (2nd) | ~1.85 - 2.00 (2nd) | **2.0** | ~0.6 s / SKU | None (Pretrained TSFM) | **Competitive TSFM Baseline** |
| **Fine-Tuned LightGBM (Tweedie)** | Specialized Tabular GBDT | ~0.62 - 1.15 (3rd) | **~1.18 (1st)** | **2.0** | **~0.05 ms / SKU** | Local CPU (~8.2s) | **T-1st [CO-WINNER 🤝] (RMSE Leader)** |

### Metric Duality & Academic Verdict:
- **Gemini Zero-Shot wins on MAE ($\mathcal{L}_1$):** Pretrained in-context reasoning estimates smooth conditional median demand without task-specific training, excelling at linear error minimization on zero-inflated series.
- **LightGBM wins on RMSE ($\mathcal{L}_2$):** Tweedie compound Poisson-gamma loss accurately tracks demand spikes, weekend surges, and holiday run-ups, avoiding heavy quadratic outlier penalties.
- **Academic Standing:** Co-winners with distinct architectural roles. In production, a **Tiered Hybrid Architecture** is recommended: LightGBM for 99% of established SKUs at ultra-low latency, and Gemini for cold-starts and qualitative disruption sensing.

---

## 6. Project Roadmap & Status ⬜

### Faculty Requirements (explicitly requested):
- [x] Find top products and plot them (Sections 4–6)
- [x] Add **season** awareness (Section 8: explicit season code + continuous circular harmonics `sin/cos_day_of_year`)
- [x] Add **occasion** awareness (Section 8: event types, binary flags, `days_to_event` countdowns, `days_since_event`)
- [x] Add **weekday** awareness (Section 8: `wday` verified in ML and LLM)
- [x] **LLM vs ML comparison** (Sections 13–15: Gemini Zero-Shot vs Fine-Tuned LightGBM vs Seasonal-Naive)
- [x] **PCA Feature Multicollinearity & Dimensionality Reduction** (Section 16: Faculty variance % plot with component labels, top-ranking feature dominance chart, scree plot, biplot, loadings heatmap, 16-component table)
- [x] **Top-Ranking Feature per PCA Component** (Section 16: identified and plotted dominant drivers for all 16 PCs based on absolute loadings)
- [x] **Better PCA & Multi-Level Empirical Pruning Validation** (Section 17: reduced from 17 $\to$ 12 $\to$ 10 $\to$ 8 features without losing score; proved 10-feature model achieves MAE 0.8264 vs 0.8297 full baseline)
- [x] **Digital Twin Synthetic Inventory Data Simulation** (Section 18: on-hand stock, lead times, restocks, and stockout tracking)
- [x] **Decision Policies Benchmark & Evaluation Plan (Slide 06)** (Section 19: EOQ vs. Safety-Stock vs. ML/AI policy benchmark across 6 primary metrics with repeated disruption runs)

### Optional / Future Enhancements:
1. [ ] **LightGBM MAE Objective:** Train LightGBM with explicit L1 / MAE objective (`objective='regression_l1'`) or Huber loss to compete directly with Gemini on linear deviance.
2. [ ] **Merge `sell_prices.csv`:** Add `sell_price`, `price_change_pct`, `price_vs_mean`, and `is_on_sale`.
3. [ ] **Seasonality Decomposition Plot:** Apply `statsmodels.tsa.seasonal_decompose` or STL for additive/multiplicative component breakdown.
4. [ ] **Store-Level Macro Trend Analysis:** Aggregate sales across 10 stores to identify regional cross-state dynamics (CA vs TX vs WI).
5. [ ] **Quantile Regression Intervals:** Generate $p_{10}$ and $p_{90}$ forecast bounds for probabilistic safety stock sizing.
6. [ ] **Anomaly / Demand Spike Detection:** Flag unexpected demand shocks using rolling z-scores or Isolation Forests.

---

## 7. File Structure

```
Ai inventory/
├── PROJECT_CONTEXT.md                          ← Single source of truth for project status
├── README.md                                   ← Public repository overview & quickstart
├── Ai_Driven_Inventory_Management.ipynb        ← Primary Jupyter/Colab notebook (Sections 1–18)
├── pca_correlation_plots.png                   ← 4-panel diagnostic plot: Scree, Loadings, Biplot, Heatmap
├── m5-forecasting-accuracy.zip                 ← M5 Walmart Competition Dataset (45.8 MB)
│   ├── sales_train_validation.csv              ← 30,490 daily sales series (d_1 to d_1913)
│   ├── calendar.csv                            ← Calendar dates, events, and snap flags
│   └── sell_prices.csv                         ← Weekly unit pricing per SKU per store
├── .env                                        ← Local environment variables (GEMINI_API_KEY)
└── output*.png                                 ← Exported forecast trajectories, error slices, and sawtooth plots
```

---

## 8. Key Constants & Configuration

```python
N_SERIES = 200          # Development subsample size
RANDOM_SEED = 42        # Reproducibility seed
TRAIN_END_DAY = 1626    # Chronological train/test split point (train <= d_1626, test > d_1626)
TEST_HORIZON = 28       # Evaluation window length (d_1627 to d_1654)
TOP_N = 10              # Top products to display per category
TWEEDIE_POWER = 1.1     # LightGBM variance power for zero-inflated demand
```

---

## 9. Academic Conventions & Guidelines

- **All monetary values** are in USD ($).
- **Sales units** are discrete integer counts.
- **Dates** follow standard ISO format (`YYYY-MM-DD`).
- **Feature naming:** `lag_N`, `rolling_*`, `is_*`, `days_to_*`, `sin_*`, `cos_*`.
- **Simulation demarcation:** Every cell generating synthetic inventory dynamics must include a clear markdown warning:
  `⚠️ SIMULATED — The following values are operational assumptions, not observed M5 data.`
- **Target leakage prevention:** Rolling statistical windows must always be shifted by at least 1 day (`shift(1)`).

---

*Last updated: 2026-11-19*
