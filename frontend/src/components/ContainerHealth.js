// ContainerHealth.js – Docker container health panel

import React, { useState, useEffect, useCallback } from 'react';
import { Box, RefreshCw, Server, Play, Square, Trash2 } from 'lucide-react';
import { fetchContainers, startContainer, stopContainer, deleteContainer } from '../api';
import StatusBadge from './StatusBadge';

// ── Mini bar ──────────────────────────────────────────────────
const MiniBar = ({ value, color }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div className="mini-bar-bg">
            <div
                className="mini-bar-fill"
                style={{
                    width: `${Math.min(value, 100)}%`,
                    background: color
                }}
            />
        </div>
        <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'monospace', minWidth: 36 }}>
            {value?.toFixed(1)}%
        </span>
    </div>
);

// ── Stat chip ─────────────────────────────────────────────────
const StatChip = ({ label, count, color }) => (
    <div style={{
        background: `${color}18`,
        border: `1px solid ${color}40`,
        borderRadius: 8, padding: '6px 14px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2
    }}>
        <span style={{ fontSize: 20, fontWeight: 800, color, fontFamily: 'JetBrains Mono, monospace' }}>{count}</span>
        <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{label}</span>
    </div>
);

// ── Main component ────────────────────────────────────────────
const ContainerHealth = () => {
    const [containers, setContainers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lastSeen, setLastSeen] = useState('');
    const [actionLoading, setActionLoading] = useState(null); // name of container being acted upon

    const refresh = useCallback(async () => {
        try {
            const data = await fetchContainers();
            setContainers(data.containers || []);
            setLastSeen(new Date().toLocaleTimeString());
        } catch (err) {
            console.error('Container fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refresh();
        const id = setInterval(refresh, 8000);
        return () => clearInterval(id);
    }, [refresh]);

    const handleAction = async (name, actionFunc) => {
        setActionLoading(name);
        try {
            await actionFunc(name);
            await refresh();
        } catch (err) {
            alert(`Error: ${err.response?.data?.detail || err.message}`);
        } finally {
            setActionLoading(null);
        }
    };

    const running = containers.filter(c => c.status === 'running').length;
    const unhealthy = containers.filter(c => c.status !== 'running').length;
    const total = containers.length;

    if (loading) {
        return (
            <div className="loading-spinner">
                <div className="spinner" />
                Connecting to Docker…
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Summary chips */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <StatChip label="Total" count={total} color="#8892b0" />
                    <StatChip label="Running" count={running} color="#10b981" />
                    <StatChip label="Unhealthy" count={unhealthy} color="#ef4444" />
                </div>
            </div>

            {/* Container table */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="card-header" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                    <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Server size={14} /> Container Health
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Updated: {lastSeen}</span>
                        <button
                            className="refresh-btn"
                            onClick={refresh}
                            id="btn-refresh-containers"
                        >
                            <RefreshCw size={12} /> Refresh
                        </button>
                    </div>
                </div>

                <div className="table-wrap">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Container</th>
                                <th>Image</th>
                                <th>Status</th>
                                <th>CPU</th>
                                <th>Memory</th>
                                <th style={{ textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {containers.length === 0 ? (
                                <tr>
                                    <td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                                        No containers found.
                                    </td>
                                </tr>
                            ) : (
                                containers.map((c, i) => (
                                    <tr key={i} style={{ opacity: actionLoading === c.name ? 0.5 : 1 }}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <div style={{
                                                    width: 28, height: 28, borderRadius: 8,
                                                    background: c.status === 'running'
                                                        ? 'rgba(16,185,129,0.15)'
                                                        : 'rgba(239,68,68,0.15)',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                }}>
                                                    <Box size={14} color={c.status === 'running' ? '#10b981' : '#ef4444'} />
                                                </div>
                                                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>
                                                    {c.name}
                                                </span>
                                            </div>
                                        </td>
                                        <td>
                                            <span style={{
                                                background: 'rgba(255,255,255,0.05)',
                                                padding: '2px 8px', borderRadius: 6,
                                                fontFamily: 'JetBrains Mono, monospace', fontSize: 12
                                            }}>
                                                {c.image}
                                            </span>
                                        </td>
                                        <td><StatusBadge status={c.status} /></td>
                                        <td>
                                            <MiniBar
                                                value={c.cpu_percent}
                                                color={c.cpu_percent > 75 ? '#ef4444' : c.cpu_percent > 50 ? '#f59e0b' : '#3b82f6'}
                                            />
                                        </td>
                                        <td>
                                            <MiniBar
                                                value={c.mem_percent}
                                                color={c.mem_percent > 80 ? '#ef4444' : c.mem_percent > 60 ? '#f59e0b' : '#8b5cf6'}
                                            />
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                                {c.status === 'running' ? (
                                                    <button
                                                        className="refresh-btn"
                                                        style={{ padding: '4px 8px', borderColor: '#f59e0b', color: '#f59e0b' }}
                                                        onClick={() => handleAction(c.name, stopContainer)}
                                                        disabled={actionLoading === c.name}
                                                    >
                                                        <Square size={12} fill="#f59e0b" /> Stop
                                                    </button>
                                                ) : (
                                                    <button
                                                        className="refresh-btn"
                                                        style={{ padding: '4px 8px', borderColor: '#10b981', color: '#10b981' }}
                                                        onClick={() => handleAction(c.name, startContainer)}
                                                        disabled={actionLoading === c.name}
                                                    >
                                                        <Play size={12} fill="#10b981" /> Start
                                                    </button>
                                                )}
                                                <button
                                                    className="refresh-btn"
                                                    style={{ padding: '4px 8px', borderColor: '#ef4444', color: '#ef4444' }}
                                                    onClick={() => {
                                                        if (window.confirm(`Delete container ${c.name}?`))
                                                            handleAction(c.name, deleteContainer)
                                                    }}
                                                    disabled={actionLoading === c.name}
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ContainerHealth;
