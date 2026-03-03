import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import Tasks from './pages/Tasks';
import Team from './pages/Team';
import Workflows from './pages/Workflows';
import Inbox from './pages/Inbox';
import Chat from './pages/Chat';
import Knowledge from './pages/Knowledge';
import Memory from './pages/Memory';
import Usage from './pages/Usage';
import Settings from './pages/Settings';
import { api } from './lib/api';

export default function App() {
  const [systemStatus, setSystemStatus] = useState(null);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    const poll = async () => {
      try {
        const s = await api.status();
        setSystemStatus(s?.server?.status || 'healthy');
      } catch {
        setSystemStatus('error');
      }
    };
    poll();
    const id = setInterval(poll, 15000);
    return () => clearInterval(id);
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('theme', next);
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout systemStatus={systemStatus} theme={theme} onThemeToggle={toggleTheme} />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/team" element={<Team />} />
          <Route path="/workflows" element={<Workflows />} />
          <Route path="/inbox" element={<Inbox />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/knowledge" element={<Knowledge />} />
          <Route path="/memory" element={<Memory />} />
          <Route path="/usage" element={<Usage />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
