"""
Nexus Reflections + AI Chat API
Endpoints:
- GET/POST /reflections
- GET /reflections/{id}
- POST /reflections/{id}/approve
- POST /reflections/{id}/reject
- POST /reflections/{id}/feedback
- GET/POST /chat/sessions
- GET/DELETE /chat/sessions/{id}
- POST /chat/sessions/{id}/messages
Storage: SQLite (reflections.db)
"""

from __future__ import annotations

import json
import os
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Literal, Optional

import urllib.request

from fastapi import Body, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

GATEWAY_URL = os.environ.get("GATEWAY_URL", "http://localhost:18789")
GATEWAY_TOKEN = os.environ.get("GATEWAY_TOKEN", "341c3e8015df9c77f6ed4cba1359403135994364caf7c668")
CHAT_MODEL = os.environ.get("CHAT_MODEL", "anthropic/claude-haiku-4-6")

# Default local model used for classification and compliance-mode chat
CLASSIFY_MODEL_DEFAULT = os.environ.get("CLASSIFY_MODEL", "lmstudio/qwen3.5-35b-a3b")
COMPLIANCE_MODEL_DEFAULT = os.environ.get("COMPLIANCE_MODEL", "lmstudio/qwen3.5-35b-a3b")

CLASSIFY_PROMPT = (
    "You are a data sensitivity classifier. Analyze the following user message and "
    "determine if it contains sensitive or regulated data.\n\n"
    "Look for:\n"
    "- HIPAA: medical records, health conditions, diagnoses, medications, PHI, patient data\n"
    "- FERPA: student records, grades, transcripts, student IDs, academic performance\n"
    "- PII: social security numbers, credit card numbers, bank accounts, government IDs\n"
    "- SOC2: API keys, passwords, credentials, confidential business data, trade secrets\n\n"
    "Respond with JSON only, no other text:\n"
    '{"sensitive": true/false, "categories": ["HIPAA","FERPA","PII","SOC2"], '
    '"reason": "brief explanation (max 100 chars)"}\n\n'
    "If not sensitive: "
    '{"sensitive": false, "categories": [], "reason": "No sensitive data detected"}\n\n'
    "Message to analyze:\n"
)
# Compliant mode uses a local/on-device model so no data leaves your infrastructure.
CHAT_COMPLIANT_MODEL = os.environ.get("CHAT_COMPLIANT_MODEL", "lmstudio/default")

DB_PATH = Path(__file__).parent / "reflections.db"

# Soul/config files live in the apps workspace root (one level above this file's parent)
WORKSPACE_ROOT = Path(__file__).parent.parent
SOUL_SETUP_FLAG = WORKSPACE_ROOT / ".soul_setup_done"

app = FastAPI(title="Nexus Reflections API", version="1.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# DB helpers
# ---------------------------------------------------------------------------

def get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def ensure_column(conn: sqlite3.Connection, table: str, column: str, definition: str) -> None:
    existing = conn.execute(f"PRAGMA table_info({table})").fetchall()
    names = {row[1] for row in existing}
    if column not in names:
        conn.execute(f"ALTER TABLE {table} ADD COLUMN {column} {definition}")


def init_db() -> None:
    with get_conn() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS reflections (
                id TEXT PRIMARY KEY,
                agent_type TEXT NOT NULL,
                reflection_type TEXT NOT NULL DEFAULT 'general',
                status TEXT NOT NULL DEFAULT 'pending',
                window_start TEXT,
                window_end TEXT,
                summary TEXT,
                inefficiencies TEXT DEFAULT '[]',
                system_risks TEXT DEFAULT '[]',
                missed_opportunities TEXT DEFAULT '[]',
                concrete_suggestions TEXT DEFAULT '[]',
                identity_adjustments TEXT DEFAULT '[]',
                result TEXT,
                feedback_entries TEXT DEFAULT '[]',
                created_at TEXT NOT NULL,
                completed_at TEXT,
                approved_at TEXT,
                rejected_at TEXT,
                rejection_reason TEXT
            )
            """
        )

        # Lightweight migration for existing DBs created before feedback endpoint.
        ensure_column(conn, "reflections", "feedback_entries", "TEXT DEFAULT '[]'")

        conn.commit()


def row_to_dict(row: sqlite3.Row) -> dict:
    d = dict(row)
    # Parse JSON list fields
    for field in (
        "inefficiencies",
        "system_risks",
        "missed_opportunities",
        "concrete_suggestions",
        "identity_adjustments",
        "feedback_entries",
    ):
        try:
            d[field] = json.loads(d[field] or "[]")
        except Exception:
            d[field] = []

    # Parse result JSON
    if d.get("result"):
        try:
            d["result"] = json.loads(d["result"])
        except Exception:
            pass

    # camelCase for frontend compatibility
    return {
        "id": d["id"],
        "agentType": d["agent_type"],
        "reflectionType": d["reflection_type"],
        "status": d["status"],
        "windowStart": d["window_start"],
        "windowEnd": d["window_end"],
        "summary": d["summary"],
        "inefficiencies": d["inefficiencies"],
        "systemRisks": d["system_risks"],
        "missedOpportunities": d["missed_opportunities"],
        "concreteSuggestions": d["concrete_suggestions"],
        "identityAdjustments": d["identity_adjustments"],
        "result": d["result"],
        "feedbackEntries": d["feedback_entries"],
        "createdAt": d["created_at"],
        "completedAt": d["completed_at"],
        "approvedAt": d["approved_at"],
        "rejectedAt": d["rejected_at"],
        "rejectionReason": d["rejection_reason"],
    }


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class ReflectionCreate(BaseModel):
    agentType: str
    reflectionType: str = "general"
    status: str = "pending"
    windowStart: Optional[str] = None
    windowEnd: Optional[str] = None
    summary: Optional[str] = None
    inefficiencies: list[str] = Field(default_factory=list)
    systemRisks: list[str] = Field(default_factory=list)
    missedOpportunities: list[str] = Field(default_factory=list)
    concreteSuggestions: list[str] = Field(default_factory=list)
    identityAdjustments: list[str] = Field(default_factory=list)
    result: Optional[Any] = None
    completedAt: Optional[str] = None


class ApprovePayload(BaseModel):
    note: Optional[str] = None


class RejectPayload(BaseModel):
    reason: Optional[str] = None


class FeedbackCreate(BaseModel):
    state: Literal["approved", "rejected", "feedback"] = "feedback"
    suggestion: Optional[str] = None
    feedback: str = ""
    reviewer: Optional[str] = None


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.on_event("startup")
def startup():
    init_db()
    init_chat_db()


@app.get("/reflections")
def list_reflections(
    agent: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 200,
):
    """List reflections, newest first. Optional ?agent=&status= filters."""
    with get_conn() as conn:
        query = "SELECT * FROM reflections WHERE 1=1"
        params: list = []
        if agent:
            query += " AND agent_type = ?"
            params.append(agent)
        if status:
            query += " AND status = ?"
            params.append(status)
        query += " ORDER BY created_at DESC LIMIT ?"
        params.append(limit)
        rows = conn.execute(query, params).fetchall()
    return [row_to_dict(r) for r in rows]


@app.post("/reflections", status_code=201)
def create_reflection(payload: ReflectionCreate):
    """Create a new reflection."""
    now = datetime.now(timezone.utc).isoformat()
    rid = str(uuid.uuid4())
    with get_conn() as conn:
        conn.execute(
            """
            INSERT INTO reflections (
                id, agent_type, reflection_type, status,
                window_start, window_end, summary,
                inefficiencies, system_risks, missed_opportunities,
                concrete_suggestions, identity_adjustments,
                result, feedback_entries, created_at, completed_at
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            """,
            (
                rid,
                payload.agentType,
                payload.reflectionType,
                payload.status,
                payload.windowStart,
                payload.windowEnd,
                payload.summary,
                json.dumps(payload.inefficiencies),
                json.dumps(payload.systemRisks),
                json.dumps(payload.missedOpportunities),
                json.dumps(payload.concreteSuggestions),
                json.dumps(payload.identityAdjustments),
                json.dumps(payload.result) if payload.result is not None else None,
                json.dumps([]),
                now,
                payload.completedAt,
            ),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM reflections WHERE id=?", (rid,)).fetchone()
    return row_to_dict(row)


@app.get("/reflections/{reflection_id}")
def get_reflection(reflection_id: str):
    """Get a single reflection by ID."""
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM reflections WHERE id=?", (reflection_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Reflection not found")
    return row_to_dict(row)


@app.post("/reflections/{reflection_id}/approve")
def approve_reflection(reflection_id: str, payload: ApprovePayload = Body(default=ApprovePayload())):
    """Approve a reflection (moves status → completed)."""
    now = datetime.now(timezone.utc).isoformat()
    with get_conn() as conn:
        row = conn.execute("SELECT id FROM reflections WHERE id=?", (reflection_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Reflection not found")
        conn.execute(
            "UPDATE reflections SET status='completed', approved_at=?, rejected_at=NULL, rejection_reason=NULL WHERE id=?",
            (now, reflection_id),
        )
        conn.commit()
        updated = conn.execute("SELECT * FROM reflections WHERE id=?", (reflection_id,)).fetchone()
    return row_to_dict(updated)


@app.post("/reflections/{reflection_id}/reject")
def reject_reflection(reflection_id: str, payload: RejectPayload = Body(default=RejectPayload())):
    """Reject a reflection."""
    now = datetime.now(timezone.utc).isoformat()
    with get_conn() as conn:
        row = conn.execute("SELECT id FROM reflections WHERE id=?", (reflection_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Reflection not found")
        conn.execute(
            "UPDATE reflections SET status='rejected', rejected_at=?, rejection_reason=?, approved_at=NULL WHERE id=?",
            (now, payload.reason, reflection_id),
        )
        conn.commit()
        updated = conn.execute("SELECT * FROM reflections WHERE id=?", (reflection_id,)).fetchone()
    return row_to_dict(updated)


@app.post("/reflections/{reflection_id}/feedback")
def add_feedback(reflection_id: str, payload: FeedbackCreate):
    """Append reviewer feedback to a reflection, optionally tied to a suggestion."""
    now = datetime.now(timezone.utc).isoformat()

    with get_conn() as conn:
        row = conn.execute("SELECT * FROM reflections WHERE id=?", (reflection_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Reflection not found")

        parsed = row_to_dict(row)
        entries = parsed.get("feedbackEntries", [])

        entries.append(
            {
                "id": str(uuid.uuid4()),
                "state": payload.state,
                "suggestion": payload.suggestion,
                "feedback": payload.feedback,
                "reviewer": payload.reviewer,
                "createdAt": now,
            }
        )

        conn.execute(
            "UPDATE reflections SET feedback_entries=? WHERE id=?",
            (json.dumps(entries), reflection_id),
        )
        conn.commit()
        updated = conn.execute("SELECT * FROM reflections WHERE id=?", (reflection_id,)).fetchone()

    return row_to_dict(updated)


@app.delete("/reflections/{reflection_id}", status_code=204)
def delete_reflection(reflection_id: str):
    """Delete a reflection."""
    with get_conn() as conn:
        row = conn.execute("SELECT id FROM reflections WHERE id=?", (reflection_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Reflection not found")
        conn.execute("DELETE FROM reflections WHERE id=?", (reflection_id,))
        conn.commit()


@app.get("/health")
def health():
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# Chat Sessions
# ---------------------------------------------------------------------------

def init_chat_db() -> None:
    with get_conn() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS chat_sessions (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL DEFAULT 'New Chat',
                model TEXT NOT NULL,
                system_prompt TEXT,
                compliant INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS chat_messages (
                id TEXT PRIMARY KEY,
                session_id TEXT NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS app_settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )
        # Stores compliance flags for tasks and projects (keyed by entity id + type)
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS entity_compliance (
                entity_id TEXT NOT NULL,
                entity_type TEXT NOT NULL,
                compliant INTEGER NOT NULL DEFAULT 0,
                updated_at TEXT NOT NULL,
                PRIMARY KEY (entity_id, entity_type)
            )
            """
        )
        # Migrate existing DBs that predate the compliant column
        ensure_column(conn, "chat_sessions", "compliant", "INTEGER NOT NULL DEFAULT 0")
        conn.commit()
        # Seed default settings if not present
        _now = datetime.now(timezone.utc).isoformat()
        for key, val in [
            ("auto_classify_enabled", "false"),
            ("auto_classify_mode", "prompt"),   # "prompt" or "auto"
            ("classify_model", CLASSIFY_MODEL_DEFAULT),
            ("compliance_model", COMPLIANCE_MODEL_DEFAULT),
        ]:
            conn.execute(
                "INSERT OR IGNORE INTO app_settings (key, value, updated_at) VALUES (?,?,?)",
                (key, val, _now),
            )
        conn.commit()


def session_to_dict(row: sqlite3.Row) -> dict:
    return {
        "id": row["id"],
        "title": row["title"],
        "model": row["model"],
        "systemPrompt": row["system_prompt"],
        "compliant": bool(row["compliant"]),
        "createdAt": row["created_at"],
        "updatedAt": row["updated_at"],
    }


def message_to_dict(row: sqlite3.Row) -> dict:
    return {
        "id": row["id"],
        "sessionId": row["session_id"],
        "role": row["role"],
        "content": row["content"],
        "createdAt": row["created_at"],
    }


class ChatSessionCreate(BaseModel):
    title: str = "New Chat"
    model: str = CHAT_MODEL
    systemPrompt: Optional[str] = None
    compliant: bool = False


class ChatSessionUpdate(BaseModel):
    title: Optional[str] = None
    systemPrompt: Optional[str] = None
    compliant: Optional[bool] = None


class ChatMessageSend(BaseModel):
    content: str
    model: Optional[str] = None  # override per-message if desired


# ---------------------------------------------------------------------------
# Chat Settings
# ---------------------------------------------------------------------------

def _get_settings(conn: sqlite3.Connection) -> dict:
    rows = conn.execute("SELECT key, value FROM app_settings").fetchall()
    s = {r["key"]: r["value"] for r in rows}
    return {
        "autoClassifyEnabled": s.get("auto_classify_enabled", "false") == "true",
        "autoClassifyMode": s.get("auto_classify_mode", "prompt"),
        "classifyModel": s.get("classify_model", CLASSIFY_MODEL_DEFAULT),
        "complianceModel": s.get("compliance_model", COMPLIANCE_MODEL_DEFAULT),
    }


@app.get("/chat/settings")
def get_chat_settings():
    """Return global chat / compliance settings."""
    with get_conn() as conn:
        return _get_settings(conn)


class ChatSettingsUpdate(BaseModel):
    autoClassifyEnabled: Optional[bool] = None
    autoClassifyMode: Optional[str] = None   # "prompt" | "auto"
    classifyModel: Optional[str] = None
    complianceModel: Optional[str] = None


@app.patch("/chat/settings")
def update_chat_settings(payload: ChatSettingsUpdate):
    """Update global chat / compliance settings."""
    now = datetime.now(timezone.utc).isoformat()
    mapping = {
        "autoClassifyEnabled": ("auto_classify_enabled", lambda v: "true" if v else "false"),
        "autoClassifyMode": ("auto_classify_mode", str),
        "classifyModel": ("classify_model", str),
        "complianceModel": ("compliance_model", str),
    }
    with get_conn() as conn:
        for field, (key, transform) in mapping.items():
            val = getattr(payload, field)
            if val is not None:
                conn.execute(
                    "INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES (?,?,?)",
                    (key, transform(val), now),
                )
        conn.commit()
        return _get_settings(conn)


# ---------------------------------------------------------------------------
# Classification helper
# ---------------------------------------------------------------------------

def _classify_content(content: str, classify_model: str) -> dict:
    """
    Call a local model to classify whether `content` contains sensitive data.
    Returns a dict: {"sensitive": bool, "categories": [...], "reason": "..."}
    Returns {"sensitive": False, "categories": [], "reason": "classification unavailable"}
    on any failure (model unreachable, timeout, parse error) to avoid blocking chat.
    """
    messages = [
        {"role": "user", "content": CLASSIFY_PROMPT + content},
    ]
    req_body = json.dumps({"model": classify_model, "messages": messages, "max_tokens": 200}).encode()
    req = urllib.request.Request(
        f"{GATEWAY_URL}/v1/chat/completions",
        data=req_body,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {GATEWAY_TOKEN}",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            resp_data = json.loads(resp.read())
        raw = resp_data["choices"][0]["message"]["content"].strip()
        # Extract JSON from the response (model may wrap it in markdown)
        start = raw.find("{")
        end = raw.rfind("}") + 1
        if start >= 0 and end > start:
            result = json.loads(raw[start:end])
            return {
                "sensitive": bool(result.get("sensitive", False)),
                "categories": list(result.get("categories", [])),
                "reason": str(result.get("reason", ""))[:200],
            }
    except Exception:
        pass
    return {"sensitive": False, "categories": [], "reason": "classification unavailable"}


@app.get("/chat/sessions")
def list_chat_sessions():
    """List all chat sessions, newest first."""
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM chat_sessions ORDER BY updated_at DESC"
        ).fetchall()
    return [session_to_dict(r) for r in rows]


@app.post("/chat/sessions", status_code=201)
def create_chat_session(payload: ChatSessionCreate):
    """Create a new chat session."""
    now = datetime.now(timezone.utc).isoformat()
    sid = str(uuid.uuid4())
    with get_conn() as conn:
        conn.execute(
            "INSERT INTO chat_sessions (id, title, model, system_prompt, compliant, created_at, updated_at) VALUES (?,?,?,?,?,?,?)",
            (sid, payload.title, payload.model, payload.systemPrompt, int(payload.compliant), now, now),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM chat_sessions WHERE id=?", (sid,)).fetchone()
    return session_to_dict(row)


@app.get("/chat/sessions/{session_id}")
def get_chat_session(session_id: str):
    """Get a session with all its messages."""
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM chat_sessions WHERE id=?", (session_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Session not found")
        msgs = conn.execute(
            "SELECT * FROM chat_messages WHERE session_id=? ORDER BY created_at ASC",
            (session_id,),
        ).fetchall()
    result = session_to_dict(row)
    result["messages"] = [message_to_dict(m) for m in msgs]
    return result


@app.patch("/chat/sessions/{session_id}")
def update_chat_session(session_id: str, payload: ChatSessionUpdate):
    """Update session title, system prompt, or compliance flag."""
    now = datetime.now(timezone.utc).isoformat()
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM chat_sessions WHERE id=?", (session_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Session not found")
        updates = {"updated_at": now}
        if payload.title is not None:
            updates["title"] = payload.title
        if payload.systemPrompt is not None:
            updates["system_prompt"] = payload.systemPrompt
        if payload.compliant is not None:
            updates["compliant"] = int(payload.compliant)
        set_clause = ", ".join(f"{k}=?" for k in updates)
        conn.execute(
            f"UPDATE chat_sessions SET {set_clause} WHERE id=?",
            (*updates.values(), session_id),
        )
        conn.commit()
        updated = conn.execute("SELECT * FROM chat_sessions WHERE id=?", (session_id,)).fetchone()
    return session_to_dict(updated)


@app.delete("/chat/sessions/{session_id}", status_code=204)
def delete_chat_session(session_id: str):
    """Delete a session and all its messages."""
    with get_conn() as conn:
        row = conn.execute("SELECT id FROM chat_sessions WHERE id=?", (session_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Session not found")
        conn.execute("DELETE FROM chat_messages WHERE session_id=?", (session_id,))
        conn.execute("DELETE FROM chat_sessions WHERE id=?", (session_id,))
        conn.commit()


@app.post("/chat/sessions/{session_id}/messages")
def send_chat_message(session_id: str, payload: ChatMessageSend):
    """Send a user message and get an AI reply. Stores both in DB."""
    now = datetime.now(timezone.utc).isoformat()

    with get_conn() as conn:
        session_row = conn.execute(
            "SELECT * FROM chat_sessions WHERE id=?", (session_id,)
        ).fetchone()
        if not session_row:
            raise HTTPException(status_code=404, detail="Session not found")

        # Get conversation history
        msg_rows = conn.execute(
            "SELECT role, content FROM chat_messages WHERE session_id=? ORDER BY created_at ASC",
            (session_id,),
        ).fetchall()

        # Load global settings for auto-classification
        settings = _get_settings(conn)

    session = session_to_dict(session_row)
    history = [{"role": r["role"], "content": r["content"]} for r in msg_rows]

    # -------------------------------------------------------------------
    # Auto-classification: use a local model to detect sensitive data
    # Only runs if enabled in settings and the session isn't already compliant.
    # Falls back silently — never blocks the chat on classification failure.
    # -------------------------------------------------------------------
    classification: Optional[dict] = None
    compliance_mode_applied = False
    compliance_mode_prompted = False

    if settings["autoClassifyEnabled"] and not session.get("compliant"):
        classification = _classify_content(payload.content, settings["classifyModel"])
        if classification["sensitive"]:
            if settings["autoClassifyMode"] == "auto":
                # Automatically mark session as compliant
                with get_conn() as conn:
                    conn.execute(
                        "UPDATE chat_sessions SET compliant=1, updated_at=? WHERE id=?",
                        (now, session_id),
                    )
                    conn.commit()
                session["compliant"] = True
                compliance_mode_applied = True
            else:
                # "prompt" mode — tell the UI to show a banner
                compliance_mode_prompted = True

    # Build messages for gateway
    messages = []
    if session.get("systemPrompt"):
        messages.append({"role": "system", "content": session["systemPrompt"]})
    messages.extend(history)
    messages.append({"role": "user", "content": payload.content})

    # Compliant sessions must use a local model — never route to cloud providers.
    if session.get("compliant"):
        model = settings["complianceModel"] or CHAT_COMPLIANT_MODEL
    else:
        model = payload.model or session["model"]

    # Call gateway
    req_body = json.dumps({"model": model, "messages": messages}).encode()
    req = urllib.request.Request(
        f"{GATEWAY_URL}/v1/chat/completions",
        data=req_body,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {GATEWAY_TOKEN}",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            resp_data = json.loads(resp.read())
        assistant_content = resp_data["choices"][0]["message"]["content"]
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Gateway error: {e}")

    # Persist user + assistant messages
    user_id = str(uuid.uuid4())
    asst_id = str(uuid.uuid4())
    now_asst = datetime.now(timezone.utc).isoformat()

    with get_conn() as conn:
        conn.execute(
            "INSERT INTO chat_messages (id, session_id, role, content, created_at) VALUES (?,?,?,?,?)",
            (user_id, session_id, "user", payload.content, now),
        )
        conn.execute(
            "INSERT INTO chat_messages (id, session_id, role, content, created_at) VALUES (?,?,?,?,?)",
            (asst_id, session_id, "assistant", assistant_content, now_asst),
        )
        # Auto-title session from first user message
        count = conn.execute(
            "SELECT COUNT(*) FROM chat_messages WHERE session_id=?", (session_id,)
        ).fetchone()[0]
        if count == 2:  # first exchange
            title = payload.content[:60].replace("\n", " ")
            conn.execute(
                "UPDATE chat_sessions SET title=?, updated_at=? WHERE id=?",
                (title, now_asst, session_id),
            )
        else:
            conn.execute(
                "UPDATE chat_sessions SET updated_at=? WHERE id=?",
                (now_asst, session_id),
            )
        conn.commit()

    resp_body: dict = {
        "userMessage": {
            "id": user_id,
            "sessionId": session_id,
            "role": "user",
            "content": payload.content,
            "createdAt": now,
        },
        "assistantMessage": {
            "id": asst_id,
            "sessionId": session_id,
            "role": "assistant",
            "content": assistant_content,
            "createdAt": now_asst,
        },
    }

    # Include classification result if a check was performed
    if classification is not None:
        resp_body["classification"] = {
            "sensitive": classification["sensitive"],
            "categories": classification["categories"],
            "reason": classification["reason"],
            "complianceModeApplied": compliance_mode_applied,
            "complianceModePrompted": compliance_mode_prompted,
        }

    return resp_body


# ---------------------------------------------------------------------------
# Setup Wizard endpoints
# ---------------------------------------------------------------------------

class SetupCompletePayload(BaseModel):
    soulContent: str
    identityContent: str
    userContent: Optional[str] = None


@app.get("/setup/status")
def get_setup_status():
    """Return whether the soul setup wizard has been completed."""
    done = SOUL_SETUP_FLAG.exists()
    return {"setupComplete": done}


@app.post("/setup/complete")
def complete_setup(payload: SetupCompletePayload):
    """
    Write SOUL.md, IDENTITY.md (and optionally USER.md) to the workspace root.
    Creates a .soul_setup_done flag file to mark setup as finished.
    """
    errors = []

    def write_file(path: Path, content: str, label: str) -> bool:
        try:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(content, encoding="utf-8")
            return True
        except Exception as e:
            errors.append(f"Failed to write {label}: {e}")
            return False

    soul_path = WORKSPACE_ROOT / "SOUL.md"
    identity_path = WORKSPACE_ROOT / "IDENTITY.md"
    user_path = WORKSPACE_ROOT / "USER.md"

    write_file(soul_path, payload.soulContent, "SOUL.md")
    write_file(identity_path, payload.identityContent, "IDENTITY.md")
    if payload.userContent:
        write_file(user_path, payload.userContent, "USER.md")

    if errors:
        raise HTTPException(status_code=500, detail="; ".join(errors))

    # Mark setup as complete
    try:
        SOUL_SETUP_FLAG.write_text(
            f"Setup completed at {datetime.now(timezone.utc).isoformat()}\n",
            encoding="utf-8",
        )
    except Exception as e:
        # Non-fatal — setup files were written
        pass

    return {
        "ok": True,
        "filesWritten": ["SOUL.md", "IDENTITY.md"] + (["USER.md"] if payload.userContent else []),
    }


@app.delete("/setup/reset")
def reset_setup():
    """Remove the setup-done flag so the wizard shows again (for testing/re-setup)."""
    if SOUL_SETUP_FLAG.exists():
        SOUL_SETUP_FLAG.unlink()
    return {"ok": True, "message": "Setup flag cleared. Wizard will show on next load."}


# ---------------------------------------------------------------------------
# Compliance Status Reports
# ---------------------------------------------------------------------------

# Path to the PAW plugin database (where model_usage_events live)
PAW_DB_PATH = Path.home() / ".openclaw" / "plugins" / "paw" / "paw.db"

# Providers that run locally (on-device) — these are "compliant" calls.
# Cloud providers (anthropic, openai, etc.) are "non-compliant".
LOCAL_PROVIDERS = {"lmstudio", "ollama", "local"}


def _compliance_query(conn: sqlite3.Connection, where_clause: str, params: list) -> dict:
    """Run a compliance breakdown query for the given time window."""
    rows = conn.execute(
        f"""
        SELECT
            provider,
            COUNT(*) AS calls,
            SUM(input_tokens + output_tokens) AS tokens,
            SUM(estimated_cost_usd) AS cost_usd
        FROM model_usage_events
        WHERE {where_clause}
        GROUP BY provider
        """,
        params,
    ).fetchall()

    compliant_calls = 0
    non_compliant_calls = 0
    compliant_tokens = 0
    non_compliant_tokens = 0
    compliant_cost = 0.0
    non_compliant_cost = 0.0
    provider_breakdown = []

    for row in rows:
        provider = row["provider"] or "unknown"
        calls = row["calls"] or 0
        tokens = row["tokens"] or 0
        cost = row["cost_usd"] or 0.0
        is_compliant = provider.lower() in LOCAL_PROVIDERS

        if is_compliant:
            compliant_calls += calls
            compliant_tokens += tokens
            compliant_cost += cost
        else:
            non_compliant_calls += calls
            non_compliant_tokens += tokens
            non_compliant_cost += cost

        provider_breakdown.append({
            "provider": provider,
            "compliant": is_compliant,
            "calls": calls,
            "tokens": tokens,
            "estimatedCostUsd": round(cost, 6),
        })

    total_calls = compliant_calls + non_compliant_calls
    compliant_pct = round(100.0 * compliant_calls / total_calls, 1) if total_calls else 0.0
    non_compliant_pct = round(100.0 - compliant_pct, 1) if total_calls else 0.0

    return {
        "totalCalls": total_calls,
        "compliantCalls": compliant_calls,
        "nonCompliantCalls": non_compliant_calls,
        "compliantPct": compliant_pct,
        "nonCompliantPct": non_compliant_pct,
        "compliantTokens": compliant_tokens,
        "nonCompliantTokens": non_compliant_tokens,
        "compliantCostUsd": round(compliant_cost, 6),
        "nonCompliantCostUsd": round(non_compliant_cost, 6),
        "providerBreakdown": sorted(provider_breakdown, key=lambda x: -x["calls"]),
    }


def _get_paw_conn() -> sqlite3.Connection:
    if not PAW_DB_PATH.exists():
        raise HTTPException(
            status_code=503,
            detail=f"PAW database not found at {PAW_DB_PATH}. Ensure the PAW plugin is installed.",
        )
    conn = sqlite3.connect(PAW_DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


@app.get("/compliance/status")
def get_compliance_status():
    """
    Return compliance status report: count and percentage of compliant vs
    non-compliant AI calls across three time windows (7d, 30d, all time).

    Compliant = calls processed by a local/on-device model (no data leaves
    your infrastructure). Non-compliant = calls routed to a cloud AI provider.
    """
    try:
        conn = _get_paw_conn()
    except HTTPException:
        # Return empty report if PAW DB is unavailable (e.g., first run)
        empty = {
            "totalCalls": 0,
            "compliantCalls": 0,
            "nonCompliantCalls": 0,
            "compliantPct": 0.0,
            "nonCompliantPct": 0.0,
            "compliantTokens": 0,
            "nonCompliantTokens": 0,
            "compliantCostUsd": 0.0,
            "nonCompliantCostUsd": 0.0,
            "providerBreakdown": [],
        }
        return {
            "last7Days": empty,
            "last30Days": empty,
            "allTime": empty,
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "note": "PAW database not available — no AI call data yet.",
        }

    with conn:
        last7 = _compliance_query(
            conn,
            "timestamp >= datetime('now', '-7 days')",
            [],
        )
        last30 = _compliance_query(
            conn,
            "timestamp >= datetime('now', '-30 days')",
            [],
        )
        all_time = _compliance_query(conn, "1=1", [])

    return {
        "last7Days": last7,
        "last30Days": last30,
        "allTime": all_time,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
    }


# ---------------------------------------------------------------------------
# Entity compliance helpers (tasks + projects)
# ---------------------------------------------------------------------------

def _entity_compliance_map(conn: sqlite3.Connection, entity_type: str) -> dict[str, bool]:
    """Return {entity_id: compliant} for the given entity type."""
    rows = conn.execute(
        "SELECT entity_id, compliant FROM entity_compliance WHERE entity_type=?",
        (entity_type,),
    ).fetchall()
    return {r["entity_id"]: bool(r["compliant"]) for r in rows}


def _set_entity_compliance(conn: sqlite3.Connection, entity_id: str, entity_type: str, compliant: bool) -> None:
    now = datetime.now(timezone.utc).isoformat()
    conn.execute(
        """
        INSERT INTO entity_compliance (entity_id, entity_type, compliant, updated_at)
        VALUES (?,?,?,?)
        ON CONFLICT(entity_id, entity_type) DO UPDATE SET compliant=excluded.compliant, updated_at=excluded.updated_at
        """,
        (entity_id, entity_type, int(compliant), now),
    )
    conn.commit()


def _gateway_get(path: str) -> Any:
    """Fetch JSON from the PAW gateway."""
    req = urllib.request.Request(
        f"{GATEWAY_URL}{path}",
        headers={"Authorization": f"Bearer {GATEWAY_TOKEN}"},
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read().decode())


# ---------------------------------------------------------------------------
# Agents proxy routes (fetches active subagents from lobs-core gateway)
# ---------------------------------------------------------------------------

@app.get("/api/agents")
async def get_active_agents():
    """Return currently running subagents from lobs-core."""
    try:
        return _gateway_get("/api/active-agents")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Gateway error: {e}")


# ---------------------------------------------------------------------------
# Task proxy routes (fetches from PAW gateway, merges local compliance flags)
# ---------------------------------------------------------------------------

def _build_task_title_map(tasks: list) -> dict:
    """Build a {task_id: {title, status, workState}} map from a task list."""
    return {
        t["id"]: {
            "id": t["id"],
            "title": t.get("title") or "Untitled",
            "status": t.get("status") or "unknown",
            "workState": t.get("workState") or t.get("work_state"),
        }
        for t in tasks
        if t.get("id")
    }


def _resolve_blockers(blocked_by: Any, title_map: dict) -> list:
    """
    Given a blockedBy value (list of IDs or None) and a title map,
    return a list of {id, title, status, workState} dicts.
    Unknown IDs get placeholder title.
    """
    if not blocked_by:
        return []
    if isinstance(blocked_by, str):
        try:
            blocked_by = json.loads(blocked_by)
        except Exception:
            return []
    if not isinstance(blocked_by, list):
        return []
    result = []
    for bid in blocked_by:
        if bid in title_map:
            result.append(title_map[bid])
        else:
            result.append({"id": bid, "title": f"Task {bid[:8]}…", "status": "unknown", "workState": None})
    return result


@app.get("/tasks")
def list_tasks(status: Optional[str] = None, limit: int = 200):
    """
    Proxy PAW tasks from the gateway and merge local compliance flags.
    Returns tasks with `compliant` boolean and `blockerDetails` list.
    """
    # Fetch all tasks (no status filter for full title map) then filter client-side
    try:
        all_tasks = _gateway_get(f"/api/tasks?limit=500")
        if isinstance(all_tasks, dict):
            all_tasks = all_tasks.get("tasks", [])
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Gateway error: {e}")

    title_map = _build_task_title_map(all_tasks)

    # Filter by status if requested
    if status and status != "all":
        tasks = [t for t in all_tasks if t.get("status") == status]
    else:
        tasks = all_tasks

    with get_conn() as conn:
        cmap = _entity_compliance_map(conn, "task")

    for t in tasks:
        t["compliant"] = cmap.get(t.get("id", ""), False)
        t["blockerDetails"] = _resolve_blockers(t.get("blockedBy"), title_map)

    return tasks


@app.get("/tasks/{task_id}/blockers")
def get_task_blockers(task_id: str):
    """
    Returns resolved blocker details for a task.
    Each blocker includes: id, title, status, workState.
    """
    try:
        task = _gateway_get(f"/api/tasks/{task_id}")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Gateway error: {e}")

    if not task or "id" not in task:
        raise HTTPException(status_code=404, detail="Task not found")

    blocked_by = task.get("blockedBy")
    if not blocked_by:
        return {"taskId": task_id, "blockers": []}

    if isinstance(blocked_by, str):
        try:
            blocked_by = json.loads(blocked_by)
        except Exception:
            blocked_by = []

    if not blocked_by:
        return {"taskId": task_id, "blockers": []}

    # Resolve each blocker ID
    blockers = []
    for bid in blocked_by:
        try:
            dep = _gateway_get(f"/api/tasks/{bid}")
            if dep and "id" in dep:
                blockers.append({
                    "id": dep["id"],
                    "title": dep.get("title") or "Untitled",
                    "status": dep.get("status") or "unknown",
                    "workState": dep.get("workState") or dep.get("work_state"),
                })
            else:
                blockers.append({"id": bid, "title": f"Task {bid[:8]}…", "status": "unknown", "workState": None})
        except Exception:
            blockers.append({"id": bid, "title": f"Task {bid[:8]}…", "status": "unknown", "workState": None})

    unresolved = [b for b in blockers if b["status"] not in ("completed", "closed", "cancelled", "rejected", "done")]
    return {
        "taskId": task_id,
        "blockers": blockers,
        "unresolvedCount": len(unresolved),
        "isBlocked": len(unresolved) > 0,
    }


@app.patch("/tasks/{task_id}/compliance")
def set_task_compliance(task_id: str, body: dict = Body(...)):
    """Toggle compliance mode on a task."""
    compliant = bool(body.get("compliant", False))
    with get_conn() as conn:
        _set_entity_compliance(conn, task_id, "task", compliant)
    return {"taskId": task_id, "compliant": compliant}


# ---------------------------------------------------------------------------
# Project proxy routes
# ---------------------------------------------------------------------------

@app.get("/projects")
def list_projects():
    """
    Proxy PAW projects from the gateway and merge local compliance flags.
    """
    try:
        projects = _gateway_get("/api/projects")
        if isinstance(projects, dict):
            projects = projects.get("projects", [])
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Gateway error: {e}")

    with get_conn() as conn:
        cmap = _entity_compliance_map(conn, "project")

    for p in projects:
        p["compliant"] = cmap.get(p.get("id", ""), False)

    return projects


@app.patch("/projects/{project_id}/compliance")
def set_project_compliance(project_id: str, body: dict = Body(...)):
    """Toggle compliance mode on a project."""
    compliant = bool(body.get("compliant", False))
    with get_conn() as conn:
        _set_entity_compliance(conn, project_id, "project", compliant)
    return {"projectId": project_id, "compliant": compliant}
