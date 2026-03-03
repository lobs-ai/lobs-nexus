import { useState, useRef, useCallback } from 'react';
import GlassCard from '../components/GlassCard';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import { useApi } from '../hooks/useApi';
import { api } from '../lib/api';
import { timeAgo, formatDuration } from '../lib/utils';

const NODE_COLORS = {
  spawn: '#2dd4bf',
  condition: '#fbbf24',
  notify: '#a78bfa',
  default: '#38bdf8',
};

const STATUS_COLORS = {
  running: '#2dd4bf',
  completed: '#34d399',
  failed: '#f87171',
  pending: '#fbbf24',
};

function layoutDAG(nodes) {
  // Simple layered layout
  const nodeMap = {};
  nodes.forEach(n => { nodeMap[n.id] = { ...n, layer: 0, x: 0, y: 0 }; });

  // Assign layers via longest path from root
  const visited = new Set();
  const assign = (id, depth) => {
    if (!nodeMap[id]) return;
    if (nodeMap[id].layer < depth) nodeMap[id].layer = depth;
    if (visited.has(id)) return;
    visited.add(id);
    (nodeMap[id].next || []).forEach(nid => assign(nid, depth + 1));
  };

  const allTargets = new Set(nodes.flatMap(n => n.next || []));
  const roots = nodes.filter(n => !allTargets.has(n.id));
  if (roots.length === 0 && nodes.length > 0) assign(nodes[0].id, 0);
  else roots.forEach(r => assign(r.id, 0));

  // Group by layer
  const layers = {};
  Object.values(nodeMap).forEach(n => {
    if (!layers[n.layer]) layers[n.layer] = [];
    layers[n.layer].push(n.id);
  });

  const W = 150, H = 80, GAP_X = 60, GAP_Y = 40;
  const maxPerLayer = Math.max(...Object.values(layers).map(l => l.length));
  const totalH = maxPerLayer * (H + GAP_Y);

  Object.entries(layers).forEach(([layer, ids]) => {
    const x = Number(layer) * (W + GAP_X) + 20;
    const groupH = ids.length * (H + GAP_Y) - GAP_Y;
    const startY = (totalH - groupH) / 2;
    ids.forEach((id, i) => {
      nodeMap[id].x = x;
      nodeMap[id].y = startY + i * (H + GAP_Y);
    });
  });

  const maxLayer = Math.max(...Object.values(nodeMap).map(n => n.layer));
  const svgW = (maxLayer + 1) * (W + GAP_X) + 20;
  const svgH = totalH + 20;

  return { nodeMap, svgW: Math.max(svgW, 300), svgH: Math.max(svgH, 200), W, H };
}

function DAGViewer({ workflow, onClose }) {
  const [zoom, setZoom] = useState(1);
  const [selectedNode, setSelectedNode] = useState(null);
  const [popupPos, setPopupPos] = useState(null);
  const svgRef = useRef(null);

  const nodes = workflow?.steps || workflow?.nodes || [];
  if (!nodes.length) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
        No node definitions available for this workflow.
      </div>
    );
  }

  const { nodeMap, svgW, svgH, W, H } = layoutDAG(nodes);

  const handleNodeClick = (node, e) => {
    e.stopPropagation();
    setSelectedNode(node);
    const rect = svgRef.current?.getBoundingClientRect();
    if (rect) {
      setPopupPos({
        x: node.x * zoom + W * zoom / 2,
        y: node.y * zoom + H * zoom,
      });
    }
  };

  const edges = [];
  Object.values(nodeMap).forEach(n => {
    (n.next || []).forEach(tid => {
      const target = nodeMap[tid];
      if (!target) return;
      edges.push({ from: n, to: target });
    });
  });

  return (
    <div style={{ position: 'relative' }}>
      {/* Zoom controls */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
        <button onClick={() => setZoom(z => Math.max(0.4, z - 0.2))} style={btnStyle}>−</button>
        <span style={{ color: 'var(--muted)', fontSize: '0.8rem', fontFamily: 'var(--mono)' }}>{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom(z => Math.min(2, z + 0.2))} style={btnStyle}>+</button>
        <button onClick={() => setZoom(1)} style={{ ...btnStyle, marginLeft: 4 }}>Reset</button>
      </div>

      <div style={{ overflow: 'auto', background: 'rgba(0,0,0,0.3)', borderRadius: 10, border: '1px solid var(--border)', position: 'relative' }}
           onClick={() => setSelectedNode(null)}>
        <svg
          ref={svgRef}
          width={svgW * zoom}
          height={svgH * zoom}
          style={{ display: 'block' }}
          viewBox={`0 0 ${svgW} ${svgH}`}
        >
          <defs>
            <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L0,6 L8,3 z" fill="var(--border)" />
            </marker>
          </defs>

          {/* Edges */}
          {edges.map((e, i) => {
            const x1 = e.from.x + W;
            const y1 = e.from.y + H / 2;
            const x2 = e.to.x;
            const y2 = e.to.y + H / 2;
            const mx = (x1 + x2) / 2;
            return (
              <path
                key={i}
                d={`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`}
                fill="none"
                stroke="var(--border)"
                strokeWidth="1.5"
                markerEnd="url(#arrow)"
              />
            );
          })}

          {/* Nodes */}
          {Object.values(nodeMap).map(n => {
            const color = NODE_COLORS[n.type] || NODE_COLORS.default;
            const isSelected = selectedNode?.id === n.id;
            return (
              <g key={n.id} onClick={(e) => handleNodeClick(n, e)} style={{ cursor: 'pointer' }}>
                <rect
                  x={n.x} y={n.y} width={W} height={H} rx="10"
                  fill={isSelected ? color + '33' : 'rgba(11,15,30,0.8)'}
                  stroke={isSelected ? color : color + '66'}
                  strokeWidth={isSelected ? 2 : 1}
                />
                <text x={n.x + W / 2} y={n.y + 18} textAnchor="middle" fill={color} fontSize="10" fontFamily="monospace" fontWeight="600">
                  {(n.type || 'step').toUpperCase()}
                </text>
                <text x={n.x + W / 2} y={n.y + H / 2 + 4} textAnchor="middle" fill="var(--text)" fontSize="12" fontFamily="monospace">
                  {(n.id || n.name || '').slice(0, 18)}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Node popup */}
        {selectedNode && (
          <div style={{
            position: 'absolute',
            left: Math.min((selectedNode.x * zoom) + W * zoom / 2, (svgW * zoom) - 220),
            top: (selectedNode.y * zoom) + H * zoom + 8,
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: 12,
            minWidth: 200,
            zIndex: 10,
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          }}>
            <div style={{ color: 'var(--text)', fontWeight: 700, marginBottom: 6 }}>{selectedNode.id || selectedNode.name}</div>
            <div style={{ color: 'var(--muted)', fontSize: '0.78rem', marginBottom: 4 }}>Type: {selectedNode.type || 'step'}</div>
            {selectedNode.agent && <div style={{ color: 'var(--muted)', fontSize: '0.78rem' }}>Agent: {selectedNode.agent}</div>}
            {selectedNode.model && <div style={{ color: 'var(--muted)', fontSize: '0.78rem' }}>Model: {selectedNode.model}</div>}
            {selectedNode.condition && <div style={{ color: 'var(--muted)', fontSize: '0.78rem', marginTop: 4 }}>Condition: {selectedNode.condition}</div>}
          </div>
        )}
      </div>
    </div>
  );
}

const btnStyle = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid var(--border)',
  borderRadius: 6,
  color: 'var(--text)',
  cursor: 'pointer',
  padding: '4px 10px',
  fontSize: '0.85rem',
};

export default function Workflows() {
  const { data: workflows, loading } = useApi(() => api.workflows());
  const { data: runs, loading: runsLoading } = useApi(() => api.workflowRuns(20));
  const [selectedWf, setSelectedWf] = useState(null);

  const wfList = workflows?.workflows || workflows || [];
  const runList = runs?.runs || runs || [];

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ marginBottom: 32 }}>
        <span className="section-label">Automation</span>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-1px' }}>
          <span className="gradient-text">Workflows</span>
        </h1>
        <p style={{ color: 'var(--muted)' }}>DAG-based automation definitions and run history</p>
      </div>

      {/* Workflow list */}
      <GlassCard style={{ marginBottom: 24 }}>
        <h3 style={{ color: 'var(--text)', fontWeight: 700, marginBottom: 16 }}>Workflow Definitions</h3>
        {loading ? (
          <div style={{ color: 'var(--muted)', padding: '20px 0', textAlign: 'center' }}>Loading...</div>
        ) : wfList.length === 0 ? (
          <div style={{ color: 'var(--muted)', padding: '20px 0', textAlign: 'center' }}>No workflows defined</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {wfList.map(wf => (
              <div
                key={wf.id}
                onClick={() => setSelectedWf(wf)}
                style={{ background: 'rgba(11,15,30,0.6)', border: '1px solid var(--border)', borderRadius: 10, padding: 16, cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--teal)'; e.currentTarget.style.boxShadow = '0 0 20px rgba(45,212,191,0.1)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div style={{ color: 'var(--text)', fontWeight: 600 }}>{wf.name || wf.id}</div>
                  <Badge
                    label={wf.active || wf.enabled ? 'active' : 'inactive'}
                    color={wf.active || wf.enabled ? 'var(--green)' : 'var(--muted)'}
                    dot
                  />
                </div>
                <div style={{ color: 'var(--muted)', fontSize: '0.78rem', marginBottom: 8 }}>{wf.description || 'No description'}</div>
                <div style={{ color: 'var(--teal)', fontSize: '0.72rem', fontFamily: 'var(--mono)' }}>
                  {(wf.steps || wf.nodes || []).length} nodes · Click to visualize
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {/* Recent runs */}
      <GlassCard>
        <h3 style={{ color: 'var(--text)', fontWeight: 700, marginBottom: 16 }}>Recent Runs</h3>
        {runsLoading ? (
          <div style={{ color: 'var(--muted)', padding: '20px 0', textAlign: 'center' }}>Loading...</div>
        ) : runList.length === 0 ? (
          <div style={{ color: 'var(--muted)', padding: '20px 0', textAlign: 'center' }}>No workflow runs yet</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Workflow', 'Status', 'Duration', 'Step', 'Started'].map(h => (
                    <th key={h} style={{ color: 'var(--muted)', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', padding: '0 12px 10px', textAlign: 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {runList.map(r => (
                  <tr key={r.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <td style={{ padding: '10px 12px', color: 'var(--text)', fontSize: '0.85rem', fontFamily: 'var(--mono)' }}>{r.workflowId || r.workflow_id || '--'}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <Badge label={r.status} color={STATUS_COLORS[r.status] || 'var(--muted)'} dot />
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--muted)', fontSize: '0.82rem', fontFamily: 'var(--mono)' }}>
                      {formatDuration(r.startedAt || r.started_at, r.endedAt || r.ended_at)}
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--blue)', fontSize: '0.78rem', fontFamily: 'var(--mono)' }}>{r.currentStep || r.current_step || '--'}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--muted)', fontSize: '0.78rem' }}>{timeAgo(r.startedAt || r.started_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      {/* DAG Modal */}
      <Modal open={!!selectedWf} onClose={() => setSelectedWf(null)} title={selectedWf?.name || selectedWf?.id || 'Workflow'}>
        {selectedWf && <DAGViewer workflow={selectedWf} onClose={() => setSelectedWf(null)} />}
      </Modal>
    </div>
  );
}
