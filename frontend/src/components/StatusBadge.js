// StatusBadge.js – Coloured status badge component

import React from 'react';

const STATUS_MAP = {
    running: { cls: 'badge-running', label: 'Running' },
    exited: { cls: 'badge-exited', label: 'Exited' },
    paused: { cls: 'badge-paused', label: 'Paused' },
    success: { cls: 'badge-success', label: 'Success' },
    failed: { cls: 'badge-failed', label: 'Failed' },
    rolling: { cls: 'badge-rolling', label: 'Rolling' },
    low: { cls: 'badge-low', label: 'Low' },
    medium: { cls: 'badge-medium', label: 'Medium' },
    high: { cls: 'badge-high', label: 'High' },
    critical: { cls: 'badge-critical', label: 'Critical' },
    prod: { cls: 'badge-prod', label: 'Production' },
    staging: { cls: 'badge-staging', label: 'Staging' },
    dev: { cls: 'badge-dev', label: 'Dev' },
};

const StatusBadge = ({ status, className = '' }) => {
    const key = status?.toLowerCase();
    const cfg = STATUS_MAP[key] || { cls: 'badge-running', label: status };
    return (
        <span className={`badge ${cfg.cls} ${className}`}>
            <span className="badge-dot" style={{ background: 'currentColor' }} />
            {cfg.label}
        </span>
    );
};

export default StatusBadge;
