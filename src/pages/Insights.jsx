import { useState } from 'react';
import { usePolling } from '../hooks/usePolling';
import GlassCard from '../components/GlassCard';
import { api } from '../lib/api';

export default function Insights() {
  const [window, setWindow] = useState('month');

  const { data: dashboard } = usePolling(
    (signal) => api.usageDashboard(window, signal),
    30000,
    [window]
  );

  const { data: history } = usePolling(
    (signal) => api.workerHistory(200, signal),
    30000
  );

  const runs = Array.isArray(history) ? history : (history?.runs || []);

  // Calculate success/failure rates
  const totalRuns = runs.length;
  const successfulRuns = runs.filter(r => r.succeeded).length;
  const failedRuns = totalRuns - successfulRuns;
  const successRate = totalRuns > 0 ? (successfulRuns / totalRuns) * 100 : 0;

  // Success rate per agent
  const agentStats = {};
  runs.forEach(r => {
    if (!agentStats[r.agentType]) {
      agentStats[r.agentType] = { total: 0, success: 0 };
    }
    agentStats[r.agentType].total += 1;
    if (r.succeeded) agentStats[r.agentType].success += 1;
  });

  // Model performance comparison
  const modelStats = {};
  runs.forEach(r => {
    if (!modelStats[r.model]) {
      modelStats[r.model] = { total: 0, success: 0, avgTokens: 0, totalCost: 0 };
    }
    modelStats[r.model].total += 1;
    if (r.succeeded) modelStats[r.model].success += 1;
    modelStats[r.model].avgTokens += r.totalTokens || 0;
    modelStats[r.model].totalCost += r.totalCost || 0;
  });

  Object.keys(modelStats).forEach(model => {
    modelStats[model].avgTokens = Math.round(modelStats[model].avgTokens / modelStats[model].total);
  });

  // Cost trend (last 30 days)
  const costTrend = dashboard?.costTrend || [];

  // Agent productivity (completions per agent)
  const agentProductivity = Object.entries(agentStats)
    .map(([agent, stats]) => ({
      agent,
      completions: stats.success,
      successRate: (stats.success / stats.total) * 100
    }))
    .sort((a, b) => b.completions - a.completions);

  return (
    <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '600', color: 'var(--text)', marginBottom: '8px' }}>
          Insights
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: '15px' }}>
          Performance metrics and usage analytics
        </p>
      </div>

      {/* Time Window Selector */}
      <div style={{ marginBottom: '24px', display: 'flex', gap: '12px' }}>
        {['week', 'month', 'quarter'].map(w => (
          <button
            key={w}
            onClick={() => setWindow(w)}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: window === w ? '1px solid var(--teal)' : '1px solid var(--border)',
              background: window === w ? 'var(--teal)' : 'var(--faint)',
              color: window === w ? '#fff' : 'var(--text)',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              fontFamily: 'var(--mono)',
              transition: 'all 0.2s'
            }}
          >
            {w}
          </button>
        ))}
      </div>

      {/* Overview Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <GlassCard>
          <div style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '8px', fontFamily: 'var(--mono)' }}>
            SUCCESS RATE
          </div>
          <div style={{ fontSize: '36px', fontWeight: '600', color: successRate >= 80 ? 'var(--teal)' : successRate >= 60 ? '#f59e0b' : '#ef4444' }}>
            {successRate.toFixed(1)}%
          </div>
          <div style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '4px' }}>
            {successfulRuns} of {totalRuns} runs
          </div>
        </GlassCard>

        <GlassCard>
          <div style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '8px', fontFamily: 'var(--mono)' }}>
            FAILED RUNS
          </div>
          <div style={{ fontSize: '36px', fontWeight: '600', color: failedRuns > 0 ? '#ef4444' : 'var(--teal)' }}>
            {failedRuns}
          </div>
        </GlassCard>

        <GlassCard>
          <div style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '8px', fontFamily: 'var(--mono)' }}>
            ACTIVE AGENTS
          </div>
          <div style={{ fontSize: '36px', fontWeight: '600', color: 'var(--text)' }}>
            {Object.keys(agentStats).length}
          </div>
        </GlassCard>

        <GlassCard>
          <div style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '8px', fontFamily: 'var(--mono)' }}>
            MODELS USED
          </div>
          <div style={{ fontSize: '36px', fontWeight: '600', color: 'var(--text)' }}>
            {Object.keys(modelStats).length}
          </div>
        </GlassCard>
      </div>

      {/* Agent Productivity */}
      <GlassCard style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text)', marginBottom: '16px' }}>
          Agent Productivity
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {agentProductivity.map(({ agent, completions, successRate }) => (
            <div key={agent} style={{ padding: '16px', borderRadius: '8px', background: 'var(--faint)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ 
                    fontSize: '12px', 
                    padding: '4px 10px', 
                    borderRadius: '4px', 
                    background: agent === 'programmer' ? 'var(--blue)' : agent === 'writer' ? '#a855f7' : agent === 'researcher' ? '#f59e0b' : agent === 'reviewer' ? '#10b981' : 'var(--teal)',
                    color: '#fff',
                    fontFamily: 'var(--mono)',
                    fontWeight: '600'
                  }}>
                    {agent}
                  </div>
                  <span style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text)' }}>
                    {completions} completions
                  </span>
                </div>
                <div style={{ fontSize: '14px', color: successRate >= 80 ? 'var(--teal)' : '#f59e0b', fontWeight: '600' }}>
                  {successRate.toFixed(1)}% success
                </div>
              </div>
              {/* Progress bar */}
              <div style={{ width: '100%', height: '6px', borderRadius: '3px', background: 'var(--border)', overflow: 'hidden' }}>
                <div style={{ width: `${successRate}%`, height: '100%', background: successRate >= 80 ? 'var(--teal)' : '#f59e0b', transition: 'width 0.3s' }} />
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Model Performance Comparison */}
      <GlassCard>
        <div style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text)', marginBottom: '16px' }}>
          Model Performance Comparison
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {Object.entries(modelStats)
            .sort((a, b) => b[1].total - a[1].total)
            .map(([model, stats]) => {
              const rate = (stats.success / stats.total) * 100;
              return (
                <div key={model} style={{ padding: '16px', borderRadius: '8px', background: 'var(--faint)', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text)', fontFamily: 'var(--mono)' }}>
                      {model}
                    </div>
                    <div style={{ fontSize: '14px', color: rate >= 80 ? 'var(--teal)' : '#f59e0b', fontWeight: '600' }}>
                      {rate.toFixed(1)}% success
                    </div>
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--muted)', fontFamily: 'var(--mono)', display: 'flex', gap: '16px' }}>
                    <span>{stats.total} runs</span>
                    <span>•</span>
                    <span>{(stats.avgTokens / 1000).toFixed(1)}K avg tokens</span>
                    <span>•</span>
                    <span>${stats.totalCost.toFixed(3)} total</span>
                  </div>
                </div>
              );
            })}
        </div>
      </GlassCard>
    </div>
  );
}
