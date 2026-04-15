# iTECify

A real-time collaborative IDE built for teams. Write, run, and debug code together — with AI assistance, live chat, and sandboxed execution.

---

## Features

- **Real-time collaboration** — Multiple users edit the same file simultaneously using CRDT (Yjs) over WebSockets. Changes sync instantly across all connected clients.
- **Multi-language code execution** — Run code in isolated Docker containers with a 10s timeout, 64MB memory cap, and no network access. Supports Python, JavaScript, TypeScript, C, C++, Rust, and Go.
- **AI assistant** — Powered by Groq (Llama 3.1). Proposes code diffs that you can accept or reject inline. AI-modified lines are highlighted in the editor.
- **Security scanning** — Static pattern analysis + AI-based scan before every execution to block dangerous operations (shell access, file writes, infinite loops, etc.).
- **Room system** — Create or join rooms via a short join code. Rooms persist files and chat history. Admins can kick users or transfer ownership.
- **Live chat** — Per-room chat panel synced in real time over the same WebSocket connection.
- **Monaco editor** — VS Code's editor engine with syntax highlighting, error markers, and diff view for AI suggestions.
- **File management** — Create, upload, rename, delete, and download files within a room. Supports 20+ file extensions.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, Monaco Editor, Yjs, React Router |
| Backend | Node.js, Express 5, WebSocket (ws), y-websocket |
| Database | Supabase (PostgreSQL) |
| Auth | JWT + Argon2 password hashing |
| Execution | Docker (sandboxed containers per language) |
| AI | Groq API — Llama 3.1 8B Instant |
| Deployment | Docker Compose |

---

## Getting Started

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- A [Supabase](https://supabase.com) project
- A [Groq](https://console.groq.com) API key

### 1. Clone and configure

```bash
git clone https://github.com/your-org/iTECify.git
cd iTECify
cp .env.example .env
```

Fill in `.env`:

```env
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
JWT_SECRET=your_jwt_secret
GROQ_API_KEY=your_groq_api_key
PORT=3000
```

### 2. Set up the database

Run the SQL schema against your Supabase project:

```bash
# Paste the contents of backend/database/init.sql into the Supabase SQL editor
# or use the Supabase CLI:
supabase db push
```

### 3. Start with Docker Compose

```bash
docker compose up --build
```

- Frontend: [http://localhost:5173](http://localhost:5173)
- Backend: [http://localhost:3000](http://localhost:3000)

### 4. Local development (without Docker)

```bash
# Backend
cd backend
npm install
node server.js

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

---

## Project Structure

```
iTECify/
├── backend/
│   ├── database/
│   │   ├── init.sql          # Database schema
│   │   └── supabase.js       # Supabase client
│   ├── middleware/
│   │   └── auth.js           # JWT middleware
│   ├── routes/               # REST API routes
│   ├── server.js             # Express app entry point
│   └── sockets.js            # WebSocket handlers (collab, execute, chat)
├── frontend/
│   └── src/
│       ├── components/       # Editor, Terminal, Chat, AI panel, Sidebar
│       ├── pages/            # Home, EditorPage, LoginPage
│       ├── hooks/            # useAuth, useCollaboration
│       └── services/         # API and auth helpers
└── docker-compose.yml
```

---

## WebSocket API

The backend exposes three WebSocket routes:

| Route | Purpose |
|---|---|
| `ws://host/collab/:roomId` | Room presence, file events, chat, AI line sync |
| `ws://host/collab/:roomId/:fileId` | Per-file CRDT collaborative editing |
| `ws://host/execute` | Sandboxed code execution with streaming output |

---

## Code Execution Security

Every execution goes through two layers before the container starts:

1. **Static scan** — Regex rules block known dangerous patterns per language (e.g. `os.system`, `subprocess`, `eval`, filesystem access).
2. **AI scan** — Groq analyzes the code for infinite loops, malicious intent, or dangerous operations.

Docker containers run with:
- `--network none` — no internet access
- `--memory 64m` — hard memory limit
- `--pids-limit 50` — prevents fork bombs
- `--cpus 0.5` — CPU throttle
- 10 second execution timeout
- 256KB output limit

---

## Environment Variables

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anonymous/public key |
| `JWT_SECRET` | Secret for signing JWT tokens |
| `GROQ_API_KEY` | Groq API key for AI features |
| `PORT` | Backend port (default: `3000`) |
