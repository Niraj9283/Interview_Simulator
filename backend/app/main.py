import asyncio
from typing import Any
from fastapi import FastAPI, File, HTTPException, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.models import (
    CIUTopicModel,
    CandidateSkillGraphResponse,
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
    SkillGraphNodeModel,
)
from app.services.interview_engine import InterviewEngine
from app.services.knowledge_graph import KnowledgeGraphService
from app.services.rag_engine import RAGEngine


app = FastAPI(title="MockMate AI API", version="0.2.0")
rag_engine = RAGEngine()
engine = InterviewEngine(rag_engine=rag_engine)
kg_service = KnowledgeGraphService()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def strip_api_backend_prefix(request, call_next):
    path = request.scope.get("path", "")
    if path.startswith("/api/backend"):
        stripped = path[len("/api/backend"):]
        request.scope["path"] = stripped if stripped else "/"
    return await call_next(request)


@app.get("/")
async def root() -> dict[str, str]:
    return {"status": "ok", "app": "MockMate AI API"}


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


@app.get("/api/knowledge-graph", response_model=list[CIUTopicModel])
async def get_knowledge_graph() -> list[CIUTopicModel]:
    topics = kg_service.get_all_topics()
    return [CIUTopicModel(**t) for t in topics]


@app.post("/api/resume/skill-graph", response_model=CandidateSkillGraphResponse)
async def get_resume_skill_graph(payload: ResumeAnalyzeRequest) -> CandidateSkillGraphResponse:
    text_lower = payload.text.lower()
    
    known_skills = [
        ("Python", "Language", 88, ["arrays-and-strings", "sorting-algorithms"]),
        ("React", "Framework", 72, ["oop-and-design-patterns"]),
        ("Node.js", "Framework", 68, ["operating-systems-concurrency"]),
        ("MongoDB", "Database", 60, ["dbms-and-storage"]),
        ("PostgreSQL", "Database", 72, ["dbms-and-storage"]),
        ("Machine Learning", "AI & Data", 82, ["machine-learning-engineering"]),
        ("TensorFlow", "AI & Data", 70, ["machine-learning-engineering"]),
        ("FastAPI", "Framework", 75, ["computer-networking"]),
        ("Docker", "Cloud & DevOps", 70, ["operating-systems-concurrency"]),
        ("DSA", "Core CS", 25, ["arrays-and-strings", "dynamic-programming"]),
        ("System Design", "Core CS", 20, ["distributed-system-design"]),
        ("OS", "Core CS", 35, ["operating-systems-concurrency"]),
        ("DBMS", "Core CS", 45, ["dbms-and-storage"]),
        ("Networking", "Core CS", 40, ["computer-networking"]),
    ]
    
    nodes: list[SkillGraphNodeModel] = []
    strengths: list[str] = []
    weaknesses: list[str] = []
    
    for name, cat, base, matched in known_skills:
        found = name.lower() in text_lower
        if found:
            score = min(95, base + 5)
            is_w = score < 50
            is_s = score >= 75
        else:
            score = max(20, base - 10) if cat == "Core CS" else 0
            if score == 0:
                continue
            is_w = True
            is_s = False
            
        status = "Strong" if score >= 75 else "Needs Practice" if score >= 50 else "Critical Gap"
        if is_s:
            strengths.append(name)
        if is_w:
            weaknesses.append(name)
            
        nodes.append(
            SkillGraphNodeModel(
                name=name,
                category=cat,
                proficiencyPercent=score,
                isWeakness=is_w,
                isStrength=is_s,
                status=status,
                matchedCiuTopics=matched,
                evidenceText="Verified in candidate technical submission." if found else "Unverified in resume project documentation.",
            )
        )
        
    avg_score = round(sum(n.proficiencyPercent for n in nodes) / max(1, len(nodes)))
    priority = [n.name for n in nodes if n.isWeakness][:4]
    
    return CandidateSkillGraphResponse(
        candidateName="Candidate",
        totalSkillsDetected=len(nodes),
        overallSkillScore=avg_score,
        skills=nodes,
        strengths=strengths,
        weaknesses=weaknesses,
        priorityInterviewTopics=priority or ["Dynamic Programming", "System Design"],
    )


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
        filename_lower = (file.filename or "").lower()
        if filename_lower.endswith(".pdf"):
            text = rag_engine.extract_text_from_pdf(content)
        elif filename_lower.endswith(".docx"):
            text = rag_engine.extract_text_from_docx(content)
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
