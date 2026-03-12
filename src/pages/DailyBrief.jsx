import { useState, useEffect } from 'react';
import GlassCard from '../components/GlassCard';
import { api } from '../lib/api';

export default function DailyBrief() {
  const [brief, setBrief] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.dailyBrief();
        setBrief(data);
      } catch (err) {
        console.error('Failed to load daily brief:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: 32 }}>
        <div className="shimmer" style={{ height: 40, width: 200, borderRadius: 8, marginBottom: 24 }} />
        <div className="shimmer" style={{ height: 200, borderRadius: 12 }} />
      </div>
    );
  }

  if (!brief) return <div style={{ padding: 32, color: 'var(--muted)' }}>Failed to load daily brief</div>;

  return (
    <div style={{ padding: 32, maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
          {new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening'}, Rafe
        </h1>
        <div style={{ fontSize: '1rem', color: 'var(--muted)' }}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, marginBottom: 32 }}>
        <GlassCard>
          <div style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 700, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '1px' }}>
            Quick Stats
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            <div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--green)' }}>{brief.stats.completedToday}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Completed</div>
            </div>
            <div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--blue)' }}>{brief.stats.activeWorkers}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Working</div>
            </div>
            <div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--amber)' }}>{brief.stats.inboxPending}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Inbox</div>
            </div>
          </div>
        </GlassCard>

        {brief.weather && (
          <GlassCard>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 700, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '1px' }}>
              Weather · Ann Arbor
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ fontSize: '3rem', fontWeight: 700, color: 'var(--text)' }}>{brief.weather.temp}°</div>
              <div>
                <div style={{ fontSize: '1rem', color: 'var(--text)', marginBottom: 4 }}>{brief.weather.condition}</div>
                {brief.weather.high && brief.weather.low && (
                  <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
                    H {brief.weather.high}° · L {brief.weather.low}°
                  </div>
                )}
              </div>
            </div>
          </GlassCard>
        )}
      </div>

      {brief.schedule?.length > 0 && (
        <GlassCard style={{ marginBottom: 24 }}>
          <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>Today's Schedule</div>
          <div style={{ display: 'grid', gap: 12 }}>
            {brief.schedule.map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: 16, alignItems: 'center', padding: 12, background: 'rgba(255,255,255,0.02)', borderRadius: 8 }}>
                <div style={{ fontSize: '0.9rem', color: 'var(--teal)', fontFamily: 'var(--mono)', fontWeight: 600, width: 80 }}>{item.time}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.95rem', color: 'var(--text)', fontWeight: 600 }}>{item.event}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'capitalize' }}>{item.type}</div>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {brief.overnightCompletions?.length > 0 && (
        <GlassCard style={{ marginBottom: 24 }}>
          <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>Overnight Completions</div>
          <div style={{ display: 'grid', gap: 8 }}>
            {brief.overnightCompletions.map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: 10, background: 'rgba(45,212,191,0.05)', border: '1px solid rgba(45,212,191,0.2)', borderRadius: 6 }}>
                <span style={{ color: 'var(--green)', fontSize: '1.2rem' }}>✓</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text)' }}>{item.title}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{item.agent || 'unknown'}</div>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {brief.activeTasks?.length > 0 && (
        <GlassCard style={{ marginBottom: 24 }}>
          <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>Active Tasks</div>
          <div style={{ display: 'grid', gap: 8 }}>
            {brief.activeTasks.map((task) => (
              <div key={task.id} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: 10, background: 'rgba(255,255,255,0.02)', borderRadius: 6 }}>
                <span style={{ color: 'var(--blue)', fontSize: '1rem' }}>●</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text)' }}>{task.title}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{task.agent || 'unassigned'} · {task.workState || 'not started'}</div>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {brief.upcomingDeadlines?.length > 0 && (
        <GlassCard>
          <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>Upcoming Deadlines</div>
          <div style={{ display: 'grid', gap: 8 }}>
            {brief.upcomingDeadlines.map((item) => (
              <div key={item.id} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: 10, background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 6 }}>
                <span style={{ color: 'var(--amber)', fontSize: '1rem', fontWeight: 700 }}>!</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text)' }}>{item.title}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                    {item.daysLeft === 0 ? 'Due today' : item.daysLeft === 1 ? 'Due tomorrow' : `Due in ${item.daysLeft} days`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}
    </div>
  );
}
