import React, { useState } from 'react';
import { Lock, User, Cpu } from 'lucide-react';
import { login } from '../api';

const Login = ({ onLogin }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const data = await login(username, password);
            onLogin(data);
        } catch (err) {
            setError('Invalid username or password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--bg-primary)', color: 'var(--text-primary)'
        }}>
            <div className="card" style={{ width: 380, padding: 40, borderRadius: 20 }}>
                <div style={{ textAlign: 'center', marginBottom: 30 }}>
                    <div style={{
                        width: 60, height: 60, borderRadius: 16, background: 'var(--grad-blue)',
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        marginBottom: 16, boxShadow: 'var(--shadow-glow)'
                    }}>
                        <Cpu size={32} color="white" />
                    </div>
                    <h2 style={{ fontSize: 24, fontWeight: 800 }}>DevOps Monitor</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Sign in to your dashboard</p>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div style={{ position: 'relative' }}>
                        <User size={18} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
                        <input
                            type="text"
                            placeholder="Username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            style={{
                                width: '100%', padding: '12px 12px 12px 40px', borderRadius: 10,
                                background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                                color: 'white', outline: 'none'
                            }}
                            required
                        />
                    </div>
                    <div style={{ position: 'relative' }}>
                        <Lock size={18} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            style={{
                                width: '100%', padding: '12px 12px 12px 40px', borderRadius: 10,
                                background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                                color: 'white', outline: 'none'
                            }}
                            required
                        />
                    </div>

                    {error && <div style={{ color: '#ef4444', fontSize: 13, textAlign: 'center' }}>{error}</div>}

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            background: 'var(--grad-blue)', color: 'white', padding: '12px',
                            borderRadius: 10, border: 'none', fontWeight: 700, cursor: 'pointer',
                            marginTop: 10, opacity: loading ? 0.7 : 1
                        }}
                    >
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>

                <div style={{ marginTop: 24, textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
                    Demo Credentials: <span style={{ color: 'var(--accent-blue)' }}>admin / admin</span>
                </div>
            </div>
        </div>
    );
};

export default Login;
