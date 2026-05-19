// App.js – Root component / dashboard shell

import React, { useState, useEffect } from 'react';
import './index.css';

// Pages
import MetricsOverview from './components/MetricsOverview';
import ContainerHealth from './components/ContainerHealth';
import DeploymentStatus from './components/DeploymentStatus';
import AIPrediction from './components/AIPrediction';

// Icons (inline SVG via lucide-react)
import {
  LayoutDashboard, Box, Rocket, Brain,
  Activity, RefreshCw, Cpu
} from 'lucide-react';

import { fetchHealth } from './api';

// ── Navigation config ─────────────────────────────────────────
const NAV = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'containers', label: 'Containers', icon: Box },
  { id: 'deployments', label: 'Deployments', icon: Rocket },
  { id: 'ai', label: 'AI Predict', icon: Brain },
];

// ── Page title map ────────────────────────────────────────────
const PAGE_TITLES = {
  overview: 'System Overview',
  containers: 'Container Health',
  deployments: 'Deployment Status',
  ai: 'AI Failure Prediction',
};

function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [backendOK, setBackendOK] = useState(null); // null=checking, true=ok, false=down
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Poll backend health
  useEffect(() => {
    const check = async () => {
      try {
        await fetchHealth();
        setBackendOK(true);
      } catch {
        setBackendOK(false);
      }
    };
    check();
    const id = setInterval(check, 10000);
    return () => clearInterval(id);
  }, []);

  // Update last-refresh every second
  useEffect(() => {
    const id = setInterval(() => setLastRefresh(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Render active page
  const renderPage = () => {
    switch (activeTab) {
      case 'overview': return <MetricsOverview />;
      case 'containers': return <ContainerHealth />;
      case 'deployments': return <DeploymentStatus />;
      case 'ai': return <AIPrediction />;
      default: return <MetricsOverview />;
    }
  };

  return (
    <div className="app-shell">

      {/* ── Sidebar ── */}
      <nav className="sidebar" role="navigation" aria-label="Dashboard navigation">
        {/* Logo */}
        <div className="sidebar-logo">
          <Cpu size={22} color="white" />
        </div>

        <div className="sidebar-nav">
          {NAV.map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                id={`nav-${item.id}`}
                className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
                onClick={() => setActiveTab(item.id)}
                title={item.label}
                aria-label={item.label}
              >
                <Icon size={20} className="nav-icon" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* ── Main content ── */}
      <div className="main-content">

        {/* Topbar */}
        <header className="topbar">
          <div>
            <h1 className="topbar-title">DevOps Monitor</h1>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              {PAGE_TITLES[activeTab]}
            </div>
          </div>

          <div className="topbar-right">
            {/* Backend status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: backendOK === true ? 'var(--accent-green)'
                  : backendOK === false ? 'var(--accent-red)'
                    : 'var(--accent-yellow)',
                boxShadow: `0 0 8px ${backendOK === true ? 'var(--accent-green)' : backendOK === false ? 'var(--accent-red)' : 'var(--accent-yellow)'}`,
                animation: 'pulse-green 2s infinite'
              }} />
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                {backendOK === true ? 'API Online' : backendOK === false ? 'API Offline' : 'Connecting…'}
              </span>
            </div>

            <span className="last-updated">
              {lastRefresh.toLocaleTimeString()}
            </span>

            <button
              className="refresh-btn"
              id="btn-refresh-page"
              onClick={() => window.location.reload()}
              title="Reload page"
            >
              <RefreshCw size={12} />
              Refresh
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="page" role="main">
          {backendOK === false ? (
            <div style={{
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.4)',
              borderRadius: 12, padding: '16px 20px',
              display: 'flex', alignItems: 'center', gap: 12,
              color: '#ef4444', fontSize: 14, fontWeight: 500
            }}>
              <Activity size={18} />
              Backend API is offline. Start the FastAPI server:&nbsp;
              <code style={{ fontFamily: 'monospace', fontSize: 12, opacity: 0.8 }}>
                cd backend && uvicorn main:app --reload
              </code>
            </div>
          ) : null}

          {renderPage()}
        </main>

        {/* Footer */}
        <footer style={{
          borderTop: '1px solid var(--border)',
          padding: '10px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'var(--bg-secondary)'
        }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            DevOps Monitoring Dashboard · React + FastAPI + SQLite
          </span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            AI: OpenAI / Ollama / Rule-based
          </span>
        </footer>
      </div>
    </div>
  );
}

export default App;
