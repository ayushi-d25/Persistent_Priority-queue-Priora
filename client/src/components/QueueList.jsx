import React, { useState } from 'react';

export default function QueueList({ items, onUpdate, onDelete, loading }) {
  const [editingId, setEditingId] = useState(null);
  const [editPriority, setEditPriority] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditPriority(item.priority);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditPriority('');
  };

  const handleUpdateSubmit = (id) => {
    if (editPriority === '' || isNaN(Number(editPriority))) return;
    onUpdate(id, Number(editPriority));
    setEditingId(null);
  };

  const confirmDelete = (id) => {
    onDelete(id);
    setDeletingId(null);
  };

  if (!items || items.length === 0) {
    return (
      <div className="card empty-state">
        <svg className="empty-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
        <h3>Queue is Empty</h3>
        <p style={{ fontSize: '0.9rem', marginTop: '0.35rem' }}>Insert items using the form to populate the persistent priority queue.</p>
      </div>
    );
  }

  // Find min priority value
  const minPriorityVal = items[0]?.priority;

  return (
    <div className="card">
      <h2 className="card-title">
        <div className="card-title-icon-chip" style={{ background: 'rgba(169, 195, 220, 0.4)' }}>
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
        </div>
        Queue Items ({items.length})
      </h2>
      <div className="queue-items-container">
        {items.map((item) => {
          const isMin = item.priority === minPriorityVal;
          const isEditing = editingId === item.id;
          const isDeleting = deletingId === item.id;

          return (
            <div key={item.id} className="queue-item-card">
              <div className="item-left">
                <div className={`priority-badge ${isMin ? 'min-priority' : ''}`}>
                  P: {item.priority}
                </div>
                <div className="item-details">
                  <div className="item-value">{item.value}</div>
                  <div className="item-meta">
                    ID: {item.id.substring(0, 8)}... • Created: {new Date(item.createdAt).toLocaleTimeString()}
                  </div>
                </div>
              </div>

              <div className="item-actions">
                {isEditing ? (
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input
                      type="number"
                      step="any"
                      className="input-field"
                      style={{ width: '85px', padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                      value={editPriority}
                      onChange={(e) => setEditPriority(e.target.value)}
                      autoFocus
                    />
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => handleUpdateSubmit(item.id)}
                      disabled={loading}
                    >
                      Save
                    </button>
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={cancelEdit}
                      disabled={loading}
                    >
                      Cancel
                    </button>
                  </div>
                ) : isDeleting ? (
                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', fontWeight: 700 }}>Delete?</span>
                    <button
                      className="btn btn-sm btn-danger-sm"
                      onClick={() => confirmDelete(item.id)}
                      disabled={loading}
                    >
                      Confirm
                    </button>
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => setDeletingId(null)}
                      disabled={loading}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => startEdit(item)}
                      disabled={loading}
                      title="Update Priority"
                    >
                      Edit ✏️
                    </button>
                    <button
                      className="btn btn-sm btn-danger-sm"
                      onClick={() => setDeletingId(item.id)}
                      disabled={loading}
                      title="Delete Item"
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
