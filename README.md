# MockMate AI

Real-time AI interview simulator MVP with resume-aware question generation, webcam and microphone signals, adaptive scoring, and a FastAPI backend contract.

## Current Build

- Next.js interview workspace with setup, live interview, signal dashboard, feedback, and score trends.
- Local resume keyword extraction for `.txt`, `.md`, and `.csv` uploads.
- Webcam preview and microphone signal analysis through browser media APIs.
- Deterministic scoring for clarity, relevance, structure, confidence, voice, and eye contact.
- FastAPI endpoints for resume analysis, session start, answer evaluation, and WebSocket events.
- Docker Compose scaffold for frontend, backend, PostgreSQL, and Chroma.

## Run Frontend

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Run Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Health check:

```bash
curl http://localhost:8000/health
```

## Docker

```bash
docker compose up --build
```

Frontend: `http://localhost:3000`

Backend: `http://localhost:8000`

Chroma: `http://localhost:8001`

## Next Milestones

- Replace heuristic question generation with an LLM interviewer service.
- Add Whisper transcription and stream partial transcripts over WebSockets.
- Parse PDF/DOCX resumes in the backend and store embeddings in Chroma.
- Persist users, sessions, answers, and scores in PostgreSQL.
- Add a live coding panel for DSA interviews.
- Benchmark end-to-end latency for transcription, retrieval, generation, and scoring.

## Authentication deployment

The frontend proxies `/api/auth/*` to FastAPI. Vercel Services supplies
`AUTH_BACKEND_URL` through the frontend's backend binding in `vercel.json`.
For a separately hosted backend, set `INTERNAL_API_URL` to its origin; do not
point it to the frontend (that creates a request loop). Local development uses
`http://localhost:8000`.

The proxy stops waiting after 15 seconds, and browser requests after 20 seconds.
Backend outages return 503/504 and never create simulated accounts. Anonymous
`/api/auth/me` requests return 401 without contacting the backend.

Production uses Neon PostgreSQL through `DATABASE_URL` (or `POSTGRES_URL`).
The Vercel Marketplace integration supplies this secret to the backend. Accounts,
password hashes, verification/reset tokens, preferences, resumes, and interview
records persist across deployments. SQLite remains available for local development
when no database URL is configured; Vercel refuses to use ephemeral SQLite.

Configure stable `SECRET_KEY`, `JWT_SECRET`, and `ADMIN_API_KEY`, production
`APP_URL`, and email delivery on the backend. Existing local SQLite accounts are
not automatically copied to PostgreSQL. The database schema is created on startup
with a transaction lock to serialize concurrent cold starts.

Run PostgreSQL integration tests with `TEST_DATABASE_URL` configured:
`python -m unittest discover -s backend/tests -p test_postgres_auth.py`.
These use a disposable schema, mock email delivery, and test real database
transactions, account sessions, isolation, and persistence between connections.

The shared role catalog lives in `backend/app/resources` so it ships with the
backend service. Interview and Chroma initialization is deferred until an
interview endpoint needs it, keeping it out of authentication startup.

Verify the deployed backend starts successfully, then test registration, logout,
login, an incorrect password, and session persistence across backend restarts.
