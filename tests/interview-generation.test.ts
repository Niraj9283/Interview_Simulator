import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  generateQuestion,
  InterviewDifficulty,
  InterviewTurn,
  scoreAnswer,
  generate7DayRoadmap,
  CandidateProfile,
} from "../src/lib/interview";
import {
  DepartmentId,
  InterviewTrack,
  findRole,
  getQuestionsForSelection,
  isInterviewTypeAvailableForDepartment,
  isTrackAvailableForDepartment,
  validateQuestionRelevance,
  UNRELATED_TECHNICAL_JARGON,
} from "../src/lib/role-database";
import { InterviewerPersonaId } from "../src/lib/interviewer-personalities";

const ML_PYTHON_RESUME = `
Niraj Kumar - Senior Machine Learning Engineer
Experience:
- Architected enterprise RAG system using LangChain, ChromaDB, and OpenAI embeddings.
- Trained Random Forest and XGBoost classifiers on imbalanced fraud detection datasets; addressed minority classes with SMOTE and Focal Loss.
- Implemented TreeSHAP explainability pipelines for model interpretability.
- Engineered real-time data streaming pipelines with Apache Kafka and Redis cache-aside invalidation.
- Proficient in Python, C++, PyTorch, PostgreSQL.
`;

const SOFTWARE_DEV_RESUME = `
Alex Morgan - Senior Full Stack Developer
Experience:
- Built microservices in Go and Node.js with Kubernetes and Docker.
- Implemented Kafka message bus and distributed consensus with Raft.
- Optimized SQL database indexing with B-Trees and resolved replication lag.
- Led CI/CD automation and code review processes.
`;

function assertNoUnrelatedTechJargon(question: string, context: string) {
  const qLower = question.toLowerCase();
  assert.strictEqual(
    /\brag\b/i.test(question),
    false,
    `[${context}] Question contained technical RAG: "${question}"`
  );
  assert.strictEqual(
    /\bgil\b/i.test(question),
    false,
    `[${context}] Question contained Python GIL: "${question}"`
  );
  for (const jargon of UNRELATED_TECHNICAL_JARGON) {
    assert.strictEqual(
      qLower.includes(jargon),
      false,
      `[${context}] Question contained unrelated technical jargon "${jargon}": "${question}"`
    );
  }
}

function makeProfile(overrides: Partial<CandidateProfile>): CandidateProfile {
  return {
    name: "Candidate",
    department: "Technical",
    targetRole: "Software Engineer",
    domain: "Role Specific",
    difficulty: "Standard",
    resumeText: "",
    interviewType: "General",
    ...overrides,
  };
}

function makeTurn(overrides: Partial<InterviewTurn>): InterviewTurn {
  return {
    id: 1,
    question: "Test question",
    answer: "Test answer",
    score: 80,
    latencyMs: 1500,
    feedback: ["Good baseline answer."],
    breakdown: {
      technical_accuracy: 80,
      semantic_relevance: 80,
      answer_structure: 80,
      eye_contact: 80,
      voice_energy: 75,
      speaking_pace: 80,
      filler_words: 90,
      overall: 80,
    },
    signals: {
      clarity: 80,
      relevance: 80,
      structure: 80,
      confidence: 80,
      voice: 80,
      eyeContact: 80,
    },
    ...overrides,
  };
}

describe("Interview Question Generation - Scenarios A through L", () => {
  // TEST A: FINANCE
  it("TEST A: Finance role with ML/Python resume generates only Finance questions", () => {
    const profile = makeProfile({
      department: "Finance",
      targetRole: "Financial Analyst",
      resumeText: ML_PYTHON_RESUME,
    });
    const question = generateQuestion(profile, 0, ["finance", "valuation"]);

    assertNoUnrelatedTechJargon(question, "TEST A");
    const isRelevant = validateQuestionRelevance(question, "Finance", "Financial Analyst");
    assert.strictEqual(isRelevant, true, `Question should be valid finance question: ${question}`);
  });

  // TEST B: HR
  it("TEST B: HR role with software development resume generates HR questions", () => {
    const profile = makeProfile({
      department: "HR",
      targetRole: "HR Manager",
      resumeText: SOFTWARE_DEV_RESUME,
    });
    const question = generateQuestion(profile, 0, ["hr", "retention"]);

    assertNoUnrelatedTechJargon(question, "TEST B");
    const isRelevant = validateQuestionRelevance(question, "HR", "HR Manager");
    assert.strictEqual(isRelevant, true, `Question should be valid HR question: ${question}`);
  });

  // TEST C: MARKETING
  it("TEST C: Marketing role generates Marketing questions", () => {
    const profile = makeProfile({
      department: "Marketing",
      targetRole: "Digital Marketing Manager",
      resumeText: ML_PYTHON_RESUME,
    });
    const question = generateQuestion(profile, 0, ["marketing", "roas"]);

    assertNoUnrelatedTechJargon(question, "TEST C");
    const isRelevant = validateQuestionRelevance(question, "Marketing", "Digital Marketing Manager");
    assert.strictEqual(isRelevant, true, `Question should be valid Marketing question: ${question}`);
  });

  // TEST D: TECHNICAL
  it("TEST D: Technical role generates valid technical questions without being blocked", () => {
    const profile = makeProfile({
      department: "Technical",
      targetRole: "Software Engineer",
      resumeText: SOFTWARE_DEV_RESUME,
    });
    const question = generateQuestion(profile, 0, ["software", "algorithms"]);

    const isRelevant = validateQuestionRelevance(question, "Technical", "Software Engineer");
    assert.strictEqual(isRelevant, true, `Technical question should be valid: ${question}`);
    assert.ok(question.length > 20, "Question should have substance");
  });

  // TEST E: FINANCE ADAPTIVE FOLLOW-UP
  it("TEST E: Finance adaptive follow-up on DCF asks finance questions, not ML or Kafka", () => {
    const dcfQuestion = "How would you construct a discounted cash flow valuation?";
    const incompleteAnswer = "I would just sum up all revenues and divide by interest rates.";

    const scoreResult = scoreAnswer(
      incompleteAnswer,
      dcfQuestion,
      ["dcf", "valuation"],
      { pace: 80, energy: 75, steadiness: 75 },
      80,
      undefined,
      undefined,
      "Standard",
      undefined,
      [],
      1,
      undefined,
      "Finance",
      "Financial Analyst"
    );

    const followUpTurn = makeTurn({
      question: dcfQuestion,
      answer: incompleteAnswer,
      score: scoreResult.score,
      weakArea: scoreResult.weakArea,
      retrievedConcepts: scoreResult.retrievedConcepts,
    });

    const profile = makeProfile({
      department: "Finance",
      targetRole: "Financial Analyst",
      resumeText: ML_PYTHON_RESUME,
    });

    const nextQuestion = generateQuestion(profile, 1, ["finance"], followUpTurn);

    assertNoUnrelatedTechJargon(nextQuestion, "TEST E Follow-Up");
    const isRelevant = validateQuestionRelevance(nextQuestion, "Finance", "Financial Analyst");
    assert.strictEqual(isRelevant, true, `Follow-up question must be finance-relevant: ${nextQuestion}`);
  });

  // TEST F: HR ADAPTIVE FOLLOW-UP
  it("TEST F: HR adaptive follow-up on employee retention asks HR questions", () => {
    const hrQuestion = "How would you diagnose rising employee attrition and design retention strategies?";
    const weakAnswer = "I would offer people snacks and tell them to work harder.";

    const scoreResult = scoreAnswer(
      weakAnswer,
      hrQuestion,
      ["attrition", "retention"],
      { pace: 80, energy: 75, steadiness: 75 },
      80,
      undefined,
      undefined,
      "Standard",
      undefined,
      [],
      1,
      undefined,
      "HR",
      "HR Manager"
    );

    const followUpTurn = makeTurn({
      question: hrQuestion,
      answer: weakAnswer,
      score: scoreResult.score,
      weakArea: scoreResult.weakArea,
      retrievedConcepts: scoreResult.retrievedConcepts,
    });

    const profile = makeProfile({
      department: "HR",
      targetRole: "HR Manager",
      resumeText: SOFTWARE_DEV_RESUME,
    });

    const nextQuestion = generateQuestion(profile, 1, ["hr"], followUpTurn);

    assertNoUnrelatedTechJargon(nextQuestion, "TEST F Follow-Up");
    const isRelevant = validateQuestionRelevance(nextQuestion, "HR", "HR Manager");
    assert.strictEqual(isRelevant, true, `Follow-up question must be HR-relevant: ${nextQuestion}`);
  });

  // TEST G: ROLE CHANGE
  it("TEST G: Changing role from Technical to Finance produces clean Finance session without leakage", () => {
    // Session 1: Technical
    const techProfile = makeProfile({
      department: "Technical",
      targetRole: "Software Engineer",
      resumeText: SOFTWARE_DEV_RESUME,
    });
    const techQ = generateQuestion(techProfile, 0, ["software"]);
    assert.ok(techQ.length > 0);

    // Session 2: User switches to Finance
    const financeProfile = makeProfile({
      department: "Finance",
      targetRole: "Financial Analyst",
      resumeText: ML_PYTHON_RESUME,
    });
    const financeQ0 = generateQuestion(financeProfile, 0, ["finance"]);

    assertNoUnrelatedTechJargon(financeQ0, "TEST G");
    const isRelevant = validateQuestionRelevance(financeQ0, "Finance", "Financial Analyst");
    assert.strictEqual(isRelevant, true);
  });

  // TEST H: INVALID ROLE OR TRACK
  it("TEST H: Invalid role or track safely resolves within department and does not default to Technical", () => {
    // 1. Incompatible track for non-technical department
    const isCodingForFinance = isInterviewTypeAvailableForDepartment("Finance", "Coding");
    assert.strictEqual(isCodingForFinance, false, "Coding must not be available for Finance");

    const isSystemDesignForHR = isTrackAvailableForDepartment("HR", "System Design");
    assert.strictEqual(isSystemDesignForHR, false, "System Design track must not be available for HR");

    // 2. Non-existent role in Finance
    const resolvedRole = findRole("Finance", "Senior Quantum AI Architect");
    assert.strictEqual(
      resolvedRole.title,
      "Financial Analyst",
      "Unknown role in Finance must safely resolve to a Finance role, not a Technical role"
    );

    // 3. Question generation with invalid role & track
    const invalidProfile = makeProfile({
      department: "Finance",
      targetRole: "NonExistentRoleXYZ",
      domain: "System Design" as unknown as InterviewTrack,
      interviewType: "Coding" as unknown as never,
    });
    const safeQ = generateQuestion(invalidProfile, 0, []);

    assertNoUnrelatedTechJargon(safeQ, "TEST H");
    assert.strictEqual(validateQuestionRelevance(safeQ, "Finance", "Financial Analyst"), true);
  });

  // TEST I: INITIAL QUESTION
  it("TEST I: Initial question strictly adheres to role despite ML resume", () => {
    const profile = makeProfile({
      department: "Finance",
      targetRole: "Financial Analyst",
      resumeText: ML_PYTHON_RESUME,
    });
    const q = generateQuestion(profile, 0, ["finance"]);

    assertNoUnrelatedTechJargon(q, "TEST I");
    assert.strictEqual(validateQuestionRelevance(q, "Finance", "Financial Analyst"), true);
  });

  // TEST J: SUBSEQUENT QUESTIONS
  it("TEST J: Every question in a complete 6-turn interview respects the selected role", () => {
    let lastTurn: InterviewTurn | undefined = undefined;
    const profile = makeProfile({
      department: "Finance",
      targetRole: "Financial Analyst",
      resumeText: ML_PYTHON_RESUME,
    });

    for (let round = 0; round < 6; round++) {
      const q = generateQuestion(profile, round, ["finance"], lastTurn);

      assertNoUnrelatedTechJargon(q, `TEST J Round ${round}`);
      assert.strictEqual(
        validateQuestionRelevance(q, "Finance", "Financial Analyst"),
        true,
        `Round ${round} question violated role relevance: ${q}`
      );

      // Simulate turn completion
      lastTurn = makeTurn({
        id: round + 1,
        question: q,
        answer: "We analyze financial statements, balance sheet reconciliations, and DCF terminal growth.",
        score: 82,
      });
    }
  });

  // TEST K: DIFFICULTY AND PERSONA
  it("TEST K: Escalated difficulty and tough personas do not change subject area to technical", () => {
    const difficulties: InterviewDifficulty[] = ["Warmup", "Standard", "Senior"];
    const personas: InterviewerPersonaId[] = ["technical", "hr", "manager", "senior_engineer", "stress_interviewer"];

    for (const diff of difficulties) {
      for (const persona of personas) {
        const profile = makeProfile({
          department: "Finance",
          targetRole: "Financial Analyst",
          resumeText: ML_PYTHON_RESUME,
          difficulty: diff,
          personaId: persona,
        });

        const q = generateQuestion(profile, 0, ["finance"], undefined, diff);

        assertNoUnrelatedTechJargon(q, `TEST K ${diff}-${persona}`);
        assert.strictEqual(
          validateQuestionRelevance(q, "Finance", "Financial Analyst"),
          true,
          `Difficulty ${diff} with persona ${persona} changed subject area: ${q}`
        );
      }
    }
  });

  // TEST L: FALLBACK PRESERVES ROLE RELEVANCE
  it("TEST L: Fallback questions are role-specific and never default to Technical questions", () => {
    const financeFallbacks = getQuestionsForSelection("Finance", "Financial Analyst", "Role Specific");
    for (const q of financeFallbacks) {
      assertNoUnrelatedTechJargon(q, "TEST L Finance Fallback");
      assert.strictEqual(validateQuestionRelevance(q, "Finance", "Financial Analyst"), true);
    }

    const hrFallbacks = getQuestionsForSelection("HR", "HR Manager", "Role Specific");
    for (const q of hrFallbacks) {
      assertNoUnrelatedTechJargon(q, "TEST L HR Fallback");
      assert.strictEqual(validateQuestionRelevance(q, "HR", "HR Manager"), true);
    }

    const marketingFallbacks = getQuestionsForSelection("Marketing", "Digital Marketing Manager", "Role Specific");
    for (const q of marketingFallbacks) {
      assertNoUnrelatedTechJargon(q, "TEST L Marketing Fallback");
      assert.strictEqual(validateQuestionRelevance(q, "Marketing", "Digital Marketing Manager"), true);
    }
  });

  // Bonus: Roadmap generation is role-aware
  it("Roadmap generation is department-aware and doesn't output Random Forest for Finance", () => {
    const roadmap = generate7DayRoadmap([], "Financial Analyst", "Finance");
    assert.strictEqual(roadmap.target_role, "Financial Analyst");
    const allTopics = roadmap.days.map((d) => `${d.topic} ${d.focus_area}`).join(" ").toLowerCase();
    assert.strictEqual(allTopics.includes("random forest"), false, "Finance roadmap should not mention Random Forest");
    assert.strictEqual(allTopics.includes("dcf"), true, "Finance roadmap should include DCF valuation");
  });
});
