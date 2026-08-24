import React from 'react';

export default function HeapVisualization({ heapArray }) {
  if (!heapArray || heapArray.length === 0) {
    return (
      <div className="card">
        <h2 className="card-title">
          <div className="card-title-icon-chip" style={{ background: 'rgba(241, 182, 182, 0.4)' }}>
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L5.594 15.12a2 2 0 00-1.583 1.854l-.078 2.02a2 2 0 001.996 2.006h12.134a2 2 0 001.996-2.006l-.078-2.02zM12 3v9m0 0l-3-3m3 3l3-3"/>
            </svg>
          </div>
          Binary Min-Heap Tree Structure
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textAlign: 'center', padding: '1.25rem 0' }}>
          Binary min-heap structure will dynamically render here when queue items are inserted.
        </p>
      </div>
    );
  }

  // Organize heap array into tree levels (level 0: 1 node, level 1: 2 nodes, level 2: 4 nodes...)
  const levels = [];
  let index = 0;
  let levelNum = 0;

  while (index < heapArray.length) {
    const levelSize = Math.pow(2, levelNum);
    const currentLevelNodes = [];

    for (let i = 0; i < levelSize && index < heapArray.length; i++) {
      currentLevelNodes.push({ ...heapArray[index], heapIndex: index });
      index++;
    }

    levels.push(currentLevelNodes);
    levelNum++;
  }

  return (
    <div className="card">
      <h2 className="card-title">
        <div className="card-title-icon-chip" style={{ background: 'rgba(241, 182, 182, 0.4)' }}>
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"/>
          </svg>
        </div>
        Binary Min-Heap Tree Structure
      </h2>
      <div className="heap-viz-container">
        {levels.map((levelNodes, lvlIdx) => (
          <div key={lvlIdx} className="heap-level">
            {levelNodes.map((node) => {
              const isRoot = node.heapIndex === 0;
              return (
                <div
                  key={node.id}
                  className={`heap-node ${isRoot ? 'root-node' : ''}`}
                  title={`[Index ${node.heapIndex}] ${node.value} (Priority: ${node.priority})`}
                >
                  <span className="heap-node-idx">#{node.heapIndex}</span>
                  <span className="heap-node-priority">P:{node.priority}</span>
                  <span className="heap-node-label">{node.value}</span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--accent-yellow)', border: '2px solid var(--accent-peach)', display: 'inline-block' }}></span>
          Root Node (#0 Min Element)
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--bg-elevated)', border: '2px solid var(--accent-blue)', display: 'inline-block' }}></span>
          Heap Tree Nodes
        </div>
      </div>
    </div>
  );
}
