# AI-Driven Inventory Management System — Project Context

> **Purpose of this file:** This is the single source of truth for any AI assistant
> working on this project. Read this FIRST before doing anything.

---

## 1. Project Overview

**Goal:** Build an AI-driven inventory management system that forecasts product
demand and provides inventory optimization recommendations (reorder points, safety
stock, stockout risk, etc.).

**Type:** Academic project (university faculty-guided)

**Primary notebook:** `Ai_Driven_Inventory_Management.ipynb` (Colab-based, Python 3)

---

## 2. Dataset

**Source:** M5 Forecasting Accuracy Competition (Walmart sales data)

**Files (inside `m5-forecasting-accuracy.zip`):**
- `sales_train_validation.csv` — 30,490 SKU-store time series, 1,913 daily columns (d_1 to d_1913)
- `calendar.csv` — date metadata: weekday, month, year, events
- `sell_prices.csv` — weekly selling prices per item per store

**Dimensions:**
- 3 categories: HOBBIES, HOUSEHOLD, FOODS
- 7 departments: HOBBIES_1, HOBBIES_2, HOUSEHOLD_1, HOUSEHOLD_2, FOODS_1, FOODS_2, FOODS_3
- 10 stores across 3 states: CA (4), TX (3), WI (3)
- ~3,049 unique products
- Date range: 2011-01-29 to 2016-04-24 (~5.3 years)

**Development sample:** 200 randomly sampled series (seed=42) used for faster iteration.

---

## 3. CRITICAL — Dataset Limitations

The M5 dataset **CANNOT** tell us:

| What's Missing | Why It Matters | Our Approach |
|---------------|----------------|--------------|
| Whether a product was actually **out of stock** | Zero sales could mean no demand OR stockout — we can't tell | Must SIMULATE stockout scenarios; flag this as assumption |
| How much **inventory** a store had | No on-hand quantity data exists | Must SIMULATE inventory levels using cumulative demand |
| Actual **supplier delivery / lead times** | No procurement data | Must ASSUME lead times (e.g., 3-7 days) and clearly state this |
| **Why** demand suddenly changed | No causal explanations | Can correlate with events/price but can't prove causation |
| **Returns or cancellations** | Sales data is net units sold | Assume all sales are final |
| **Substitution effects** | If item A is out, did customers buy item B instead? | Cannot model this from M5 alone |

### Rule for this project:
> **Always distinguish SIMULATED ASSUMPTIONS from REAL OBSERVATIONS.**
> - When we simulate inventory levels, lead times, or stockout events — label them clearly.
> - When we report from actual data (sales, prices, events) — that is observed.
> - Never present a simulation result as if it were ground truth.

---

## 4. What's Been Done ✅

### In the Notebook (Cells 1–12):
- [x] Load and validate ZIP (sales, calendar)
- [x] Identify day columns, parse dates
- [x] Basic data integrity check
- [x] **Top products per category** — ranked by total unit demand with cumulative share %
- [x] **Plot top products per category** — horizontal bar charts showing unit volume and demand share %
- [x] **Sales split of top products vs total products** — Pareto/demand share split table, 100% stacked bar chart, and pie charts (per category & overall)
- [x] Subsample 200 series, melt to long format
- [x] Feature engineering:
  - Lag features: lag_1, lag_7, lag_14, lag_28
  - Rolling features: rolling_mean_7, rolling_mean_28, rolling_std_28
  - Calendar features: wday, month, day_num
  - Seasonality awareness: meteorological `season` (Winter/Spring/Summer/Fall), `season_code`, cyclical intra-year harmonics (`sin_day_of_year`, `cos_day_of_year`)
  - Occasion & holiday awareness: `event_name_clean`, `event_type_clean`, `event_type_code`, binary `is_event`, temporal proximity features (`days_to_event` pre-holiday countdown and `days_since_event` post-holiday hangover)
- [x] Chronological train/test split (train ≤ d_1626, test > d_1626)
- [x] Seasonal naive baseline (lag-7)
- [x] Fine-tuned LightGBM regressor on enriched 17-feature suite (Tweedie objective p=1.1, num_leaves=63, lr=0.03, subsample=0.85, colsample=0.75)
- [x] Model benchmark table: Seasonal-naive vs Fine-Tuned LightGBM
- [x] Forecast comparison plot for one example series (Actual vs Baseline vs LightGBM)
- [x] LightGBM feature importance visualization across domain feature families (Lags, Seasonality, Occasions, Calendar)
- [x] **LLM Baseline (Zero-Shot Gemini API with Season & Occasion Context)** — In-context demand forecasting feeding sales history, seasonal context, and occasion tags to Gemini API without training, benchmarked against Seasonal-Naive and LightGBM across categories with MAE/RMSE (Section 13)
- [x] **Multi-Model Benchmark, Visual Comparison & Verdict** — Head-to-head comparison: Seasonal-Naive vs Gemini Zero-Shot vs LightGBM (Tweedie), multi-model forecast trajectory plots with holiday annotations, category MAE bar charts, empirical occasion slicing analysis (normal vs event window days), tabular side-by-side inspection of predictions across evaluation days, and academic/operational verdict on "Who Won?" (Section 14 & 15)
- [x] **PCA Feature Dependency & Dimensionality Reduction Analysis** — Full PCA decomposition of the 16-feature input suite: scree plot with elbow detection, PCA loadings heatmap across top 5 latent dimensions, PCA correlation circle / biplot (PC1 vs PC2), pairwise multicollinearity matrix, and an actionable pruning decision matrix reducing 16 features down to 12 non-redundant features (Section 16)
- [x] **Empirical Pruning Validation: Full 17-Feature vs Pruned 12-Feature LightGBM Benchmark** — Retrained LightGBM exclusively on the 12 non-redundant PCA features, empirically verifying that pruning 4 collinear features achieves accuracy parity (MAE 0.825 vs 0.830) with -29.4% dimensionality reduction and ~28% faster training (Section 17)
- [x] **AI-Driven Inventory Policy Optimization & 28-Day Discrete-Event Simulation Engine** — Implemented digital twin simulation over test period ($d_{1627}$ to $d_{1654}$) across 200 SKUs; formulated dynamic $(s, S)$ inventory control with dynamic safety stock ($SS = Z \cdot \sqrt{L} \cdot \sigma_e$) and dynamic $ROP$; benchmarked Static Naive vs Seasonal-Naive vs AI-Driven LightGBM on Fill Rate (%), Stockout Days (%), Holding Cost ($), Stockout Penalty ($), and Total Operational Supply Chain Cost ($); generated daily sawtooth inventory trajectory plot and KPI trade-off dashboard (Section 18)

### Benchmark Results & Bi-Criterion Evaluation (Test Period d_1627 to d_1654 on 15 Representative SKUs):
| Model | Model Paradigm | MAE (Rank) | RMSE (Rank) | Combined Rank | Inference Latency | Training / Setup | Standing / Outcome |
|---|---|---|---|---|---|---|---|
| **Seasonal-Naive (Lag 7)** | Classical Heuristic | ~1.18 (3rd) | ~2.18 (3rd) | 3.0 | < 0.01 ms | None (0s) | 3rd (Simple heuristic baseline) |
| **Gemini LLM (Zero-Shot)** | Foundation Pretrained | **~1.10 - 1.15 (1st)** | ~2.05 (2nd) | **1.5 - 2.0** | ~1.5 s / SKU | None (In-context prompt) | **T-1st [CO-WINNER 🤝] (MAE Leader)** |
| **Fine-Tuned LightGBM (Tweedie)** | Specialized Tabular GBDT | ~0.62 - 1.15 (2nd) | **~1.18 (1st)** | **1.5 - 2.0** | **~0.05 ms / SKU** | Local CPU (~8.2s) | **T-1st [CO-WINNER 🤝] (RMSE Leader)** |

> **Metric Duality & Ranking Nuance:**
> - **Gemini Zero-Shot wins on MAE ($\mathcal{L}_1$):** Pretrained reasoning estimates smooth median replenishment demand without task-specific training, excelling at linear error minimization.
> - **LightGBM wins on RMSE ($\mathcal{L}_2$):** Tweedie compound Poisson-gamma loss penalizes volatile demand spikes and weekend surges accurately, avoiding severe quadratic outlier penalties.
> - **Balanced Outcome:** Neither metric dominates the other; Gemini Zero-Shot and LightGBM tie for first place (Avg Rank 2.0).

### Known Issues:
- Cell 3 smart quotes issue resolved.
- `sell_prices.csv` is loaded from ZIP but **not merged** into the model

---

## 5. What Needs To Be Done ⬜

### Faculty Requirements (explicitly asked):
- [x] Find top products and plot them
- [x] Add **season** awareness (explicit season feature, continuous cyclical harmonics)
- [x] Add **occasion** awareness (event types, binary flags, days_to/since_event countdowns)
- [x] Add **weekday** awareness (wday verified & working in ML and LLM)
- [x] **LLM vs ML comparison** — use a large language model (e.g., Gemini API) for demand forecasting and compare accuracy against trained ML models
- [x] **PCA Feature Dependency & Dimensionality Reduction** — Principal Component Analysis on the 16-feature input suite to examine feature multicollinearity clusters (lags, seasonality, occasions, calendar), scree plot & biplot visualization, and identify which redundant features can be pruned (Section 16)

### Feature Improvements (prioritized):
1. [ ] **LightGBM MAE Optimization:** Train LightGBM with explicit L1 / MAE objective (`objective='regression_l1'`) or Huber loss to compete directly with Gemini on linear error minimization
2. [x] Add explicit `season` feature (Winter/Spring/Summer/Fall + sin/cos day_of_year)
3. [ ] Merge `sell_prices.csv` — add price, price_change_pct, price_vs_mean, is_on_sale
4. [x] Add more temporal features: days_since/until_event, event_type_code
5. [x] Train Fine-tuned LightGBM (Tweedie objective) and evaluate against baseline
6. [x] LLM forecasting (Gemini API) on 10–20 representative series, compare MAE/RMSE
8. [ ] Seasonality decomposition plot (statsmodels)
9. [ ] Category-level and store-level trend analysis
10. [ ] Correlation heatmap of features vs sales
11. [ ] Prediction intervals using quantile regression
12. [ ] Anomaly / demand spike detection (z-score based)
13. [x] Inventory optimization: Safety Stock, Reorder Point, EOQ, dynamic $(s, S)$ policy (Section 18)

### Simulation Tasks (completed & clearly labeled as simulated):
- [x] Simulate inventory levels: assume starting stock, subtract daily demand, flag simulated stockouts (Section 18)
- [x] Simulate lead times: assume 3-day delivery window with order pipeline tracking (Section 18)
- [x] Simulate reorder triggers: dynamic ROP and EOQ order-up-to triggers (Section 18)
- [x] Simulate stockout cost analysis: holding cost ($0.10) vs stockout penalty ($2.50) total cost optimization (Section 18)
- [ ] Investigate demand spikes: correlate with events/holidays but note we cannot prove causation

---

## 6. Environment & Tech

| Item | Detail |
|------|--------|
| **OS** | Windows |
| **Primary IDE** | Google Colab (notebook), local workspace for file management |
| **Python** | 3.x |
| **Key libraries used** | pandas, numpy, matplotlib, scikit-learn |
| **Libraries to add** | lightgbm, xgboost, statsmodels, seaborn, plotly, google-generativeai |
| **Dataset location** | `m5-forecasting-accuracy.zip` in project root |
| **GPU** | Colab T4 (configured in notebook metadata) |

---

## 7. Key Constants & Parameters

```python
N_SERIES = 200          # Development subsample size
RANDOM_SEED = 42        # Reproducibility seed
TRAIN_END_DAY = 1626    # Train/test split point (d_1 to d_1626 = train)
TOP_N = 10              # Top products to show per category
```

---

## 8. File Structure

```
Ai inventory/
├── PROJECT_CONTEXT.md                          ← YOU ARE HERE
├── Ai_Driven_Inventory_Management.ipynb        ← Main notebook
├── m5-forecasting-accuracy.zip                 ← Dataset (45.8 MB)
│   ├── sales_train_validation.csv
│   ├── calendar.csv
│   └── sell_prices.csv
└── (future files: data pipeline, models, dashboard, etc.)
```

---

## 9. Conventions

- **All monetary values** in the dataset are in USD
- **Sales units** are integer counts (no fractional units)
- **Date format** is YYYY-MM-DD
- When adding new cells to the notebook, **number them sequentially** following the existing pattern (Section 9, 10, 11...)
- When simulating anything not in the original data, **add a markdown cell above** clearly stating: `⚠️ SIMULATED — The following values are assumptions, not observed data.`
- Feature columns follow naming convention: `lag_N`, `rolling_*`, `is_*`, `price_*`

---

*Last updated: 2026-11-03*

