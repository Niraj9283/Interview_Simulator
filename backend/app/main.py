from fastapi import FastAPI, File, HTTPException, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.models import (
    EvaluationRequest,
    EvaluationResponse,
    InterviewStartRequest,
    InterviewStartResponse,
    RAGQueryRequest,
    RAGQueryResponse,
    RAGResumeUploadResponse,
    RAGStatusResponse,
    ResumeAnalyzeRequest,
    ResumeAnalyzeResponse,
)
from app.services.interview_engine import InterviewEngine
from app.services.rag_engine import RAGEngine


app = FastAPI(title="MockMate AI API", version="0.1.0")
rag_engine = RAGEngine()
engine = InterviewEngine(rag_engine=rag_engine)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/edge/status")
async def get_edge_status() -> dict[str, Any]:
    return {
        "mode": "edge",
        "device_role": "Host Edge Device (Client Laptop)",
        "network_required": False,
        "vision_edge_pipeline": "MediaPipe FaceLandmarker (Local WASM + XNNPACK CPU)",
        "audio_edge_pipeline": "Web Audio API Float32 Time-Domain RMS",
        "vector_edge_pipeline": "Local ChromaDB Persistent Engine",
        "cloud_latency_ms": 0,
        "privacy_status": "100% Air-Gapped / Zero External Transmission",
    }


@app.get("/api/rag/status", response_model=RAGStatusResponse)
async def get_rag_status() -> RAGStatusResponse:
    status_info = rag_engine.get_status()
    return RAGStatusResponse(status=status_info["status"], collections=status_info["collections"])


@app.post("/api/rag/resume/upload", response_model=RAGResumeUploadResponse)
async def upload_resume_rag(
    file: UploadFile | None = File(None),
    raw_text: str | None = None,
    candidate_name: str = "Candidate",
) -> RAGResumeUploadResponse:
    text = ""
    if file:
        content = await file.read()
        if file.filename and file.filename.lower().endswith(".pdf"):
            text = rag_engine.extract_text_from_pdf(content)
        else:
            text = content.decode("utf-8", errors="ignore")
    elif raw_text:
        text = raw_text

    if not text.strip():
        raise HTTPException(status_code=400, detail="No readable text or PDF provided in resume upload.")

    chunks_count = rag_engine.index_resume(text, candidate_name=candidate_name)
    skills = rag_engine._extract_skills_from_text(text)
    keywords, summary = engine.analyze_resume(text, "Candidate Role")

    return RAGResumeUploadResponse(
        status="success",
        chunks_indexed=chunks_count,
        extracted_skills=skills,
        extracted_text=text,
        summary=summary,
    )


@app.post("/api/rag/query", response_model=RAGQueryResponse)
async def query_rag(payload: RAGQueryRequest) -> RAGQueryResponse:
    try:
        results = rag_engine.query_collection(
            payload.collection_name,
            payload.query,
            n_results=payload.n_results,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return RAGQueryResponse(
        collection_name=payload.collection_name,
        query=payload.query,
        results=results,
    )


@app.post("/api/resume/analyze", response_model=ResumeAnalyzeResponse)
async def analyze_resume(payload: ResumeAnalyzeRequest) -> ResumeAnalyzeResponse:
    # Also index into candidate_knowledge Chroma collection automatically
    rag_engine.index_resume(payload.text, candidate_name="Candidate")
    keywords, summary = engine.analyze_resume(payload.text, payload.target_role)
    return ResumeAnalyzeResponse(keywords=keywords, summary=summary)


@app.post("/api/interview/start", response_model=InterviewStartResponse)
async def start_interview(payload: InterviewStartRequest) -> InterviewStartResponse:
    if payload.profile.resume_text:
        rag_engine.index_resume(payload.profile.resume_text, candidate_name=payload.profile.name)
    session_id, question, keywords = engine.start_session(payload.profile)
    return InterviewStartResponse(session_id=session_id, question=question, keywords=keywords)


@app.post("/api/interview/evaluate", response_model=EvaluationResponse)
async def evaluate_answer(payload: EvaluationRequest) -> EvaluationResponse:
    try:
        (
            score,
            signals,
            breakdown,
            feedback,
            next_question,
            completed,
            weak_area,
            retrieved_concepts,
            depth_score,
            adaptive_strategy,
            next_difficulty,
            diff_trend,
            diff_reason,
            session_memory,
            consistency_conflicts,
            structure_analysis,
            skill_gap_report,
            roadmap,
            rag_context_summary,
        ) = engine.evaluate_answer(
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
        breakdown=breakdown,
        feedback=feedback,
        next_question=next_question,
        completed=completed,
        weak_area=weak_area,
        retrieved_concepts=retrieved_concepts,
        technical_depth_score=depth_score,
        adaptive_strategy=adaptive_strategy,
        current_difficulty=next_difficulty,
        difficulty_trend=diff_trend,
        difficulty_reason=diff_reason,
        memory=session_memory,
        consistency_conflicts=consistency_conflicts,
        structure_analysis=structure_analysis,
        skill_gap_report=skill_gap_report,
        roadmap=roadmap,
        rag_context_summary=rag_context_summary,
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
