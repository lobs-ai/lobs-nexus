import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import GlassCard from '../GlassCard';
import { api } from '../../lib/api';

export default function DailyBriefWidget() {
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
      <GlassCard>
        <div className="shimmer" style={{ height: 20, borderRadius: 6, marginBottom: 12 }} />
        <div className="shimmer" style={{ height: 14, borderRadius: 6, marginBottom: 8, width: '80%' }} />
        <div className="shimmer" style={{ height: 14, borderRadius: 6, width: '60%' }} />
      </GlassCard>
    );
  }

  if (!brief || !brief.stats) return null;

  const nextItems = (brief.schedule || []).slice(0, 3);

  return (
    <GlassCard>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <span style={{ fontSize: '1.3rem' }}>☀️</span>
        <div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text)' }}>
            {new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening'}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--faint)', fontFamily: 'var(--mono)' }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </div>
        </div>
      </div>

      {nextItems.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--muted)', fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '1px' }}>
            Today's Schedule
          </div>
          {nextItems.map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 6, fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--teal)', fontFamily: 'var(--mono)', fontSize: '0.75rem', width: 60 }}>{item.time}</span>
              <span style={{ color: 'var(--text)' }}>{item.event}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 16, marginBottom: 14, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
        <div>
          <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--green)' }}>{brief.stats.completedToday}</div>
          <div style={{ fontSize: '0.65rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Completed</div>
        </div>
        <div>
          <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--blue)' }}>{brief.stats.activeWorkers}</div>
          <div style={{ fontSize: '0.65rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Active</div>
        </div>
        <div>
          <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--amber)' }}>{brief.stats.inboxPending}</div>
          <div style={{ fontSize: '0.65rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Inbox</div>
        </div>
      </div>

      {brief.weather && (
        <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: 12 }}>
          <span style={{ color: 'var(--text)', fontWeight: 600 }}>{brief.weather.temp}°F</span> · {brief.weather.condition}
          {brief.weather.high && brief.weather.low && ` · H ${brief.weather.high}° L ${brief.weather.low}°`}
        </div>
      )}

      <Link to="/daily-brief" style={{ fontSize: '0.75rem', color: 'var(--teal)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        View full brief →
      </Link>
    </GlassCard>
  );
}
