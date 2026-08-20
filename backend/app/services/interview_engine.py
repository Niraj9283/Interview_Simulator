import json
import re
import time
import uuid
from dataclasses import dataclass, field
from pathlib import Path

from app.models import CandidateProfile, Signals


STOP_WORDS = {
    "about",
    "experience",
    "from",
    "have",
    "project",
    "skills",
    "that",
    "this",
    "using",
    "with",
    "your",
}

ROLE_DATABASE_PATH = Path(__file__).resolve().parents[3] / "data" / "interview-role-database.json"


def load_role_database() -> dict:
    with ROLE_DATABASE_PATH.open(encoding="utf-8") as database_file:
        return json.load(database_file)


ROLE_DATABASE = load_role_database()


@dataclass
class InterviewTurn:
    question: str
    answer: str
    score: int


@dataclass
class InterviewSession:
    profile: CandidateProfile
    keywords: list[str]
    started_at: float = field(default_factory=time.time)
    history: list[InterviewTurn] = field(default_factory=list)


class InterviewEngine:
    def __init__(self) -> None:
        self.sessions: dict[str, InterviewSession] = {}

    def analyze_resume(self, text: str, target_role: str) -> tuple[list[str], str]:
        keywords = extract_keywords(f"{text} {target_role}")
        if keywords:
            summary = f"Primary signals: {', '.join(keywords[:5])}."
        else:
            summary = "Primary signals will appear after resume text is available."
        return keywords, summary

    def start_session(self, profile: CandidateProfile) -> tuple[str, str, list[str]]:
        keywords, _summary = self.analyze_resume(profile.resume_text, profile.target_role)
        session_id = str(uuid.uuid4())
        session = InterviewSession(profile=profile, keywords=keywords)
        self.sessions[session_id] = session
        question = generate_question(profile, keywords, 0, [])
        return session_id, question, keywords

    def evaluate_answer(
        self,
        session_id: str,
        question: str,
        answer: str,
        signals: Signals,
    ) -> tuple[int, dict[str, int], list[str], str | None, bool]:
        session = self.sessions.get(session_id)
        if session is None:
            raise KeyError(session_id)

        score, signal_scores, feedback = score_answer(answer, question, session.keywords, signals)
        session.history.append(InterviewTurn(question=question, answer=answer, score=score))
        completed = len(session.history) >= 6
        next_question = None if completed else generate_question(
            session.profile,
            session.keywords,
            len(session.history),
            session.history,
        )

        return score, signal_scores, feedback, next_question, completed


def extract_keywords(text: str) -> list[str]:
    words = re.findall(r"[a-zA-Z0-9+#.-]{4,}", text.lower())
    counts: dict[str, int] = {}
    for word in words:
        if word in STOP_WORDS:
            continue
        counts[word] = counts.get(word, 0) + 1
    return [word for word, _count in sorted(counts.items(), key=lambda item: item[1], reverse=True)[:8]]


def generate_question(
    profile: CandidateProfile,
    keywords: list[str],
    turn_index: int,
    history: list[InterviewTurn],
) -> str:
    anchor = keywords[turn_index % max(len(keywords), 1)] if keywords else profile.target_role
    last_score = history[-1].score if history else 100
    questions = get_questions_for_profile(profile)
    base_question = questions[turn_index % max(len(questions), 1)] if questions else (
        f"What makes you a strong fit for {profile.target_role}?"
    )

    if last_score < 68:
        return (
            "Let's improve the previous answer. "
            f"Restate your approach for {anchor} in the {profile.target_role} role "
            "with clearer context, action, and impact."
        )

    if profile.difficulty == "Senior":
        return f"{base_question} Include tradeoffs, risks, and how you would measure success."

    if profile.difficulty == "Warmup":
        return f"{base_question} Keep the answer concise and practical."

    return base_question


def get_questions_for_profile(profile: CandidateProfile) -> list[str]:
    department = get_department(profile.department)
    safe_track = profile.domain if profile.domain in department.get("tracks", []) else department["tracks"][0]
    role = get_role(department, profile.target_role)
    questions = role.get("questions", {}).get(safe_track, [])

    return [*questions, *build_fallback_questions(profile.department, role.get("title", profile.target_role), safe_track)]


def get_department(department_id: str) -> dict:
    departments = ROLE_DATABASE["departments"]
    return next((department for department in departments if department["id"] == department_id), departments[0])


def get_role(department: dict, target_role: str) -> dict:
    roles = department.get("roles", [])
    if not roles:
        return {"title": target_role, "questions": {}}

    return next((role for role in roles if role["title"] == target_role), roles[0])


def build_fallback_questions(department_id: str, target_role: str, track: str) -> list[str]:
    department_label = get_department(department_id)["label"].replace(" Department", "").lower()

    if track == "DSA":
        return [
            f"Solve a {target_role} problem using the most appropriate data structure. Explain complexity and edge cases.",
            f"How would you optimize a slow {target_role} solution if input size grew by 100x?",
            f"Compare brute force and optimized approaches for a {target_role} coding challenge.",
        ]

    if track == "System Design":
        return [
            f"Design a reliable {target_role} workflow with APIs, storage, monitoring, and failure recovery.",
            f"How would you scale a {target_role} system while keeping security and performance stable?",
            f"What tradeoffs would you make when designing data flow for a {target_role} product area?",
        ]

    if track == "Case Study":
        return [
            f"A {department_label} metric is moving in the wrong direction. How would you diagnose the cause and recommend action?",
            f"A stakeholder disagrees with your {target_role} recommendation. How would you use data and communication to resolve it?",
            f"You have limited time and incomplete information for a {department_label} decision. What would you prioritize first?",
        ]

    if track == "Behavioral":
        return [
            f"Tell me about a time you handled ambiguity in a {target_role} responsibility.",
            f"Describe a difficult collaboration you had in a {department_label} context and what changed because of your actions.",
            f"Why are you a strong fit for {target_role}, and what would you improve in your first 90 days?",
        ]

    return [
        f"What are the most important responsibilities of a {target_role}, and how would you approach them?",
        f"Which tools, metrics, and decisions matter most for success in this {department_label} role?",
        f"Describe a recent project or workflow relevant to {target_role} and the impact you created.",
    ]


def score_answer(
    answer: str,
    question: str,
    keywords: list[str],
    signals: Signals,
) -> tuple[int, dict[str, int], list[str]]:
    normalized = answer.lower()
    words = re.findall(r"[a-zA-Z0-9+#.-]+", normalized)
    unique_words = set(words)
    relevance_terms = [term for term in [*keywords, *question.lower().split()] if len(term) > 4][:14]
    relevance_hits = sum(1 for term in relevance_terms if term in normalized)
    structure_hits = sum(
        1
        for marker in ["first", "second", "because", "result", "impact", "tradeoff", "therefore"]
        if marker in normalized
    )
    filler_hits = sum(1 for word in ["um", "uh", "like", "basically", "actually", "maybe"] if word in words)

    clarity = clamp(round(44 + len(words) * 1.4 + len(unique_words) * 0.35 - filler_hits * 7))
    relevance = clamp(round(48 + relevance_hits * 8 + min(len(words), 120) * 0.08))
    structure = clamp(round(40 + structure_hits * 12 + (8 if "example" in normalized else 0)))
    voice = clamp(round((signals.voice_energy + signals.voice_pace + signals.voice_steadiness) / 3))
    confidence = clamp(round(38 + len(words) * 0.7 + voice * 0.25 + signals.eye_contact * 0.16 - filler_hits * 5))
    score = clamp(round(clarity * 0.22 + relevance * 0.28 + structure * 0.2 + confidence * 0.18 + voice * 0.12))
    signal_scores = {
        "clarity": clarity,
        "relevance": relevance,
        "structure": structure,
        "confidence": confidence,
        "voice": voice,
        "eye_contact": signals.eye_contact,
    }
    feedback = build_feedback(signal_scores, len(words))

    return score, signal_scores, feedback


def build_feedback(signal_scores: dict[str, int], word_count: int) -> list[str]:
    feedback: list[str] = []
    if word_count < 45:
        feedback.append("Expand with a concrete example, decision, and result.")
    if signal_scores["structure"] < 70:
        feedback.append("Use a sharper structure: context, action, tradeoff, impact.")
    if signal_scores["relevance"] < 72:
        feedback.append("Tie the answer more directly to the question and role keywords.")
    if signal_scores["voice"] < 68:
        feedback.append("Aim for steadier pacing and fuller sentence endings.")
    if signal_scores["eye_contact"] < 65:
        feedback.append("Raise camera presence with more consistent forward focus.")
    if not feedback:
        feedback.append("Strong answer. Add one quantified outcome to make it sharper.")
    return feedback[:3]


def clamp(value: int, minimum: int = 0, maximum: int = 100) -> int:
    return max(minimum, min(maximum, value))
