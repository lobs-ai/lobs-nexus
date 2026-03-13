import { useState, useEffect, useRef } from 'react';
import GlassCard from '../components/GlassCard';
import { api } from '../lib/api';

export default function FocusTimer() {
  const [currentSession, setCurrentSession] = useState(null);
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [timeLeft, setTimeLeft] = useState(null);
  const [selectedTask, setSelectedTask] = useState('');
  const [duration, setDuration] = useState(25);
  const intervalRef = useRef(null);

  const loadCurrent = async () => {
    try {
      const session = await api.currentFocus();
      setCurrentSession(session);
      if (session) {
        const elapsed = (Date.now() - new Date(session.startedAt).getTime()) / 1000 / 60;
        const remaining = session.duration - elapsed;
        setTimeLeft(Math.max(0, remaining * 60));
      }
    } catch (err) {
      console.error('Failed to load current focus:', err);
    }
  };

  const loadStats = async () => {
    try {
      const data = await api.focusStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load focus stats:', err);
    }
  };

  const loadHistory = async () => {
    try {
      const data = await api.focusHistory(30);
      setHistory(Array.isArray(data) ? data : data?.history || []);
    } catch (err) {
      console.error('Failed to load focus history:', err);
    }
  };

  const loadTasks = async () => {
    try {
      const data = await api.tasks({ status: 'active' });
      setTasks(Array.isArray(data) ? data : data?.tasks || []);
    } catch (err) {
      console.error('Failed to load tasks:', err);
    }
  };

  useEffect(() => {
    loadCurrent();
    loadStats();
    loadHistory();
    loadTasks();
  }, []);

  useEffect(() => {
    if (currentSession && timeLeft !== null) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 0) {
            clearInterval(intervalRef.current);
            loadCurrent();
            loadStats();
            loadHistory();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(intervalRef.current);
    }
  }, [currentSession, timeLeft]);

  const startSession = async () => {
    try {
      const body = { duration, taskId: selectedTask || null };
      await api.startFocus(body);
      await loadCurrent();
      await loadStats();
    } catch (err) {
      console.error('Failed to start focus:', err);
      alert('Failed to start session');
    }
  };

  const stopSession = async () => {
    if (!currentSession) return;
    try {
      await api.stopFocus(currentSession.id);
      setCurrentSession(null);
      setTimeLeft(null);
      await loadStats();
      await loadHistory();
    } catch (err) {
      console.error('Failed to stop focus:', err);
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const progress = currentSession && timeLeft !== null ? ((currentSession.duration * 60 - timeLeft) / (currentSession.duration * 60)) * 100 : 0;

  return (
    <div style={{ padding: 32, maxWidth: 1200, margin: '0 auto' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text)', marginBottom: 32 }}>Focus Timer</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>
        <GlassCard style={{ padding: 40, textAlign: 'center' }}>
          {currentSession ? (
            <div>
              <div style={{ position: 'relative', width: 200, height: 200, margin: '0 auto 24px' }}>
                <svg width="200" height="200" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="100" cy="100" r="90" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="12" />
                  <circle
                    cx="100"
                    cy="100"
                    r="90"
                    fill="none"
                    stroke="var(--teal)"
                    strokeWidth="12"
                    strokeDasharray={`${2 * Math.PI * 90}`}
                    strokeDashoffset={`${2 * Math.PI * 90 * (1 - progress / 100)}`}
                    style={{ transition: 'stroke-dashoffset 1s linear' }}
                  />
                </svg>
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ fontSize: '3rem', fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--mono)' }}>
                    {formatTime(timeLeft || 0)}
                  </div>
                </div>
              </div>

              <div style={{ fontSize: '1.1rem', color: 'var(--muted)', marginBottom: 20 }}>
                {currentSession.label || 'Focus Session'}
              </div>

              <button
                onClick={stopSession}
                style={{
                  padding: '12px 32px',
                  background: 'rgba(239,68,68,0.2)',
                  border: '1px solid var(--red)',
                  borderRadius: 8,
                  color: 'var(--red)',
                  fontSize: '1rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Stop Session
              </button>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: '4rem', fontWeight: 700, color: 'var(--faint)', marginBottom: 20, fontFamily: 'var(--mono)' }}>
                {duration}:00
              </div>

              <div style={{ marginBottom: 24 }}>
                <select
                  value={selectedTask}
                  onChange={(e) => setSelectedTask(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid var(--border)',
                    borderRadius: 6,
                    color: 'var(--text)',
                    fontSize: '0.95rem',
                    marginBottom: 16,
                  }}
                >
                  <option value="">No task (free session)</option>
                  {tasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>

                <div style={{ display: 'flex', gap: 12, marginBottom: 20, justifyContent: 'center' }}>
                  {[25, 45, 60].map((d) => (
                    <button
                      key={d}
                      onClick={() => setDuration(d)}
                      style={{
                        padding: '8px 16px',
                        background: duration === d ? 'var(--teal)' : 'rgba(255,255,255,0.04)',
                        border: '1px solid',
                        borderColor: duration === d ? 'var(--teal)' : 'var(--border)',
                        borderRadius: 6,
                        color: duration === d ? 'white' : 'var(--muted)',
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                      }}
                    >
                      {d} min
                    </button>
                  ))}
                </div>

                <button
                  onClick={startSession}
                  style={{
                    padding: '12px 32px',
                    background: 'var(--teal)',
                    border: 'none',
                    borderRadius: 8,
                    color: 'white',
                    fontSize: '1rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Start Focus
                </button>
              </div>
            </div>
          )}
        </GlassCard>

        {stats && (
          <GlassCard>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text)', marginBottom: 20 }}>Today's Stats</div>
            <div style={{ display: 'grid', gap: 16 }}>
              <div>
                <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--teal)' }}>{stats.todayMinutes}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Minutes Focused</div>
              </div>
              <div>
                <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--green)' }}>{stats.sessionsToday}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Sessions Completed</div>
              </div>
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text)' }}>{stats.weekMinutes}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>This Week</div>
              </div>
            </div>
          </GlassCard>
        )}
      </div>

      <GlassCard>
        <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text)', marginBottom: 20 }}>Recent Sessions</div>
        {history.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>No sessions yet</div>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {history.map((session) => (
              <div key={session.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 12, background: 'rgba(255,255,255,0.02)', borderRadius: 6 }}>
                <div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text)', marginBottom: 4 }}>
                    {session.taskTitle || session.label || 'Free session'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                    {new Date(session.startedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: 600, color: session.completed ? 'var(--green)' : 'var(--amber)' }}>
                    {session.duration} min
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--faint)' }}>
                    {session.completed ? 'Completed' : 'Stopped early'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
