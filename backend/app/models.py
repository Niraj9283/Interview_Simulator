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
    voice_energy: int = Field(default=60, ge=0, le=100)
    voice_pace: int = Field(default=60, ge=0, le=100)
    voice_steadiness: int = Field(default=60, ge=0, le=100)
    eye_contact: int = Field(default=60, ge=0, le=100)


class EvaluationRequest(BaseModel):
    session_id: str
    question: str
    answer: str = Field(min_length=1, max_length=12000)
    signals: Signals = Field(default_factory=Signals)


class EvaluationResponse(BaseModel):
    score: int
    signals: dict[str, int]
    feedback: list[str]
    next_question: str | None
    completed: bool
