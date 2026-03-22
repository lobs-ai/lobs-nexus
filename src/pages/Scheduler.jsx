import { useEffect, useState } from "react";
import GlassCard from "../components/GlassCard";
import Badge from "../components/Badge";
import { api } from "../lib/api";

const tierOptions = ["micro", "small", "medium", "standard", "strong"];

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

export default function Scheduler() {
  const [jobs, setJobs] = useState([]);
  const [intelligence, setIntelligence] = useState(null);
  const [schedulerConfig, setSchedulerConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [intelligenceLoading, setIntelligenceLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const load = async () => {
    try {
      // Load jobs + config fast (< 10ms), show immediately
      const [jobsData, modelsData] = await Promise.all([
        api.scheduler(),
        api.models(),
      ]);
      setJobs(jobsData?.jobs || []);
      setSchedulerConfig(modelsData?.scheduler || null);
      setLoading(false);
      setError(null);

      // Load intelligence in background (can take 10-20s on first call)
      setIntelligenceLoading(true);
      const intelligenceData = await api.schedulerIntelligence();
      setIntelligence(intelligenceData || null);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    } finally {
      setIntelligenceLoading(false);
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 60000); // 60s since intelligence is cached for 5min
    return () => clearInterval(interval);
  }, []);

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

  return (
    <div style={{ padding: "28px 28px 40px", maxWidth: 1240, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 20, flexWrap: "wrap", marginBottom: 24 }}>
        <div style={{ flex: "1 1 520px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
            <svg width="22" height="22" fill="none" stroke="var(--teal)" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
            <h1 style={{ margin: 0, fontSize: "1.55rem", color: "var(--text)" }}>Scheduler Intelligence</h1>
          </div>
          <p style={{ margin: 0, color: "var(--muted)", maxWidth: 720 }}>
            Local-first daily planning across calendar, deadlines, and cron jobs.
          </p>
        </div>
        {!loading && !error && intelligence && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Badge label={`${jobs.filter((j) => j.enabled).length} active jobs`} color="var(--blue)" />
            <Badge label={`${intelligence.calendar.freeSlots.length} free slots`} color="var(--teal)" />
            <Badge label={`${intelligence.conflicts.length} conflicts`} color={intelligence.conflicts.some((c) => c.severity === "high") ? "#f87171" : "var(--amber)"} />
          </div>
        )}
      </div>

      {error && (
        <GlassCard style={{ marginBottom: 18, borderColor: "rgba(248,113,113,0.35)" }}>
          <div style={{ color: "#fca5a5", fontSize: "0.88rem" }}>{error}</div>
        </GlassCard>
      )}

      {loading ? (
        <GlassCard style={{ padding: 32, color: "var(--muted)" }}>Loading scheduler state...</GlassCard>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1.35fr 0.95fr", gap: 18, alignItems: "start" }}>
          <div style={{ display: "grid", gap: 18 }}>
            {intelligenceLoading && !intelligence ? (
              <GlassCard glow style={{ padding: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, color: "var(--muted)", fontSize: "0.9rem" }}>
                  <div style={{ width: 16, height: 16, border: "2px solid var(--teal)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                  Loading intelligence briefing...
                </div>
              </GlassCard>
            ) : (
              <>
                <BriefingCard intelligence={intelligence} />
                <ChangeAnalysisCard intelligence={intelligence} />
                <SuggestionsCard intelligence={intelligence} />
              </>
            )}
            <JobSection title="System Jobs" jobs={systemJobs} onToggle={toggleJob} onRun={runJobNow} />
            <JobSection title="Agent Jobs" jobs={agentJobs} onToggle={toggleJob} onRun={runJobNow} />
          </div>

          <div style={{ display: "grid", gap: 18 }}>
            <ModelControlCard
              config={schedulerConfig}
              saving={saving}
              intelligence={intelligence}
              onChange={saveConfig}
            />
            {intelligenceLoading && !intelligence ? null : (
              <>
                <CalendarCapacityCard intelligence={intelligence} />
                <RankedTasksCard intelligence={intelligence} />
                <ConflictsCard intelligence={intelligence} />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

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

      {/* Change list */}
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

      {/* AI analysis narrative */}
      {analysis && (
        <div style={{
          fontSize: "0.88rem",
          color: "var(--text)",
          lineHeight: 1.65,
          padding: "10px 14px",
          borderRadius: 8,
          background: "rgba(255,255,255,0.03)",
          border: "1px solid var(--border)",
          marginBottom: actionItems.length || rescheduleSuggestions.length ? 14 : 0,
        }}>
          {analysis}
        </div>
      )}

      {/* Action items */}
      {actionItems.length > 0 && (
        <div style={{ marginBottom: rescheduleSuggestions.length ? 14 : 0 }}>
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

      {/* Reschedule suggestions */}
      {rescheduleSuggestions.length > 0 && (
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
        <ToggleRow
          label="AI planner"
          value={config.enabled}
          disabled={saving}
          onChange={(value) => onChange({ enabled: value })}
        />
        <ToggleRow
          label="Local only"
          value={config.localOnly}
          disabled={saving}
          onChange={(value) => onChange({ localOnly: value })}
        />

        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ color: "var(--muted)", fontSize: "0.8rem" }}>Tier</span>
          <select
            value={config.tier}
            disabled={saving || config.localOnly}
            onChange={(e) => onChange({ tier: e.target.value })}
            style={inputStyle}
          >
            {tierOptions.map((tier) => <option key={tier} value={tier}>{tier}</option>)}
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
            <span>{formatClock(slot.start)} - {formatClock(slot.end)}</span>
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
              score {task.score} · {task.status}{task.dueDate ? ` · due ${task.dueDate.slice(0, 10)}` : ""}
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
        <Badge label={`${intelligence.conflicts.length}`} color={intelligence.conflicts.some((c) => c.severity === "high") ? "#f87171" : "var(--amber)"} />
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
                  last {formatTimeAgo(job.lastRun)}{job.nextRun ? ` · next ${formatTimeUntil(job.nextRun)}` : ""}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => onToggle(job.id)} style={buttonStyle(job.enabled ? "rgba(248,113,113,0.12)" : "rgba(45,212,191,0.12)")}>
                  {job.enabled ? "Disable" : "Enable"}
                </button>
                <button onClick={() => onRun(job.id)} style={buttonStyle("rgba(96,165,250,0.12)")}>Run</button>
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
