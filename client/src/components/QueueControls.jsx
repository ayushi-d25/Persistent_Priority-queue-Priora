import React from 'react';

export default function QueueControls({ onExtractMin, onExtractMax, onPeek, loading, isEmpty }) {
  return (
    <div className="card">
      <h2 className="card-title">
        <div className="card-title-icon-chip" style={{ background: 'rgba(240, 169, 138, 0.3)' }}>
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"/>
          </svg>
        </div>
        Heap Operations
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.85rem' }}>
        <button
          className="btn btn-secondary"
          onClick={onPeek}
          disabled={loading || isEmpty}
          title="Peek item with lowest priority number (highest urgency)"
        >
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
          </svg>
          Peek Root
        </button>
        <button
          className="btn btn-accent-min"
          onClick={onExtractMin}
          disabled={loading || isEmpty}
          title="Extract item with lowest priority number (highest urgency)"
        >
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 14l-7 7m0 0l-7-7m7 7V3"/>
          </svg>
          Extract Min
        </button>
        <button
          className="btn btn-accent-max"
          onClick={onExtractMax}
          disabled={loading || isEmpty}
          title="Extract item with highest priority number (lowest urgency)"
        >
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 10l7-7m0 0l7 7m-7-7v18"/>
          </svg>
          Extract Max
        </button>
      </div>
    </div>
  );
}
