import StatusCard from './StatusCard';
import TaskCard from './TaskCard';
import TaskList from './TaskList';
import Alert from './Alert';
import Collapsible from './Collapsible';
import Actions from './Actions';
import DataTable from './DataTable';
import Metric from './Metric';
import Progress from './Progress';

const componentMap = {
  'status': StatusCard,
  'task': TaskCard,
  'task-list': TaskList,
  'alert': Alert,
  'collapsible': Collapsible,
  'actions': Actions,
  'table': DataTable,
  'metric': Metric,
  'progress': Progress,
};

function renderTable(block) {
  const lines = block.trim().split('\n');
  // Need at least header + separator
  if (lines.length < 2) return block;
  const isSeparator = (line) => /^\|[\s\-:|]+\|$/.test(line.trim());
  const parseRow = (line) =>
    line.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());

  let headerLine = null;
  let bodyLines = [];
  let foundSep = false;

  for (let i = 0; i < lines.length; i++) {
    if (!foundSep && isSeparator(lines[i])) {
      headerLine = lines[i - 1] ?? null;
      foundSep = true;
    } else if (foundSep) {
      if (lines[i].trim().startsWith('|')) bodyLines.push(lines[i]);
    }
  }

  if (!headerLine || !foundSep) return block;

  const headers = parseRow(headerLine);
  const ths = headers.map((h) => `<th>${h}</th>`).join('');
  const rows = bodyLines
    .map((row) => {
      const cells = parseRow(row);
      const tds = cells.map((c) => `<td>${c}</td>`).join('');
      return `<tr>${tds}</tr>`;
    })
    .join('');

  return `<table class="chat-table"><thead><tr>${ths}</tr></thead><tbody>${rows}</tbody></table>`;
}

function renderMarkdown(text) {
  if (!text) return '';

  // Protect fenced code blocks first — replace with placeholders
  const codeBlocks = [];
  let s = text.replace(/```([\s\S]*?)```/g, (_, inner) => {
    const idx = codeBlocks.length;
    codeBlocks.push(`<pre class="chat-code">${inner}</pre>`);
    return `\x00CODE${idx}\x00`;
  });

  // Render markdown tables (lines that look like | ... | ... |)
  s = s.replace(/((?:[ \t]*\|[^\n]*\n){2,})/g, (match) => renderTable(match));

  // Inline formatting
  s = s
    .replace(/`([^`]+)`/g, '<code style="background:rgba(45,212,191,0.08);border-radius:4px;padding:1px 5px;font-family:var(--mono);font-size:0.85em;color:var(--teal)">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" style="color:var(--teal)">$1</a>')
    .replace(/\n/g, '<br>');

  // Restore code blocks
  s = s.replace(/\x00CODE(\d+)\x00/g, (_, idx) => codeBlocks[Number(idx)]);

  return s;
}

function parseRichBlocks(content) {
  if (!content) return [{ type: 'text', content: '' }];
  const parts = [];
  const regex = /```rich-ui\s*\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: content.slice(lastIndex, match.index) });
    }
    try {
      const parsed = JSON.parse(match[1].trim());
      parts.push({ type: 'rich', data: parsed });
    } catch {
      parts.push({ type: 'text', content: match[0] });
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < content.length) {
    parts.push({ type: 'text', content: content.slice(lastIndex) });
  }
  return parts;
}

export default function RichMessage({ content, onAction }) {
  const parts = parseRichBlocks(content);
  return (
    <div>
      {parts.map((part, i) => {
        if (part.type === 'text') {
          const trimmed = part.content.trim();
          if (!trimmed) return null;
          return <div key={i} dangerouslySetInnerHTML={{ __html: renderMarkdown(trimmed) }} style={{ color: 'var(--text)', fontSize: '0.88rem', lineHeight: 1.6 }} />;
        }
        const richData = part.data;
        const Component = componentMap[richData.type];
        if (!Component) {
          return <pre key={i} className="chat-code">{JSON.stringify(richData, null, 2)}</pre>;
        }
        // Spread all top-level props so each component gets what it needs
        const props = { ...richData, onAction };
        return <Component key={i} {...props} />;
      })}
    </div>
  );
}

export { parseRichBlocks, renderMarkdown };
