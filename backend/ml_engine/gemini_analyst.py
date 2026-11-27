"""Gemini AI Executive Business Analyst (Section 13 + Executive Report Narrator)."""

from __future__ import annotations

import os
from typing import Callable


def generate_executive_summary(
    company_name: str,
    kpis: dict,
    critical_skus: list[dict],
    policy_summary: list[dict],
    on_token: Callable[[str], None] | None = None,
) -> str:
    """Generate a concise, boardroom-ready business analysis narrative using Gemini API."""
    api_key = os.getenv("GEMINI_API_KEY", "").strip()

    top_crit_lines = "\n".join(
        f"- {s['product_name']} ({s['sku']}): {s['current_stock']} units on hand, "
        f"runs out in {s['days_left']} days ({s['run_out_date']}), "
        f"suggested order: {s['suggested_order_qty']} units (${s['order_cost']})"
        for s in critical_skus[:5]
    ) or "- No immediate critical stockouts detected."

    eoq = next((p for p in policy_summary if p["policy_key"] == "eoq"), None)
    ml = next((p for p in policy_summary if p["policy_key"] == "ml"), None)
    savings = round((eoq["total_cost"] - ml["total_cost"]), 2) if (eoq and ml) else 0.0

    prompt = f"""You are a Senior Retail Supply Chain & Inventory AI Analyst writing an executive report for {company_name}.

Key 28-Day Forecast & Digital Twin Metrics:
- Total SKUs Analyzed: {kpis.get('total_skus')}
- Total 28-Day Forecasted Demand: {kpis.get('total_forecast_units')} units (${kpis.get('projected_revenue'):,.2f} projected revenue)
- Critical Stockout Risk SKUs: {kpis.get('critical_count')}
- Overstock SKUs: {kpis.get('overstock_count')}
- AI Policy Service Level (Fill Rate): {kpis.get('ai_fill_rate')}%
- Estimated Monthly Supply Chain Savings vs Traditional EOQ: ${savings:,.2f}

Top At-Risk SKUs:
{top_crit_lines}

Write a sharp, actionable 3-paragraph executive summary in markdown:
1. **Overall Inventory Health & Demand Outlook** (mention projected demand and fill rate)
2. **Immediate Stockout Risks & Restocking Priorities** (name the top at-risk SKUs and exact quantities)
3. **Financial Impact of AI Replenishment** (contrast ML/AI policy savings vs traditional EOQ)

Keep it concise (under 180 words), executive-friendly, and data-backed."""

    if api_key and "your_" not in api_key.lower():
        try:
            from google import genai

            client = genai.Client(api_key=api_key)
            full_text = []
            response = client.models.generate_content_stream(
                model="gemini-2.5-flash",
                contents=prompt,
            )
            for chunk in response:
                text = getattr(chunk, "text", "") or ""
                if text:
                    full_text.append(text)
                    if on_token:
                        on_token(text)
            joined = "".join(full_text).strip()
            if joined:
                return joined
        except Exception:
            pass

    # Deterministic structured fallback if API key is unavailable or quota-limited
    fallback = (
        f"### Executive Summary for {company_name}\n\n"
        f"**1. Demand Outlook & Inventory Health:** Across **{kpis.get('total_skus')} SKUs**, our "
        f"PCA-pruned LightGBM (Tweedie) model projects **{kpis.get('total_forecast_units'):,.0f} units** "
        f"of demand over the next 28 days (**${kpis.get('projected_revenue'):,.2f}** projected revenue), "
        f"maintaining a **{kpis.get('ai_fill_rate')}%** target fill rate.\n\n"
        f"**2. Immediate Stockout Priorities:** **{kpis.get('critical_count')} SKUs** are at critical "
        f"stockout risk within the supplier lead-time window. Priority restocks:\n{top_crit_lines}\n\n"
        f"**3. Financial Impact (ML vs. EOQ):** Adopting the ML/AI dynamic replenishment policy reduces "
        f"combined holding and stockout costs by **${max(0.0, savings):,.2f}** over the 28-day horizon "
        f"compared to static EOQ rules while minimizing excess capital tied up in slow-moving stock."
    )
    if on_token:
        on_token(fallback)
    return fallback
