import json
import re
import time
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from app.models import (
    AnswerStructureAnalysis,
    CandidateProfile,
    ConsistencyConflict,
    DayStudyPlan,
    InterviewerMemory,
    PostInterviewRoadmap,
    Signals,
    SkillGapReport,
    SkillScore,
    StructuralElement,
    StudyPlan,
    TopicCurriculumNode,
)
from app.services.rag_engine import RAGEngine


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
    weak_area: str | None = None
    retrieved_concepts: list[str] = field(default_factory=list)
    depth_score: int = 70
    adaptive_strategy: str = "Standard Progression"
    difficulty: str = "Standard"
    difficulty_trend: str = "maintained"


@dataclass
class StructuredProject:
    title: str
    skills: list[str]
    primary_skill: str
    category: str  # "ml_model" | "system"


@dataclass
class InterviewSession:
    profile: CandidateProfile
    keywords: list[str]
    projects: list[StructuredProject] = field(default_factory=list)
    current_difficulty: str = "Standard"
    memory: InterviewerMemory = field(default_factory=InterviewerMemory)
    started_at: float = field(default_factory=time.time)
    history: list[InterviewTurn] = field(default_factory=list)


def extract_candidate_claims(text: str) -> list[str]:
    claims = []
    # 1. Percentages and performance metrics (e.g. 97.3% accuracy, 99.9% uptime, 95% precision)
    pct_matches = re.finditer(r"(\d+(?:\.\d+)?%\s*(?:accuracy|precision|recall|f1|latency reduction|uptime|improvement|gain|coverage))", text, re.IGNORECASE)
    for m in pct_matches:
        claims.append(m.group(1).strip())

    # 2. Specific metric scores (e.g. 0.94 AUC, 0.92 ROC, F1 of 0.89)
    metric_matches = re.finditer(r"(?:auc|roc|f1|r2|map)\s*(?:of|score|value)?\s*(?:is|=|:)?\s*(0\.\d{2,4})", text, re.IGNORECASE)
    for m in metric_matches:
        claims.append(f"{m.group(0).strip()}")

    # 3. High throughput / scale metrics (e.g. 50k requests/sec, sub-20ms latency)
    scale_matches = re.finditer(r"(\d+(?:k|m|x)?\s*(?:req|requests|events|queries|qps|rps|tps|samples|users|records|rows)\s*(?:/|per)?\s*(?:sec|second|day)?)", text, re.IGNORECASE)
    for m in scale_matches:
        val = m.group(1).strip()
        if len(val) > 4:
            claims.append(val)

    # 4. Technologies and methodologies explicitly claimed
    techs = ["Random Forest", "SHAP", "SMOTE", "XGBoost", "TreeSHAP", "PyTorch", "TensorFlow", "FastAPI", "Next.js", "Kafka", "Docker", "Kubernetes", "Redis", "PostgreSQL"]
    text_lower = text.lower()
    for t in techs:
        if t.lower() in text_lower:
            claims.append(t)

    return list(dict.fromkeys(claims))


def parse_record_count(text: str) -> int | None:
    m = re.search(r"(\d+(?:[.,]\d+)?)\s*(million|m|thousand|k|hundred thousand|crore|lakh)?\s*(?:records|rows|samples|datapoints|data points|examples|instances|events)", text, re.IGNORECASE)
    if not m:
        return None
    num_str = m.group(1).replace(",", "")
    try:
        val = float(num_str)
    except ValueError:
        return None
    mult_str = (m.group(2) or "").lower()
    if mult_str in ["million", "m"]:
        val *= 1_000_000
    elif mult_str in ["thousand", "k"]:
        val *= 1_000
    elif mult_str in ["hundred thousand", "lakh"]:
        val *= 100_000
    elif mult_str == "crore":
        val *= 10_000_000
    return int(val)


def parse_accuracy_claim(text: str) -> float | None:
    m = re.search(r"(\d+(?:\.\d+)?)\s*%\s*(?:accuracy|acc|precision|recall|f1)", text, re.IGNORECASE)
    if m:
        try:
            return float(m.group(1))
        except ValueError:
            return None
    return None


def detect_claim_conflicts(
    session: InterviewSession,
    current_answer: str,
    current_turn_id: int,
) -> list[ConsistencyConflict]:
    conflicts: list[ConsistencyConflict] = []

    # 1. Dataset Scale Conflict Detection (e.g. 20 million vs 200,000 records)
    current_records = parse_record_count(current_answer)
    if current_records is not None and current_records > 0:
        for idx, turn in enumerate(session.history, 1):
            past_records = parse_record_count(turn.answer)
            if past_records is not None and past_records > 0:
                ratio = max(past_records, current_records) / min(past_records, current_records)
                if ratio >= 4.0:
                    conf = ConsistencyConflict(
                        topic="Dataset Scale & Volume",
                        earlier_claim=f"{past_records:,} records",
                        earlier_turn=idx,
                        later_claim=f"{current_records:,} records",
                        later_turn=current_turn_id,
                        confidence=95,
                        explanation=f"Dataset volume changed by {ratio:.0f}x between Turn {idx} ({past_records:,} records) and Turn {current_turn_id} ({current_records:,} records).",
                        probing_followup=f"Earlier you mentioned training on {past_records:,} records, but you just mentioned having around {current_records:,} records. Could you clarify the exact dataset volume and sampling pipeline used?",
                    )
                    conflicts.append(conf)

    # 2. Performance Metric Conflict Detection (e.g. 97.3% vs 82% accuracy)
    current_acc = parse_accuracy_claim(current_answer)
    if current_acc is not None:
        for idx, turn in enumerate(session.history, 1):
            past_acc = parse_accuracy_claim(turn.answer)
            if past_acc is not None and abs(past_acc - current_acc) >= 8.0:
                conf = ConsistencyConflict(
                    topic="Reported Accuracy & Evaluation Split",
                    earlier_claim=f"{past_acc}% accuracy",
                    earlier_turn=idx,
                    later_claim=f"{current_acc}% accuracy",
                    later_turn=current_turn_id,
                    confidence=92,
                    explanation=f"Reported accuracy shifted from {past_acc}% in Turn {idx} to {current_acc}% in Turn {current_turn_id}.",
                    probing_followup=f"Earlier you mentioned achieving {past_acc}% accuracy, and just now noted {current_acc}%. Which validation split or metric does each figure represent?",
                )
                conflicts.append(conf)

    return conflicts


def update_interviewer_memory(
    session: InterviewSession,
    question: str,
    answer: str,
    score: int,
    depth_score: int,
    weak_area: str | None = None,
) -> list[ConsistencyConflict]:
    extracted = extract_candidate_claims(answer)
    for claim in extracted:
        if claim not in session.memory.claims:
            session.memory.claims.append(claim)

    # Detect skills demonstrated
    known_skills = ["Random Forest", "SHAP", "SMOTE", "Stratified K-Fold", "TreeSHAP", "Bagging", "Decision Trees", "Feature Importance", "Kafka", "FastAPI", "PyTorch"]
    for skill in known_skills:
        if skill.lower() in answer.lower() and skill not in session.memory.skills_demonstrated:
            session.memory.skills_demonstrated.append(skill)

    # Track strong vs weak topics
    if weak_area:
        if weak_area not in session.memory.weak_topics:
            session.memory.weak_topics.append(weak_area)
    elif depth_score >= 75:
        topic = "Model Architecture & Tradeoffs"
        if "imbalance" in question.lower():
            topic = "Class Imbalance"
        elif "interpret" in question.lower() or "shap" in question.lower():
            topic = "Model Explainability"
        elif "random forest" in question.lower():
            topic = "Ensemble Learning"
        if topic not in session.memory.strong_topics:
            session.memory.strong_topics.append(topic)

    # Run Claim Consistency Analysis across history
    new_conflicts = detect_claim_conflicts(session, answer, len(session.history) + 1)
    for conflict in new_conflicts:
        session.memory.conflicts.append(conflict)
        session.memory.followups_pending.insert(0, conflict.probing_followup)

    # Generate callback follow-ups from specific claims
    for claim in extracted:
        if "%" in claim and not any("validate" in f.lower() and "%" in f for f in session.memory.followups_pending):
            session.memory.followups_pending.append(
                f"You mentioned achieving {claim} with Random Forest. How did you validate that result against data leakage and overfitting?"
            )
        elif "shap" in claim.lower() and not any("shap" in f.lower() for f in session.memory.followups_pending):
            session.memory.followups_pending.append(
                "Earlier you mentioned using SHAP for interpretability. How did the Shapley values help you detect redundant features or bias in your dataset?"
            )
        elif "smote" in claim.lower() and not any("smote" in f.lower() for f in session.memory.followups_pending):
            session.memory.followups_pending.append(
                "You mentioned applying SMOTE earlier. How did you ensure synthetic samples did not introduce label noise near decision boundaries?"
            )

    return new_conflicts


def compute_dynamic_difficulty(
    current_difficulty: str,
    score: int,
    depth_score: int,
    semantic_relevance: int,
    weak_area: str | None = None,
) -> tuple[str, str, str]:
    """
    Evaluates candidate multimodal performance and adjusts difficulty level dynamically:
    - Warmup (Easy)
    - Standard (Medium)
    - Senior (Hard)
    Returns: (next_difficulty, trend, reason)
    """
    levels = ["Warmup", "Standard", "Senior"]
    curr_idx = levels.index(current_difficulty) if current_difficulty in levels else 1

    perf = (score * 0.4) + (depth_score * 0.4) + (semantic_relevance * 0.2)

    if weak_area or perf < 62:
        if curr_idx > 0:
            next_diff = levels[curr_idx - 1]
            return next_diff, "calibrated_down", f"Calibrated down to {next_diff} to clarify foundational concepts ({weak_area or 'low depth'})."
        return "Warmup", "clarification", "Focusing on core clarifications and practical concepts."

    if perf >= 82 and depth_score >= 80:
        if curr_idx < len(levels) - 1:
            next_diff = levels[curr_idx + 1]
            return next_diff, "escalated", f"Elevated to {next_diff} due to high technical mastery (Accuracy: {depth_score}%, Overall: {score}%)."
        return "Senior", "maintained", "Maintaining Senior difficulty (top-tier architecture and scale tradeoffs)."

    return levels[curr_idx], "maintained", f"Maintaining {levels[curr_idx]} difficulty."


def analyze_answer_structure(
    question: str,
    answer: str,
    domain: str = "Role Specific",
) -> AnswerStructureAnalysis:
    norm_q = question.lower()
    norm_a = answer.lower()
    words = re.findall(r"[a-zA-Z0-9+#.-]+", norm_a)
    word_count = len(words)

    is_behavioral = (
        domain == "Behavioral"
        or any(w in norm_q for w in ["tell me about a time", "describe a", "handled", "conflict", "disagreement", "situation", "stakeholder"])
    )

    if is_behavioral:
        sit_triggers = ["when i was", "in my previous", "at my last", "during my", "we had a project", "in a past role", "the team was working", "we faced", "our system had", "context was", "at my college", "in my project"]
        has_sit = any(t in norm_a for t in sit_triggers) or (word_count >= 15 and bool(re.match(r"^(in|when|during|at|while)\b", answer.strip(), re.I)))

        task_triggers = ["my task was", "my goal was", "i was responsible", "needed to", "had to deliver", "the objective was", "assigned to", "requirement was", "my role was", "the challenge was", "we needed to"]
        has_task = any(t in norm_a for t in task_triggers)

        action_triggers = ["i implemented", "i built", "i designed", "i decided to", "i created", "i developed", "i configured", "i organized", "i led", "i analyzed", "i resolved", "i introduced", "i optimized", "we chose", "i used"]
        has_action = any(t in norm_a for t in action_triggers) or (has_sit and "i " in norm_a and word_count >= 25)

        result_triggers = ["resulted in", "as a result", "improved", "reduced", "achieved", "increased by", "%", "percent", "boosted", "led to", "ultimately", "delivered on time", "saved", "successfully", "impact was"]
        has_result = any(t in norm_a for t in result_triggers)

        elements = [
            StructuralElement(name="Situation", detected=has_sit, explanation="Context, project setting, and problem environment."),
            StructuralElement(name="Task", detected=has_task, explanation="Specific goal, challenge, or responsibility assigned."),
            StructuralElement(name="Action", detected=has_action, explanation="Concrete personal decisions and technical actions taken."),
            StructuralElement(name="Result", detected=has_result, explanation="Measurable outcome, impact, or quantified improvement."),
        ]

        detected_count = sum(1 for e in elements if e.detected)
        structure_score = max(35, min(98, 40 + detected_count * 14 + (6 if word_count >= 30 else 0)))

        if detected_count == 4:
            coaching_feedback = "Strong STAR delivery covering Situation, Task, Action, and quantified Result."
        elif has_sit and has_task and has_action and not has_result:
            coaching_feedback = "Your answer clearly described the situation and action, but didn't quantify the result."
        elif has_sit and has_action and not has_task:
            coaching_feedback = "Good action and context, but clarify the specific objective and task constraints."
        elif not has_sit and (has_action or has_result):
            coaching_feedback = "Action was described, but set the initial situation and problem context first."
        else:
            coaching_feedback = "Follow the STAR method (Situation, Task, Action, Result) to structure your behavioral response."

        return AnswerStructureAnalysis(
            framework="STAR",
            elements=elements,
            structure_score=structure_score,
            coaching_feedback=coaching_feedback,
        )

    # Technical 5-Point Framework
    intro_triggers = ["is a", "refers to", "designed to", "primary purpose", "fundamentally", "serves as", "concept of", "problem of", "stands for", "technique for"]
    has_intro = any(t in norm_a for t in intro_triggers) or word_count >= 10

    exp_triggers = ["because", "works by", "by using", "leverages", "processes", "splits", "calculates", "optimizes", "under the hood", "mechanism", "algorithm", "architecture"]
    has_exp = any(t in norm_a for t in exp_triggers) or word_count >= 25

    ex_triggers = ["for example", "such as", "for instance", "in case of", "like in", "using random forest", "in python", "in pytorch", "with kafka", "in our model", "sample dataset"]
    has_ex = any(t in norm_a for t in ex_triggers)

    ev_triggers = ["tradeoff", "complexity", "o(n)", "latency", "overhead", "compared to", "downside", "limitation", "versus", "bias", "variance", "bottleneck", "scale", "memory"]
    has_ev = any(t in norm_a for t in ev_triggers)

    conc_triggers = ["therefore", "in summary", "ultimately", "which ensures", "to summarize", "in production", "key takeaway", "overall", "hence"]
    has_conc = any(t in norm_a for t in conc_triggers)

    elements = [
        StructuralElement(name="Introduction", detected=has_intro, explanation="Definition of core concept and problem setting."),
        StructuralElement(name="Explanation", detected=has_exp, explanation="Underlying algorithmic or architectural mechanism."),
        StructuralElement(name="Example", detected=has_ex, explanation="Concrete production scenario or tool application."),
        StructuralElement(name="Evidence / Tradeoff", detected=has_ev, explanation="Computational complexity, overhead, and architectural tradeoffs."),
        StructuralElement(name="Conclusion", detected=has_conc, explanation="Takeaway, recommendation, or production guideline."),
    ]

    detected_count = sum(1 for e in elements if e.detected)
    structure_score = max(40, min(98, 45 + detected_count * 11 + (6 if word_count >= 30 else 0)))

    if detected_count >= 4:
        coaching_feedback = "Comprehensive 5-point technical delivery covering definition, mechanism, example, tradeoffs, and conclusion."
    elif not has_ex and has_exp:
        coaching_feedback = "Solid theoretical explanation, but include a concrete production example or use case to demonstrate practical mastery."
    elif not has_ev and has_exp:
        coaching_feedback = "Good mechanism walkthrough, but discuss architectural tradeoffs and performance limitations."
    elif not has_conc and has_exp:
        coaching_feedback = "Clear explanation, but close with a crisp concluding takeaway or production guideline."
    else:
        coaching_feedback = "Structure your answer: Introduction → Mechanism → Example → Tradeoffs → Conclusion."

    return AnswerStructureAnalysis(
        framework="TECHNICAL_FIVE_POINT",
        elements=elements,
        structure_score=structure_score,
        coaching_feedback=coaching_feedback,
    )


def generate_skill_gap_report(session: InterviewSession) -> SkillGapReport:
    dept = (session.profile.department or "Technical").strip()
    role_lower = session.profile.target_role.lower()

    if not session.profile.department:
        if any(k in role_lower for k in ["financ", "account", "tax", "budget", "audit", "fp&a", "payroll"]):
            dept = "Finance"
        elif any(k in role_lower for k in ["hr", "talent", "recruit", "people", "onboarding", "compensation"]):
            dept = "HR"
        elif any(k in role_lower for k in ["market", "brand", "seo", "campaign", "growth", "social media"]):
            dept = "Marketing"
        else:
            dept = "Technical"

    history = session.history
    avg_score = (sum(t.score for t in history) // len(history)) if history else 75

    def get_level(s: int) -> str:
        if s >= 85:
            return "Advanced"
        if s >= 70:
            return "Proficient"
        if s >= 55:
            return "Needs Improvement"
        return "Critical Gap"

    if dept == "Finance":
        scores = {
            "Financial Modeling & Valuation": 75,
            "Financial Statement Analysis": 78,
            "Variance & FP&A Budgeting": 72,
            "Risk, Debt & Covenants": 65,
            "Commercial & Business Acumen": 80,
            "Executive Communication": 74,
        }
        for t in history:
            text = f"{t.question.lower()} {t.answer.lower()}"
            acc = t.depth_score or t.score
            if any(k in text for k in ["dcf", "valuation", "wacc", "discount rate", "terminal value", "fcf"]):
                scores["Financial Modeling & Valuation"] = min(scores["Financial Modeling & Valuation"], acc) if (t.weak_area or acc < 70) else max(scores["Financial Modeling & Valuation"], acc)
            if any(k in text for k in ["balance sheet", "cash flow", "income statement", "reconciliation", "working capital"]):
                scores["Financial Statement Analysis"] = min(scores["Financial Statement Analysis"], acc) if (t.weak_area or acc < 70) else max(scores["Financial Statement Analysis"], acc)
            if any(k in text for k in ["variance", "budget", "ebitda", "margin", "forecast"]):
                scores["Variance & FP&A Budgeting"] = min(scores["Variance & FP&A Budgeting"], acc) if (t.weak_area or acc < 70) else max(scores["Variance & FP&A Budgeting"], acc)
            if any(k in text for k in ["covenant", "debt", "liquidity", "leverage", "headroom"]):
                scores["Risk, Debt & Covenants"] = min(scores["Risk, Debt & Covenants"], acc) if (t.weak_area or acc < 70) else max(scores["Risk, Debt & Covenants"], acc)

        skills = [
            SkillScore(name=k, score=max(30, min(98, v)), level=get_level(max(30, min(98, v))), category="Finance & Valuation")
            for k, v in scores.items()
        ]
        lowest_skill = min(skills, key=lambda s: s.score)
        highest_priority_area = lowest_skill.name
        curriculum_tree = [
            TopicCurriculumNode(
                name="Three-Statement Financial Modeling & Working Capital",
                description="Integrated dynamic modeling linking income statement, balance sheet, and cash flow statement.",
                difficulty="Foundational",
                key_topics=["Accrual Adjustments", "Working Capital Dynamics", "Cash Conversion Cycle", "CapEx Schedules"],
                estimated_study_hours=4,
            ),
            TopicCurriculumNode(
                name="DCF Valuation & WACC Sensitivity Analysis",
                description="Unlevered free cash flow forecasting, Gordon Growth, exit multiples, and cost of capital calibration.",
                difficulty="Intermediate",
                key_topics=["Unlevered FCF", "WACC Cost of Capital", "Terminal Value Calculations", "Sensitivity Tables"],
                estimated_study_hours=6,
            ),
            TopicCurriculumNode(
                name="Debt Covenants, Leverage & Downside Stress Testing",
                description="Debt service coverage ratios (DSCR), interest coverage, leverage constraints, and recessionary headroom.",
                difficulty="Advanced",
                key_topics=["DSCR & Interest Coverage", "Debt-to-EBITDA Headroom", "Downside Sensitivity Modeling", "Capital Structure"],
                estimated_study_hours=8,
            ),
        ]
        actionable_steps = [
            "Build dynamic 3-statement models linking cash flow reconciliation to balance sheet working capital accounts.",
            "Review corporate valuation DCF models with two-variable sensitivity tables for WACC and terminal growth rates.",
            "Practice articulating gross margin variance bridges and covenant compliance under revenue contraction scenarios.",
        ]
        retrieved_sources = [
            "chroma://finance_knowledge/dcf_valuation_mechanics",
            "chroma://finance_knowledge/three_statement_integration_rubrics",
            "chroma://finance_knowledge/debt_covenants_and_capital_structure",
        ]
    elif dept == "HR":
        scores = {
            "Talent Acquisition & Hiring": 78,
            "Employee Relations & Compliance": 74,
            "Retention & Engagement Analytics": 68,
            "Performance Management": 72,
            "Workforce Planning & Headcount": 70,
            "Stakeholder Empathy & Mediation": 80,
        }
        for t in history:
            text = f"{t.question.lower()} {t.answer.lower()}"
            acc = t.depth_score or t.score
            if any(k in text for k in ["retention", "attrition", "turnover", "engagement", "enps", "exit interview"]):
                scores["Retention & Engagement Analytics"] = min(scores["Retention & Engagement Analytics"], acc) if (t.weak_area or acc < 70) else max(scores["Retention & Engagement Analytics"], acc)
            if any(k in text for k in ["performance", "pip", "feedback", "goal", "kpi"]):
                scores["Performance Management"] = min(scores["Performance Management"], acc) if (t.weak_area or acc < 70) else max(scores["Performance Management"], acc)
            if any(k in text for k in ["hiring", "sourcing", "structured interview", "rubric", "candidate"]):
                scores["Talent Acquisition & Hiring"] = min(scores["Talent Acquisition & Hiring"], acc) if (t.weak_area or acc < 70) else max(scores["Talent Acquisition & Hiring"], acc)
            if any(k in text for k in ["compliance", "investigation", "labor law", "eeo", "harassment"]):
                scores["Employee Relations & Compliance"] = min(scores["Employee Relations & Compliance"], acc) if (t.weak_area or acc < 70) else max(scores["Employee Relations & Compliance"], acc)

        skills = [
            SkillScore(name=k, score=max(30, min(98, v)), level=get_level(max(30, min(98, v))), category="Human Resources & People")
            for k, v in scores.items()
        ]
        lowest_skill = min(skills, key=lambda s: s.score)
        highest_priority_area = lowest_skill.name
        curriculum_tree = [
            TopicCurriculumNode(
                name="Employee Retention Diagnostics & Cohort Attrition",
                description="Diagnosing voluntary vs involuntary turnover, exit interview data synthesis, and pulse surveys.",
                difficulty="Foundational",
                key_topics=["Attrition Cohort Curves", "eNPS & Pulse Surveys", "Stay Interviews", "Retention Interventions"],
                estimated_study_hours=4,
            ),
            TopicCurriculumNode(
                name="Performance Management & Progressive Discipline",
                description="Objective KPI setting, coaching frameworks, performance improvement plans, and legal compliance.",
                difficulty="Intermediate",
                key_topics=["SMART Milestone Architecture", "Constructive Feedback Delivery", "Defensible Documentation", "PIPs"],
                estimated_study_hours=6,
            ),
            TopicCurriculumNode(
                name="Strategic Workforce Planning & Succession Modeling",
                description="Headcount forecasting, talent capability gap analysis, and executive leadership succession planning.",
                difficulty="Advanced",
                key_topics=["Headcount Capacity Models", "Competency Mapping", "Nine-Box Grid Calibration", "Succession Pipelines"],
                estimated_study_hours=8,
            ),
        ]
        actionable_steps = [
            "Structure root-cause attrition diagnostic models categorizing compensation, management, and growth bottlenecks.",
            "Design objective 60-day Performance Improvement Plans with measurable weekly milestones and documentation safeguards.",
            "Practice conducting structured competency-based behavioral interviews with standardized scoring rubrics.",
        ]
        retrieved_sources = [
            "chroma://hr_knowledge/employee_retention_and_attrition_analytics",
            "chroma://hr_knowledge/performance_management_and_pip_governance",
            "chroma://hr_knowledge/workforce_planning_and_talent_strategy",
        ]
    elif dept == "Marketing":
        scores = {
            "Performance Marketing & Paid Media": 76,
            "Attribution & Funnel Analytics": 68,
            "Conversion Rate Optimization (CRO)": 72,
            "Brand & Content Positioning": 78,
            "Retention & Lifecycle Marketing": 70,
            "Marketing Experimentation & A/B Testing": 74,
        }
        for t in history:
            text = f"{t.question.lower()} {t.answer.lower()}"
            acc = t.depth_score or t.score
            if any(k in text for k in ["roas", "cac", "paid search", "cpc", "paid social", "ad spend"]):
                scores["Performance Marketing & Paid Media"] = min(scores["Performance Marketing & Paid Media"], acc) if (t.weak_area or acc < 70) else max(scores["Performance Marketing & Paid Media"], acc)
            if any(k in text for k in ["attribution", "multi-touch", "mmm", "incrementality", "channel contribution"]):
                scores["Attribution & Funnel Analytics"] = min(scores["Attribution & Funnel Analytics"], acc) if (t.weak_area or acc < 70) else max(scores["Attribution & Funnel Analytics"], acc)
            if any(k in text for k in ["conversion rate", "cro", "landing page", "funnel drop-off", "bounce rate"]):
                scores["Conversion Rate Optimization (CRO)"] = min(scores["Conversion Rate Optimization (CRO)"], acc) if (t.weak_area or acc < 70) else max(scores["Conversion Rate Optimization (CRO)"], acc)
            if any(k in text for k in ["retention", "churn", "lifecycle", "ltv", "email drip"]):
                scores["Retention & Lifecycle Marketing"] = min(scores["Retention & Lifecycle Marketing"], acc) if (t.weak_area or acc < 70) else max(scores["Retention & Lifecycle Marketing"], acc)

        skills = [
            SkillScore(name=k, score=max(30, min(98, v)), level=get_level(max(30, min(98, v))), category="Growth & Marketing")
            for k, v in scores.items()
        ]
        lowest_skill = min(skills, key=lambda s: s.score)
        highest_priority_area = lowest_skill.name
        curriculum_tree = [
            TopicCurriculumNode(
                name="Marketing Funnel Economics & CAC Payback Analysis",
                description="Unit economics modeling, blended vs paid CAC, LTV:CAC ratios, and payback period optimization.",
                difficulty="Foundational",
                key_topics=["CAC Payback Curves", "LTV:CAC Thresholds", "Blended vs Paid Efficiency", "Channel Margins"],
                estimated_study_hours=4,
            ),
            TopicCurriculumNode(
                name="Multi-Touch Attribution & Incrementality Testing",
                description="First-touch, last-touch, linear, algorithmic attribution, and geo-lift incrementality experimentation.",
                difficulty="Intermediate",
                key_topics=["Attribution Windows", "Media Mix Modeling (MMM)", "Geo-Lift Experiments", "Walled Garden Reconciliation"],
                estimated_study_hours=6,
            ),
            TopicCurriculumNode(
                name="Rigorous A/B Testing & Statistical Conversion Optimization",
                description="Sample size power calculations, hypothesis testing, minimum detectable effect (MDE), and funnel CRO.",
                difficulty="Advanced",
                key_topics=["Statistical Power & Significance", "MDE Calibration", "Multi-Armed Bandits", "Guardrail Metrics"],
                estimated_study_hours=8,
            ),
        ]
        actionable_steps = [
            "Build CAC payback period calculation sheets comparing paid search and paid social efficiency curves.",
            "Establish incrementality testing frameworks utilizing matched-market geo-testing to audit ad-platform ROAS claims.",
            "Formulate lifecycle re-engagement sequences segmenting dormant users by product usage triggers and churn risk.",
        ]
        retrieved_sources = [
            "chroma://marketing_knowledge/performance_marketing_roas_and_cac",
            "chroma://marketing_knowledge/multi_touch_attribution_and_incrementality",
            "chroma://marketing_knowledge/ab_testing_cro_experimentation",
        ]
    else:
        # Technical
        python_score = 92
        ml_score = 87
        sql_score = 72
        rag_score = 51
        system_design_score = 43
        comm_score = 70

        if history:
            for t in history:
                text = f"{t.question.lower()} {t.answer.lower()}"
                acc = t.depth_score or t.score

                if any(k in text for k in ["system design", "concurrency", "throughput", "scale", "kafka", "streaming", "tradeoff", "partition"]):
                    if t.weak_area or acc < 70:
                        system_design_score = min(system_design_score, acc - 15)
                    else:
                        system_design_score = max(system_design_score, acc)

                if any(k in text for k in ["rag", "retrieval", "embedding", "chroma", "vector", "chunk"]):
                    if t.weak_area or acc < 70:
                        rag_score = min(rag_score, acc - 10)
                    else:
                        rag_score = max(rag_score, acc)

                if any(k in text for k in ["random forest", "decision tree", "shap", "imbalance", "smote", "model", "classification"]):
                    if t.weak_area or acc < 70:
                        ml_score = min(ml_score, acc)
                    else:
                        ml_score = max(ml_score, acc)

                if any(k in text for k in ["python", "gil", "multiprocessing", "asyncio", "threading", "decorator"]):
                    if t.weak_area or acc < 70:
                        python_score = min(python_score, acc)
                    else:
                        python_score = max(python_score, acc)

                if any(k in text for k in ["sql", "database", "query", "join", "index", "schema"]):
                    if t.weak_area or acc < 70:
                        sql_score = min(sql_score, acc)
                    else:
                        sql_score = max(sql_score, acc)

        python_score = max(30, min(98, python_score))
        ml_score = max(30, min(98, ml_score))
        sql_score = max(30, min(98, sql_score))
        rag_score = max(30, min(98, rag_score))
        system_design_score = max(30, min(98, system_design_score))
        comm_score = max(30, min(98, comm_score))

        skills = [
            SkillScore(name="Python", score=python_score, level=get_level(python_score), category="Programming"),
            SkillScore(name="Machine Learning", score=ml_score, level=get_level(ml_score), category="AI & Algorithms"),
            SkillScore(name="SQL & Data", score=sql_score, level=get_level(sql_score), category="Data Engineering"),
            SkillScore(name="RAG & Vector Retrieval", score=rag_score, level=get_level(rag_score), category="Generative AI"),
            SkillScore(name="System Design", score=system_design_score, level=get_level(system_design_score), category="Architecture"),
            SkillScore(name="Communication", score=comm_score, level=get_level(comm_score), category="Non-Verbal & Delivery"),
        ]

        lowest_skill = min(skills, key=lambda s: s.score)
        highest_priority_area = lowest_skill.name

        if highest_priority_area == "System Design" or lowest_skill.score <= 55:
            curriculum_tree = [
                TopicCurriculumNode(
                    name="REST APIs & Protocol Architecture",
                    description="API idempotency, HTTP status semantics, gRPC vs REST, and contract serialization.",
                    difficulty="Foundational",
                    key_topics=["Idempotency Keys", "HTTP Status 429/503", "gRPC Protobuf vs JSON", "Rate Limiting"],
                    estimated_study_hours=4,
                ),
                TopicCurriculumNode(
                    name="Caching & In-Memory Stores",
                    description="Redis caching patterns, cache-aside, write-through, and LRU/LFU eviction algorithms.",
                    difficulty="Intermediate",
                    key_topics=["Cache-Aside Pattern", "Cache Stampede Mitigation", "Redis Eviction Policies", "TTL Strategies"],
                    estimated_study_hours=6,
                ),
                TopicCurriculumNode(
                    name="Databases & Horizontal Sharding",
                    description="Relational vs NoSQL trade-offs, B-Tree index optimization, sharding keys, and replication lag.",
                    difficulty="Intermediate",
                    key_topics=["B-Tree vs LSM Trees", "Horizontal Sharding Keys", "Read Replicas", "ACID vs BASE"],
                    estimated_study_hours=8,
                ),
                TopicCurriculumNode(
                    name="Scalability & Load Balancing",
                    description="Stateless compute scaling, reverse proxies (Nginx/Envoy), token bucket, and circuit breakers.",
                    difficulty="Advanced",
                    key_topics=["Consistent Hashing", "Token Bucket Algorithm", "Circuit Breakers (Resilience4j)", "Health Probes"],
                    estimated_study_hours=6,
                ),
                TopicCurriculumNode(
                    name="Message Queues & Event Streaming",
                    description="Apache Kafka partition scalability, consumer group offset commits, and backpressure management.",
                    difficulty="Advanced",
                    key_topics=["Kafka Partition Strategy", "Consumer Offset Lag", "At-Least-Once Delivery", "Dead Letter Queues"],
                    estimated_study_hours=8,
                ),
                TopicCurriculumNode(
                    name="Distributed Systems & Consensus",
                    description="CAP theorem tradeoffs, PACELC, distributed locks (Redlock), and zero-downtime deployment.",
                    difficulty="Advanced",
                    key_topics=["CAP / PACELC Theorems", "Distributed Locking", "Two-Phase Commit (2PC)", "Canary Deployments"],
                    estimated_study_hours=10,
                ),
            ]
            actionable_steps = [
                "Review the ChromaDB System Design Knowledge Collection for Kafka partition sizing and Redis caching rubrics.",
                "Design an end-to-end distributed URL shortener or rate limiter handling 50k requests/second.",
                "Practice articulating trade-offs out loud: compute time vs memory overhead and availability vs consistency.",
            ]
            retrieved_sources = [
                "chroma://technical_knowledge/system_design_scalability_rubric",
                "chroma://technical_knowledge/distributed_caching_redis_patterns",
                "chroma://technical_knowledge/kafka_partitioning_streaming_slas",
                "chroma://interview_knowledge/system_design_faang_questions",
            ]
        else:
            curriculum_tree = [
                TopicCurriculumNode(
                    name="Semantic Chunking & Boundary Preservation",
                    description="Optimizing chunk sizes (256–1024 tokens) and overlap to avoid splitting named entities.",
                    difficulty="Foundational",
                    key_topics=["Sentence Boundary Splitters", "Context Overlap", "Metadata Injection"],
                    estimated_study_hours=4,
                ),
                TopicCurriculumNode(
                    name="Dense Embeddings & Metric Spaces",
                    description="Sentence-transformers, cosine similarity vs dot product, and vector normalization.",
                    difficulty="Intermediate",
                    key_topics=["Normalized Cosine Distance", "Embedding Dimensionality", "Multilingual Embeddings"],
                    estimated_study_hours=5,
                ),
            ]
            actionable_steps = [
                "Benchmark retrieval accuracy on your sample resumes with 256 vs 512 token chunk sizes.",
                "Implement a cross-encoder reranker on top of ChromaDB query results.",
            ]
            retrieved_sources = [
                "chroma://technical_knowledge/rag_chunking_retrieval_rubrics",
                "chroma://technical_knowledge/vector_databases_chroma_hnsw",
            ]

    study_plan = StudyPlan(
        priority_skill=highest_priority_area,
        priority_reason=f"Lowest mastery score ({lowest_skill.score}/100) identified during evaluation.",
        curriculum_tree=curriculum_tree,
        actionable_steps=actionable_steps,
        retrieved_rag_sources=retrieved_sources,
    )

    return SkillGapReport(
        skills=skills,
        highest_priority_area=highest_priority_area,
        summary_statement=f"Your highest-priority improvement area for {session.profile.target_role} is {highest_priority_area}.",
        study_plan=study_plan,
    )


def generate_7day_roadmap(session: InterviewSession) -> PostInterviewRoadmap:
    dept = (session.profile.department or "Technical").strip()
    role_lower = session.profile.target_role.lower()

    if not session.profile.department:
        if any(k in role_lower for k in ["financ", "account", "tax", "budget", "audit", "fp&a", "payroll"]):
            dept = "Finance"
        elif any(k in role_lower for k in ["hr", "talent", "recruit", "people", "onboarding", "compensation"]):
            dept = "HR"
        elif any(k in role_lower for k in ["market", "brand", "seo", "campaign", "growth", "social media"]):
            dept = "Marketing"
        else:
            dept = "Technical"

    weak_areas = [t.weak_area for t in session.history if t.weak_area]

    if dept == "Finance":
        days = [
            DayStudyPlan(
                day=1,
                topic="DCF & Valuation Modeling",
                focus_area="Unlevered free cash flow forecasting, terminal growth calibration, and WACC cost of equity/debt estimation.",
                estimated_hours=3,
                intensity=90,
                practice_challenge="Construct a 5-year DCF model with Gordon Growth and exit multiple sensitivities for an enterprise valuation.",
                retrieved_concepts=["Unlevered FCF", "WACC Weighting", "Terminal Growth Rate", "Enterprise vs Equity Value"],
            ),
            DayStudyPlan(
                day=2,
                topic="Three-Statement Synthesis",
                focus_area="Integrated financial modeling linking income statement, balance sheet, and cash flow statement dynamically.",
                estimated_hours=3,
                intensity=85,
                practice_challenge="Model the balance sheet impact of a $10M debt issuance used for capital expenditures and working capital.",
                retrieved_concepts=["Accrual Accounting", "Depreciation Schedules", "Cash Conversion Cycle", "Working Capital"],
            ),
            DayStudyPlan(
                day=3,
                topic="Variance & Margin Analysis",
                focus_area="Decomposing revenue shortfalls and cost spikes across products, geography, and fixed vs variable costs.",
                estimated_hours=2,
                intensity=80,
                practice_challenge="Build a variance bridge explaining a 6% gross margin miss to executive leadership.",
                retrieved_concepts=["Variance Analysis", "Contribution Margin", "Price-Volume-Mix", "EBITDA Bridge"],
            ),
            DayStudyPlan(
                day=4,
                topic="Liquidity & Working Capital",
                focus_area="Cash conversion cycle optimization, DSO/DPO/DIO analysis, and short-term liquidity management.",
                estimated_hours=2,
                intensity=75,
                practice_challenge="Analyze a company with growing bookings but negative operating cash flow and recommend treasury actions.",
                retrieved_concepts=["DSO & DPO", "Current Ratio", "Operating Cash Flow", "Working Capital Optimization"],
            ),
            DayStudyPlan(
                day=5,
                topic="Debt Covenants & Stress Testing",
                focus_area="Interest coverage ratios, debt service coverage (DSCR), leverage covenants, and recessionary headroom testing.",
                estimated_hours=3,
                intensity=90,
                practice_challenge="Run a stress test simulation modeling debt covenant compliance under an 8% revenue contraction.",
                retrieved_concepts=["Interest Coverage", "Debt-to-EBITDA", "Covenant Headroom", "Scenario Modeling"],
            ),
            DayStudyPlan(
                day=6,
                topic="Executive Communication",
                focus_area="Translating complex financial modeling and risk analyses into crisp executive takeaways for non-financial stakeholders.",
                estimated_hours=2,
                intensity=75,
                practice_challenge="Prepare and deliver a 3-minute executive briefing on capital allocation tradeoffs.",
                retrieved_concepts=["Executive Briefing", "Data Visualization", "Risk Synthesis", "Strategic Storytelling"],
            ),
            DayStudyPlan(
                day=7,
                topic="Comprehensive Finance Simulation",
                focus_area="Full 6-question comprehensive financial analysis and commercial strategy assessment.",
                estimated_hours=2,
                intensity=95,
                practice_challenge="Complete a live financial analyst simulation demonstrating robust quantitative precision.",
                retrieved_concepts=["Multi-Statement Analysis", "Valuation Defense", "Capital Allocation", "Commercial Judgment"],
            ),
        ]
    elif dept == "HR":
        days = [
            DayStudyPlan(
                day=1,
                topic="Retention & Attrition Diagnostics",
                focus_area="Cohort turnover analysis, exit interview trend identification, employee engagement pulse metrics, and retention strategies.",
                estimated_hours=3,
                intensity=90,
                practice_challenge="Design a diagnostic framework to uncover root causes of 20% annualized engineer turnover.",
                retrieved_concepts=["Attrition Cohorts", "eNPS Drivers", "Stay Interviews", "Retention Interventions"],
            ),
            DayStudyPlan(
                day=2,
                topic="Structured Interviewing & Hiring Rubrics",
                focus_area="Competency-based rubric design, structured behavioral interview sequences, and bias mitigation protocols.",
                estimated_hours=2,
                intensity=80,
                practice_challenge="Create a standardized behavioral scoring rubric for senior cross-functional hires.",
                retrieved_concepts=["Competency Rubrics", "STAR Interview Scoring", "Adverse Impact Mitigation", "Calibration"],
            ),
            DayStudyPlan(
                day=3,
                topic="Performance Management & PIP Governance",
                focus_area="Progressive discipline protocols, SMART milestone definitions, defensible documentation, and coaching plans.",
                estimated_hours=3,
                intensity=85,
                practice_challenge="Draft a legally defensible 60-day Performance Improvement Plan with verifiable milestone check-ins.",
                retrieved_concepts=["Progressive Discipline", "SMART Goals", "Defensible Documentation", "Coaching Frameworks"],
            ),
            DayStudyPlan(
                day=4,
                topic="Workforce Planning & Headcount Modeling",
                focus_area="Translating strategic business plans into headcount forecasts, skills inventory, and talent capacity models.",
                estimated_hours=2,
                intensity=75,
                practice_challenge="Build a 12-month departmental headcount model accounting for projected attrition and ramp times.",
                retrieved_concepts=["Headcount Forecasting", "Skills Matrix", "Ramp Time Calibration", "Succession Planning"],
            ),
            DayStudyPlan(
                day=5,
                topic="Employee Relations & Conflict Resolution",
                focus_area="Workplace investigation standards, mediation techniques, policy compliance, and difficult stakeholder management.",
                estimated_hours=3,
                intensity=90,
                practice_challenge="Role-play mediating a contentious dispute between a team manager and senior contributor.",
                retrieved_concepts=["Conflict Mediation", "Investigation Protocol", "Regulatory Compliance", "Psychological Safety"],
            ),
            DayStudyPlan(
                day=6,
                topic="Total Rewards & Compensation Parity",
                focus_area="Benchmarking compensation bands, internal equity audits, merit matrices, and executive bonus frameworks.",
                estimated_hours=2,
                intensity=75,
                practice_challenge="Conduct an internal pay equity analysis and formulate a remediation plan for out-of-band employees.",
                retrieved_concepts=["Salary Banding", "Internal Equity Audits", "Merit Matrices", "Total Rewards"],
            ),
            DayStudyPlan(
                day=7,
                topic="HR Business Partner Simulation",
                focus_area="Executive leadership consultation, change management orchestration, and organizational restructuring.",
                estimated_hours=2,
                intensity=95,
                practice_challenge="Deliver an organizational restructuring and talent mitigation plan to the executive committee.",
                retrieved_concepts=["Change Management", "Executive Advisory", "Organizational Design", "Talent Governance"],
            ),
        ]
    elif dept == "Marketing":
        days = [
            DayStudyPlan(
                day=1,
                topic="Paid Media & ROAS Optimization",
                focus_area="Channel budget allocation, marginal ROAS thresholds, bid strategies, and paid search/social campaign scaling.",
                estimated_hours=3,
                intensity=90,
                practice_challenge="Reallocate a $150k monthly ad budget across Google, Meta, and LinkedIn based on blended vs marginal ROAS.",
                retrieved_concepts=["Marginal ROAS", "CAC Efficiency", "Bid Strategy Optimization", "Paid Channel Mix"],
            ),
            DayStudyPlan(
                day=2,
                topic="Multi-Touch Attribution Modeling",
                focus_area="First-touch, last-touch, linear, algorithmic attribution, Media Mix Modeling (MMM), and incrementality testing.",
                estimated_hours=3,
                intensity=85,
                practice_challenge="Reconcile divergent conversion counts reported by ad platform pixels versus internal CRM data.",
                retrieved_concepts=["Multi-Touch Attribution", "Media Mix Modeling", "Incrementality Lift", "Attribution Windows"],
            ),
            DayStudyPlan(
                day=3,
                topic="Conversion Rate Optimization (CRO)",
                focus_area="Funnel drop-off analytics, landing page optimization, behavioral heatmaps, and friction reduction.",
                estimated_hours=2,
                intensity=80,
                practice_challenge="Diagnose a 40% signup checkout drop-off and design an unconstrained redesign wireframe test.",
                retrieved_concepts=["Funnel Drop-Off", "Heatmap Analysis", "Form Optimization", "Checkout Usability"],
            ),
            DayStudyPlan(
                day=4,
                topic="A/B Testing & Statistical Rigor",
                focus_area="Sample size calculation, statistical significance, minimum detectable effect (MDE), and multi-armed bandits.",
                estimated_hours=2,
                intensity=85,
                practice_challenge="Calculate required sample size and experiment duration for a 5% target conversion lift at 95% confidence.",
                retrieved_concepts=["Statistical Significance", "Sample Size Power", "MDE Calibration", "Guardrail Metrics"],
            ),
            DayStudyPlan(
                day=5,
                topic="Retention & Lifecycle Marketing",
                focus_area="Cohort retention curves, automated behavioral drip sequences, churn mitigation triggers, and customer LTV.",
                estimated_hours=3,
                intensity=80,
                practice_challenge="Build a 4-touch re-engagement workflow targeting users inactive for 30 days to maximize resurrected LTV.",
                retrieved_concepts=["Cohort Retention", "Lifecycle Segmentation", "Churn Mitigation", "LTV Expansion"],
            ),
            DayStudyPlan(
                day=6,
                topic="Brand Positioning & Messaging",
                focus_area="Value proposition articulation, competitive differentiation, audience persona segmentation, and organic growth loops.",
                estimated_hours=2,
                intensity=75,
                practice_challenge="Craft a distinct value proposition and messaging hierarchy against 2 dominant market competitors.",
                retrieved_concepts=["Value Proposition", "Brand Architecture", "Competitive Moats", "Persona Segmentation"],
            ),
            DayStudyPlan(
                day=7,
                topic="Growth Strategy Pitch Simulation",
                focus_area="Comprehensive go-to-market strategy, marketing budget defense, and full-funnel KPI presentation.",
                estimated_hours=2,
                intensity=95,
                practice_challenge="Present a comprehensive quarterly go-to-market plan with projected CAC, payback, and ARR contributions.",
                retrieved_concepts=["Full-Funnel GTM", "CAC Payback Defensibility", "Growth Loops", "Executive Marketing Strategy"],
            ),
        ]
    else:
        # Technical
        has_rf = any("random forest" in (w or "").lower() for w in weak_areas)
        has_imbalance = any("imbalance" in (w or "").lower() for w in weak_areas)
        has_shap = any("shap" in (w or "").lower() for w in weak_areas)

        days = [
            DayStudyPlan(
                day=1,
                topic="Core Algorithms & Data Structures",
                focus_area="Ensemble variance reduction, bagging mechanics, bootstrap aggregation, and out-of-bag (OOB) error bounds.",
                estimated_hours=2,
                intensity=90 if has_rf else 85,
                practice_challenge="Implement a 10-tree Random Forest classifier from scratch and benchmark variance reduction over a single deep decision tree.",
                retrieved_concepts=["Bootstrap Aggregation", "Decision Trees", "Feature Subsampling", "OOB Score"],
            ),
            DayStudyPlan(
                day=2,
                topic="Model Evaluation & Validation",
                focus_area="Stratified K-Fold cross validation, class-weighted loss, PR-AUC vs ROC-AUC, and calibration curves.",
                estimated_hours=2,
                intensity=80,
                practice_challenge="Write an evaluation pipeline comparing PR-AUC and Brier score for an imbalanced dataset.",
                retrieved_concepts=["Stratified K-Fold", "PR-AUC vs ROC-AUC", "Brier Score", "Cross-Entropy"],
            ),
            DayStudyPlan(
                day=3,
                topic="Class Imbalance & Sampling",
                focus_area="SMOTE synthetic sampling tradeoffs, decision boundary noise, decision threshold moving, and Focal Loss.",
                estimated_hours=3,
                intensity=95 if has_imbalance else 75,
                practice_challenge="Demonstrate why SMOTE degrades decision boundaries near minority outliers versus cost-sensitive threshold tuning.",
                retrieved_concepts=["SMOTE Limitations", "Decision Threshold Tuning", "Focal Loss", "Cost-Sensitive Matrix"],
            ),
            DayStudyPlan(
                day=4,
                topic="Explainability & Feature Attribution",
                focus_area="TreeSHAP vs KernelSHAP, game-theoretic Shapley value additivity, and local vs global feature attributions.",
                estimated_hours=2,
                intensity=90 if has_shap else 70,
                practice_challenge="Calculate exact Shapley values for a 3-feature cooperative game model and generate summary plots.",
                retrieved_concepts=["TreeSHAP", "Shapley Value Additivity", "Global Feature Importance", "Interaction Values"],
            ),
            DayStudyPlan(
                day=5,
                topic="System Design & Architecture",
                focus_area="Kafka partition scalability, consumer offset management, Redis cache-aside, and circuit breakers.",
                estimated_hours=4,
                intensity=90,
                practice_challenge="Design an end-to-end distributed event processing pipeline handling 50k events/sec with sub-30ms SLA.",
                retrieved_concepts=["Kafka Partition Strategy", "Consumer Offset Lag", "Redis Cache-Aside", "Resilience4j"],
            ),
            DayStudyPlan(
                day=6,
                topic="Mock Interview & Communication",
                focus_area="STAR framework structure, forward eye focus stability, steady pacing (130-150 WPM), and eliminating filler words.",
                estimated_hours=2,
                intensity=80,
                practice_challenge="Record 3 practice responses applying the STAR method and keep filler word count under 2.",
                retrieved_concepts=["STAR Response Method", "Gaze Focus Steadiness", "Cadence Acceleration Control", "Pause Bridging"],
            ),
            DayStudyPlan(
                day=7,
                topic="Final Assessment Simulation",
                focus_area="Full 6-question senior simulation on the AI Interviewer with dynamic difficulty escalation.",
                estimated_hours=2,
                intensity=95,
                practice_challenge="Achieve an overall score >= 85 with Senior difficulty progression across all rounds.",
                retrieved_concepts=["Dynamic Difficulty", "Architectural Tradeoffs", "Interviewer Memory Recall", "End-to-End Delivery"],
            ),
        ]

    return PostInterviewRoadmap(
        title="7-Day Personalized Improvement Roadmap",
        summary=f"Structured curriculum targeting identified gaps in {', '.join(weak_areas[:3]) or f'{dept} Core Competencies'}.",
        target_role=session.profile.target_role,
        days=days,
        total_hours=sum(d.estimated_hours for d in days),
        generated_at=time.strftime("%Y-%m-%dT%H:%M:%SZ"),
    )


class InterviewEngine:
    def __init__(self, rag_engine: RAGEngine | None = None) -> None:
        self.sessions: dict[str, InterviewSession] = {}
        self.rag_engine = rag_engine or RAGEngine()

    def analyze_resume(self, text: str, target_role: str) -> tuple[list[str], str]:
        keywords = extract_keywords(f"{text} {target_role}")
        projects = extract_structured_projects(text)
        if projects:
            proj_summary = ", ".join(p.title for p in projects[:2])
            summary = f"Identified projects: {proj_summary}. Primary signals: {', '.join(keywords[:5])}."
        elif keywords:
            summary = f"Primary signals: {', '.join(keywords[:5])}."
        else:
            summary = "Primary signals will appear after resume text is available."
        return keywords, summary

    def start_session(self, profile: CandidateProfile) -> tuple[str, str, list[str]]:
        keywords, _summary = self.analyze_resume(profile.resume_text, profile.target_role)
        projects = extract_structured_projects(profile.resume_text)
        session_id = str(uuid.uuid4())
        session = InterviewSession(
            profile=profile,
            keywords=keywords,
            projects=projects,
            current_difficulty=profile.difficulty,
        )
        self.sessions[session_id] = session
        question = generate_initial_question(profile, projects, keywords)
        return session_id, question, keywords

    def evaluate_answer(
        self,
        session_id: str,
        question: str,
        answer: str,
        signals: Signals,
    ) -> tuple[int, dict[str, int], dict[str, int], list[str], str | None, bool, str | None, list[str], int, str, str, str, str, InterviewerMemory, list[ConsistencyConflict], AnswerStructureAnalysis, SkillGapReport, PostInterviewRoadmap, str | None]:
        session = self.sessions.get(session_id)
        if session is None:
            raise KeyError(session_id)

        # 1. RAG Diagnostic Evaluation: detect conceptual gaps and retrieve grounding concepts
        weak_area, retrieved_concepts, depth_score, adaptive_strategy = self.rag_engine.diagnose_weak_area(
            question=question,
            answer=answer,
            keywords=session.keywords,
            department=session.profile.department,
        )

        # 2. Answer Structure Analysis (STAR or 5-Point Technical)
        structure_analysis = analyze_answer_structure(
            question=question,
            answer=answer,
            domain=session.profile.domain,
        )

        # 3. Score the answer using multimodal breakdown
        score, signal_scores, breakdown, feedback = score_answer(
            answer=answer,
            question=question,
            keywords=session.keywords,
            signals=signals,
            depth_score=depth_score,
            weak_area=weak_area,
        )

        if structure_analysis.coaching_feedback and structure_analysis.coaching_feedback not in feedback:
            feedback.append(structure_analysis.coaching_feedback)

        # 4. Dynamic Difficulty Engine: Adjust difficulty based on multimodal performance
        next_difficulty, diff_trend, diff_reason = compute_dynamic_difficulty(
            current_difficulty=session.current_difficulty,
            score=score,
            depth_score=depth_score,
            semantic_relevance=breakdown.get("semantic_relevance", 80),
            weak_area=weak_area,
        )
        session.current_difficulty = next_difficulty

        # 5. Update Interviewer Session Memory & Run Claim Consistency Analysis
        new_conflicts = update_interviewer_memory(
            session=session,
            question=question,
            answer=answer,
            score=score,
            depth_score=depth_score,
            weak_area=weak_area,
        )

        for c in new_conflicts:
            feedback.append(
                f"⚠ Possible inconsistency detected in Claim Consistency Analysis: Earlier (Turn {c.earlier_turn}): '{c.earlier_claim}', Later (Turn {c.later_turn}): '{c.later_claim}'. {c.explanation}"
            )

        # 6. Append to session history
        turn = InterviewTurn(
            question=question,
            answer=answer,
            score=score,
            weak_area=weak_area,
            retrieved_concepts=retrieved_concepts,
            depth_score=depth_score,
            adaptive_strategy=adaptive_strategy,
            difficulty=next_difficulty,
            difficulty_trend=diff_trend,
        )
        session.history.append(turn)
        completed = len(session.history) >= 6

        # 7. Generate Skill-Gap Report & Personalized RAG Curriculum
        skill_gap_report = generate_skill_gap_report(session)

        # 8. Generate 7-Day Personalized Improvement Roadmap
        roadmap = generate_7day_roadmap(session)

        # 9. Generate Adaptive Follow-Up Question with Target Difficulty and Memory callbacks
        next_question = None
        rag_context_summary = None
        if not completed:
            next_question, rag_context_summary = generate_adaptive_question(
                session=session,
                turn_index=len(session.history),
                last_turn=turn,
                rag_engine=self.rag_engine,
                target_difficulty=next_difficulty,
            )

        return (
            score,
            signal_scores,
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
            session.memory,
            session.memory.conflicts,
            structure_analysis,
            skill_gap_report,
            roadmap,
            rag_context_summary,
        )


def extract_keywords(text: str) -> list[str]:
    words = re.findall(r"[a-zA-Z0-9+#.-]{4,}", text.lower())
    counts: dict[str, int] = {}
    for word in words:
        if word in STOP_WORDS:
            continue
        counts[word] = counts.get(word, 0) + 1
    return [word for word, _count in sorted(counts.items(), key=lambda item: item[1], reverse=True)[:8]]


def extract_structured_projects(text: str) -> list[StructuredProject]:
    projects: list[StructuredProject] = []
    known_skills = [
        "Random Forest", "SHAP", "Machine Learning", "Deep Learning", "RAG", "LLMs",
        "Python", "PyTorch", "TensorFlow", "FastAPI", "React", "Next.js", "Docker",
        "Kubernetes", "AWS", "GCP", "Scikit-Learn", "XGBoost", "NLP", "Transformers",
        "Redis", "PostgreSQL", "Kafka", "Pandas", "NumPy", "OpenCV", "MediaPipe", "SQL",
    ]

    title_pattern = re.compile(
        r"(?:project[s]?|title)?[:\s-]*([A-Z][a-zA-Z0-9\s-]{3,45}(?:Prediction|Detection|Classification|System|Engine|App|Application|Platform|Dashboard|Pipeline|Service|Bot|Model|API|Analytics))\s*(?:using|with|in)?\s*([^\n.;]*)",
        re.IGNORECASE,
    )

    for match in title_pattern.finditer(text):
        title = match.group(1).strip()
        context = f"{title} {match.group(2) or ''}".lower()
        skills = [s for s in known_skills if s.lower() in context]

        if not any(p.title.lower() == title.lower() for p in projects):
            is_ml = (
                "prediction" in title.lower()
                or "classification" in title.lower()
                or "detection" in title.lower()
                or any(s in ["Random Forest", "SHAP", "Machine Learning", "Deep Learning", "XGBoost", "PyTorch"] for s in skills)
            )
            primary = skills[0] if skills else ("Random Forest" if is_ml else "Python")
            projects.append(
                StructuredProject(
                    title=title,
                    skills=skills,
                    primary_skill=primary,
                    category="ml_model" if is_ml else "system",
                )
            )

    if not projects:
        lower = text.lower()
        for skill in known_skills:
            if skill.lower() in lower:
                is_ml = skill in ["Random Forest", "SHAP", "Machine Learning", "Deep Learning", "XGBoost", "PyTorch"]
                projects.append(
                    StructuredProject(
                        title=f"{skill} Implementation",
                        skills=[skill],
                        primary_skill=skill,
                        category="ml_model" if is_ml else "system",
                    )
                )
                break

    return projects


UNRELATED_TECHNICAL_JARGON = [
    "random forest",
    "decision tree",
    "shap",
    "treeshap",
    "smote",
    "focal loss",
    "vector chunking",
    "rag architecture",
    "rag pipeline",
    "rag system",
    "retrieval-augmented",
    "retrieval augmented",
    "chromadb",
    "cosine similarity",
    "python gil",
    "multiprocessing versus asyncio",
    "kafka",
    "distributed lock",
    "sharding key",
    "b-tree vs lsm",
    "kubernetes",
    "microservices",
    "neural network",
    "pytorch",
    "tensorflow",
    "transformer",
]


def is_project_relevant_to_role(project: StructuredProject, department: str, target_role: str) -> bool:
    if department == "Technical":
        return True

    combined = f"{project.title} {' '.join(project.skills)}".lower()
    dept_lower = department.lower()

    if dept_lower == "finance":
        finance_keywords = [
            "finance", "financial", "dcf", "valuation", "accounting", "balance sheet",
            "revenue", "cash flow", "budget", "pricing", "margin", "tax", "audit",
            "fp&a", "portfolio", "equity", "investment", "treasury", "wacc",
        ]
        return any(k in combined for k in finance_keywords)

    if dept_lower == "hr":
        hr_keywords = [
            "hr", "human resources", "talent", "recruiting", "sourcing", "retention",
            "attrition", "onboarding", "people", "culture", "compensation", "benefits",
            "workforce", "hiring", "payroll", "relations",
        ]
        return any(k in combined for k in hr_keywords)

    if dept_lower == "marketing":
        marketing_keywords = [
            "marketing", "campaign", "seo", "sem", "roas", "cac", "funnel",
            "conversion", "attribution", "social media", "content", "branding",
            "audience", "advertising", "growth", "cro",
        ]
        return any(k in combined for k in marketing_keywords)

    return False


def validate_question_relevance(question: str, department: str, target_role: str) -> bool:
    q_lower = question.lower()
    if department in ["Finance", "HR", "Marketing"]:
        if re.search(r"\b(rag|gil)\b", q_lower):
            return False
        if any(jargon in q_lower for jargon in UNRELATED_TECHNICAL_JARGON):
            return False
    return True


def apply_role_appropriate_difficulty(base: str, department: str, target_role: str, difficulty: str) -> str:
    cleaned = base.strip()
    if difficulty == "Warmup":
        return f"{cleaned} Keep your explanation concise and focused on foundational concepts."
    if difficulty == "Senior":
        if department == "Finance":
            return f"{cleaned} Address macroeconomic sensitivities, capital allocation trade-offs, and executive reporting implications."
        if department == "HR":
            return f"{cleaned} Address workforce impact, compliance risk mitigation, and executive alignment trade-offs."
        if department == "Marketing":
            return f"{cleaned} Address marginal CAC efficiency, attribution trade-offs, and omnichannel scaling thresholds."
        return f"{cleaned} Include high-scale tradeoffs, distributed failure modes, and success metrics."
    return cleaned


def generate_initial_question(
    profile: CandidateProfile,
    projects: list[StructuredProject],
    keywords: list[str],
) -> str:
    department = profile.department
    target_role = profile.target_role
    role_questions = get_questions_for_profile(profile)

    # 1. DSA / System Design restricted strictly to Technical department
    if profile.domain == "DSA" and department == "Technical":
        dsa_q = [q for q in role_questions if "algorithm" in q.lower() or "complexity" in q.lower() or "data structure" in q.lower()]
        if dsa_q:
            return dsa_q[0]

    if profile.domain == "System Design" and department == "Technical":
        sys_q = [q for q in role_questions if "design" in q.lower() or "architecture" in q.lower() or "scale" in q.lower()]
        if sys_q:
            return sys_q[0]

    # 2. Resume project personalization ONLY if project is meaningfully relevant to the target department & role
    relevant_projects = [p for p in projects if is_project_relevant_to_role(p, department, target_role)]
    if relevant_projects:
        p = relevant_projects[0]
        if department == "Finance":
            q = f"In your resume you highlighted {p.title}. How did you structure your financial modeling assumptions and validate the sensitivity of your valuation or forecasts?"
            if validate_question_relevance(q, department, target_role):
                return q
        elif department == "HR":
            q = f"You mentioned {p.title} in your background. How did you align leadership stakeholders and measure employee engagement or retention outcomes?"
            if validate_question_relevance(q, department, target_role):
                return q
        elif department == "Marketing":
            q = f"In your resume you noted {p.title}. How did you establish channel attribution, evaluate customer acquisition costs, and optimize conversion rates?"
            if validate_question_relevance(q, department, target_role):
                return q
        elif department == "Technical":
            title_lower = p.title.lower()
            if any(w in title_lower for w in ["thyroid", "disease", "cancer", "medical", "patient", "clinical", "health"]):
                return (
                    f"You mentioned using {p.primary_skill} in your {p.title.lower()} project. "
                    f"How did you handle class imbalance, and why did you choose {p.primary_skill} over alternative models?"
                )
            if any(w in title_lower for w in ["intrusion", "fraud", "anomaly", "detection", "cyber", "security"]):
                return (
                    f"You mentioned using {p.primary_skill} in your {p.title} project. "
                    f"Given the extreme class imbalance in anomaly traffic, how did you handle skewed data distribution and validate model recall?"
                )
            if any(w in title_lower for w in ["rag", "llm", "chatbot", "gpt", "retrieval", "nlp", "semantic"]):
                return (
                    f"You mentioned developing {p.title} using {p.primary_skill}. "
                    f"How did you structure your vector chunking strategy, and how did you minimize hallucination in retrieved context?"
                )
            if p.category == "ml_model":
                return (
                    f"You mentioned using {p.primary_skill} in your {p.title.lower()} project. "
                    f"How did you handle data preprocessing and class imbalance, and why did you choose {p.primary_skill} over alternative models?"
                )
            return (
                f"You mentioned developing {p.title} using {p.primary_skill}. "
                f"What were the primary architectural tradeoffs you made regarding concurrency, data consistency, and error recovery?"
            )

    # 3. Deterministic Question from Role Database with difficulty calibration
    base_question = role_questions[0] if role_questions else f"What makes you a strong fit for {target_role}?"
    final_q = apply_role_appropriate_difficulty(base_question, department, target_role, profile.difficulty)

    if not validate_question_relevance(final_q, department, target_role):
        final_q = role_questions[0] if role_questions else f"How do you approach your core responsibilities as a {target_role}?"

    return final_q


def generate_adaptive_question(
    session: InterviewSession,
    turn_index: int,
    last_turn: InterviewTurn,
    rag_engine: RAGEngine,
    target_difficulty: str = "Standard",
) -> tuple[str, str]:
    profile = session.profile
    department = profile.department
    target_role = profile.target_role
    projects = session.projects
    role_questions = get_questions_for_profile(profile)

    # Case A: Weak depth detected -> Probe domain-appropriate conceptual gaps
    if last_turn.weak_area:
        summary = f"Retrieved concepts from vector knowledge base ({target_difficulty}): {', '.join(last_turn.retrieved_concepts)}"

        if department == "Finance":
            if "DCF" in last_turn.weak_area or "Valuation" in last_turn.weak_area:
                return (
                    "In your DCF valuation, how did you determine the terminal value growth rate and estimate the cost of equity using CAPM?",
                    summary,
                )
            if "Financial Statement" in last_turn.weak_area or "Three-Statement" in last_turn.weak_area:
                return (
                    "How do changes in working capital and non-cash expenses reconcile operating profit on the income statement with net cash provided by operating activities?",
                    summary,
                )
            if "Variance" in last_turn.weak_area or "Budget" in last_turn.weak_area:
                return (
                    "When a business unit experiences an unexpected margin decline, how do you perform a price-volume-mix variance analysis to isolate the drivers?",
                    summary,
                )
            return (
                f"Can you explain the financial framework and key drivers you would investigate regarding {last_turn.weak_area}?",
                summary,
            )

        if department == "HR":
            if "Retention" in last_turn.weak_area or "Attrition" in last_turn.weak_area:
                return (
                    "When analyzing a spike in turnover within a critical team, how do you distinguish between compensation dissatisfaction, manager friction, and career progression bottlenecks?",
                    summary,
                )
            if "Talent" in last_turn.weak_area or "Sourcing" in last_turn.weak_area:
                return (
                    "How do you design competency-based interview scorecards and calibrate interview panels to eliminate subjective interviewer bias?",
                    summary,
                )
            if "Performance" in last_turn.weak_area or "Relations" in last_turn.weak_area:
                return (
                    "What documentation and objective milestone standards do you enforce to ensure a Performance Improvement Plan (PIP) is fair, measurable, and legally defensible?",
                    summary,
                )
            return (
                f"Can you explain the people strategy and stakeholder alignment you would use when addressing {last_turn.weak_area}?",
                summary,
            )

        if department == "Marketing":
            if "ROAS" in last_turn.weak_area or "Acquisition" in last_turn.weak_area:
                return (
                    "When scaling paid advertising campaigns, how do you detect the point of diminishing marginal ROAS and reallocate budget between discovery and retargeting?",
                    summary,
                )
            if "Attribution" in last_turn.weak_area:
                return (
                    "Why can last-touch attribution mislead budget allocation in multi-channel buyer journeys, and how would you implement an incrementality testing framework?",
                    summary,
                )
            if "Funnel" in last_turn.weak_area or "CRO" in last_turn.weak_area:
                return (
                    "If website traffic increases by 35% but qualified leads drop by 15%, what diagnostic steps would you take to identify where the funnel is breaking down?",
                    summary,
                )
            return (
                f"How do you measure and optimize return on investment and audience engagement for {last_turn.weak_area}?",
                summary,
            )

        if department == "Technical":
            if "Random Forest" in last_turn.weak_area:
                return (
                    "How does Random Forest reduce overfitting compared with a single decision tree?",
                    summary,
                )
            if "Class Imbalance" in last_turn.weak_area:
                return (
                    "In severe class imbalance, why is standard accuracy misleading, and how would you compare SMOTE versus adjusting the classification decision threshold or using Focal Loss?",
                    summary,
                )
            if "Explainability" in last_turn.weak_area or "SHAP" in last_turn.weak_area:
                return (
                    "How does SHAP compute feature attributions based on game-theoretic Shapley values, and how does it provide local versus global interpretability?",
                    summary,
                )
            if "RAG" in last_turn.weak_area:
                return (
                    "How do chunk size and semantic boundary overlap affect retrieval accuracy in RAG, and how do you prevent context degradation?",
                    summary,
                )
            if "GIL" in last_turn.weak_area or "Python" in last_turn.weak_area:
                return (
                    "Why does multi-threading fail to speed up CPU-bound ML tasks in Python, and when should you use multiprocessing versus asyncio?",
                    summary,
                )
            if "Streaming" in last_turn.weak_area or "Kafka" in last_turn.weak_area:
                return (
                    "When designing a real-time ingestion pipeline handling 50k events/sec, how do Kafka partitions and consumer group offsets prevent backpressure bottlenecks?",
                    summary,
                )

            return (
                f"Can you drill down into the core technical mechanism for {last_turn.weak_area}: specifically the algorithmic tradeoffs and edge cases?",
                summary,
            )

    # Case B: Memory Recall & Claim Validation (strictly validated against department)
    if session.memory.followups_pending and turn_index in [2, 3] and not last_turn.weak_area:
        claim_q = session.memory.followups_pending[0]
        if validate_question_relevance(claim_q, department, target_role):
            session.memory.followups_pending.pop(0)
            return claim_q, f"Memory recall of candidate claims: {', '.join(session.memory.claims[:3])}"

    # Case C: Dynamic Difficulty Progression grounded in relevant projects (Technical only)
    relevant_projects = [p for p in projects if is_project_relevant_to_role(p, department, target_role)]
    if department == "Technical" and relevant_projects and profile.domain != "DSA":
        proj = relevant_projects[0]
        if proj.category == "ml_model":
            if target_difficulty == "Senior":
                progression = [
                    f"If you had to deploy {proj.title} into a high-throughput streaming architecture with sub-30ms p99 latency SLAs, what bottlenecks would you anticipate with {proj.primary_skill}, and how would you optimize inference and memory footprint under 50x load?",
                    f"When scaling {proj.title}, how would you detect and mitigate online data drift and concept drift in production? Include automated retraining, shadow deployments, and canary evaluation metrics.",
                    f"For {proj.title}, explain the mathematical mechanics of TreeSHAP vs KernelSHAP, and how you would optimize explainability compute time across millions of scoring requests.",
                    f"Reflecting on {proj.title}, what architectural or algorithmic tradeoff would you design differently today given modern distributed GPU clusters and feature stores?",
                ]
            elif target_difficulty == "Warmup":
                progression = [
                    f"For {proj.title}, what was your step-by-step data preparation process before training {proj.primary_skill}?",
                    f"In simple terms, how did you evaluate the predictions of {proj.title} and verify that the model was learning correctly?",
                    f"Which Python libraries and tools did you rely on most while building {proj.title}?",
                ]
            else:  # Standard
                progression = [
                    f"In your {proj.title} project, how did you handle class imbalance in the dataset, and what validation strategy (e.g. Stratified K-Fold) did you prioritize?",
                    f"For {proj.title}, how did you ensure model decisions were interpretable (e.g. via SHAP values or feature attributions) when communicating results to stakeholders?",
                    f"What was the most challenging failure mode or edge case you encountered while tuning {proj.primary_skill} in {proj.title}, and how did you resolve it?",
                ]
        else:
            if target_difficulty == "Senior":
                progression = [
                    f"If user traffic to {proj.title} scaled by 50x overnight, which database or messaging component would fail first, and how would you re-architect it with sharding, caching, and circuit breakers?",
                    f"In your {proj.title} system, how did you ensure end-to-end idempotency, distributed transactions, and data consistency under network partitions?",
                ]
            elif target_difficulty == "Warmup":
                progression = [
                    f"What were the core features and user workflows in {proj.title}?",
                    f"How did you organize your backend APIs and project structure in {proj.title}?",
                ]
            else:  # Standard
                progression = [
                    f"In your {proj.title} project built with {proj.primary_skill}, how did you handle data integrity, concurrency, and error recovery under high load?",
                    f"How did you structure automated testing, CI/CD, and performance monitoring for {proj.title}?",
                ]

        q_idx = (turn_index - 1) % len(progression)
        question = progression[q_idx]
        return question, f"Dynamic difficulty ({target_difficulty}) progression grounded in {proj.title}"

    # Fallback to role database curriculum calibrated by target difficulty
    base_question = role_questions[turn_index % max(len(role_questions), 1)] if role_questions else (
        f"What makes you a strong fit for {target_role}?"
    )
    final_q = apply_role_appropriate_difficulty(base_question, department, target_role, target_difficulty)
    if not validate_question_relevance(final_q, department, target_role):
        final_q = role_questions[0] if role_questions else f"How do you approach your core responsibilities as a {target_role}?"

    return final_q, f"Standard role curriculum ({target_difficulty})"


def get_questions_for_profile(profile: CandidateProfile) -> list[str]:
    department = get_department(profile.department)
    safe_track = profile.domain if profile.domain in department.get("tracks", []) else department["tracks"][0]
    role = get_role(department, profile.target_role)
    questions = role.get("questions", {}).get(safe_track, [])
    return [*questions, *build_fallback_questions(profile.department, role.get("title", profile.target_role), safe_track)]


def get_department(department_id: str) -> dict:
    departments = ROLE_DATABASE["departments"]
    for d in departments:
        if d["id"].lower() == department_id.lower():
            return d
    for d in departments:
        if department_id.lower() in d["label"].lower():
            return d
    return departments[0]


def get_role(department: dict, target_role: str) -> dict:
    roles = department.get("roles", [])
    if not roles:
        return {"title": target_role, "questions": {}}
    target_clean = target_role.strip().lower()
    for r in roles:
        if r["title"].strip().lower() == target_clean:
            return r
    for r in roles:
        if target_clean in r["title"].lower() or r["title"].lower() in target_clean:
            return r
    return roles[0]


def build_fallback_questions(department_id: str, target_role: str, track: str) -> list[str]:
    department_label = department_id
    if department_id == "Finance":
        return [
            f"How do you approach your core responsibilities and financial controls as a {target_role}?",
            f"Walk me through how you validate data integrity and investigate discrepancies in your financial analysis for {target_role}.",
            f"Which key financial metrics and reporting tools do you prioritize in your day-to-day work as a {target_role}?",
        ]

    if department_id == "HR":
        return [
            f"How do you approach your primary people operations and talent responsibilities as a {target_role}?",
            f"Describe how you manage confidential employee relations issues or organizational changes as a {target_role}.",
            f"What people metrics and policy guidelines do you rely on to measure success in {target_role}?",
        ]

    if department_id == "Marketing":
        return [
            f"How do you plan, execute, and measure high-impact marketing initiatives as a {target_role}?",
            f"Walk me through your process for customer segmentation and conversion funnel optimization in {target_role}.",
            f"How do you balance creative storytelling with data-driven attribution as a {target_role}?",
        ]

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
    depth_score: int = 70,
    weak_area: str | None = None,
) -> tuple[int, dict[str, int], dict[str, int], list[str]]:
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

    technical_accuracy = clamp(depth_score)

    if len(words) < 5:
        semantic_relevance = 35
        answer_structure = 35
    else:
        semantic_relevance = clamp(
            round(
                70
                + relevance_hits * 6
                + min(len(words), 70) * 0.16
                + (len(unique_words) / max(1, len(words))) * 8
            )
        )
        sentence_count = len(re.findall(r"[.!?]+", answer))
        structure_bonus = structure_hits * 5 + (6 if sentence_count >= 2 else 0) + (5 if "example" in normalized else 0)
        answer_structure = clamp(round(70 + structure_bonus + min(len(words), 50) * 0.15))

    eye_contact = clamp(signals.eye_contact)
    voice_energy = clamp(signals.voice_energy)
    speaking_pace = clamp(signals.speaking_pace or signals.voice_pace)
    filler_words = clamp(round(100 - filler_hits * 8)) if signals.filler_words == 90 else clamp(signals.filler_words)

    overall = clamp(
        round(
            0.25 * technical_accuracy
            + 0.25 * semantic_relevance
            + 0.15 * answer_structure
            + 0.10 * eye_contact
            + 0.10 * voice_energy
            + 0.08 * speaking_pace
            + 0.07 * filler_words
        )
    )

    breakdown = {
        "technical_accuracy": technical_accuracy,
        "semantic_relevance": semantic_relevance,
        "answer_structure": answer_structure,
        "eye_contact": eye_contact,
        "voice_energy": voice_energy,
        "speaking_pace": speaking_pace,
        "filler_words": filler_words,
        "overall": overall,
    }

    signal_scores = {
        "clarity": clamp(round(44 + len(words) * 1.4 + len(unique_words) * 0.35 - filler_hits * 7)),
        "relevance": semantic_relevance,
        "structure": answer_structure,
        "confidence": clamp(round(38 + len(words) * 0.7 + voice_energy * 0.25 + eye_contact * 0.16 - filler_hits * 5)),
        "voice": voice_energy,
        "eye_contact": eye_contact,
        "technical_depth": technical_accuracy,
    }
    feedback = build_feedback(signal_scores, len(words), weak_area)

    return overall, signal_scores, breakdown, feedback


def build_feedback(signal_scores: dict[str, int], word_count: int, weak_area: str | None = None) -> list[str]:
    feedback: list[str] = []
    if weak_area:
        feedback.append(f"Weak technical depth detected in {weak_area}. Explain the underlying algorithmic mechanisms and tradeoffs.")
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
        feedback.append("Strong answer with solid technical depth. Add one quantified outcome to make it sharper.")
    return feedback[:3]


def clamp(value: int, minimum: int = 0, maximum: int = 100) -> int:
    return max(minimum, min(maximum, value))
