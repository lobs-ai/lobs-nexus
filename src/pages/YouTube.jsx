import { useState, useEffect, useCallback, useRef } from 'react';
import GlassCard from '../components/GlassCard';
import Badge from '../components/Badge';
import { showToast } from '../components/Toast';
import { usePolling } from '../hooks/usePolling';

const STATUS_COLORS = {
  pending: 'var(--muted)', downloading: '#f59e0b', transcribing: '#f59e0b',
  processing: '#60a5fa', ready: '#2dd4bf', failed: '#ef4444',
};

const STATUS_LABELS = {
  pending: '⏳ Queued', downloading: '⬇️ Downloading', transcribing: '🎙️ Transcribing',
  processing: '🧠 Analyzing', ready: '✅ Ready', failed: '❌ Failed',
};

function formatDuration(s) {
  if (!s) return '';
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  return `${m}m ${Math.floor(s % 60)}s`;
}

function IngestBar({ onSubmit }) {
  const [urls, setUrls] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    const parsed = urls.split(/[\n,\s]+/).filter(u => u.includes('youtu'));
    if (parsed.length === 0) return showToast('Paste YouTube URLs', 'error');
    setSubmitting(true);
    try {
      const res = await fetch('/paw/api/youtube/ingest', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls: parsed }),
      });
      if (!res.ok) throw new Error('Failed: ' + res.status);
      const data = await res.json();
      showToast(`${data.count} video(s) queued for processing`, 'success');
      setUrls('');
      onSubmit();
    } catch (e) { showToast(e.message, 'error'); }
    finally { setSubmitting(false); }
  };

  return (
    <GlassCard style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="#ef4444">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
          </svg>
        </div>
        <div>
          <div style={{ color: 'var(--text)', fontWeight: 600, fontSize: '1rem' }}>Ingest Videos</div>
          <div style={{ color: 'var(--muted)', fontSize: '0.78rem' }}>Paste YouTube URLs — one per line or comma-separated</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <textarea
          value={urls} onChange={e => setUrls(e.target.value)}
          placeholder="https://youtube.com/watch?v=..."
          rows={2}
          style={{
            flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
            borderRadius: 8, padding: '10px 12px', color: 'var(--text)', fontSize: '0.85rem',
            resize: 'none', outline: 'none', fontFamily: 'var(--mono)',
          }}
        />
        <button onClick={submit} disabled={submitting} style={{
          background: 'linear-gradient(135deg, #ef4444, #f59e0b)', border: 'none',
          borderRadius: 8, padding: '10px 20px', color: '#fff', fontWeight: 600,
          fontSize: '0.85rem', cursor: 'pointer', alignSelf: 'flex-end', opacity: submitting ? 0.6 : 1,
        }}>
          {submitting ? 'Submitting…' : 'Ingest'}
        </button>
      </div>
    </GlassCard>
  );
}

function VideoChat({ video }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    try {
      // Build context for discussion
      const context = [
        `Video: "${video.title}" by ${video.channel}`,
        video.video_summary ? `\nSUMMARY:\n${video.video_summary}` : '',
        video.reflection ? `\nREFLECTION:\n${video.reflection}` : '',
        video.transcript ? `\nTRANSCRIPT (for reference):\n${video.transcript.slice(0, 8000)}` : '',
      ].join('\n');

      const res = await fetch('/paw/api/youtube/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId: video.id, message: userMsg, context }),
      });

      if (!res.ok) throw new Error('Chat failed');
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', text: data.response }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', text: '❌ Failed to get response. Try again.' }]);
    } finally { setLoading(false); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 400 }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {messages.length === 0 && (
          <div style={{ color: 'var(--faint)', fontSize: '0.85rem', textAlign: 'center', padding: 40 }}>
            Ask anything about "{video.title}"
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} style={{
            alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: '80%', padding: '10px 14px', borderRadius: 12,
            background: msg.role === 'user' ? 'rgba(45,212,191,0.15)' : 'rgba(255,255,255,0.05)',
            border: `1px solid ${msg.role === 'user' ? 'rgba(45,212,191,0.25)' : 'var(--border)'}`,
            color: 'var(--text)', fontSize: '0.85rem', lineHeight: 1.6, whiteSpace: 'pre-wrap',
          }}>
            {msg.text}
          </div>
        ))}
        {loading && (
          <div style={{ color: 'var(--muted)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ animation: 'spin 1s linear infinite' }}>
              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
            Thinking…
          </div>
        )}
        <div ref={chatEndRef} />
      </div>
      <div style={{ display: 'flex', gap: 8, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
        <input
          value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), send())}
          placeholder="Ask about this video…"
          style={{
            flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
            borderRadius: 8, padding: '10px 14px', color: 'var(--text)', fontSize: '0.85rem', outline: 'none',
          }}
        />
        <button onClick={send} disabled={loading} style={{
          background: 'var(--teal)', border: 'none', borderRadius: 8,
          padding: '10px 16px', color: '#0f172a', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
        }}>Send</button>
      </div>
    </div>
  );
}

function VideoItem({ video, onRefresh }) {
  const [expanded, setExpanded] = useState(false);
  const [tab, setTab] = useState('summary');

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)',
      borderRadius: 10, marginBottom: 10, overflow: 'hidden',
    }}>
      <div onClick={() => setExpanded(v => !v)}
        style={{ padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}>
        {video.thumbnail ? (
          <img src={video.thumbnail} alt="" style={{ width: 64, height: 36, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />
        ) : (
          <div style={{ width: 64, height: 36, borderRadius: 6, background: 'rgba(239,68,68,0.1)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="rgba(239,68,68,0.5)">
              <path d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
            </svg>
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
            <span style={{ color: 'var(--text)', fontWeight: 600, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {video.title || video.video_url}
            </span>
            {video.video_url && (
              <a href={video.video_url} target='_blank' rel='noopener noreferrer' onClick={e => e.stopPropagation()}
                style={{ flexShrink: 0, color: 'var(--muted)', opacity: 0.7 }} title='Open on YouTube'>
                <svg width='14' height='14' fill='none' stroke='currentColor' strokeWidth='2' viewBox='0 0 24 24'>
                  <path d='M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6'/><polyline points='15 3 21 3 21 9'/><line x1='10' y1='14' x2='21' y2='3'/>
                </svg>
              </a>
            )}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            {video.channel && <span style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>{video.channel}</span>}
            {video.duration_seconds && <Badge label={formatDuration(video.duration_seconds)} color="var(--blue)" />}
            <Badge label={STATUS_LABELS[video.status] || video.status} color={STATUS_COLORS[video.status] || 'var(--muted)'} />
          </div>
        </div>
        <svg width="16" height="16" fill="none" stroke="var(--muted)" strokeWidth="2" viewBox="0 0 24 24"
          style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </div>

      {expanded && video.status === 'ready' && (
        <div style={{ borderTop: '1px solid var(--border)', background: 'rgba(0,0,0,0.15)' }}>
          <div style={{ display: 'flex', alignItems: 'center', padding: '8px 16px 0', gap: 4 }}>
            {['summary', 'reflection', 'discuss', 'transcript'].map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                background: tab === t ? 'rgba(45,212,191,0.15)' : 'transparent',
                border: tab === t ? '1px solid rgba(45,212,191,0.3)' : '1px solid transparent',
                borderRadius: 6, padding: '4px 12px',
                color: tab === t ? 'var(--teal)' : 'var(--muted)',
                fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize',
              }}>{t}</button>
            ))}
          </div>
          <div style={{ padding: 16, maxHeight: 500, overflowY: 'auto' }}>
            {tab === 'summary' && (
              <div style={{ color: 'var(--text)', fontSize: '0.85rem', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                {video.video_summary || 'No summary available.'}
              </div>
            )}
            {tab === 'reflection' && (
              <div style={{ color: 'var(--text)', fontSize: '0.85rem', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                {video.reflection || 'No reflection available.'}
              </div>
            )}
            {tab === 'discuss' && <VideoChat video={video} />}
            {tab === 'transcript' && (
              <div style={{ color: 'var(--text)', fontSize: '0.8rem', lineHeight: 1.7, whiteSpace: 'pre-wrap', fontFamily: 'var(--mono)', maxHeight: 400, overflowY: 'auto' }}>
                {video.transcript || 'No transcript available.'}
              </div>
            )}
          </div>
        </div>
      )}

      {expanded && video.status === 'failed' && (
        <div style={{ borderTop: '1px solid var(--border)', padding: 16, background: 'rgba(239,68,68,0.05)' }}>
          <div style={{ color: '#ef4444', fontSize: '0.85rem' }}>{video.error || 'Unknown error'}</div>
        </div>
      )}

      {expanded && !['ready', 'failed'].includes(video.status) && (
        <div style={{ borderTop: '1px solid var(--border)', padding: 24, textAlign: 'center' }}>
          <svg width="20" height="20" fill="none" stroke="var(--muted)" strokeWidth="2" viewBox="0 0 24 24" style={{ animation: 'spin 1s linear infinite', marginBottom: 8 }}>
            <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
          </svg>
          <div style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>{STATUS_LABELS[video.status] || 'Processing…'}</div>
        </div>
      )}
    </div>
  );
}

export default function YouTube() {
  const fetchVideos = useCallback(() => fetch('/paw/api/youtube').then(r => r.json()), []);
  const { data: videosData, reload: refresh } = usePolling(fetchVideos, 10000);
  const videos = Array.isArray(videosData) ? videosData : videosData?.videos || [];
  const [search, setSearch] = useState('');

  const filtered = videos.filter(v => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (v.title || '').toLowerCase().includes(q)
      || (v.channel || '').toLowerCase().includes(q)
      || (v.video_summary || '').toLowerCase().includes(q)
      || (v.reflection || '').toLowerCase().includes(q)
      || (v.transcript || '').toLowerCase().includes(q)
      || (v.description || '').toLowerCase().includes(q);
  });

  return (
    <div style={{ padding: '28px 28px 40px', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="#ef4444">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
          </svg>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: 'var(--text)' }}>YouTube</h1>
        </div>
        <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.875rem' }}>Ingest videos, get summaries and reflections, then discuss.</p>
      </div>

      <IngestBar onSubmit={refresh} />

      <GlassCard>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{ color: 'var(--text)', fontWeight: 600, fontSize: '1rem', flex: 1 }}>
            Videos
            {videos.length > 0 && <span style={{ marginLeft: 8, color: 'var(--faint)', fontSize: '0.8rem' }}>({filtered.length}{filtered.length !== videos.length ? '/' + videos.length : ''})</span>}
          </div>
          <input
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 12px', color: 'var(--text)', fontSize: '0.8rem', outline: 'none', width: 240 }}
            placeholder='Search videos, summaries, reflections...'
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        {filtered.length === 0
          ? <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--faint)', fontSize: '0.875rem' }}>{videos.length === 0 ? 'No videos ingested yet.' : 'No videos match your search.'}</div>
          : filtered.map(v => <VideoItem key={v.id} video={v} onRefresh={refresh} />)
        }
      </GlassCard>
    </div>
  );
}
