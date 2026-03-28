import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import Tasks from './pages/Tasks';
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
// DailyBrief merged into Scheduler page
import MicroLearning from './pages/MicroLearning';
import GitHubFeed from './pages/GitHubFeed';
import Workers from './pages/Workers';
import Insights from './pages/Insights';
import Training from './pages/Training';
import MyTasks from './pages/MyTasks';
import IntelSweep from './pages/IntelSweep';
import ResearchRadar from './pages/ResearchRadar';
import Suggestions from './pages/Suggestions';
import StructuredMemory from './pages/StructuredMemory';
import { ChatProvider } from './hooks/useChatState';
import { api } from './lib/api';

export default function App() {
  const [systemStatus, setSystemStatus] = useState({ status: null, keys: null });

  useEffect(() => {
    const poll = async () => {
      try {
        const s = await api.status();
        const serverStatus = s?.server?.status || 'healthy';
        const keys = s?.keys?.providers || {};

        // Derive effective status from key health
        let effectiveStatus = serverStatus;
        const totalKeys = Object.values(keys).reduce((sum, p) => sum + (p.total || 0), 0);
        const healthyKeys = Object.values(keys).reduce((sum, p) => sum + (p.healthy || 0), 0);
        if (totalKeys > 0 && healthyKeys === 0) {
          effectiveStatus = 'error';
        } else if (totalKeys > 0 && healthyKeys < totalKeys) {
          effectiveStatus = 'degraded';
        }

        setSystemStatus({ status: effectiveStatus, keys });
      } catch {
        setSystemStatus({ status: 'error', keys: null });
      }
    };
    poll();
    const id = setInterval(poll, 15000);
    return () => clearInterval(id);
  }, []);

  return (
    <BrowserRouter>
      <ChatProvider>
        <Routes>
          <Route element={<Layout systemStatus={systemStatus} />}>
            <Route path="/" element={<Dashboard />} />
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

            <Route path="/micro-learning" element={<MicroLearning />} />
            <Route path="/github" element={<GitHubFeed />} />
            <Route path="/workers" element={<Workers />} />
            <Route path="/insights" element={<Insights />} />
            <Route path="/training" element={<Training />} />
            <Route path="/my-tasks" element={<MyTasks />} />
            <Route path="/intel" element={<IntelSweep />} />
            <Route path="/research-radar" element={<ResearchRadar />} />
            <Route path="/suggestions" element={<Suggestions />} />
            <Route path="/structured-memory" element={<StructuredMemory />} />
          </Route>
        </Routes>
      </ChatProvider>
    </BrowserRouter>
  );
}
