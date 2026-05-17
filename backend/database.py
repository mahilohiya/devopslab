"""
database.py
-----------
Sets up SQLite database using SQLAlchemy ORM.
Tables:
  - SystemMetrics: stores historical CPU/RAM snapshots
  - ContainerMetric: stores container health snapshots
  - Prediction: stores AI failure predictions
"""

from sqlalchemy import create_engine, Column, Integer, Float, String, DateTime, Text
from sqlalchemy.orm import declarative_base, sessionmaker
from datetime import datetime

# SQLite file-based DB stored locally
DATABASE_URL = "sqlite:///./devops_monitor.db"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}  # Required for SQLite with FastAPI
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# ── Models ────────────────────────────────────────────────────────────────────

class SystemMetric(Base):
    """Stores periodic CPU / RAM snapshots."""
    __tablename__ = "system_metrics"

    id         = Column(Integer, primary_key=True, index=True)
    timestamp  = Column(DateTime, default=datetime.utcnow)
    cpu_percent = Column(Float)          # 0–100
    ram_percent = Column(Float)          # 0–100
    ram_used_gb = Column(Float)          # GB used
    ram_total_gb = Column(Float)         # GB total
    disk_percent = Column(Float)         # 0–100
    net_bytes_sent = Column(Float)       # bytes/s
    net_bytes_recv = Column(Float)       # bytes/s


class ContainerMetric(Base):
    """Stores container health snapshots."""
    __tablename__ = "container_metrics"

    id          = Column(Integer, primary_key=True, index=True)
    timestamp   = Column(DateTime, default=datetime.utcnow)
    name        = Column(String)
    status      = Column(String)         # running / exited / paused …
    cpu_percent = Column(Float, default=0.0)
    mem_percent = Column(Float, default=0.0)
    image       = Column(String)


class Prediction(Base):
    """Stores AI-generated failure predictions."""
    __tablename__ = "predictions"

    id          = Column(Integer, primary_key=True, index=True)
    timestamp   = Column(DateTime, default=datetime.utcnow)
    risk_level  = Column(String)         # low / medium / high / critical
    risk_score  = Column(Float)          # 0.0 – 1.0
    message     = Column(Text)
    suggestions = Column(Text)           # JSON array as string


class DeploymentRecord(Base):
    """Deployment log entries."""
    __tablename__ = "deployments"

    id          = Column(Integer, primary_key=True, index=True)
    timestamp   = Column(DateTime, default=datetime.utcnow)
    service     = Column(String)
    version     = Column(String)
    status      = Column(String)         # success / failed / rolling
    environment = Column(String)         # prod / staging / dev
    deployed_by = Column(String)


# ── Init ──────────────────────────────────────────────────────────────────────

def init_db():
    """Create all tables if they don't exist."""
    Base.metadata.create_all(bind=engine)


def get_db():
    """Dependency: yields a DB session and closes it after use."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
