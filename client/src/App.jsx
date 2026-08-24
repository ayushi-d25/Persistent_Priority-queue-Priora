import React, { useState, useEffect, useCallback, useRef } from 'react';
import LandingPage from './components/LandingPage';
import QueueForm from './components/QueueForm';
import QueueStats from './components/QueueStats';
import QueueControls from './components/QueueControls';
import QueueList from './components/QueueList';
import HeapVisualization from './components/HeapVisualization';
import icon3 from './assets/Icon3.png';
import profilePic from './assets/Profile.png';

const API_BASE = '/api/queue';

export default function App() {
  // Authentication state
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('priora_user');
    const savedToken = localStorage.getItem('priora_token');
    return savedUser && savedToken ? { username: savedUser, token: savedToken } : null;
  });

  const [items, setItems] = useState([]);
  const [heapArray, setHeapArray] = useState([]);
  const [isEmpty, setIsEmpty] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isUserMenuOpen) return;
    function handleClickOutside(e) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setIsUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isUserMenuOpen]);

  // Theme Management (Light / Dark mode persisted in localStorage)
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('priora_theme') || 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('priora_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleLoginSuccess = (userData) => {
    localStorage.setItem('priora_user', userData.username);
    localStorage.setItem('priora_token', userData.token);
    setUser(userData);
    showToast(`Welcome back, ${userData.username}!`);
  };

  const handleLogout = () => {
    localStorage.removeItem('priora_user');
    localStorage.removeItem('priora_token');

    // Reset theme to light mode on logout
    localStorage.removeItem('priora_theme');
    setTheme('light');
    document.documentElement.setAttribute('data-theme', 'light');

    setUser(null);
    setItems([]);
    setHeapArray([]);
  };
  /** Returns auth + content-type headers for every queue API request. */
  const authHeaders = (includeContentType = false) => {
    const headers = { Authorization: `Bearer ${user?.token || localStorage.getItem('priora_token')}` };
    if (includeContentType) headers['Content-Type'] = 'application/json';
    return headers;
  };

  const fetchQueue = useCallback(async () => {
    if (!user) return;
    try {
      const token = user.token || localStorage.getItem('priora_token');
      const res = await fetch(API_BASE, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        setItems(json.data.items);
        setHeapArray(json.data.heapArray);
        setIsEmpty(json.data.isEmpty);
        setError(null);
      } else {
        setError(json.error);
      }
    } catch (err) {
      setError('Unable to connect to Priora backend server.');
    }
  }, [user]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const handleInsert = async (value, priority) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(API_BASE, {
        method: 'POST',
        headers: authHeaders(true),
        body: JSON.stringify({ value, priority }),
      });
      const json = await res.json();
      if (json.success) {
        showToast(`Inserted item "${json.data.value}" with priority ${json.data.priority}`);
        await fetchQueue();
      } else {
        setError(json.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExtractMin = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/extract-min`, { method: 'POST', headers: authHeaders() });
      const json = await res.json();
      if (json.success) {
        showToast(`Extracted MIN item: "${json.data.value}" (Priority ${json.data.priority})`);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        await fetchQueue();
      } else {
        setError(json.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExtractMax = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/extract-max`, { method: 'POST', headers: authHeaders() });
      const json = await res.json();
      if (json.success) {
        showToast(`Extracted MAX item: "${json.data.value}" (Priority ${json.data.priority})`);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        await fetchQueue();
      } else {
        setError(json.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePeek = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/peek`, { headers: authHeaders() });
      const json = await res.json();
      if (json.success) {
        if (json.data) {
          showToast(`PEEK Root Item: "${json.data.value}" (Priority ${json.data.priority})`, 'success');
        } else {
          showToast('Queue is currently empty.', 'error');
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setError(json.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (id, newPriority) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/${id}`, {
        method: 'PUT',
        headers: authHeaders(true),
        body: JSON.stringify({ priority: newPriority }),
      });
      const json = await res.json();
      if (json.success) {
        showToast(`Updated priority of "${json.data.value}" to ${json.data.priority}`);
        await fetchQueue();
      } else {
        setError(json.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/${id}`, { method: 'DELETE', headers: authHeaders() });
      const json = await res.json();
      if (json.success) {
        showToast(`Deleted item "${json.data.value}"`);
        await fetchQueue();
      } else {
        setError(json.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Render Landing Page if unauthenticated
  if (!user) {
    return <LandingPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="container">
      {/* Header Banner */}
      <header className="hero-banner">
        <div className="brand">
          <div className="brand-icon-chip">
            <img
              src={icon3}
              alt="Priora Logo"
              style={{
                width: '150px',
                height: '150px',
                objectFit: 'contain',
                display: 'block',
              }}
            />
          </div>
          <div>
            <div className="brand-subtitle">Persistent Priority Queue</div>
            <h1 className="brand-title">Priora Dashboard</h1>
          </div>
        </div>

        <div className="header-actions">
          {/* Active Items Badge */}
          <div className="status-badge">
            <div className={`status-indicator ${isEmpty ? 'empty' : 'active'}`}></div>
            {isEmpty ? 'Queue Empty' : `${items.length} Items Active`}
          </div>

          {/* Light / Dark Mode Toggle */}
          <button
            className="theme-toggle-btn status-badge"
            onClick={toggleTheme}
            title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
            aria-label="Toggle Theme"
            style={{
              background: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {theme === 'light' ? (
              <svg
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                style={{ width: '28px', height: '28px', minWidth: '28px', minHeight: '28px', display: 'block' }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            ) : (
              <svg
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                style={{ width: '28px', height: '28px', minWidth: '28px', minHeight: '28px', display: 'block' }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            )}
          </button>

          {/* User Chip Dropdown — far right */}
          <div ref={userMenuRef} style={{ position: 'relative' }}>
            <button
              className="status-badge user-chip-btn"
              style={{
                background: 'var(--bg-surface)',
                color: 'var(--text-primary)',
                border: '1.5px solid var(--border-soft)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontFamily: 'inherit',
                fontWeight: 700,
                fontSize: 'inherit',
                height: '42px',               /* Locks height to match the badge */
                boxSizing: 'border-box',       /* Includes borders & padding in the 42px */
                padding: '0 0.85rem',          /* Consistent horizontal spacing */
              }}
              onClick={() => setIsUserMenuOpen((prev) => !prev)}
              aria-haspopup="true"
              aria-expanded={isUserMenuOpen}
              title="Account options"
            >
              <img
                src={profilePic}
                alt="Profile"
                style={{
                  width: '35px',
                  height: '35px',
                  minWidth: '35px',
                  minHeight: '35px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  display: 'block',
                }}
              />
              <span>{user.username}</span>
              <svg
                width="13"
                height="13"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                style={{ opacity: 0.75, transition: 'transform 0.2s', transform: isUserMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Dropdown Menu */}
            {isUserMenuOpen && (
              <div
                role="menu"
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  zIndex: 1000,
                  minWidth: '160px',
                  background: 'var(--bg-surface)',
                  border: '1.5px solid var(--border-soft)',
                  borderRadius: '14px',
                  boxShadow: 'var(--clay-shadow)',
                  overflow: 'hidden',
                  padding: '0.4rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.2rem',
                }}
              >
                <button
                  role="menuitem"
                  onClick={() => setIsUserMenuOpen(false)}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.85rem',
                    background: 'none',
                    border: 'none',
                    borderRadius: '10px',
                    color: 'var(--text-secondary)',
                    fontFamily: 'inherit',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-elevated)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                >
                  Cancel
                </button>
                <button
                  role="menuitem"
                  onClick={() => { setIsUserMenuOpen(false); handleLogout(); }}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.85rem',
                    background: 'none',
                    border: 'none',
                    borderRadius: '10px',
                    color: 'var(--accent-peach)',
                    fontFamily: 'inherit',
                    fontWeight: 700,
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-elevated)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Notifications */}
      <div className="toast-container">
        {toast && (
          <div className={`alert-toast ${toast.type === 'error' ? 'alert-error' : 'alert-success'}`}>
            <span>{toast.message}</span>
            <button
              className="toast-close-btn"
              onClick={() => setToast(null)}
              aria-label="Close notification"
            >
              ✕
            </button>
          </div>
        )}

        {error && (
          <div className="alert-toast alert-error">
            <span>Error: {error}</span>
            <button
              className="toast-close-btn"
              onClick={() => setError(null)}
              aria-label="Close error"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Main Grid */}
      <div className="dashboard-grid">
        {/* Left Column */}
        <div className="left-column">
          <QueueForm onInsert={handleInsert} loading={loading} />
          <QueueControls
            onExtractMin={handleExtractMin}
            onExtractMax={handleExtractMax}
            onPeek={handlePeek}
            loading={loading}
            isEmpty={isEmpty}
          />
          <QueueStats items={items} isEmpty={isEmpty} />
        </div>

        {/* Right Column */}
        <div className="right-column">
          <HeapVisualization heapArray={heapArray} />
          <QueueList
            items={items}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
            loading={loading}
          />
        </div>
      </div>
    </div>
  );
}
