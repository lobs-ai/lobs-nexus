import { useState, useEffect, useRef, useCallback } from 'react';
import { useChatState } from '../hooks/useChatState';

// ---------------------------------------------------------------------------
// Markdown renderer (simple)
// ---------------------------------------------------------------------------

function renderMarkdown(text) {
  if (!text) return '';

  // Extract fenced code blocks first to protect them from further processing
  const codeBlocks = [];
  let processed = text.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    const idx = codeBlocks.length;
    const escapedCode = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    codeBlocks.push(
      `<pre class="chat-code">${lang ? `<div style="font-size:0.65rem;color:var(--muted);opacity:0.5;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.05em">${lang}</div>` : ''}${escapedCode.replace(/^\n|\n$/g, '')}</pre>`
    );
    return `\x00CB${idx}\x00`;
  });

  // Inline code (protect from further processing)
  const inlineCode = [];
  processed = processed.replace(/`([^`\n]+)`/g, (_, code) => {
    const idx = inlineCode.length;
    const escaped = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    inlineCode.push(
      `<code style="background:rgba(45,212,191,0.08);border-radius:4px;padding:1px 5px;font-family:var(--mono);font-size:0.85em;color:var(--teal)">${escaped}</code>`
    );
    return `\x00IC${idx}\x00`;
  });

  // Process line-level formatting
  const lines = processed.split('\n');
  const output = [];
  let inList = false;
  let listType = null;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Headers
    const headerMatch = line.match(/^(#{1,4})\s+(.+)$/);
    if (headerMatch) {
      if (inList) { output.push(listType === 'ul' ? '</ul>' : '</ol>'); inList = false; }
      const level = headerMatch[1].length;
      const sizes = { 1: '1.3em', 2: '1.15em', 3: '1em', 4: '0.9em' };
      output.push(`<div style="font-size:${sizes[level]};font-weight:600;margin:8px 0 4px;color:var(--text)">${applyInline(headerMatch[2])}</div>`);
      continue;
    }

    // Unordered list items
    const ulMatch = line.match(/^(\s*)[-*]\s+(.+)$/);
    if (ulMatch) {
      if (!inList || listType !== 'ul') {
        if (inList) output.push(listType === 'ul' ? '</ul>' : '</ol>');
        output.push('<ul style="margin:4px 0;padding-left:20px">');
        inList = true; listType = 'ul';
      }
      output.push(`<li style="margin:2px 0">${applyInline(ulMatch[2])}</li>`);
      continue;
    }

    // Ordered list items
    const olMatch = line.match(/^(\s*)\d+[.)]\s+(.+)$/);
    if (olMatch) {
      if (!inList || listType !== 'ol') {
        if (inList) output.push(listType === 'ul' ? '</ul>' : '</ol>');
        output.push('<ol style="margin:4px 0;padding-left:20px">');
        inList = true; listType = 'ol';
      }
      output.push(`<li style="margin:2px 0">${applyInline(olMatch[2])}</li>`);
      continue;
    }

    // Blockquotes
    const bqMatch = line.match(/^>\s?(.*)$/);
    if (bqMatch) {
      if (inList) { output.push(listType === 'ul' ? '</ul>' : '</ol>'); inList = false; }
      output.push(`<div style="border-left:3px solid var(--teal);padding-left:12px;margin:4px 0;color:var(--muted);font-style:italic">${applyInline(bqMatch[1])}</div>`);
      continue;
    }

    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      if (inList) { output.push(listType === 'ul' ? '</ul>' : '</ol>'); inList = false; }
      output.push('<hr style="border:none;border-top:1px solid var(--border);margin:8px 0">');
      continue;
    }

    // Close open list if we hit a non-list line
    if (inList) { output.push(listType === 'ul' ? '</ul>' : '</ol>'); inList = false; }

    // Empty line → spacing
    if (line.trim() === '') {
      output.push('<div style="height:4px"></div>');
      continue;
    }

    // Regular paragraph
    output.push(applyInline(line) + '<br>');
  }

  if (inList) output.push(listType === 'ul' ? '</ul>' : '</ol>');

  let result = output.join('\n');

  // Restore code blocks and inline code
  result = result.replace(/\x00CB(\d+)\x00/g, (_, idx) => codeBlocks[parseInt(idx)]);
  result = result.replace(/\x00IC(\d+)\x00/g, (_, idx) => inlineCode[parseInt(idx)]);

  return result;
}

function applyInline(text) {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/~~([^~]+)~~/g, '<del>$1</del>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" style="color:var(--teal)">$1</a>');
}

// ---------------------------------------------------------------------------
// Tool Step Component — clickable, expandable tool call display
// ---------------------------------------------------------------------------

function ToolStep({ toolName, toolInput, result, isError, status, isVisible }) {
  const [expanded, setExpanded] = useState(false);

  if (!isVisible) return null;

  const isRunning = status === 'running';

  // Parse input JSON for better display
  let parsedInput = null;
  try {
    if (toolInput) parsedInput = JSON.parse(toolInput);
  } catch { /* use raw */ }

  // Generate a smart summary line based on tool + params
  const getSummary = () => {
    if (!parsedInput) return toolInput ? (toolInput.length > 80 ? toolInput.substring(0, 80) + '…' : toolInput) : '';
    switch (toolName) {
      case 'exec':
        return parsedInput.command ? `$ ${parsedInput.command}` : '';
      case 'read':
        return parsedInput.path || parsedInput.file_path || '';
      case 'write':
        return parsedInput.path || parsedInput.file_path || '';
      case 'edit':
        return parsedInput.path || parsedInput.file_path || '';
      case 'web_search':
        return parsedInput.query ? `"${parsedInput.query}"` : '';
      case 'web_fetch':
        return parsedInput.url || '';
      case 'memory_search':
        return parsedInput.query ? `"${parsedInput.query}"` : '';
      case 'memory_read':
        return parsedInput.path || '';
      case 'memory_write':
        return parsedInput.content ? parsedInput.content.substring(0, 60) + (parsedInput.content.length > 60 ? '…' : '') : '';
      case 'spawn_agent':
        return parsedInput.agent_type ? `${parsedInput.agent_type}${parsedInput.task ? ': ' + parsedInput.task.substring(0, 50) + '…' : ''}` : '';
      case 'process':
        return parsedInput.action ? `${parsedInput.action}${parsedInput.command ? ': ' + parsedInput.command : ''}` : '';
      default: {
        const firstVal = Object.values(parsedInput).find(v => typeof v === 'string');
        return firstVal ? (firstVal.length > 80 ? firstVal.substring(0, 80) + '…' : firstVal) : '';
      }
    }
  };

  // Format parsed input as key-value pairs
  const renderInputParams = () => {
    if (!parsedInput || typeof parsedInput !== 'object') {
      return toolInput ? (
        <pre style={{
          margin: 0, fontFamily: 'var(--mono)', fontSize: '0.72rem',
          color: 'var(--muted)', whiteSpace: 'pre-wrap', wordBreak: 'break-all',
        }}>{toolInput}</pre>
      ) : null;
    }
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {Object.entries(parsedInput).map(([key, val]) => (
          <div key={key} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <span style={{
              fontFamily: 'var(--mono)', fontSize: '0.72rem', color: 'var(--teal)',
              opacity: 0.7, flexShrink: 0, minWidth: 60,
            }}>{key}:</span>
            <span style={{
              fontFamily: 'var(--mono)', fontSize: '0.72rem', color: 'var(--muted)',
              whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: 200, overflowY: 'auto',
            }}>{typeof val === 'string' ? val : JSON.stringify(val, null, 2)}</span>
          </div>
        ))}
      </div>
    );
  };

  const summary = getSummary();
  const resultPreview = result ? (result.length > 160 ? result.substring(0, 160) + '…' : result) : '';

  return (
    <div style={{ display: 'flex', justifyContent: 'flex-start', margin: '2px 0' }}>
      <div
        onClick={() => !isRunning && setExpanded(!expanded)}
        style={{
          maxWidth: '85%', minWidth: 200, padding: '8px 12px', borderRadius: 10,
          background: isError ? 'rgba(239,68,68,0.06)' : 'rgba(45,212,191,0.04)',
          border: `1px solid ${isError ? 'rgba(239,68,68,0.15)' : 'rgba(45,212,191,0.1)'}`,
          cursor: isRunning ? 'default' : 'pointer',
          transition: 'all 0.15s ease', fontSize: '0.8rem',
          color: 'var(--muted)', userSelect: 'none',
        }}
      >
        {/* Header row — always visible */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isRunning ? (
            <span style={{
              display: 'inline-block', width: 12, height: 12,
              border: '2px solid var(--teal)', borderTopColor: 'transparent',
              borderRadius: '50%', animation: 'spin 0.8s linear infinite', flexShrink: 0,
            }} />
          ) : (
            <span style={{
              fontSize: '0.72rem', flexShrink: 0,
              color: expanded ? 'var(--teal)' : 'var(--muted)',
              opacity: 0.6, width: 12, textAlign: 'center',
            }}>
              {expanded ? '▾' : '▸'}
            </span>
          )}
          <span style={{
            fontFamily: 'var(--mono)', fontSize: '0.78rem',
            color: isRunning ? 'var(--teal)' : (isError ? '#ef4444' : 'var(--foreground)'),
            fontWeight: 600, flexShrink: 0,
          }}>
            {toolName}
          </span>
          {summary && (
            <span style={{
              fontFamily: 'var(--mono)', fontSize: '0.72rem', color: 'var(--muted)',
              opacity: 0.7, overflow: 'hidden', textOverflow: 'ellipsis',
              whiteSpace: 'nowrap', flex: 1, minWidth: 0,
            }}>
              {summary}
            </span>
          )}
          {!isRunning && !expanded && isError && (
            <span style={{ fontSize: '0.72rem', flexShrink: 0 }}>❌</span>
          )}
        </div>

        {/* Expanded content — full input params + result */}
        {expanded && !isRunning && (
          <div style={{ marginTop: 8 }}>
            {toolInput && (
              <div style={{
                padding: '8px 10px', background: 'rgba(0,0,0,0.2)',
                borderRadius: 6, marginBottom: result ? 6 : 0,
              }}>
                <div style={{
                  fontSize: '0.65rem', color: 'var(--muted)', opacity: 0.5,
                  marginBottom: 4, fontFamily: 'var(--mono)',
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                }}>Input</div>
                {renderInputParams()}
              </div>
            )}
            {result && (
              <div style={{
                padding: '8px 10px',
                background: isError ? 'rgba(239,68,68,0.05)' : 'rgba(45,212,191,0.03)',
                borderRadius: 6,
              }}>
                <div style={{
                  fontSize: '0.65rem', color: isError ? '#ef4444' : 'var(--muted)',
                  opacity: 0.5, marginBottom: 4, fontFamily: 'var(--mono)',
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                }}>{isError ? 'Error' : 'Output'}</div>
                <pre style={{
                  margin: 0, fontFamily: 'var(--mono)', fontSize: '0.72rem',
                  color: isError ? '#ef4444' : 'var(--muted)',
                  maxHeight: 300, overflowY: 'auto',
                  whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                }}>{result}</pre>
              </div>
            )}
          </div>
        )}

        {/* Collapsed result preview for completed tool calls */}
        {!expanded && !isRunning && resultPreview && (
          <div style={{
            marginTop: 4, fontFamily: 'var(--mono)', fontSize: '0.68rem',
            color: isError ? 'rgba(239,68,68,0.6)' : 'var(--muted)',
            opacity: 0.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            → {resultPreview}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tool Config Panel — toggle individual tools on/off
// ---------------------------------------------------------------------------

function ToolConfigPanel({ sessionKey, isOpen, onClose }) {
  const [tools, setTools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen || !sessionKey) return;
    setLoading(true);
    fetch(`/api/chat/sessions/${sessionKey}/tools`)
      .then(r => r.json())
      .then(data => {
        setTools(data.tools || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [isOpen, sessionKey]);

  const toggleTool = async (toolName) => {
    const updated = tools.map(t =>
      t.name === toolName ? { ...t, enabled: !t.enabled } : t
    );
    setTools(updated);

    setSaving(true);
    const disabledTools = updated.filter(t => !t.enabled).map(t => t.name);
    try {
      await fetch(`/api/chat/sessions/${sessionKey}/tools`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ disabled_tools: disabledTools }),
      });
    } catch (err) {
      console.error('Failed to save tool config:', err);
    }
    setSaving(false);
  };

  if (!isOpen) return null;

  const enabledCount = tools.filter(t => t.enabled).length;

  return (
    <div className="chat-tool-config-panel" style={{
      position: 'absolute', top: 52, right: 16, width: 300,
      maxHeight: 'calc(100vh - 80px)', background: 'var(--card)',
      border: '1px solid var(--border)', borderRadius: 12,
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)', zIndex: 100,
      overflow: 'hidden', display: 'flex', flexDirection: 'column',
    }}>
      <div style={{
        padding: '12px 16px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--foreground)' }}>
          Tools {!loading && `(${enabledCount}/${tools.length})`}
        </span>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', color: 'var(--muted)',
          cursor: 'pointer', fontSize: '1rem', padding: '2px 6px',
        }}>×</button>
      </div>

      <div style={{ padding: '8px 0', overflowY: 'auto', flex: 1 }}>
        {loading ? (
          <div style={{ padding: 16, textAlign: 'center', color: 'var(--muted)', fontSize: '0.8rem' }}>
            Loading tools…
          </div>
        ) : tools.length === 0 ? (
          <div style={{ padding: 16, textAlign: 'center', color: 'var(--muted)', fontSize: '0.8rem' }}>
            No tools available
          </div>
        ) : (
          tools.map(tool => (
            <div
              key={tool.name}
              onClick={() => toggleTool(tool.name)}
              style={{
                padding: '8px 16px', display: 'flex', alignItems: 'center',
                gap: 10, cursor: 'pointer', transition: 'background 0.1s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{
                width: 36, height: 20, borderRadius: 10,
                background: tool.enabled ? 'var(--teal)' : 'rgba(255,255,255,0.1)',
                position: 'relative', transition: 'background 0.2s', flexShrink: 0,
              }}>
                <div style={{
                  width: 16, height: 16, borderRadius: '50%', background: 'white',
                  position: 'absolute', top: 2, left: tool.enabled ? 18 : 2,
                  transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontFamily: 'var(--mono)', fontSize: '0.78rem',
                  color: tool.enabled ? 'var(--foreground)' : 'var(--muted)', fontWeight: 500,
                }}>{tool.name}</div>
                <div style={{
                  fontSize: '0.68rem', color: 'var(--muted)', opacity: 0.6,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>{tool.description}</div>
              </div>
            </div>
          ))
        )}
      </div>

      {saving && (
        <div style={{
          padding: '8px 16px', borderTop: '1px solid var(--border)',
          fontSize: '0.7rem', color: 'var(--teal)', textAlign: 'center',
        }}>Saving…</div>
      )}
    </div>
  );
}

function ModelPickerPanel({ session, isOpen, onClose, onModelChanged }) {
  const [catalog, setCatalog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [customModel, setCustomModel] = useState('');

  useEffect(() => {
    if (!isOpen || !session?.key) return;
    setLoading(true);
    fetch(`/api/chat/sessions/${session.key}/model`)
      .then(r => r.json())
      .then(data => {
        setCatalog(data);
        setCustomModel(data.overrideModel || '');
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [isOpen, session?.key]);

  if (!isOpen) return null;

  const applyModel = async (model) => {
    if (!session?.key) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/chat/sessions/${session.key}/model`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model }),
      });
      const data = await res.json();
      setCatalog(prev => prev ? { ...prev, currentModel: data.currentModel, overrideModel: data.overrideModel } : prev);
      onModelChanged?.(data);
    } catch (err) {
      console.error('Failed to update model:', err);
    }
    setSaving(false);
  };

  return (
    <div style={{
      position: 'absolute', top: 52, right: 16, width: 360,
      maxHeight: 'calc(100vh - 80px)', background: 'var(--card)',
      border: '1px solid var(--border)', borderRadius: 12,
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)', zIndex: 100,
      overflow: 'hidden', display: 'flex', flexDirection: 'column',
    }}>
      <div style={{
        padding: '12px 16px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontWeight: 600, color: 'var(--text)' }}>Model</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: 2 }}>
            Current: {catalog?.currentModel || session?.currentModel || 'loading'}
          </div>
        </div>
        <button onClick={onClose} style={{ border: 'none', background: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '1rem' }}>×</button>
      </div>

      <div style={{ padding: 16, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {loading ? (
          <div style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Loading models…</div>
        ) : (
          <>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
              LM Studio: {catalog?.lmstudio?.reachable ? 'reachable' : 'unreachable'} {catalog?.lmstudio?.baseUrl || ''}
            </div>

            <button
              onClick={() => applyModel(null)}
              disabled={saving}
              style={{
                padding: '10px 12px', borderRadius: 8, textAlign: 'left',
                border: `1px solid ${!catalog?.overrideModel ? 'var(--teal)' : 'var(--border)'}`,
                background: !catalog?.overrideModel ? 'rgba(45,212,191,0.08)' : 'transparent',
                color: 'var(--text)', cursor: 'pointer',
              }}
            >
              <div>Use Default</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: 2 }}>{catalog?.defaultModel}</div>
            </button>

            {(catalog?.options || []).map(option => (
              <button
                key={option.id}
                onClick={() => applyModel(option.id)}
                disabled={saving}
                style={{
                  padding: '10px 12px', borderRadius: 8, textAlign: 'left',
                  border: `1px solid ${catalog?.currentModel === option.id ? 'var(--teal)' : 'var(--border)'}`,
                  background: catalog?.currentModel === option.id ? 'rgba(45,212,191,0.08)' : 'transparent',
                  color: 'var(--text)', cursor: 'pointer',
                }}
              >
                <div style={{ fontFamily: 'var(--mono)', fontSize: '0.75rem' }}>{option.id}</div>
                <div style={{ fontSize: '0.68rem', color: 'var(--muted)', marginTop: 2 }}>
                  {[option.tier, option.loaded ? 'loaded' : null, option.source].filter(Boolean).join(' · ')}
                </div>
              </button>
            ))}

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: 8 }}>Custom model string</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={customModel}
                  onChange={e => setCustomModel(e.target.value)}
                  placeholder="openai/gpt-4o or lmstudio/qwen3"
                  style={{
                    flex: 1, padding: '10px 12px', borderRadius: 8,
                    border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)',
                  }}
                />
                <button
                  onClick={() => applyModel(customModel.trim() || null)}
                  disabled={saving}
                  style={{
                    padding: '10px 12px', borderRadius: 8, border: '1px solid var(--teal)',
                    background: 'rgba(45,212,191,0.1)', color: 'var(--teal)', cursor: 'pointer',
                  }}
                >
                  Apply
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Thinking Indicator
// ---------------------------------------------------------------------------

function ThinkingIndicator({ isVisible }) {
  if (!isVisible) return null;
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-start', margin: '2px 0' }}>
      <div style={{
        padding: '8px 14px',
        borderRadius: 12,
        background: 'rgba(45,212,191,0.05)',
        border: '1px solid rgba(45,212,191,0.12)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        fontSize: '0.8rem',
        color: 'var(--muted)',
      }}>
        <div className="thinking-dots">
          <span style={{ animation: 'dotPulse 1.4s infinite', animationDelay: '0s' }}>●</span>
          <span style={{ animation: 'dotPulse 1.4s infinite', animationDelay: '0.2s' }}>●</span>
          <span style={{ animation: 'dotPulse 1.4s infinite', animationDelay: '0.4s' }}>●</span>
        </div>
        <span style={{ fontStyle: 'italic', fontSize: '0.78rem' }}>Thinking...</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Chat Sessions Sidebar
// ---------------------------------------------------------------------------

function SessionsSidebar({ sessions, currentSession, onSelectSession, onNewSession, onDeleteSession, processingSet, mobileOpen, onClose }) {
  return (
    <div
      className={`chat-sessions-sidebar${mobileOpen ? ' mobile-open' : ''}`}
      style={{
        width: 280,
        flexShrink: 0,
        background: 'var(--card)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--teal), var(--purple))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1rem', fontWeight: 700, color: 'white',
          }}>L</div>
          <div>
            <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: '0.95rem' }}>Lobs Chat</div>
          </div>
        </div>
        <button
          onClick={onNewSession}
          style={{
            width: 32, height: 32,
            background: 'var(--teal)',
            border: 'none',
            borderRadius: '50%',
            color: 'white',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.2rem',
          }}
          title="New chat"
        >+</button>
      </div>

      {/* Sessions list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
        {sessions.length === 0 ? (
          <div style={{ 
            padding: '40px 20px', 
            textAlign: 'center', 
            color: 'var(--muted)', 
            fontSize: '0.85rem' 
          }}>
            No chats yet
          </div>
        ) : (
          sessions.map(session => {
            const isProcessing = processingSet.has(session.key);
            return (
              <div
                key={session.id}
                onClick={() => onSelectSession(session)}
                style={{
                  padding: '12px 16px',
                  margin: '2px 0',
                  borderRadius: 8,
                  cursor: 'pointer',
                  background: session.id === currentSession?.id ? 'rgba(45, 212, 191, 0.1)' : 'transparent',
                  border: session.id === currentSession?.id ? '1px solid var(--teal)' : '1px solid transparent',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
                onMouseEnter={e => {
                  if (session.id !== currentSession?.id) {
                    e.currentTarget.style.background = 'rgba(45, 212, 191, 0.05)';
                  }
                }}
                onMouseLeave={e => {
                  if (session.id !== currentSession?.id) {
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    color: 'var(--text)',
                    fontSize: '0.9rem',
                    fontWeight: 500,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}>
                    <span style={{ 
                      overflow: 'hidden', 
                      textOverflow: 'ellipsis',
                      fontWeight: (session.unreadCount > 0 && session.id !== currentSession?.id) ? 600 : 500,
                      color: (session.unreadCount > 0 && session.id !== currentSession?.id) ? 'var(--text)' : undefined,
                    }}>
                      {session.title}
                    </span>
                    {isProcessing && (
                      <span style={{
                        width: 8, height: 8,
                        borderRadius: '50%',
                        background: 'var(--teal)',
                        display: 'inline-block',
                        animation: 'pulse 2s infinite',
                        flexShrink: 0,
                      }} />
                    )}
                    {session.unreadCount > 0 && session.id !== currentSession?.id && !isProcessing && (
                      <span style={{
                        width: 8, height: 8,
                        borderRadius: '50%',
                        background: '#3b82f6',
                        display: 'inline-block',
                        flexShrink: 0,
                      }} />
                    )}
                  </div>
                  <div style={{
                    color: 'var(--muted)',
                    fontSize: '0.75rem',
                    marginTop: 2,
                  }}>
                    {formatSessionTime(session.updatedAt || session.createdAt)}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteSession(session.id);
                  }}
                  style={{
                    width: 24, height: 24,
                    background: 'none',
                    border: 'none',
                    color: 'var(--muted)',
                    cursor: 'pointer',
                    borderRadius: 4,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: 0,
                    transition: 'opacity 0.2s',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.opacity = '1';
                    e.currentTarget.style.color = '#ef4444';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.opacity = '0';
                    e.currentTarget.style.color = 'var(--muted)';
                  }}
                  title="Delete chat"
                >×</button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function formatSessionTime(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays}d ago`;
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}

// ---------------------------------------------------------------------------
// Main Chat Interface — now with tool step streaming
// ---------------------------------------------------------------------------

function ChatInterface({ session, onSendMessage, processing, streamEvents, showTools, onToggleTools, toolConfigOpen, onToggleToolConfig, modelConfigOpen, onToggleModelConfig, onModelChanged, onOpenSessions }) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const autoScrollRef = useRef(true);

  // Track if user has scrolled up
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 50;
    autoScrollRef.current = isAtBottom;
  }, []);

  // Auto-scroll to bottom when new messages arrive (only if user is at bottom)
  useEffect(() => {
    if (autoScrollRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [session?.messages, streamEvents]);

  // Focus input when session changes
  useEffect(() => {
    inputRef.current?.focus();
  }, [session?.id]);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    
    setInput('');
    if (inputRef.current) inputRef.current.style.height = 'auto';
    onSendMessage(text);
  };

  const formatTime = (ts) => {
    if (!ts) return '';
    try {
      return new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    } catch { return ''; }
  };

  if (!session) {
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        background: 'var(--background)',
        position: 'relative',
      }}>
        {/* Mobile hamburger when no session selected */}
        <button
          className="chat-mobile-sessions-btn"
          onClick={onOpenSessions}
          style={{
            display: 'none',
            position: 'absolute', top: 16, left: 16,
            width: 36, height: 36,
            background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 8, color: 'var(--muted)', cursor: 'pointer',
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
        <div style={{ fontSize: '2rem', marginBottom: 16 }}>💬</div>
        <div style={{ fontWeight: 600, marginBottom: 8, color: 'var(--text)' }}>
          Select a chat to get started
        </div>
        <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
          Choose an existing conversation or create a new one
        </div>
      </div>
    );
  }

  // Build the interleaved message list (messages + tool steps + streaming events)
  const renderItems = [];
  
  // Track toolUseIds already persisted in the DB so we can dedup against stream events
  const persistedToolIds = new Set();
  
  // Add persisted messages (user, assistant, and tool)
  if (session.messages) {
    for (const msg of session.messages) {
      if (msg.role === 'tool') {
        // Tool step from DB
        let meta = {};
        try {
          meta = typeof msg.metadata === 'string' ? JSON.parse(msg.metadata) : (msg.metadata || {});
        } catch { /* ignore */ }
        if (meta.toolUseId) persistedToolIds.add(meta.toolUseId);
        renderItems.push({
          type: 'tool',
          toolName: meta.toolName || 'tool',
          toolInput: meta.toolInput || '',
          result: meta.result || '',
          isError: meta.isError || false,
          status: meta.status || 'complete',
          timestamp: msg.timestamp,
        });
      } else {
        renderItems.push({
          type: 'message',
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp,
        });
      }
    }
  }

  // Add active streaming events (tool steps not yet persisted — skip if already in DB)
  for (const evt of streamEvents) {
    // Dedup: skip tool events that are already persisted from reloadMessages
    if (evt.toolUseId && persistedToolIds.has(evt.toolUseId)) continue;
    if (evt.type === 'tool_start') {
      renderItems.push({
        type: 'tool',
        toolName: evt.toolName,
        toolInput: evt.toolInput || '',
        result: '',
        isError: false,
        status: 'running',
        timestamp: evt.timestamp,
        streamId: evt.toolUseId,
      });
    } else if (evt.type === 'tool_result_done') {
      // Completed tool — useChatState transforms tool_start → tool_result_done on completion
      renderItems.push({
        type: 'tool',
        toolName: evt.toolName,
        toolInput: evt.toolInput || '',
        result: evt.result || '',
        isError: evt.isError || false,
        status: 'complete',
        timestamp: evt.timestamp,
        streamId: evt.toolUseId,
      });
    } else if (evt.type === 'tool_result') {
      // Find and update the matching tool_start
      const existing = renderItems.find(
        item => item.type === 'tool' && item.streamId === evt.toolUseId
      );
      if (existing) {
        existing.result = evt.result || '';
        existing.isError = evt.isError || false;
        existing.status = 'complete';
      }
    } else if (evt.type === 'thinking') {
      // Show thinking indicator if it's the latest event
      renderItems.push({ type: 'thinking', timestamp: evt.timestamp });
    }
  }

  // Remove thinking indicators that are followed by tool steps
  // (we only want the last thinking to show if nothing else comes after)
  const filteredItems = [];
  for (let i = 0; i < renderItems.length; i++) {
    if (renderItems[i].type === 'thinking') {
      // Only show if it's the last item or next item is not a tool/message
      const isLast = i === renderItems.length - 1;
      if (isLast && processing) {
        filteredItems.push(renderItems[i]);
      }
    } else {
      filteredItems.push(renderItems[i]);
    }
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, minWidth: 0 }}>
      {/* Chat header */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--card)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          {/* Mobile hamburger to open sessions */}
          <button
            className="chat-mobile-sessions-btn"
            onClick={onOpenSessions}
            style={{
              display: 'none',
              width: 32, height: 32,
              background: 'none', border: '1px solid var(--border)',
              borderRadius: 6, color: 'var(--muted)', cursor: 'pointer',
              alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          <div style={{ minWidth: 0 }}>
            <div className="chat-header-title" style={{ fontWeight: 600, color: 'var(--text)' }}>{session.title}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 2 }}>
              {processing ? (
                <span style={{ color: 'var(--teal)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{
                    display: 'inline-block',
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: 'var(--teal)',
                    animation: 'pulse 2s infinite',
                  }} />
                  Working...
                </span>
              ) : '● Online'}
              <span style={{ marginLeft: 8, fontFamily: 'var(--mono)' }}>
                {session.currentModel || 'default'}
              </span>
            </div>
          </div>
        </div>

        {/* Tool controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, position: 'relative' }}>
          <button
            onClick={onToggleModelConfig}
            style={{
              padding: '6px 10px',
              borderRadius: 8,
              border: `1px solid ${modelConfigOpen ? 'var(--teal)' : 'var(--border)'}`,
              background: modelConfigOpen ? 'rgba(45,212,191,0.1)' : 'transparent',
              color: modelConfigOpen ? 'var(--teal)' : 'var(--muted)',
              cursor: 'pointer',
              fontSize: '0.78rem',
              fontFamily: 'var(--mono)',
            }}
            title="Choose model"
          >
            Model
          </button>

          {/* Show/hide tool calls toggle */}
          <button
            onClick={onToggleTools}
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              border: `1px solid ${showTools ? 'var(--teal)' : 'var(--border)'}`,
              background: showTools ? 'rgba(45,212,191,0.1)' : 'transparent',
              color: showTools ? 'var(--teal)' : 'var(--muted)',
              cursor: 'pointer',
              fontSize: '0.78rem',
              fontFamily: 'var(--mono)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 0.15s ease',
            }}
            title={showTools ? 'Hide tool calls' : 'Show tool calls'}
          >
            🔧 <span className="chat-tool-label">{showTools ? 'Visible' : 'Hidden'}</span>
          </button>

          {/* Tool config gear button */}
          <button
            onClick={onToggleToolConfig}
            style={{
              padding: '6px 8px',
              borderRadius: 8,
              border: `1px solid ${toolConfigOpen ? 'var(--teal)' : 'var(--border)'}`,
              background: toolConfigOpen ? 'rgba(45,212,191,0.1)' : 'transparent',
              color: toolConfigOpen ? 'var(--teal)' : 'var(--muted)',
              cursor: 'pointer',
              fontSize: '0.85rem',
              transition: 'all 0.15s ease',
              lineHeight: 1,
            }}
            title="Configure available tools"
          >
            ⚙️
          </button>

          {/* Tool config panel + backdrop */}
          {(toolConfigOpen || modelConfigOpen) && (
            <div
              onClick={() => {
                if (toolConfigOpen) onToggleToolConfig();
                if (modelConfigOpen) onToggleModelConfig();
              }}
              style={{
                position: 'fixed', inset: 0, zIndex: 99,
              }}
            />
          )}
          <ModelPickerPanel
            session={session}
            isOpen={modelConfigOpen}
            onClose={onToggleModelConfig}
            onModelChanged={onModelChanged}
          />
          <ToolConfigPanel
            sessionKey={session?.key}
            isOpen={toolConfigOpen}
            onClose={onToggleToolConfig}
          />
        </div>
      </div>

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="chat-messages-area"
        style={{
          flex: 1, 
          minHeight: 0,
          overflowY: 'auto', 
          padding: '16px 24px',
          background: 'var(--background)',
          display: 'flex', 
          flexDirection: 'column', 
          gap: 8,
        }}
      >
        {filteredItems.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '60px 0' }}>
            <div style={{ fontSize: '2rem', marginBottom: 12 }}>👋</div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Start a conversation</div>
            <div style={{ fontSize: '0.85rem' }}>
              Ask me anything — I'm here to help!
            </div>
          </div>
        )}

        {filteredItems.map((item, i) => {
          if (item.type === 'tool') {
            return (
              <ToolStep
                key={`tool-${item.streamId || i}`}
                toolName={item.toolName}
                toolInput={item.toolInput}
                result={item.result}
                isError={item.isError}
                status={item.status}
                isVisible={showTools}
              />
            );
          }

          if (item.type === 'thinking') {
            return <ThinkingIndicator key={`thinking-${i}`} isVisible={showTools} />;
          }

          // Regular message
          return (
            <div key={`msg-${i}`} style={{
              display: 'flex',
              justifyContent: item.role === 'user' ? 'flex-end' : 'flex-start',
            }}>
              <div style={{
                maxWidth: '75%',
                padding: '12px 16px',
                borderRadius: item.role === 'user' ? '18px 18px 6px 18px' : '18px 18px 18px 6px',
                background: item.role === 'user'
                  ? 'linear-gradient(135deg, var(--teal), rgba(45, 212, 191, 0.8))'
                  : 'var(--card)',
                color: item.role === 'user' ? 'white' : 'var(--text)',
                border: item.role === 'user' ? 'none' : '1px solid var(--border)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              }}>
                <div
                  style={{ 
                    fontSize: '0.9rem', 
                    lineHeight: 1.6, 
                    wordBreak: 'break-word',
                  }}
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(item.content) }}
                />
                <div style={{
                  fontSize: '0.7rem',
                  color: item.role === 'user' ? 'rgba(255,255,255,0.7)' : 'var(--muted)',
                  marginTop: 6, 
                  textAlign: 'right',
                }}>
                  {formatTime(item.timestamp)}
                </div>
              </div>
            </div>
          );
        })}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid var(--border)',
        background: 'var(--card)',
        flexShrink: 0,
      }}>
        <div style={{
          display: 'flex',
          gap: 8,
          maxWidth: 900,
          margin: '0 auto',
        }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => {
              setInput(e.target.value);
              const el = e.target;
              el.style.height = 'auto';
              el.style.height = Math.min(el.scrollHeight, 200) + 'px';
            }}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Message Lobs..."
            rows={1}
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: 12,
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              color: 'var(--text)',
              fontSize: '0.9rem',
              outline: 'none',
              fontFamily: 'inherit',
              minHeight: 44,
              maxHeight: 200,
              resize: 'none',
              overflow: 'auto',
              transition: 'border 0.2s',
              lineHeight: 1.4,
            }}
            onFocus={e => e.target.style.borderColor = 'var(--teal)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="chat-send-btn"
            style={{
              padding: '12px 20px',
              borderRadius: 12,
              border: 'none',
              background: input.trim()
                ? 'linear-gradient(135deg, var(--teal), var(--blue))'
                : 'var(--surface)',
              color: input.trim() ? 'white' : 'var(--muted)',
              fontWeight: 600,
              cursor: input.trim() ? 'pointer' : 'not-allowed',
              fontSize: '0.9rem',
              transition: 'all 0.2s',
            }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Chat Page
// ---------------------------------------------------------------------------


export default function ChatPage() {
  const {
    sessions,
    currentSession,
    processingKeys,
    error,
    showTools,
    toolConfigOpen,
    streamEvents,
    setError,
    setShowTools,
    setToolConfigOpen,
    selectSession,
    createSession,
    deleteSession,
    sendMessage,
    loadSessions,
  } = useChatState();
  const [mobileSessionsOpen, setMobileSessionsOpen] = useState(false);
  const [modelConfigOpen, setModelConfigOpen] = useState(false);

  if (error) {
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#ef4444',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: 16 }}>⚠️</div>
          <div>{error}</div>
          <button
            onClick={() => { setError(null); loadSessions(); }}
            style={{
              marginTop: 16,
              padding: '8px 16px',
              background: 'var(--teal)',
              border: 'none',
              borderRadius: 8,
              color: 'white',
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100%', minHeight: 0, overflow: 'hidden', position: 'relative' }}>
      {/* Mobile overlay backdrop */}
      {mobileSessionsOpen && (
        <div
          onClick={() => setMobileSessionsOpen(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            zIndex: 199, display: 'none',
          }}
          className="chat-mobile-backdrop"
        />
      )}
      <SessionsSidebar
        sessions={sessions}
        currentSession={currentSession}
        onSelectSession={(s) => { selectSession(s); setMobileSessionsOpen(false); }}
        onNewSession={createSession}
        onDeleteSession={deleteSession}
        processingSet={processingKeys}
        mobileOpen={mobileSessionsOpen}
        onClose={() => setMobileSessionsOpen(false)}
      />
      <ChatInterface
        session={currentSession}
        onSendMessage={sendMessage}
        processing={processingKeys.has(currentSession?.key)}
        streamEvents={streamEvents}
        showTools={showTools}
        onToggleTools={() => setShowTools(prev => !prev)}
        toolConfigOpen={toolConfigOpen}
        onToggleToolConfig={() => setToolConfigOpen(prev => !prev)}
        modelConfigOpen={modelConfigOpen}
        onToggleModelConfig={() => setModelConfigOpen(prev => !prev)}
        onModelChanged={(update) => {
          if (!currentSession?.key) return;
          selectSession({ ...currentSession, currentModel: update.currentModel, overrideModel: update.overrideModel });
          loadSessions();
        }}
        onOpenSessions={() => setMobileSessionsOpen(true)}
      />

      {/* CSS animations + responsive */}
      <style>{`
        @media (max-width: 768px) {
          .chat-sessions-sidebar {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            z-index: 200 !important;
            transform: translateX(-100%);
            transition: transform 0.25s ease;
            height: 100vh !important;
            width: 280px !important;
          }
          .chat-sessions-sidebar.mobile-open {
            transform: translateX(0);
          }
          .chat-mobile-backdrop {
            display: block !important;
          }
          .chat-header-title {
            max-width: 35vw;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          .chat-tool-label {
            display: none !important;
          }
          .chat-mobile-sessions-btn {
            display: flex !important;
          }
          .chat-tool-config-panel {
            position: fixed !important;
            right: 8px !important;
            left: 8px !important;
            top: 60px !important;
            width: auto !important;
            max-height: calc(100vh - 100px) !important;
          }
          .chat-send-btn {
            padding: 12px 14px !important;
            font-size: 0 !important;
          }
          .chat-send-btn::after {
            content: '↑';
            font-size: 1.1rem;
          }
          .chat-messages-area {
            padding: 12px 12px !important;
          }
        }
        @media (min-width: 769px) and (max-width: 1024px) {
          .chat-sessions-sidebar {
            width: 220px !important;
          }
        }
        @media (min-width: 769px) {
          .chat-sessions-sidebar {
            position: relative !important;
            transform: none !important;
          }
          .chat-mobile-backdrop {
            display: none !important;
          }
          .chat-mobile-sessions-btn {
            display: none !important;
          }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes dotPulse {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1.2); }
        }
        .thinking-dots {
          display: flex;
          gap: 3px;
          font-size: 0.6rem;
          color: var(--teal);
        }
        .chat-code {
          background: rgba(0,0,0,0.3);
          border-radius: 6px;
          padding: 8px 12px;
          font-family: var(--mono);
          font-size: 0.82rem;
          overflow-x: auto;
          margin: 4px 0;
          display: block;
          white-space: pre-wrap;
          word-break: break-all;
        }
      `}</style>
    </div>
  );
}
