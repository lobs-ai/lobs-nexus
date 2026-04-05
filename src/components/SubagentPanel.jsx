import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../lib/api';

// Phase badge colors
const PHASE_STYLES = {
  running:      { bg: 'rgba(45,212,191,0.15)',  color: 'var(--teal)',  label: 'running' },
  waiting_llm:  { bg: 'rgba(245,158,11,0.15)',  color: '#f59e0b',     label: 'waiting' },
  calling_tool: { bg: 'rgba(99,102,241,0.15)',  color: '#818cf8',     label: 'tool' },
  error:        { bg: 'rgba(239,68,68,0.15)',   color: '#ef4444',     label: 'error' },
  done:         { bg: 'rgba(107,114,128,0.15)', color: '#9ca3af',     label: 'done' },
  stopped:      { bg: 'rgba(107,114,128,0.15)', color: '#9ca3af',     label: 'stopped' },
};

function PhaseBadge({ phase }) {
  const s = PHASE_STYLES[phase] || PHASE_STYLES.running;
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 7px',
      borderRadius: 4,
      fontSize: '0.65rem',
      fontFamily: 'var(--mono)',
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '0.04em',
      background: s.bg,
      color: s.color,
    }}>
      {s.label}
    </span>
  );
}

function formatAge(ts) {
  if (!ts) return '—';
  const secs = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (secs < 60) return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  return `${Math.floor(secs / 3600)}h ago`;
}

function formatCost(cost) {
  if (cost == null) return null;
  return `$${Number(cost).toFixed(4)}`;
}

function AgentRow({ agent, onStop }) {
  const [stopping, setStopping] = useState(false);

  const handleStop = async (e) => {
    e.stopPropagation();
    if (stopping) return;
    setStopping(true);
    try {
      await onStop(agent.id || agent.agentId);
    } catch {
      // silently revert; polling will update state
    } finally {
      setStopping(false);
    }
  };

  const isActive = agent.phase !== 'done' && agent.phase !== 'stopped' && agent.phase !== 'error';
  const cost = formatCost(agent.cost ?? agent.totalCost);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: 10,
      padding: '8px 10px',
      borderRadius: 7,
      background: 'rgba(0,0,0,0.2)',
      border: `1px solid ${isActive ? 'rgba(45,212,191,0.15)' : 'var(--border)'}`,
    }}>
      {/* Status dot */}
      <div style={{
        marginTop: 3,
        width: 7,
        height: 7,
        borderRadius: '50%',
        flexShrink: 0,
        background: isActive ? 'var(--teal)' : '#6b7280',
        ...(isActive && { animation: 'pulse 2s infinite' }),
      }} />

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Top row: name + phase badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
          <span style={{
            fontFamily: 'var(--mono)',
            fontSize: '0.75rem',
            fontWeight: 600,
            color: 'var(--foreground)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {agent.name || agent.agentType || 'agent'}
          </span>
          <PhaseBadge phase={agent.phase || 'running'} />
        </div>

        {/* Task description */}
        {agent.task && (
          <div style={{
            fontFamily: 'var(--mono)',
            fontSize: '0.68rem',
            color: 'var(--muted)',
            opacity: 0.8,
            marginBottom: 4,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {agent.task}
          </div>
        )}

        {/* Stats row */}
        <div style={{
          display: 'flex',
          gap: 12,
          flexWrap: 'wrap',
          fontFamily: 'var(--mono)',
          fontSize: '0.63rem',
          color: 'var(--muted)',
          opacity: 0.65,
        }}>
          {agent.turns != null && (
            <span>{agent.turns} turn{agent.turns !== 1 ? 's' : ''}</span>
          )}
          {cost && <span>{cost}</span>}
          {(agent.lastActivity || agent.updatedAt) && (
            <span>{formatAge(agent.lastActivity || agent.updatedAt)}</span>
          )}
          {agent.model && (
            <span style={{ opacity: 0.6 }}>{agent.model}</span>
          )}
        </div>
      </div>

      {/* Stop button — only for active agents */}
      {isActive && (
        <button
          onClick={handleStop}
          disabled={stopping}
          title="Stop agent"
          style={{
            flexShrink: 0,
            marginTop: 1,
            padding: '3px 8px',
            borderRadius: 5,
            border: '1px solid rgba(239,68,68,0.3)',
            background: stopping ? 'rgba(239,68,68,0.05)' : 'transparent',
            color: stopping ? '#9ca3af' : '#ef4444',
            cursor: stopping ? 'default' : 'pointer',
            fontSize: '0.65rem',
            fontFamily: 'var(--mono)',
            fontWeight: 600,
            transition: 'all 0.15s ease',
            lineHeight: 1,
          }}
          onMouseEnter={e => { if (!stopping) e.currentTarget.style.background = 'rgba(239,68,68,0.12)'; }}
          onMouseLeave={e => { if (!stopping) e.currentTarget.style.background = 'transparent'; }}
        >
          {stopping ? '…' : 'stop'}
        </button>
      )}
    </div>
  );
}

/**
 * SubagentPanel — polls /api/agents and shows live subagent status.
 *
 * Props:
 *   sessionId  — optional, if provided filters agents by parent session
 *   compact    — boolean, for inline-in-tool-step use (default true)
 */
export default function SubagentPanel({ sessionId, compact = true }) {
  const [agents, setAgents] = useState(null);   // null = loading, [] = empty
  const [error, setError] = useState(null);
  const [lastFetch, setLastFetch] = useState(null);
  const abortRef = useRef(null);

  const fetchAgents = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const data = await api.agents(controller.signal);
      if (controller.signal.aborted) return;

      // Normalise: API may return { agents: [...] } or plain array
      let list = Array.isArray(data) ? data : (data?.agents || []);

      // Filter to current session if provided
      if (sessionId) {
        list = list.filter(a =>
          a.sessionId === sessionId || a.session_id === sessionId || a.parentSessionId === sessionId
        );
      }

      setAgents(list);
      setLastFetch(Date.now());
      setError(null);
    } catch (e) {
      if (e.name === 'AbortError') return;
      setError(e.message || 'Failed to load agents');
    }
  }, [sessionId]);

  useEffect(() => {
    fetchAgents();
    const id = setInterval(fetchAgents, 3000);
    return () => {
      clearInterval(id);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [fetchAgents]);

  const handleStop = async (agentId) => {
    await api.stopAgent(agentId);
    // Optimistically mark as stopped, then let next poll correct
    setAgents(prev => prev?.map(a =>
      (a.id === agentId || a.agentId === agentId)
        ? { ...a, phase: 'stopped' }
        : a
    ));
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  const containerStyle = {
    marginTop: compact ? 10 : 20,
    padding: compact ? '10px 12px' : '16px 18px',
    borderRadius: 8,
    background: 'rgba(45,212,191,0.03)',
    border: '1px solid rgba(45,212,191,0.12)',
  };

  const headerStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: agents && agents.length > 0 ? 8 : 0,
  };

  const titleStyle = {
    fontFamily: 'var(--mono)',
    fontSize: '0.65rem',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: 'var(--teal)',
    opacity: 0.8,
    fontWeight: 600,
  };

  // Loading state (first fetch only)
  if (agents === null && !error) {
    return (
      <div style={containerStyle}>
        <div style={{ ...titleStyle, marginBottom: 0 }}>Subagents</div>
        <div style={{
          marginTop: 8,
          fontFamily: 'var(--mono)',
          fontSize: '0.68rem',
          color: 'var(--muted)',
          opacity: 0.5,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <span style={{
            display: 'inline-block',
            width: 10,
            height: 10,
            border: '2px solid var(--teal)',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
          Loading…
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div style={containerStyle}>
        <div style={headerStyle}>
          <div style={titleStyle}>Subagents</div>
          <button
            onClick={fetchAgents}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--teal)',
              cursor: 'pointer',
              fontSize: '0.65rem',
              fontFamily: 'var(--mono)',
              padding: '2px 4px',
            }}
          >
            retry
          </button>
        </div>
        <div style={{
          fontFamily: 'var(--mono)',
          fontSize: '0.68rem',
          color: '#ef4444',
          opacity: 0.7,
        }}>
          {error}
        </div>
      </div>
    );
  }

  // Empty state
  if (!agents || agents.length === 0) {
    return (
      <div style={containerStyle}>
        <div style={headerStyle}>
          <div style={titleStyle}>Subagents</div>
        </div>
        <div style={{
          fontFamily: 'var(--mono)',
          fontSize: '0.68rem',
          color: 'var(--muted)',
          opacity: 0.4,
        }}>
          No active subagents
        </div>
      </div>
    );
  }

  const activeCount = agents.filter(a => a.phase !== 'done' && a.phase !== 'stopped' && a.phase !== 'error').length;

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={titleStyle}>Subagents</div>
          {activeCount > 0 && (
            <span style={{
              fontFamily: 'var(--mono)',
              fontSize: '0.63rem',
              color: 'var(--teal)',
              background: 'rgba(45,212,191,0.1)',
              padding: '1px 6px',
              borderRadius: 4,
              fontWeight: 600,
            }}>
              {activeCount} active
            </span>
          )}
        </div>
        {lastFetch && (
          <span style={{
            fontFamily: 'var(--mono)',
            fontSize: '0.6rem',
            color: 'var(--muted)',
            opacity: 0.4,
          }}>
            updated {formatAge(lastFetch)}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {agents.map((agent, idx) => (
          <AgentRow
            key={agent.id || agent.agentId || idx}
            agent={agent}
            onStop={handleStop}
          />
        ))}
      </div>
    </div>
  );
}
