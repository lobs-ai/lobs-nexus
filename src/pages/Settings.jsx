import GlassCard from '../components/GlassCard';
import Badge from '../components/Badge';
import { useApi } from '../hooks/useApi';
import { api } from '../lib/api';
import { formatUptime, TIER_COLORS } from '../lib/utils';

function Row({ label, value, mono, color }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid rgba(45,212,191,0.04)' }}>
      <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>{label}</span>
      <span style={{ color: color || 'var(--text)', fontSize: '0.85rem', fontFamily: mono ? 'var(--mono)' : undefined, fontWeight: mono ? 600 : 400 }}>{value ?? '--'}</span>
    </div>
  );
}

const MODEL_TIERS = [
  { tier: 'micro', desc: 'Local Model (varies by size)', cost: 'Free', use: 'Simple tasks' },
  { tier: 'small', desc: 'Claude Sonnet', cost: '~$0.003/1K', use: 'Light work' },
  { tier: 'medium', desc: 'Claude Haiku', cost: '~$0.001/1K', use: 'Fast + cheap' },
  { tier: 'standard', desc: 'Claude Sonnet / Codex', cost: '~$0.003-0.015/1K', use: 'Default' },
  { tier: 'strong', desc: 'Claude Opus', cost: '~$0.075/1K', use: 'Complex reasoning' },
];

export default function Settings() {
  const { data: statusData } = useApi(signal => api.status(signal));
  const { data: orchData } = useApi(signal => api.orchestratorStatus(signal));

  const server = statusData?.server || {};
  const orch = orchData?.settings || orchData?.orchestrator || orchData || {};
  const db = statusData?.db || statusData?.database || {};

  return (
    <div style={{ position: 'relative', padding: '36px 32px' }}>
      <div className="orb orb-1" style={{ position: 'fixed', zIndex: 0 }} />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div className="fade-in-up" style={{ marginBottom: 36 }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '6px', color: 'var(--teal)', fontFamily: 'var(--mono)', marginBottom: 8, opacity: 0.8 }}>CONFIGURATION</div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 900, letterSpacing: '-1.5px' }}><span className="gradient-text">Settings</span></h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginTop: 4 }}>System configuration and status</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <GlassCard className="fade-in-up-1">
            <div className="section-label" style={{ marginBottom: 4 }}>Control Loop</div>
            <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 16 }}>Orchestrator</h3>
            <Row label="Scan Interval" value={orch.scanInterval ?? orch.scan_interval ?? '10s'} mono />
            <Row label="Max Workers" value={orch.maxWorkers ?? orch.max_workers ?? 2} />
            <Row label="Worker Timeout" value={`${orch.workerTimeout ?? orch.worker_timeout ?? 900}s`} mono />
            <Row label="Active Tasks" value={statusData?.tasks?.active} color="var(--teal)" />
            <Row label="Queue" value={statusData?.tasks?.waiting ?? 0} />
            <Row label="Status" value={orchData?.status || 'running'} color={orchData?.status === 'running' ? 'var(--green)' : 'var(--amber)'} />
          </GlassCard>

          <GlassCard className="fade-in-up-2">
            <div className="section-label" style={{ marginBottom: 4 }}>Runtime</div>
            <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 16 }}>System</h3>
            <Row label="Version" value={server.version || statusData?.version || '0.1.0'} mono />
            <Row label="Uptime" value={formatUptime(server.uptime_seconds || server.uptimeSeconds)} color="var(--teal)" />
            <Row label="Status" value={server.status || 'unknown'} color={server.status === 'healthy' ? 'var(--green)' : 'var(--amber)'} />
            <Row label="DB Path" value="paw.db" mono />
            <Row label="DB Size" value={db.size_bytes ? `${Math.round(db.size_bytes / 1024)} KB` : '--'} mono />
            <Row label="Environment" value={server.environment || 'production'} />
          </GlassCard>
        </div>

        <GlassCard className="fade-in-up-3" style={{ marginTop: 24 }}>
          <div className="section-label" style={{ marginBottom: 4 }}>Model Router</div>
          <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 20 }}>Model Tiers</h3>
          <table className="hud-table">
            <thead><tr>
              {['Tier', 'Model', 'Est. Cost', 'Use Case'].map(h => <th key={h}>{h}</th>)}
            </tr></thead>
            <tbody>
              {MODEL_TIERS.map(t => (
                <tr key={t.tier}>
                  <td><Badge label={t.tier} color={TIER_COLORS[t.tier] || 'var(--muted)'} /></td>
                  <td style={{ fontFamily: 'var(--mono)', fontSize: '0.82rem' }}>{t.desc}</td>
                  <td style={{ color: 'var(--teal)', fontFamily: 'var(--mono)', fontSize: '0.82rem' }}>{t.cost}</td>
                  <td style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>{t.use}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </GlassCard>
      </div>
    </div>
  );
}
