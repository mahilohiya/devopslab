// DeploymentStatus.js – Deployment history and log new deployments

import React, { useState, useEffect, useCallback } from 'react';
import { Rocket, Plus, X, CheckCircle, XCircle, Clock } from 'lucide-react';
import { fetchDeployments, addDeployment } from '../api';
import StatusBadge from './StatusBadge';

// ── Time-ago helper ───────────────────────────────────────────
const timeAgo = (iso) => {
    const diff = (Date.now() - new Date(iso)) / 1000;
    if (diff < 60) return `${Math.round(diff)}s ago`;
    if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
    return `${Math.round(diff / 86400)}d ago`;
};

// ── Deployment icon by status ─────────────────────────────────
const DeployIcon = ({ status }) => {
    const map = {
        success: { icon: CheckCircle, color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
        failed: { icon: XCircle, color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
        rolling: { icon: Clock, color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' },
    };
    const cfg = map[status] || map.rolling;
    const Icon = cfg.icon;
    return (
        <div className="deploy-icon" style={{ background: cfg.bg }}>
            <Icon size={16} color={cfg.color} />
        </div>
    );
};

// ── Form modal ────────────────────────────────────────────────
const AddDeployModal = ({ onClose, onAdded }) => {
    const [form, setForm] = useState({
        service: '', version: '', status: 'success',
        environment: 'prod', deployed_by: 'github-actions'
    });
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.service || !form.version) return;
        setSaving(true);
        try {
            await addDeployment(form);
            onAdded();
            onClose();
        } catch (err) {
            console.error('Add deployment error:', err);
        } finally {
            setSaving(false);
        }
    };

    const inputStyle = {
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: 8, padding: '8px 12px',
        color: 'var(--text-primary)', fontSize: 13,
        outline: 'none', width: '100%',
        transition: 'border-color 0.2s'
    };

    const labelStyle = {
        fontSize: 12, color: 'var(--text-secondary)',
        fontWeight: 600, marginBottom: 6, display: 'block'
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 999, backdropFilter: 'blur(4px)'
        }}>
            <div style={{
                background: 'var(--bg-card)', border: '1px solid var(--border-active)',
                borderRadius: 16, padding: 28, width: 420,
                boxShadow: 'var(--shadow-md), var(--shadow-glow)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700 }}>Log Deployment</h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div>
                        <label style={labelStyle}>Service Name</label>
                        <input style={inputStyle} placeholder="e.g. api-gateway"
                            value={form.service} onChange={e => setForm(f => ({ ...f, service: e.target.value }))} />
                    </div>
                    <div>
                        <label style={labelStyle}>Version</label>
                        <input style={inputStyle} placeholder="e.g. v2.5.0"
                            value={form.version} onChange={e => setForm(f => ({ ...f, version: e.target.value }))} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                            <label style={labelStyle}>Status</label>
                            <select style={inputStyle} value={form.status}
                                onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                                <option value="success">Success</option>
                                <option value="failed">Failed</option>
                                <option value="rolling">Rolling</option>
                            </select>
                        </div>
                        <div>
                            <label style={labelStyle}>Environment</label>
                            <select style={inputStyle} value={form.environment}
                                onChange={e => setForm(f => ({ ...f, environment: e.target.value }))}>
                                <option value="prod">Production</option>
                                <option value="staging">Staging</option>
                                <option value="dev">Dev</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label style={labelStyle}>Deployed By</label>
                        <input style={inputStyle} placeholder="e.g. github-actions"
                            value={form.deployed_by} onChange={e => setForm(f => ({ ...f, deployed_by: e.target.value }))} />
                    </div>
                    <button type="submit" disabled={saving} style={{
                        background: 'var(--grad-blue)', border: 'none', borderRadius: 10,
                        color: 'white', padding: '10px 20px', fontWeight: 700,
                        cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13,
                        opacity: saving ? 0.7 : 1, marginTop: 4
                    }}>
                        {saving ? 'Saving…' : 'Log Deployment'}
                    </button>
                </form>
            </div>
        </div>
    );
};

// ── Main component ────────────────────────────────────────────
const DeploymentStatus = () => {
    const [deployments, setDeployments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    const refresh = useCallback(async () => {
        try {
            const data = await fetchDeployments();
            setDeployments(data);
        } catch (err) {
            console.error('Deployment fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refresh();
        const id = setInterval(refresh, 15000);
        return () => clearInterval(id);
    }, [refresh]);

    // Count stats
    const success = deployments.filter(d => d.status === 'success').length;
    const failed = deployments.filter(d => d.status === 'failed').length;
    const rolling = deployments.filter(d => d.status === 'rolling').length;

    if (loading) {
        return (
            <div className="loading-spinner">
                <div className="spinner" />
                Loading deployments…
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {showModal && (
                <AddDeployModal onClose={() => setShowModal(false)} onAdded={refresh} />
            )}

            {/* Summary stat chips */}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'space-between', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: 12 }}>
                    {[
                        { label: 'Success', count: success, color: '#10b981' },
                        { label: 'Failed', count: failed, color: '#ef4444' },
                        { label: 'Rolling', count: rolling, color: '#3b82f6' },
                    ].map(s => (
                        <div key={s.label} style={{
                            background: `${s.color}15`, border: `1px solid ${s.color}40`,
                            borderRadius: 10, padding: '8px 16px',
                            display: 'flex', alignItems: 'center', gap: 8
                        }}>
                            <span style={{ fontSize: 24, fontWeight: 800, color: s.color, fontFamily: 'monospace' }}>
                                {s.count}
                            </span>
                            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{s.label}</span>
                        </div>
                    ))}
                </div>
                <button
                    className="refresh-btn"
                    id="btn-add-deployment"
                    onClick={() => setShowModal(true)}
                    style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', borderColor: 'rgba(16,185,129,0.3)' }}
                >
                    <Plus size={14} /> Log Deployment
                </button>
            </div>

            {/* Deployment list */}
            <div className="card">
                <div className="card-header">
                    <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Rocket size={14} /> Deployment History
                    </span>
                </div>

                {deployments.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                        No deployments recorded yet.
                    </div>
                ) : (
                    deployments.map((d, i) => (
                        <div key={d.id || i} className="deployment-item">
                            <DeployIcon status={d.status} />
                            <div className="deploy-info">
                                <div className="deploy-service">
                                    {d.service}
                                    <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-secondary)', marginLeft: 8 }}>
                                        {d.version}
                                    </span>
                                </div>
                                <div className="deploy-meta">
                                    by {d.deployed_by} · <StatusBadge status={d.environment} />
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                                <StatusBadge status={d.status} />
                                <span className="deploy-time">{timeAgo(d.timestamp)}</span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default DeploymentStatus;
