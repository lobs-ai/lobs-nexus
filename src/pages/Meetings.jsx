import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import GlassCard from '../components/GlassCard';
import Badge from '../components/Badge';
import { showToast } from '../components/Toast';
import { useApi } from '../hooks/useApi';
import { usePolling } from '../hooks/usePolling';
import { useAffordances } from '../hooks/useAffordances';
import AIReplyChips from '../components/ai/AIReplyChips';

// Fetch task status for action items that have a task_id.
// Returns a map of { taskId -> task } for only the found tasks.
async function fetchTaskStatuses(taskIds) {
  if (!taskIds || taskIds.length === 0) return {};
  const results = {};
  await Promise.all(taskIds.map(async (id) => {
    try {
      const res = await fetch(`/paw/api/tasks/${id}`);
      if (res.ok) {
        const task = await res.json();
        if (task && !task.error) results[id] = task;
      }
    } catch (_) {}
  }));
  return results;
}

// Auto-sync action items: if task is done, mark action item complete.
// Returns updated items array.
async function syncActionItemsWithTasks(items, onStatusChange) {
  const itemsWithTasks = items.filter(i => i.taskId || i.task_id);
  if (itemsWithTasks.length === 0) return items;

  const taskIds = [...new Set(itemsWithTasks.map(i => i.taskId || i.task_id))];
  const taskMap = await fetchTaskStatuses(taskIds);

  const updatedItems = [...items];
  await Promise.all(updatedItems.map(async (item, idx) => {
    const tid = item.taskId || item.task_id;
    if (!tid) return;
    const task = taskMap[tid];
    if (!task) return;
    const taskDone = task.status === 'closed' || task.status === 'completed';
    if (taskDone && item.status !== 'completed') {
      // Auto-mark action item complete
      try {
        await fetch(`/paw/api/meetings/action-items/${item.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'completed' }),
        });
        updatedItems[idx] = { ...item, status: 'completed', _task: task };
      } catch (_) {}
    } else {
      updatedItems[idx] = { ...item, _task: task };
    }
  }));
  return updatedItems;
}

const MEETING_TYPES = ['standup', 'planning', 'review', 'retrospective', 'one-on-one', 'brainstorm', 'other'];

function formatDuration(seconds) {
  if (!seconds) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatDate(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString();
}

function RecordingSection({ onUploaded }) {
  const [recordings, setRecordings] = useState([]); // [{id, recording, elapsed, mediaRecorder, timerRef, transcribing}]

  const startRecording = async (withSystem = false) => {
    try {
      const streams = [];
      // Always get mic
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streams.push(micStream);

      // Try system audio for online meetings
      if (withSystem) {
        try {
          const displayStream = await navigator.mediaDevices.getDisplayMedia({
            video: false,
            audio: true,
          });
          streams.push(displayStream);
        } catch (e) {
          // Fall back to mic-only if user cancels screen share
          showToast('System audio unavailable — recording mic only', 'info');
        }
      }

      // Merge streams if we have both
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

      const id = Date.now().toString();
      const chunks = [];
      const mr = new MediaRecorder(combinedStream, { mimeType: 'audio/webm;codecs=opus' });
      mr.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
      mr.start(500);

      const timerRef = { current: null };
      const rec = {
        id,
        recording: true,
        elapsed: 0,
        mediaRecorder: mr,
        chunks,
        timerRef,
        transcribing: false,
        streams,
        withSystem,
      };

      timerRef.current = setInterval(() => {
        setRecordings(prev => prev.map(r =>
          r.id === id ? { ...r, elapsed: r.elapsed + 1 } : r
        ));
      }, 1000);

      setRecordings(prev => [...prev, rec]);
    } catch (err) {
      showToast('Microphone access denied: ' + err.message, 'error');
    }
  };

  const stopRecording = (id) => {
    setRecordings(prev => prev.map(rec => {
      if (rec.id !== id) return rec;
      const mr = rec.mediaRecorder;
      clearInterval(rec.timerRef.current);

      mr.onstop = async () => {
        const blob = new Blob(rec.chunks, { type: 'audio/webm;codecs=opus' });
        // Stop all tracks
        rec.streams?.forEach(s => s.getTracks().forEach(t => t.stop()));

        setRecordings(prev => prev.map(r =>
          r.id === id ? { ...r, transcribing: true } : r
        ));

        try {
          const formData = new FormData();
          formData.append('audio', blob, 'recording.webm');
          const res = await fetch('/paw/api/meetings/upload', { method: 'POST', body: formData });
          if (!res.ok) throw new Error('Upload failed: ' + res.status);
          showToast('Meeting uploaded — transcribing & analyzing', 'success');
          onUploaded();
        } catch (err) {
          showToast(err.message, 'error');
        } finally {
          setRecordings(prev => prev.filter(r => r.id !== id));
        }
      };
      mr.stop();
      return { ...rec, recording: false };
    }));
  };

  const activeRecordings = recordings.filter(r => r.recording);
  const processingRecordings = recordings.filter(r => r.transcribing);

  return (
    <GlassCard style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: activeRecordings.length > 0 ? 16 : 0 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: activeRecordings.length > 0 ? 'rgba(239,68,68,0.2)' : 'rgba(45,212,191,0.1)',
          border: `1px solid ${activeRecordings.length > 0 ? 'rgba(239,68,68,0.4)' : 'rgba(45,212,191,0.2)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="16" height="16" fill="none" stroke={activeRecordings.length > 0 ? '#ef4444' : 'var(--teal)'} strokeWidth="2" viewBox="0 0 24 24">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ color: 'var(--text)', fontWeight: 600, fontSize: '1rem' }}>Record Meeting</div>
          <div style={{ color: 'var(--muted)', fontSize: '0.78rem' }}>
            {activeRecordings.length > 0 ? `${activeRecordings.length} recording active` :
             processingRecordings.length > 0 ? `${processingRecordings.length} processing` : 'One click to start'}
          </div>
        </div>
        {activeRecordings.length === 0 && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => startRecording(false)} style={{
              background: 'linear-gradient(135deg, var(--teal), var(--blue))', border: 'none',
              borderRadius: 8, padding: '10px 16px', color: '#fff', fontWeight: 600,
              fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg>
              Record
            </button>
            <button onClick={() => startRecording(true)} style={{
              background: 'rgba(96,165,250,0.12)', border: '1px solid rgba(96,165,250,0.3)',
              borderRadius: 8, padding: '10px 16px', color: '#60a5fa', fontWeight: 600,
              fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
            }} title="Records mic + system audio for online meetings">
              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
              </svg>
              Online Meeting
            </button>
          </div>
        )}
      </div>

      {/* Active recordings */}
      {activeRecordings.map(rec => (
        <div key={rec.id} style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
          background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)',
          borderRadius: 8, marginBottom: 8,
        }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', animation: 'pulse 1.2s infinite' }} />
          <span style={{ color: '#ef4444', fontFamily: 'var(--mono)', fontSize: '0.9rem', fontWeight: 700, flex: 1 }}>
            {formatDuration(rec.elapsed)}
          </span>
          {rec.withSystem && <Badge label="System Audio" color="#60a5fa" />}
          <button onClick={() => stopRecording(rec.id)} style={{
            background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)',
            borderRadius: 6, padding: '6px 14px', color: '#ef4444', fontWeight: 600,
            fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <svg width="10" height="10" fill="currentColor" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>
            Stop
          </button>
        </div>
      ))}

      {/* Processing indicators */}
      {processingRecordings.map(rec => (
        <div key={rec.id} style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
          color: 'var(--muted)', fontSize: '0.8rem',
        }}>
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ animation: 'spin 1s linear infinite' }}>
            <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
          </svg>
          Uploading & transcribing…
        </div>
      ))}
    </GlassCard>
  );
}

function TranscriptBody({ transcript }) {
  if (typeof transcript === 'string') {
    return <div style={{ color: 'var(--text)', fontSize: '0.85rem', lineHeight: 1.7, whiteSpace: 'pre-wrap', fontFamily: 'var(--mono)' }}>{transcript}</div>;
  }
  if (Array.isArray(transcript)) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {transcript.map((seg, i) => (
          <div key={i} style={{ display: 'flex', gap: 12 }}>
            <div style={{ minWidth: 80, color: 'var(--faint)', fontSize: '0.72rem', fontFamily: 'var(--mono)', paddingTop: 2 }}>{seg.timestamp || ''}</div>
            <div style={{ flex: 1 }}>
              {seg.speaker && <div style={{ color: 'var(--teal)', fontSize: '0.75rem', fontWeight: 700, marginBottom: 2 }}>{seg.speaker}</div>}
              <div style={{ color: 'var(--text)', fontSize: '0.85rem', lineHeight: 1.6 }}>{seg.text}</div>
            </div>
          </div>
        ))}
      </div>
    );
  }
  return <div style={{ color: 'var(--faint)', fontSize: '0.85rem' }}>Unrecognized transcript format.</div>;
}

function TaskLink({ task, taskId }) {
  const navigate = useNavigate();
  if (!taskId) return null;

  const isDone = task && (task.status === 'closed' || task.status === 'completed');
  const label = isDone ? '✓ Task Done' : 'View Task';
  const color = isDone ? '#2dd4bf' : 'var(--blue)';

  return (
    <button
      title={task ? task.title : `Task ${taskId}`}
      onClick={(e) => { e.stopPropagation(); navigate('/tasks'); }}
      style={{
        background: isDone ? 'rgba(45,212,191,0.12)' : 'rgba(96,165,250,0.12)',
        border: `1px solid ${isDone ? 'rgba(45,212,191,0.3)' : 'rgba(96,165,250,0.3)'}`,
        borderRadius: 5, padding: '2px 8px', color, fontSize: '0.7rem', fontWeight: 600,
        cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
      }}
    >
      {label}
    </button>
  );
}

function ActionItemsList({ items, onStatusChange }) {
  if (!items || items.length === 0) return null;

  const grouped = {};
  items.forEach(item => {
    const key = item.assignee || 'unassigned';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(item);
  });

  const assigneeColor = (name) => {
    if (name === 'lobs') return '#2dd4bf';
    if (name === 'rafe') return '#60a5fa';
    return '#a78bfa';
  };

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ color: 'var(--text)', fontWeight: 600, fontSize: '0.85rem', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
        <svg width="14" height="14" fill="none" stroke="var(--teal)" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
        </svg>
        Action Items ({items.length})
      </div>
      {Object.entries(grouped).map(([assignee, group]) => (
        <div key={assignee} style={{ marginBottom: 12 }}>
          <div style={{ color: assigneeColor(assignee), fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: 6, letterSpacing: '0.05em' }}>
            {assignee === 'unassigned' ? '📋 Unassigned' : `@${assignee}`}
          </div>
          {group.map(item => {
            const taskId = item.taskId || item.task_id;
            return (
              <div key={item.id} style={{
                display: 'flex', alignItems: 'flex-start', gap: 8, padding: '6px 0',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
              }}>
                <input
                  type="checkbox"
                  checked={item.status === 'completed'}
                  onChange={() => onStatusChange(item.id, item.status === 'completed' ? 'pending' : 'completed')}
                  style={{ marginTop: 3, accentColor: 'var(--teal)', cursor: 'pointer' }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{
                    color: item.status === 'completed' ? 'var(--faint)' : 'var(--text)',
                    fontSize: '0.83rem', lineHeight: 1.5,
                    textDecoration: item.status === 'completed' ? 'line-through' : 'none',
                  }}>{item.description}</div>
                  {item.due_date && <span style={{ color: 'var(--faint)', fontSize: '0.7rem' }}>Due: {item.due_date}</span>}
                </div>
                {taskId && <TaskLink task={item._task} taskId={taskId} />}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function ShareButton({ meeting, actionItems }) {
  const [showMenu, setShowMenu] = useState(false);
  const [sending, setSending] = useState(false);

  const buildShareText = (format = 'markdown') => {
    let text = format === 'markdown'
      ? `📋 **${meeting.title || 'Meeting'}** — ${formatDate(meeting.created_at)}`
      : `📋 ${meeting.title || 'Meeting'} — ${formatDate(meeting.created_at)}`;
    if (meeting.summary) text += `

${meeting.summary}`;
    if (actionItems?.length) {
      const grouped = {};
      actionItems.forEach(i => {
        const k = i.assignee || 'unassigned';
        if (!grouped[k]) grouped[k] = [];
        grouped[k].push(i);
      });
      text += `

${format === 'markdown' ? '**Action Items:**' : 'Action Items:'}`;
      Object.entries(grouped).forEach(([assignee, items]) => {
        text += `
@${assignee}:`;
        items.forEach(i => { text += `
  • ${i.description}`; });
      });
    }
    return text;
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(buildShareText('plain'));
      showToast('Copied to clipboard', 'success');
    } catch { showToast('Copy failed', 'error'); }
    setShowMenu(false);
  };

  const sendToDiscord = async () => {
    setSending(true);
    try {
      const res = await fetch('/paw/api/meetings/' + meeting.id + '/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel: 'discord' }),
      });
      if (!res.ok) throw new Error('Failed: ' + res.status);
      showToast('Sent to Discord', 'success');
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setSending(false);
      setShowMenu(false);
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setShowMenu(v => !v)} style={{
        background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
        borderRadius: 6, padding: '4px 10px', color: 'var(--muted)', fontSize: '0.75rem',
        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
      }}>
        <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>
        </svg>
        {sending ? 'Sending…' : 'Share'}
      </button>
      {showMenu && (
        <div style={{
          position: 'absolute', right: 0, top: '100%', marginTop: 4, zIndex: 10,
          background: 'var(--card-bg, rgba(15,23,42,0.95))', border: '1px solid var(--border)',
          borderRadius: 8, padding: 4, minWidth: 160, boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}>
          <button onClick={copyToClipboard} style={{
            display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 12px',
            background: 'transparent', border: 'none', color: 'var(--text)', fontSize: '0.8rem',
            cursor: 'pointer', borderRadius: 6, textAlign: 'left',
          }} onMouseEnter={e => e.target.style.background = 'rgba(255,255,255,0.05)'}
             onMouseLeave={e => e.target.style.background = 'transparent'}>
            📋 Copy to clipboard
          </button>
          <button onClick={sendToDiscord} style={{
            display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 12px',
            background: 'transparent', border: 'none', color: 'var(--text)', fontSize: '0.8rem',
            cursor: 'pointer', borderRadius: 6, textAlign: 'left',
          }} onMouseEnter={e => e.target.style.background = 'rgba(255,255,255,0.05)'}
             onMouseLeave={e => e.target.style.background = 'transparent'}>
            💬 Send to Discord
          </button>
        </div>
      )}
    </div>
  );
}

function TranscriptItem({ meeting }) {
  const [expanded, setExpanded] = useState(false);
  const [tab, setTab] = useState('summary');
  const [actionItems, setActionItems] = useState(null);
  const participants = Array.isArray(meeting.participants)
    ? meeting.participants.join(', ')
    : (meeting.participants || null);

  const meetingAffordances = useAffordances('meeting-card');
  const actionChipsAffordance = meetingAffordances.find(a => a.type === 'chips') || null;
  const meetingContext = JSON.stringify({
    title: meeting.title || 'Untitled Meeting',
    type: meeting.meeting_type,
    summary: meeting.summary,
    participants,
  });

  useEffect(() => {
    if (expanded && !actionItems) {
      fetch(`/paw/api/meetings/${meeting.id}/action-items`)
        .then(r => r.json())
        .then(async (d) => {
          const items = Array.isArray(d) ? d : [];
          // Sync task statuses for items that have a task link
          const synced = await syncActionItemsWithTasks(items, updateItemStatus);
          setActionItems(synced);
        })
        .catch(() => {});
    }
  }, [expanded, meeting.id]);

  const updateItemStatus = async (itemId, status) => {
    await fetch(`/paw/api/meetings/action-items/${itemId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    setActionItems(prev => prev.map(i => i.id === itemId ? { ...i, status } : i));
  };

  const analysisLabel = meeting.analysis_status === 'completed' ? null
    : meeting.analysis_status === 'processing' ? '⏳ Analyzing…'
    : meeting.analysis_status === 'failed' ? '❌ Analysis failed'
    : null;

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)',
      borderRadius: 10, marginBottom: 10, overflow: 'hidden', transition: 'border-color 0.2s',
    }}>
      <div onClick={() => setExpanded(v => !v)}
        style={{ padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: 'rgba(45,212,191,0.08)', border: '1px solid rgba(45,212,191,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <svg width="14" height="14" fill="none" stroke="var(--teal)" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
          </svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: 'var(--text)', fontWeight: 600, fontSize: '0.9rem', marginBottom: 3 }}>{meeting.title || 'Untitled Meeting'}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            <span style={{ color: 'var(--faint)', fontSize: '0.75rem', fontFamily: 'var(--mono)' }}>{formatDate(meeting.created_at)}</span>
            {meeting.duration_seconds && <Badge label={formatDuration(meeting.duration_seconds)} color="var(--blue)" />}
            {meeting.meeting_type && <Badge label={meeting.meeting_type} color="var(--teal)" />}
            {analysisLabel && <span style={{ fontSize: '0.72rem' }}>{analysisLabel}</span>}
          </div>
          {participants && <div style={{ color: 'var(--faint)', fontSize: '0.72rem', marginTop: 2 }}>👥 {participants}</div>}
        </div>
        <svg width="16" height="16" fill="none" stroke="var(--muted)" strokeWidth="2" viewBox="0 0 24 24"
          style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </div>

      {expanded && (
        <div style={{ borderTop: '1px solid var(--border)', background: 'rgba(0,0,0,0.15)' }}>
          {/* Tabs + Share */}
          <div style={{ display: 'flex', alignItems: 'center', padding: '8px 16px 0', gap: 4 }}>
            {['summary', 'transcript'].map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                background: tab === t ? 'rgba(45,212,191,0.15)' : 'transparent',
                border: tab === t ? '1px solid rgba(45,212,191,0.3)' : '1px solid transparent',
                borderRadius: 6, padding: '4px 12px', color: tab === t ? 'var(--teal)' : 'var(--muted)',
                fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize',
              }}>{t}</button>
            ))}
            <div style={{ flex: 1 }} />
            <ShareButton meeting={meeting} actionItems={actionItems} />
          </div>

          <div style={{ padding: 16, maxHeight: 500, overflowY: 'auto' }}>
            {tab === 'summary' ? (
              <>
                {meeting.summary ? (
                  <div style={{
                    background: 'rgba(45,212,191,0.05)', border: '1px solid rgba(45,212,191,0.15)',
                    borderRadius: 8, padding: 14, marginBottom: 12,
                  }}>
                    <div style={{ color: 'var(--muted)', fontSize: '0.72rem', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Summary</div>
                    <div style={{ color: 'var(--text)', fontSize: '0.85rem', lineHeight: 1.6 }}>{meeting.summary}</div>
                  </div>
                ) : (
                  <div style={{ color: 'var(--faint)', fontSize: '0.85rem', fontStyle: 'italic', marginBottom: 12 }}>
                    {meeting.analysis_status === 'processing' ? '⏳ Generating summary…' : 'No summary available.'}
                  </div>
                )}
                {actionChipsAffordance && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ color: 'var(--muted)', fontSize: '0.72rem', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Meeting Actions</div>
                    <AIReplyChips affordance={actionChipsAffordance} context={meetingContext} onSelect={(text) => showToast(text, 'info')} />
                  </div>
                )}
                <ActionItemsList items={actionItems} onStatusChange={updateItemStatus} />
              </>
            ) : (
              meeting.transcript
                ? <TranscriptBody transcript={meeting.transcript} />
                : <div style={{ color: 'var(--faint)', fontSize: '0.85rem', fontStyle: 'italic' }}>No transcript available.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Meetings() {
  const { data: projectsData } = useApi('/paw/api/projects');
  const projects = projectsData?.projects || projectsData || [];

  const fetchMeetings = useCallback(() => fetch('/paw/api/meetings').then(r => r.json()), []);
  const { data: meetingsData, refresh } = usePolling(fetchMeetings, 15000);
  const meetings = meetingsData?.meetings || meetingsData || [];

  const [search, setSearch] = useState('');
  const filtered = meetings.filter(m => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (m.title || '').toLowerCase().includes(q)
      || (m.meeting_type || '').toLowerCase().includes(q)
      || (m.participants || '').toLowerCase().includes(q);
  });

  const fetchMyItems = useCallback(() =>
    fetch('/paw/api/meetings/action-items?assignee=lobs').then(r => r.json()).then(d => Array.isArray(d) ? d : []), []);
  const { data: rawMyItems, refresh: refreshMyItems } = usePolling(fetchMyItems, 15000);
  const [myItems, setMyItems] = useState(null);

  useEffect(() => {
    if (!rawMyItems) return;
    syncActionItemsWithTasks(rawMyItems, () => {}).then(synced => setMyItems(synced));
  }, [rawMyItems]);

  return (
    <div style={{ padding: '28px 28px 40px', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <svg width="22" height="22" fill="none" stroke="var(--teal)" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" y1="19" x2="12" y2="23"/>
            <line x1="8" y1="23" x2="16" y2="23"/>
          </svg>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: 'var(--text)' }}>Meetings</h1>
        </div>
        <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.875rem' }}>Record meetings and browse transcripts.</p>
      </div>

      <RecordingSection onUploaded={refresh} />

      {myItems && myItems.length > 0 && (
        <GlassCard style={{ marginBottom: 24 }}>
          <div style={{ color: 'var(--text)', fontWeight: 600, fontSize: '1rem', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="16" height="16" fill="none" stroke="#60a5fa" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
            </svg>
            My Action Items
            <span style={{ color: 'var(--faint)', fontSize: '0.8rem' }}>({myItems.filter(i => i.status !== 'completed').length} open)</span>
          </div>
          {myItems.filter(i => i.status !== 'completed').map(item => {
            const taskId = item.taskId || item.task_id;
            return (
              <div key={item.id} style={{
                display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 0',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
              }}>
                <input type="checkbox" onChange={async () => {
                  await fetch(`/paw/api/meetings/action-items/${item.id}`, {
                    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'completed' }),
                  });
                  setMyItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'completed' } : i));
                }} style={{ marginTop: 3, accentColor: 'var(--teal)', cursor: 'pointer' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ color: 'var(--text)', fontSize: '0.85rem', lineHeight: 1.5 }}>{item.description}</div>
                  {item.due_date && <span style={{ color: 'var(--faint)', fontSize: '0.7rem' }}>Due: {item.due_date}</span>}
                </div>
                {taskId && <TaskLink task={item._task} taskId={taskId} />}
              </div>
            );
          })}
        </GlassCard>
      )}

      <GlassCard>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{ color: 'var(--text)', fontWeight: 600, fontSize: '1rem', flex: 1 }}>
            Past Meetings
            {meetings.length > 0 && <span style={{ marginLeft: 8, color: 'var(--faint)', fontSize: '0.8rem' }}>({meetings.length})</span>}
          </div>
          <input
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 12px', color: 'var(--text)', fontSize: '0.8rem', outline: 'none', width: 200 }}
            placeholder="Search…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        {filtered.length === 0
          ? <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--faint)', fontSize: '0.875rem' }}>
              {meetings.length === 0 ? 'No meetings recorded yet.' : 'No meetings match your search.'}
            </div>
          : filtered.map(m => <TranscriptItem key={m.id} meeting={m} />)
        }
      </GlassCard>
    </div>
  );
}
