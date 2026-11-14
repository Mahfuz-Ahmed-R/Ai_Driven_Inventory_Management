import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8.5)
        self.setFillColor(colors.HexColor("#64748B"))
        
        # Header (pages > 1)
        if self._pageNumber > 1:
            self.drawString(54, 11 * 72 - 36, "AI-Driven Inventory Management — Faculty Defense & Viva Voce Guide")
            self.setStrokeColor(colors.HexColor("#CBD5E1"))
            self.setLineWidth(0.6)
            self.line(54, 11 * 72 - 42, 8.5 * 72 - 54, 11 * 72 - 42)
            
        # Footer
        footer_text = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(8.5 * 72 - 54, 34, footer_text)
        self.drawString(54, 34, "Confidential — Academic Defense Reference | M5 Walmart Dataset")
        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.6)
        self.line(54, 46, 8.5 * 72 - 54, 46)
        
        self.restoreState()

def build_pdf(filename="Faculty_Defense_Viva_Guide.pdf"):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )
    
    styles = getSampleStyleSheet()
    
    # Custom palette
    PRIMARY = colors.HexColor("#0F172A")    # Slate 900
    ACCENT = colors.HexColor("#1D4ED8")     # Blue 700
    SECONDARY = colors.HexColor("#334155")  # Slate 700
    EMERALD = colors.HexColor("#047857")    # Emerald 700
    AMBER = colors.HexColor("#B45309")      # Amber 700
    BG_LIGHT = colors.HexColor("#F8FAFC")   # Slate 50
    BORDER_LIGHT = colors.HexColor("#E2E8F0")

    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=21,
        leading=25,
        textColor=PRIMARY,
        spaceAfter=4
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=11,
        leading=15,
        textColor=ACCENT,
        spaceAfter=12
    )

    h1_style = ParagraphStyle(
        'Heading1_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=17,
        textColor=PRIMARY,
        spaceBefore=14,
        spaceAfter=6,
        keepWithNext=True
    )
    
    h2_style = ParagraphStyle(
        'Heading2_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10.5,
        leading=14,
        textColor=ACCENT,
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'Body_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.2,
        leading=13.5,
        textColor=SECONDARY,
        spaceAfter=6
    )

    bullet_style = ParagraphStyle(
        'Bullet_Custom',
        parent=body_style,
        leftIndent=14,
        firstLineIndent=-10,
        spaceAfter=4
    )

    box_text_style = ParagraphStyle(
        'BoxText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=PRIMARY
    )

    q_style = ParagraphStyle(
        'Question_Style',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9.8,
        leading=13.5,
        textColor=PRIMARY,
        spaceBefore=6,
        spaceAfter=2,
        keepWithNext=True
    )

    test_style = ParagraphStyle(
        'Test_Style',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=8.5,
        leading=11.5,
        textColor=AMBER,
        spaceAfter=4,
        keepWithNext=True
    )

    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.white,
        alignment=1
    )

    table_cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        textColor=PRIMARY
    )

    story = []

    # Title Banner Block
    story.append(Paragraph("AI-Driven Inventory Management System", title_style))
    story.append(Paragraph("Faculty Defense & Viva Voce Guide: What You Did, Why You Did It, How You Did It", subtitle_style))
    
    # Metadata Pill Table
    meta_data = [
        [
            Paragraph("<b>Project:</b> Retail Demand Forecasting & Inventory", box_text_style),
            Paragraph("<b>Dataset:</b> M5 Competition (Walmart, 5.3 yrs)", box_text_style),
            Paragraph("<b>Models:</b> LightGBM + Gemini Zero-Shot", box_text_style)
        ]
    ]
    meta_table = Table(meta_data, colWidths=[2.5*inch, 2.3*inch, 2.2*inch])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), BG_LIGHT),
        ('BOX', (0,0), (-1,-1), 0.8, BORDER_LIGHT),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('PADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 10))

    # SECTION 1: THE CORE DEFENSE TRIAD
    story.append(Paragraph("1. The Core Defense Triad: What, Why & How", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=ACCENT, spaceBefore=2, spaceAfter=8))
    
    # What Box
    what_text = """<b>WHAT DID YOU DO?</b><br/>
    I developed an AI-driven inventory demand forecasting system that gives models explicit awareness of <b>seasons and calendar occasions</b>, and conducted an empirical head-to-head benchmark between specialized Tabular ML and Foundation LLMs:<br/>
    • <b>Engineered a 17-Feature Domain Suite:</b> Extracted meteorological seasons, continuous harmonic day-of-year cycles, pre-holiday countdown vectors (<code>days_to_event</code>), and autoregressive lag/rolling dynamics.<br/>
    • <b>Fine-Tuned LightGBM Regressor:</b> Trained on 319,000 samples with a Tweedie distribution (<i>p</i>=1.1) tailored for zero-inflated retail demand.<br/>
    • <b>Built In-Context Gemini Zero-Shot Pipeline:</b> Structured in-context prompts feeding sales histories, upcoming holiday tags, and domain reasoning instructions without task-specific retraining.<br/>
    • <b>Conducted Dual-Metric & Holiday-Sliced Evaluation:</b> Evaluated on 15 representative SKUs across categories, analyzing MAE vs RMSE and isolating holiday window performance."""
    
    story.append(Table([[Paragraph(what_text, box_text_style)]], colWidths=[7.0*inch], style=[
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#EFF6FF")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#BFDBFE")),
        ('PADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(Spacer(1, 8))

    # Why Box
    why_text = """<b>WHY DID YOU DO IT?</b><br/>
    Because conventional forecasting approaches fail due to three major retail blind spots:<br/>
    1. <b>Holidays are non-linear ramp-up curves:</b> Shoppers buy supplies 1–3 days prior to an event (Thanksgiving, Super Bowl, Eid), followed by a post-holiday drop. A binary 0/1 flag misses the surge.<br/>
    2. <b>Calendar boundary disconnect:</b> Decision trees see Dec 31 (day 365) and Jan 1 (day 1) as 364 days apart. Sine/cosine harmonics map calendar days onto a continuous unit circle.<br/>
    3. <b>Foundation LLM vs ML Evaluation:</b> We needed to determine whether an LLM's pre-trained cultural knowledge of holidays can rival or complement a gradient boosted tree."""
    
    story.append(Table([[Paragraph(why_text, box_text_style)]], colWidths=[7.0*inch], style=[
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#FEF3C7")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#FDE68A")),
        ('PADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(Spacer(1, 8))

    # How Box
    how_text = """<b>HOW DID YOU DO IT?</b><br/>
    • <b>Feature Engineering:</b> Meteorological mapping (Winter=0, Spring=1, Summer=2, Fall=3), cyclical harmonics <code>sin(2π·doy/365.25)</code> and <code>cos(...)</code>, and proximity countdowns <code>days_to_event = (next_event - t).clip(0,15)</code>.<br/>
    • <b>LightGBM Architecture:</b> Objective: <code>tweedie</code>, variance power: 1.1, lr: 0.03, num_leaves: 63, n_estimators: 220, subsample: 0.85, colsample: 0.75 on strict chronological split (train ≤ d_1626).<br/>
    • <b>Gemini Zero-Shot:</b> Injected 56-day history with dates, weekday, and occasion tags (e.g. <code>2015-07-18 | Eid al-Fitr</code>) into structured JSON prompt schema.<br/>
    • <b>Empirical Validation:</b> Visualized multi-model trajectories with holiday markers, grouped category MAE charts, and holiday error slicing (Normal vs Occasion Window Days)."""
    
    story.append(Table([[Paragraph(how_text, box_text_style)]], colWidths=[7.0*inch], style=[
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#ECFDF5")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#A7F3D0")),
        ('PADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(Spacer(1, 10))

    # Elevator Pitch Box
    pitch_text = """<b>THE 60-SECOND DEFENSE PITCH:</b><br/>
    <i>\"Sir, in simple words: I built an inventory demand forecasting system combining LightGBM and Gemini Zero-Shot with season and holiday occasion awareness. I did this because naive models only look at past sales and miss the 1–3 day pre-holiday stocking rush. To solve this, I engineered 17 domain features including <code>days_to_event</code> countdowns and cyclical sine/cosine harmonics, trained LightGBM with Tweedie loss, fed rich calendar prompts to Gemini, and proved on an empirical holiday test slice that occasion-aware models prevent holiday stockout errors.\"</i>"""
    story.append(Table([[Paragraph(pitch_text, box_text_style)]], colWidths=[7.0*inch], style=[
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F1F5F9")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#CBD5E1")),
        ('PADDING', (0,0), (-1,-1), 7),
    ]))

    story.append(PageBreak())

    # SECTION 2: TOP 10 DEFENSE QUESTIONS & MODEL ANSWERS
    story.append(Paragraph("2. Top 10 Faculty Defense Questions & Model Answers", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=ACCENT, spaceBefore=2, spaceAfter=8))

    qa_list = [
        (
            "Category 1: Feature Engineering & Domain Seasonality",
            "Q1. Why did you create `days_to_event` and `days_since_event` instead of just a binary `is_event` (0 or 1) flag?",
            "Tests whether you understand non-linear retail behavior and tree split mechanics.",
            "In retail, consumer demand does not spike as a single impulse on the holiday itself. For major occasions like Thanksgiving, Super Bowl, or Eid, customers stock up 1 to 3 days in advance. On the event day or immediately following, sales collapse because stores are closed or pantries are full. A binary flag only marks day T. By creating a continuous countdown vector, decision trees can split cleanly on `days_to_event <= 2` to capture the pre-holiday stocking rush. This was a core winning technique in the Kaggle M5 competition."
        ),
        (
            "Category 1: Feature Engineering & Domain Seasonality",
            "Q2. You have `month`, `season_code`, and `sin/cos_day_of_year`. Isn't that collinear and redundant?",
            "Tests understanding of multi-scale temporal modeling vs cyclical projections.",
            "They capture time at three distinct mathematical scales: (1) `season_code` (0–3) represents macro quarterly retail seasons (e.g. winter apparel vs summer beverages); (2) `month` (1–12) captures monthly budgeting cycles; (3) `sin` and `cos` harmonics provide topological continuity. Tree models treat day 365 (Dec 31) and day 1 (Jan 1) as 364 units apart. Sine and cosine coordinates project calendar days onto a unit circle, ensuring that Dec 31 and Jan 1 are geometrically adjacent."
        ),
        (
            "Category 1: Feature Engineering & Domain Seasonality",
            "Q3. How do you detect and handle multicollinearity across your engineered temporal features?",
            "Tests knowledge of feature redundancy, correlation clusters, and dimensionality reduction.",
            "We applied Principal Component Analysis (PCA) across our 16-feature space. PCA revealed distinct orthogonal clusters: PC1 captures demand volume (lags and rolling means, ~45% variance), PC2 captures annual seasonality (month and sin/cos harmonics, ~20% variance), and PC3 isolates holiday countdowns. This diagnosed severe pairwise collinearity (e.g. `season_code` vs `month` at r=0.96, and `rolling_mean_7` vs `rolling_mean_28` at r=0.94). Using our actionable pruning matrix, we eliminated 4 redundant features (-29.4% dimensionality from 17 down to 12). In Section 17, we empirically verified this by retraining LightGBM on the 12 pruned features: it achieved full accuracy parity (MAE 0.825 vs 0.830) while speeding up training by ~28%."
        ),
        (
            "Category 2: Machine Learning Architecture & Tweedie Loss",
            "Q4. Why did you train LightGBM with the `tweedie` objective instead of standard MSE or MAE?",
            "Tests statistical understanding of zero-inflated retail distributions.",
            "Daily retail SKU sales are zero-inflated, intermittent, and strictly non-negative. Standard Gaussian MSE assumes symmetric residuals and frequently predicts negative units. The Tweedie distribution (variance power p=1.1) is a compound Poisson-Gamma distribution: the Poisson process models the discrete probability of zero sales, while the Gamma distribution models positive unit volumes given a transaction. It optimizes intermittent retail demand natively without requiring a two-stage hurdle model."
        ),
        (
            "Category 2: Machine Learning Architecture & Tweedie Loss",
            "Q5. How did you prevent data leakage in your lag features and train/test split?",
            "Tests experimental rigor and time-series validation standards.",
            "We applied two strict safeguards: (1) All rolling statistics (7-day, 28-day) are shifted by 1 day (`shift(1)`), ensuring that current-day sales are strictly excluded from rolling windows. (2) We enforced a strict chronological split (train ≤ d_1626, test > d_1626). Random K-fold splitting would cause future sales to leak into past lag features, falsely inflating accuracy."
        ),
        (
            "Category 3: Foundation LLM vs. Machine Learning Paradigm",
            "Q6. Why use an LLM (Gemini) for time series forecasting? Isn't an LLM designed for language?",
            "Tests knowledge of foundation models and in-context reasoning.",
            "Modern LLMs act as zero-shot numerical pattern reasoners. We tested Gemini for two academic reasons: (1) Pretrained Cultural World Knowledge: A tabular tree only sees numeric IDs, whereas Gemini has pre-trained semantic understanding of holiday shopping (e.g. buying gifts for Christmas, candy for Halloween). (2) Cold-Start Capability: For new SKUs with zero sales history where lag features cannot be computed, Gemini provides instant zero-shot transfer based on product metadata and seasonal context."
        ),
        (
            "Category 3: Foundation LLM vs. Machine Learning Paradigm",
            "Q7. Your benchmark shows Gemini won on MAE, but LightGBM won on RMSE. Why? Explain mathematically.",
            "Tests mathematical grasp of L1 (median) vs L2 (mean) loss functions.",
            "This reflects the classic metric duality between L1 and L2 optimization: (1) MAE penalizes errors linearly, estimating the conditional median. In zero-inflated data, Gemini's smooth in-context reasoning predicts median replenishment demand accurately, minimizing linear deviance. (2) RMSE penalizes errors quadratically, estimating the conditional mean. LightGBM with Tweedie loss aggressively predicts weekend surges and holiday spikes; even if an occasional spike increases MAE slightly, it avoids severe quadratic outlier penalties. Neither dominates, resulting in a balanced tie (Average Rank ~1.5–2.0)."
        ),
        (
            "Category 3: Foundation LLM vs. Machine Learning Paradigm",
            "Q8. Can Walmart actually deploy Gemini across all 30,000 SKUs in production?",
            "Tests practical systems engineering and latency/cost trade-offs.",
            "No, not as a standalone batch engine. Scoring 30,000 items with LightGBM takes less than 2 seconds on a CPU at zero marginal cost. In contrast, 30,000 serial LLM API calls would take ~12.5 hours and incur substantial API token expenses. The recommended architecture is a Hybrid System: deploy LightGBM for 99% of established SKUs with stable history, and invoke Gemini for cold-start launches and qualitative disruption sensing (weather alerts, promotional flyers)."
        ),
        (
            "Category 4: Empirical Proof & Dataset Limitations",
            "Q9. How did you empirically prove that occasion awareness actually improved accuracy?",
            "Tests whether you verified features via sliced evaluation.",
            "In Section 14, we performed an Occasion Error Slicing Analysis, isolating Normal Days vs Occasion Window Days (the holiday and 1–2 days prior). For Seasonal-Naive, MAE surged drastically on holiday windows because it blindly repeated lag-7 values. In contrast, occasion-aware LightGBM (using `days_to_event`) and Gemini (using holiday-annotated prompts) maintained low, stable error curves across holiday boundaries."
        ),
        (
            "Category 4: Empirical Proof & Dataset Limitations",
            "Q10. M5 records sales units, not on-hand inventory or stockouts. Isn't calling this an 'Inventory System' misleading?",
            "Tests scientific honesty and acknowledgement of data limitations.",
            "This is a fundamental dataset constraint that we explicitly document: M5 records observed sales, which represents unconstrained consumer demand only when stock is available (a zero could mean zero demand OR an out-of-stock event). Therefore, our machine learning models forecast pure demand. All subsequent inventory optimization (Safety Stock, Reorder Points, and assumed 3–7 day supplier lead times) is treated strictly as a stochastic simulation layer, clearly distinguished from ground-truth sales observations."
        )
    ]

    current_cat = None
    for cat, q, test, ans in qa_list:
        card_content = []
        if cat != current_cat:
            current_cat = cat
            card_content.append(Paragraph(f"<b>{current_cat.upper()}</b>", h2_style))
            card_content.append(HRFlowable(width="100%", thickness=0.6, color=colors.HexColor("#CBD5E1"), spaceBefore=1, spaceAfter=4))

        card_content.append(Paragraph(q, q_style))
        card_content.append(Paragraph(f"<b>What Faculty is Testing:</b> {test}", test_style))
        card_content.append(Paragraph(f"<b>Model Answer:</b> {ans}", body_style))
        card_content.append(Spacer(1, 4))

        story.append(KeepTogether(card_content))

    story.append(PageBreak())

    # SECTION 3: BENCHMARK MATRIX & CHEATSHEET
    story.append(Paragraph("3. Multi-Metric Benchmark Matrix & Viva Cheatsheet", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=ACCENT, spaceBefore=2, spaceAfter=8))

    table_data = [
        [
            Paragraph("<b>Model / Strategy</b>", table_header_style),
            Paragraph("<b>Paradigm</b>", table_header_style),
            Paragraph("<b>MAE (L1)</b>", table_header_style),
            Paragraph("<b>RMSE (L2)</b>", table_header_style),
            Paragraph("<b>Inference Latency</b>", table_header_style),
            Paragraph("<b>Standing / Outcome</b>", table_header_style)
        ],
        [
            Paragraph("<b>Seasonal-Naive (Lag 7)</b>", table_cell_style),
            Paragraph("Heuristic Baseline", table_cell_style),
            Paragraph("~1.18 (3rd)", table_cell_style),
            Paragraph("~2.18 (3rd)", table_cell_style),
            Paragraph("&lt; 0.01 ms", table_cell_style),
            Paragraph("3rd Place", table_cell_style)
        ],
        [
            Paragraph("<b>Gemini LLM (Zero-Shot)</b>", table_cell_style),
            Paragraph("Foundation In-Context", table_cell_style),
            Paragraph("<b>~1.10 - 1.15 (1st)</b>", table_cell_style),
            Paragraph("~2.05 (2nd)", table_cell_style),
            Paragraph("~1.5 sec / SKU", table_cell_style),
            Paragraph("<b>T-1st [CO-WINNER 🤝] (MAE Leader)</b>", table_cell_style)
        ],
        [
            Paragraph("<b>Fine-Tuned LightGBM</b>", table_cell_style),
            Paragraph("Specialized Tabular GBDT", table_cell_style),
            Paragraph("~0.62 - 1.15 (2nd)", table_cell_style),
            Paragraph("<b>~1.18 (1st)</b>", table_cell_style),
            Paragraph("<b>~0.05 ms / SKU</b>", table_cell_style),
            Paragraph("<b>T-1st [CO-WINNER 🤝] (RMSE Leader)</b>", table_cell_style)
        ]
    ]

    benchmark_table = Table(table_data, colWidths=[1.6*inch, 1.3*inch, 0.9*inch, 0.9*inch, 1.0*inch, 1.3*inch])
    benchmark_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), PRIMARY),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_LIGHT),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, BG_LIGHT]),
        ('PADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(benchmark_table)
    story.append(Spacer(1, 12))

    story.append(Paragraph("Defense Cheatsheet: Keywords & Faculty Trigger Words", h2_style))
    cheatsheet_data = [
        [
            Paragraph("<b>When Faculty Asks About:</b>", table_header_style),
            Paragraph("<b>Key Concept to Mention:</b>", table_header_style),
            Paragraph("<b>Exact Technical Defense:</b>", table_header_style)
        ],
        [
            Paragraph("<b>Holidays & Occasions</b>", table_cell_style),
            Paragraph("<code>days_to_event</code> countdown", table_cell_style),
            Paragraph("Holidays are non-linear surge curves; trees split on countdown <= 2.", table_cell_style)
        ],
        [
            Paragraph("<b>Annual Seasonality</b>", table_cell_style),
            Paragraph("Harmonic projection", table_cell_style),
            Paragraph("Sine/cosine harmonics project time on a circle, bridging Dec 31 to Jan 1.", table_cell_style)
        ],
        [
            Paragraph("<b>PCA Pruning</b>", table_cell_style),
            Paragraph("Dimensionality reduction", table_cell_style),
            Paragraph("PCA diagnoses collinear clusters, pruning 4 redundant features (-25%) with zero variance loss.", table_cell_style)
        ],
        [
            Paragraph("<b>Tweedie Distribution</b>", table_cell_style),
            Paragraph("Compound Poisson-Gamma", table_cell_style),
            Paragraph("Models zero-probability (Poisson) and positive volume (Gamma) simultaneously.", table_cell_style)
        ],
        [
            Paragraph("<b>LLM vs ML Outcome</b>", table_cell_style),
            Paragraph("Metric Duality (L1 vs L2)", table_cell_style),
            Paragraph("Gemini wins on MAE (median); LightGBM wins on RMSE (outlier surge protection).", table_cell_style)
        ],
        [
            Paragraph("<b>Operational Viability</b>", table_cell_style),
            Paragraph("Hybrid Tiered Architecture", table_cell_style),
            Paragraph("LightGBM for 99% high-speed batch runs; Gemini for cold-starts and disruption sensing.", table_cell_style)
        ]
    ]

    cheat_table = Table(cheatsheet_data, colWidths=[1.8*inch, 1.8*inch, 3.4*inch])
    cheat_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#334155")),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_LIGHT),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, BG_LIGHT]),
        ('PADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(cheat_table)

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"PDF successfully built: {filename}")

if __name__ == '__main__':
    build_pdf()

