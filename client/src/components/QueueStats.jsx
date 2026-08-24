import React from 'react';

export default function QueueStats({ items, isEmpty }) {
  const total = items.length;
  const minPriority = total > 0 ? Math.min(...items.map((i) => i.priority)) : 'N/A';
  const maxPriority = total > 0 ? Math.max(...items.map((i) => i.priority)) : 'N/A';

  return (
    <div className="card">
      <h2 className="card-title">
        <div className="card-title-icon-chip" style={{ background: 'rgba(243, 212, 138, 0.4)' }}>
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
          </svg>
        </div>
        Queue Statistics
      </h2>
      <div className="stats-grid">
        <div className="stat-box">
          <div className="stat-icon-chip" style={{ background: 'var(--accent-blue)', color: 'var(--text-primary)' }}>
            #
          </div>
          <div className="stat-value">{total}</div>
          <div className="stat-label">Total Items</div>
        </div>
        <div className="stat-box">
          <div className="stat-icon-chip" style={{ background: 'var(--accent-green)', color: 'var(--text-primary)' }}>
            Min
          </div>
          <div className="stat-value" style={{ color: 'var(--accent-green)' }}>{minPriority}</div>
          <div className="stat-label">Min Priority</div>
        </div>
        <div className="stat-box">
          <div className="stat-icon-chip" style={{ background: 'var(--accent-peach)', color: 'var(--text-primary)' }}>
            Max
          </div>
          <div className="stat-value" style={{ color: 'var(--accent-peach)' }}>{maxPriority}</div>
          <div className="stat-label">Max Priority</div>
        </div>
        <div className="stat-box">
          <div className="stat-icon-chip" style={{ background: isEmpty ? 'var(--accent-pink)' : 'var(--accent-yellow)', color: 'var(--text-primary)' }}>
            {isEmpty ? '!' : '✓'}
          </div>
          <div className="stat-value" style={{ fontSize: '1.1rem', marginTop: '0.2rem' }}>
            {isEmpty ? 'EMPTY' : 'ACTIVE'}
          </div>
          <div className="stat-label">Status</div>
        </div>
      </div>
    </div>
  );
}
