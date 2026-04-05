import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useChatState } from '../hooks/useChatState';
import SubagentPanel from '../components/SubagentPanel';

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
  const rawLines = processed.split('\n');

  // Pre-pass: collapse consecutive pipe-lines into table tokens
  const lines = [];
  for (let i = 0; i < rawLines.length; i++) {
    if (rawLines[i].trim().startsWith('|')) {
      const tableLines = [];
      while (i < rawLines.length && rawLines[i].trim().startsWith('|')) {
        tableLines.push(rawLines[i]);
        i++;
      }
      i--; // will be incremented by the for loop
      lines.push({ type: 'table', lines: tableLines });
    } else {
      lines.push({ type: 'text', value: rawLines[i] });
    }
  }

  const output = [];
  let inList = false;
  let listType = null;

  for (let i = 0; i < lines.length; i++) {
    // Handle pre-grouped table blocks
    if (lines[i].type === 'table') {
      if (inList) { output.push(listType === 'ul' ? '</ul>' : '</ol>'); inList = false; }
      const tLines = lines[i].lines;
      const isSep = (l) => /^\|[\s\-:|]+\|$/.test(l.trim());
      const parseRow = (l) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
      const sepIdx = tLines.findIndex(isSep);
      if (sepIdx > 0) {
        const headerCells = parseRow(tLines[sepIdx - 1]);
        const bodyRows = tLines.slice(sepIdx + 1).filter((l) => l.trim().startsWith('|'));
        const ths = headerCells.map((h) => `<th style="padding:4px 10px;border:1px solid rgba(45,212,191,0.2);background:rgba(45,212,191,0.08);color:var(--teal);font-weight:600;text-align:left">${applyInline(h)}</th>`).join('');
        const trs = bodyRows.map((row, ri) => {
          const tds = parseRow(row).map((c) => `<td style="padding:4px 10px;border:1px solid rgba(45,212,191,0.2)">${applyInline(c)}</td>`).join('');
          const bg = ri % 2 === 1 ? 'background:rgba(255,255,255,0.02);' : '';
          return `<tr style="${bg}">${tds}</tr>`;
        }).join('');
        output.push(`<table style="border-collapse:collapse;margin:8px 0;font-size:0.82rem"><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>`);
      } else {
        // No separator found — render as plain lines
        tLines.forEach((l) => output.push(applyInline(l) + '<br>'));
      }
      continue;
    }

    let line = lines[i].value;

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

    // Image-only line (no trailing <br>)
    if (/^!\[[^\]]*\]\([^)]+\)$/.test(line.trim())) {
      output.push(applyInline(line));
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

// File extensions that should render as download cards instead of inline
const DOWNLOAD_EXTENSIONS = /\.(pdf|zip|csv|json|html?|md|txt|docx?|xlsx?|pptx?|tar|gz|mp3|mp4|webm)$/i;

function renderFileCard(filename, url) {
  const ext = filename.match(/\.(\w+)$/)?.[1]?.toUpperCase() || 'FILE';
  const icons = {
    PDF: '📄', ZIP: '📦', CSV: '📊', JSON: '{ }', HTML: '🌐', HTM: '🌐',
    MD: '📝', TXT: '📝', MP3: '🎵', MP4: '🎬', WEBM: '🎬',
  };
  const icon = icons[ext] || '📎';
  const downloadUrl = url.includes('?') ? `${url}&download=${encodeURIComponent(filename)}` : `${url}?download=${encodeURIComponent(filename)}`;
  return `<a href="${downloadUrl}" download="${filename}" class="file-download-card" style="display:inline-flex;align-items:center;gap:10px;padding:10px 14px;margin:4px 0;border-radius:10px;background:rgba(45,212,191,0.06);border:1px solid rgba(45,212,191,0.15);text-decoration:none;color:var(--text);max-width:100%;transition:all 0.15s ease;cursor:pointer" onmouseover="this.style.background='rgba(45,212,191,0.12)';this.style.borderColor='var(--teal)'" onmouseout="this.style.background='rgba(45,212,191,0.06)';this.style.borderColor='rgba(45,212,191,0.15)'"><span style="font-size:1.4rem;flex-shrink:0">${icon}</span><span style="flex:1;min-width:0;overflow:hidden"><span style="display:block;font-weight:600;font-size:0.85rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${filename}</span><span style="display:block;font-size:0.7rem;color:var(--muted)">${ext} file · Click to download</span></span><span style="font-size:1.1rem;color:var(--teal);flex-shrink:0">⬇</span></a>`;
}

function applyInline(text) {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/~~([^~]+)~~/g, '<del>$1</del>')
    // Images: ![alt](url) — must come before link replacement
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" data-lightbox="true" style="max-width:100%;border-radius:8px;margin:8px 0;cursor:zoom-in" />')
    // File download links: [filename](url) where filename has a downloadable extension
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, label, url) => {
      if (DOWNLOAD_EXTENSIONS.test(label) || DOWNLOAD_EXTENSIONS.test(url)) {
        return renderFileCard(label, url);
      }
      return `<a href="${url}" target="_blank" style="color:var(--teal)">${label}</a>`;
    });
}

// ---------------------------------------------------------------------------
// Tool Step Component — clickable, expandable tool call display
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Lightbox Component — fullscreen image viewer
// ---------------------------------------------------------------------------

function Lightbox({ src, alt, onClose }) {
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        background: 'rgba(0,0,0,0.85)', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        cursor: 'zoom-out', backdropFilter: 'blur(8px)',
      }}
    >
      <img
        src={src} alt={alt || 'Image'}
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '90vw', maxHeight: '90vh', borderRadius: 12,
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)', cursor: 'default',
        }}
      />
      <button
        onClick={onClose}
        style={{
          position: 'absolute', top: 20, right: 20,
          background: 'rgba(255,255,255,0.15)', border: 'none',
          color: 'white', fontSize: 24, width: 40, height: 40,
          borderRadius: '50%', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >×</button>
      <a
        href={src} download target="_blank" rel="noopener"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'absolute', bottom: 20, right: 20,
          background: 'rgba(255,255,255,0.15)', border: 'none',
          color: 'white', fontSize: '0.8rem', padding: '8px 16px',
          borderRadius: 8, cursor: 'pointer', textDecoration: 'none',
        }}
      >⬇ Download</a>
    </div>
  );
}

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
      case 'imagine':
        return parsedInput.prompt ? `"${parsedInput.prompt.substring(0, 60)}${parsedInput.prompt.length > 60 ? '…' : ''}"` : '';
      case 'humanize':
        return parsedInput.path || (parsedInput.text ? parsedInput.text.substring(0, 50) + '…' : '');
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
            {toolName === 'Task' && (
              <SubagentPanel compact={true} />
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

function SessionsSidebar({ sessions, archivedSessions, showArchived, currentSession, onSelectSession, onNewSession, onArchiveSession, onUnarchiveSession, onPermanentDeleteSession, onToggleArchived, processingSet, mobileOpen, onClose }) {
  const [searchQuery, setSearchQuery] = useState('');
  const allSessions = showArchived ? archivedSessions : sessions;
  const displaySessions = searchQuery.trim()
    ? allSessions.filter(s => {
        const q = searchQuery.toLowerCase();
        return (s.title?.toLowerCase().includes(q)) || (s.summary?.toLowerCase().includes(q));
      })
    : allSessions;

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
            background: showArchived
              ? 'linear-gradient(135deg, #6b7280, #9ca3af)'
              : 'linear-gradient(135deg, var(--teal), var(--purple))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1rem', fontWeight: 700, color: 'white',
          }}>{showArchived ? '📦' : 'L'}</div>
          <div>
            <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: '0.95rem' }}>
              {showArchived ? 'Archived' : 'Lobs Chat'}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={onToggleArchived}
            style={{
              width: 32, height: 32,
              background: showArchived ? 'rgba(45,212,191,0.15)' : 'transparent',
              border: `1px solid ${showArchived ? 'var(--teal)' : 'var(--border)'}`,
              borderRadius: '50%',
              color: showArchived ? 'var(--teal)' : 'var(--muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.85rem',
              transition: 'all 0.15s ease',
            }}
            title={showArchived ? 'Show active chats' : 'Show archived chats'}
          >📦</button>
          {!showArchived && (
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
          )}
        </div>
      </div>

      {/* Search */}
      <div style={{ padding: '8px 12px 0' }}>
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            placeholder="Search chats…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 32px 8px 12px',
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              color: 'var(--text)',
              fontSize: '0.85rem',
              outline: 'none',
              boxSizing: 'border-box',
              transition: 'border-color 0.15s ease',
            }}
            onFocus={e => e.target.style.borderColor = 'var(--teal)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
          {searchQuery ? (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: 6,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: 'var(--muted)',
                cursor: 'pointer',
                fontSize: '0.85rem',
                padding: '2px 4px',
                lineHeight: 1,
              }}
              title="Clear search"
            >×</button>
          ) : (
            <span style={{
              position: 'absolute',
              right: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--muted)',
              fontSize: '0.75rem',
              pointerEvents: 'none',
            }}>🔍</span>
          )}
        </div>
      </div>

      {/* Sessions list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
        {displaySessions.length === 0 ? (
          <div style={{ 
            padding: '40px 20px', 
            textAlign: 'center', 
            color: 'var(--muted)', 
            fontSize: '0.85rem' 
          }}>
            {showArchived ? 'No archived chats' : 'No chats yet'}
          </div>
        ) : (
          displaySessions.map(session => {
            const isProcessing = processingSet.has(session.key);
            return (
              <div
                key={session.id}
                onClick={() => !showArchived && onSelectSession(session)}
                style={{
                  padding: '12px 16px',
                  margin: '2px 0',
                  borderRadius: 8,
                  cursor: showArchived ? 'default' : 'pointer',
                  background: session.id === currentSession?.id ? 'rgba(45, 212, 191, 0.1)' : 'transparent',
                  border: session.id === currentSession?.id ? '1px solid var(--teal)' : '1px solid transparent',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  opacity: showArchived ? 0.7 : 1,
                }}
                onMouseEnter={e => {
                  if (!showArchived && session.id !== currentSession?.id) {
                    e.currentTarget.style.background = 'rgba(45, 212, 191, 0.05)';
                  }
                }}
                onMouseLeave={e => {
                  if (!showArchived && session.id !== currentSession?.id) {
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
                      fontWeight: (!showArchived && session.unreadCount > 0 && session.id !== currentSession?.id) ? 600 : 500,
                      color: (!showArchived && session.unreadCount > 0 && session.id !== currentSession?.id) ? 'var(--text)' : undefined,
                    }}>
                      {session.title}
                    </span>
                    {!showArchived && isProcessing && (
                      <span style={{
                        width: 8, height: 8,
                        borderRadius: '50%',
                        background: 'var(--teal)',
                        display: 'inline-block',
                        animation: 'pulse 2s infinite',
                        flexShrink: 0,
                      }} />
                    )}
                    {!showArchived && session.unreadCount > 0 && session.id !== currentSession?.id && !isProcessing && (
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
                    {showArchived
                      ? `Archived ${formatSessionTime(session.archivedAt || session.updatedAt)}`
                      : formatSessionTime(session.updatedAt || session.createdAt)}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  {showArchived ? (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onUnarchiveSession(session.id);
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
                          fontSize: '0.8rem',
                          opacity: 0.6,
                          transition: 'opacity 0.2s',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.opacity = '1';
                          e.currentTarget.style.color = 'var(--teal)';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.opacity = '0.6';
                          e.currentTarget.style.color = 'var(--muted)';
                        }}
                        title="Restore chat"
                      >↩</button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('Permanently delete this chat? This cannot be undone.')) {
                            onPermanentDeleteSession(session.id);
                          }
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
                        title="Permanently delete"
                      >🗑</button>
                    </>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onArchiveSession(session.id);
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
                      title="Archive chat"
                    >×</button>
                  )}
                </div>
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
  const [pendingImages, setPendingImages] = useState([]);
  const [showJumpToBottom, setShowJumpToBottom] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const autoScrollRef = useRef(true);
  const scrollPositionsRef = useRef({});
  const prevSessionKeyRef = useRef(null);
  const isRestoringScrollRef = useRef(false);

  // Threshold for "far from bottom" — show jump button
  const JUMP_THRESHOLD = 300;

  // Track if user has scrolled up + show/hide jump button
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const distFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    const isAtBottom = distFromBottom < 50;
    autoScrollRef.current = isAtBottom;
    setShowJumpToBottom(distFromBottom > JUMP_THRESHOLD);
    
    // Cache scroll position for current session (debounced via animation frame)
    if (!isRestoringScrollRef.current && session?.key) {
      scrollPositionsRef.current[session.key] = container.scrollTop;
    }
  }, [session?.key]);

  // Jump to bottom handler
  const scrollToBottom = useCallback((smooth = true) => {
    const container = messagesContainerRef.current;
    if (!container) return;
    container.scrollTo({
      top: container.scrollHeight,
      behavior: smooth ? 'smooth' : 'instant',
    });
    autoScrollRef.current = true;
    setShowJumpToBottom(false);
  }, []);

  // Suppress smooth auto-scroll right after a session swap so new-message
  // loading doesn't trigger a jarring animated scroll from top → bottom.
  const suppressSmoothRef = useRef(false);

  // On session swap: save old scroll pos, then snap to bottom (or restore cached pos)
  useEffect(() => {
    const prevKey = prevSessionKeyRef.current;
    const newKey = session?.key;

    // Save scroll position for the session we're leaving
    if (prevKey && messagesContainerRef.current && prevKey !== newKey) {
      scrollPositionsRef.current[prevKey] = messagesContainerRef.current.scrollTop;
    }

    prevSessionKeyRef.current = newKey;

    if (!newKey) return;

    // Suppress smooth scrolling until the session's messages have rendered
    suppressSmoothRef.current = true;

    // Use requestAnimationFrame to wait for the DOM to render the new messages
    requestAnimationFrame(() => {
      const container = messagesContainerRef.current;
      if (!container) return;

      isRestoringScrollRef.current = true;

      // Always snap to bottom instantly on session switch — no animation
      container.scrollTo({ top: container.scrollHeight, behavior: 'instant' });
      autoScrollRef.current = true;
      setShowJumpToBottom(false);

      // Allow scroll handler to cache positions again after restore
      requestAnimationFrame(() => {
        isRestoringScrollRef.current = false;
        suppressSmoothRef.current = false;
      });
    });
  }, [session?.key]);

  // Auto-scroll to bottom when new messages arrive (only if user is at bottom)
  useEffect(() => {
    if (!autoScrollRef.current) return;

    if (suppressSmoothRef.current) {
      // Session just switched — messages are loading for the first time.
      // Snap instantly instead of smooth-scrolling from the top.
      const container = messagesContainerRef.current;
      if (container) {
        container.scrollTo({ top: container.scrollHeight, behavior: 'instant' });
      }
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [session?.messages, streamEvents]);

  // Focus input when session changes
  useEffect(() => {
    inputRef.current?.focus();
  }, [session?.id]);

  // Process files into base64 image objects
  const processFiles = useCallback((files) => {
    const validTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
    const imageFiles = Array.from(files).filter(f => validTypes.includes(f.type));
    if (!imageFiles.length) return;

    imageFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target.result;
        const base64 = dataUrl.split(',')[1];
        const mediaType = file.type;
        setPendingImages(prev => [...prev, { base64, mediaType, preview: dataUrl }]);
      };
      reader.readAsDataURL(file);
    });
  }, []);

  // Paste handler for images
  useEffect(() => {
    const handlePaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const imageItems = Array.from(items).filter(item => item.type.startsWith('image/'));
      if (imageItems.length) {
        e.preventDefault();
        const files = imageItems.map(item => item.getAsFile()).filter(Boolean);
        processFiles(files);
      }
    };
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [processFiles]);

  const removePendingImage = (index) => {
    setPendingImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSend = () => {
    const text = input.trim();
    if (!text && !pendingImages.length) return;

    const images = pendingImages.length
      ? pendingImages.map(({ base64, mediaType }) => ({ base64, mediaType }))
      : undefined;

    setInput('');
    setPendingImages([]);
    if (inputRef.current) inputRef.current.style.height = 'auto';
    onSendMessage(text || '', images);
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
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, minWidth: 0, position: 'relative' }}>
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
            // For imagine tool with completed image, render image prominently in chat flow
            const isImagineWithImage = item.toolName === 'imagine' && item.status !== 'running' && 
              item.result && /!\[[^\]]*\]\(\/api\/media\//.test(item.result);
            const imageSrc = isImagineWithImage 
              ? item.result.match(/!\[[^\]]*\]\((\/api\/media\/[^\)]+)\)/)?.[1] 
              : null;
            const timeMatch = isImagineWithImage ? item.result.match(/Time:\s*([\d.]+)s/) : null;
            const sizeMatch = isImagineWithImage ? item.result.match(/Size:\s*(\d+x\d+)/) : null;
            const seedMatch = isImagineWithImage ? item.result.match(/Seed:\s*(\d+)/) : null;

            return (
              <React.Fragment key={`tool-${item.streamId || i}`}>
                <ToolStep
                  toolName={item.toolName}
                  toolInput={item.toolInput}
                  result={item.result}
                  isError={item.isError}
                  status={item.status}
                  isVisible={showTools}
                />
                {imageSrc && (
                  <div style={{ display: 'flex', justifyContent: 'flex-start', margin: '4px 0' }}>
                    <div style={{
                      maxWidth: '75%',
                      padding: 8,
                      borderRadius: 12,
                      background: 'var(--card)',
                      border: '1px solid var(--border)',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    }}>
                      <img
                        src={imageSrc}
                        alt="Generated image"
                        data-lightbox="true"
                        style={{
                          maxWidth: '100%',
                          maxHeight: 480,
                          borderRadius: 8,
                          display: 'block',
                          cursor: 'zoom-in',
                        }}
                      />
                      {(timeMatch || sizeMatch || seedMatch) && (
                        <div style={{
                          marginTop: 6, fontFamily: 'var(--mono)', fontSize: '0.65rem',
                          color: 'var(--muted)', opacity: 0.5,
                          display: 'flex', gap: 8,
                        }}>
                          {sizeMatch && <span>{sizeMatch[1]}</span>}
                          {timeMatch && <span>{timeMatch[1]}s</span>}
                          {seedMatch && <span>seed {seedMatch[1]}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </React.Fragment>
            );
          }

          if (item.type === 'thinking') {
            return <ThinkingIndicator key={`thinking-${i}`} isVisible={showTools} />;
          }

          // Regular message
          // Check for images (optimistic local msgs have .images with preview/base64, DB msgs have metadata)
          const msgImages = item.images || (() => {
            try {
              const raw = item.messageMetadata || item.metadata;
              if (!raw) return null;
              const meta = typeof raw === 'string' ? JSON.parse(raw) : raw;
              return meta?.images;
            } catch { return null; }
          })();
          const hasImages = msgImages?.length > 0;
          const isImageOnly = hasImages && (!item.content || item.content === '(image)');

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
                {/* Attached images */}
                {hasImages && (
                  <div style={{
                    display: 'flex',
                    gap: 6,
                    flexWrap: 'wrap',
                    marginBottom: isImageOnly ? 0 : 8,
                  }}>
                    {msgImages.map((img, j) => {
                      const src = img.preview || (img.base64 ? `data:${img.mediaType};base64,${img.base64}` : null);
                      return src ? (
                        <img
                          key={j}
                          src={src}
                          alt=""
                          data-lightbox="true"
                          style={{
                            maxWidth: 280,
                            maxHeight: 200,
                            borderRadius: 8,
                            objectFit: 'contain',
                            cursor: 'zoom-in',
                          }}
                        />
                      ) : (
                        <div key={j} style={{
                          width: 80, height: 60,
                          borderRadius: 8,
                          background: 'rgba(255,255,255,0.15)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.2rem',
                        }}>🖼️</div>
                      );
                    })}
                  </div>
                )}
                {/* Text content */}
                {!isImageOnly && (
                  <div
                    style={{ 
                      fontSize: '0.9rem', 
                      lineHeight: 1.6, 
                      wordBreak: 'break-word',
                    }}
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(item.content) }}
                  />
                )}
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

      {/* Jump to bottom button */}
      {showJumpToBottom && (
        <div style={{
          position: 'absolute',
          bottom: 90,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 50,
        }}>
          <button
            onClick={() => scrollToBottom(true)}
            style={{
              padding: '8px 16px',
              borderRadius: 20,
              border: '1px solid var(--border)',
              background: 'var(--card)',
              color: 'var(--muted)',
              cursor: 'pointer',
              fontSize: '0.78rem',
              fontWeight: 500,
              boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 0.15s ease',
              backdropFilter: 'blur(8px)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'var(--teal)';
              e.currentTarget.style.color = 'var(--teal)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.color = 'var(--muted)';
            }}
          >
            ↓ Jump to bottom
          </button>
        </div>
      )}

      {/* Input */}
      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid var(--border)',
        background: 'var(--card)',
        flexShrink: 0,
      }}
        onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
        onDrop={e => {
          e.preventDefault();
          e.stopPropagation();
          if (e.dataTransfer?.files?.length) processFiles(e.dataTransfer.files);
        }}
      >
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          {/* Pending image previews */}
          {pendingImages.length > 0 && (
            <div style={{
              display: 'flex',
              gap: 8,
              marginBottom: 8,
              flexWrap: 'wrap',
            }}>
              {pendingImages.map((img, i) => (
                <div key={i} style={{
                  position: 'relative',
                  width: 64, height: 64,
                  borderRadius: 8,
                  overflow: 'hidden',
                  border: '1px solid var(--border)',
                  flexShrink: 0,
                }}>
                  <img src={img.preview} alt="" style={{
                    width: '100%', height: '100%',
                    objectFit: 'cover',
                  }} />
                  <button onClick={() => removePendingImage(i)} style={{
                    position: 'absolute', top: 2, right: 2,
                    width: 18, height: 18,
                    borderRadius: '50%',
                    border: 'none',
                    background: 'rgba(0,0,0,0.6)',
                    color: 'white',
                    fontSize: '0.65rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    lineHeight: 1,
                  }}>✕</button>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/gif,image/webp"
              multiple
              style={{ display: 'none' }}
              onChange={e => {
                if (e.target.files?.length) processFiles(e.target.files);
                e.target.value = '';
              }}
            />
            {/* Attach button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              title="Attach image"
              style={{
                padding: '0 12px',
                borderRadius: 12,
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--muted)',
                fontSize: '1.1rem',
                cursor: 'pointer',
                minHeight: 44,
                display: 'flex',
                alignItems: 'center',
                transition: 'all 0.2s',
              }}
            >📎</button>
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
              placeholder={pendingImages.length ? "Add a message or just send..." : "Message Lobs..."}
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
              disabled={!input.trim() && !pendingImages.length}
              className="chat-send-btn"
              style={{
                padding: '12px 20px',
                borderRadius: 12,
                border: 'none',
                background: (input.trim() || pendingImages.length)
                  ? 'linear-gradient(135deg, var(--teal), var(--blue))'
                  : 'var(--surface)',
                color: (input.trim() || pendingImages.length) ? 'white' : 'var(--muted)',
                fontWeight: 600,
                cursor: (input.trim() || pendingImages.length) ? 'pointer' : 'not-allowed',
                fontSize: '0.9rem',
                transition: 'all 0.2s',
              }}
            >
              Send
            </button>
          </div>
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
    archivedSessions,
    showArchived,
    setShowArchived,
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
    archiveSession,
    unarchiveSession,
    permanentDeleteSession,
    loadArchivedSessions,
    sendMessage,
    loadSessions,
  } = useChatState();
  const [mobileSessionsOpen, setMobileSessionsOpen] = useState(false);
  const [modelConfigOpen, setModelConfigOpen] = useState(false);
  const [pageLightbox, setPageLightbox] = useState(null);

  // Global click handler for markdown-rendered images (from dangerouslySetInnerHTML)
  useEffect(() => {
    const handleClick = (e) => {
      const img = e.target.closest('img[data-lightbox]');
      if (img) {
        e.preventDefault();
        e.stopPropagation();
        setPageLightbox(img.src);
      }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

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
        archivedSessions={archivedSessions}
        showArchived={showArchived}
        currentSession={currentSession}
        onSelectSession={(s) => { selectSession(s); setMobileSessionsOpen(false); }}
        onNewSession={createSession}
        onArchiveSession={archiveSession}
        onUnarchiveSession={unarchiveSession}
        onPermanentDeleteSession={permanentDeleteSession}
        onToggleArchived={() => {
          const next = !showArchived;
          setShowArchived(next);
          if (next) loadArchivedSessions();
        }}
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

      {/* Page-level lightbox for markdown images */}
      {pageLightbox && <Lightbox src={pageLightbox} onClose={() => setPageLightbox(null)} />}

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
        .chat-table {
          border-collapse: collapse;
          margin: 8px 0;
          font-size: 0.82rem;
          width: auto;
        }
        .chat-table th, .chat-table td {
          border: 1px solid rgba(45,212,191,0.2);
          padding: 4px 10px;
          text-align: left;
        }
        .chat-table thead tr {
          background: rgba(45,212,191,0.08);
          color: var(--teal);
          font-weight: 600;
        }
        .chat-table tbody tr:nth-child(even) {
          background: rgba(255,255,255,0.02);
        }
      `}</style>
    </div>
  );
}
