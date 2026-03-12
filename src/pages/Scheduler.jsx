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
      if (!response.ok) throw new Error("Scheduler API not available");
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
    const interval = setInterval(loadJobs, 30000);
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
    <div style={{ padding: '28px 28px 40px', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <svg width="22" height="22" fill="none" stroke="var(--teal)" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 6v6l4 2"/>
          </svg>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: 'var(--text)' }}>Scheduler</h1>
          {!loading && !error && (
            <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
              <Badge label={`${jobs.length} jobs`} color="var(--blue)" />
              <Badge label={`${jobs.filter(j => j.enabled).length} active`} color="var(--green)" />
            </div>
          )}
        </div>
        <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.875rem' }}>Manage scheduled background jobs</p>
      </div>

      {error && (
        <GlassCard style={{ marginBottom: 24, borderColor: 'rgba(239,68,68,0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <svg width="16" height="16" fill="none" stroke="#f87171" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span style={{ color: '#f87171', fontSize: '0.85rem' }}>{error}</span>
            <button
              onClick={loadJobs}
              style={{
                marginLeft: 'auto', padding: '4px 12px', borderRadius: 6,
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                color: '#f87171', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 600,
              }}
            >
              Retry
            </button>
          </div>
        </GlassCard>
      )}

      {loading ? (
        <GlassCard style={{ textAlign: 'center', padding: '48px 24px' }}>
          <svg width="24" height="24" fill="none" stroke="var(--muted)" strokeWidth="2" viewBox="0 0 24 24"
            style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px', display: 'block' }}>
            <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
          </svg>
          <div style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Loading jobs...</div>
        </GlassCard>
      ) : jobs.length === 0 && !error ? (
        <GlassCard style={{ textAlign: 'center', padding: '48px 24px' }}>
          <svg width="40" height="40" fill="none" stroke="var(--faint)" strokeWidth="1.5" viewBox="0 0 24 24"
            style={{ margin: '0 auto 16px', opacity: 0.5 }}>
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 6v6l4 2"/>
          </svg>
          <div style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>No scheduled jobs</div>
        </GlassCard>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {jobs.map((job) => (
            <GlassCard key={job.name}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <span style={{ color: 'var(--text)', fontWeight: 600, fontSize: '0.95rem' }}>{job.name}</span>
                    <Badge
                      label={job.enabled ? "Enabled" : "Disabled"}
                      color={job.enabled ? 'var(--green)' : 'var(--faint)'}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: '0.78rem', color: 'var(--muted)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M12 6v6l4 2"/>
                      </svg>
                      <span style={{ fontFamily: 'var(--mono)' }}>{job.cron}</span>
                    </span>
                    {job.last_run && <span>Last run: {formatLastRun(job.last_run)}</span>}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button
                    onClick={() => toggleJob(job.name)}
                    style={{
                      padding: '6px 14px', borderRadius: 6, fontSize: '0.78rem', fontWeight: 600,
                      cursor: 'pointer', border: '1px solid',
                      background: job.enabled ? 'rgba(239,68,68,0.08)' : 'rgba(45,212,191,0.08)',
                      borderColor: job.enabled ? 'rgba(239,68,68,0.2)' : 'rgba(45,212,191,0.2)',
                      color: job.enabled ? '#f87171' : 'var(--teal)',
                    }}
                  >
                    {job.enabled ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    onClick={() => runJobNow(job.name)}
                    style={{
                      padding: '6px 14px', borderRadius: 6, fontSize: '0.78rem', fontWeight: 600,
                      cursor: 'pointer', border: '1px solid rgba(96,165,250,0.2)',
                      background: 'rgba(96,165,250,0.08)', color: '#60a5fa',
                    }}
                  >
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
