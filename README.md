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
