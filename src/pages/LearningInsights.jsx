import { useState, useEffect } from 'react';

const AGENTS = ['all', 'programmer', 'researcher', 'writer', 'reviewer', 'architect'];

async function req(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

function pct(val) {
  return typeof val === 'number' ? `${(val * 100).toFixed(1)}%` : '—';
}

function StatCard({ label, value, sub, color }) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10,
      padding: '16px 20px', minWidth: 140, flex: '1 1 140px',
    }}>
      <div style={{ color: 'var(--muted)', fontSize: '0.7rem', fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: '1.8rem', fontWeight: 800, color: color || 'var(--text)', lineHeight: 1 }}>{value ?? '—'}</div>
      {sub && <div style={{ color: 'var(--faint)', fontSize: '0.72rem', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function KillSwitchPanel({ ks, onToggle, onConfChange }) {
  const [newConf, setNewConf] = useState('');

  return (
    <div style={{
      background: ks?.enabled ? 'rgba(45,212,191,0.06)' : 'rgba(239,68,68,0.08)',
      border: `1px solid ${ks?.enabled ? 'rgba(45,212,191,0.25)' : 'rgba(239,68,68,0.3)'}`,
      borderRadius: 10, padding: '16px 20px', marginBottom: 24,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{
          width: 10, height: 10, borderRadius: '50%',
          background: ks?.enabled ? 'var(--green)' : 'var(--red)',
          boxShadow: `0 0 8px ${ks?.enabled ? 'rgba(34,197,94,0.6)' : 'rgba(239,68,68,0.6)'}`,
        }} />
        <span style={{ fontWeight: 700, color: 'var(--text)', fontSize: '0.95rem' }}>
          Learning Injection: {ks?.enabled ? 'ENABLED' : 'DISABLED'}
        </span>
        {ks?.envOverride && (
          <span style={{ background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: 4, padding: '2px 8px', fontSize: '0.7rem', color: 'var(--amber)' }}>
            env override: {ks.envOverride}
          </span>
        )}
        <button
          onClick={() => onToggle(!ks?.enabled)}
          style={{
            marginLeft: 'auto', padding: '6px 16px', borderRadius: 6, fontWeight: 700, fontSize: '0.8rem',
            background: ks?.enabled ? 'rgba(239,68,68,0.15)' : 'rgba(45,212,191,0.15)',
            color: ks?.enabled ? 'var(--red)' : 'var(--teal)',
            border: `1px solid ${ks?.enabled ? 'rgba(239,68,68,0.3)' : 'rgba(45,212,191,0.3)'}`,
            cursor: 'pointer',
          }}
        >
          {ks?.enabled ? 'Disable' : 'Enable'}
        </button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
        <span style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>
          Min confidence: <strong style={{ color: 'var(--text)' }}>{ks?.minConfidence ?? 0.7}</strong>
        </span>
        <input
          type="number" min="0" max="1" step="0.05"
          value={newConf}
          onChange={e => setNewConf(e.target.value)}
          placeholder="0.7"
          style={{
            width: 70, padding: '4px 8px', borderRadius: 4,
            background: 'var(--surface)', border: '1px solid var(--border)',
            color: 'var(--text)', fontSize: '0.8rem',
          }}
        />
        <button
          onClick={() => { if (newConf) { onConfChange(parseFloat(newConf)); setNewConf(''); } }}
          style={{
            padding: '4px 12px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 600,
            background: 'rgba(45,212,191,0.12)', color: 'var(--teal)',
            border: '1px solid rgba(45,212,191,0.25)', cursor: 'pointer',
          }}
        >
          Update
        </button>
      </div>
    </div>
  );
}

function PatternRow({ p }) {
  const isSeed = p.source === 'seed';
  return (
    <tr style={{ borderBottom: '1px solid var(--border)' }}>
      <td style={{ padding: '8px 12px', color: 'var(--text)', fontFamily: 'var(--mono)', fontSize: '0.78rem' }}>
        {p.patternName}
        {isSeed && (
          <span style={{ marginLeft: 6, background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.25)', borderRadius: 3, padding: '1px 5px', fontSize: '0.65rem', color: 'var(--amber)' }}>seed</span>
        )}
      </td>
      <td style={{ padding: '8px 12px', color: 'var(--muted)', fontSize: '0.78rem' }}>{p.agentType}</td>
      <td style={{ padding: '8px 12px', textAlign: 'right' }}>
        <span style={{
          color: (p.confidence ?? 0) >= 0.8 ? 'var(--green)' : (p.confidence ?? 0) >= 0.6 ? 'var(--amber)' : 'var(--red)',
          fontWeight: 700, fontSize: '0.82rem',
        }}>
          {((p.confidence ?? 0) * 100).toFixed(0)}%
        </span>
      </td>
      <td style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--muted)', fontSize: '0.78rem' }}>{p.successCount ?? 0}/{(p.successCount ?? 0) + (p.failureCount ?? 0)}</td>
      <td style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--blue)', fontSize: '0.78rem' }}>{p.injectionHits ?? 0}</td>
      <td style={{ padding: '8px 12px', color: 'var(--muted)', fontSize: '0.73rem', maxWidth: 260 }}>
        <span style={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {p.lessonText}
        </span>
      </td>
    </tr>
  );
}

export default function LearningInsights() {
  const [selectedAgent, setSelectedAgent] = useState('all');
  const [stats, setStats] = useState(null);
  const [learnings, setLearnings] = useState([]);
  const [ks, setKs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsData, learnData, ksData] = await Promise.all([
        req(`/api/learning/stats?agent=${selectedAgent}`),
        req(`/api/learning/learnings?active=false`),
        req(`/api/learning/kill-switch`),
      ]);
      setStats(statsData);
      setLearnings(learnData);
      setKs(ksData);
      setLastRefresh(new Date().toLocaleTimeString());
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [selectedAgent]);

  const toggleKillSwitch = async (enabled) => {
    try {
      await fetch('/api/learning/kill-switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
      await load();
    } catch (e) { setError(String(e)); }
  };

  const updateConfidence = async (minConfidence) => {
    try {
      await fetch('/api/learning/kill-switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ minConfidence }),
      });
      await load();
    } catch (e) { setError(String(e)); }
  };

  const triggerExtract = async () => {
    try {
      const r = await fetch('/api/learning/extract', { method: 'POST' });
      const d = await r.json();
      alert(`Extraction pass complete. ${d.extracted} learnings updated.`);
      await load();
    } catch (e) { setError(String(e)); }
  };

  // Determine outcomes + learnings objects for display
  const outcomes = stats?.outcomes ?? stats?.totals ?? {};
  const learnStats = stats?.learnings ?? {};
  const totalInjectionHits = learnStats.totalInjectionHits ?? 0;

  // Filter learnings for the selected agent
  const filteredLearnings = selectedAgent === 'all'
    ? learnings
    : learnings.filter(l => l.agentType === selectedAgent);

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)' }}>Learning Insights</h1>
          <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: '0.85rem' }}>
            Agent learning system — outcomes, pattern extraction, prompt injection metrics
            {lastRefresh && <span style={{ color: 'var(--faint)', marginLeft: 8 }}>· refreshed {lastRefresh}</span>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <select
            value={selectedAgent}
            onChange={e => setSelectedAgent(e.target.value)}
            style={{
              padding: '6px 12px', borderRadius: 6, background: 'var(--surface)',
              border: '1px solid var(--border)', color: 'var(--text)', fontSize: '0.85rem', cursor: 'pointer',
            }}
          >
            {AGENTS.map(a => <option key={a} value={a}>{a === 'all' ? '🌐 All agents' : a}</option>)}
          </select>
          <button onClick={load} style={{
            padding: '6px 14px', borderRadius: 6, fontSize: '0.82rem', fontWeight: 600,
            background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--muted)', cursor: 'pointer',
          }}>↻ Refresh</button>
          <button onClick={triggerExtract} style={{
            padding: '6px 14px', borderRadius: 6, fontSize: '0.82rem', fontWeight: 600,
            background: 'rgba(45,212,191,0.12)', border: '1px solid rgba(45,212,191,0.25)', color: 'var(--teal)', cursor: 'pointer',
          }}>⚡ Run Extraction</button>
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 16px', color: 'var(--red)', marginBottom: 20 }}>
          {error}
        </div>
      )}

      {/* Kill switch */}
      <KillSwitchPanel ks={ks} onToggle={toggleKillSwitch} onConfChange={updateConfidence} />

      {/* Stats cards */}
      {loading ? (
        <div style={{ color: 'var(--muted)', padding: 24 }}>Loading…</div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
            <StatCard label="Outcomes" value={outcomes.total ?? 0} sub={`${outcomes.withFeedback ?? 0} with feedback`} />
            <StatCard
              label="Acceptance Rate"
              value={outcomes.withFeedback > 0 ? pct(outcomes.acceptanceRate) : '—'}
              sub={`${outcomes.accepted ?? 0} accepted / ${outcomes.rejected ?? 0} rejected`}
              color={(outcomes.acceptanceRate ?? 0) > 0.8 ? 'var(--green)' : (outcomes.acceptanceRate ?? 0) > 0.6 ? 'var(--amber)' : 'var(--red)'}
            />
            <StatCard label="Active Learnings" value={learnStats.active ?? 0} sub={`${learnStats.seeded ?? 0} seeded, ${learnStats.total ?? 0} total`} color="var(--teal)" />
            <StatCard label="Avg Confidence" value={learnStats.avgConfidence != null ? pct(learnStats.avgConfidence) : '—'} sub="across active learnings" />
            <StatCard label="Injection Hits" value={totalInjectionHits} sub="total injections" color="var(--blue)" />
          </div>

          {/* Learnings table */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontWeight: 700, color: 'var(--text)', fontSize: '0.95rem' }}>Pattern Library</span>
              <span style={{ color: 'var(--faint)', fontSize: '0.78rem' }}>
                {filteredLearnings.length} learnings
              </span>
              <span style={{ marginLeft: 'auto', color: 'var(--faint)', fontSize: '0.75rem' }}>
                🌱 seed = synthetic bootstrap data
              </span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                    {['Pattern', 'Agent', 'Confidence', 'Success/Total', 'Injections', 'Lesson'].map(h => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: h === 'Pattern' || h === 'Agent' || h === 'Lesson' ? 'left' : 'right', color: 'var(--faint)', fontSize: '0.7rem', fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredLearnings.length === 0 ? (
                    <tr><td colSpan={6} style={{ padding: 24, textAlign: 'center', color: 'var(--faint)' }}>No learnings yet</td></tr>
                  ) : (
                    filteredLearnings.map(p => <PatternRow key={p.id} p={p} />)
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Per-agent breakdown (all view) */}
          {selectedAgent === 'all' && stats?.byAgent && (
            <div style={{ marginTop: 24 }}>
              <h3 style={{ color: 'var(--text)', fontSize: '1rem', fontWeight: 700, marginBottom: 12 }}>Per-Agent Breakdown</h3>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {Object.entries(stats.byAgent).map(([agent, s]) => (
                  <div key={agent} style={{
                    background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8,
                    padding: '12px 16px', flex: '1 1 160px', cursor: 'pointer',
                  }} onClick={() => setSelectedAgent(agent)}>
                    <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: '0.85rem', marginBottom: 6 }}>{agent}</div>
                    <div style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>
                      {s.outcomes.total} outcomes · {s.learnings.active} learnings
                    </div>
                    <div style={{ marginTop: 4, fontSize: '0.75rem', color: s.outcomes.acceptanceRate >= 0.8 ? 'var(--green)' : s.outcomes.acceptanceRate >= 0.5 ? 'var(--amber)' : 'var(--muted)' }}>
                      {s.outcomes.withFeedback > 0 ? pct(s.outcomes.acceptanceRate) + ' accepted' : 'no feedback yet'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
