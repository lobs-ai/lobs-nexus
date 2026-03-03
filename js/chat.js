/* ============================================================
   chat.js — Chat page
   ============================================================ */

let activeChatSession = null;

async function renderChat(container) {
  container.innerHTML = `
    <div class="page-header">
      <div class="section-label">Knowledge</div>
      <h1 class="page-title gradient-text">Chat</h1>
    </div>
    <div class="chat-layout">
      <div class="chat-sidebar">
        <div style="font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--faint);margin-bottom:10px;padding:0 4px">Sessions</div>
        <div id="chatSessionList"><div class="loading-screen" style="height:80px"><div class="spinner"></div></div></div>
      </div>
      <div class="chat-main">
        <div class="chat-messages" id="chatMessages">
          <div id="chatPlaceholder">${emptyState('💬', 'Select a session', 'Pick a chat session from the left')}</div>
        </div>
        <div class="chat-input-bar" id="chatInputBar" style="display:none">
          <textarea class="chat-input" id="chatInput" rows="1" placeholder="Type a message…"></textarea>
          <button class="btn btn-primary" id="chatSend">Send</button>
        </div>
      </div>
    </div>`;

  await loadChatSessions();

  document.getElementById('chatSend')?.addEventListener('click', sendChatMessage);
  document.getElementById('chatInput')?.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage(); }
  });
}

async function loadChatSessions() {
  try {
    const sessions = await API.chatSessions();
    const list = document.getElementById('chatSessionList');
    if (!list) return;
    if (!Array.isArray(sessions) || !sessions.length) {
      list.innerHTML = emptyState('💬', 'No sessions', 'No chat history yet');
      return;
    }
    list.innerHTML = sessions.map(s => `
      <div class="chat-session-item ${activeChatSession?.sessionKey === s.sessionKey ? 'active' : ''}"
           onclick="selectChatSession(${JSON.stringify(JSON.stringify(s))})">
        <div class="chat-session-name">${s.title || s.sessionKey || 'Untitled'}</div>
        <div class="chat-session-preview">${s.messageCount ? s.messageCount + ' messages' : ''} ${timeAgo(s.lastMessageAt || s.createdAt)}</div>
      </div>`).join('');
  } catch(e) { console.error('Chat sessions error:', e); }
}

async function selectChatSession(jsonStr) {
  const session = JSON.parse(jsonStr);
  activeChatSession = session;
  document.querySelectorAll('.chat-session-item').forEach(el =>
    el.classList.toggle('active', el.querySelector('.chat-session-name')?.textContent === (session.title || session.sessionKey)));

  const messagesEl = document.getElementById('chatMessages');
  const inputBar = document.getElementById('chatInputBar');
  if (messagesEl) messagesEl.innerHTML = '<div class="loading-screen" style="height:120px"><div class="spinner"></div></div>';
  if (inputBar) inputBar.style.display = '';

  try {
    const msgs = await API.chatMessages(session.sessionKey);
    renderChatMessages(Array.isArray(msgs) ? msgs : []);
  } catch(e) { toast(e.message, 'error'); }
}
window.selectChatSession = selectChatSession;

function renderChatMessages(msgs) {
  const el = document.getElementById('chatMessages');
  if (!el) return;
  if (!msgs.length) { el.innerHTML = emptyState('💭', 'No messages', 'This session is empty'); return; }
  el.innerHTML = msgs.map(m => {
    const role = m.role || 'agent';
    const isUser = role === 'user' || role === 'human';
    return `
      <div class="message ${isUser ? 'user' : 'agent'}">
        <div class="msg-avatar ${isUser ? 'user' : 'agent'}">${isUser ? 'R' : 'AI'}</div>
        <div>
          <div class="msg-bubble">${renderMarkdown(m.content || m.text || '')}</div>
          <div class="msg-time">${formatDate(m.createdAt)}</div>
        </div>
      </div>`;
  }).join('');
  el.scrollTop = el.scrollHeight;
}

function renderMarkdown(text) {
  // Basic markdown rendering
  return String(text)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/```([\s\S]*?)```/g, '<pre style="background:var(--surface2);padding:8px;border-radius:6px;font-family:var(--mono);font-size:0.8rem;overflow-x:auto">$1</pre>')
    .replace(/`([^`]+)`/g, '<code style="background:var(--surface2);padding:1px 4px;border-radius:3px;font-family:var(--mono)">$1</code>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>');
}

async function sendChatMessage() {
  const input = document.getElementById('chatInput');
  if (!input || !activeChatSession) return;
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  toast('Message sending not yet supported via this interface', 'info');
}

function cleanupChat() { activeChatSession = null; }
