import { useState, useEffect, useRef, useCallback } from 'react';

// ---------------------------------------------------------------------------
// Markdown renderer (simple)
// ---------------------------------------------------------------------------

function renderMarkdown(text) {
  if (!text) return '';
  return text
    .replace(/```([\s\S]*?)```/g, '<pre class="chat-code">$1</pre>')
    .replace(/`([^`]+)`/g, '<code style="background:rgba(45,212,191,0.08);border-radius:4px;padding:1px 5px;font-family:var(--mono);font-size:0.85em;color:var(--teal)">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" style="color:var(--teal)">$1</a>')
    .replace(/\n/g, '<br>');
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
  const resultPreview = result ? (result.length > 120 ? result.substring(0, 120) + '…' : result) : '';

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
    <div style={{
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

function SessionsSidebar({ sessions, currentSession, onSelectSession, onNewSession, onDeleteSession, processingSet }) {
  return (
    <div style={{
      width: 280,
      background: 'var(--card)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
    }}>
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
                    {session.title}
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

function ChatInterface({ session, onSendMessage, processing, streamEvents, showTools, onToggleTools, toolConfigOpen, onToggleToolConfig }) {
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
    if (!text || processing) return;
    
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
      }}>
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
  
  // Add persisted messages (user, assistant, and tool)
  if (session.messages) {
    for (const msg of session.messages) {
      if (msg.role === 'tool') {
        // Tool step from DB
        let meta = {};
        try {
          meta = typeof msg.metadata === 'string' ? JSON.parse(msg.metadata) : (msg.metadata || {});
        } catch { /* ignore */ }
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

  // Add active streaming events (tool steps not yet persisted)
  for (const evt of streamEvents) {
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
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Chat header */}
      <div style={{
        padding: '12px 24px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--card)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontWeight: 600, color: 'var(--text)' }}>{session.title}</div>
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
          </div>
        </div>

        {/* Tool controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, position: 'relative' }}>
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
            🔧 {showTools ? 'Visible' : 'Hidden'}
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

          {/* Tool config panel */}
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
        style={{
          flex: 1, 
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
        padding: '16px 24px',
        borderTop: '1px solid var(--border)',
        background: 'var(--card)',
      }}>
        <div style={{
          display: 'flex',
          gap: 12,
          maxWidth: 900,
          margin: '0 auto',
        }}>
          <input
            ref={inputRef}
            type="text"
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
              if (e.key === 'Tab' && e.shiftKey) {
                e.preventDefault();
                const start = e.target.selectionStart;
                const end = e.target.selectionEnd;
                const val = input.slice(0, start) + '\n' + input.slice(end);
                setInput(val);
                requestAnimationFrame(() => {
                  e.target.selectionStart = e.target.selectionEnd = start + 1;
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
                });
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
              overflow: 'auto',
              transition: 'border 0.2s',
            }}
            onFocus={e => e.target.style.borderColor = 'var(--teal)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || processing}
            style={{
              padding: '12px 24px',
              borderRadius: 12,
              border: 'none',
              background: input.trim() && !processing
                ? 'linear-gradient(135deg, var(--teal), var(--blue))'
                : 'var(--surface)',
              color: input.trim() && !processing ? 'white' : 'var(--muted)',
              fontWeight: 600,
              cursor: input.trim() && !processing ? 'pointer' : 'not-allowed',
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
  const [sessions, setSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [processingKeys, setProcessingKeys] = useState(new Set());
  const [error, setError] = useState(null);
  const [showTools, setShowTools] = useState(true);
  const [toolConfigOpen, setToolConfigOpen] = useState(false);
  
  // Stream events — live tool calls from SSE
  const [streamEvents, setStreamEvents] = useState([]);
  
  // Track active EventSource connections per session
  const eventSourceRef = useRef(null);
  
  // Track active pollers for fallback
  const pollersRef = useRef(new Map());

  // Load sessions on mount
  useEffect(() => {
    loadSessions();
    return () => {
      // Cleanup
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      for (const controller of pollersRef.current.values()) {
        controller.abort();
      }
    };
  }, []);

  const loadSessions = async () => {
    try {
      const res = await fetch('/api/chat/sessions');
      const data = await res.json();
      setSessions(data.sessions || []);
      
      // Auto-select first session if none selected
      if (!currentSession && data.sessions?.length > 0) {
        selectSession(data.sessions[0]);
      }
    } catch (err) {
      console.error('Failed to load sessions:', err);
      setError('Failed to load chat sessions');
    }
  };

  // Connect SSE stream for a session
  const connectStream = useCallback((sessionKey) => {
    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    const es = new EventSource(`/api/chat/sessions/${sessionKey}/stream`);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'connected') {
          // Stream connected
          return;
        }

        if (data.type === 'thinking') {
          setProcessingKeys(prev => {
            const next = new Set(prev);
            next.add(sessionKey);
            return next;
          });
          setStreamEvents(prev => {
            // Replace any existing thinking events with the new one
            const filtered = prev.filter(e => e.type !== 'thinking');
            return [...filtered, data];
          });
          return;
        }

        if (data.type === 'tool_start') {
          setProcessingKeys(prev => {
            const next = new Set(prev);
            next.add(sessionKey);
            return next;
          });
          // Remove any thinking indicator and add tool_start
          setStreamEvents(prev => {
            const filtered = prev.filter(e => e.type !== 'thinking');
            return [...filtered, data];
          });
          return;
        }

        if (data.type === 'tool_result') {
          // Update the matching tool_start event
          setStreamEvents(prev => {
            return prev.map(e => {
              if (e.type === 'tool_start' && e.toolUseId === data.toolUseId) {
                return { ...e, type: 'tool_result_done', result: data.result, isError: data.isError };
              }
              return e;
            });
          });
          return;
        }

        if (data.type === 'assistant_reply') {
          // Agent finished — reload messages to get the persisted version
          setStreamEvents([]);
          setProcessingKeys(prev => {
            const next = new Set(prev);
            next.delete(sessionKey);
            return next;
          });
          // Reload messages from DB
          reloadMessages(sessionKey);
          return;
        }

        if (data.type === 'done') {
          setStreamEvents([]);
          setProcessingKeys(prev => {
            const next = new Set(prev);
            next.delete(sessionKey);
            return next;
          });
          reloadMessages(sessionKey);
          return;
        }

        if (data.type === 'error') {
          setStreamEvents([]);
          setProcessingKeys(prev => {
            const next = new Set(prev);
            next.delete(sessionKey);
            return next;
          });
          reloadMessages(sessionKey);
          return;
        }
      } catch (err) {
        console.error('SSE parse error:', err);
      }
    };

    es.onerror = () => {
      console.warn('SSE connection error, will auto-reconnect');
      // EventSource auto-reconnects
    };

    return es;
  }, []);

  // Reload messages from DB (after processing completes)
  const reloadMessages = async (sessionKey) => {
    try {
      const res = await fetch(`/api/chat/sessions/${sessionKey}/messages`);
      const data = await res.json();
      
      setCurrentSession(prev => {
        if (!prev || prev.key !== sessionKey) return prev;
        return {
          ...prev,
          messages: (data.messages || []).map(m => ({
            role: m.role,
            content: m.content,
            timestamp: m.timestamp,
            metadata: m.metadata,
          })),
        };
      });
    } catch (err) {
      console.error('Failed to reload messages:', err);
    }
  };

  const selectSession = async (session) => {
    setCurrentSession(session);
    setStreamEvents([]);

    // Load messages
    try {
      const res = await fetch(`/api/chat/sessions/${session.key}/messages`);
      const data = await res.json();
      
      setCurrentSession(prev => ({
        ...prev,
        messages: (data.messages || []).map(m => ({
          role: m.role,
          content: m.content,
          timestamp: m.timestamp,
          metadata: m.metadata,
        })),
      }));
    } catch (err) {
      console.error('Failed to load messages:', err);
    }

    // Connect SSE stream
    connectStream(session.key);
  };

  const createSession = async () => {
    try {
      const res = await fetch('/api/chat/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: `Chat ${sessions.length + 1}` }),
      });
      const data = await res.json();
      
      const newSession = {
        id: data.id,
        key: data.key,
        title: data.title || `Chat ${sessions.length + 1}`,
        createdAt: data.createdAt,
        messages: [],
      };
      
      setSessions(prev => [newSession, ...prev]);
      selectSession(newSession);
    } catch (err) {
      console.error('Failed to create session:', err);
      setError('Failed to create new chat');
    }
  };

  const deleteSession = async (sessionId) => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;
    
    // Close SSE if this is the current session
    if (currentSession?.id === sessionId && eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    
    try {
      await fetch(`/api/chat/sessions/${session.key}`, { method: 'DELETE' });
      
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      setProcessingKeys(prev => {
        const next = new Set(prev);
        next.delete(session.key);
        return next;
      });
      
      if (currentSession?.id === sessionId) {
        setCurrentSession(null);
        setStreamEvents([]);
      }
    } catch (err) {
      console.error('Failed to delete session:', err);
    }
  };

  const sendMessage = async (content) => {
    if (!currentSession) return;
    
    // Optimistically add user message
    const userMsg = {
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    };
    
    setCurrentSession(prev => ({
      ...prev,
      messages: [...(prev.messages || []), userMsg],
    }));
    
    setProcessingKeys(prev => {
      const next = new Set(prev);
      next.add(currentSession.key);
      return next;
    });

    // Clear any leftover stream events
    setStreamEvents([]);

    try {
      const res = await fetch(`/api/chat/sessions/${currentSession.key}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      
      if (!res.ok) {
        throw new Error(`Send failed: ${res.status}`);
      }

      // SSE stream will handle the rest — tool events and final reply
      // But also start a fallback poller in case SSE misses the done event
      startFallbackPoller(currentSession.key);
    } catch (err) {
      console.error('Failed to send message:', err);
      setProcessingKeys(prev => {
        const next = new Set(prev);
        next.delete(currentSession.key);
        return next;
      });
    }
  };

  // Fallback poller — checks if processing finished in case SSE misses it
  const startFallbackPoller = (sessionKey) => {
    // Cancel any existing poller
    const existing = pollersRef.current.get(sessionKey);
    if (existing) existing.abort();

    const controller = new AbortController();
    pollersRef.current.set(sessionKey, controller);

    const poll = async () => {
      let attempts = 0;
      const maxAttempts = 1800; // 1 hour at 2s intervals — agent work can take a long time
      
      while (!controller.signal.aborted && attempts < maxAttempts) {
        attempts++;
        await new Promise(r => setTimeout(r, 2000));
        
        try {
          const res = await fetch(`/api/chat/sessions/${sessionKey}/status`, {
            signal: controller.signal,
          });
          const data = await res.json();
          
          if (!data.processing) {
            // Processing finished — reload if SSE didn't already handle it
            setProcessingKeys(prev => {
              if (!prev.has(sessionKey)) return prev;
              const next = new Set(prev);
              next.delete(sessionKey);
              return next;
            });
            reloadMessages(sessionKey);
            setStreamEvents([]);
            break;
          }
        } catch (err) {
          if (controller.signal.aborted) break;
          console.warn('Fallback poll error:', err);
        }
      }
      
      pollersRef.current.delete(sessionKey);
    };

    poll();
  };

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
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <SessionsSidebar
        sessions={sessions}
        currentSession={currentSession}
        onSelectSession={selectSession}
        onNewSession={createSession}
        onDeleteSession={deleteSession}
        processingSet={processingKeys}
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
      />

      {/* CSS animations */}
      <style>{`
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
