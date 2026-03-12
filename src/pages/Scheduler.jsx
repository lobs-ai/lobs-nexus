/**
 * Scheduler page — shows scheduled jobs with controls
 */

import { useState, useEffect } from "react";
import GlassCard from "../components/GlassCard";
import Badge from "../components/Badge";

export default function Scheduler() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadJobs = async () => {
    try {
      setLoading(true);
      const response = await fetch("/paw/api/scheduler");
      if (!response.ok) throw new Error("Failed to fetch jobs");
      const data = await response.json();
      setJobs(data.jobs || []);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
    const interval = setInterval(loadJobs, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const toggleJob = async (jobName) => {
    try {
      await fetch(`/paw/api/scheduler/${jobName}/toggle`, { method: "POST" });
      loadJobs();
    } catch (err) {
      console.error("Failed to toggle job:", err);
    }
  };

  const runJobNow = async (jobName) => {
    try {
      await fetch(`/paw/api/scheduler/${jobName}/run`, { method: "POST" });
      loadJobs();
    } catch (err) {
      console.error("Failed to run job:", err);
    }
  };

  const formatLastRun = (timestamp) => {
    if (!timestamp) return "Never";
    const date = new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Scheduler</h1>
          <p className="text-gray-400">Manage scheduled background jobs</p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="info">{jobs.length} jobs</Badge>
          <Badge variant="success">{jobs.filter(j => j.enabled).length} active</Badge>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading jobs...</div>
      ) : (
        <div className="grid gap-4">
          {jobs.map((job) => (
            <GlassCard key={job.name} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-white">
                      {job.name}
                    </h3>
                    <Badge variant={job.enabled ? "success" : "secondary"}>
                      {job.enabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <span className="flex items-center gap-1.5">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                      {job.cron}
                    </span>
                    {job.last_run && (
                      <span>
                        Last run: {formatLastRun(job.last_run)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleJob(job.name)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      job.enabled
                        ? "bg-red-500/10 hover:bg-red-500/20 text-red-400"
                        : "bg-green-500/10 hover:bg-green-500/20 text-green-400"
                    }`}
                  >
                    {job.enabled ? (
                      <>
                        <svg className="w-4 h-4 inline mr-1.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                        Disable
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 inline mr-1.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                        Enable
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={() => runJobNow(job.name)}
                    className="px-4 py-2 rounded-lg font-medium bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 transition-colors"
                  >
                    <svg className="w-4 h-4 inline mr-1.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                    Run Now
                  </button>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}
