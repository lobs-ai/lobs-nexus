# lobs-nexus

lobs-nexus is the web dashboard for the Lobs agent system — a React/Vite SPA with a Python (FastAPI) backend that provides a UI for monitoring and controlling the Lobs agent infrastructure.

## What it does

- **Dashboard & Monitoring** — Overview of agent health, task queue, open sessions, and system metrics
- **Task Management** — View, create, and manage tasks and goals
- **Memory Search** — Query the Lobs memory/knowledge base
- **Reflections & Chat** — Log and review agent reflections; interact with AI chat
- **Agent Control** — Start/stop agents, view worker status, trigger actions
- **Settings** — Configure agent behavior, models, and integrations

## Tech Stack

- **Frontend**: React 19 + Vite 7, React Router 7, Tailwind CSS 4
- **Backend**: Python FastAPI (API server in `api/main.py`)
- **Testing**: Vitest + React Testing Library
- **Ports**: Vite dev server runs on port 5173 (default); API server on 8000

## Connection to lobs-core

lobs-nexus communicates with lobs-core via the **Lobs Gateway** (the API exposed by lobs-core).

### Gateway Configuration

The FastAPI backend (`api/main.py`) connects to the gateway using environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `GATEWAY_URL` | `http://localhost:18789` | lobs-core gateway endpoint |
| `GATEWAY_TOKEN` | (set in secrets) | Auth token for gateway API |

### Frontend API Calls

The React frontend typically calls `/api/*` routes on the same origin (Vite proxies to the FastAPI backend, or the FastAPI backend proxies to lobs-core). Check `vite.config.ts` for proxy configuration.

### Key Gateway Endpoints (lobs-core)

lobs-core exposes a REST API at port 18789. The nexus API server (`api/main.py`) proxies and wraps calls to it. Frontend components use the nexus API for:
- `GET /tasks` — list tasks
- `GET /health` — system health
- `GET /sessions` — active sessions
- `POST /tasks` — create task
- etc.

## Building & Running

### Prerequisites

- Node.js 20+
- Python 3.10+ (for the API backend)
- lobs-core running on port 18789 (gateway must be accessible)

### Development

**Frontend only (hot reload):**
```bash
cd ~/lobs/lobs-nexus
npm install
npm run dev
```
Opens at http://localhost:5173

**Backend (FastAPI):**
```bash
cd ~/lobs/lobs-nexus/api
python main.py
```
Or use the provided script:
```bash
bash api/start.sh
```

**Proxy Configuration:**
In `vite.config.ts`, ensure the Vite proxy forwards `/api` requests to the FastAPI backend. For production, the FastAPI server typically runs behind nginx.

### Production Build

```bash
npm run build      # builds React app to dist/
```

The `dist/` folder is served by nginx (see `nginx.conf`) or as a static build.

### Deployment

```bash
bash deploy.sh
```

Uses Dockerfile + nginx for containerized deployment.

## Key Conventions

### Code Style

- ESLint configured via `eslint.config.js` — run `npm run lint` before committing
- React components in `src/components/` and `src/pages/`
- Shared hooks in `src/hooks/`, utilities in `src/lib/`

### State & Data Fetching

- React components use hooks for local state
- API calls go through the FastAPI backend (`/api/*`)
- No direct calls to lobs-core gateway from the browser — always through nexus API

### File Organization

```
src/
  components/    # Reusable UI components (GlassCard, Modal, Sidebar, etc.)
  pages/         # Route-level components (Dashboard, Inbox, Memory, etc.)
  hooks/         # Custom React hooks
  lib/           # Utilities and helpers
  App.jsx        # Root component with routing

api/
  main.py        # FastAPI server (reflections, chat, gateway proxy)
  nexus.db       # SQLite DB for reflections/chat persistence
  start.sh       # Startup script

public/          # Static assets
dist/            # Production build output
```

### Routing

React Router 7 handles client-side routing. Key routes include:
- `/` — Dashboard
- `/inbox` — Task inbox
- `/memory` — Memory search
- `/workers` — Worker/agent status
- `/settings` — Configuration
- etc.

## Cloudflare Access

Access to lobs-nexus is controlled via **Cloudflare Access**. This means:

1. Traffic is routed through Cloudflare, which enforces authentication
2. Only Rafe's identity (email, GitHub team, etc.) is authorized — no passwords or tokens needed from the browser
3. The Cloudflare Access policy is configured in the Cloudflare Zero Trust dashboard

### Implications for Development

- **Local dev** (`npm run dev`): Cloudflare Access is bypassed — you access `http://localhost:5173` directly
- **Production**: Must go through Cloudflare — direct IP access will return a Cloudflare Access challenge
- **API calls**: If making calls from the browser to lobs-core gateway directly, the gateway also needs to be accessible (either through Cloudflare Tunnel or the browser must be authenticated)

### Environment Variables for Production

Ensure these are set for the production deployment:
```bash
GATEWAY_URL=https://your-gateway-domain.com  # or internal network address
GATEWAY_TOKEN=your-gateway-auth-token
```

## Troubleshooting

**Frontend can't reach lobs-core:**
- Check that `GATEWAY_URL` points to the correct lobs-core instance
- Verify the gateway token is valid
- Check browser console for CORS errors

**API returns 502/504:**
- The FastAPI backend may not be running
- Check that nginx is proxying correctly (see `nginx.conf`)

**Cloudflare Access blocks you:**
- Ensure you're logged into the correct Cloudflare identity
- Check the Access policy in Cloudflare Zero Trust dashboard
