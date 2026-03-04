import { useMemo, useState } from 'react';
import GlassCard from '../components/GlassCard';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { useApi } from '../hooks/useApi';
import { api } from '../lib/api';
import { timeAgo } from '../lib/utils';

const AGENTS = ['all', 'programmer', 'researcher', 'writer', 'architect', 'reviewer'];
const AGENT_COLORS = {
  programmer: 'var(--blue)',
  writer: 'var(--purple)',
  researcher: 'var(--amber)',
  reviewer: 'var(--green)',
  architect: 'var(--teal)',
};

function Section({ title, items, color }) {
  if (!items?.length) return null;
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: '0.62rem', fontWeight: 800, letterSpacing: '3px', color, fontFamily: 'var(--mono)', marginBottom: 8 }}>{title}</div>
      <div style={{ display: 'grid', gap: 8 }}>
        {items.map((item, i) => (
          <div key={i} style={{ border: '1px solid var(--border)', borderLeft: `3px solid ${color}`, borderRadius: 8, padding: '10px 12px', color: 'var(--text)', fontSize: '0.84rem' }}>{item}</div>
        ))}
      </div>
    </div>
  );
}

export default function Reflections() {
  const [agent, setAgent] = useState('all');
  const [selected, setSelected] = useState(null);
  const { data, loading } = useApi(() => api.reflections(agent === 'all' ? {} : { agent }));

  const reflections = useMemo(() => (Array.isArray(data) ? data : []), [data]);

  return (
    <div style={{ position: 'relative', padding: '36px 32px' }}>
      <div className="orb orb-1" style={{ position: 'fixed', zIndex: 0 }} />
      <div className="orb orb-2" style={{ position: 'fixed', zIndex: 0 }} />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ marginBottom: 26 }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '6px', color: 'var(--teal)', fontFamily: 'var(--mono)', marginBottom: 8 }}>AGENT INTELLIGENCE</div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 900 }}><span className="gradient-text">Reflections</span></h1>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 22, flexWrap: 'wrap' }}>
          {AGENTS.map(a => (
            <button key={a} className={`hud-tab ${agent === a ? 'active' : ''}`} onClick={() => setAgent(a)}>{a}</button>
          ))}
        </div>

        {loading ? (
          <div style={{ display: 'grid', gap: 10 }}>{[1,2,3].map(i => <LoadingSkeleton key={i} height={90} />)}</div>
        ) : reflections.length === 0 ? (
          <EmptyState icon="🔮" title="No reflections yet" subtitle="Reflections will appear once agents run their cycles." />
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {reflections.map((r) => (
              <GlassCard key={r.id} style={{ cursor: 'pointer' }} onClick={() => setSelected(r)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                      <Badge label={r.agentType} color={AGENT_COLORS[r.agentType] || 'var(--muted)'} dot />
                      <Badge label={r.reflectionType || 'strategic'} color="var(--blue)" />
                      <Badge label={r.status || 'unknown'} color={r.status === 'completed' ? 'var(--green)' : 'var(--muted)'} />
                    </div>
                    <div style={{ color: 'var(--muted)', fontSize: '0.84rem' }}>{r.summary || 'No summary'}</div>
                  </div>
                  <div style={{ color: 'var(--faint)', fontSize: '0.72rem', fontFamily: 'var(--mono)' }}>{timeAgo(r.createdAt)}</div>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </div>

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Reflection detail">
        {selected && (
          <div>
            <Section title="INEFFICIENCIES" items={selected.inefficiencies} color="var(--amber)" />
            <Section title="SYSTEM RISKS" items={selected.systemRisks} color="var(--red)" />
            <Section title="MISSED OPPORTUNITIES" items={selected.missedOpportunities} color="var(--blue)" />
            <Section title="IDENTITY ADJUSTMENTS" items={selected.identityAdjustments} color="var(--purple)" />
            <Section title="CONCRETE SUGGESTIONS" items={selected.concreteSuggestions} color="var(--green)" />
          </div>
        )}
      </Modal>
    </div>
  );
}
