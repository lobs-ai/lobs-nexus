import { useState, useRef } from 'react';
import GlassCard from '../components/GlassCard';
import Badge from '../components/Badge';
import { useApi } from '../hooks/useApi';
import { api } from '../lib/api';
import { timeAgo, formatDuration } from '../lib/utils';

const NODE_COLORS = {
  spawn_agent: '#2dd4bf',
  expression: '#38bdf8',
  condition: '#fbbf24',
  notify: '#a78bfa',
  transform: '#34d399',
  gate: '#f87171',
  default: '#38bdf8',
};

function buildGraph(workflow) {
  let nodes = [];
  try { nodes = typeof workflow.nodes === 'string' ? JSON.parse(workflow.nodes) : (workflow.nodes || []); } catch { return { nodes: [], edges: [] }; }
  
  const edges = [];
  nodes.forEach(n => {
    if (n.on_success) {
      const target = typeof n.on_success === 'string' ? n.on_success : n.on_success?.goto;
      if (target && nodes.find(x => x.id === target)) edges.push({ from: n.id, to: target, type: 'success' });
    }
    if (n.on_failure) {
      const target = typeof n.on_failure === 'string' ? n.on_failure : n.on_failure?.action === 'goto' ? n.on_failure?.goto : null;
      if (target && nodes.find(x => x.id === target)) edges.push({ from: n.id, to: target, type: 'failure' });
    }
    if (n.next) {
      const nexts = Array.isArray(n.next) ? n.next : [n.next];
      nexts.forEach(t => { if (nodes.find(x => x.id === t)) edges.push({ from: n.id, to: t, type: 'normal' }); });
    }
    if (n.branches) {
      Object.entries(n.branches).forEach(([, target]) => {
        if (typeof target === 'string' && nodes.find(x => x.id === target)) edges.push({ from: n.id, to: target, type: 'normal' });
      });
    }
  });
  return { nodes, edges };
}

function layoutNodes(nodes, edges) {
  if (!nodes.length) return { positioned: {}, svgW: 300, svgH: 200 };
  
  const W = 170, H = 70, GAP_X = 80, GAP_Y = 50;
  const adj = {}; const inDeg = {};
  nodes.forEach(n => { adj[n.id] = []; inDeg[n.id] = 0; });
  edges.forEach(e => { if (adj[e.from]) adj[e.from].push(e.to); inDeg[e.to] = (inDeg[e.to] || 0) + 1; });
  
  // Topological layering
  const layers = {}; const visited = new Set(); const depth = {};
  const assignDepth = (id, d) => {
    if (depth[id] !== undefined && depth[id] >= d) return;
    depth[id] = d;
    (adj[id] || []).forEach(t => assignDepth(t, d + 1));
  };
  const roots = nodes.filter(n => !inDeg[n.id] || inDeg[n.id] === 0);
  if (roots.length === 0) assignDepth(nodes[0].id, 0);
  else roots.forEach(r => assignDepth(r.id, 0));
  
  nodes.forEach(n => { const l = depth[n.id] || 0; if (!layers[l]) layers[l] = []; layers[l].push(n.id); });
  
  const positioned = {};
  const maxPerLayer = Math.max(...Object.values(layers).map(l => l.length), 1);
  const totalH = maxPerLayer * (H + GAP_Y);
  
  Object.entries(layers).forEach(([layer, ids]) => {
    const x = Number(layer) * (W + GAP_X) + 40;
    const groupH = ids.length * (H + GAP_Y) - GAP_Y;
    const startY = (totalH - groupH) / 2 + 20;
    ids.forEach((id, i) => { positioned[id] = { x, y: startY + i * (H + GAP_Y) }; });
  });
  
  const maxLayer = Math.max(...Object.keys(layers).map(Number), 0);
  return {
    positioned,
    svgW: Math.max((maxLayer + 1) * (W + GAP_X) + 80, 400),
    svgH: Math.max(totalH + 60, 250),
    W, H,
  };
}

const EDGE_COLORS = { success: '#34d399', failure: '#f87171', normal: 'rgba(45,212,191,0.4)' };

function DAGView({ workflow }) {
  const [zoom, setZoom] = useState(1);
  const [selectedNode, setSelectedNode] = useState(null);
  
  const { nodes, edges } = buildGraph(workflow);
  if (!nodes.length) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>No nodes defined</div>;
  
  const { positioned, svgW, svgH, W, H } = layoutNodes(nodes, edges);
  
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
        <button className="btn-ghost" style={{ padding: '4px 12px' }} onClick={() => setZoom(z => Math.max(0.4, z - 0.2))}>−</button>
        <span style={{ color: 'var(--muted)', fontSize: '0.78rem', fontFamily: 'var(--mono)', minWidth: 40, textAlign: 'center' }}>{Math.round(zoom * 100)}%</span>
        <button className="btn-ghost" style={{ padding: '4px 12px' }} onClick={() => setZoom(z => Math.min(2, z + 0.2))}>+</button>
        <button className="btn-ghost" style={{ padding: '4px 12px' }} onClick={() => setZoom(1)}>Reset</button>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 12 }}>
          {[{ label: 'Success', color: EDGE_COLORS.success }, { label: 'Failure', color: EDGE_COLORS.failure }, { label: 'Flow', color: EDGE_COLORS.normal }].map(l => (
            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 16, height: 2, background: l.color, borderRadius: 1 }} />
              <span style={{ color: 'var(--muted)', fontSize: '0.68rem', fontFamily: 'var(--mono)' }}>{l.label}</span>
            </div>
          ))}
        </div>
      </div>
      
      <div style={{ overflow: 'auto', background: 'rgba(6,9,20,0.8)', borderRadius: 12, border: '1px solid var(--border)', position: 'relative' }}
           onClick={() => setSelectedNode(null)}>
        <svg width={svgW * zoom} height={svgH * zoom} viewBox={`0 0 ${svgW} ${svgH}`} style={{ display: 'block' }}>
          <defs>
            {Object.entries(EDGE_COLORS).map(([type, color]) => (
              <marker key={type} id={`arrow-${type}`} markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                <path d={`M0,0 L0,6 L8,3 z`} fill={color} />
              </marker>
            ))}
          </defs>
          
          {edges.map((e, i) => {
            const from = positioned[e.from]; const to = positioned[e.to];
            if (!from || !to) return null;
            const x1 = from.x + W; const y1 = from.y + H / 2;
            const x2 = to.x; const y2 = to.y + H / 2;
            const mx = (x1 + x2) / 2;
            const color = EDGE_COLORS[e.type] || EDGE_COLORS.normal;
            return (
              <g key={i}>
                <path d={`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`} fill="none" stroke={color} strokeWidth="2" markerEnd={`url(#arrow-${e.type})`} opacity="0.8" />
                {e.type !== 'normal' && (
                  <text x={mx} y={Math.min(y1, y2) - 6} textAnchor="middle" fill={color} fontSize="9" fontFamily="monospace" fontWeight="600" opacity="0.8">
                    {e.type}
                  </text>
                )}
              </g>
            );
          })}
          
          {nodes.map(n => {
            const pos = positioned[n.id]; if (!pos) return null;
            const color = NODE_COLORS[n.type] || NODE_COLORS.default;
            const isSelected = selectedNode?.id === n.id;
            return (
              <g key={n.id} onClick={e => { e.stopPropagation(); setSelectedNode(n); }} style={{ cursor: 'pointer' }}>
                <rect x={pos.x} y={pos.y} width={W} height={H} rx="10" fill={isSelected ? color + '25' : 'rgba(14,20,38,0.9)'} stroke={isSelected ? color : color + '55'} strokeWidth={isSelected ? 2 : 1} />
                <line x1={pos.x} y1={pos.y} x2={pos.x + 12} y2={pos.y} stroke={color} strokeWidth="2" />
                <line x1={pos.x + W - 12} y1={pos.y + H} x2={pos.x + W} y2={pos.y + H} stroke={color} strokeWidth="2" />
                <text x={pos.x + W / 2} y={pos.y + 20} textAnchor="middle" fill={color} fontSize="9" fontFamily="monospace" fontWeight="700" letterSpacing="1">{(n.type || 'step').toUpperCase()}</text>
                <text x={pos.x + W / 2} y={pos.y + H / 2 + 8} textAnchor="middle" fill="var(--text)" fontSize="11" fontFamily="monospace">{(n.id || '').slice(0, 20)}</text>
              </g>
            );
          })}
        </svg>
        
        {selectedNode && positioned[selectedNode.id] && (
          <div style={{ position: 'absolute', left: Math.min(positioned[selectedNode.id].x * zoom + W * zoom / 2, svgW * zoom - 250), top: positioned[selectedNode.id].y * zoom + H * zoom + 10, background: 'rgba(9,13,26,0.98)', border: '1px solid rgba(45,212,191,0.3)', borderRadius: 10, padding: 16, minWidth: 220, zIndex: 10, boxShadow: '0 0 40px rgba(0,0,0,0.6), 0 0 20px rgba(45,212,191,0.1)' }}>
            <div style={{ color: 'var(--text)', fontWeight: 700, marginBottom: 8, fontFamily: 'var(--mono)', fontSize: '0.9rem' }}>{selectedNode.id}</div>
            <div style={{ color: NODE_COLORS[selectedNode.type] || 'var(--blue)', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>{selectedNode.type || 'step'}</div>
            {selectedNode.config && Object.entries(selectedNode.config).slice(0, 5).map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                <span style={{ color: 'var(--muted)', fontSize: '0.72rem', fontFamily: 'var(--mono)' }}>{k}:</span>
                <span style={{ color: 'var(--text)', fontSize: '0.72rem', fontFamily: 'var(--mono)', textAlign: 'right', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{typeof v === 'string' ? v : JSON.stringify(v).slice(0, 30)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const STATUS_COLORS = { running: '#2dd4bf', completed: '#34d399', failed: '#f87171', pending: '#fbbf24', cancelled: '#475569' };

export default function Workflows() {
  const { data: workflows, loading } = useApi(signal => api.workflows(signal));
  const { data: runs } = useApi(signal => api.workflowRuns(20, signal));
  const [selectedWf, setSelectedWf] = useState(null);

  const wfList = Array.isArray(workflows) ? workflows : (workflows?.workflows || []);
  const runList = Array.isArray(runs) ? runs : (runs?.runs || []);
  const selectedRuns = selectedWf ? runList.filter(r => (r.workflowId || r.workflow_id) === selectedWf.id) : [];

  return (
    <div style={{ position: 'relative', padding: '36px 32px' }}>
      <div className="orb orb-1" style={{ position: 'fixed', zIndex: 0 }} />
      <div className="orb orb-2" style={{ position: 'fixed', zIndex: 0 }} />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div className="fade-in-up" style={{ marginBottom: 36 }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '6px', color: 'var(--teal)', fontFamily: 'var(--mono)', marginBottom: 8, opacity: 0.8 }}>AUTOMATION</div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 900, letterSpacing: '-1.5px' }}><span className="gradient-text">Workflows</span></h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginTop: 4 }}>DAG-based automation pipelines</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 24, minHeight: 500 }}>
          {/* Workflow List */}
          <GlassCard className="fade-in-up-1" style={{ height: 'fit-content' }}>
            <div className="section-label" style={{ marginBottom: 16 }}>Definitions</div>
            {loading ? (
              <div style={{ color: 'var(--muted)', textAlign: 'center', padding: '20px 0' }}>Loading...</div>
            ) : wfList.length === 0 ? (
              <div style={{ color: 'var(--muted)', textAlign: 'center', padding: '20px 0' }}>No workflows</div>
            ) : wfList.map(wf => {
              let nodeCount = 0;
              try { const n = typeof wf.nodes === 'string' ? JSON.parse(wf.nodes) : (wf.nodes || []); nodeCount = n.length; } catch {}
              return (
                <div key={wf.id} className={`wf-list-item ${selectedWf?.id === wf.id ? 'selected' : ''}`} onClick={() => setSelectedWf(wf)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ color: 'var(--text)', fontWeight: 600, fontSize: '0.88rem' }}>{wf.name || wf.id}</span>
                    <span className={wf.isActive || wf.is_active ? 'pulse-dot' : ''} style={{ width: 8, height: 8, borderRadius: '50%', background: wf.isActive || wf.is_active ? 'var(--green)' : 'var(--faint)', color: wf.isActive || wf.is_active ? 'var(--green)' : 'var(--faint)', display: 'block' }} />
                  </div>
                  <div style={{ color: 'var(--muted)', fontSize: '0.72rem', fontFamily: 'var(--mono)' }}>{nodeCount} nodes</div>
                </div>
              );
            })}
          </GlassCard>

          {/* DAG + Runs */}
          <div>
            {!selectedWf ? (
              <GlassCard className="fade-in-up-2">
                <div style={{ padding: '80px 0', textAlign: 'center' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: 16, opacity: 0.3 }}>🔀</div>
                  <div style={{ color: 'var(--text)', fontWeight: 600 }}>Select a workflow</div>
                  <div style={{ color: 'var(--muted)', fontSize: '0.85rem', marginTop: 4 }}>Click a workflow on the left to visualize it</div>
                </div>
              </GlassCard>
            ) : (
              <>
                <GlassCard className="fade-in-up-2" style={{ marginBottom: 24 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div>
                      <div className="section-label" style={{ marginBottom: 4 }}>Pipeline</div>
                      <h3 style={{ fontWeight: 700, fontSize: '1.1rem' }}>{selectedWf.name || selectedWf.id}</h3>
                    </div>
                    <Badge label={selectedWf.isActive || selectedWf.is_active ? 'active' : 'inactive'} color={selectedWf.isActive || selectedWf.is_active ? 'var(--green)' : 'var(--muted)'} dot />
                  </div>
                  {selectedWf.description && <div style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: 16, lineHeight: 1.5 }}>{selectedWf.description}</div>}
                  <DAGView workflow={selectedWf} />
                </GlassCard>

                {selectedRuns.length > 0 && (
                  <GlassCard className="fade-in-up-3">
                    <div className="section-label" style={{ marginBottom: 12 }}>Run History</div>
                    <table className="hud-table">
                      <thead><tr>
                        {['Status', 'Duration', 'Step', 'Started'].map(h => <th key={h}>{h}</th>)}
                      </tr></thead>
                      <tbody>
                        {selectedRuns.map(r => (
                          <tr key={r.id}>
                            <td><Badge label={r.status} color={STATUS_COLORS[r.status] || 'var(--muted)'} dot /></td>
                            <td style={{ fontFamily: 'var(--mono)', fontSize: '0.78rem', color: 'var(--muted)' }}>{formatDuration(r.startedAt || r.started_at, r.endedAt || r.ended_at)}</td>
                            <td style={{ fontFamily: 'var(--mono)', fontSize: '0.78rem', color: 'var(--blue)' }}>{r.currentStep || r.current_step || '--'}</td>
                            <td style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>{timeAgo(r.startedAt || r.started_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </GlassCard>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
