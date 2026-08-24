import React, { useState } from 'react';

export default function QueueForm({ onInsert, loading }) {
  const [value, setValue] = useState('');
  const [priority, setPriority] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!value.trim() || priority === '') return;
    
    onInsert(value.trim(), Number(priority));
    setValue('');
    setPriority('');
  };

  return (
    <div className="card">
      <h2 className="card-title">
        <div className="card-title-icon-chip" style={{ background: 'rgba(169, 198, 165, 0.3)' }}>
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"/>
          </svg>
        </div>
        Insert Queue Item
      </h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label" htmlFor="item-value">Item Name / Task Description</label>
          <input
            id="item-value"
            type="text"
            className="input-field"
            placeholder="e.g. Process urgent payout"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={loading}
            required
          />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="item-priority">Numeric Priority (Lower = Higher Urgency)</label>
          <input
            id="item-priority"
            type="number"
            step="any"
            className="input-field"
            placeholder="e.g. 1"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            disabled={loading}
            required
          />
        </div>
        <button
          type="submit"
          className="btn btn-primary"
          style={{ width: '100%' }}
          disabled={loading || !value.trim() || priority === ''}
        >
          {loading ? 'Processing...' : 'Insert Item'}
        </button>
      </form>
    </div>
  );
}
