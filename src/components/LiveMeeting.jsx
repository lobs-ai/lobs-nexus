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

/* ───────────────────────── Expandable Activity Item ───────────────────────── */

function ActivityItem({ item, isNew }) {
  const [expanded, setExpanded] = useState(false);
  const icons = {
    note: '📝', action: '✅', flag: '⚠️', context: '🔍', question: '❓',
    research: '🔬', suggestion: '💡',
  };
  const colors = {
    note: 'var(--teal)', action: '#60a5fa', flag: '#fbbf24',
    context: '#a78bfa', question: '#fb923c',
    research: '#22d3ee', suggestion: '#34d399',
  };
  const priorityIcons = { high: '🔴', medium: '🟡', low: '🟢' };

  const color = colors[item.type] || 'var(--muted)';
  const icon = icons[item.type] || '💡';
  const truncateLen = 120;
  const shouldTruncate = item.content && item.content.length > truncateLen;
  const displayText = (!expanded && shouldTruncate)
    ? item.content.slice(0, truncateLen) + '…'
    : item.content;

  return (
    <div
      onClick={() => (shouldTruncate || item.type === 'action') && setExpanded(!expanded)}
      style={{
        padding: '10px 12px',
        background: `${color}10`,
        border: `1px solid ${color}30`,
        borderRadius: 8,
        marginBottom: 8,
        animation: isNew ? 'slideUpItem 0.3s ease-out' : 'none',
        cursor: shouldTruncate || item.type === 'action' ? 'pointer' : 'default',
        transition: 'background 0.15s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <span>{icon}</span>
        <span style={{
          color, fontSize: '0.72rem', fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.04em',
        }}>
          {item.type}
        </span>
        {item.priority && (
          <span style={{ fontSize: '0.65rem' }}>
            {priorityIcons[item.priority] || ''} {item.priority}
          </span>
        )}
        {item.timestamp && (
          <span style={{
            color: 'var(--faint)', fontSize: '0.7rem',
            fontFamily: 'var(--mono)', marginLeft: 'auto',
          }}>
            {item.timestamp}
          </span>
        )}
        {(shouldTruncate || item.type === 'action') && (
          <span style={{
            color: 'var(--faint)', fontSize: '0.65rem', marginLeft: shouldTruncate && !item.timestamp ? 'auto' : 4,
            transition: 'transform 0.2s',
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
            display: 'inline-block',
          }}>▼</span>
        )}
      </div>
      <div style={{ color: 'var(--text)', fontSize: '0.83rem', lineHeight: 1.5 }}>
        {displayText}
      </div>
      {expanded && item.type === 'action' && (
        <div style={{
          marginTop: 8, paddingTop: 8,
          borderTop: `1px solid ${color}20`,
          display: 'flex', gap: 12, alignItems: 'center',
        }}>
          {item.assignee && (
            <span style={{
              color: '#60a5fa', fontSize: '0.72rem', fontWeight: 600,
              background: 'rgba(96,165,250,0.1)', borderRadius: 10, padding: '2px 8px',
            }}>
              @{item.assignee}
            </span>
          )}
          {item.priority && (
            <span style={{
              color: item.priority === 'high' ? '#ef4444' : item.priority === 'medium' ? '#fbbf24' : '#22c55e',
              fontSize: '0.72rem', fontWeight: 600,
              textTransform: 'uppercase',
            }}>
              {item.priority} priority
            </span>
          )}
        </div>
      )}
      {!expanded && item.type === 'action' && item.assignee && (
        <div style={{ color: 'var(--faint)', fontSize: '0.72rem', marginTop: 4 }}>
          → <span style={{ color: '#60a5fa' }}>@{item.assignee}</span>
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── Topics List ───────────────────────── */

function TopicsList({ topics }) {
  if (!topics || topics.length === 0) return null;
  const topicColors = ['#a78bfa', '#60a5fa', '#2dd4bf', '#fb923c', '#f472b6', '#fbbf24'];
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{
        color: 'var(--muted)', fontSize: '0.7rem', fontWeight: 600,
        textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6,
      }}>Topics Discussed</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {topics.map((topic, i) => {
          const c = topicColors[i % topicColors.length];
          return (
            <span key={i} style={{
              background: `${c}15`, border: `1px solid ${c}40`,
              borderRadius: 12, padding: '3px 10px', color: c,
              fontSize: '0.72rem', fontWeight: 600,
            }}>
              {topic}
            </span>
          );
        })}
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

/* ───────────────────────── Tab Bar ───────────────────────── */

function TabBar({ tabs, activeTab, onTabChange }) {
  return (
    <div style={{
      display: 'flex', gap: 2, padding: '0 16px',
      borderBottom: '1px solid var(--border)',
      background: 'rgba(0,0,0,0.1)',
    }}>
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          style={{
            background: 'none', border: 'none',
            borderBottom: activeTab === tab.id
              ? '2px solid var(--teal)'
              : '2px solid transparent',
            padding: '10px 14px',
            color: activeTab === tab.id ? 'var(--text)' : 'var(--faint)',
            fontSize: '0.78rem', fontWeight: 600,
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
            transition: 'color 0.15s, border-color 0.15s',
          }}
        >
          <span>{tab.icon}</span>
          {tab.label}
          {tab.count > 0 && (
            <span style={{
              background: activeTab === tab.id ? 'var(--teal)' : 'rgba(255,255,255,0.1)',
              color: activeTab === tab.id ? '#000' : 'var(--faint)',
              fontSize: '0.62rem', fontWeight: 700,
              borderRadius: 8, padding: '1px 6px',
              minWidth: 16, textAlign: 'center',
            }}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

/* ───────────────────────── Processing Indicator ───────────────────────── */

function ProcessingIndicator({ chunkCount }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '8px 16px',
      background: 'rgba(96,165,250,0.06)',
      borderBottom: '1px solid rgba(96,165,250,0.1)',
    }}>
      <div style={{
        width: 6, height: 6, borderRadius: '50%',
        background: '#60a5fa',
        animation: 'processingPulse 1s ease-in-out infinite',
      }} />
      <span style={{ color: '#60a5fa', fontSize: '0.72rem', fontWeight: 600 }}>
        Processing chunk {chunkCount + 1}…
      </span>
    </div>
  );
}

/* ───────────────────────── Post-Meeting Recap ───────────────────────── */

function MeetingRecap({ title, elapsed, participants, meetingType, runningSummary, topics, insights, chunks, onClose }) {
  const [showTranscript, setShowTranscript] = useState(false);
  const actionItems = insights.filter(i => i.type === 'action');
  const keyInsights = insights.filter(i => i.type !== 'action');

  // Group actions by assignee
  const actionsByAssignee = {};
  actionItems.forEach(item => {
    const key = item.assignee || 'Unassigned';
    if (!actionsByAssignee[key]) actionsByAssignee[key] = [];
    actionsByAssignee[key].push(item);
  });

  const priorityIcon = { high: '🔴', medium: '🟡', low: '🟢' };
  const fullTranscript = chunks.map(c => c.text).join(' ');

  const copySummary = () => {
    const parts = [];
    parts.push(`# ${title}`);
    parts.push(`Duration: ${formatElapsed(elapsed)} | Participants: ${participants.join(', ') || 'N/A'}`);
    if (runningSummary) parts.push(`\n## Summary\n${runningSummary}`);
    if (topics.length) parts.push(`\n## Topics\n${topics.map(t => `- ${t}`).join('\n')}`);
    if (actionItems.length) {
      parts.push('\n## Action Items');
      actionItems.forEach(a => {
        const p = priorityIcon[a.priority] || '';
        parts.push(`- ${p} ${a.content}${a.assignee ? ` → @${a.assignee}` : ''}`);
      });
    }
    if (keyInsights.length) {
      parts.push('\n## Insights');
      keyInsights.forEach(i => parts.push(`- [${i.type}] ${i.content}`));
    }
    navigator.clipboard.writeText(parts.join('\n'));
    showToast('Summary copied to clipboard', 'success');
  };

  const copyTranscript = () => {
    navigator.clipboard.writeText(fullTranscript);
    showToast('Transcript copied', 'success');
  };

  return (
    <div style={{
      maxWidth: 800, margin: '40px auto', padding: '0 20px',
      animation: 'slideUpItem 0.4s ease-out',
    }}>
      {/* Header card */}
      <GlassCard>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h2 style={{ color: 'var(--text)', fontSize: '1.4rem', fontWeight: 700, margin: '0 0 8px' }}>
              {title}
            </h2>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{
                color: 'var(--faint)', fontSize: '0.78rem',
                fontFamily: 'var(--mono)',
              }}>
                ⏱ {formatElapsed(elapsed)}
              </span>
              {meetingType && meetingType !== 'other' && (
                <span style={{
                  fontSize: '0.68rem', fontWeight: 600, textTransform: 'capitalize',
                  color: '#a78bfa', background: 'rgba(167,139,250,0.12)',
                  border: '1px solid rgba(167,139,250,0.25)',
                  borderRadius: 10, padding: '2px 10px',
                }}>
                  {meetingType.replace(/-/g, ' ')}
                </span>
              )}
              {participants.map((p, i) => (
                <span key={i} style={{
                  fontSize: '0.72rem', fontWeight: 600,
                  color: '#60a5fa', background: 'rgba(96,165,250,0.1)',
                  border: '1px solid rgba(96,165,250,0.25)',
                  borderRadius: 10, padding: '2px 10px',
                }}>
                  {p}
                </span>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button onClick={copySummary} style={{
              background: 'rgba(45,212,191,0.1)', border: '1px solid rgba(45,212,191,0.3)',
              borderRadius: 8, padding: '8px 14px', color: 'var(--teal)',
              fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              📋 Copy Summary
            </button>
            <button onClick={onClose} style={{
              background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
              borderRadius: 8, padding: '8px 14px', color: 'var(--muted)',
              fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer',
            }}>
              Done
            </button>
          </div>
        </div>

        {/* Summary */}
        {runningSummary && (
          <div style={{
            background: 'rgba(45,212,191,0.06)', border: '1px solid rgba(45,212,191,0.15)',
            borderRadius: 10, padding: 16, marginBottom: 20,
          }}>
            <div style={{
              color: 'var(--teal)', fontSize: '0.72rem', fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6,
            }}>Summary</div>
            <div style={{ color: 'var(--text)', fontSize: '0.88rem', lineHeight: 1.7 }}>
              {runningSummary}
            </div>
          </div>
        )}

        {/* Topics */}
        {topics.length > 0 && <TopicsList topics={topics} />}
      </GlassCard>

      {/* Action Items */}
      {actionItems.length > 0 && (
        <GlassCard style={{ marginTop: 16 }}>
          <div style={{
            color: '#60a5fa', fontSize: '0.78rem', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 14,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span>✅</span> Action Items ({actionItems.length})
          </div>
          {Object.entries(actionsByAssignee).map(([assignee, items]) => (
            <div key={assignee} style={{ marginBottom: 16 }}>
              <div style={{
                color: assignee === 'Unassigned' ? 'var(--faint)' : '#60a5fa',
                fontSize: '0.75rem', fontWeight: 600, marginBottom: 8,
              }}>
                {assignee === 'Unassigned' ? 'Unassigned' : `@${assignee}`}
              </div>
              {items.map((item, i) => (
                <div key={i} style={{
                  display: 'flex', gap: 10, alignItems: 'flex-start',
                  padding: '8px 12px', marginBottom: 6,
                  background: 'rgba(96,165,250,0.05)',
                  border: '1px solid rgba(96,165,250,0.12)',
                  borderRadius: 8,
                }}>
                  <span style={{ fontSize: '0.75rem', flexShrink: 0, paddingTop: 2 }}>
                    {priorityIcon[item.priority] || '⚪'}
                  </span>
                  <div style={{
                    color: 'var(--text)', fontSize: '0.83rem', lineHeight: 1.5, flex: 1,
                  }}>
                    {item.content}
                  </div>
                  {item.priority && (
                    <span style={{
                      fontSize: '0.62rem', fontWeight: 700,
                      textTransform: 'uppercase', flexShrink: 0,
                      color: item.priority === 'high' ? '#ef4444' : item.priority === 'medium' ? '#fbbf24' : '#22c55e',
                    }}>
                      {item.priority}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ))}
        </GlassCard>
      )}

      {/* Key Insights */}
      {keyInsights.length > 0 && (
        <GlassCard style={{ marginTop: 16 }}>
          <div style={{
            color: '#a78bfa', fontSize: '0.78rem', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 14,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span>🧠</span> Key Insights ({keyInsights.length})
          </div>
          {keyInsights.map((item, i) => (
            <ActivityItem key={i} item={item} isNew={false} />
          ))}
        </GlassCard>
      )}

      {/* Transcript */}
      <GlassCard style={{ marginTop: 16 }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: showTranscript ? 14 : 0,
        }}>
          <button
            onClick={() => setShowTranscript(!showTranscript)}
            style={{
              background: 'none', border: 'none', color: 'var(--text)',
              fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8, padding: 0,
            }}
          >
            <span style={{
              display: 'inline-block',
              transition: 'transform 0.2s',
              transform: showTranscript ? 'rotate(90deg)' : 'rotate(0deg)',
              fontSize: '0.7rem',
            }}>▶</span>
            Full Transcript
            <span style={{ color: 'var(--faint)', fontSize: '0.72rem', fontWeight: 400 }}>
              ({chunks.length} chunks)
            </span>
          </button>
          {showTranscript && (
            <button onClick={copyTranscript} style={{
              background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
              borderRadius: 6, padding: '4px 10px', color: 'var(--muted)',
              fontSize: '0.72rem', cursor: 'pointer',
            }}>
              📋 Copy
            </button>
          )}
        </div>
        {showTranscript && (
          <div style={{
            maxHeight: 400, overflowY: 'auto',
            animation: 'slideUpItem 0.3s ease-out',
          }}>
            {chunks.map((chunk, i) => (
              <div key={i} style={{
                display: 'flex', gap: 12, marginBottom: 14,
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
          </div>
        )}
      </GlassCard>
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
    <div style={{ maxWidth: 520, margin: '60px auto', padding: '0 20px' }}>
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
  const [phase, setPhase] = useState('setup'); // setup → recording → ended

  const [sessionId, setSessionId] = useState(null);
  const [title, setTitle] = useState('Live Meeting');
  const [editingTitle, setEditingTitle] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [meetingType, setMeetingType] = useState('other');

  const [elapsed, setElapsed] = useState(0);
  const [chunks, setChunks] = useState([]);
  const [insights, setInsights] = useState([]);
  const [runningSummary, setRunningSummary] = useState('');
  const [topics, setTopics] = useState([]);
  const [activeTab, setActiveTab] = useState('summary');
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastChunkCount, setLastChunkCount] = useState(0);
  const [pendingResearch, setPendingResearch] = useState([]);

  const mediaRecorderRef = useRef(null);
  const timerRef = useRef(null);
  const pollRef = useRef(null);
  const streamsRef = useRef([]);
  const transcriptEndRef = useRef(null);
  const activityEndRef = useRef(null);
  const newItemsRef = useRef(new Set());
  const lastInsightCountRef = useRef(0);
  const chunkSentAtRef = useRef(null);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chunks]);

  // Auto-scroll activity feed
  useEffect(() => {
    activityEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [insights]);

  // Clear new-item animation markers
  useEffect(() => {
    if (newItemsRef.current.size > 0) {
      const t = setTimeout(() => newItemsRef.current.clear(), 500);
      return () => clearTimeout(t);
    }
  }, [insights]);

  // Timer
  useEffect(() => {
    if (phase === 'recording') {
      timerRef.current = setInterval(() => setElapsed(prev => prev + 1), 1000);
      return () => clearInterval(timerRef.current);
    }
  }, [phase]);

  // Processing detection: if we sent a chunk but haven't gotten it back yet
  useEffect(() => {
    if (chunkSentAtRef.current && chunks.length > lastChunkCount) {
      setIsProcessing(false);
      chunkSentAtRef.current = null;
      setLastChunkCount(chunks.length);
    }
  }, [chunks, lastChunkCount]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (pollRef.current) clearInterval(pollRef.current);
      if (mediaRecorderRef.current?.state !== 'inactive') {
        try { mediaRecorderRef.current?.stop(); } catch (_) {}
      }
      streamsRef.current.forEach(s => s.getTracks().forEach(t => t.stop()));
    };
  }, []);

  /* ─── Poll backend for session updates ─── */
  const startPolling = useCallback((sid) => {
    if (pollRef.current) clearInterval(pollRef.current);

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/paw/api/meetings/live/${sid}`);
        if (!res.ok) return;
        const data = await res.json();

        // Update chunks from server (authoritative)
        if (data.chunks?.length) {
          setChunks(data.chunks.map((c, i) => ({
            text: c.text,
            index: c.index ?? i,
            timestamp: null,
          })));
        }

        // Update insights — detect new ones for animation
        if (data.insights?.length > lastInsightCountRef.current) {
          const newOnes = data.insights.slice(lastInsightCountRef.current);
          for (const ins of newOnes) {
            const id = Date.now() + Math.random();
            ins._id = id;
            newItemsRef.current.add(id);
          }
          lastInsightCountRef.current = data.insights.length;
        }
        if (data.insights) {
          setInsights(data.insights.map((ins, i) => ({ ...ins, _id: ins._id || i })));
        }

        // Action items are included in insights as type "action" from the LLM,
        // but we also get dedicated actionItems array
        if (data.actionItems?.length) {
          const actionInsights = data.actionItems.map((a, i) => ({
            type: 'action',
            content: a.description,
            assignee: a.assignee,
            priority: a.priority,
            _id: `action-${i}`,
          }));
          setInsights(prev => {
            const nonActions = prev.filter(p => p.type !== 'action');
            return [...nonActions, ...actionInsights];
          });
        }

        if (data.runningSummary) setRunningSummary(data.runningSummary);
        if (data.topics?.length) setTopics(data.topics);
        if (data.pendingResearch) setPendingResearch(data.pendingResearch);

        if (data.title && !editingTitle) setTitle(data.title);
        if (data.participants?.length) setParticipants(data.participants);
        if (data.meetingType) setMeetingType(data.meetingType);
      } catch (_) {
        // Polling failure — just try again next interval
      }
    }, 5000);
  }, [editingTitle]);

  /* ─── Start live meeting ─── */
  const handleStart = useCallback(async ({ title: meetingTitle, participants: initParticipants, meetingType: initType, withSystem }) => {
    setTitle(meetingTitle);
    setParticipants(initParticipants || []);
    setMeetingType(initType || 'other');

    const res = await fetch('/paw/api/meetings/live/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: meetingTitle, participants: initParticipants, meetingType: initType }),
    });
    if (!res.ok) throw new Error('Failed to start live meeting: ' + res.status);
    const data = await res.json();
    const sid = data.sessionId || data.session_id || data.id;
    setSessionId(sid);

    startPolling(sid);

    const streams = [];
    try {
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streams.push(micStream);
    } catch (e) {
      showToast('Microphone access denied: ' + e.message, 'error');
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
        setIsProcessing(true);
        chunkSentAtRef.current = Date.now();
        try {
          await fetch(`/paw/api/meetings/live/${sid}/chunk`, {
            method: 'POST',
            headers: { 'Content-Type': 'audio/webm' },
            body: e.data,
          });
        } catch (err) {
          console.warn('[LiveMeeting] Failed to send chunk:', err.message);
          setIsProcessing(false);
        }
      }
    };

    mr.start(30000);
    mediaRecorderRef.current = mr;

    setPhase('recording');
    showToast('Live meeting started — Lobs is listening', 'success');
  }, [startPolling]);

  /* ─── Stop live meeting ─── */
  const handleStop = useCallback(async () => {
    if (mediaRecorderRef.current?.state !== 'inactive') {
      try { mediaRecorderRef.current?.stop(); } catch (_) {}
    }

    streamsRef.current.forEach(s => s.getTracks().forEach(t => t.stop()));
    streamsRef.current = [];

    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

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

  /* ─── Copy transcript ─── */
  const copyTranscript = () => {
    const text = chunks.map(c => c.text).join(' ');
    navigator.clipboard.writeText(text);
    showToast('Transcript copied', 'success');
  };

  /* ─── Render ─── */

  if (phase === 'setup') {
    return <LiveMeetingSetup onStart={handleStart} onCancel={onClose} />;
  }

  // Post-meeting recap view
  if (phase === 'ended') {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', height: '100vh',
        overflow: 'auto',
      }}>
        <style>{`
          @keyframes slideUpItem {
            from { opacity: 0; transform: translateY(12px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
        <MeetingRecap
          title={title}
          elapsed={elapsed}
          participants={participants}
          meetingType={meetingType}
          runningSummary={runningSummary}
          topics={topics}
          insights={insights}
          chunks={chunks}
          onClose={onClose}
        />
      </div>
    );
  }

  // Live recording view
  const actionItems = insights.filter(i => i.type === 'action');
  const otherInsights = insights.filter(i => i.type !== 'action');

  const tabs = [
    { id: 'summary', label: 'Summary', icon: '📊', count: topics.length },
    { id: 'actions', label: 'Actions', icon: '✅', count: actionItems.length },
    { id: 'insights', label: 'Insights', icon: '🧠', count: otherInsights.length },
  ];

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100vh',
      overflow: 'hidden', position: 'relative',
    }}>
      <style>{`
        @keyframes slideUpItem {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes livePulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(239,68,68,0.5); }
          50% { opacity: 0.7; box-shadow: 0 0 0 8px rgba(239,68,68,0); }
        }
        @keyframes processingPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>

      {/* ─── Top bar ─── */}
      <div style={{
        padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 14,
        borderBottom: '1px solid var(--border)',
        background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(12px)',
        flexShrink: 0, zIndex: 10,
      }}>
        <button onClick={undefined} style={{
          background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
          borderRadius: 6, padding: '6px 10px', color: 'var(--muted)',
          cursor: 'default', opacity: 0.4,
          display: 'flex', alignItems: 'center',
        }} disabled title="End meeting first">
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>

        <span style={{
          width: 10, height: 10, borderRadius: '50%', background: '#ef4444',
          animation: 'livePulse 1.5s ease-in-out infinite', flexShrink: 0,
        }} />

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
              cursor: 'pointer', flex: 1, display: 'flex', alignItems: 'center', gap: 10,
            }}
            title="Click to edit title"
          >
            <span>{title}</span>
            {meetingType && meetingType !== 'other' && (
              <span style={{
                fontSize: '0.68rem', fontWeight: 600, textTransform: 'capitalize',
                color: '#a78bfa', background: 'rgba(167,139,250,0.12)',
                border: '1px solid rgba(167,139,250,0.25)',
                borderRadius: 10, padding: '1px 8px',
              }}>
                {meetingType.replace(/-/g, ' ')}
              </span>
            )}
          </div>
        )}

        {/* Badges area */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {participants.length > 0 && (
            <span style={{
              fontSize: '0.68rem', color: 'var(--faint)',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid var(--border)',
              borderRadius: 10, padding: '2px 8px',
            }}>
              👥 {participants.length}
            </span>
          )}
          {chunks.length > 0 && (
            <span style={{
              fontSize: '0.68rem', color: 'var(--faint)',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid var(--border)',
              borderRadius: 10, padding: '2px 8px',
              fontFamily: 'var(--mono)',
            }}>
              {chunks.length} chunk{chunks.length !== 1 ? 's' : ''}
            </span>
          )}
          {isProcessing && (
            <span style={{
              fontSize: '0.68rem', color: '#60a5fa',
              background: 'rgba(96,165,250,0.1)',
              border: '1px solid rgba(96,165,250,0.25)',
              borderRadius: 10, padding: '2px 8px',
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <span style={{
                width: 5, height: 5, borderRadius: '50%',
                background: '#60a5fa',
                animation: 'processingPulse 1s ease-in-out infinite',
              }} />
              processing
            </span>
          )}
        </div>

        <div style={{
          fontFamily: 'var(--mono)', fontSize: '0.95rem', fontWeight: 700,
          color: '#ef4444',
          minWidth: 70, textAlign: 'center',
        }}>
          {formatElapsed(elapsed)}
        </div>

        <Badge label="LIVE" color="#ef4444" dot />

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
          <div style={{
            padding: '10px 20px', borderBottom: '1px solid var(--border)',
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
            <span style={{ color: 'var(--faint)', fontSize: '0.72rem', marginLeft: 'auto' }}>
              {chunks.length} chunk{chunks.length !== 1 ? 's' : ''}
            </span>
            {chunks.length > 0 && (
              <button onClick={copyTranscript} style={{
                background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
                borderRadius: 5, padding: '3px 8px', color: 'var(--faint)',
                fontSize: '0.68rem', cursor: 'pointer',
              }} title="Copy transcript">
                📋
              </button>
            )}
          </div>

          {/* Processing indicator */}
          {isProcessing && <ProcessingIndicator chunkCount={chunks.length} />}

          <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
            {chunks.length === 0 ? (
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', height: '100%', color: 'var(--faint)',
              }}>
                <svg width="32" height="32" fill="none" stroke="var(--faint)" strokeWidth="1.5" viewBox="0 0 24 24" style={{ marginBottom: 12, opacity: 0.5 }}>
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                </svg>
                <div style={{ fontSize: '0.85rem' }}>Listening… transcript will appear here</div>
                <div style={{ fontSize: '0.75rem', marginTop: 4, opacity: 0.7 }}>First chunk processes after ~30 seconds</div>
              </div>
            ) : (
              <>
                {chunks.map((chunk, i) => (
                  <div key={i}>
                    {/* Time pill separator between chunks */}
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      marginBottom: 8, marginTop: i > 0 ? 16 : 0,
                    }}>
                      <div style={{
                        flex: 1, height: 1,
                        background: i === 0 ? 'transparent' : 'linear-gradient(to right, transparent, var(--border), transparent)',
                      }} />
                      <span style={{
                        background: 'rgba(45,212,191,0.08)',
                        border: '1px solid rgba(45,212,191,0.2)',
                        borderRadius: 10, padding: '2px 10px',
                        color: 'var(--teal)', fontSize: '0.65rem',
                        fontFamily: 'var(--mono)', fontWeight: 600,
                        flexShrink: 0,
                      }}>
                        {chunk.timestamp || formatChunkTime(i * 30)}
                      </span>
                      <div style={{
                        flex: 1, height: 1,
                        background: i === 0 ? 'transparent' : 'linear-gradient(to right, transparent, var(--border), transparent)',
                      }} />
                    </div>
                    <div style={{
                      color: 'var(--text)', fontSize: '0.85rem',
                      lineHeight: 1.7, paddingLeft: 8,
                      animation: i === chunks.length - 1 ? 'slideUpItem 0.3s ease-out' : 'none',
                    }}>
                      {chunk.text}
                    </div>
                  </div>
                ))}
                <div ref={transcriptEndRef} />
              </>
            )}
          </div>
        </div>

        {/* Right panel — Activity Feed with Tabs (40%) */}
        <div style={{
          flex: '0 0 40%', display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }} className="live-meeting-activity-panel">
          {/* Panel header */}
          <div style={{
            padding: '10px 20px', borderBottom: 'none',
            display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
            background: 'rgba(0,0,0,0.15)',
          }}>
            <span style={{ fontSize: '0.9rem' }}>🧠</span>
            <span style={{ color: 'var(--text)', fontWeight: 600, fontSize: '0.85rem' }}>
              Lobs Activity
            </span>
            <span style={{ color: 'var(--faint)', fontSize: '0.72rem', marginLeft: 'auto' }}>
              {insights.length} item{insights.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Tab bar */}
          <TabBar tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

          {/* Research in progress indicator */}
          {pendingResearch.filter(r => r.status !== 'done').length > 0 && (
            <div style={{
              padding: '8px 16px',
              background: 'rgba(96, 165, 250, 0.08)',
              borderBottom: '1px solid rgba(96, 165, 250, 0.15)',
              display: 'flex', flexDirection: 'column', gap: 4,
            }}>
              {pendingResearch.filter(r => r.status !== 'done').map((r, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  color: '#60a5fa', fontSize: '0.75rem',
                }}>
                  <span style={{
                    display: 'inline-block', width: 6, height: 6,
                    borderRadius: '50%', background: '#60a5fa',
                    animation: 'pulse 1.5s ease-in-out infinite',
                  }} />
                  <span style={{ fontWeight: 600 }}>Researching:</span>
                  <span style={{ color: 'var(--text)', opacity: 0.8 }}>{r.query || r.topic}</span>
                </div>
              ))}
            </div>
          )}

          {/* Tab content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
            {/* Summary tab */}
            {activeTab === 'summary' && (
              <div style={{ animation: 'slideUpItem 0.2s ease-out' }}>
                <RunningSummary summary={runningSummary} />
                <TopicsList topics={topics} />
                {!runningSummary && topics.length === 0 && (
                  <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    justifyContent: 'center', paddingTop: 60, color: 'var(--faint)',
                    textAlign: 'center',
                  }}>
                    <span style={{ fontSize: '1.5rem', marginBottom: 8, opacity: 0.5 }}>📊</span>
                    <div style={{ fontSize: '0.82rem' }}>Summary building…</div>
                    <div style={{ fontSize: '0.72rem', marginTop: 4, maxWidth: 200, opacity: 0.7 }}>
                      A running summary and topics will appear as the meeting progresses
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Actions tab */}
            {activeTab === 'actions' && (
              <div style={{ animation: 'slideUpItem 0.2s ease-out' }}>
                {actionItems.length > 0 ? (
                  actionItems.map((item, i) => (
                    <ActivityItem
                      key={item._id || i}
                      item={item}
                      isNew={newItemsRef.current.has(item._id)}
                    />
                  ))
                ) : (
                  <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    justifyContent: 'center', paddingTop: 60, color: 'var(--faint)',
                    textAlign: 'center',
                  }}>
                    <span style={{ fontSize: '1.5rem', marginBottom: 8, opacity: 0.5 }}>✅</span>
                    <div style={{ fontSize: '0.82rem' }}>No action items yet</div>
                    <div style={{ fontSize: '0.72rem', marginTop: 4, maxWidth: 200, opacity: 0.7 }}>
                      Lobs will extract action items as they come up in discussion
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Insights tab */}
            {activeTab === 'insights' && (
              <div style={{ animation: 'slideUpItem 0.2s ease-out' }}>
                {otherInsights.length > 0 ? (
                  otherInsights.map((item, i) => (
                    <ActivityItem
                      key={item._id || i}
                      item={item}
                      isNew={newItemsRef.current.has(item._id)}
                    />
                  ))
                ) : (
                  <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    justifyContent: 'center', paddingTop: 60, color: 'var(--faint)',
                    textAlign: 'center',
                  }}>
                    <span style={{ fontSize: '1.5rem', marginBottom: 8, opacity: 0.5 }}>🧠</span>
                    <div style={{ fontSize: '0.82rem' }}>No insights yet</div>
                    <div style={{ fontSize: '0.72rem', marginTop: 4, maxWidth: 220, opacity: 0.7 }}>
                      Notes, flags, context, and questions will appear here as Lobs analyzes
                    </div>
                  </div>
                )}
              </div>
            )}

            <div ref={activityEndRef} />
          </div>
        </div>
      </div>

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
