"""Downloadable Business Analysis PDF Report generator using fpdf2."""

from __future__ import annotations

import re
from fpdf import FPDF


def _clean_text(text: str) -> str:
    # Strip markdown bold/headers and non-latin1 characters for standard Helvetica PDF font
    text = re.sub(r"[#*_`]", "", text)
    return text.encode("latin-1", "replace").decode("latin-1")


def build_pdf_report(job_data: dict) -> bytes:
    """Render a clean executive PDF report for a completed AnalysisJob."""
    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()

    # Header banner (DreamsPOS Navy + Orange accent)
    pdf.set_fill_color(9, 44, 76)  # #092C4C
    pdf.rect(0, 0, 210, 28, "F")
    pdf.set_fill_color(254, 159, 67)  # #FE9F43
    pdf.rect(0, 28, 210, 2, "F")

    pdf.set_text_color(255, 255, 255)
    pdf.set_font("Helvetica", "B", 16)
    pdf.set_xy(12, 8)
    pdf.cell(0, 8, _clean_text(f"AI Inventory Business Analysis - {job_data['company_name']}"), ln=True)
    pdf.set_font("Helvetica", "", 10)
    pdf.set_x(12)
    pdf.cell(0, 6, _clean_text(f"Dataset: {job_data['filename']} | 28-Day LightGBM + Digital Twin Report"), ln=True)

    pdf.set_text_color(33, 43, 54)
    pdf.set_y(36)

    # KPI Summary Row
    kpis = job_data.get("summary_kpis", {})
    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 8, "1. Key Performance Indicators (28-Day Horizon)", ln=True)
    pdf.set_font("Helvetica", "", 10)
    kpi_line = (
        f"Total SKUs: {kpis.get('total_skus', 0)}   |   "
        f"Forecasted Demand: {kpis.get('total_forecast_units', 0):,.0f} units   |   "
        f"Projected Revenue: ${kpis.get('projected_revenue', 0):,.2f}\n"
        f"Critical Stockouts: {kpis.get('critical_count', 0)}   |   "
        f"AI Fill Rate: {kpis.get('ai_fill_rate', 0)}%   |   "
        f"Cost Savings vs EOQ: ${kpis.get('cost_savings_vs_eoq', 0):,.2f}"
    )
    pdf.multi_cell(0, 6, _clean_text(kpi_line))
    pdf.ln(3)

    # Executive Summary
    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 8, "2. AI Executive Summary (Gemini Analyst)", ln=True)
    pdf.set_font("Helvetica", "", 10)
    pdf.multi_cell(0, 5.5, _clean_text(job_data.get("gemini_executive_summary", "")))
    pdf.ln(4)

    # Priority Replenishment Table
    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 8, "3. Priority Replenishment Recommendations", ln=True)
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_fill_color(245, 245, 245)
    headers = [("SKU", 26), ("Product", 52), ("Stock", 18), ("Days Left", 22), ("Order Qty", 24), ("Order Cost", 26), ("Urgency", 22)]
    for h, w in headers:
        pdf.cell(w, 7, h, border=1, fill=True)
    pdf.ln()

    pdf.set_font("Helvetica", "", 8.5)
    skus = sorted(job_data.get("skus", []), key=lambda x: x["days_left"])[:20]
    for s in skus:
        pdf.cell(26, 6.5, _clean_text(str(s["sku"])[:14]), border=1)
        pdf.cell(52, 6.5, _clean_text(str(s["product_name"])[:28]), border=1)
        pdf.cell(18, 6.5, f"{s['current_stock']:.0f}", border=1, align="R")
        pdf.cell(22, 6.5, f"{s['days_left']}d", border=1, align="R")
        pdf.cell(24, 6.5, f"{s['suggested_order_qty']}", border=1, align="R")
        pdf.cell(26, 6.5, f"${s['order_cost']:,.2f}", border=1, align="R")
        pdf.cell(22, 6.5, _clean_text(s["urgency"].upper()), border=1, align="C")
        pdf.ln()

    return bytes(pdf.output())
