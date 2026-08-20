import asyncio

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.models import (
    EvaluationRequest,
    EvaluationResponse,
    InterviewStartRequest,
    InterviewStartResponse,
    ResumeAnalyzeRequest,
    ResumeAnalyzeResponse,
)
from app.services.interview_engine import InterviewEngine


app = FastAPI(title="MockMate AI API", version="0.1.0")
engine = InterviewEngine()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/resume/analyze", response_model=ResumeAnalyzeResponse)
async def analyze_resume(payload: ResumeAnalyzeRequest) -> ResumeAnalyzeResponse:
    keywords, summary = engine.analyze_resume(payload.text, payload.target_role)
    return ResumeAnalyzeResponse(keywords=keywords, summary=summary)


@app.post("/api/interview/start", response_model=InterviewStartResponse)
async def start_interview(payload: InterviewStartRequest) -> InterviewStartResponse:
    session_id, question, keywords = engine.start_session(payload.profile)
    return InterviewStartResponse(session_id=session_id, question=question, keywords=keywords)


@app.post("/api/interview/evaluate", response_model=EvaluationResponse)
async def evaluate_answer(payload: EvaluationRequest) -> EvaluationResponse:
    try:
        score, signals, feedback, next_question, completed = engine.evaluate_answer(
            payload.session_id,
            payload.question,
            payload.answer,
            payload.signals,
        )
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Unknown interview session") from exc

    return EvaluationResponse(
        score=score,
        signals=signals,
        feedback=feedback,
        next_question=next_question,
        completed=completed,
    )


@app.websocket("/ws/interview/{session_id}")
async def interview_socket(websocket: WebSocket, session_id: str) -> None:
    await websocket.accept()
    await websocket.send_json({"type": "connected", "session_id": session_id})

    try:
        while True:
            message = await websocket.receive_json()
            if message.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
                continue

            await asyncio.sleep(0.12)
            await websocket.send_json(
                {
                    "type": "interviewer_event",
                    "message": "Answer received. Generating adaptive follow-up.",
                }
            )
    except WebSocketDisconnect:
        return
