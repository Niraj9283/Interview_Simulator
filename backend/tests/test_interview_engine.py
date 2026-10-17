import unittest
import sys
import os

# Add backend to sys.path so app imports resolve
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.models import CandidateProfile, Signals
from app.services.interview_engine import (
    InterviewEngine,
    InterviewSession,
    InterviewTurn,
    UNRELATED_TECHNICAL_JARGON,
    validate_question_relevance,
    generate_skill_gap_report,
    generate_7day_roadmap,
    build_fallback_questions,
)
from app.services.rag_engine import RAGEngine

ML_PYTHON_RESUME = """
Niraj Kumar - Senior Machine Learning Engineer
Experience:
- Architected enterprise RAG system using LangChain, ChromaDB, and OpenAI embeddings.
- Trained Random Forest and XGBoost classifiers on imbalanced fraud detection datasets; addressed minority classes with SMOTE and Focal Loss.
- Implemented TreeSHAP explainability pipelines for model interpretability.
- Engineered real-time data streaming pipelines with Apache Kafka and Redis cache-aside invalidation.
- Proficient in Python, C++, PyTorch, PostgreSQL.
"""

SOFTWARE_DEV_RESUME = """
Alex Morgan - Senior Full Stack Developer
Experience:
- Built microservices in Go and Node.js with Kubernetes and Docker.
- Implemented Kafka message bus and distributed consensus with Raft.
- Optimized SQL database indexing with B-Trees and resolved replication lag.
- Led CI/CD automation and code review processes.
"""


class TestInterviewEngineRegression(unittest.TestCase):
    def setUp(self):
        # Initialize engine without re-indexing all ChromaDB collections for fast execution
        self.engine = InterviewEngine()

    def assert_no_unrelated_tech_jargon(self, question: str, context: str):
        q_lower = question.lower()
        for jargon in UNRELATED_TECHNICAL_JARGON:
            self.assertNotIn(
                jargon,
                q_lower,
                f"[{context}] Question contains unrelated technical jargon '{jargon}': '{question}'",
            )

    # TEST A: FINANCE
    def test_a_finance_role_with_ml_resume(self):
        profile = CandidateProfile(
            name="Alice",
            department="Finance",
            target_role="Financial Analyst",
            domain="Role Specific",
            difficulty="Standard",
            resume_text=ML_PYTHON_RESUME,
        )
        session_id, q0, _ = self.engine.start_session(profile)
        self.assert_no_unrelated_tech_jargon(q0, "TEST A")
        self.assertTrue(validate_question_relevance(q0, "Finance", "Financial Analyst"))

    # TEST B: HR
    def test_b_hr_role_with_software_resume(self):
        profile = CandidateProfile(
            name="Bob",
            department="HR",
            target_role="HR Manager",
            domain="Role Specific",
            difficulty="Standard",
            resume_text=SOFTWARE_DEV_RESUME,
        )
        session_id, q0, _ = self.engine.start_session(profile)
        self.assert_no_unrelated_tech_jargon(q0, "TEST B")
        self.assertTrue(validate_question_relevance(q0, "HR", "HR Manager"))

    # TEST C: MARKETING
    def test_c_marketing_role(self):
        profile = CandidateProfile(
            name="Carol",
            department="Marketing",
            target_role="Digital Marketing Manager",
            domain="Role Specific",
            difficulty="Standard",
            resume_text=ML_PYTHON_RESUME,
        )
        session_id, q0, _ = self.engine.start_session(profile)
        self.assert_no_unrelated_tech_jargon(q0, "TEST C")
        self.assertTrue(validate_question_relevance(q0, "Marketing", "Digital Marketing Manager"))

    # TEST D: TECHNICAL
    def test_d_technical_role(self):
        profile = CandidateProfile(
            name="Dave",
            department="Technical",
            target_role="Software Engineer",
            domain="Role Specific",
            difficulty="Standard",
            resume_text=SOFTWARE_DEV_RESUME,
        )
        session_id, q0, _ = self.engine.start_session(profile)
        self.assertTrue(validate_question_relevance(q0, "Technical", "Software Engineer"))
        self.assertGreater(len(q0), 20)

    # TEST E: FINANCE ADAPTIVE FOLLOW-UP
    def test_e_finance_adaptive_follow_up(self):
        profile = CandidateProfile(
            name="Eve",
            department="Finance",
            target_role="Financial Analyst",
            domain="Role Specific",
            difficulty="Standard",
            resume_text=ML_PYTHON_RESUME,
        )
        session_id, q0, _ = self.engine.start_session(profile)
        dcf_q = "How would you construct a discounted cash flow valuation?"
        weak_answer = "I would just add up cash flows and divide by an interest rate."
        signals = Signals(voice_energy=75, voice_pace=80, eye_contact=80, filler_words=90)

        res = self.engine.evaluate_answer(session_id, dcf_q, weak_answer, signals)
        next_q = res[4]  # next_question

        self.assert_no_unrelated_tech_jargon(next_q, "TEST E")
        self.assertTrue(validate_question_relevance(next_q, "Finance", "Financial Analyst"))

    # TEST F: HR ADAPTIVE FOLLOW-UP
    def test_f_hr_adaptive_follow_up(self):
        profile = CandidateProfile(
            name="Frank",
            department="HR",
            target_role="HR Manager",
            domain="Role Specific",
            difficulty="Standard",
            resume_text=SOFTWARE_DEV_RESUME,
        )
        session_id, q0, _ = self.engine.start_session(profile)
        retention_q = "How would you diagnose employee retention and design retention initiatives?"
        weak_answer = "I would just buy free snacks and tell people not to leave."
        signals = Signals(voice_energy=75, voice_pace=80, eye_contact=80, filler_words=90)

        res = self.engine.evaluate_answer(session_id, retention_q, weak_answer, signals)
        next_q = res[4]

        self.assert_no_unrelated_tech_jargon(next_q, "TEST F")
        self.assertTrue(validate_question_relevance(next_q, "HR", "HR Manager"))

    # TEST G: ROLE CHANGE
    def test_g_role_change_no_leakage(self):
        # Session 1: Tech
        tech_prof = CandidateProfile(
            name="Grace",
            department="Technical",
            target_role="Software Engineer",
            domain="Role Specific",
            difficulty="Standard",
            resume_text=SOFTWARE_DEV_RESUME,
        )
        tech_sid, _, _ = self.engine.start_session(tech_prof)

        # Session 2: Finance
        fin_prof = CandidateProfile(
            name="Grace",
            department="Finance",
            target_role="Financial Analyst",
            domain="Role Specific",
            difficulty="Standard",
            resume_text=ML_PYTHON_RESUME,
        )
        fin_sid, fin_q0, _ = self.engine.start_session(fin_prof)

        self.assertNotEqual(tech_sid, fin_sid)
        self.assert_no_unrelated_tech_jargon(fin_q0, "TEST G")
        self.assertTrue(validate_question_relevance(fin_q0, "Finance", "Financial Analyst"))

    # TEST H: INVALID ROLE OR TRACK
    def test_h_invalid_role_or_track(self):
        profile = CandidateProfile(
            name="Heidi",
            department="Finance",
            target_role="Senior Quantum Hypervisor Lead",
            domain="Role Specific",
            difficulty="Standard",
            resume_text="",
        )
        _, q0, _ = self.engine.start_session(profile)
        self.assert_no_unrelated_tech_jargon(q0, "TEST H")
        self.assertTrue(validate_question_relevance(q0, "Finance", "Financial Analyst"))

    # TEST I: INITIAL QUESTION
    def test_i_initial_question(self):
        profile = CandidateProfile(
            name="Ivan",
            department="Finance",
            target_role="Financial Analyst",
            domain="Role Specific",
            difficulty="Standard",
            resume_text=ML_PYTHON_RESUME,
        )
        _, q0, _ = self.engine.start_session(profile)
        self.assert_no_unrelated_tech_jargon(q0, "TEST I")
        self.assertTrue(validate_question_relevance(q0, "Finance", "Financial Analyst"))

    # TEST J: SUBSEQUENT QUESTIONS
    def test_j_subsequent_questions(self):
        profile = CandidateProfile(
            name="Judy",
            department="Finance",
            target_role="Financial Analyst",
            domain="Role Specific",
            difficulty="Standard",
            resume_text=ML_PYTHON_RESUME,
        )
        sid, q, _ = self.engine.start_session(profile)
        signals = Signals(voice_energy=75, voice_pace=80, eye_contact=80, filler_words=90)

        for turn_idx in range(5):
            self.assert_no_unrelated_tech_jargon(q, f"TEST J Turn {turn_idx}")
            self.assertTrue(validate_question_relevance(q, "Finance", "Financial Analyst"))
            res = self.engine.evaluate_answer(
                sid,
                q,
                "We evaluate liquidity, profitability, DCF valuations, and balance sheet reconciliation.",
                signals,
            )
            q = res[4]

    # TEST K: DIFFICULTY ESCALATION
    def test_k_difficulty_escalation(self):
        for diff in ["Warmup", "Standard", "Senior"]:
            profile = CandidateProfile(
                name="Karl",
                department="Finance",
                target_role="Financial Analyst",
                domain="Role Specific",
                difficulty=diff,
                resume_text=ML_PYTHON_RESUME,
            )
            _, q, _ = self.engine.start_session(profile)
            self.assert_no_unrelated_tech_jargon(q, f"TEST K {diff}")
            self.assertTrue(validate_question_relevance(q, "Finance", "Financial Analyst"))

    # TEST L: FALLBACK PRESERVES ROLE RELEVANCE
    def test_l_fallback_questions(self):
        fallbacks = build_fallback_questions("Finance", "Financial Analyst", "Role Specific")
        for q in fallbacks:
            self.assert_no_unrelated_tech_jargon(q, "TEST L Finance Fallback")
            self.assertTrue(validate_question_relevance(q, "Finance", "Financial Analyst"))

    # Bonus: Reporting is role-aware
    def test_reporting_is_role_aware(self):
        profile = CandidateProfile(
            name="Leo",
            department="Finance",
            target_role="Financial Analyst",
            domain="Role Specific",
            difficulty="Standard",
            resume_text=ML_PYTHON_RESUME,
        )
        session = InterviewSession(
            profile=profile,
            keywords=["finance", "valuation", "modeling"],
            history=[],
        )
        report = generate_skill_gap_report(session)
        skill_names = [s.name for s in report.skills]
        self.assertNotIn("Python", skill_names)
        self.assertIn("Financial Modeling & Valuation", skill_names)

        roadmap = generate_7day_roadmap(session)
        all_topics = " ".join(d.topic for d in roadmap.days).lower()
        self.assertNotIn("random forest", all_topics)
        self.assertIn("dcf", all_topics)


if __name__ == "__main__":
    unittest.main()
