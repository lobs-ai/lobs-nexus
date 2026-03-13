import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import Tasks from './pages/Tasks';
import MyTasks from './pages/MyTasks';
import Team from './pages/Team';
import Scheduler from './pages/Scheduler';
import Explore from './pages/Explore';
import Inbox from './pages/Inbox';
import Reflections from './pages/Reflections';
import Chat from './pages/Chat';
import Knowledge from './pages/Knowledge';
import Memory from './pages/Memory';
import Usage from './pages/Usage';
import Settings from './pages/Settings';
import Meetings from './pages/Meetings';
import YouTube from './pages/YouTube';
import LearningInsights from './pages/LearningInsights';
import DailyBrief from './pages/DailyBrief';
import MicroLearning from './pages/MicroLearning';
import GitHubFeed from './pages/GitHubFeed';
import FocusTimer from './pages/FocusTimer';
import Workers from './pages/Workers';
import Insights from './pages/Insights';
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
          <Route path="/my-tasks" element={<MyTasks />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/team" element={<Team />} />
          <Route path="/scheduler" element={<Scheduler />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/inbox" element={<Inbox />} />
          <Route path="/reflections" element={<Reflections />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/knowledge" element={<Knowledge />} />
          <Route path="/memory" element={<Memory />} />
          <Route path="/usage" element={<Usage />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/meetings" element={<Meetings />} />
          <Route path="/youtube" element={<YouTube />} />
          <Route path="/learning" element={<LearningInsights />} />
          <Route path="/daily-brief" element={<DailyBrief />} />
          <Route path="/micro-learning" element={<MicroLearning />} />
          <Route path="/github" element={<GitHubFeed />} />
          <Route path="/focus" element={<FocusTimer />} />
          <Route path="/workers" element={<Workers />} />
          <Route path="/insights" element={<Insights />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
