import { useState } from 'react';
import GlassCard from '../components/GlassCard';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { useApi } from '../hooks/useApi';
import { api } from '../lib/api';
import { timeAgo } from '../lib/utils';

const AGENT_COLORS = {
  programmer: 'var(--blue)',
  writer: 'var(--purple)',
  researcher: 'var(--amber)',
  reviewer: 'var(--green)',
  architect: 'var(--teal)',
};

const AGENT_ICONS = {
  programmer: '💻',
  writer: '✍️',
  researcher: '🔬',
  reviewer: '🔍',
  architect: '🏗️',
};

const ALL_AGENTS = ['programmer', 'researcher', 'writer', 'architect', 'reviewer'];

function pluralize(n, singular, plural) {
  return n === 1 ? `${n} ${singular}` : `${n} ${plural}`;
}


function getResultText(result) {
  if (!result) return '';
  if (typeof result === 'string') return result;
  if (typeof result.summary === 'string') return result.summary;
  // Build a summary from findings count
  const parts = [];
  if (result.inefficiencies?.length) parts.push(result.inefficiencies.length + ' inefficienc' + (result.inefficiencies.length !== 1 ? 'ies' : 'y'));
  if (result.systemRisks?.length) parts.push(result.systemRisks.length + ' risk' + (result.systemRisks.length !== 1 ? 's' : ''));
  if (result.missedOpportunities?.length) parts.push(result.missedOpportunities.length + ' missed opportunit' + (result.missedOpportunities.length !== 1 ? 'ies' : 'y'));
  if (result.concreteSuggestions?.length) parts.push(result.concreteSuggestions.length + ' suggestion' + (result.concreteSuggestions.length !== 1 ? 's' : ''));
  if (parts.length > 0) return 'Found ' + parts.join(', ') + '.';
  return '';
}

function getResultFindings(result) {
  if (!result || typeof result === 'string') return {};
  return {
    inefficiencies: result.inefficiencies,
    systemRisks: result.systemRisks,
    missedOpportunities: result.missedOpportunities,
    concreteSuggestions: result.concreteSuggestions,
    identityAdjustments: result.identityAdjustments,
  };
}

function FindingSection({ label, items, color }) {
  if (!items || items.length === 0) return null;
  const list = Array.isArray(items) ? items : (typeof items === 'string' ? [items] : []);
  if (list.length === 0) return null;
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: '0.62rem', fontWeight: 800, letterSpacing: '3px', color, fontFamily: 'var(--mono)', marginBottom: 10, opacity: 0.8 }}>{label}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {list.map((item, i) => (
          <div key={i} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderLeft: `3px solid ${color}`, borderRadius: 8, padding: '10px 14px' }}>
            <div style={{ color: 'var(--text)', fontSize: '0.85rem', lineHeight: 1.6 }}>{item}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReflectionCard({ reflection, onClick }) {
  const agentColor = AGENT_COLORS[reflection.agentType] || 'var(--muted)';
  const agentIcon = AGENT_ICONS[reflection.agentType] || '🤖';

  const firstFinding = reflection.inefficiencies?.[0] || reflection.systemRisks?.[0] || reflection.missedOpportunities?.[0] || getResultText(reflection.result);
  const preview = typeof firstFinding === 'string' ? firstFinding.slice(0, 160) + (firstFinding.length > 160 ? '…' : '') : 'No findings';

  const rf = getResultFindings(reflection.result);
  const inefficiencies = reflection.inefficiencies?.length ? reflection.inefficiencies : rf.inefficiencies;
  const systemRisks = reflection.systemRisks?.length ? reflection.systemRisks : rf.systemRisks;
  const missedOpportunities = reflection.missedOpportunities?.length ? reflection.missedOpportunities : rf.missedOpportunities;
  const concreteSuggestions = rf.concreteSuggestions;
  const identityAdjustments = reflection.identityAdjustments?.length ? reflection.identityAdjustments : rf.identityAdjustments;
  const totalFindings =
    (inefficiencies?.length || 0) +
    (systemRisks?.length || 0) +
    (missedOpportunities?.length || 0) +
    (concreteSuggestions?.length || 0) +
    (identityAdjustments?.length || 0);

  return (
    <GlassCard style={{ marginBottom: 0, cursor: 'pointer', transition: 'border-color 0.15s' }} onClick={onClick}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: agentColor + '15', border: `1px solid ${agentColor}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>
          {agentIcon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ color: agentColor, fontSize: '0.8rem', fontWeight: 800, fontFamily: 'var(--mono)', textTransform: 'uppercase' }}>{reflection.agentType || 'Unknown'}</span>
              {reflection.reflectionType && <Badge label={reflection.reflectionType} color={agentColor} />}
            </div>
            <span style={{ color: 'var(--faint)', fontSize: '0.7rem', fontFamily: 'var(--mono)', flexShrink: 0 }}>{timeAgo(reflection.completedAt || reflection.createdAt)}</span>
          </div>
          <div style={{ color: 'var(--muted)', fontSize: '0.82rem', lineHeight: 1.5, marginBottom: 8, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{preview}</div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {inefficiencies?.length > 0 && (
              <span style={{ color: 'var(--amber)', fontSize: '0.72rem', fontFamily: 'var(--mono)' }}>⚠ {pluralize(inefficiencies.length, 'inefficiency', 'inefficiencies')}</span>
            )}
            {systemRisks?.length > 0 && (
              <span style={{ color: 'var(--red)', fontSize: '0.72rem', fontFamily: 'var(--mono)' }}>🔴 {pluralize(systemRisks.length, 'risk', 'risks')}</span>
            )}
            {missedOpportunities?.length > 0 && (
              <span style={{ color: 'var(--blue)', fontSize: '0.72rem', fontFamily: 'var(--mono)' }}>💡 {pluralize(missedOpportunities.length, 'opportunity', 'opportunities')}</span>
            )}
            {concreteSuggestions?.length > 0 && (
              <span style={{ color: 'var(--green)', fontSize: '0.72rem', fontFamily: 'var(--mono)' }}>✅ {pluralize(concreteSuggestions.length, 'suggestion', 'suggestions')}</span>
            )}
            {identityAdjustments?.length > 0 && (
              <span style={{ color: 'var(--purple)', fontSize: '0.72rem', fontFamily: 'var(--mono)' }}>🔧 {pluralize(identityAdjustments.length, 'adjustment', 'adjustments')}</span>
            )}
            {totalFindings === 0 && (
              <span style={{ color: 'var(--faint)', fontSize: '0.72rem', fontFamily: 'var(--mono)' }}>No structured findings</span>
            )}
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

function ReflectionDetail({ reflection, onClose }) {
  if (!reflection) return null;
  const agentColor = AGENT_COLORS[reflection.agentType] || 'var(--muted)';
  const agentIcon = AGENT_ICONS[reflection.agentType] || '🤖';
  const agentName = (reflection.agentType || 'agent').charAt(0).toUpperCase() + (reflection.agentType || 'agent').slice(1);

  const rf = getResultFindings(reflection.result);
  const inefficiencies = reflection.inefficiencies?.length ? reflection.inefficiencies : rf.inefficiencies;
  const systemRisks = reflection.systemRisks?.length ? reflection.systemRisks : rf.systemRisks;
  const missedOpportunities = reflection.missedOpportunities?.length ? reflection.missedOpportunities : rf.missedOpportunities;
  const concreteSuggestions = rf.concreteSuggestions;
  const identityAdjustments = reflection.identityAdjustments?.length ? reflection.identityAdjustments : rf.identityAdjustments;

  return (
    <Modal open onClose={onClose} title={`${agentIcon} ${agentName} Reflection`}>
      <div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
          <Badge label={reflection.agentType} color={agentColor} dot />
          {reflection.reflectionType && <Badge label={reflection.reflectionType} color={agentColor} />}
          {reflection.status && <Badge label={reflection.status} color={reflection.status === 'completed' ? 'var(--green)' : 'var(--muted)'} />}
          <span style={{ color: 'var(--faint)', fontSize: '0.72rem', marginLeft: 'auto', fontFamily: 'var(--mono)' }}>{timeAgo(reflection.completedAt || reflection.createdAt)}</span>
        </div>

        {getResultText(reflection.result) && (
          <div style={{ background: 'rgba(11,15,30,0.6)', border: '1px solid var(--border)', borderRadius: 10, padding: 20, marginBottom: 20, maxHeight: 200, overflowY: 'auto' }}>
            <div style={{ fontSize: '0.62rem', fontWeight: 800, letterSpacing: '3px', color: agentColor, fontFamily: 'var(--mono)', marginBottom: 10, opacity: 0.8 }}>SUMMARY</div>
            <div style={{ color: 'var(--text)', fontSize: '0.88rem', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{getResultText(reflection.result)}</div>
          </div>
        )}

        <FindingSection label="INEFFICIENCIES" items={inefficiencies} color="var(--amber)" />
        <FindingSection label="SYSTEM RISKS" items={systemRisks} color="var(--red, #ef4444)" />
        <FindingSection label="MISSED OPPORTUNITIES" items={missedOpportunities} color="var(--blue)" />
        <FindingSection label="CONCRETE SUGGESTIONS" items={concreteSuggestions} color="var(--green)" />
        <FindingSection label="IDENTITY ADJUSTMENTS" items={identityAdjustments} color="var(--purple)" />

        {(reflection.windowStart || reflection.windowEnd) && (
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, marginTop: 14 }}>
            <div style={{ color: 'var(--faint)', fontSize: '0.72rem', fontFamily: 'var(--mono)' }}>
              Window: {reflection.windowStart ? new Date(reflection.windowStart).toLocaleString() : '?'} → {reflection.windowEnd ? new Date(reflection.windowEnd).toLocaleString() : '?'}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

export default function Reflections() {
  const { data, loading } = useApi(() => api.reflections());
  const [agentFilter, setAgentFilter] = useState('all');
  const [selected, setSelected] = useState(null);

  const allReflections = data?.reflections || data?.agent_reflections || (Array.isArray(data) ? data : []);

  const sorted = [...allReflections].sort((a, b) => {
    const ta = a.completedAt || a.createdAt || '';
    const tb = b.completedAt || b.createdAt || '';
    return tb.localeCompare(ta);
  });

  const filtered = agentFilter === 'all'
    ? sorted
    : sorted.filter(r => r.agentType === agentFilter);

  const agentCounts = {};
  allReflections.forEach(r => {
    const agent = r.agentType || 'unknown';
    agentCounts[agent] = (agentCounts[agent] || 0) + 1;
  });

  return (
    <div style={{ position: 'relative', padding: '36px 32px' }}>
      <div className="orb orb-1" style={{ position: 'fixed', zIndex: 0 }} />
      <div className="orb orb-2" style={{ position: 'fixed', zIndex: 0 }} />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div className="fade-in-up" style={{ marginBottom: 36 }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '6px', color: 'var(--teal)', fontFamily: 'var(--mono)', marginBottom: 8, opacity: 0.8 }}>AGENT INTELLIGENCE</div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 900, letterSpacing: '-1.5px' }}><span className="gradient-text">Reflections</span></h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginTop: 4 }}>
            {loading ? 'Loading...' : `${allReflections.length} reflection${allReflections.length !== 1 ? 's' : ''} logged`}
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 28, flexWrap: 'wrap' }}>
          <button className={`hud-tab ${agentFilter === 'all' ? 'active' : ''}`} onClick={() => setAgentFilter('all')}>
            All
            {allReflections.length > 0 && <span style={{ marginLeft: 6, background: 'var(--teal)', color: '#0b0f1e', borderRadius: 10, padding: '1px 6px', fontSize: '0.65rem', fontWeight: 800 }}>{allReflections.length}</span>}
          </button>
          {ALL_AGENTS.filter(a => agentCounts[a] > 0 || agentFilter === a).map(agent => (
            <button key={agent} className={`hud-tab ${agentFilter === agent ? 'active' : ''}`} onClick={() => setAgentFilter(agent)}>
              {AGENT_ICONS[agent]} {agent}
              {agentCounts[agent] > 0 && <span style={{ marginLeft: 6, background: AGENT_COLORS[agent], color: '#0b0f1e', borderRadius: 10, padding: '1px 6px', fontSize: '0.65rem', fontWeight: 800 }}>{agentCounts[agent]}</span>}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1,2,3,4].map(i => <LoadingSkeleton key={i} height={90} />)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon="🔮" title="No reflections yet" subtitle={agentFilter !== 'all' ? `No reflections from ${agentFilter} agent` : 'Agent reflections will appear here'} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map((r, i) => (
              <div key={r.id || i} className={`fade-in-up-${Math.min(i + 1, 6)}`}>
                <ReflectionCard reflection={r} onClick={() => setSelected(r)} />
              </div>
            ))}
          </div>
        )}
      </div>

      {selected && <ReflectionDetail reflection={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
