import { useState, useRef, useEffect, useCallback } from 'react';
import GlassCard from './GlassCard';
import Badge from './Badge';
import { showToast } from './Toast';

function formatElapsed(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatChunkTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/* ───────────────────────── Activity Item ───────────────────────── */

function ActivityItem({ item, isNew }) {
  const icons = {
    note: '📝', action: '✅', flag: '⚠️', context: '🔍', question: '❓',
  };
  const colors = {
    note: 'var(--teal)', action: '#60a5fa', flag: '#fbbf24',
    context: '#a78bfa', question: '#fb923c',
  };

  const color = colors[item.type] || 'var(--muted)';
  const icon = icons[item.type] || '💡';

  return (
    <div style={{
      padding: '10px 12px',
      background: `${color}10`,
      border: `1px solid ${color}30`,
      borderRadius: 8,
      marginBottom: 8,
      animation: isNew ? 'slideUpItem 0.3s ease-out' : 'none',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <span>{icon}</span>
        <span style={{
          color, fontSize: '0.72rem', fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.04em',
        }}>
          {item.type}
        </span>
        {item.timestamp && (
          <span style={{
            color: 'var(--faint)', fontSize: '0.7rem',
            fontFamily: 'var(--mono)', marginLeft: 'auto',
          }}>
            {item.timestamp}
          </span>
        )}
      </div>
      <div style={{ color: 'var(--text)', fontSize: '0.83rem', lineHeight: 1.5 }}>
        {item.content}
      </div>
      {item.type === 'action' && item.assignee && (
        <div style={{ color: 'var(--faint)', fontSize: '0.72rem', marginTop: 4 }}>
          Assigned to <span style={{ color: '#60a5fa' }}>@{item.assignee}</span>
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── Topics List ───────────────────────── */

function TopicsList({ topics }) {
  if (!topics || topics.length === 0) return null;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{
        color: 'var(--muted)', fontSize: '0.7rem', fontWeight: 600,
        textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6,
      }}>Topics Discussed</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {topics.map((topic, i) => (
          <span key={i} style={{
            background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.25)',
            borderRadius: 12, padding: '3px 10px', color: '#a78bfa',
            fontSize: '0.72rem', fontWeight: 600,
          }}>
            {topic}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ───────────────────────── Running Summary ───────────────────────── */

function RunningSummary({ summary }) {
  if (!summary) return null;
  return (
    <div style={{
      background: 'rgba(45,212,191,0.06)', border: '1px solid rgba(45,212,191,0.15)',
      borderRadius: 8, padding: 12, marginBottom: 12,
    }}>
      <div style={{
        color: 'var(--teal)', fontSize: '0.7rem', fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4,
      }}>Running Summary</div>
      <div style={{ color: 'var(--text)', fontSize: '0.82rem', lineHeight: 1.6 }}>
        {summary}
      </div>
    </div>
  );
}

/* ───────────────────────── Setup Screen ───────────────────────── */

const MEETING_TYPES = ['standup', 'planning', 'review', 'retrospective', 'one-on-one', 'brainstorm', 'other'];

function LiveMeetingSetup({ onStart, onCancel }) {
  const [title, setTitle] = useState('');
  const [participants, setParticipants] = useState('');
  const [meetingType, setMeetingType] = useState('other');
  const [withSystem, setWithSystem] = useState(false);
  const [starting, setStarting] = useState(false);

  const handleStart = async () => {
    setStarting(true);
    try {
      await onStart({
        title: title || 'Live Meeting',
        participants: participants.split(',').map(p => p.trim()).filter(Boolean),
        meetingType,
        withSystem,
      });
    } catch (e) {
      showToast('Failed to start: ' + e.message, 'error');
      setStarting(false);
    }
  };

  const inputStyle = {
    background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
    borderRadius: 8, padding: '10px 14px', color: 'var(--text)', fontSize: '0.85rem',
    outline: 'none', width: '100%', boxSizing: 'border-box',
  };

  const labelStyle = {
    color: 'var(--muted)', fontSize: '0.78rem', fontWeight: 600,
    marginBottom: 6, display: 'block',
  };

  return (
    <div style={{
      maxWidth: 520, margin: '60px auto', padding: '0 20px',
    }}>
      <GlassCard>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16, margin: '0 auto 14px',
            background: 'linear-gradient(135deg, rgba(167,139,250,0.2), rgba(96,165,250,0.2))',
            border: '1px solid rgba(167,139,250,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="24" height="24" fill="none" stroke="#a78bfa" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
            </svg>
          </div>
          <h2 style={{ color: 'var(--text)', fontSize: '1.25rem', fontWeight: 700, margin: '0 0 4px' }}>
            Start Live Meeting
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: '0.82rem', margin: 0 }}>
            Lobs will transcribe and analyze your meeting in real-time
          </p>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Meeting Title</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Sprint Planning, 1:1 with Rafe"
            style={inputStyle}
            autoFocus
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Participants (comma-separated)</label>
          <input
            value={participants}
            onChange={e => setParticipants(e.target.value)}
            placeholder="e.g. lobs, rafe"
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Meeting Type</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {MEETING_TYPES.map(type => (
              <button key={type} onClick={() => setMeetingType(type)} style={{
                background: meetingType === type ? 'rgba(167,139,250,0.2)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${meetingType === type ? 'rgba(167,139,250,0.4)' : 'var(--border)'}`,
                borderRadius: 6, padding: '6px 12px',
                color: meetingType === type ? '#a78bfa' : 'var(--muted)',
                fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                textTransform: 'capitalize',
              }}>
                {type}
              </button>
            ))}
          </div>
        </div>

        <div style={{
          marginBottom: 24, padding: '10px 14px',
          background: 'rgba(96,165,250,0.06)', border: '1px solid rgba(96,165,250,0.15)',
          borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <input
            type="checkbox"
            checked={withSystem}
            onChange={e => setWithSystem(e.target.checked)}
            style={{ accentColor: '#60a5fa', cursor: 'pointer' }}
          />
          <div>
            <div style={{ color: 'var(--text)', fontSize: '0.82rem', fontWeight: 600 }}>
              Capture system audio
            </div>
            <div style={{ color: 'var(--faint)', fontSize: '0.72rem' }}>
              For online meetings (Zoom, Meet, etc.) — captures both mic &amp; system audio
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onCancel} style={{
            flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
            borderRadius: 8, padding: '12px 16px', color: 'var(--muted)', fontWeight: 600,
            fontSize: '0.85rem', cursor: 'pointer',
          }}>
            Cancel
          </button>
          <button onClick={handleStart} disabled={starting} style={{
            flex: 2, background: starting ? 'rgba(167,139,250,0.3)' : 'linear-gradient(135deg, #a78bfa, #60a5fa)',
            border: 'none', borderRadius: 8, padding: '12px 16px',
            color: '#fff', fontWeight: 700, fontSize: '0.85rem',
            cursor: starting ? 'not-allowed' : 'pointer',
            opacity: starting ? 0.7 : 1,
          }}>
            {starting ? 'Starting…' : '⚡ Start Live Meeting'}
          </button>
        </div>
      </GlassCard>
    </div>
  );
}

/* ───────────────────────── Main LiveMeeting Component ───────────────────────── */

export default function LiveMeeting({ onClose }) {
  // Phases: setup → recording → ended
  const [phase, setPhase] = useState('setup');

  // Session state
  const [sessionId, setSessionId] = useState(null);
  const [title, setTitle] = useState('Live Meeting');
  const [editingTitle, setEditingTitle] = useState(false);

  // Recording state
  const [elapsed, setElapsed] = useState(0);
  const [chunks, setChunks] = useState([]); // [{text, index, timestamp}]
  const [fullTranscript, setFullTranscript] = useState('');
  const [insights, setInsights] = useState([]); // [{type, content, timestamp, assignee?}]
  const [runningSummary, setRunningSummary] = useState('');
  const [topics, setTopics] = useState([]);

  // Refs
  const mediaRecorderRef = useRef(null);
  const eventSourceRef = useRef(null);
  const timerRef = useRef(null);
  const streamsRef = useRef([]);
  const transcriptEndRef = useRef(null);
  const activityEndRef = useRef(null);
  const newItemsRef = useRef(new Set());

  // Auto-scroll transcript
  useEffect(() => {
    if (transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chunks, fullTranscript]);

  // Auto-scroll activity feed
  useEffect(() => {
    if (activityEndRef.current) {
      activityEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [insights]);

  // Mark new items as "seen" after animation
  useEffect(() => {
    if (newItemsRef.current.size > 0) {
      const timer = setTimeout(() => {
        newItemsRef.current.clear();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [insights]);

  // Timer
  useEffect(() => {
    if (phase === 'recording') {
      timerRef.current = setInterval(() => {
        setElapsed(prev => prev + 1);
      }, 1000);
      return () => clearInterval(timerRef.current);
    }
  }, [phase]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (eventSourceRef.current) eventSourceRef.current.close();
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      streamsRef.current.forEach(s => s.getTracks().forEach(t => t.stop()));
    };
  }, []);

  /* ─── Start live meeting ─── */
  const handleStart = useCallback(async ({ title: meetingTitle, participants, meetingType, withSystem }) => {
    setTitle(meetingTitle);

    // 1. Create session on backend
    const res = await fetch('/paw/api/meetings/live/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: meetingTitle, participants, meetingType }),
    });
    if (!res.ok) throw new Error('Failed to start live meeting: ' + res.status);
    const data = await res.json();
    const sid = data.sessionId || data.session_id || data.id;
    setSessionId(sid);

    // 2. Set up SSE connection
    const es = new EventSource(`/paw/api/meetings/live/${sid}/stream`);

    es.addEventListener('transcript', (e) => {
      try {
        const d = JSON.parse(e.data);
        if (d.fullTranscript != null) setFullTranscript(d.fullTranscript);
        if (d.text) {
          setChunks(prev => [...prev, {
            text: d.text,
            index: d.chunkIndex ?? prev.length,
            timestamp: d.timestamp || null,
          }]);
        }
      } catch (_) {}
    });

    es.addEventListener('insight', (e) => {
      try {
        const d = JSON.parse(e.data);
        const id = Date.now() + Math.random();
        newItemsRef.current.add(id);
        setInsights(prev => [...prev, { ...d, _id: id }]);
      } catch (_) {}
    });

    es.addEventListener('action_item', (e) => {
      try {
        const d = JSON.parse(e.data);
        const id = Date.now() + Math.random();
        newItemsRef.current.add(id);
        setInsights(prev => [...prev, { type: 'action', ...d, _id: id }]);
      } catch (_) {}
    });

    es.addEventListener('summary', (e) => {
      try {
        const d = JSON.parse(e.data);
        setRunningSummary(d.summary || d.text || '');
      } catch (_) {}
    });

    es.addEventListener('topics', (e) => {
      try {
        const d = JSON.parse(e.data);
        setTopics(d.topics || d);
      } catch (_) {}
    });

    es.addEventListener('error', () => {
      // SSE reconnects automatically, but let's log it
      console.warn('[LiveMeeting] SSE connection error — will auto-reconnect');
    });

    eventSourceRef.current = es;

    // 3. Start audio recording with 30s chunks
    const streams = [];
    try {
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streams.push(micStream);
    } catch (e) {
      showToast('Microphone access denied: ' + e.message, 'error');
      es.close();
      throw e;
    }

    if (withSystem) {
      try {
        const displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: false, audio: true,
        });
        streams.push(displayStream);
      } catch (_) {
        showToast('System audio unavailable — recording mic only', 'info');
      }
    }

    let combinedStream;
    if (streams.length > 1) {
      const ctx = new AudioContext();
      const dest = ctx.createMediaStreamDestination();
      streams.forEach(s => {
        const source = ctx.createMediaStreamSource(s);
        source.connect(dest);
      });
      combinedStream = dest.stream;
    } else {
      combinedStream = streams[0];
    }

    streamsRef.current = streams;

    const mr = new MediaRecorder(combinedStream, { mimeType: 'audio/webm;codecs=opus' });

    mr.ondataavailable = async (e) => {
      if (e.data.size > 0 && sid) {
        try {
          const formData = new FormData();
          formData.append('audio', e.data, 'chunk.webm');
          await fetch(`/paw/api/meetings/live/${sid}/chunk`, {
            method: 'POST',
            body: formData,
          });
        } catch (err) {
          console.warn('[LiveMeeting] Failed to send chunk:', err.message);
        }
      }
    };

    mr.start(30000); // 30 second timeslice
    mediaRecorderRef.current = mr;

    setPhase('recording');
    showToast('Live meeting started — Lobs is listening', 'success');
  }, []);

  /* ─── Stop live meeting ─── */
  const handleStop = useCallback(async () => {
    // Stop recording
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    // Stop streams
    streamsRef.current.forEach(s => s.getTracks().forEach(t => t.stop()));
    streamsRef.current = [];

    // Close SSE
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    // Stop timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Finalize on backend
    if (sessionId) {
      try {
        await fetch(`/paw/api/meetings/live/${sessionId}/stop`, { method: 'POST' });
        showToast('Meeting ended — processing final analysis', 'success');
      } catch (e) {
        showToast('Failed to finalize meeting: ' + e.message, 'error');
      }
    }

    setPhase('ended');
  }, [sessionId]);

  /* ─── Render ─── */

  // Setup phase
  if (phase === 'setup') {
    return <LiveMeetingSetup onStart={handleStart} onCancel={onClose} />;
  }

  // Recording or ended phase — the main split-panel view
  const isRecording = phase === 'recording';
  const actionItems = insights.filter(i => i.type === 'action');
  const otherInsights = insights.filter(i => i.type !== 'action');

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100vh',
      overflow: 'hidden', position: 'relative',
    }}>
      {/* Inline keyframes for new item animation */}
      <style>{`
        @keyframes slideUpItem {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes livePulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(239,68,68,0.5); }
          50% { opacity: 0.7; box-shadow: 0 0 0 6px rgba(239,68,68,0); }
        }
      `}</style>

      {/* ─── Top bar ─── */}
      <div style={{
        padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 14,
        borderBottom: '1px solid var(--border)',
        background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(12px)',
        flexShrink: 0, zIndex: 10,
      }}>
        {/* Back button */}
        <button onClick={isRecording ? undefined : onClose} style={{
          background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
          borderRadius: 6, padding: '6px 10px', color: 'var(--muted)',
          cursor: isRecording ? 'default' : 'pointer', opacity: isRecording ? 0.4 : 1,
          display: 'flex', alignItems: 'center',
        }} disabled={isRecording} title={isRecording ? 'End meeting first' : 'Back to meetings'}>
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>

        {/* Recording indicator */}
        {isRecording && (
          <span style={{
            width: 10, height: 10, borderRadius: '50%', background: '#ef4444',
            animation: 'livePulse 1.5s ease-in-out infinite', flexShrink: 0,
          }} />
        )}

        {/* Title */}
        {editingTitle ? (
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            onBlur={() => setEditingTitle(false)}
            onKeyDown={e => { if (e.key === 'Enter') setEditingTitle(false); }}
            autoFocus
            style={{
              background: 'rgba(255,255,255,0.08)', border: '1px solid var(--border)',
              borderRadius: 6, padding: '4px 10px', color: 'var(--text)',
              fontSize: '1rem', fontWeight: 700, outline: 'none', flex: 1, maxWidth: 400,
            }}
          />
        ) : (
          <div
            onClick={() => setEditingTitle(true)}
            style={{
              color: 'var(--text)', fontSize: '1rem', fontWeight: 700,
              cursor: 'pointer', flex: 1,
            }}
            title="Click to edit title"
          >
            {title}
          </div>
        )}

        {/* Duration */}
        <div style={{
          fontFamily: 'var(--mono)', fontSize: '0.95rem', fontWeight: 700,
          color: isRecording ? '#ef4444' : 'var(--text)',
          minWidth: 70, textAlign: 'center',
        }}>
          {formatElapsed(elapsed)}
        </div>

        {/* Status badge */}
        {isRecording ? (
          <Badge label="LIVE" color="#ef4444" dot />
        ) : (
          <Badge label="ENDED" color="var(--muted)" />
        )}

        {/* End / Close button */}
        {isRecording ? (
          <button onClick={handleStop} style={{
            background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)',
            borderRadius: 8, padding: '8px 18px', color: '#ef4444', fontWeight: 700,
            fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <svg width="10" height="10" fill="currentColor" viewBox="0 0 24 24">
              <rect x="4" y="4" width="16" height="16" rx="2"/>
            </svg>
            End Meeting
          </button>
        ) : (
          <button onClick={onClose} style={{
            background: 'rgba(45,212,191,0.1)', border: '1px solid rgba(45,212,191,0.3)',
            borderRadius: 8, padding: '8px 18px', color: 'var(--teal)', fontWeight: 700,
            fontSize: '0.85rem', cursor: 'pointer',
          }}>
            Done
          </button>
        )}
      </div>

      {/* ─── Split panels ─── */}
      <div style={{
        display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0,
      }} className="live-meeting-panels">
        {/* Left panel — Transcript (60%) */}
        <div style={{
          flex: '0 0 60%', display: 'flex', flexDirection: 'column',
          borderRight: '1px solid var(--border)', overflow: 'hidden',
        }} className="live-meeting-transcript-panel">
          {/* Panel header */}
          <div style={{
            padding: '12px 20px', borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
            background: 'rgba(0,0,0,0.15)',
          }}>
            <svg width="14" height="14" fill="none" stroke="var(--teal)" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            </svg>
            <span style={{ color: 'var(--text)', fontWeight: 600, fontSize: '0.85rem' }}>
              Live Transcript
            </span>
            <span style={{ color: 'var(--faint)', fontSize: '0.75rem', marginLeft: 'auto' }}>
              {chunks.length} chunk{chunks.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Transcript content */}
          <div style={{
            flex: 1, overflowY: 'auto', padding: 20,
          }}>
            {chunks.length === 0 && !fullTranscript ? (
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', height: '100%', color: 'var(--faint)',
              }}>
                {isRecording ? (
                  <>
                    <svg width="32" height="32" fill="none" stroke="var(--faint)" strokeWidth="1.5" viewBox="0 0 24 24" style={{ marginBottom: 12, animation: 'pulse 2s infinite' }}>
                      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                    </svg>
                    <div style={{ fontSize: '0.85rem' }}>Listening… transcript will appear here</div>
                    <div style={{ fontSize: '0.75rem', marginTop: 4 }}>First chunk processes after ~30 seconds</div>
                  </>
                ) : (
                  <div style={{ fontSize: '0.85rem' }}>No transcript recorded.</div>
                )}
              </div>
            ) : (
              <>
                {chunks.map((chunk, i) => (
                  <div key={i} style={{
                    display: 'flex', gap: 12, marginBottom: 14,
                    animation: i === chunks.length - 1 ? 'slideUpItem 0.3s ease-out' : 'none',
                  }}>
                    <div style={{
                      minWidth: 56, color: 'var(--faint)', fontSize: '0.72rem',
                      fontFamily: 'var(--mono)', paddingTop: 3, textAlign: 'right',
                      flexShrink: 0,
                    }}>
                      {chunk.timestamp || formatChunkTime(i * 30)}
                    </div>
                    <div style={{
                      flex: 1, color: 'var(--text)', fontSize: '0.85rem',
                      lineHeight: 1.7, borderLeft: '2px solid rgba(45,212,191,0.2)',
                      paddingLeft: 12,
                    }}>
                      {chunk.text}
                    </div>
                  </div>
                ))}
                {/* If we have fullTranscript but no chunks, show it as raw text */}
                {chunks.length === 0 && fullTranscript && (
                  <div style={{
                    color: 'var(--text)', fontSize: '0.85rem', lineHeight: 1.7,
                    whiteSpace: 'pre-wrap', fontFamily: 'var(--mono)',
                  }}>
                    {fullTranscript}
                  </div>
                )}
                <div ref={transcriptEndRef} />
              </>
            )}
          </div>
        </div>

        {/* Right panel — Activity Feed (40%) */}
        <div style={{
          flex: '0 0 40%', display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }} className="live-meeting-activity-panel">
          {/* Panel header */}
          <div style={{
            padding: '12px 20px', borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
            background: 'rgba(0,0,0,0.15)',
          }}>
            <span style={{ fontSize: '0.9rem' }}>🧠</span>
            <span style={{ color: 'var(--text)', fontWeight: 600, fontSize: '0.85rem' }}>
              Lobs Activity
            </span>
            <span style={{ color: 'var(--faint)', fontSize: '0.75rem', marginLeft: 'auto' }}>
              {insights.length} item{insights.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Activity content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
            {/* Running summary */}
            <RunningSummary summary={runningSummary} />

            {/* Topics */}
            <TopicsList topics={topics} />

            {/* Action items section */}
            {actionItems.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{
                  color: '#60a5fa', fontSize: '0.72rem', fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8,
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <span>✅</span> Action Items ({actionItems.length})
                </div>
                {actionItems.map((item, i) => (
                  <ActivityItem
                    key={item._id || i}
                    item={item}
                    isNew={newItemsRef.current.has(item._id)}
                  />
                ))}
              </div>
            )}

            {/* Other insights */}
            {otherInsights.length > 0 && (
              <div>
                {actionItems.length > 0 && (
                  <div style={{
                    color: 'var(--muted)', fontSize: '0.72rem', fontWeight: 700,
                    textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8,
                  }}>
                    Insights
                  </div>
                )}
                {otherInsights.map((item, i) => (
                  <ActivityItem
                    key={item._id || i}
                    item={item}
                    isNew={newItemsRef.current.has(item._id)}
                  />
                ))}
              </div>
            )}

            {/* Empty state */}
            {insights.length === 0 && !runningSummary && (
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', height: '60%', color: 'var(--faint)',
                textAlign: 'center',
              }}>
                {isRecording ? (
                  <>
                    <span style={{ fontSize: '1.5rem', marginBottom: 8 }}>🧠</span>
                    <div style={{ fontSize: '0.82rem' }}>Lobs is analyzing…</div>
                    <div style={{ fontSize: '0.72rem', marginTop: 4, maxWidth: 220 }}>
                      Insights, action items, and notes will appear here as the conversation unfolds
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: '0.85rem' }}>No insights generated.</div>
                )}
              </div>
            )}

            <div ref={activityEndRef} />
          </div>
        </div>
      </div>

      {/* ─── Responsive styles ─── */}
      <style>{`
        @media (max-width: 768px) {
          .live-meeting-panels {
            flex-direction: column !important;
          }
          .live-meeting-transcript-panel {
            flex: 1 1 50% !important;
            border-right: none !important;
            border-bottom: 1px solid var(--border);
            max-height: 50vh;
          }
          .live-meeting-activity-panel {
            flex: 1 1 50% !important;
            max-height: 50vh;
          }
        }
      `}</style>
    </div>
  );
}
