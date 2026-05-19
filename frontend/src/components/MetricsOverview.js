// MetricsOverview.js – Top-level KPI cards + live charts

import React, { useState, useEffect, useCallback } from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
    Cpu, MemoryStick, HardDrive, Wifi,
    TrendingUp
} from 'lucide-react';
import { fetchSystemMetrics, fetchMetricsHistory } from '../api';
import ProgressRing from './ProgressRing';

// ── Custom chart tooltip ──────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={{
            background: 'var(--bg-card-hover)',
            border: '1px solid var(--border-active)',
            borderRadius: 10, padding: '10px 14px',
            backdropFilter: 'blur(8px)'
        }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: 11, marginBottom: 6 }}>{label}</p>
            {payload.map(p => (
                <p key={p.name} style={{ color: p.color, fontSize: 12, fontWeight: 600 }}>
                    {p.name}: {p.value?.toFixed(1)}%
                </p>
            ))}
        </div>
    );
};

// ── Stat card component ───────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, sub, gradient, iconBg, valueColor }) => (
    <div className="stat-card">
        <div className="stat-icon-wrap" style={{ background: iconBg }}>
            <Icon size={20} color="white" />
        </div>
        <div>
            <div className="stat-label">{label}</div>
            <div className="stat-value" style={{ color: valueColor, marginTop: 4 }}>{value}</div>
            {sub && <div className="stat-sub" style={{ marginTop: 4 }}>{sub}</div>}
        </div>
    </div>
);

// ── Main component ───────────────────────────────────────────
const MetricsOverview = () => {
    const [live, setLive] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    const refresh = useCallback(async () => {
        try {
            const [liveData, histData] = await Promise.all([
                fetchSystemMetrics(),
                fetchMetricsHistory(60)
            ]);
            setLive(liveData);

            // Format history for chart (keep last 40 pts, format time label)
            const formatted = histData.slice(-40).map(r => ({
                ...r,
                time: new Date(r.timestamp).toLocaleTimeString('en', {
                    hour: '2-digit', minute: '2-digit', second: '2-digit'
                }),
            }));
            setHistory(formatted);
        } catch (err) {
            console.error('Metrics fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    // Poll every 5 s
    useEffect(() => {
        refresh();
        const id = setInterval(refresh, 5000);
        return () => clearInterval(id);
    }, [refresh]);

    if (loading) {
        return (
            <div className="loading-spinner">
                <div className="spinner" />
                Loading system metrics…
            </div>
        );
    }

    const cpu = live?.cpu_percent ?? 0;
    const ram = live?.ram_percent ?? 0;
    const disk = live?.disk_percent ?? 0;

    // Network display
    const fmtBytes = (b) => b > 1e6 ? `${(b / 1e6).toFixed(1)} MB/s`
        : b > 1e3 ? `${(b / 1e3).toFixed(1)} KB/s`
            : `${b?.toFixed(0) ?? 0} B/s`;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* ── KPI cards ─── */}
            <div className="stat-grid">
                <StatCard
                    icon={Cpu} label="CPU Usage" value={`${cpu.toFixed(1)}%`}
                    sub={`${live?.cpu_percent?.toFixed(1)}% across all cores`}
                    iconBg="rgba(59,130,246,0.2)" valueColor="#3b82f6"
                />
                <StatCard
                    icon={MemoryStick} label="RAM Usage" value={`${ram.toFixed(1)}%`}
                    sub={`${live?.ram_used_gb} GB / ${live?.ram_total_gb} GB`}
                    iconBg="rgba(139,92,246,0.2)" valueColor="#8b5cf6"
                />
                <StatCard
                    icon={HardDrive} label="Disk Usage" value={`${disk.toFixed(1)}%`}
                    sub={`${live?.disk_used_gb} GB / ${live?.disk_total_gb} GB`}
                    iconBg="rgba(6,182,212,0.2)" valueColor="#06b6d4"
                />
                <StatCard
                    icon={Wifi} label="Network In" value={fmtBytes(live?.net_bytes_recv)}
                    sub={`Out: ${fmtBytes(live?.net_bytes_sent)}`}
                    iconBg="rgba(16,185,129,0.2)" valueColor="#10b981"
                />
            </div>

            {/* ── Gauge rings ─── */}
            <div className="card">
                <div className="card-header">
                    <span className="card-title">Live Gauges</span>
                    <span className="live-badge"><span className="live-dot" />Live</span>
                </div>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-around',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 32,
                    paddingBottom: 24
                }}>
                    <div style={{ textAlign: 'center' }}>
                        <ProgressRing value={cpu} size={110} strokeWidth={10} color="#3b82f6" />
                        <div style={{ marginTop: 24, fontSize: 12, color: 'var(--text-secondary)' }}>CPU</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <ProgressRing value={ram} size={110} strokeWidth={10} color="#8b5cf6" />
                        <div style={{ marginTop: 24, fontSize: 12, color: 'var(--text-secondary)' }}>Memory</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <ProgressRing value={disk} size={110} strokeWidth={10} color="#06b6d4" />
                        <div style={{ marginTop: 24, fontSize: 12, color: 'var(--text-secondary)' }}>Disk</div>
                    </div>
                </div>
            </div>

            {/* ── Charts ─── */}
            <div className="charts-grid">
                {/* CPU chart */}
                <div className="chart-card">
                    <div className="card-header">
                        <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <TrendingUp size={14} /> CPU History
                        </span>
                        <span className="live-badge"><span className="live-dot" />Auto-refresh</span>
                    </div>
                    <ResponsiveContainer width="100%" height={180}>
                        <AreaChart data={history} margin={{ top: 5, right: 10, bottom: 0, left: -20 }}>
                            <defs>
                                <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid stroke="rgba(255,255,255,0.04)" />
                            <XAxis dataKey="time" tick={{ fill: '#4a5568', fontSize: 10 }} interval="preserveStartEnd" />
                            <YAxis domain={[0, 100]} tick={{ fill: '#4a5568', fontSize: 10 }} />
                            <Tooltip content={<CustomTooltip />} />
                            <Area type="monotone" dataKey="cpu_percent" name="CPU %"
                                stroke="#3b82f6" fill="url(#cpuGrad)" strokeWidth={2} dot={false} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* RAM chart */}
                <div className="chart-card">
                    <div className="card-header">
                        <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <TrendingUp size={14} /> RAM History
                        </span>
                    </div>
                    <ResponsiveContainer width="100%" height={180}>
                        <AreaChart data={history} margin={{ top: 5, right: 10, bottom: 0, left: -20 }}>
                            <defs>
                                <linearGradient id="ramGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid stroke="rgba(255,255,255,0.04)" />
                            <XAxis dataKey="time" tick={{ fill: '#4a5568', fontSize: 10 }} interval="preserveStartEnd" />
                            <YAxis domain={[0, 100]} tick={{ fill: '#4a5568', fontSize: 10 }} />
                            <Tooltip content={<CustomTooltip />} />
                            <Area type="monotone" dataKey="ram_percent" name="RAM %"
                                stroke="#8b5cf6" fill="url(#ramGrad)" strokeWidth={2} dot={false} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* Combined overlay chart */}
                <div className="chart-card" style={{ gridColumn: '1 / -1' }}>
                    <div className="card-header">
                        <span className="card-title">CPU + RAM + Disk Overlay</span>
                    </div>
                    <ResponsiveContainer width="100%" height={200}>
                        <AreaChart data={history} margin={{ top: 5, right: 10, bottom: 0, left: -20 }}>
                            <defs>
                                <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.25} />
                                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="g3" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.25} />
                                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid stroke="rgba(255,255,255,0.04)" />
                            <XAxis dataKey="time" tick={{ fill: '#4a5568', fontSize: 10 }} interval="preserveStartEnd" />
                            <YAxis domain={[0, 100]} tick={{ fill: '#4a5568', fontSize: 10 }} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend wrapperStyle={{ fontSize: 12, color: '#8892b0' }} />
                            <Area type="monotone" dataKey="cpu_percent" name="CPU %" stroke="#3b82f6" fill="url(#g1)" strokeWidth={1.5} dot={false} />
                            <Area type="monotone" dataKey="ram_percent" name="RAM %" stroke="#8b5cf6" fill="url(#g2)" strokeWidth={1.5} dot={false} />
                            <Area type="monotone" dataKey="disk_percent" name="Disk %" stroke="#06b6d4" fill="url(#g3)" strokeWidth={1.5} dot={false} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default MetricsOverview;
