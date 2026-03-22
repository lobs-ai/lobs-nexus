import { useEffect, useState, useCallback, useRef } from "react";
import GlassCard from "../components/GlassCard";
import Badge from "../components/Badge";
import { api } from "../lib/api";

const tierOptions = ["micro", "small", "medium", "standard", "strong"];

// ─── Helpers ─────────────────────────────────────────────────────────

function formatTimeAgo(timestamp) {
  if (!timestamp) return "Never";
  const date = new Date(timestamp);
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return date.toLocaleDateString();
}

function formatTimeUntil(timestamp) {
  if (!timestamp) return null;
  const date = new Date(timestamp);
  const now = new Date();
  const diff = Math.floor((date - now) / 1000);
  if (diff < 0) return "overdue";
  if (diff < 60) return `in ${diff}s`;
  if (diff < 3600) return `in ${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `in ${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}m`;
  return `in ${Math.floor(diff / 86400)}d`;
}

function formatClock(timestamp) {
  if (!timestamp) return "TBD";
  return new Date(timestamp).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "Working late";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function fmtDate(d) {
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

function fmtRelative(isoString) {
  if (!isoString) return null;
  const d = new Date(isoString);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return fmtDate(d);
}

function fmtEventTime(isoString) {
  if (!isoString) return "";
  return new Date(isoString).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

function eventUrgencyColor(startIso) {
  if (!startIso) return "var(--muted)";
  const minsUntil = (new Date(startIso).getTime() - Date.now()) / 60000;
  if (minsUntil < 0) return "var(--faint)";
  if (minsUntil < 15) return "var(--red, #f87171)";
  if (minsUntil < 60) return "var(--amber)";
  return "var(--teal)";
}

// ─── Tab Button Component ─────────────────────────────────────────────

function TabButton({ active, onClick, children, badge }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "8px 16px",
        borderRadius: 8,
        border: active ? "1px solid var(--teal)" : "1px solid var(--border)",
        background: active ? "rgba(45,212,191,0.1)" : "transparent",
        color: active ? "var(--teal)" : "var(--muted)",
        cursor: "pointer",
        fontSize: "0.84rem",
        fontWeight: 600,
        display: "flex",
        alignItems: "center",
        gap: 8,
        transition: "all 0.2s",
      }}
    >
      {children}
      {badge != null && <Badge label={String(badge)} color={active ? "var(--teal)" : "var(--faint)"} />}
    </button>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────

export default function Scheduler() {
  const [tab, setTab] = useState("overview");
  const [jobs, setJobs] = useState([]);
  const [intelligence, setIntelligence] = useState(null);
  const [schedulerConfig, setSchedulerConfig] = useState(null);
  const [brief, setBrief] = useState(null);
  const [loading, setLoading] = useState(true);
  const [intelligenceLoading, setIntelligenceLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [lastFetched, setLastFetched] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const timerRef = useRef(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const [jobsData, modelsData, briefData] = await Promise.all([
        api.scheduler(),
        api.models(),
        api.dailyBrief(),
      ]);
      setJobs(jobsData?.jobs || []);
      setSchedulerConfig(modelsData?.scheduler || null);
      setBrief(briefData);
      setLoading(false);
      setError(null);
      setLastFetched(new Date().toISOString());

      // Load intelligence in background (can take 10-20s on first call)
      setIntelligenceLoading(true);
      const intelligenceData = await api.schedulerIntelligence();
      setIntelligence(intelligenceData || null);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    } finally {
      setIntelligenceLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    timerRef.current = setInterval(() => load(true), 60000);
    return () => clearInterval(timerRef.current);
  }, [load]);

  const toggleJob = async (jobId) => {
    await fetch(`/api/scheduler/${jobId}/toggle`, { method: "POST" });
    load();
  };

  const runJobNow = async (jobId) => {
    await fetch(`/api/scheduler/${jobId}/run`, { method: "POST" });
    load();
  };

  const saveConfig = async (updates) => {
    const next = { ...schedulerConfig, ...updates };
    setSchedulerConfig(next);
    setSaving(true);
    try {
      const result = await api.updateSchedulerModels(next);
      setSchedulerConfig(result.scheduler);
      const snapshot = await api.schedulerIntelligence();
      setIntelligence(snapshot);
    } catch (err) {
      setError(err.message);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const systemJobs = jobs.filter((j) => j.kind === "system");
  const agentJobs = jobs.filter((j) => j.kind === "agent");

  // Brief stats
  const stats = brief?.stats || {
    completedToday: brief?.tasks?.completed_today ?? 0,
    activeWorkers: brief?.tasks?.active ?? 0,
    inboxPending: brief?.tasks?.blocked ?? 0,
  };

  const alertCount = brief?.sentinel?.alerts?.length || 0;

  return (
    <div style={{ padding: "28px 28px 40px", maxWidth: 1240, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 20, flexWrap: "wrap", marginBottom: 20 }}>
        <div style={{ flex: "1 1 520px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
            <svg width="22" height="22" fill="none" stroke="var(--teal)" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
            <h1 style={{ margin: 0, fontSize: "1.55rem", color: "var(--text)" }}>
              {greeting()}, Rafe
            </h1>
          </div>
          <p style={{ margin: 0, color: "var(--muted)" }}>
            {fmtDate(new Date())} · Scheduler Intelligence
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {lastFetched && (
            <span style={{ fontSize: "0.72rem", color: "var(--faint)", fontFamily: "var(--mono)" }}>
              {fmtRelative(lastFetched)}
            </span>
          )}
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            style={{
              background: "none",
              border: "1px solid var(--border)",
              borderRadius: 6,
              color: refreshing ? "var(--faint)" : "var(--muted)",
              cursor: refreshing ? "default" : "pointer",
              padding: "4px 10px",
              fontSize: "0.75rem",
              display: "flex",
              alignItems: "center",
              gap: 5,
              transition: "all 0.2s",
            }}
          >
            <svg
              width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"
              style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }}
            >
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        <TabButton active={tab === "overview"} onClick={() => setTab("overview")}>
          Overview
        </TabButton>
        <TabButton active={tab === "planner"} onClick={() => setTab("planner")} badge={intelligence?.conflicts?.length || null}>
          AI Planner
        </TabButton>
        <TabButton active={tab === "jobs"} onClick={() => setTab("jobs")} badge={jobs.filter(j => j.enabled).length}>
          Cron Jobs
        </TabButton>
        <TabButton active={tab === "health"} onClick={() => setTab("health")} badge={alertCount || null}>
          Health
        </TabButton>
      </div>

      {error && (
        <GlassCard style={{ marginBottom: 18, borderColor: "rgba(248,113,113,0.35)" }}>
          <div style={{ color: "#fca5a5", fontSize: "0.88rem" }}>{error}</div>
        </GlassCard>
      )}

      {loading ? (
        <GlassCard style={{ padding: 32, color: "var(--muted)" }}>Loading scheduler state...</GlassCard>
      ) : (
        <>
          {tab === "overview" && (
            <OverviewTab
              brief={brief}
              stats={stats}
              intelligence={intelligence}
              intelligenceLoading={intelligenceLoading}
            />
          )}
          {tab === "planner" && (
            <PlannerTab
              intelligence={intelligence}
              intelligenceLoading={intelligenceLoading}
              schedulerConfig={schedulerConfig}
              saving={saving}
              onSaveConfig={saveConfig}
            />
          )}
          {tab === "jobs" && (
            <JobsTab
              systemJobs={systemJobs}
              agentJobs={agentJobs}
              onToggle={toggleJob}
              onRun={runJobNow}
            />
          )}
          {tab === "health" && (
            <HealthTab brief={brief} intelligence={intelligence} />
          )}
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// TAB: Overview — merged daily brief + intelligence summary
// ═══════════════════════════════════════════════════════════════════════

function OverviewTab({ brief, stats, intelligence, intelligenceLoading }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.3fr 0.95fr", gap: 18, alignItems: "start" }}>
      <div style={{ display: "grid", gap: 18 }}>
        {/* Quick stats row */}
        <GlassCard>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, textAlign: "center" }}>
            <StatCell value={stats.completedToday ?? 0} label="Completed" color="var(--green)" />
            <StatCell value={stats.activeWorkers ?? 0} label="Active" color="var(--blue)" />
            <StatCell value={stats.inboxPending ?? 0} label="Blocked" color="var(--amber)" />
            <StatCell
              value={intelligence?.calendar?.freeSlots?.length ?? "–"}
              label="Free Slots"
              color="var(--teal)"
            />
          </div>
        </GlassCard>

        {/* AI Intelligence Briefing */}
        {intelligenceLoading && !intelligence ? (
          <GlassCard glow style={{ padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, color: "var(--muted)", fontSize: "0.9rem" }}>
              <Spinner /> Loading intelligence briefing...
            </div>
          </GlassCard>
        ) : intelligence ? (
          <BriefingCard intelligence={intelligence} />
        ) : null}

        {/* AI Summary from sentinel */}
        {brief?.aiSummary && <AISummaryCard aiSummary={brief.aiSummary} />}

        {/* Schedule changes */}
        {intelligence?.changeAnalysis && <ChangeAnalysisCard intelligence={intelligence} />}

        {/* Calendar events from brief */}
        {brief?.calendar?.length > 0 && <CalendarCard events={brief.calendar} />}

        {/* Suggested work blocks */}
        {intelligence && <SuggestionsCard intelligence={intelligence} />}
      </div>

      <div style={{ display: "grid", gap: 18 }}>
        {/* Calendar capacity */}
        {intelligence && <CalendarCapacityCard intelligence={intelligence} />}

        {/* Ranked tasks */}
        {intelligence && <RankedTasksCard intelligence={intelligence} />}

        {/* Highlights from brief */}
        {brief?.highlights?.length > 0 && (
          <GlassCard>
            <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text)", marginBottom: 12 }}>Highlights</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {brief.highlights.map((item, i) => (
                <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <span style={{ color: "var(--teal)", fontSize: "0.9rem", lineHeight: 1.6, flexShrink: 0 }}>→</span>
                  <div style={{ fontSize: "0.84rem", color: "var(--text)", lineHeight: 1.6 }}>
                    {typeof item === "string" ? item : item.text || JSON.stringify(item)}
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        )}

        {/* Active tasks from brief */}
        {brief?.activeTasks?.length > 0 && (
          <GlassCard>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text)" }}>Active Tasks</div>
              <Badge label={`${brief.activeTasks.length}`} color="var(--blue)" />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {brief.activeTasks.slice(0, 8).map((task) => (
                <div key={task.id} style={{ display: "flex", gap: 10, alignItems: "center", padding: "8px 10px", background: "rgba(255,255,255,0.02)", borderRadius: 8 }}>
                  <span style={{ color: "var(--blue)", fontSize: "0.6rem", flexShrink: 0 }}>●</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "0.84rem", color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{task.title}</div>
                    {task.project && <div style={{ fontSize: "0.7rem", color: "var(--faint)" }}>{task.project}</div>}
                  </div>
                  {task.priority && <Badge label={task.priority} color="var(--amber)" />}
                </div>
              ))}
            </div>
          </GlassCard>
        )}

        {/* Conflicts */}
        {intelligence && <ConflictsCard intelligence={intelligence} />}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// TAB: AI Planner — model config + detailed intelligence
// ═══════════════════════════════════════════════════════════════════════

function PlannerTab({ intelligence, intelligenceLoading, schedulerConfig, saving, onSaveConfig }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.35fr 0.95fr", gap: 18, alignItems: "start" }}>
      <div style={{ display: "grid", gap: 18 }}>
        {intelligenceLoading && !intelligence ? (
          <GlassCard glow style={{ padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, color: "var(--muted)", fontSize: "0.9rem" }}>
              <Spinner /> Loading intelligence briefing...
            </div>
          </GlassCard>
        ) : (
          <>
            <BriefingCard intelligence={intelligence} />
            <ChangeAnalysisCard intelligence={intelligence} />
            <SuggestionsCard intelligence={intelligence} />
          </>
        )}
      </div>

      <div style={{ display: "grid", gap: 18 }}>
        <ModelControlCard
          config={schedulerConfig}
          saving={saving}
          intelligence={intelligence}
          onChange={onSaveConfig}
        />
        {intelligence && (
          <>
            <CalendarCapacityCard intelligence={intelligence} />
            <RankedTasksCard intelligence={intelligence} />
            <ConflictsCard intelligence={intelligence} />
          </>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// TAB: Cron Jobs
// ═══════════════════════════════════════════════════════════════════════

function JobsTab({ systemJobs, agentJobs, onToggle, onRun }) {
  return (
    <div style={{ display: "grid", gap: 18, maxWidth: 800 }}>
      <JobSection title="System Jobs" jobs={systemJobs} onToggle={onToggle} onRun={onRun} />
      <JobSection title="Agent Jobs" jobs={agentJobs} onToggle={onToggle} onRun={onRun} />
      {!systemJobs.length && !agentJobs.length && (
        <GlassCard style={{ textAlign: "center", padding: "40px 24px", color: "var(--muted)" }}>
          No cron jobs registered.
        </GlassCard>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// TAB: Health — sentinel alerts, system diagnostics
// ═══════════════════════════════════════════════════════════════════════

function HealthTab({ brief, intelligence }) {
  const [health, setHealth] = useState(null);
  const [healthLoading, setHealthLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetch("/api/health").then((r) => r.json());
        setHealth(data);
      } catch {
        setHealth(null);
      } finally {
        setHealthLoading(false);
      }
    })();
  }, []);

  const sentinelAlerts = brief?.sentinel?.alerts || [];
  const sentinelSummary = brief?.sentinel?.summary || null;
  const highAlerts = sentinelAlerts.filter((a) => a.severity === "high");
  const otherAlerts = sentinelAlerts.filter((a) => a.severity !== "high");

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, alignItems: "start" }}>
      <div style={{ display: "grid", gap: 18 }}>
        {/* System Services */}
        <GlassCard>
          <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text)", marginBottom: 14 }}>System Services</div>
          {healthLoading ? (
            <div style={{ color: "var(--muted)", fontSize: "0.86rem" }}>Checking services...</div>
          ) : health ? (
            <div style={{ display: "grid", gap: 8 }}>
              <ServiceRow label="Core" status={health.status} />
              <ServiceRow label="Database" status={health.db} />
              <ServiceRow label="Memory Server" status={health.memory_server} extra={health.memory_supervisor ? `${health.memory_supervisor.restarts} restarts` : null} />
              <ServiceRow label="LM Studio" status={health.lm_studio} />
              <div style={{ fontSize: "0.76rem", color: "var(--faint)", fontFamily: "var(--mono)", marginTop: 6 }}>
                uptime {Math.floor(health.uptime / 3600)}h {Math.floor((health.uptime % 3600) / 60)}m · pid {health.pid}
              </div>
            </div>
          ) : (
            <div style={{ color: "#fca5a5", fontSize: "0.86rem" }}>Could not reach health endpoint</div>
          )}
        </GlassCard>

        {/* Sentinel Summary */}
        {sentinelSummary && (
          <GlassCard>
            <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text)", marginBottom: 10 }}>Sentinel Status</div>
            <div style={{ fontSize: "0.9rem", color: "var(--text)", lineHeight: 1.6 }}>{sentinelSummary}</div>
          </GlassCard>
        )}

        {/* Blocked tasks */}
        {brief?.blockedTasks?.length > 0 && (
          <GlassCard style={{ borderColor: "rgba(251,191,36,0.3)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text)" }}>Blocked Tasks</div>
              <Badge label={`${brief.blockedTasks.length}`} color="var(--amber)" />
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              {brief.blockedTasks.map((task) => (
                <div key={task.id} style={{ padding: "10px 12px", borderRadius: 8, background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.15)", fontSize: "0.86rem" }}>
                  <div style={{ color: "var(--text)", fontWeight: 600, marginBottom: 2 }}>{task.title}</div>
                  {task.blockedBy && <div style={{ color: "var(--muted)", fontSize: "0.76rem" }}>Blocked by: {task.blockedBy}</div>}
                </div>
              ))}
            </div>
          </GlassCard>
        )}
      </div>

      <div style={{ display: "grid", gap: 18 }}>
        {/* Sentinel Alerts */}
        <GlassCard style={highAlerts.length > 0 ? { borderColor: "rgba(248,113,113,0.35)" } : {}}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text)" }}>Alerts</div>
            {highAlerts.length > 0 && <Badge label={`${highAlerts.length} high`} color="#f87171" />}
            {otherAlerts.length > 0 && <Badge label={`${otherAlerts.length} other`} color="var(--amber)" />}
            {sentinelAlerts.length === 0 && <Badge label="all clear" color="var(--green)" />}
          </div>
          {sentinelAlerts.length === 0 ? (
            <div style={{ color: "var(--muted)", fontSize: "0.86rem" }}>No alerts. System is operating normally.</div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {sentinelAlerts.map((alert, i) => {
                const color =
                  alert.severity === "high" ? "#f87171" : alert.severity === "medium" ? "var(--amber)" : "var(--blue)";
                return (
                  <div
                    key={i}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 8,
                      background: `${color}0d`,
                      border: `1px solid ${color}33`,
                      fontSize: "0.86rem",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                      <span style={{ color: "var(--text)", fontWeight: 600 }}>{alert.type}</span>
                      <Badge label={alert.severity} color={color} />
                    </div>
                    <div style={{ color: "var(--muted)", fontSize: "0.8rem", lineHeight: 1.5 }}>{alert.message}</div>
                  </div>
                );
              })}
            </div>
          )}
        </GlassCard>

        {/* Intelligence model status */}
        {intelligence?.model && (
          <GlassCard>
            <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text)", marginBottom: 12 }}>Planner Model</div>
            <div style={{ display: "grid", gap: 8 }}>
              <ServiceRow label="LM Studio" status={intelligence.model.available ? "ok" : "down"} />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.84rem" }}>
                <span style={{ color: "var(--muted)" }}>Active model</span>
                <span style={{ color: "var(--text)", fontFamily: "var(--mono)" }}>{intelligence.model.selectedModel}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.84rem" }}>
                <span style={{ color: "var(--muted)" }}>Source</span>
                <span style={{ color: "var(--text)" }}>{intelligence.model.source}</span>
              </div>
            </div>
          </GlassCard>
        )}

        {/* Completed today */}
        {brief?.completedToday?.length > 0 && (
          <GlassCard>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text)" }}>Completed Today</div>
              <Badge label={`${brief.completedToday.length}`} color="var(--green)" />
            </div>
            <div style={{ display: "grid", gap: 6 }}>
              {brief.completedToday.map((task) => (
                <div key={task.id} style={{ display: "flex", gap: 8, alignItems: "center", padding: "8px 10px", background: "rgba(45,212,191,0.05)", borderRadius: 8 }}>
                  <span style={{ color: "var(--green)", fontWeight: 700, flexShrink: 0 }}>✓</span>
                  <span style={{ fontSize: "0.84rem", color: "var(--text)" }}>{task.title}</span>
                </div>
              ))}
            </div>
          </GlassCard>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// Shared Components
// ═══════════════════════════════════════════════════════════════════════

function Spinner() {
  return (
    <div
      style={{
        width: 16,
        height: 16,
        border: "2px solid var(--teal)",
        borderTopColor: "transparent",
        borderRadius: "50%",
        animation: "spin 1s linear infinite",
      }}
    />
  );
}

function StatCell({ value, label, color }) {
  return (
    <div>
      <div style={{ fontSize: "1.8rem", fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: "0.6rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "1px" }}>{label}</div>
    </div>
  );
}

function ServiceRow({ label, status, extra }) {
  const isOk = status === "ok" || status === "healthy";
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0" }}>
      <span style={{ color: "var(--text)", fontSize: "0.86rem" }}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {extra && <span style={{ fontSize: "0.72rem", color: "var(--faint)", fontFamily: "var(--mono)" }}>{extra}</span>}
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            fontSize: "0.78rem",
            fontWeight: 600,
            color: isOk ? "var(--green)" : "#f87171",
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: isOk ? "var(--green)" : "#f87171" }} />
          {status}
        </span>
      </div>
    </div>
  );
}

// ─── Intelligence Cards ───────────────────────────────────────────────

const CHANGE_TYPE_COLOR = {
  NEW: "rgba(45,212,191,0.18)",
  REMOVED: "rgba(248,113,113,0.18)",
  MODIFIED: "rgba(251,191,36,0.18)",
};

const CHANGE_TYPE_TEXT_COLOR = {
  NEW: "var(--teal)",
  REMOVED: "#f87171",
  MODIFIED: "#fbbf24",
};

function AISummaryCard({ aiSummary }) {
  if (!aiSummary) return null;
  const summary = typeof aiSummary === "string" ? aiSummary : aiSummary.narrative;
  if (!summary) return null;

  return (
    <GlassCard glow>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <svg width="16" height="16" fill="none" stroke="var(--teal)" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z" />
          <path d="M12 8v4l3 3" />
        </svg>
        <span style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text)" }}>AI Summary</span>
      </div>
      <div
        style={{
          fontSize: "0.9rem",
          color: "var(--text)",
          lineHeight: 1.7,
          borderLeft: "2px solid var(--teal)",
          paddingLeft: 14,
          marginLeft: 4,
        }}
      >
        {summary}
      </div>
      {aiSummary.topPriorities?.length > 0 && (
        <div style={{ marginTop: 14, display: "grid", gap: 6 }}>
          <div style={{ fontSize: "0.72rem", color: "var(--teal)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
            Top Priorities
          </div>
          {aiSummary.topPriorities.map((p, i) => (
            <div key={i} style={{ fontSize: "0.84rem", color: "var(--text)", padding: "6px 10px", background: "rgba(45,212,191,0.06)", borderRadius: 6 }}>
              {p}
            </div>
          ))}
        </div>
      )}
      {aiSummary.suggestedActions?.length > 0 && (
        <div style={{ marginTop: 12, display: "grid", gap: 6 }}>
          <div style={{ fontSize: "0.72rem", color: "var(--amber)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
            Suggested Actions
          </div>
          {aiSummary.suggestedActions.map((a, i) => (
            <div key={i} style={{ fontSize: "0.84rem", color: "var(--text)", padding: "6px 10px", background: "rgba(251,191,36,0.06)", borderRadius: 6 }}>
              {a}
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  );
}

function CalendarCard({ events }) {
  return (
    <GlassCard>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <svg width="16" height="16" fill="none" stroke="var(--blue)" strokeWidth="2" viewBox="0 0 24 24">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        <span style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text)" }}>Today's Calendar</span>
        <Badge label={`${events.length}`} color="var(--blue)" />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {events.map((ev, i) => {
          const color = eventUrgencyColor(ev.start);
          const isPast = ev.start && new Date(ev.start) < new Date();
          return (
            <div
              key={ev.id || i}
              style={{
                display: "flex",
                gap: 12,
                alignItems: "flex-start",
                padding: "10px 12px",
                background: isPast ? "rgba(255,255,255,0.01)" : `${color}0d`,
                border: `1px solid ${isPast ? "var(--border)" : color + "33"}`,
                borderRadius: 8,
                opacity: isPast ? 0.55 : 1,
              }}
            >
              <div style={{ width: 68, flexShrink: 0, textAlign: "right" }}>
                <div style={{ fontSize: "0.8rem", color, fontFamily: "var(--mono)", fontWeight: 600 }}>
                  {fmtEventTime(ev.start)}
                </div>
                {ev.end && (
                  <div style={{ fontSize: "0.7rem", color: "var(--faint)", fontFamily: "var(--mono)" }}>
                    – {fmtEventTime(ev.end)}
                  </div>
                )}
              </div>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: color, flexShrink: 0, marginTop: 5 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "0.88rem", color: isPast ? "var(--muted)" : "var(--text)", fontWeight: 600 }}>
                  {ev.title || ev.summary || "Untitled event"}
                </div>
                {ev.location && (
                  <div style={{ fontSize: "0.72rem", color: "var(--faint)", marginTop: 2 }}>{ev.location}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}

function ChangeAnalysisCard({ intelligence }) {
  if (!intelligence?.changeAnalysis) return null;
  const { changes, analysis, actionItems, rescheduleSuggestions, detectedAt } = intelligence.changeAnalysis;

  return (
    <GlassCard style={{ borderColor: "rgba(251,191,36,0.3)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text)" }}>Schedule Changes Detected</div>
        <Badge label={`${changes.length} change${changes.length !== 1 ? "s" : ""}`} color="#fbbf24" />
        {detectedAt && (
          <span style={{ marginLeft: "auto", color: "var(--muted)", fontSize: "0.75rem" }}>
            {new Date(detectedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
          </span>
        )}
      </div>

      <div style={{ display: "grid", gap: 6, marginBottom: 14 }}>
        {changes.map((change, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 12px",
              borderRadius: 8,
              background: CHANGE_TYPE_COLOR[change.type] ?? "rgba(255,255,255,0.04)",
              fontSize: "0.84rem",
            }}
          >
            <span
              style={{
                fontWeight: 700,
                fontSize: "0.72rem",
                letterSpacing: "0.06em",
                color: CHANGE_TYPE_TEXT_COLOR[change.type] ?? "var(--muted)",
                minWidth: 64,
              }}
            >
              {change.type}
            </span>
            <span style={{ color: "var(--text)", flex: 1 }}>{change.description}</span>
          </div>
        ))}
      </div>

      {analysis && (
        <div
          style={{
            fontSize: "0.88rem",
            color: "var(--text)",
            lineHeight: 1.65,
            padding: "10px 14px",
            borderRadius: 8,
            background: "rgba(255,255,255,0.03)",
            border: "1px solid var(--border)",
            marginBottom: actionItems?.length || rescheduleSuggestions?.length ? 14 : 0,
          }}
        >
          {analysis}
        </div>
      )}

      {actionItems?.length > 0 && (
        <div style={{ marginBottom: rescheduleSuggestions?.length ? 14 : 0 }}>
          <div style={{ fontSize: "0.76rem", color: "var(--teal)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>
            Action Items
          </div>
          <div style={{ display: "grid", gap: 6 }}>
            {actionItems.map((item, i) => (
              <div
                key={i}
                style={{
                  padding: "8px 12px",
                  borderRadius: 8,
                  background: "rgba(45,212,191,0.07)",
                  border: "1px solid rgba(45,212,191,0.15)",
                  color: "var(--text)",
                  fontSize: "0.84rem",
                  lineHeight: 1.5,
                }}
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      )}

      {rescheduleSuggestions?.length > 0 && (
        <div>
          <div style={{ fontSize: "0.76rem", color: "#fbbf24", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>
            Reschedule Suggestions
          </div>
          <div style={{ display: "grid", gap: 6 }}>
            {rescheduleSuggestions.map((item, i) => (
              <div
                key={i}
                style={{
                  padding: "8px 12px",
                  borderRadius: 8,
                  background: "rgba(251,191,36,0.07)",
                  border: "1px solid rgba(251,191,36,0.15)",
                  color: "var(--text)",
                  fontSize: "0.84rem",
                  lineHeight: 1.5,
                }}
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      )}
    </GlassCard>
  );
}

function BriefingCard({ intelligence }) {
  if (!intelligence) return null;
  return (
    <GlassCard glow>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: "0.78rem", color: "var(--teal)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>
            Today
          </div>
          <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--text)" }}>{intelligence.briefing.headline}</div>
        </div>
        <Badge label={intelligence.model.selectedModel} color="var(--blue)" />
      </div>
      <div style={{ fontSize: "0.94rem", color: "var(--text)", lineHeight: 1.7, marginBottom: 16 }}>
        {intelligence.briefing.summary}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
        {intelligence.briefing.topActions.map((item, index) => (
          <div key={index} style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(45,212,191,0.08)", border: "1px solid rgba(45,212,191,0.18)" }}>
            <div style={{ color: "var(--teal)", fontSize: "0.72rem", marginBottom: 6 }}>Action {index + 1}</div>
            <div style={{ color: "var(--text)", fontSize: "0.86rem", lineHeight: 1.5 }}>{item}</div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}

function SuggestionsCard({ intelligence }) {
  if (!intelligence) return null;
  return (
    <GlassCard>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text)" }}>Suggested Work Blocks</div>
        <Badge label={`${intelligence.suggestions.length}`} color="var(--green)" />
      </div>
      {intelligence.suggestions.length === 0 ? (
        <div style={{ color: "var(--muted)", fontSize: "0.86rem" }}>No workable blocks right now.</div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {intelligence.suggestions.map((item) => (
            <div key={item.taskId} style={{ padding: "12px 14px", borderRadius: 10, border: "1px solid var(--border)", background: "rgba(255,255,255,0.02)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
                <div style={{ color: "var(--text)", fontWeight: 600 }}>{item.title}</div>
                <Badge label={`${item.minutes}m`} color="var(--blue)" />
                <Badge label={item.reason} color="var(--amber)" />
              </div>
              <div style={{ color: "var(--muted)", fontSize: "0.82rem", fontFamily: "var(--mono)" }}>
                {formatClock(item.start)} - {formatClock(item.end)} · score {item.score}
              </div>
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  );
}

function ModelControlCard({ config, saving, intelligence, onChange }) {
  if (!config) return null;
  return (
    <GlassCard>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text)" }}>Planner Model</div>
        <Badge label={intelligence?.model?.available ? "LM Studio up" : "Fallback mode"} color={intelligence?.model?.available ? "var(--green)" : "#f59e0b"} />
      </div>

      <div style={{ display: "grid", gap: 14 }}>
        <ToggleRow label="AI planner" value={config.enabled} disabled={saving} onChange={(value) => onChange({ enabled: value })} />
        <ToggleRow label="Local only" value={config.localOnly} disabled={saving} onChange={(value) => onChange({ localOnly: value })} />

        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ color: "var(--muted)", fontSize: "0.8rem" }}>Tier</span>
          <select
            value={config.tier}
            disabled={saving || config.localOnly}
            onChange={(e) => onChange({ tier: e.target.value })}
            style={inputStyle}
          >
            {tierOptions.map((tier) => (
              <option key={tier} value={tier}>
                {tier}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ color: "var(--muted)", fontSize: "0.8rem" }}>Override model</span>
          <input
            value={config.overrideModel || ""}
            disabled={saving}
            onChange={(e) => onChange({ overrideModel: e.target.value || null })}
            placeholder="Optional explicit model id"
            style={inputStyle}
          />
        </label>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ color: "var(--muted)", fontSize: "0.8rem" }}>Temperature</span>
            <input
              type="number"
              min="0"
              max="1"
              step="0.05"
              value={config.temperature}
              disabled={saving}
              onChange={(e) => onChange({ temperature: Number(e.target.value) })}
              style={inputStyle}
            />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ color: "var(--muted)", fontSize: "0.8rem" }}>Max tokens</span>
            <input
              type="number"
              min="128"
              max="4096"
              step="64"
              value={config.maxTokens}
              disabled={saving}
              onChange={(e) => onChange({ maxTokens: Number(e.target.value) })}
              style={inputStyle}
            />
          </label>
        </div>

        <div style={{ color: "var(--muted)", fontSize: "0.78rem", lineHeight: 1.6 }}>
          Active route: <span style={{ color: "var(--text)" }}>{intelligence?.model?.selectedModel || "unknown"}</span>
          {" · "}
          {saving ? "saving..." : intelligence?.model?.source || "local"}
        </div>
      </div>
    </GlassCard>
  );
}

function CalendarCapacityCard({ intelligence }) {
  if (!intelligence) return null;
  return (
    <GlassCard>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text)" }}>Calendar Capacity</div>
        <Badge label={`${intelligence.calendar.events.length} events`} color="var(--blue)" />
      </div>
      <div style={{ display: "grid", gap: 10 }}>
        {intelligence.calendar.freeSlots.slice(0, 5).map((slot, index) => (
          <div key={index} style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: "0.82rem", color: "var(--text)" }}>
            <span>
              {formatClock(slot.start)} - {formatClock(slot.end)}
            </span>
            <span style={{ color: "var(--teal)", fontFamily: "var(--mono)" }}>{slot.minutes}m</span>
          </div>
        ))}
        {intelligence.calendar.freeSlots.length === 0 && (
          <div style={{ color: "var(--muted)", fontSize: "0.84rem" }}>No free slots inside the 8am-11pm planning window.</div>
        )}
      </div>
    </GlassCard>
  );
}

function RankedTasksCard({ intelligence }) {
  if (!intelligence) return null;
  return (
    <GlassCard>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text)" }}>Ranked Tasks</div>
        <Badge label={`${intelligence.tasks.overdueCount} overdue`} color={intelligence.tasks.overdueCount ? "#f87171" : "var(--faint)"} />
      </div>
      <div style={{ display: "grid", gap: 10 }}>
        {intelligence.tasks.ranked.slice(0, 6).map((task) => (
          <div key={task.id} style={{ paddingBottom: 10, borderBottom: "1px solid var(--border)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
              <span style={{ color: "var(--text)", fontSize: "0.86rem", fontWeight: 600 }}>{task.title}</span>
              <Badge label={task.priority || "medium"} color="var(--amber)" />
              <Badge label={`${task.estimatedMinutes}m`} color="var(--blue)" />
            </div>
            <div style={{ color: "var(--muted)", fontSize: "0.77rem", fontFamily: "var(--mono)" }}>
              score {task.score} · {task.status}
              {task.dueDate ? ` · due ${task.dueDate.slice(0, 10)}` : ""}
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}

function ConflictsCard({ intelligence }) {
  if (!intelligence) return null;
  return (
    <GlassCard>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text)" }}>Conflicts</div>
        <Badge
          label={`${intelligence.conflicts.length}`}
          color={intelligence.conflicts.some((c) => c.severity === "high") ? "#f87171" : "var(--amber)"}
        />
      </div>
      {intelligence.conflicts.length === 0 ? (
        <div style={{ color: "var(--muted)", fontSize: "0.84rem" }}>No conflicts detected.</div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {intelligence.conflicts.map((conflict, index) => (
            <div key={index} style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.18)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{ color: "var(--text)", fontSize: "0.85rem", fontWeight: 600 }}>{conflict.title}</span>
                <Badge label={conflict.severity} color={conflict.severity === "high" ? "#f87171" : "var(--amber)"} />
              </div>
              <div style={{ color: "var(--muted)", fontSize: "0.78rem", lineHeight: 1.5 }}>{conflict.description}</div>
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  );
}

function JobSection({ title, jobs, onToggle, onRun }) {
  if (!jobs.length) return null;
  return (
    <GlassCard>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text)" }}>{title}</div>
        <Badge label={`${jobs.length}`} color="var(--purple)" />
      </div>
      <div style={{ display: "grid", gap: 10 }}>
        {jobs.map((job) => (
          <div key={job.id} style={{ padding: "12px 14px", borderRadius: 10, border: "1px solid var(--border)", background: "rgba(255,255,255,0.02)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 14, alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                  <span style={{ color: "var(--text)", fontSize: "0.88rem", fontWeight: 600 }}>{job.name || job.id}</span>
                  <Badge label={job.enabled ? "active" : "disabled"} color={job.enabled ? "var(--green)" : "var(--faint)"} />
                </div>
                <div style={{ color: "var(--muted)", fontSize: "0.77rem", fontFamily: "var(--mono)", marginBottom: 4 }}>{job.schedule}</div>
                <div style={{ color: "var(--muted)", fontSize: "0.76rem" }}>
                  last {formatTimeAgo(job.lastRun)}
                  {job.nextRun ? ` · next ${formatTimeUntil(job.nextRun)}` : ""}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => onToggle(job.id)} style={buttonStyle(job.enabled ? "rgba(248,113,113,0.12)" : "rgba(45,212,191,0.12)")}>
                  {job.enabled ? "Disable" : "Enable"}
                </button>
                <button onClick={() => onRun(job.id)} style={buttonStyle("rgba(96,165,250,0.12)")}>
                  Run
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}

function ToggleRow({ label, value, onChange, disabled }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
      <span style={{ color: "var(--text)", fontSize: "0.84rem" }}>{label}</span>
      <button
        disabled={disabled}
        onClick={() => onChange(!value)}
        style={{
          ...buttonStyle(value ? "rgba(45,212,191,0.14)" : "rgba(148,163,184,0.12)"),
          color: value ? "var(--teal)" : "var(--muted)",
          minWidth: 78,
        }}
      >
        {value ? "On" : "Off"}
      </button>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  background: "rgba(15,23,42,0.35)",
  color: "var(--text)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  padding: "10px 12px",
  fontSize: "0.84rem",
};

function buttonStyle(background) {
  return {
    padding: "7px 12px",
    borderRadius: 8,
    border: "1px solid var(--border)",
    background,
    color: "var(--text)",
    cursor: "pointer",
    fontSize: "0.78rem",
    fontWeight: 600,
  };
}
