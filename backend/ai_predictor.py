"""
ai_predictor.py
---------------
AI-powered failure prediction engine.
Supports:
  1. OpenAI GPT (if OPENAI_API_KEY is set)
  2. Ollama local LLM (if USE_OLLAMA=true)
  3. Rule-based heuristic fallback (always available)
"""

import os
import json
import logging
from typing import Dict, Any, Optional

from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
USE_OLLAMA = os.getenv("USE_OLLAMA", "false").lower() == "true"
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")


# ── Heuristic rule-based predictor (no API required) ─────────────────────────

def rule_based_prediction(metrics: Dict[str, Any]) -> Dict[str, Any]:
    """
    Analyses system metrics and returns a risk assessment.
    Thresholds used (industry-standard DevOps):
      - CPU  > 90% → critical, > 75% → high, > 60% → medium
      - RAM  > 90% → critical, > 80% → high, > 70% → medium
      - Disk > 90% → critical, > 80% → high
      - Unhealthy containers → high risk
    """
    cpu     = metrics.get("cpu_percent", 0)
    ram     = metrics.get("ram_percent", 0)
    disk    = metrics.get("disk_percent", 0)
    containers = metrics.get("containers", [])

    unhealthy_containers = [
        c for c in containers
        if c.get("status", "running") not in ("running", "healthy")
    ]
    unhealthy_count = len(unhealthy_containers)

    risk_score  = 0.0
    suggestions = []
    issues      = []

    # CPU scoring
    if cpu > 90:
        risk_score = max(risk_score, 0.95)
        issues.append(f"CRITICAL: CPU at {cpu:.1f}%")
        suggestions.append("Immediately scale horizontally or kill runaway processes.")
    elif cpu > 75:
        risk_score = max(risk_score, 0.75)
        issues.append(f"HIGH: CPU at {cpu:.1f}%")
        suggestions.append("Consider auto-scaling; investigate high-CPU processes.")
    elif cpu > 60:
        risk_score = max(risk_score, 0.55)
        issues.append(f"MODERATE: CPU at {cpu:.1f}%")
        suggestions.append("Monitor CPU trend; prepare to scale if sustained.")

    # RAM scoring
    if ram > 90:
        risk_score = max(risk_score, 0.95)
        issues.append(f"CRITICAL: RAM at {ram:.1f}%")
        suggestions.append("Immediate action needed — OOM kill risk. Increase memory or restart services.")
    elif ram > 80:
        risk_score = max(risk_score, 0.75)
        issues.append(f"HIGH: RAM at {ram:.1f}%")
        suggestions.append("Investigate memory leaks; consider adding swap or more RAM.")
    elif ram > 70:
        risk_score = max(risk_score, 0.50)
        issues.append(f"MODERATE: RAM at {ram:.1f}%")
        suggestions.append("Watch memory trend; optimize memory-hungry services.")

    # Disk scoring
    if disk > 90:
        risk_score = max(risk_score, 0.90)
        issues.append(f"CRITICAL: Disk at {disk:.1f}%")
        suggestions.append("Disk almost full! Clean logs, old images, and unused volumes immediately.")
    elif disk > 80:
        risk_score = max(risk_score, 0.65)
        issues.append(f"HIGH: Disk at {disk:.1f}%")
        suggestions.append("Plan disk cleanup or expand storage.")

    # Container health
    if unhealthy_count > 0:
        risk_score = max(risk_score, 0.70)
        names = [c.get("name", "unknown") for c in unhealthy_containers]
        issues.append(f"UNHEALTHY containers detected: {', '.join(names)}")
        suggestions.append(f"Restart unhealthy containers: {', '.join(names)}. Check logs for root cause.")

    # Determine risk level from score
    if risk_score >= 0.90:
        risk_level = "critical"
    elif risk_score >= 0.70:
        risk_level = "high"
    elif risk_score >= 0.45:
        risk_level = "medium"
    else:
        risk_level = "low"
        issues.append("All systems nominal.")
        suggestions.append("Continue normal monitoring. No immediate action required.")

    message = " | ".join(issues) if issues else "System operating within normal parameters."

    return {
        "risk_level": risk_level,
        "risk_score": round(risk_score, 3),
        "message": message,
        "suggestions": suggestions,
        "method": "rule-based"
    }


# ── OpenAI-powered predictor ─────────────────────────────────────────────────

async def openai_prediction(metrics: Dict[str, Any]) -> Dict[str, Any]:
    """Sends metrics to OpenAI GPT and asks for a structured failure prediction."""
    try:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=OPENAI_API_KEY)

        prompt = f"""
You are an expert DevOps SRE AI. Analyse these real-time system metrics and predict failure risk.

System Metrics:
- CPU Usage: {metrics.get('cpu_percent', 0):.1f}%
- RAM Usage: {metrics.get('ram_percent', 0):.1f}% ({metrics.get('ram_used_gb', 0):.1f} GB / {metrics.get('ram_total_gb', 0):.1f} GB)
- Disk Usage: {metrics.get('disk_percent', 0):.1f}%
- Network In: {metrics.get('net_bytes_recv', 0):.0f} bytes/s
- Network Out: {metrics.get('net_bytes_sent', 0):.0f} bytes/s
- Containers: {json.dumps(metrics.get('containers', []))}

Respond ONLY with valid JSON in this exact format:
{{
  "risk_level": "low|medium|high|critical",
  "risk_score": 0.0-1.0,
  "message": "one-line summary of the situation",
  "suggestions": ["actionable suggestion 1", "actionable suggestion 2", "actionable suggestion 3"]
}}
"""
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            response_format={"type": "json_object"}
        )

        result = json.loads(response.choices[0].message.content)
        result["method"] = "openai"
        return result

    except Exception as e:
        logger.warning(f"OpenAI prediction failed: {e}. Falling back to rule-based.")
        fallback = rule_based_prediction(metrics)
        fallback["method"] = "rule-based (openai-fallback)"
        return fallback


# ── Ollama-powered predictor ─────────────────────────────────────────────────

async def ollama_prediction(metrics: Dict[str, Any]) -> Dict[str, Any]:
    """Sends metrics to a local Ollama instance (e.g., llama3) for prediction."""
    try:
        import httpx

        prompt = f"""
You are a DevOps AI. Analyse these system metrics and respond ONLY with valid JSON:
{{
  "risk_level": "low|medium|high|critical",
  "risk_score": 0.0-1.0,
  "message": "concise summary",
  "suggestions": ["suggestion1", "suggestion2"]
}}

Metrics:
CPU: {metrics.get('cpu_percent', 0):.1f}%
RAM: {metrics.get('ram_percent', 0):.1f}%
Disk: {metrics.get('disk_percent', 0):.1f}%
Containers: {json.dumps(metrics.get('containers', []))}
"""
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                f"{OLLAMA_BASE_URL}/api/generate",
                json={"model": "llama3", "prompt": prompt, "stream": False}
            )
            data = response.json()
            result = json.loads(data["response"])
            result["method"] = "ollama"
            return result

    except Exception as e:
        logger.warning(f"Ollama prediction failed: {e}. Falling back to rule-based.")
        fallback = rule_based_prediction(metrics)
        fallback["method"] = "rule-based (ollama-fallback)"
        return fallback


# ── Public entry point ────────────────────────────────────────────────────────

async def predict_failure(metrics: Dict[str, Any], engine: Optional[str] = None) -> Dict[str, Any]:
    """
    Main entry: picks the best available predictor or uses the requested one.
    """
    if engine == "openai":
        return await openai_prediction(metrics)
    elif engine == "ollama":
        return await ollama_prediction(metrics)
    elif engine == "rule-based":
        return rule_based_prediction(metrics)
    
    # Default priority logic
    if OPENAI_API_KEY and OPENAI_API_KEY != "your_openai_api_key_here":
        return await openai_prediction(metrics)
    elif USE_OLLAMA:
        return await ollama_prediction(metrics)
    else:
        return rule_based_prediction(metrics)
