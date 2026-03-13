import { usePolling } from '../hooks/usePolling';
import GlassCard from '../components/GlassCard';
import { api } from '../lib/api';

export default function Usage() {
  const { data: history } = usePolling(
    (signal) => api.workerHistory(100, signal),
    20000
  );

  const runs = Array.isArray(history) ? history : (history?.runs || []);

  // Calculate totals
  const totalTokens = runs.reduce((sum, r) => sum + (r.totalTokens || 0), 0);
  const totalCost = runs.reduce((sum, r) => sum + (r.totalCost || 0), 0);

  // Today's spend
  const today = new Date();
  const todayRuns = runs.filter(r => {
    const startTime = new Date(r.startedAt);
    return startTime.toDateString() === today.toDateString();
  });
  const todaySpend = todayRuns.reduce((sum, r) => sum + (r.totalCost || 0), 0);
  const dailyBudget = 5.0; // $5/day budget

  // Cost per agent type
  const agentCosts = {};
  runs.forEach(r => {
    if (!agentCosts[r.agentType]) {
      agentCosts[r.agentType] = { cost: 0, runs: 0 };
    }
    agentCosts[r.agentType].cost += r.totalCost || 0;
    agentCosts[r.agentType].runs += 1;
  });

  // Model usage breakdown
  const modelUsage = {};
  runs.forEach(r => {
    if (!modelUsage[r.model]) {
      modelUsage[r.model] = { tokens: 0, cost: 0, runs: 0 };
    }
    modelUsage[r.model].tokens += r.totalTokens || 0;
    modelUsage[r.model].cost += r.totalCost || 0;
    modelUsage[r.model].runs += 1;
  });

  // Cost per day (last 7 days)
  const last7Days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toDateString();
    const dayRuns = runs.filter(r => new Date(r.startedAt).toDateString() === dateStr);
    const dayCost = dayRuns.reduce((sum, r) => sum + (r.totalCost || 0), 0);
    last7Days.push({
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      cost: dayCost
    });
  }

  const maxDayCost = Math.max(...last7Days.map(d => d.cost), 0.01);

  return (
    <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '600', color: 'var(--text)', marginBottom: '8px' }}>
          Usage
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: '15px' }}>
          Token consumption and cost tracking
        </p>
      </div>

      {/* Overview Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <GlassCard>
          <div style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '8px', fontFamily: 'var(--mono)' }}>
            TOTAL TOKENS
          </div>
          <div style={{ fontSize: '36px', fontWeight: '600', color: 'var(--text)' }}>
            {(totalTokens / 1000000).toFixed(2)}M
          </div>
        </GlassCard>

        <GlassCard>
          <div style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '8px', fontFamily: 'var(--mono)' }}>
            TOTAL COST
          </div>
          <div style={{ fontSize: '36px', fontWeight: '600', color: 'var(--text)' }}>
            ${totalCost.toFixed(2)}
          </div>
        </GlassCard>

        <GlassCard>
          <div style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '8px', fontFamily: 'var(--mono)' }}>
            TODAY'S SPEND
          </div>
          <div style={{ fontSize: '36px', fontWeight: '600', color: todaySpend > dailyBudget ? '#ef4444' : 'var(--teal)' }}>
            ${todaySpend.toFixed(3)}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '4px' }}>
            of ${dailyBudget.toFixed(2)} daily budget
          </div>
        </GlassCard>

        <GlassCard>
          <div style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '8px', fontFamily: 'var(--mono)' }}>
            TOTAL RUNS
          </div>
          <div style={{ fontSize: '36px', fontWeight: '600', color: 'var(--text)' }}>
            {runs.length}
          </div>
        </GlassCard>
      </div>

      {/* Cost per Day Chart */}
      <GlassCard style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text)', marginBottom: '20px' }}>
          Cost per Day (Last 7 Days)
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', height: '200px' }}>
          {last7Days.map((day, idx) => (
            <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
              <div style={{ 
                width: '100%', 
                background: 'var(--teal)', 
                borderRadius: '4px 4px 0 0',
                height: `${(day.cost / maxDayCost) * 80}%`,
                minHeight: day.cost > 0 ? '4px' : '0',
                transition: 'height 0.3s'
              }} />
              <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '8px', fontFamily: 'var(--mono)' }}>
                {day.date}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text)', marginTop: '4px', fontWeight: '600' }}>
                ${day.cost.toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Cost per Agent Type */}
      <GlassCard style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text)', marginBottom: '16px' }}>
          Cost per Agent Type
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {Object.entries(agentCosts)
            .sort((a, b) => b[1].cost - a[1].cost)
            .map(([agent, data]) => (
              <div key={agent} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', borderRadius: '6px', background: 'var(--faint)' }}>
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
                  <span style={{ fontSize: '13px', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
                    {data.runs} runs
                  </span>
                </div>
                <div style={{ fontSize: '15px', color: 'var(--text)', fontWeight: '600' }}>
                  ${data.cost.toFixed(3)}
                </div>
              </div>
            ))}
        </div>
      </GlassCard>

      {/* Model Usage Breakdown */}
      <GlassCard>
        <div style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text)', marginBottom: '16px' }}>
          Model Usage Breakdown
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {Object.entries(modelUsage)
            .sort((a, b) => b[1].cost - a[1].cost)
            .map(([model, data]) => (
              <div key={model} style={{ padding: '16px', borderRadius: '8px', background: 'var(--faint)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text)', fontFamily: 'var(--mono)' }}>
                    {model}
                  </div>
                  <div style={{ fontSize: '15px', color: 'var(--text)', fontWeight: '600' }}>
                    ${data.cost.toFixed(3)}
                  </div>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--muted)', fontFamily: 'var(--mono)', display: 'flex', gap: '16px' }}>
                  <span>{(data.tokens / 1000).toFixed(1)}K tokens</span>
                  <span>•</span>
                  <span>{data.runs} runs</span>
                  <span>•</span>
                  <span>${(data.cost / data.runs).toFixed(4)}/run avg</span>
                </div>
              </div>
            ))}
        </div>
      </GlassCard>
    </div>
  );
}
