// ProgressRing.js – SVG circular progress gauge

import React from 'react';

/**
 * Animated SVG ring gauge.
 * Props: value (0-100), size, strokeWidth, color, label
 */
const ProgressRing = ({ value = 0, size = 100, strokeWidth = 8, color = '#3b82f6', label }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (value / 100) * circumference;

    // Colour based on value if not overridden
    const getAutoColor = (v) => {
        if (v >= 90) return '#ef4444';
        if (v >= 75) return '#f97316';
        if (v >= 60) return '#f59e0b';
        return color;
    };

    const ringColor = getAutoColor(value);

    return (
        <div className="progress-ring-wrap" style={{ width: size, height: size }}>
            <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
                {/* Background circle */}
                <circle
                    cx={size / 2} cy={size / 2} r={radius}
                    fill="none"
                    stroke="rgba(255,255,255,0.06)"
                    strokeWidth={strokeWidth}
                />
                {/* Progress arc */}
                <circle
                    cx={size / 2} cy={size / 2} r={radius}
                    fill="none"
                    stroke={ringColor}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    style={{ transition: 'stroke-dashoffset 0.8s ease, stroke 0.5s ease' }}
                    filter={`drop-shadow(0 0 6px ${ringColor})`}
                />
            </svg>
            <div className="progress-ring-text" style={{ color: ringColor }}>
                {Math.round(value)}%
            </div>
            {label && (
                <div style={{
                    position: 'absolute', bottom: -20,
                    fontSize: 11, color: 'var(--text-secondary)',
                    width: '100%', textAlign: 'center'
                }}>
                    {label}
                </div>
            )}
        </div>
    );
};

export default ProgressRing;
