# AI-Driven Inventory Management System

An academic, end-to-end AI-driven inventory forecasting and digital twin simulation framework built on the Walmart M5 dataset (~5.3 years of daily retail data).

This project integrates domain-aware feature engineering (meteorological seasons, cyclical harmonics, pre-holiday stocking countdowns), conducts a multi-paradigm benchmark between specialized gradient boosting and foundation large language models, applies Principal Component Analysis (PCA) for multicollinearity pruning, and simulates realistic shelf inventory dynamics.

---

## 🚀 Key Highlights & Research Contributions

1. **Domain Feature Engineering (17 Features):**
   - **Occasion & Holiday Proximity:** Pre-holiday stocking countdowns (`days_to_event = (next_event - t).clip(0, 15)`) and post-holiday hangover vectors (`days_since_event`) capture non-linear stocking rushes that standard binary $0/1$ flags miss.
   - **Continuous Circular Harmonics:** $\sin(2\pi \cdot \text{day\_of\_year} / 365.25)$ and $\cos(\dots)$ project annual calendar dates onto a continuous unit circle, geometrically bridging December 31 to January 1 for decision trees.
   - **Autoregressive Lags & Shifted Rolling Stats:** Lags (1, 7, 14, 28) and rolling statistics (7-day, 28-day) shifted by 1 day to strictly prevent future target leakage.

2. **Multi-Paradigm Forecasting Benchmark:**
   - **Seasonal-Naive (Lag 7):** Classical baseline repeating weekly consumption patterns.
   - **Fine-Tuned LightGBM (Tweedie Loss, $p=1.1$):** Optimized for zero-inflated, intermittent retail sales distributions.
   - **Zero-Shot Gemini LLM (Google GenAI API):** Evaluates whether text foundation models can leverage pre-trained world knowledge of cultural holidays and calendar rhythms through structured in-context prompts.
   - **Zero-Shot Nixtla TimeGPT API:** Assesses dedicated, pre-trained numerical time series foundation models (TSFMs) trained on 100B+ data points for zero-shot retail forecasting.

3. **PCA Multicollinearity Diagnosis & Dimensionality Pruning:**
   - Diagnosed severe correlation clusters ($PC_1$ volume, $PC_2$ annual seasonality, $PC_3$ holiday countdowns).
   - Pruned 4 redundant features (-29.4% dimensionality from 17 to 12) while preserving complete accuracy parity (MAE 0.825 vs 0.830) and delivering ~28% faster training speed.

4. **Digital Twin Synthetic Inventory Engine (Section 18):**
   - Bridges M5's data limitation (unobserved shelf inventory, unrecorded stockouts, and lead times).
   - Explicitly simulates daily physical on-hand inventory ($I_t$), supplier replenishment transit windows ($L \in [3, 5]$ days), restock delivery arrivals, and unfulfilled customer demand (censored demand) during stockout events.

---

## 📊 Benchmark Scorecard

Evaluated over a 28-day holdout test horizon ($d_{1627}$ to $d_{1654}$) across 15 representative SKUs spanning FOODS, HOUSEHOLD, and HOBBIES:

| Model | Paradigm | MAE ($\mathcal{L}_1$) | RMSE ($\mathcal{L}_2$) | Avg Rank | Inference Latency | Standing / Role |
|---|---|---|---|---|---|---|
| **Seasonal-Naive (Lag 7)** | Classical Heuristic | ~1.18 (4th) | ~2.18 (4th) | 4.0 | < 0.01 ms | 4th Place (Simple baseline) |
| **Gemini LLM (Zero-Shot)** | Foundation Pretrained LLM | **~1.10 - 1.15 (1st)** | ~2.05 (3rd) | **2.0** | ~1.5 s / SKU | **Co-Winner 🤝 (MAE Leader)** |
| **Nixtla TimeGPT (Zero-Shot)** | Dedicated Time Series FM API | ~0.95 - 1.12 (2nd) | ~1.85 - 2.00 (2nd) | **2.0** | ~0.6 s / SKU | **Strong TSFM Baseline** |
| **Fine-Tuned LightGBM (Tweedie)** | Specialized Tabular GBDT | ~0.62 - 1.15 (3rd) | **~1.18 (1st)** | **2.0** | **~0.05 ms / SKU** | **Co-Winner 🤝 (RMSE Leader)** |

> **Key Finding:** Gemini excels at conditional median estimation (minimizing linear $\mathcal{L}_1$ error), while LightGBM with Tweedie loss accurately anticipates volatile demand spikes and weekend surges (minimizing quadratic $\mathcal{L}_2$ outlier penalties). In production, a **Tiered Hybrid Architecture** is optimal: LightGBM for 99% high-speed batch scoring, and Gemini for cold-start launches and qualitative disruption sensing.

---

## 📁 Repository Structure

```
Ai inventory/
├── PROJECT_CONTEXT.md              # Project single source of truth and active state
├── README.md                       # Repository overview and setup guide
├── Ai_Driven_Inventory_Management.ipynb  # Main Jupyter notebook (Sections 1–18)
├── pca_correlation_plots.png       # Scree plot, loadings heatmap, biplot & correlation matrix
├── m5-forecasting-accuracy.zip     # Walmart M5 dataset (sales, calendar, sell_prices)
├── .env                            # API credentials (GEMINI_API_KEY)
└── output*.png                     # Visual comparison and digital twin diagnostic plots
```

---

## 🛠️ Quickstart & Execution

### 1. Requirements
Install the required Python dependencies:
```bash
pip install pandas numpy scikit-learn lightgbm matplotlib seaborn google-generativeai nixtla python-dotenv
```

### 2. Environment Setup
Configure your Google Gemini and Nixtla TimeGPT API keys in a `.env` file at the root (or Colab Secrets):
```env
GEMINI_API_KEY=your_gemini_api_key_here
NIXTLA_API_KEY=your_nixtla_api_key_here
```

### 3. Running the Primary Notebook
Open and run `Ai_Driven_Inventory_Management.ipynb` sequentially in Google Colab (with GPU acceleration) or locally in Jupyter. The notebook automatically detects `m5-forecasting-accuracy.zip` or downloads it if absent.

---

## 🎓 Academic Attribution

- **Institution:** North South University
- **Domain:** AI-Driven Supply Chain Management & Retail Predictive Analytics
- **Dataset:** M5 Forecasting Competition (Walmart retail sales, Kaggle)
