from typing import Literal

from pydantic import BaseModel, Field


DepartmentId = Literal["Technical", "Finance", "HR", "Marketing"]
InterviewDomain = Literal["Role Specific", "DSA", "System Design", "Case Study", "Behavioral"]
InterviewDifficulty = Literal["Warmup", "Standard", "Senior"]


class CandidateProfile(BaseModel):
    name: str = Field(default="Candidate", min_length=1, max_length=120)
    department: DepartmentId = "Technical"
    target_role: str = Field(default="Full Stack AI Engineer", min_length=1, max_length=160)
    domain: InterviewDomain = "Role Specific"
    difficulty: InterviewDifficulty = "Standard"
    resume_text: str = Field(default="", max_length=50000)


class ResumeAnalyzeRequest(BaseModel):
    filename: str = Field(default="resume.txt", max_length=255)
    text: str = Field(default="", max_length=50000)
    target_role: str = Field(default="Software Engineer", max_length=160)


class ResumeAnalyzeResponse(BaseModel):
    keywords: list[str]
    summary: str


class InterviewStartRequest(BaseModel):
    profile: CandidateProfile


class InterviewStartResponse(BaseModel):
    session_id: str
    question: str
    keywords: list[str]


class Signals(BaseModel):
    voice_energy: int = Field(default=75, ge=0, le=100)
    voice_pace: int = Field(default=80, ge=0, le=100)
    speaking_pace: int = Field(default=80, ge=0, le=100)
    voice_steadiness: int = Field(default=75, ge=0, le=100)
    eye_contact: int = Field(default=80, ge=0, le=100)
    filler_words: int = Field(default=90, ge=0, le=100)


class MultimodalBreakdown(BaseModel):
    technical_accuracy: int = 80
    semantic_relevance: int = 85
    answer_structure: int = 78
    eye_contact: int = 80
    voice_energy: int = 75
    speaking_pace: int = 80
    filler_words: int = 90
    overall: int = 80


class ConsistencyConflict(BaseModel):
    topic: str
    earlier_claim: str
    earlier_turn: int
    later_claim: str
    later_turn: int
    confidence: int = 90
    explanation: str
    probing_followup: str


class InterviewerMemory(BaseModel):
    claims: list[str] = Field(default_factory=list)
    skills_demonstrated: list[str] = Field(default_factory=list)
    weak_topics: list[str] = Field(default_factory=list)
    strong_topics: list[str] = Field(default_factory=list)
    followups_pending: list[str] = Field(default_factory=list)
    conflicts: list[ConsistencyConflict] = Field(default_factory=list)


class EvaluationRequest(BaseModel):
    session_id: str
    question: str
    answer: str = Field(min_length=1, max_length=12000)
    signals: Signals = Field(default_factory=Signals)


class StructuralElement(BaseModel):
    name: str
    detected: bool
    snippet: str | None = None
    explanation: str


class AnswerStructureAnalysis(BaseModel):
    framework: Literal["STAR", "TECHNICAL_FIVE_POINT"]
    elements: list[StructuralElement] = Field(default_factory=list)
    structure_score: int = 80
    coaching_feedback: str


class SkillScore(BaseModel):
    name: str
    score: int
    level: str
    category: str


class TopicCurriculumNode(BaseModel):
    name: str
    description: str
    difficulty: str
    key_topics: list[str] = Field(default_factory=list)
    estimated_study_hours: int = 4


class StudyPlan(BaseModel):
    priority_skill: str
    priority_reason: str
    curriculum_tree: list[TopicCurriculumNode] = Field(default_factory=list)
    actionable_steps: list[str] = Field(default_factory=list)
    retrieved_rag_sources: list[str] = Field(default_factory=list)


class SkillGapReport(BaseModel):
    skills: list[SkillScore] = Field(default_factory=list)
    highest_priority_area: str
    summary_statement: str
    study_plan: StudyPlan


class DayStudyPlan(BaseModel):
    day: int
    topic: str
    focus_area: str
    estimated_hours: int = 2
    intensity: int = 80
    practice_challenge: str
    retrieved_concepts: list[str] = Field(default_factory=list)
    completed: bool = False


class PostInterviewRoadmap(BaseModel):
    title: str = "7-Day Personalized Improvement Roadmap"
    summary: str
    target_role: str
    days: list[DayStudyPlan] = Field(default_factory=list)
    total_hours: int = 16
    generated_at: str = ""


class EvaluationResponse(BaseModel):
    score: int
    signals: dict[str, int]
    breakdown: MultimodalBreakdown = Field(default_factory=MultimodalBreakdown)
    feedback: list[str]
    next_question: str | None
    completed: bool
    weak_area: str | None = None
    retrieved_concepts: list[str] = Field(default_factory=list)
    technical_depth_score: int = Field(default=70, ge=0, le=100)
    adaptive_strategy: str = "Standard Progression"
    current_difficulty: InterviewDifficulty = "Standard"
    difficulty_trend: Literal["escalated", "maintained", "calibrated_down", "clarification"] = "maintained"
    difficulty_reason: str = "Standard baseline progression"
    memory: InterviewerMemory = Field(default_factory=InterviewerMemory)
    consistency_conflicts: list[ConsistencyConflict] = Field(default_factory=list)
    structure_analysis: AnswerStructureAnalysis | None = None
    skill_gap_report: SkillGapReport | None = None
    roadmap: PostInterviewRoadmap | None = None
    rag_context_summary: str | None = None





class RAGQueryRequest(BaseModel):
    query: str = Field(min_length=1, max_length=1000)
    collection_name: Literal["candidate_knowledge", "interview_knowledge", "technical_knowledge"]
    n_results: int = Field(default=3, ge=1, le=10)


class RAGQueryResponse(BaseModel):
    collection_name: str
    query: str
    results: list[dict]


class RAGResumeUploadResponse(BaseModel):
    status: str
    chunks_indexed: int
    extracted_skills: list[str]
    extracted_text: str
    summary: str


class RAGStatusResponse(BaseModel):
    status: str
    collections: dict[str, dict]
