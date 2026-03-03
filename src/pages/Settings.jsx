import GlassCard from '../components/GlassCard';
import Badge from '../components/Badge';
import { useApi } from '../hooks/useApi';
import { api } from '../lib/api';
import { formatUptime, TIER_COLORS } from '../lib/utils';

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ color: 'var(--muted)', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 12 }}>{title}</div>
      <GlassCard>{children}</GlassCard>
    </div>
  );
}

function Row({ label, value, mono, color }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>{label}</span>
      <span style={{ color: color || 'var(--text)', fontSize: '0.85rem', fontFamily: mono ? 'var(--mono)' : undefined }}>{value ?? '--'}</span>
    </div>
  );
}

const MODEL_TIERS = [
  { tier: 'micro', desc: 'Local model (Qwen)', cost: 'Free', use: 'Simple tasks' },
  { tier: 'small', desc: 'Sonnet', cost: '$0.003/1K', use: 'Balanced' },
  { tier: 'medium', desc: 'Sonnet', cost: '$0.003/1K', use: 'Balanced' },
  { tier: 'standard', desc: 'Codex/Sonnet', cost: '$0.015/1K', use: 'Default' },
  { tier: 'strong', desc: 'Opus', cost: '$0.075/1K', use: 'Complex tasks' },
];

export default function Settings() {
  const { data: statusData } = useApi(() => api.status());
  const { data: orchData } = useApi(() => api.orchestratorStatus());

  const server = statusData?.server || {};
  const orch = orchData?.settings || orchData?.orchestrator || orchData || {};
  const integrations = statusData?.integrations || {};
  const db = statusData?.db || statusData?.database || {};

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <span className="section-label">Configuration</span>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-1px' }}>
          <span className="gradient-text">Settings</span>
        </h1>
        <p style={{ color: 'var(--muted)' }}>System configuration and status</p>
      </div>

      {/* Orchestrator */}
      <Section title="Orchestrator">
        <Row label="Scan Interval" value={orch.scanInterval != null ? `${orch.scanInterval}s` : (orch.scan_interval != null ? `${orch.scan_interval}s` : '10s')} mono />
        <Row label="Max Workers" value={orch.maxWorkers ?? orch.max_workers ?? 2} />
        <Row label="Worker Timeout" value={orch.workerTimeout != null ? `${orch.workerTimeout}s` : (orch.worker_timeout != null ? `${orch.worker_timeout}s` : '900s')} mono />
        <Row label="Active Tasks" value={statusData?.tasks?.active} />
        <Row label="Queue" value={statusData?.tasks?.waiting ?? 0} />
        <Row
          label="Status"
          value={orchData?.status || 'running'}
          color={orchData?.status === 'running' ? 'var(--green)' : 'var(--amber)'}
        />
      </Section>

      {/* Models */}
      <Section title="Model Tiers">
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Tier', 'Model', 'Est. Cost', 'Use Case'].map(h => (
                  <th key={h} style={{ color: 'var(--muted)', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', padding: '0 12px 10px', textAlign: 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MODEL_TIERS.map(t => (
                <tr key={t.tier} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <td style={{ padding: '10px 12px' }}>
                    <Badge label={t.tier} color={TIER_COLORS[t.tier] || 'var(--muted)'} />
                  </td>
                  <td style={{ padding: '10px 12px', color: 'var(--text)', fontSize: '0.85rem' }}>{t.desc}</td>
                  <td style={{ padding: '10px 12px', color: 'var(--teal)', fontSize: '0.82rem', fontFamily: 'var(--mono)' }}>{t.cost}</td>
                  <td style={{ padding: '10px 12px', color: 'var(--muted)', fontSize: '0.82rem' }}>{t.use}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Integrations */}
      <Section title="Integrations">
        {Object.keys(integrations).length === 0 ? (
          <div style={{ color: 'var(--muted)', fontSize: '0.85rem', padding: '8px 0' }}>No integration data available</div>
        ) : Object.entries(integrations).map(([name, info]) => {
          const connected = info === true || info?.connected === true || info?.status === 'connected';
          return (
            <div key={name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <span style={{ color: 'var(--text)', fontSize: '0.85rem', textTransform: 'capitalize' }}>{name}</span>
              <Badge label={connected ? 'connected' : 'disconnected'} color={connected ? 'var(--green)' : 'var(--red)'} dot />
            </div>
          );
        })}
        {/* Always show some known integrations */}
        {Object.keys(integrations).length === 0 && (
          <div style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>Connect integrations via the PAW plugin config.</div>
        )}
      </Section>

      {/* System */}
      <Section title="System">
        <Row label="Version" value={server.version || statusData?.version || '--'} mono />
        <Row label="Uptime" value={formatUptime(server.uptime_seconds || server.uptimeSeconds)} />
        <Row label="Status" value={server.status || 'unknown'} color={server.status === 'healthy' ? 'var(--green)' : 'var(--amber)'} />
        <Row label="DB Path" value={db.path || '~/.openclaw/plugins/paw/paw.db'} mono />
        <Row label="DB Size" value={db.size_bytes ? `${Math.round(db.size_bytes / 1024)} KB` : '--'} mono />
        <Row label="Environment" value={server.environment || server.env || 'production'} />
      </Section>
    </div>
  );
}
