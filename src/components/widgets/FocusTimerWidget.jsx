import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import GlassCard from '../GlassCard';
import { api } from '../../lib/api';

export default function FocusTimerWidget() {
  const [currentSession, setCurrentSession] = useState(null);
  const [stats, setStats] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  const [tasks, setTasks] = useState([]);
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

  const loadTasks = async () => {
    try {
      const data = await api.tasks({ status: 'active' });
      const taskList = Array.isArray(data) ? data : data?.tasks || [];
      setTasks(taskList);
    } catch (err) {
      console.error('Failed to load tasks:', err);
    }
  };

  useEffect(() => {
    loadCurrent();
    loadStats();
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
    } catch (err) {
      console.error('Failed to stop focus:', err);
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <GlassCard>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <span style={{ fontSize: '1.3rem' }}>⏱</span>
        <div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text)' }}>Focus Timer</div>
          {stats && (
            <div style={{ fontSize: '0.72rem', color: 'var(--faint)', fontFamily: 'var(--mono)' }}>
              {stats.todayMinutes}m today · {stats.sessionsToday} sessions
            </div>
          )}
        </div>
      </div>

      {currentSession ? (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ fontSize: '3rem', fontWeight: 700, color: 'var(--teal)', marginBottom: 12, fontFamily: 'var(--mono)' }}>
            {formatTime(timeLeft || 0)}
          </div>
          <button
            onClick={stopSession}
            style={{
              padding: '10px 24px',
              background: 'rgba(239,68,68,0.2)',
              border: '1px solid var(--red)',
              borderRadius: 6,
              color: 'var(--red)',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Stop
          </button>
        </div>
      ) : (
        <div>
          <div style={{ marginBottom: 12 }}>
            <select
              value={selectedTask}
              onChange={(e) => setSelectedTask(e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid var(--border)',
                borderRadius: 6,
                color: 'var(--text)',
                fontSize: '0.85rem',
                marginBottom: 10,
              }}
            >
              <option value="">No task (free session)</option>
              {tasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>

            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              {[25, 45, 60].map((d) => (
                <button
                  key={d}
                  onClick={() => setDuration(d)}
                  style={{
                    flex: 1,
                    padding: '6px',
                    background: duration === d ? 'var(--teal)' : 'rgba(255,255,255,0.04)',
                    border: '1px solid',
                    borderColor: duration === d ? 'var(--teal)' : 'var(--border)',
                    borderRadius: 4,
                    color: duration === d ? 'white' : 'var(--muted)',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                  }}
                >
                  {d}m
                </button>
              ))}
            </div>

            <button
              onClick={startSession}
              style={{
                width: '100%',
                padding: '10px',
                background: 'var(--teal)',
                border: 'none',
                borderRadius: 6,
                color: 'white',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Start Focus
            </button>
          </div>
        </div>
      )}

      <Link to="/focus" style={{ fontSize: '0.75rem', color: 'var(--teal)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 12 }}>
        View history →
      </Link>
    </GlassCard>
  );
}
