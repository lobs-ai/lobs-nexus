import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

const NAV_ITEMS = [
  { type: 'nav', label: 'Home / Dashboard', to: '/' },
  { type: 'nav', label: 'Projects', to: '/projects' },
  { type: 'nav', label: 'Tasks', to: '/tasks' },
  { type: 'nav', label: 'Team', to: '/team' },
  { type: 'nav', label: 'Flows / Workflows', to: '/workflows' },
  { type: 'nav', label: 'Inbox', to: '/inbox' },
  { type: 'nav', label: 'Chat', to: '/chat' },
  { type: 'nav', label: 'Docs / Knowledge', to: '/knowledge' },
  { type: 'nav', label: 'Memory', to: '/memory' },
  { type: 'nav', label: 'Usage', to: '/usage' },
  { type: 'nav', label: 'Settings', to: '/settings' },
  { type: 'nav', label: 'Reflections', to: '/reflections' },
];

function fuzzy(text, query) {
  if (!query) return true;
  const t = text.toLowerCase();
  const q = query.toLowerCase();
  let ti = 0;
  for (let i = 0; i < q.length; i++) {
    const idx = t.indexOf(q[i], ti);
    if (idx === -1) return false;
    ti = idx + 1;
  }
  return true;
}

export default function CommandPalette({ open, onClose }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(0);
  const [dataItems, setDataItems] = useState([]);
  const inputRef = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    const load = async () => {
      const items = [];
      try {
        const tasks = await api.tasks({ limit: 200 }, signal);
        if (signal.aborted) return;
        const list = tasks?.tasks || tasks || [];
        list.forEach(t => {
          if (t.title) items.push({ type: 'task', label: t.title, sub: t.status || '', to: '/tasks' });
        });
      } catch (e) { if (e.name === 'AbortError') return; }
      try {
        const inbox = await api.inbox(signal);
        if (signal.aborted) return;
        const list = inbox?.items || inbox || [];
        list.forEach(i => {
          if (i.title || i.subject) items.push({ type: 'inbox', label: i.title || i.subject, sub: i.type || '', to: '/inbox' });
        });
      } catch (e) { if (e.name === 'AbortError') return; }
      try {
        const projects = await api.projects(signal);
        if (signal.aborted) return;
        const list = projects?.projects || projects || [];
        list.forEach(p => {
          if (p.name) items.push({ type: 'project', label: p.name, sub: p.status || '', to: '/projects' });
        });
      } catch (e) { if (e.name === 'AbortError') return; }
      setDataItems(items);
    };
    load();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const all = [...NAV_ITEMS, ...dataItems];
    const filtered = query ? all.filter(item => fuzzy(item.label, query)) : NAV_ITEMS;
    setResults(filtered.slice(0, 12));
    setSelected(0);
  }, [query, dataItems]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open]);

  const handleSelect = useCallback((item) => {
    navigate(item.to);
    onClose();
  }, [navigate, onClose]);

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelected(s => Math.min(s + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelected(s => Math.max(s - 1, 0));
    } else if (e.key === 'Enter') {
      if (results[selected]) handleSelect(results[selected]);
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!open) return null;

  const typeIcon = (type) => {
    switch (type) {
      case 'nav': return '→';
      case 'task': return '✓';
      case 'inbox': return '✉';
      case 'project': return '◆';
      default: return '·';
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: '15vh',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 560,
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 14,
          boxShadow: '0 24px 64px rgba(0,0,0,0.5), 0 0 0 1px rgba(45,212,191,0.1)',
          overflow: 'hidden',
          margin: '0 16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
          <svg width="16" height="16" fill="none" stroke="var(--muted)" strokeWidth="2" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search pages, tasks, projects, inbox…"
            style={{
              flex: 1, background: 'none', border: 'none', outline: 'none',
              color: 'var(--text)', fontSize: '0.95rem', fontFamily: 'inherit',
            }}
          />
          <kbd style={{
            fontFamily: 'var(--mono)', fontSize: '0.65rem', color: 'var(--faint)',
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 4, padding: '2px 6px',
          }}>esc</kbd>
        </div>

        <div style={{ maxHeight: 360, overflowY: 'auto' }}>
          {results.length === 0 ? (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--faint)', fontSize: '0.85rem' }}>
              No results for "{query}"
            </div>
          ) : (
            results.map((item, i) => (
              <div
                key={`${item.type}-${item.label}-${i}`}
                onClick={() => handleSelect(item)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 16px', cursor: 'pointer',
                  background: i === selected ? 'rgba(45,212,191,0.08)' : 'transparent',
                  borderLeft: i === selected ? '2px solid var(--teal)' : '2px solid transparent',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={() => setSelected(i)}
              >
                <span style={{ fontSize: '0.8rem', color: 'var(--teal)', fontFamily: 'var(--mono)', width: 14, textAlign: 'center', flexShrink: 0 }}>
                  {typeIcon(item.type)}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.88rem', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.label}
                  </div>
                  {item.sub && (
                    <div style={{ fontSize: '0.72rem', color: 'var(--faint)', marginTop: 1 }}>{item.sub}</div>
                  )}
                </div>
                <span style={{ fontSize: '0.65rem', color: 'var(--faint)', fontFamily: 'var(--mono)', flexShrink: 0 }}>
                  {item.type}
                </span>
              </div>
            ))
          )}
        </div>

        <div style={{ padding: '8px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: 16, color: 'var(--faint)', fontSize: '0.7rem', fontFamily: 'var(--mono)' }}>
          <span>↑↓ navigate</span>
          <span>↵ select</span>
          <span>esc close</span>
        </div>
      </div>
    </div>
  );
}
