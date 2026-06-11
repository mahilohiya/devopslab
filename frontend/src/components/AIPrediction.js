// AIPrediction.js – AI-powered failure prediction panel

import React, { useState, useEffect, useCallback } from 'react';
import { Brain, AlertTriangle, CheckCircle, Zap, RefreshCw, Lightbulb } from 'lucide-react';
import { fetchPrediction, fetchPredHistory } from '../api';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer
} from 'recharts';

// ── Risk config ───────────────────────────────────────────────
const RISK_CONFIG = {
    low: { color: '#10b981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.35)', icon: CheckCircle, label: 'LOW RISK' },
    medium: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.35)', icon: AlertTriangle, label: 'MEDIUM RISK' },
    high: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.35)', icon: AlertTriangle, label: 'HIGH RISK' },
    critical: { color: '#ff4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.7)', icon: Zap, label: 'CRITICAL RISK' },
};

// ── Score arc ─────────────────────────────────────────────────
const ScoreGauge = ({ score, color }) => {
    const pct = Math.round(score * 100);
    const r = 44;
    const circ = 2 * Math.PI * r;
    const arc = circ * 0.75;            // 270° arc
    const fill = arc * score;

    return (
        <div style={{ position: 'relative', width: 120, height: 120 }}>
            <svg width={120} height={120} viewBox="0 0 120 120">
                {/* Background arc */}
                <circle cx={60} cy={60} r={r} fill="none"
                    stroke="rgba(255,255,255,0.06)" strokeWidth={10}
                    strokeLinecap="round"
                    strokeDasharray={`${arc} ${circ}`}
                    style={{ transform: 'rotate(135deg)', transformOrigin: '60px 60px' }}
                />
                {/* Fill arc */}
                <circle cx={60} cy={60} r={r} fill="none"
                    stroke={color} strokeWidth={10}
                    strokeLinecap="round"
                    strokeDasharray={`${fill} ${circ}`}
                    style={{
                        transform: 'rotate(135deg)', transformOrigin: '60px 60px',
                        transition: 'stroke-dasharray 1s ease',
                        filter: `drop-shadow(0 0 8px ${color})`
                    }}
                />
            </svg>
            <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: 2
            }}>
                <span style={{ fontSize: 22, fontWeight: 800, color, fontFamily: 'JetBrains Mono, monospace' }}>
                    {pct}
                </span>
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>RISK</span>
            </div>
        </div>
    );
};

// ── History chart tooltip ─────────────────────────────────────
const HistTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
        <div style={{
            background: 'var(--bg-card-hover)', border: '1px solid var(--border-active)',
            borderRadius: 10, padding: '10px 14px'
        }}>
            <p style={{ color: RISK_CONFIG[d.risk_level]?.color || '#fff', fontSize: 12, fontWeight: 700 }}>
                {(d.risk_score * 100).toFixed(0)}% – {d.risk_level?.toUpperCase()}
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: 11 }}>{d.time}</p>
        </div>
    );
};

// ── Main component ────────────────────────────────────────────
const AIPrediction = () => {
    const [pred, setPred] = useState(null);
    const [history, setHist] = useState([]);
    const [loading, setLoad] = useState(true);
    const [running, setRun] = useState(false);

    const loadHistory = useCallback(async () => {
        try {
            const data = await fetchPredHistory();
            const formatted = data.slice(-20).map(r => ({
                ...r,
                time: new Date(r.timestamp).toLocaleTimeString(),
            }));
            setHist(formatted);
        } catch { }
    }, []);

    const runPrediction = useCallback(async () => {
        setRun(true);
        try {
            const result = await fetchPrediction();
            setPred(result);
            await loadHistory();
        } catch (err) {
            console.error('Prediction error:', err);
        } finally {
            setRun(false);
            setLoad(false);
        }
    }, [loadHistory]);

    // Auto-run on mount, then every 30 s
    useEffect(() => {
        runPrediction();
        loadHistory();
        const id = setInterval(runPrediction, 30000);
        return () => clearInterval(id);
    }, [runPrediction, loadHistory]);

    const cfg = pred ? (RISK_CONFIG[pred.risk_level] || RISK_CONFIG.low) : null;
    const Icon = cfg?.icon || Brain;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* ── Header ── */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                        width: 40, height: 40, borderRadius: 12,
                        background: 'var(--grad-purple)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 0 16px rgba(139,92,246,0.4)'
                    }}>
                        <Brain size={20} color="white" />
                    </div>
                    <div>
                        <div style={{ fontSize: 16, fontWeight: 700 }}>AI Failure Prediction</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                            Powered by rule-based heuristics / OpenAI / Ollama
                        </div>
                    </div>
                </div>
                <button
                    className="refresh-btn"
                    id="btn-run-prediction"
                    onClick={runPrediction}
                    disabled={running}
                    style={{ opacity: running ? 0.6 : 1 }}
                >
                    <RefreshCw size={12} style={{ animation: running ? 'spin 0.8s linear infinite' : 'none' }} />
                    {running ? 'Analysing…' : 'Re-analyse'}
                </button>
            </div>

            {/* ── Risk banner ── */}
            {loading ? (
                <div className="loading-spinner"><div className="spinner" />Running AI analysis…</div>
            ) : pred ? (
                <div className="ai-risk-banner" style={{
                    background: cfg.bg,
                    border: `1px solid ${cfg.border}`,
                    borderRadius: 14
                }}>
                    <ScoreGauge score={pred.risk_score} color={cfg.color} />
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            <Icon size={18} color={cfg.color} />
                            <span style={{ fontSize: 18, fontWeight: 800, color: cfg.color }}>
                                {cfg.label}
                            </span>
                        </div>
                        <p style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.5, marginBottom: 8 }}>
                            {pred.message}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
                            <div style={{
                                background: 'rgba(255,255,255,0.05)',
                                border: `1px solid ${cfg.border}`,
                                borderRadius: 8, padding: '4px 10px',
                                fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)',
                                display: 'flex', alignItems: 'center', gap: 6
                            }}>
                                <Zap size={12} color={cfg.color} />
                                Engine: <span style={{ color: 'white', textTransform: 'uppercase' }}>{pred.method || 'rule-based'}</span>
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                Analysed: {pred.timestamp ? new Date(pred.timestamp).toLocaleTimeString() : 'now'}
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}

            {/* ── Suggestions ── */}
            {pred?.suggestions?.length > 0 && (
                <div className="card">
                    <div className="card-header">
                        <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Lightbulb size={14} /> Recommendations
                        </span>
                    </div>
                    <div className="ai-suggestions">
                        {pred.suggestions.map((s, i) => (
                            <div key={i} className="suggestion-item">
                                <span className="suggestion-icon" style={{ color: cfg?.color }}>
                                    {i + 1}.
                                </span>
                                {s}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Risk history chart ── */}
            {history.length > 1 && (
                <div className="card">
                    <div className="card-header">
                        <span className="card-title">Risk Score History</span>
                        <span className="live-badge"><span className="live-dot" />30s refresh</span>
                    </div>
                    <ResponsiveContainer width="100%" height={180}>
                        <LineChart data={history} margin={{ top: 5, right: 10, bottom: 0, left: -20 }}>
                            <CartesianGrid stroke="rgba(255,255,255,0.04)" />
                            <XAxis dataKey="time" tick={{ fill: '#4a5568', fontSize: 10 }}
                                interval="preserveStartEnd" />
                            <YAxis domain={[0, 1]} tick={{ fill: '#4a5568', fontSize: 10 }}
                                tickFormatter={v => `${(v * 100).toFixed(0)}%`} />
                            <Tooltip content={<HistTooltip />} />
                            <Line
                                type="monotone" dataKey="risk_score"
                                stroke="#8b5cf6" strokeWidth={2} dot={{ fill: '#8b5cf6', r: 3 }}
                                activeDot={{ r: 6, fill: '#a78bf8' }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
};

export default AIPrediction;
