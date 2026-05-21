"""
main.py  –  DevOps Monitoring Dashboard  –  FastAPI Backend
============================================================
Endpoints:
  GET  /api/metrics/system      – live CPU / RAM / Disk / Network
  GET  /api/metrics/containers  – Docker container health list
  POST /api/containers/{name}/start – Start a container
  POST /api/containers/{name}/stop  – Stop a container
  DELETE /api/containers/{name}     – Remove a container
  GET  /api/metrics/history     – last N system metric snapshots
  GET  /api/deployments         – recent deployments
  POST /api/deployments         – add deployment record
  GET  /api/predict             – AI failure prediction
  GET  /api/health              – API health check
"""

import json
import asyncio
import logging
from datetime import datetime, timedelta
from typing import List, Optional

import psutil
from fastapi import FastAPI, Depends, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import (
    init_db, get_db,
    SystemMetric, ContainerMetric, DeploymentRecord, Prediction
)
from ai_predictor import predict_failure

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ── App init ──────────────────────────────────────────────────────────────────
app = FastAPI(
    title="DevOps Monitoring Dashboard API",
    description="Real-time system + container monitoring with AI-powered failure prediction",
    version="1.0.0"
)

# Allow React dev server (port 3000) and any localhost origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Startup ───────────────────────────────────────────────────────────────────
@app.on_event("startup")
async def startup():
    init_db()
    logger.info("Database initialised.")
    # Seed a few demo deployments so the UI isn't empty
    _seed_deployments()
    # Start background metric-collector task
    asyncio.create_task(background_metric_collector())


def _seed_deployments():
    """Insert sample deployment records if table is empty."""
    db = next(get_db())
    if db.query(DeploymentRecord).count() == 0:
        seeds = [
            DeploymentRecord(service="api-gateway",  version="v2.4.1", status="success",
                             environment="prod",    deployed_by="github-actions",
                             timestamp=datetime.utcnow() - timedelta(hours=2)),
            DeploymentRecord(service="auth-service", version="v1.9.0", status="success",
                             environment="staging", deployed_by="jenkins",
                             timestamp=datetime.utcnow() - timedelta(hours=5)),
            DeploymentRecord(service="ml-pipeline",  version="v3.0.0", status="failed",
                             environment="prod",    deployed_by="gitlab-ci",
                             timestamp=datetime.utcnow() - timedelta(hours=8)),
            DeploymentRecord(service="frontend",     version="v5.1.2", status="success",
                             environment="prod",    deployed_by="github-actions",
                             timestamp=datetime.utcnow() - timedelta(days=1)),
            DeploymentRecord(service="postgres",     version="v14.2",  status="rolling",
                             environment="prod",    deployed_by="terraform",
                             timestamp=datetime.utcnow() - timedelta(minutes=30)),
        ]
        db.add_all(seeds)
        db.commit()
    db.close()


# ── Background metric collector ───────────────────────────────────────────────
async def background_metric_collector():
    """
    Polls system metrics every 10 seconds and saves them to SQLite.
    Keeps only the last 500 rows to avoid unbounded growth.
    """
    while True:
        try:
            await asyncio.sleep(10)
            metrics = _get_live_system_metrics()
            db = next(get_db())

            row = SystemMetric(
                cpu_percent   = metrics["cpu_percent"],
                ram_percent   = metrics["ram_percent"],
                ram_used_gb   = metrics["ram_used_gb"],
                ram_total_gb  = metrics["ram_total_gb"],
                disk_percent  = metrics["disk_percent"],
                net_bytes_sent= metrics["net_bytes_sent"],
                net_bytes_recv= metrics["net_bytes_recv"],
            )
            db.add(row)
            db.commit()

            # Prune old rows (keep last 500)
            count = db.query(SystemMetric).count()
            if count > 500:
                oldest = (db.query(SystemMetric)
                          .order_by(SystemMetric.id)
                          .limit(count - 500)
                          .all())
                for o in oldest:
                    db.delete(o)
                db.commit()
            db.close()
        except Exception as e:
            logger.error(f"Background collector error: {e}")


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_live_system_metrics() -> dict:
    """Collect live system stats via psutil."""
    cpu = psutil.cpu_percent(interval=0.5)
    ram = psutil.virtual_memory()
    disk = psutil.disk_usage("/")
    net_before = psutil.net_io_counters()

    return {
        "cpu_percent":    cpu,
        "ram_percent":    ram.percent,
        "ram_used_gb":    round(ram.used / 1e9, 2),
        "ram_total_gb":   round(ram.total / 1e9, 2),
        "disk_percent":   disk.percent,
        "disk_used_gb":   round(disk.used / 1e9, 2),
        "disk_total_gb":  round(disk.total / 1e9, 2),
        "net_bytes_sent": net_before.bytes_sent,
        "net_bytes_recv": net_before.bytes_recv,
    }


def _get_containers() -> list:
    """
    Try to connect to Docker and return container info.
    Returns simulated containers if Docker is not available.
    """
    try:
        import docker
        client = docker.from_env()
        containers = []
        for c in client.containers.list(all=True):
            stats = {}
            try:
                raw = c.stats(stream=False)
                cpu_delta  = raw["cpu_stats"]["cpu_usage"]["total_usage"] - \
                             raw["precpu_stats"]["cpu_usage"]["total_usage"]
                sys_delta  = raw["cpu_stats"]["system_cpu_usage"] - \
                             raw["precpu_stats"]["system_cpu_usage"]
                cpu_pct    = (cpu_delta / sys_delta) * 100.0 if sys_delta else 0
                mem_usage  = raw["memory_stats"].get("usage", 0)
                mem_limit  = raw["memory_stats"].get("limit", 1)
                mem_pct    = (mem_usage / mem_limit) * 100.0
                stats = {"cpu_percent": round(cpu_pct, 2), "mem_percent": round(mem_pct, 2)}
            except Exception:
                stats = {"cpu_percent": 0.0, "mem_percent": 0.0}

            containers.append({
                "name":        c.name,
                "status":      c.status,
                "image":       c.image.tags[0] if c.image.tags else "unknown",
                "cpu_percent": stats["cpu_percent"],
                "mem_percent": stats["mem_percent"],
            })
        return containers
    except Exception:
        # Docker not available – return simulated demo containers
        return [
            {"name": "nginx-proxy",       "status": "running", "image": "nginx:alpine",
             "cpu_percent": 1.2, "mem_percent": 5.3},
            {"name": "api-gateway",       "status": "running", "image": "myapp/api:v2.4.1",
             "cpu_percent": 12.4, "mem_percent": 38.7},
            {"name": "postgres-primary",  "status": "running", "image": "postgres:14",
             "cpu_percent": 3.8, "mem_percent": 22.1},
            {"name": "redis-cache",       "status": "running", "image": "redis:7-alpine",
             "cpu_percent": 0.5, "mem_percent": 4.2},
            {"name": "ml-pipeline",       "status": "exited",  "image": "myapp/ml:v3.0.0",
             "cpu_percent": 0.0, "mem_percent": 0.0},
            {"name": "webhook-consumer",  "status": "running", "image": "myapp/worker:v1.2",
             "cpu_percent": 6.1, "mem_percent": 14.9},
        ]


# ── Pydantic schemas ──────────────────────────────────────────────────────────

class DeploymentCreate(BaseModel):
    service:     str
    version:     str
    status:      str
    environment: str
    deployed_by: str


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/api/health")
def health_check():
    """Simple health-check endpoint."""
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}


@app.get("/api/metrics/system")
def get_system_metrics():
    """Return live CPU / RAM / Disk / Network metrics."""
    metrics = _get_live_system_metrics()
    metrics["timestamp"] = datetime.utcnow().isoformat()
    return metrics


@app.get("/api/metrics/containers")
def get_containers():
    """Return all Docker container health stats."""
    containers = _get_containers()
    return {"containers": containers, "timestamp": datetime.utcnow().isoformat()}


@app.get("/api/metrics/history")
def get_metrics_history(limit: int = 60, db: Session = Depends(get_db)):
    """Return the last `limit` system metric snapshots from SQLite."""
    rows = (db.query(SystemMetric)
            .order_by(SystemMetric.timestamp.desc())
            .limit(limit)
            .all())
    rows.reverse()  # oldest-first for chart rendering
    return [
        {
            "timestamp":     r.timestamp.isoformat(),
            "cpu_percent":   r.cpu_percent,
            "ram_percent":   r.ram_percent,
            "disk_percent":  r.disk_percent,
        }
        for r in rows
    ]


@app.get("/api/deployments")
def get_deployments(limit: int = 20, db: Session = Depends(get_db)):
    """Return recent deployment records."""
    rows = (db.query(DeploymentRecord)
            .order_by(DeploymentRecord.timestamp.desc())
            .limit(limit)
            .all())
    return [
        {
            "id":          r.id,
            "service":     r.service,
            "version":     r.version,
            "status":      r.status,
            "environment": r.environment,
            "deployed_by": r.deployed_by,
            "timestamp":   r.timestamp.isoformat(),
        }
        for r in rows
    ]


@app.post("/api/deployments", status_code=201)
def create_deployment(payload: DeploymentCreate, db: Session = Depends(get_db)):
    """Log a new deployment event."""
    record = DeploymentRecord(**payload.model_dump())
    db.add(record)
    db.commit()
    db.refresh(record)
    return {"id": record.id, "message": "Deployment recorded successfully."}


@app.get("/api/predict")
async def get_prediction(db: Session = Depends(get_db)):
    """
    Run AI failure prediction based on current live metrics + container health.
    Persists result to DB and returns prediction JSON.
    """
    metrics    = _get_live_system_metrics()
    containers = _get_containers()
    metrics["containers"] = containers

    result = await predict_failure(metrics)

    # Persist prediction
    pred_row = Prediction(
        risk_level  = result["risk_level"],
        risk_score  = result["risk_score"],
        message     = result["message"],
        suggestions = json.dumps(result.get("suggestions", [])),
    )
    db.add(pred_row)
    db.commit()

    result["timestamp"] = datetime.utcnow().isoformat()
    return result


@app.get("/api/predictions/history")
def get_predictions_history(limit: int = 20, db: Session = Depends(get_db)):
    """Return recent AI predictions from DB."""
    rows = (db.query(Prediction)
            .order_by(Prediction.timestamp.desc())
            .limit(limit)
            .all())
    return [
        {
            "id":          r.id,
            "timestamp":   r.timestamp.isoformat(),
            "risk_level":  r.risk_level,
            "risk_score":  r.risk_score,
            "message":     r.message,
            "suggestions": json.loads(r.suggestions) if r.suggestions else [],
        }
        for r in rows
    ]

# ── Container CRUD Routes ─────────────────────────────────────────────────────

@app.post("/api/containers/{name}/start")
def start_container(name: str):
    """Start a stopped container."""
    try:
        import docker
        client = docker.from_env()
        container = client.containers.get(name)
        container.start()
        return {"message": f"Container {name} started successfully."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/containers/{name}/stop")
def stop_container(name: str):
    """Stop a running container."""
    try:
        import docker
        client = docker.from_env()
        container = client.containers.get(name)
        container.stop()
        return {"message": f"Container {name} stopped successfully."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/containers/{name}")
def delete_container(name: str):
    """Remove a container."""
    try:
        import docker
        client = docker.from_env()
        container = client.containers.get(name)
        container.remove(force=True)
        return {"message": f"Container {name} removed successfully."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
