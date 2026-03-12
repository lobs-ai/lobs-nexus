import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import GlassCard from '../GlassCard';
import { api } from '../../lib/api';

export default function MicroLearningWidget() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.learningStats();
        setStats(data);
      } catch (err) {
        console.error('Failed to load learning stats:', err);
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
        <div className="shimmer" style={{ height: 40, borderRadius: 6 }} />
      </GlassCard>
    );
  }

  if (!stats) return null;

  return (
    <GlassCard>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <span style={{ fontSize: '1.3rem' }}>🧠</span>
        <div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text)' }}>Micro-Learning</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--faint)', fontFamily: 'var(--mono)' }}>Spaced Repetition</div>
        </div>
      </div>

      {stats.dueToday > 0 ? (
        <div style={{ background: 'rgba(45,212,191,0.1)', border: '1px solid var(--teal)', borderRadius: 8, padding: 16, marginBottom: 14 }}>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--teal)', marginBottom: 4 }}>{stats.dueToday}</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text)', marginBottom: 12 }}>cards due for review</div>
          <Link
            to="/learning?mode=review"
            style={{
              display: 'inline-block',
              padding: '8px 16px',
              background: 'var(--teal)',
              color: 'white',
              borderRadius: 6,
              textDecoration: 'none',
              fontSize: '0.85rem',
              fontWeight: 600,
            }}
          >
            Start Review
          </Link>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: 20, color: 'var(--muted)', fontSize: '0.85rem' }}>
          ✓ All caught up!
        </div>
      )}

      <div style={{ display: 'flex', gap: 16, marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text)' }}>{stats.totalCards}</div>
          <div style={{ fontSize: '0.65rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Total Cards</div>
        </div>
        <div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--green)' }}>{stats.reviewedToday}</div>
          <div style={{ fontSize: '0.65rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Reviewed</div>
        </div>
      </div>

      <Link to="/learning" style={{ fontSize: '0.75rem', color: 'var(--teal)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        Manage topics →
      </Link>
    </GlassCard>
  );
}
