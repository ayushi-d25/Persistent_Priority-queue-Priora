import React, { useState } from 'react';
import icon3 from '../assets/Icon3.png';
import loginChar from '../assets/login_char.png';

export default function LandingPage({ onLoginSuccess }) {
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const switchMode = (newMode) => {
    setMode(newMode);
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) return;

    setLoading(true);
    setError(null);

    const endpoint = mode === 'signup' ? '/api/auth/signup' : '/api/auth/login';

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password,
        }),
      });

      const json = await res.json();

      if (json.success) {
        onLoginSuccess(json.data);
      } else {
        setError(json.error || 'Authentication failed.');
      }
    } catch (err) {
      setError('Unable to connect to authentication server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="landing-page-root">
      {/*
       * Outer flex row: character (left) + card (right).
       * The character is hidden on narrow screens via CSS.
       */}
      <div className="landing-scene">

        {/* ── Female character graphic ─────────────────────────────────── */}
        <div className="landing-char-wrapper" aria-hidden="true">
          <img
            src={loginChar}
            alt=""
            className="landing-char-img"
            draggable="false"
            style={{ pointerEvents: 'none', userSelect: 'none' }}
          />
        </div>

        {/* ── Login / Signup card ──────────────────────────────────────── */}
        <div
          className="card landing-card"
        >
          {/* Brand Header */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div
              className="brand-icon-chip"
              style={{
                margin: '0 auto 1rem auto',
                width: '80px',
                height: '80px',
              }}
            >
              <img
                src={icon3}
                alt="Priora Icon"
                style={{ width: '200px', height: '200px', objectFit: 'contain' }}
              />
            </div>
            <div className="brand-subtitle">Persistent Priority Queue</div>
            <h1 className="brand-title" style={{ fontSize: '2.2rem', marginTop: '0.2rem' }}>
              Priora
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
              Sign in to access your persistent task dashboard
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div
            style={{
              display: 'flex',
              background: 'var(--bg-elevated)',
              padding: '0.35rem',
              borderRadius: 'var(--radius-pill)',
              marginBottom: '1.75rem',
              boxShadow: 'var(--clay-input-shadow)',
            }}
          >
            <button
              type="button"
              className={`btn btn-sm ${mode === 'login' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ flex: 1, border: 'none' }}
              onClick={() => switchMode('login')}
            >
              Sign In
            </button>
            <button
              type="button"
              className={`btn btn-sm ${mode === 'signup' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ flex: 1, border: 'none' }}
              onClick={() => switchMode('signup')}
            >
              Create Account
            </button>
          </div>

          {/* Inline Error Toast */}
          {error && (
            <div className="alert-toast alert-error" style={{ marginBottom: '1.25rem' }}>
              <span>{error}</span>
            </div>
          )}

          {/* Auth Form */}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="auth-username">
                Username
              </label>
              <input
                id="auth-username"
                type="text"
                className="input-field"
                placeholder="e.g. alex_developer"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
                autoComplete="username"
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1.75rem' }}>
              <label className="form-label" htmlFor="auth-password">
                Password
              </label>
              <input
                id="auth-password"
                type="password"
                className="input-field"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.9rem' }}
              disabled={loading || !username.trim() || !password}
            >
              {loading
                ? 'Processing...'
                : mode === 'signup'
                  ? 'Create Account & Continue'
                  : 'Sign In to Priora'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
