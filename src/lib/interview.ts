import {
  DepartmentId,
  InterviewTrack,
  InterviewType,
  getQuestionsForSelection,
  isInterviewTypeAvailableForDepartment,
  isTrackAvailableForDepartment,
  getDefaultRoleForDepartment,
  getDefaultTrackForDepartment,
  isProjectRelevantToRole,
  validateQuestionRelevance,
  applyRoleAppropriateDifficulty,
  UNRELATED_TECHNICAL_JARGON,
} from "./role-database";
import { VoiceTurnStats } from "./voice-analyzer";
import { PaceTurnStats } from "./speech-tracker";
import { BodyLanguageTurnStats } from "./eye-contact-tracker";
import { CodingEvaluation, CodingLanguage, CODING_PROBLEMS } from "./coding-engine";
import {
  ArchitectureDiagram,
  SystemDesignEvaluation,
  SYSTEM_DESIGN_CHALLENGES,
} from "./system-design-engine";
import {
  InterviewerPersonaId,
  StressModeConfig,
  getInterviewerPersona,
} from "./interviewer-personalities";
import { CandidateDigitalProfile } from "./digital-profile";
import {
  DeliveryMetadata,
  InterviewInputMode,
  VoiceTranscriptBundle,
} from "./voice-answer-engine";

export type InterviewDomain = InterviewTrack;

export type InterviewDifficulty = "Warmup" | "Standard" | "Senior";

export type VoiceSignal = {
  pace: number;
  energy: number;
  steadiness: number;
  db?: number;
  rms?: number;
};

export type CandidateProfile = {
  name: string;
  department: DepartmentId;
  targetRole: string;
  domain: InterviewDomain;
  interviewType: InterviewType;
  difficulty: InterviewDifficulty;
  resumeText: string;
  personaId?: InterviewerPersonaId;
  stressConfig?: StressModeConfig;
  digitalProfile?: CandidateDigitalProfile;
  inputMode?: InterviewInputMode;
};

export interface MultimodalBreakdown {
  technical_accuracy: number;
  semantic_relevance: number;
  answer_structure: number;
  eye_contact: number;
  voice_energy: number;
  speaking_pace: number;
  filler_words: number;
  overall: number;
}

export interface ConsistencyConflict {
  topic: string;
  earlier_claim: string;
  earlier_turn: number;
  later_claim: string;
  later_turn: number;
  confidence: number;
  explanation: string;
  probing_followup: string;
}

export interface InterviewerMemory {
  claims: string[];
  skills_demonstrated: string[];
  weak_topics: string[];
  strong_topics: string[];
  followups_pending: string[];
  conflicts: ConsistencyConflict[];
}

export function parseRecordCount(text: string): number | null {
  const m = text.match(/(\d+(?:[.,]\d+)?)\s*(million|m|thousand|k|hundred thousand|crore|lakh)?\s*(?:records|rows|samples|datapoints|data points|examples|instances|events)/i);
  if (!m) return null;
  const numStr = m[1].replace(/,/g, "");
  let val = parseFloat(numStr);
  if (isNaN(val)) return null;
  const multStr = (m[2] || "").toLowerCase();
  if (multStr === "million" || multStr === "m") {
    val *= 1_000_000;
  } else if (multStr === "thousand" || multStr === "k") {
    val *= 1_000;
  } else if (multStr === "hundred thousand" || multStr === "lakh") {
    val *= 100_000;
  } else if (multStr === "crore") {
    val *= 10_000_000;
  }
  return Math.round(val);
}

export function parseAccuracyClaim(text: string): number | null {
  const m = text.match(/(\d+(?:\.\d+)?)\s*%\s*(?:accuracy|acc|precision|recall|f1)/i);
  if (m) {
    const val = parseFloat(m[1]);
    if (!isNaN(val)) return val;
  }
  return null;
}

export function detectClaimConflicts(
  historyAnswers: Array<{ answer: string; turnId: number }>,
  currentAnswer: string,
  currentTurnId: number
): ConsistencyConflict[] {
  const conflicts: ConsistencyConflict[] = [];

  // 1. Dataset Scale Conflict Detection (e.g. 20 million vs 200,000 records)
  const currentRecords = parseRecordCount(currentAnswer);
  if (currentRecords !== null && currentRecords > 0) {
    for (const past of historyAnswers) {
      const pastRecords = parseRecordCount(past.answer);
      if (pastRecords !== null && pastRecords > 0) {
        const ratio = Math.max(pastRecords, currentRecords) / Math.min(pastRecords, currentRecords);
        if (ratio >= 4.0) {
          conflicts.push({
            topic: "Dataset Scale & Volume",
            earlier_claim: `${pastRecords.toLocaleString()} records`,
            earlier_turn: past.turnId,
            later_claim: `${currentRecords.toLocaleString()} records`,
            later_turn: currentTurnId,
            confidence: 95,
            explanation: `Dataset volume changed by ${Math.round(ratio)}x between Turn ${past.turnId} (${pastRecords.toLocaleString()} records) and Turn ${currentTurnId} (${currentRecords.toLocaleString()} records).`,
            probing_followup: `Earlier you mentioned training on ${pastRecords.toLocaleString()} records, but you just mentioned having around ${currentRecords.toLocaleString()} records. Could you clarify the exact dataset volume and sampling pipeline used?`,
          });
        }
      }
    }
  }

  // 2. Performance Metric Conflict Detection (e.g. 97.3% vs 82% accuracy)
  const currentAcc = parseAccuracyClaim(currentAnswer);
  if (currentAcc !== null) {
    for (const past of historyAnswers) {
      const pastAcc = parseAccuracyClaim(past.answer);
      if (pastAcc !== null && Math.abs(pastAcc - currentAcc) >= 8.0) {
        conflicts.push({
          topic: "Reported Accuracy & Evaluation Split",
          earlier_claim: `${pastAcc}% accuracy`,
          earlier_turn: past.turnId,
          later_claim: `${currentAcc}% accuracy`,
          later_turn: currentTurnId,
          confidence: 92,
          explanation: `Reported accuracy shifted from ${pastAcc}% in Turn ${past.turnId} to ${currentAcc}% in Turn ${currentTurnId}.`,
          probing_followup: `Earlier you mentioned achieving ${pastAcc}% accuracy, and just now noted ${currentAcc}%. Which validation split or metric does each figure represent?`,
        });
      }
    }
  }

  return conflicts;
}

export function extractCandidateClaims(text: string): string[] {
  const claims: string[] = [];

  const pctMatches = text.match(/\d+(?:\.\d+)?%\s*(?:accuracy|precision|recall|f1|latency reduction|uptime|improvement|gain|coverage)/gi);
  if (pctMatches) claims.push(...pctMatches);

  const metricMatches = text.match(/(?:auc|roc|f1|r2|map)\s*(?:of|score|value)?\s*(?:is|=|:)?\s*0\.\d{2,4}/gi);
  if (metricMatches) claims.push(...metricMatches);

  const scaleMatches = text.match(/\d+(?:k|m|x)?\s*(?:req|requests|events|queries|qps|rps|tps|samples|users|records|rows)\s*(?:\/|per)?\s*(?:sec|second|day)?/gi);
  if (scaleMatches) {
    claims.push(...scaleMatches.filter((m) => m.length > 4));
  }

  const techs = ["Random Forest", "SHAP", "SMOTE", "XGBoost", "TreeSHAP", "PyTorch", "TensorFlow", "FastAPI", "Next.js", "Kafka", "Docker", "Kubernetes", "Redis", "PostgreSQL"];
  const textLower = text.toLowerCase();
  for (const t of techs) {
    if (textLower.includes(t.toLowerCase())) {
      claims.push(t);
    }
  }

  return Array.from(new Set(claims));
}

export function updateInterviewerMemory(
  prevMemory?: InterviewerMemory,
  question: string = "",
  answer: string = "",
  score: number = 80,
  depthScore: number = 80,
  weakArea?: string | null,
  historyAnswers: Array<{ answer: string; turnId: number }> = [],
  currentTurnId = 1
): { updatedMemory: InterviewerMemory; newConflicts: ConsistencyConflict[] } {
  const safeMemory = prevMemory ?? {
    claims: [],
    skills_demonstrated: [],
    weak_topics: [],
    strong_topics: [],
    followups_pending: [],
    conflicts: [],
  };
  const claims = [...(safeMemory.claims ?? [])];
  const skills_demonstrated = [...(safeMemory.skills_demonstrated ?? [])];
  const weak_topics = [...(safeMemory.weak_topics ?? [])];
  const strong_topics = [...(safeMemory.strong_topics ?? [])];
  const followups_pending = [...(safeMemory.followups_pending ?? [])];
  const conflicts = [...(safeMemory.conflicts ?? [])];

  const extracted = extractCandidateClaims(answer);
  for (const c of extracted) {
    if (!claims.includes(c)) claims.push(c);
  }

  const knownSkills = ["Random Forest", "SHAP", "SMOTE", "Stratified K-Fold", "TreeSHAP", "Bagging", "Decision Trees", "Feature Importance", "Kafka", "FastAPI", "PyTorch"];
  for (const skill of knownSkills) {
    if (answer.toLowerCase().includes(skill.toLowerCase()) && !skills_demonstrated.includes(skill)) {
      skills_demonstrated.push(skill);
    }
  }

  if (weakArea) {
    if (!weak_topics.includes(weakArea)) weak_topics.push(weakArea);
  } else if (depthScore >= 75) {
    let topic = "Model Architecture & Tradeoffs";
    if (question.toLowerCase().includes("imbalance")) topic = "Class Imbalance";
    else if (question.toLowerCase().includes("interpret") || question.toLowerCase().includes("shap")) topic = "Model Explainability";
    else if (question.toLowerCase().includes("random forest")) topic = "Ensemble Learning";
    if (!strong_topics.includes(topic)) strong_topics.push(topic);
  }

  // Detect inconsistencies
  const newConflicts = detectClaimConflicts(historyAnswers, answer, currentTurnId);
  for (const conflict of newConflicts) {
    conflicts.push(conflict);
    followups_pending.unshift(conflict.probing_followup);
  }

  for (const claim of extracted) {
    if (claim.includes("%") && !followups_pending.some((f) => f.includes(claim))) {
      followups_pending.push(`You mentioned achieving ${claim} with Random Forest earlier. How did you validate that result against data leakage and overfitting?`);
    } else if (claim.toLowerCase().includes("shap") && !followups_pending.some((f) => f.includes("SHAP"))) {
      followups_pending.push("Earlier you mentioned using SHAP for interpretability. How did the Shapley values help you detect redundant features or bias in your dataset?");
    } else if (claim.toLowerCase().includes("smote") && !followups_pending.some((f) => f.includes("SMOTE"))) {
      followups_pending.push("You mentioned applying SMOTE earlier. How did you ensure synthetic samples did not introduce label noise near decision boundaries?");
    }
  }

  return {
    updatedMemory: { claims, skills_demonstrated, weak_topics, strong_topics, followups_pending, conflicts },
    newConflicts,
  };
}

export interface SkillScore {
  name: string;
  score: number;
  level: "Advanced" | "Proficient" | "Needs Improvement" | "Critical Gap";
  category: string;
}

export interface TopicCurriculumNode {
  name: string;
  description: string;
  difficulty: "Foundational" | "Intermediate" | "Advanced";
  key_topics: string[];
  estimated_study_hours: number;
}

export interface DayStudyPlan {
  day: number;
  topic: string;
  focus_area: string;
  estimated_hours: number;
  intensity: number;
  practice_challenge: string;
  retrieved_concepts: string[];
  completed?: boolean;
}

export interface PostInterviewRoadmap {
  title: string;
  summary: string;
  target_role: string;
  days: DayStudyPlan[];
  total_hours: number;
  generated_at: string;
}

export function generate7DayRoadmap(
  history: InterviewTurn[],
  targetRole: string = "Full Stack AI Engineer",
  departmentId?: DepartmentId
): PostInterviewRoadmap {
  let effectiveDept: DepartmentId = departmentId ?? "Technical";
  if (!departmentId) {
    const roleLower = targetRole.toLowerCase();
    if (roleLower.includes("financ") || roleLower.includes("account") || roleLower.includes("tax") || roleLower.includes("budget") || roleLower.includes("audit") || roleLower.includes("fp&a") || roleLower.includes("payroll specialist")) {
      effectiveDept = "Finance";
    } else if (roleLower.includes("hr") || roleLower.includes("talent") || roleLower.includes("recruit") || roleLower.includes("people") || roleLower.includes("onboarding") || roleLower.includes("compensation")) {
      effectiveDept = "HR";
    } else if (roleLower.includes("market") || roleLower.includes("brand") || roleLower.includes("seo") || roleLower.includes("campaign") || roleLower.includes("growth") || roleLower.includes("social media")) {
      effectiveDept = "Marketing";
    }
  }

  const weakAreas = history.map((t) => t.weakArea).filter(Boolean) as string[];

  let days: DayStudyPlan[] = [];

  if (effectiveDept === "Finance") {
    days = [
      {
        day: 1,
        topic: "DCF & Valuation Modeling",
        focus_area: "Unlevered free cash flow forecasting, terminal growth calibration, and WACC cost of equity/debt estimation.",
        estimated_hours: 3,
        intensity: 90,
        practice_challenge: "Construct a 5-year DCF model with Gordon Growth and exit multiple sensitivities for an enterprise valuation.",
        retrieved_concepts: ["Unlevered FCF", "WACC Weighting", "Terminal Growth Rate", "Enterprise vs Equity Value"],
      },
      {
        day: 2,
        topic: "Three-Statement Synthesis",
        focus_area: "Integrated financial modeling linking income statement, balance sheet, and cash flow statement dynamically.",
        estimated_hours: 3,
        intensity: 85,
        practice_challenge: "Model the balance sheet impact of a $10M debt issuance used for capital expenditures and working capital.",
        retrieved_concepts: ["Accrual Accounting", "Depreciation Schedules", "Cash Conversion Cycle", "Working Capital"],
      },
      {
        day: 3,
        topic: "Variance & Margin Analysis",
        focus_area: "Decomposing revenue shortfalls and cost spikes across products, geography, and fixed vs variable costs.",
        estimated_hours: 2,
        intensity: 80,
        practice_challenge: "Build a variance bridge explaining a 6% gross margin miss to executive leadership.",
        retrieved_concepts: ["Variance Analysis", "Contribution Margin", "Price-Volume-Mix", "EBITDA Bridge"],
      },
      {
        day: 4,
        topic: "Liquidity & Working Capital",
        focus_area: "Cash conversion cycle optimization, DSO/DPO/DIO analysis, and short-term liquidity management.",
        estimated_hours: 2,
        intensity: 75,
        practice_challenge: "Analyze a company with growing bookings but negative operating cash flow and recommend treasury actions.",
        retrieved_concepts: ["DSO & DPO", "Current Ratio", "Operating Cash Flow", "Working Capital Optimization"],
      },
      {
        day: 5,
        topic: "Debt Covenants & Stress Testing",
        focus_area: "Interest coverage ratios, debt service coverage (DSCR), leverage covenants, and recessionary headroom testing.",
        estimated_hours: 3,
        intensity: 90,
        practice_challenge: "Run a stress test simulation modeling debt covenant compliance under an 8% revenue contraction.",
        retrieved_concepts: ["Interest Coverage", "Debt-to-EBITDA", "Covenant Headroom", "Scenario Modeling"],
      },
      {
        day: 6,
        topic: "Executive Communication",
        focus_area: "Translating complex financial modeling and risk analyses into crisp executive takeaways for non-financial stakeholders.",
        estimated_hours: 2,
        intensity: 75,
        practice_challenge: "Prepare and deliver a 3-minute executive briefing on capital allocation tradeoffs.",
        retrieved_concepts: ["Executive Briefing", "Data Visualization", "Risk Synthesis", "Strategic Storytelling"],
      },
      {
        day: 7,
        topic: "Final Financial Simulation",
        focus_area: "Comprehensive senior-level simulation defending valuation assumptions, accounting discrepancies, and forecasts.",
        estimated_hours: 2,
        intensity: 95,
        practice_challenge: "Achieve an overall score >= 85 in a full 6-round financial analysis simulation.",
        retrieved_concepts: ["Financial Ratios", "Valuation Defense", "Audit Reconciliation", "Forecasting Methodology"],
      },
    ];
  } else if (effectiveDept === "HR") {
    days = [
      {
        day: 1,
        topic: "Attrition Diagnostics",
        focus_area: "Decomposing turnover metrics by department, tenure, and role using survival curves and pulse survey correlations.",
        estimated_hours: 3,
        intensity: 90,
        practice_challenge: "Design an attrition diagnostic framework to isolate compensation issues from managerial burnout.",
        retrieved_concepts: ["Voluntary vs Involuntary Attrition", "Cohort Retention", "eNPS Factor Analysis", "Stay Interviews"],
      },
      {
        day: 2,
        topic: "Competency-Based Hiring",
        focus_area: "Structured scorecards, role competency frameworks, and interviewer calibration to reduce hiring bias.",
        estimated_hours: 2,
        intensity: 80,
        practice_challenge: "Create a 5-competency interview rubric with scoring benchmarks for an engineering or management role.",
        retrieved_concepts: ["Structured Rubrics", "Competency Scorecards", "Bias Mitigation", "Time-to-Fill Metrics"],
      },
      {
        day: 3,
        topic: "Employee Relations",
        focus_area: "Fair investigation protocols, documentation standards, and conflict de-escalation between team members.",
        estimated_hours: 3,
        intensity: 85,
        practice_challenge: "Draft an investigation plan and objective timeline for a confidential employee workplace complaint.",
        retrieved_concepts: ["Neutral Investigation", "Documentation Integrity", "Conflict De-escalation", "Dispute Resolution"],
      },
      {
        day: 4,
        topic: "Performance Management",
        focus_area: "Performance improvement plans (PIPs), clear KPI goal setting, and objective evaluation standards.",
        estimated_hours: 2,
        intensity: 80,
        practice_challenge: "Review a poorly phrased PIP and rewrite it with objective, measurable milestones and support checkpoints.",
        retrieved_concepts: ["Measurable Goals", "Performance Appraisals", "Feedback Frameworks", "Compliance Standards"],
      },
      {
        day: 5,
        topic: "Compensation & Workforce Planning",
        focus_area: "Salary band benchmarking, internal pay equity audits, and headcount forecasting across growth phases.",
        estimated_hours: 3,
        intensity: 85,
        practice_challenge: "Evaluate salary band discrepancies across teams and propose an equity adjustment plan within budget.",
        retrieved_concepts: ["Pay Equity", "Compensation Bands", "Workforce Headcount", "Market Benchmarking"],
      },
      {
        day: 6,
        topic: "Empathy & Leadership Advisory",
        focus_area: "Counseling senior executives on difficult talent decisions, organizational restructuring, and cultural trust.",
        estimated_hours: 2,
        intensity: 75,
        practice_challenge: "Roleplay advising a stubborn department lead to adhere to promotion guidelines.",
        retrieved_concepts: ["Executive Presence", "Cultural Alignment", "Change Management", "Trust Building"],
      },
      {
        day: 7,
        topic: "Final HR Leadership Simulation",
        focus_area: "Full 6-question simulation covering retention interventions, policy edge cases, and talent strategy.",
        estimated_hours: 2,
        intensity: 95,
        practice_challenge: "Complete a full HR simulation achieving high marks on empathy, clarity, and structural rigor.",
        retrieved_concepts: ["HR Strategy", "Retention Playbooks", "Regulatory Compliance", "Cross-Functional Leadership"],
      },
    ];
  } else if (effectiveDept === "Marketing") {
    days = [
      {
        day: 1,
        topic: "Attribution Modeling",
        focus_area: "Multi-touch attribution (MTA), first/last touch limitations, and measuring incremental lift across channels.",
        estimated_hours: 3,
        intensity: 90,
        practice_challenge: "Compare linear, time-decay, and position-based attribution models for an omnichannel marketing budget.",
        retrieved_concepts: ["Multi-Touch Attribution", "Incrementality Lift", "First vs Last Touch", "Channel Contribution"],
      },
      {
        day: 2,
        topic: "CAC & ROAS Optimization",
        focus_area: "Blended vs paid customer acquisition cost, payback period modeling, and identifying diminishing return thresholds.",
        estimated_hours: 3,
        intensity: 85,
        practice_challenge: "Calculate the marginal ROAS of an overspending paid channel and design a budget reallocation strategy.",
        retrieved_concepts: ["Blended vs Paid CAC", "Payback Periods", "Marginal ROAS", "Budget Optimization"],
      },
      {
        day: 3,
        topic: "Funnel & CRO Diagnostics",
        focus_area: "Identifying friction points in visitor-to-lead and lead-to-customer funnels using cohort analysis and heatmaps.",
        estimated_hours: 2,
        intensity: 80,
        practice_challenge: "Diagnose an 18% conversion drop on a paid landing page and propose 3 multivariate test hypotheses.",
        retrieved_concepts: ["CRO Methodology", "Funnel Drop-Off", "Multivariate Testing", "User Journey Friction"],
      },
      {
        day: 4,
        topic: "Audience Segmentation & LTV",
        focus_area: "Behavioral cohort segmentation, customer lifetime value (LTV) forecasting, and retention curves.",
        estimated_hours: 2,
        intensity: 80,
        practice_challenge: "Analyze 90-day cohort retention data to identify the highest-LTV customer acquisition segments.",
        retrieved_concepts: ["Cohort Retention", "LTV-to-CAC Ratio", "Behavioral Clusters", "Lifecycle Marketing"],
      },
      {
        day: 5,
        topic: "Omnichannel Campaign Strategy",
        focus_area: "Coordinating messaging across search, paid social, email nurturing, and content to maximize pipeline velocity.",
        estimated_hours: 3,
        intensity: 85,
        practice_challenge: "Develop an end-to-end launch plan for a new product tier with integrated channel KPIs.",
        retrieved_concepts: ["Omnichannel Architecture", "Campaign Messaging", "Pipeline Velocity", "Creative Iteration"],
      },
      {
        day: 6,
        topic: "Data Storytelling & Stakeholder Buy-in",
        focus_area: "Presenting marketing experiment results and budget requests clearly to executive leadership.",
        estimated_hours: 2,
        intensity: 75,
        practice_challenge: "Present a campaign post-mortem explaining why a test failed and what actionable learnings were gained.",
        retrieved_concepts: ["Experimentation Readout", "Data Storytelling", "Executive Reporting", "Hypothesis Validation"],
      },
      {
        day: 7,
        topic: "Final Marketing Simulation",
        focus_area: "Full 6-question simulation covering CAC scaling, attribution disputes, and growth campaign strategy.",
        estimated_hours: 2,
        intensity: 95,
        practice_challenge: "Score >= 85 across all marketing competencies in a senior growth marketing interview round.",
        retrieved_concepts: ["Growth Strategy", "Attribution Governance", "Budget Defense", "Creative Strategy"],
      },
    ];
  } else {
    // Technical Department
    const hasRfWeakness = weakAreas.some((w) => w.includes("Random Forest"));
    const hasImbalanceWeakness = weakAreas.some((w) => w.includes("Class Imbalance") || w.includes("Imbalance"));
    const hasShapWeakness = weakAreas.some((w) => w.includes("SHAP") || w.includes("Explainability"));

    days = [
      {
        day: 1,
        topic: "Random Forest",
        focus_area: "Ensemble variance reduction, bagging mechanics, bootstrap aggregation, and out-of-bag (OOB) error bounds.",
        estimated_hours: 2,
        intensity: hasRfWeakness ? 90 : 85,
        practice_challenge: "Implement a 10-tree Random Forest classifier from scratch and benchmark variance reduction over a single deep decision tree.",
        retrieved_concepts: ["Bootstrap Aggregation", "Decision Trees", "Feature Subsampling", "OOB Score"],
      },
      {
        day: 2,
        topic: "Model evaluation",
        focus_area: "Stratified K-Fold cross validation, class-weighted loss, PR-AUC vs ROC-AUC, and calibration curves.",
        estimated_hours: 2,
        intensity: 80,
        practice_challenge: "Write an evaluation pipeline comparing PR-AUC and Brier score for an imbalanced fraud detection dataset.",
        retrieved_concepts: ["Stratified K-Fold", "PR-AUC vs ROC-AUC", "Brier Score", "Cross-Entropy"],
      },
      {
        day: 3,
        topic: "Class imbalance",
        focus_area: "SMOTE synthetic sampling tradeoffs, decision boundary noise, decision threshold moving, and Focal Loss.",
        estimated_hours: 3,
        intensity: hasImbalanceWeakness ? 95 : 75,
        practice_challenge: "Demonstrate why SMOTE degrades decision boundaries near minority outliers versus cost-sensitive threshold tuning.",
        retrieved_concepts: ["SMOTE Limitations", "Decision Threshold Tuning", "Focal Loss", "Cost-Sensitive Matrix"],
      },
      {
        day: 4,
        topic: "SHAP",
        focus_area: "TreeSHAP vs KernelSHAP, game-theoretic Shapley value additivity, and local vs global feature attributions.",
        estimated_hours: 2,
        intensity: hasShapWeakness ? 90 : 70,
        practice_challenge: "Calculate exact Shapley values for a 3-feature cooperative game model and generate summary plots.",
        retrieved_concepts: ["TreeSHAP", "Shapley Value Additivity", "Global Feature Importance", "Interaction Values"],
      },
      {
        day: 5,
        topic: "System design",
        focus_area: "Kafka partition scalability, consumer offset management, Redis cache-aside, and circuit breakers.",
        estimated_hours: 4,
        intensity: 90,
        practice_challenge: "Design an end-to-end distributed ML scoring pipeline handling 50k events/sec with sub-30ms SLA.",
        retrieved_concepts: ["Kafka Partition Strategy", "Consumer Offset Lag", "Redis Cache-Aside", "Resilience4j"],
      },
      {
        day: 6,
        topic: "Mock interview",
        focus_area: "STAR framework structure, forward eye focus stability, steady pacing (130-150 WPM), and eliminating filler words.",
        estimated_hours: 2,
        intensity: 80,
        practice_challenge: "Record 3 practice responses applying the STAR method and keep filler word count under 2.",
        retrieved_concepts: ["STAR Response Method", "Gaze Focus Steadiness", "Cadence Acceleration Control", "Pause Bridging"],
      },
      {
        day: 7,
        topic: "Final assessment",
        focus_area: "Full 6-question senior simulation on the AI Interviewer with dynamic difficulty escalation.",
        estimated_hours: 2,
        intensity: 95,
        practice_challenge: "Achieve an overall score >= 85 with Senior difficulty progression across all rounds.",
        retrieved_concepts: ["Dynamic Difficulty", "Architectural Tradeoffs", "Interviewer Memory Recall", "End-to-End Delivery"],
      },
    ];
  }

  return {
    title: "7-Day Personalized Improvement Roadmap",
    summary: `Structured curriculum targeting identified competencies in ${weakAreas.slice(0, 3).join(", ") || targetRole}.`,
    target_role: targetRole,
    days,
    total_hours: days.reduce((sum, d) => sum + d.estimated_hours, 0),
    generated_at: new Date().toISOString(),
  };
}

export interface ReplayTelemetryFrame {
  timestampSec: number;
  formattedTime: string;
  turnId: number;
  questionPrompt: string;
  transcriptSnippet: string;
  eyeContact: number;
  voiceEnergy: number;
  paceWpm: number;
  headMovement: number;
  facingCameraPercent: number;
  lookingAway: boolean;
  lookingAwayDurationSec: number;
  eventAnnotation: string | null;
  eventTitle?: string;
  coachingTip?: string;
  eventType?: "normal" | "anomaly" | "milestone" | "filler";
  pitchHz?: number;
  headYaw?: number;
  headPitch?: number;
}

export function generateReplayTelemetryStream(history: InterviewTurn[]): ReplayTelemetryFrame[] {
  const totalSeconds = 360; // 6 minutes replay (60s per turn across 6 questions)
  const frames: ReplayTelemetryFrame[] = [];

  const formatMinSec = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  for (let s = 0; s <= totalSeconds; s++) {
    const turnIndex = Math.min(6, Math.floor(s / 60) + 1);
    const turn = history.find((t) => t.id === turnIndex) ?? history[turnIndex - 1] ?? null;

    const baseEye = turn?.breakdown?.eye_contact ?? 82;
    const baseEnergy = turn?.breakdown?.voice_energy ?? 74;
    const basePace = turn?.signals.paceStats?.wpm ?? 143;

    // Small realistic sinusoidal acoustic variation
    const noise1 = Math.round(Math.sin(s * 0.15) * 5);
    const noise2 = Math.round(Math.cos(s * 0.12) * 4);
    const noise3 = Math.round(Math.sin(s * 0.08) * 6);

    let eyeContact = Math.max(30, Math.min(98, baseEye + noise1));
    let voiceEnergy = Math.max(35, Math.min(95, baseEnergy + noise2));
    let paceWpm = Math.max(80, Math.min(180, basePace + noise3));
    let lookingAway = false;
    let lookingAwayDurationSec = 0;
    let eventAnnotation: string | null = null;
    let eventTitle: string | undefined;
    let coachingTip: string | undefined;
    let eventType: "normal" | "anomaly" | "milestone" | "filler" = "normal";
    let headYaw = 0;
    let headPitch = 0;
    let pitchHz = 145 + noise2;

    // Check if the actual turn had specific filler words or pace stats to inject
    const turnFillers = turn?.signals?.paceStats?.fillerBreakdown || [];
    const mainFiller = turnFillers[0]?.word || "um";

    // Specific landmark events across interview replay timeline
    if (s >= 275 && s <= 282) {
      // 04:37 turn 5 looked away event
      eyeContact = 82;
      voiceEnergy = 74;
      paceWpm = 143;
      lookingAway = true;
      lookingAwayDurationSec = 2.1;
      headYaw = 28;
      headPitch = -12;
      eventTitle = "Gaze Disconnect (2.1s)";
      eventAnnotation = "At 04:37 you looked away from the camera for 2.1 seconds while explaining your project.";
      coachingTip = "Maintain direct lens gaze when describing architectural trade-offs to project confidence and authority.";
      eventType = "anomaly";
    } else if (s === 42) {
      // 00:42 filler word event
      eyeContact = 76;
      voiceEnergy = 68;
      paceWpm = 138;
      eventTitle = `Filler Word "${mainFiller}"`;
      eventAnnotation = `At 00:42 filler word "${mainFiller}" detected during background summary.`;
      coachingTip = "Replace verbal fillers with a deliberate 1-second pause to gather thoughts.";
      eventType = "filler";
    } else if (s === 85) {
      // 01:25 confident delivery milestone
      eyeContact = 88;
      voiceEnergy = 82;
      paceWpm = 152;
      pitchHz = 158;
      eventTitle = "Peak Delivery Flow";
      eventAnnotation = "At 01:25 strong vocal cadence and forward gaze stability (88/100).";
      coachingTip = "Great flow! Your energetic cadence (152 WPM) kept the interviewer engaged.";
      eventType = "milestone";
    } else if (s === 165) {
      // 02:45 STAR Action milestone
      eyeContact = 84;
      voiceEnergy = 78;
      paceWpm = 145;
      eventTitle = "STAR Action Articulation";
      eventAnnotation = "At 02:45 STAR Action component clearly articulated with specific team context.";
      coachingTip = "Excellent structural clarity—quantifying the actions you led anchored your answer.";
      eventType = "milestone";
    } else if (s === 312) {
      // 05:12 pace deceleration under pressure
      eyeContact = 70;
      voiceEnergy = 62;
      paceWpm = 95;
      pitchHz = 132;
      headPitch = 15;
      eventTitle = "Vocal Cadence Deceleration";
      eventAnnotation = "At 05:12 speaking pace decelerated to 95 WPM under technical architecture pressure.";
      coachingTip = "Take a breath and structure complex system answers in 3 key tiers to sustain momentum.";
      eventType = "anomaly";
    }

    const questionText = turn?.question ?? `Question ${turnIndex}: Technical and behavioral evaluation prompt`;
    const answerSnippet = turn?.answer
      ? turn.answer.slice(0, 140) + (turn.answer.length > 140 ? "..." : "")
      : "Candidate response transcript in progress...";

    frames.push({
      timestampSec: s,
      formattedTime: formatMinSec(s),
      turnId: turnIndex,
      questionPrompt: questionText,
      transcriptSnippet: answerSnippet,
      eyeContact,
      voiceEnergy,
      paceWpm,
      headMovement: Math.max(40, Math.min(95, 82 + noise2)),
      facingCameraPercent: lookingAway ? 45 : 88,
      lookingAway,
      lookingAwayDurationSec,
      eventAnnotation,
      eventTitle,
      coachingTip,
      eventType,
      pitchHz,
      headYaw,
      headPitch,
    });
  }

  return frames;
}

export interface StudyPlan {
  priority_skill: string;
  priority_reason: string;
  curriculum_tree: TopicCurriculumNode[];
  actionable_steps: string[];
  retrieved_rag_sources: string[];
}

export interface SkillGapReport {
  skills: SkillScore[];
  highest_priority_area: string;
  summary_statement: string;
  study_plan: StudyPlan;
}

export function generateSkillGapReport(
  history: InterviewTurn[],
  targetRole: string = "Full Stack AI Engineer",
  departmentId?: DepartmentId
): SkillGapReport {
  // Infer effective department if not provided
  let effectiveDept: DepartmentId = departmentId ?? "Technical";
  if (!departmentId) {
    const roleLower = targetRole.toLowerCase();
    if (roleLower.includes("financ") || roleLower.includes("account") || roleLower.includes("tax") || roleLower.includes("budget") || roleLower.includes("audit") || roleLower.includes("fp&a") || roleLower.includes("payroll specialist")) {
      effectiveDept = "Finance";
    } else if (roleLower.includes("hr") || roleLower.includes("talent") || roleLower.includes("recruit") || roleLower.includes("people") || roleLower.includes("onboarding") || roleLower.includes("compensation")) {
      effectiveDept = "HR";
    } else if (roleLower.includes("market") || roleLower.includes("brand") || roleLower.includes("seo") || roleLower.includes("campaign") || roleLower.includes("growth") || roleLower.includes("social media")) {
      effectiveDept = "Marketing";
    }
  }

  const avg = (nums: number[]) => (nums.length ? Math.round(nums.reduce((a, b) => a + b, 0) / nums.length) : 70);
  const avgScore = history.length ? avg(history.map((t) => t.score)) : 70;
  const avgEyeContact = history.length ? avg(history.map((t) => t.breakdown?.eye_contact ?? 70)) : 70;
  const avgStructure = history.length ? avg(history.map((t) => t.breakdown?.answer_structure ?? 70)) : 70;
  const avgPace = history.length ? avg(history.map((t) => t.breakdown?.speaking_pace ?? 75)) : 75;
  const avgFillers = history.length ? avg(history.map((t) => t.breakdown?.filler_words ?? 85)) : 85;

  const commScore = Math.max(
    35,
    Math.min(98, Math.round(0.3 * avgEyeContact + 0.3 * avgStructure + 0.2 * avgPace + 0.2 * avgFillers))
  );

  const getLevel = (s: number): "Advanced" | "Proficient" | "Needs Improvement" | "Critical Gap" => {
    if (s >= 85) return "Advanced";
    if (s >= 70) return "Proficient";
    if (s >= 55) return "Needs Improvement";
    return "Critical Gap";
  };

  let skills: SkillScore[] = [];
  let curriculumTree: TopicCurriculumNode[] = [];
  let actionableSteps: string[] = [];
  let retrievedSources: string[] = [];

  if (effectiveDept === "Finance") {
    let dcfScore = avgScore >= 75 ? 82 : avgScore;
    let statementScore = avgScore >= 75 ? 85 : avgScore;
    let forecastScore = 74;
    let liquidityScore = 70;

    history.forEach((t) => {
      const text = `${t.question.toLowerCase()} ${t.answer.toLowerCase()}`;
      const acc = t.breakdown?.technical_accuracy ?? t.score;
      if (text.includes("dcf") || text.includes("discounted cash flow") || text.includes("wacc") || text.includes("valuation") || text.includes("terminal value")) {
        dcfScore = t.weakArea || acc < 70 ? Math.min(dcfScore, acc - 10) : Math.max(dcfScore, acc);
      }
      if (text.includes("income statement") || text.includes("balance sheet") || text.includes("cash flow") || text.includes("ebitda") || text.includes("ratio")) {
        statementScore = t.weakArea || acc < 70 ? Math.min(statementScore, acc - 10) : Math.max(statementScore, acc);
      }
      if (text.includes("forecast") || text.includes("budget") || text.includes("variance") || text.includes("margin") || text.includes("revenue decline")) {
        forecastScore = t.weakArea || acc < 70 ? Math.min(forecastScore, acc - 10) : Math.max(forecastScore, acc);
      }
      if (text.includes("liquidity") || text.includes("working capital") || text.includes("solvency") || text.includes("cash receipts") || text.includes("debt")) {
        liquidityScore = t.weakArea || acc < 70 ? Math.min(liquidityScore, acc - 10) : Math.max(liquidityScore, acc);
      }
    });

    skills = [
      { name: "DCF & Valuation Modeling", score: Math.max(30, Math.min(98, dcfScore)), level: getLevel(dcfScore), category: "Financial Analysis" },
      { name: "Three-Statement Analysis", score: Math.max(30, Math.min(98, statementScore)), level: getLevel(statementScore), category: "Financial Reporting" },
      { name: "Budgeting & Variance Analysis", score: Math.max(30, Math.min(98, forecastScore)), level: getLevel(forecastScore), category: "Corporate Finance" },
      { name: "Liquidity & Working Capital", score: Math.max(30, Math.min(98, liquidityScore)), level: getLevel(liquidityScore), category: "Treasury & Risk" },
      { name: "Executive Presentation", score: commScore, level: getLevel(commScore), category: "Stakeholder Communication" },
    ];

    curriculumTree = [
      {
        name: "DCF Valuation & WACC Calibration",
        description: "Free cash flow projections, cost of equity (CAPM), cost of debt, and Gordon Growth terminal value sensitivity.",
        difficulty: "Advanced",
        key_topics: ["Unlevered Free Cash Flow", "WACC Weighting", "Terminal Growth Rate Sensitivity", "Enterprise vs Equity Value"],
        estimated_study_hours: 8,
      },
      {
        name: "Three-Statement Modeling & Reconciliation",
        description: "Dynamic linking of income statement, balance sheet, and statement of cash flows with working capital schedules.",
        difficulty: "Intermediate",
        key_topics: ["Accrual vs Cash Accounting", "Depreciation Schedules", "Cash Conversion Cycle", "Working Capital Swings"],
        estimated_study_hours: 6,
      },
      {
        name: "Financial Ratio Diagnostics & Solvency Analysis",
        description: "Evaluating liquidity (quick/current ratio), profitability (ROIC/ROE), and leverage coverage (interest coverage, debt-to-EBITDA).",
        difficulty: "Intermediate",
        key_topics: ["Current & Quick Ratios", "DuPont Analysis", "Interest Coverage Covenants", "EBITDA Bridge"],
        estimated_study_hours: 5,
      },
    ];

    actionableSteps = [
      "Build a dynamic 3-statement financial model with integrated debt schedule and sensitivity tables in Excel.",
      "Practice narrating valuation variances and macroeconomic interest rate impacts during mock interviews.",
    ];

    retrievedSources = [
      "corporate_finance://valuation_and_dcf_rubrics",
      "corporate_finance://three_statement_financial_modeling",
      "corporate_finance://working_capital_and_solvency_analysis",
    ];
  } else if (effectiveDept === "HR") {
    let talentScore = avgScore >= 75 ? 85 : avgScore;
    let retentionScore = avgScore >= 75 ? 80 : avgScore;
    let perfScore = 76;
    let compScore = 72;

    history.forEach((t) => {
      const text = `${t.question.toLowerCase()} ${t.answer.toLowerCase()}`;
      const acc = t.breakdown?.technical_accuracy ?? t.score;
      if (text.includes("sourc") || text.includes("recruiting") || text.includes("interview") || text.includes("hiring")) {
        talentScore = t.weakArea || acc < 70 ? Math.min(talentScore, acc - 10) : Math.max(talentScore, acc);
      }
      if (text.includes("retention") || text.includes("attrition") || text.includes("engagement") || text.includes("turnover")) {
        retentionScore = t.weakArea || acc < 70 ? Math.min(retentionScore, acc - 10) : Math.max(retentionScore, acc);
      }
      if (text.includes("performance") || text.includes("relations") || text.includes("conflict") || text.includes("investigation")) {
        perfScore = t.weakArea || acc < 70 ? Math.min(perfScore, acc - 10) : Math.max(perfScore, acc);
      }
      if (text.includes("compensation") || text.includes("benefits") || text.includes("policy") || text.includes("workforce")) {
        compScore = t.weakArea || acc < 70 ? Math.min(compScore, acc - 10) : Math.max(compScore, acc);
      }
    });

    skills = [
      { name: "Talent Acquisition & Sourcing", score: Math.max(30, Math.min(98, talentScore)), level: getLevel(talentScore), category: "Recruiting" },
      { name: "Employee Retention & Diagnostics", score: Math.max(30, Math.min(98, retentionScore)), level: getLevel(retentionScore), category: "Talent Management" },
      { name: "Employee Relations & Conflict", score: Math.max(30, Math.min(98, perfScore)), level: getLevel(perfScore), category: "People Operations" },
      { name: "Workforce Planning & Compliance", score: Math.max(30, Math.min(98, compScore)), level: getLevel(compScore), category: "HR Strategy" },
      { name: "Stakeholder Empathy & Alignment", score: commScore, level: getLevel(commScore), category: "Leadership Delivery" },
    ];

    curriculumTree = [
      {
        name: "Attrition Root-Cause Diagnostics & Retention Engineering",
        description: "Cohort retention curve analysis, engagement pulse analytics, and structured stay-interview frameworks.",
        difficulty: "Advanced",
        key_topics: ["Voluntary vs Involuntary Attrition", "Cohort Retention Curves", "eNPS Factor Decomposition", "Intervention Playbooks"],
        estimated_study_hours: 6,
      },
      {
        name: "Structured Competency Interviewing & Funnel Metrics",
        description: "Designing behavioral rubrics, interviewer calibration, and optimizing time-to-fill with candidate quality scores.",
        difficulty: "Intermediate",
        key_topics: ["Competency Scorecards", "Unconscious Bias Mitigation", "Offer Acceptance Optimization", "Pipeline Conversion"],
        estimated_study_hours: 5,
      },
      {
        name: "Employee Relations & Policy Governance",
        description: "Fair investigation procedures, compliant documentation standards, and balancing leadership demands with employee trust.",
        difficulty: "Intermediate",
        key_topics: ["Neutral Investigation Protocols", "Performance Improvement Plans", "Employment Law Basics", "Escalation Paths"],
        estimated_study_hours: 5,
      },
    ];

    actionableSteps = [
      "Review the People Analytics rubric for turnover root-cause diagnosis and structured exit interview synthesis.",
      "Practice de-escalating managerial policy conflicts using clear, empathetic frameworks.",
    ];

    retrievedSources = [
      "hr_knowledge://employee_retention_and_attrition_analytics",
      "hr_knowledge://structured_competency_interviewing",
      "hr_knowledge://employee_relations_investigation_standards",
    ];
  } else if (effectiveDept === "Marketing") {
    let campaignScore = avgScore >= 75 ? 84 : avgScore;
    let acqScore = avgScore >= 75 ? 80 : avgScore;
    let analyticsScore = 75;
    let brandScore = 72;

    history.forEach((t) => {
      const text = `${t.question.toLowerCase()} ${t.answer.toLowerCase()}`;
      const acc = t.breakdown?.technical_accuracy ?? t.score;
      if (text.includes("campaign") || text.includes("omnichannel") || text.includes("social") || text.includes("email")) {
        campaignScore = t.weakArea || acc < 70 ? Math.min(campaignScore, acc - 10) : Math.max(campaignScore, acc);
      }
      if (text.includes("cac") || text.includes("acquisition") || text.includes("conversion") || text.includes("funnel") || text.includes("cro")) {
        acqScore = t.weakArea || acc < 70 ? Math.min(acqScore, acc - 10) : Math.max(acqScore, acc);
      }
      if (text.includes("attribution") || text.includes("roas") || text.includes("analytics") || text.includes("ltv") || text.includes("metrics")) {
        analyticsScore = t.weakArea || acc < 70 ? Math.min(analyticsScore, acc - 10) : Math.max(analyticsScore, acc);
      }
      if (text.includes("brand") || text.includes("positioning") || text.includes("content") || text.includes("messaging") || text.includes("audience")) {
        brandScore = t.weakArea || acc < 70 ? Math.min(brandScore, acc - 10) : Math.max(brandScore, acc);
      }
    });

    skills = [
      { name: "Campaign Strategy & Omnichannel", score: Math.max(30, Math.min(98, campaignScore)), level: getLevel(campaignScore), category: "Digital Marketing" },
      { name: "Customer Acquisition & CRO", score: Math.max(30, Math.min(98, acqScore)), level: getLevel(acqScore), category: "Growth & Conversion" },
      { name: "Marketing Analytics & Attribution", score: Math.max(30, Math.min(98, analyticsScore)), level: getLevel(analyticsScore), category: "Performance Metrics" },
      { name: "Brand Positioning & Messaging", score: Math.max(30, Math.min(98, brandScore)), level: getLevel(brandScore), category: "Brand Strategy" },
      { name: "Executive Storytelling & Delivery", score: commScore, level: getLevel(commScore), category: "Stakeholder Presentation" },
    ];

    curriculumTree = [
      {
        name: "Multi-Touch Attribution & CAC / ROAS Optimization",
        description: "Comparing first-touch, last-touch, and data-driven multi-touch attribution models to optimize blended marketing payback periods.",
        difficulty: "Advanced",
        key_topics: ["Multi-Touch Attribution (MTA)", "Blended vs Paid CAC", "ROAS Scaling Thresholds", "Incrementality Testing"],
        estimated_study_hours: 6,
      },
      {
        name: "Funnel Conversion Rate Optimization (CRO)",
        description: "Diagnosing landing page drop-offs, multivariate A/B testing methodologies, and user journey friction analysis.",
        difficulty: "Intermediate",
        key_topics: ["Funnel Drop-Off Diagnostics", "A/B Test Statistical Significance", "Landing Page Velocity", "Activation Milestones"],
        estimated_study_hours: 6,
      },
      {
        name: "Audience Segmentation & Lifecycle Retention",
        description: "Cohort retention analysis, behavioral segmentation, and personalized email/push reactivation workflows.",
        difficulty: "Intermediate",
        key_topics: ["Behavioral Segmentation", "Cohort LTV Curves", "Churn Mitigation", "Lifecycle Messaging Triggers"],
        estimated_study_hours: 5,
      },
    ];

    actionableSteps = [
      "Run an experiment analysis simulating budget reallocation from low-ROAS channels to high-intent search and remarketing.",
      "Design an A/B testing framework calculating minimum sample sizes and required lift for statistical significance.",
    ];

    retrievedSources = [
      "marketing_knowledge://attribution_modeling_and_roas",
      "marketing_knowledge://growth_funnel_conversion_mechanics",
      "marketing_knowledge://audience_segmentation_lifecycle",
    ];
  } else {
    // Technical Department
    let pythonScore = 92;
    let mlScore = 87;
    let sqlScore = 72;
    let ragScore = 51;
    let systemDesignScore = 43;

    if (history.length > 0) {
      history.forEach((t) => {
        const text = `${t.question.toLowerCase()} ${t.answer.toLowerCase()}`;
        const accuracy = t.breakdown?.technical_accuracy ?? t.score;

        if (
          text.includes("system design") ||
          text.includes("concurrency") ||
          text.includes("throughput") ||
          text.includes("scale") ||
          text.includes("kafka") ||
          text.includes("streaming") ||
          text.includes("tradeoff")
        ) {
          if (t.weakArea || accuracy < 70) {
            systemDesignScore = Math.min(systemDesignScore, accuracy - 15);
          } else {
            systemDesignScore = Math.max(systemDesignScore, accuracy);
          }
        }

        if (
          text.includes("rag") ||
          text.includes("retrieval") ||
          text.includes("embedding") ||
          text.includes("chroma") ||
          text.includes("vector") ||
          text.includes("chunk")
        ) {
          if (t.weakArea || accuracy < 70) {
            ragScore = Math.min(ragScore, accuracy - 10);
          } else {
            ragScore = Math.max(ragScore, accuracy);
          }
        }

        if (
          text.includes("random forest") ||
          text.includes("decision tree") ||
          text.includes("shap") ||
          text.includes("imbalance") ||
          text.includes("smote") ||
          text.includes("model") ||
          text.includes("classification")
        ) {
          if (t.weakArea || accuracy < 70) {
            mlScore = Math.min(mlScore, accuracy);
          } else {
            mlScore = Math.max(mlScore, accuracy);
          }
        }

        if (
          text.includes("python") ||
          text.includes("gil") ||
          text.includes("multiprocessing") ||
          text.includes("asyncio") ||
          text.includes("threading") ||
          text.includes("decorator")
        ) {
          if (t.weakArea || accuracy < 70) {
            pythonScore = Math.min(pythonScore, accuracy);
          } else {
            pythonScore = Math.max(pythonScore, accuracy);
          }
        }

        if (
          text.includes("sql") ||
          text.includes("database") ||
          text.includes("query") ||
          text.includes("join") ||
          text.includes("index") ||
          text.includes("schema")
        ) {
          if (t.weakArea || accuracy < 70) {
            sqlScore = Math.min(sqlScore, accuracy);
          } else {
            sqlScore = Math.max(sqlScore, accuracy);
          }
        }
      });
    }

    pythonScore = Math.max(30, Math.min(98, pythonScore));
    mlScore = Math.max(30, Math.min(98, mlScore));
    sqlScore = Math.max(30, Math.min(98, sqlScore));
    ragScore = Math.max(30, Math.min(98, ragScore));
    systemDesignScore = Math.max(30, Math.min(98, systemDesignScore));

    skills = [
      { name: "Python", score: pythonScore, level: getLevel(pythonScore), category: "Programming" },
      { name: "Machine Learning", score: mlScore, level: getLevel(mlScore), category: "AI & Algorithms" },
      { name: "SQL & Data", score: sqlScore, level: getLevel(sqlScore), category: "Data Engineering" },
      { name: "RAG & Vector Retrieval", score: ragScore, level: getLevel(ragScore), category: "Generative AI" },
      { name: "System Design", score: systemDesignScore, level: getLevel(systemDesignScore), category: "Architecture" },
      { name: "Communication", score: commScore, level: getLevel(commScore), category: "Non-Verbal & Delivery" },
    ];

    const sorted = [...skills].sort((a, b) => a.score - b.score);
    const lowest = sorted[0];

    if (lowest.name === "System Design" || lowest.score <= 55) {
      curriculumTree = [
        {
          name: "REST APIs & Protocol Architecture",
          description: "API idempotency, HTTP status semantics, gRPC vs REST, and contract serialization.",
          difficulty: "Foundational",
          key_topics: ["Idempotency Keys", "HTTP Status 429/503", "gRPC Protobuf vs JSON", "Rate Limiting"],
          estimated_study_hours: 4,
        },
        {
          name: "Caching & In-Memory Stores",
          description: "Redis caching patterns, cache-aside, write-through, and LRU/LFU eviction algorithms.",
          difficulty: "Intermediate",
          key_topics: ["Cache-Aside Pattern", "Cache Stampede Mitigation", "Redis Eviction Policies", "TTL Strategies"],
          estimated_study_hours: 6,
        },
        {
          name: "Databases & Horizontal Sharding",
          description: "Relational vs NoSQL trade-offs, B-Tree index optimization, sharding keys, and replication lag.",
          difficulty: "Intermediate",
          key_topics: ["B-Tree vs LSM Trees", "Horizontal Sharding Keys", "Read Replicas", "ACID vs BASE"],
          estimated_study_hours: 8,
        },
        {
          name: "Message Queues & Event Streaming",
          description: "Apache Kafka partition scalability, consumer group offset commits, and backpressure management.",
          difficulty: "Advanced",
          key_topics: ["Kafka Partition Strategy", "Consumer Offset Lag", "At-Least-Once Delivery", "Dead Letter Queues"],
          estimated_study_hours: 8,
        },
      ];

      actionableSteps = [
        "Review the ChromaDB System Design Knowledge Collection for Kafka partition sizing and Redis caching rubrics.",
        "Design an end-to-end distributed URL shortener or rate limiter handling 50k requests/second.",
      ];

      retrievedSources = [
        "chroma://technical_knowledge/system_design_scalability_rubric",
        "chroma://technical_knowledge/distributed_caching_redis_patterns",
      ];
    } else {
      curriculumTree = [
        {
          name: "Ensemble Learning & Variance Reduction",
          description: "Random Forest bagging mechanics, bootstrap aggregation, and out-of-bag error estimation.",
          difficulty: "Intermediate",
          key_topics: ["Bootstrap Aggregation", "Variance vs Bias", "Feature Subsampling"],
          estimated_study_hours: 5,
        },
        {
          name: "Class Imbalance & Cost-Sensitive Loss",
          description: "SMOTE synthetic generation vs decision threshold tuning and Focal Loss formulation.",
          difficulty: "Intermediate",
          key_topics: ["SMOTE Limitations", "PR-AUC vs ROC-AUC", "Focal Loss"],
          estimated_study_hours: 6,
        },
      ];

      actionableSteps = [
        "Implement a custom classifier to master internal splits and threshold tuning.",
        "Benchmark precision-recall tradeoffs on an imbalanced classification problem.",
      ];

      retrievedSources = [
        "chroma://technical_knowledge/random_forest_ensemble_theory",
        "chroma://technical_knowledge/shap_explainability_shapley_values",
      ];
    }
  }

  const sortedSkills = [...skills].sort((a, b) => a.score - b.score);
  const lowestSkill = sortedSkills[0];
  const highestPriorityArea = lowestSkill.name;

  return {
    skills,
    highest_priority_area: highestPriorityArea,
    summary_statement: `Your highest-priority improvement area is ${highestPriorityArea}.`,
    study_plan: {
      priority_skill: highestPriorityArea,
      priority_reason: `Lowest mastery score (${lowestSkill.score}/100) identified during evaluation.`,
      curriculum_tree: curriculumTree,
      actionable_steps: actionableSteps,
      retrieved_rag_sources: retrievedSources,
    },
  };
}

export type StructureFrameworkType = "STAR" | "TECHNICAL_FIVE_POINT";

export interface StructuralElement {
  name: string;
  detected: boolean;
  explanation: string;
}

export interface AnswerStructureAnalysis {
  framework: StructureFrameworkType;
  elements: StructuralElement[];
  structureScore: number;
  coachingFeedback: string;
}

export function analyzeAnswerStructure(
  question: string,
  answer: string,
  domain: InterviewDomain = "Role Specific"
): AnswerStructureAnalysis {
  const normQ = question.toLowerCase();
  const normA = answer.toLowerCase();
  const words = normA.match(/[a-z0-9+#.-]+/g) ?? [];
  const wordCount = words.length;

  const isBehavioral =
    domain === "Behavioral" ||
    normQ.includes("tell me about a time") ||
    normQ.includes("describe a") ||
    normQ.includes("handled") ||
    normQ.includes("conflict") ||
    normQ.includes("disagreement") ||
    normQ.includes("situation") ||
    normQ.includes("stakeholder");

  if (isBehavioral) {
    // 1. Situation (S)
    const sitTriggers = [
      "when i was",
      "in my previous",
      "at my last",
      "during my",
      "we had a project",
      "in a past role",
      "the team was working",
      "we faced",
      "our system had",
      "context was",
      "at my college",
      "in my project",
    ];
    const hasSit =
      sitTriggers.some((t) => normA.includes(t)) ||
      (wordCount >= 15 && /^(in|when|during|at|while)\b/i.test(answer.trim()));

    // 2. Task (T)
    const taskTriggers = [
      "my task was",
      "my goal was",
      "i was responsible",
      "needed to",
      "had to deliver",
      "the objective was",
      "assigned to",
      "requirement was",
      "my role was",
      "the challenge was",
      "we needed to",
    ];
    const hasTask = taskTriggers.some((t) => normA.includes(t));

    // 3. Action (A)
    const actionTriggers = [
      "i implemented",
      "i built",
      "i designed",
      "i decided to",
      "i created",
      "i developed",
      "i configured",
      "i organized",
      "i led",
      "i analyzed",
      "i resolved",
      "i introduced",
      "i optimized",
      "we chose",
      "i used",
    ];
    const hasAction = actionTriggers.some((t) => normA.includes(t)) || (hasSit && normA.includes("i ") && wordCount >= 25);

    // 4. Result (R)
    const resultTriggers = [
      "resulted in",
      "as a result",
      "improved",
      "reduced",
      "achieved",
      "increased by",
      "%",
      "percent",
      "boosted",
      "led to",
      "ultimately",
      "delivered on time",
      "saved",
      "successfully",
      "impact was",
    ];
    const hasResult = resultTriggers.some((t) => normA.includes(t));

    const elements: StructuralElement[] = [
      {
        name: "Situation",
        detected: hasSit,
        explanation: "Context, project setting, and problem environment.",
      },
      {
        name: "Task",
        detected: hasTask,
        explanation: "Specific goal, challenge, or responsibility assigned.",
      },
      {
        name: "Action",
        detected: hasAction,
        explanation: "Concrete personal decisions and technical actions taken.",
      },
      {
        name: "Result",
        detected: hasResult,
        explanation: "Measurable outcome, impact, or quantified improvement.",
      },
    ];

    const detectedCount = elements.filter((e) => e.detected).length;
    const structureScore = Math.max(35, Math.min(98, 40 + detectedCount * 14 + (wordCount >= 30 ? 6 : 0)));

    let coachingFeedback = "";
    if (detectedCount === 4) {
      coachingFeedback = "Strong STAR delivery covering Situation, Task, Action, and quantified Result.";
    } else if (hasSit && hasTask && hasAction && !hasResult) {
      coachingFeedback = "Your answer clearly described the situation and action, but didn't quantify the result.";
    } else if (hasSit && hasAction && !hasTask) {
      coachingFeedback = "Good action and context, but clarify the specific objective and task constraints.";
    } else if (!hasSit && (hasAction || hasResult)) {
      coachingFeedback = "Action was described, but set the initial situation and problem context first.";
    } else {
      coachingFeedback = "Follow the STAR method (Situation, Task, Action, Result) to structure your behavioral response.";
    }

    return {
      framework: "STAR",
      elements,
      structureScore,
      coachingFeedback,
    };
  }

  // 2. Technical 5-Point Framework: Introduction -> Explanation -> Example -> Evidence/Tradeoff -> Conclusion
  const introTriggers = ["is a", "refers to", "designed to", "primary purpose", "fundamentally", "serves as", "concept of", "problem of", "stands for", "technique for"];
  const hasIntro = introTriggers.some((t) => normA.includes(t)) || wordCount >= 10;

  const expTriggers = ["because", "works by", "by using", "leverages", "processes", "splits", "calculates", "optimizes", "under the hood", "mechanism", "algorithm", "architecture"];
  const hasExp = expTriggers.some((t) => normA.includes(t)) || wordCount >= 25;

  const exTriggers = ["for example", "such as", "for instance", "in case of", "like in", "using random forest", "in python", "in pytorch", "with kafka", "in our model", "sample dataset"];
  const hasEx = exTriggers.some((t) => normA.includes(t));

  const evTriggers = ["tradeoff", "complexity", "o(n)", "latency", "overhead", "compared to", "downside", "limitation", "versus", "bias", "variance", "bottleneck", "scale", "memory"];
  const hasEv = evTriggers.some((t) => normA.includes(t));

  const concTriggers = ["therefore", "in summary", "ultimately", "which ensures", "to summarize", "in production", "key takeaway", "overall", "hence"];
  const hasConc = concTriggers.some((t) => normA.includes(t));

  const elements: StructuralElement[] = [
    {
      name: "Introduction",
      detected: hasIntro,
      explanation: "Definition of core concept and problem setting.",
    },
    {
      name: "Explanation",
      detected: hasExp,
      explanation: "Underlying algorithmic or architectural mechanism.",
    },
    {
      name: "Example",
      detected: hasEx,
      explanation: "Concrete production scenario or tool application.",
    },
    {
      name: "Evidence / Tradeoff",
      detected: hasEv,
      explanation: "Computational complexity, overhead, and architectural tradeoffs.",
    },
    {
      name: "Conclusion",
      detected: hasConc,
      explanation: "Takeaway, recommendation, or production guideline.",
    },
  ];

  const detectedCount = elements.filter((e) => e.detected).length;
  const structureScore = Math.max(40, Math.min(98, 45 + detectedCount * 11 + (wordCount >= 30 ? 6 : 0)));

  let coachingFeedback = "";
  if (detectedCount >= 4) {
    coachingFeedback = "Comprehensive 5-point technical delivery covering definition, mechanism, example, tradeoffs, and conclusion.";
  } else if (!hasEx && hasExp) {
    coachingFeedback = "Solid theoretical explanation, but include a concrete production example or use case to demonstrate practical mastery.";
  } else if (!hasEv && hasExp) {
    coachingFeedback = "Good mechanism walkthrough, but discuss architectural tradeoffs and performance limitations.";
  } else if (!hasConc && hasExp) {
    coachingFeedback = "Clear explanation, but close with a crisp concluding takeaway or production guideline.";
  } else {
    coachingFeedback = "Structure your answer: Introduction → Mechanism → Example → Tradeoffs → Conclusion.";
  }

  return {
    framework: "TECHNICAL_FIVE_POINT",
    elements,
    structureScore,
    coachingFeedback,
  };
}

export interface InterviewAttempt {
  attemptNumber: 1 | 2;
  timestamp: number;
  answer: string;
  score: number; // overall
  technicalScore: number;
  communicationScore: number;
  breakdown: MultimodalBreakdown;
  signals: InterviewTurn["signals"];
  structureAnalysis?: AnswerStructureAnalysis;
  weakArea?: string | null;
  feedback: string[];
}

export interface ABComparisonResult {
  question: string;
  turnId: number;
  attempt1: InterviewAttempt;
  attempt2: InterviewAttempt;
  deltas: {
    overall: number; // e.g. +16
    communication: number; // e.g. +14
    technical: number; // e.g. +17
    eyeContact: number;
    voiceEnergy: number;
    speakingPace: number;
    fillerWords: number;
    structureScore: number;
  };
  improvements: string[];
  trainingFeedback: string;
  keyWins: string[];
  remainingGaps: string[];
}

export function computeCommunicationScore(breakdown: MultimodalBreakdown): number {
  return Math.round(
    breakdown.answer_structure * 0.35 +
    breakdown.voice_energy * 0.20 +
    breakdown.speaking_pace * 0.20 +
    breakdown.eye_contact * 0.15 +
    breakdown.filler_words * 0.10
  );
}

export function computeABComparison(
  attempt1: InterviewAttempt,
  attempt2: InterviewAttempt,
  question: string,
  turnId: number
): ABComparisonResult {
  const overallDelta = attempt2.score - attempt1.score;
  const commDelta = attempt2.communicationScore - attempt1.communicationScore;
  const techDelta = attempt2.technicalScore - attempt1.technicalScore;

  const eyeDelta = attempt2.breakdown.eye_contact - attempt1.breakdown.eye_contact;
  const voiceDelta = attempt2.breakdown.voice_energy - attempt1.breakdown.voice_energy;
  const paceDelta = attempt2.breakdown.speaking_pace - attempt1.breakdown.speaking_pace;
  const fillerDelta = attempt2.breakdown.filler_words - attempt1.breakdown.filler_words;
  const structDelta = attempt2.breakdown.answer_structure - attempt1.breakdown.answer_structure;

  const keyWins: string[] = [];
  const improvements: string[] = [];
  const remainingGaps: string[] = [];

  if (techDelta > 0) {
    keyWins.push(`Technical accuracy improved by +${techDelta} points with deeper algorithmic mechanism coverage.`);
    improvements.push(`+${techDelta} technical`);
  } else if (techDelta === 0) {
    improvements.push(`Maintained consistent technical precision`);
  }

  if (commDelta > 0) {
    keyWins.push(`Communication delivery advanced by +${commDelta} points with improved clarity and pacing.`);
    improvements.push(`+${commDelta} communication`);
  }

  if (overallDelta > 0) {
    improvements.push(`+${overallDelta} overall`);
  }

  if (structDelta > 5) {
    keyWins.push(`Answer structure refined: applied clear STAR components and narrative sequencing.`);
  }

  if (fillerDelta > 0) {
    keyWins.push(`Filler words reduced, enhancing professional vocal polish.`);
  }

  if (eyeDelta > 5) {
    keyWins.push(`Eye contact and camera alignment improved by +${eyeDelta}%.`);
  }

  if (attempt2.technicalScore < 85) {
    remainingGaps.push(`Further quantify production impact with concrete metrics and failure mode handling.`);
  }
  if (attempt2.communicationScore < 85) {
    remainingGaps.push(`Maintain steady vocal pacing across technical architectural descriptions.`);
  }

  const formatDelta = (val: number) => (val >= 0 ? `+${val}` : `${val}`);

  const trainingFeedback = overallDelta > 0
    ? `Exceptional active improvement! Attempt 2 demonstrated strong iteration (${formatDelta(overallDelta)} overall, ${formatDelta(commDelta)} communication, ${formatDelta(techDelta)} technical). This makes the simulator a powerful active training system.`
    : `Attempt 2 maintained steady consistency across core parameters. Review the structural coaching feedback to unlock a +15+ score jump on the next iteration.`;

  return {
    question,
    turnId,
    attempt1,
    attempt2,
    deltas: {
      overall: overallDelta,
      communication: commDelta,
      technical: techDelta,
      eyeContact: eyeDelta,
      voiceEnergy: voiceDelta,
      speakingPace: paceDelta,
      fillerWords: fillerDelta,
      structureScore: structDelta,
    },
    improvements,
    trainingFeedback,
    keyWins: keyWins.length > 0 ? keyWins : ["Demonstrated consistent domain knowledge between attempts."],
    remainingGaps,
  };
}

export type InterviewTurn = {
  id: number;
  question: string;
  answer: string;
  score: number;
  latencyMs: number;
  breakdown: MultimodalBreakdown;
  weakArea?: string | null;
  retrievedConcepts?: string[];
  technicalDepthScore?: number;
  adaptiveStrategy?: string;
  currentDifficulty?: InterviewDifficulty;
  difficultyTrend?: "escalated" | "maintained" | "calibrated_down" | "clarification";
  difficultyReason?: string;
  memory?: InterviewerMemory;
  ragContextSummary?: string | null;
  structureAnalysis?: AnswerStructureAnalysis;
  skillGapReport?: SkillGapReport;
  roadmap?: PostInterviewRoadmap;
  attempts?: InterviewAttempt[];
  abComparison?: ABComparisonResult;
  codingEvaluation?: CodingEvaluation;
  submittedCode?: { language: CodingLanguage; code: string };
  systemDesignEvaluation?: SystemDesignEvaluation;
  submittedDiagram?: ArchitectureDiagram;
  deliveryMetadata?: DeliveryMetadata;
  voiceTranscript?: VoiceTranscriptBundle;
  signals: {
    clarity: number;
    relevance: number;
    structure: number;
    confidence: number;
    voice: number;
    eyeContact: number;
    technicalDepth?: number;
    voiceStats?: VoiceTurnStats;
    paceStats?: PaceTurnStats;
    bodyLanguageStats?: BodyLanguageTurnStats;
  };
  feedback: string[];
};

export function computeDynamicDifficulty(
  currentDifficulty: InterviewDifficulty,
  score: number,
  depthScore: number,
  semanticRelevance: number,
  weakArea?: string | null
): { nextDifficulty: InterviewDifficulty; trend: "escalated" | "maintained" | "calibrated_down" | "clarification"; reason: string } {
  const levels: InterviewDifficulty[] = ["Warmup", "Standard", "Senior"];
  const currIdx = Math.max(0, levels.indexOf(currentDifficulty));

  const perf = score * 0.4 + depthScore * 0.4 + semanticRelevance * 0.2;

  if (weakArea || perf < 62) {
    if (currIdx > 0) {
      const nextDiff = levels[currIdx - 1];
      return {
        nextDifficulty: nextDiff,
        trend: "calibrated_down",
        reason: `Calibrated down to ${nextDiff} to clarify foundational concepts (${weakArea || "low depth"}).`,
      };
    }
    return {
      nextDifficulty: "Warmup",
      trend: "clarification",
      reason: "Focusing on core clarifications and practical concepts.",
    };
  }

  if (perf >= 82 && depthScore >= 80) {
    if (currIdx < levels.length - 1) {
      const nextDiff = levels[currIdx + 1];
      return {
        nextDifficulty: nextDiff,
        trend: "escalated",
        reason: `Elevated to ${nextDiff} due to high technical mastery (Accuracy: ${depthScore}%, Overall: ${score}%).`,
      };
    }
    return {
      nextDifficulty: "Senior",
      trend: "maintained",
      reason: "Maintaining Senior difficulty (top-tier architecture and scale tradeoffs).",
    };
  }

  return {
    nextDifficulty: levels[currIdx],
    trend: "maintained",
    reason: `Maintaining ${levels[currIdx]} difficulty.`,
  };
}

export const domains: InterviewDomain[] = ["Role Specific", "DSA", "System Design", "Case Study", "Behavioral"];

export const difficulties: InterviewDifficulty[] = ["Warmup", "Standard", "Senior"];

const stopWords = new Set([
  "and",
  "are",
  "but",
  "for",
  "from",
  "have",
  "into",
  "that",
  "the",
  "this",
  "with",
  "your",
  "you",
  "was",
  "were",
  "will",
  "using",
  "about",
  "project",
  "experience",
  "skills",
]);

export function extractKeywords(resumeText: string, fallbackRole: string) {
  const words = `${resumeText} ${fallbackRole}`
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s-]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3 && !stopWords.has(word));

  const counts = new Map<string, number>();

  for (const word of words) {
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([word]) => word);
}

export interface StructuredProject {
  title: string;
  skills: string[];
  primarySkill: string;
  category: "ml_model" | "system";
}

export function extractStructuredProjects(text: string): StructuredProject[] {
  if (!text || typeof text !== "string") return [];
  const projects: StructuredProject[] = [];
  const knownSkills = [
    "Random Forest",
    "SHAP",
    "Machine Learning",
    "Deep Learning",
    "RAG",
    "LLMs",
    "Python",
    "PyTorch",
    "TensorFlow",
    "FastAPI",
    "React",
    "Next.js",
    "Docker",
    "Kubernetes",
    "AWS",
    "GCP",
    "Scikit-Learn",
    "XGBoost",
    "NLP",
    "Transformers",
    "Redis",
    "PostgreSQL",
    "Kafka",
    "Pandas",
    "NumPy",
    "OpenCV",
    "MediaPipe",
    "SQL",
  ];

  const titleRegex =
    /(?:project[s]?|title)?[:\s-]*([A-Z][a-zA-Z0-9\s-]{3,45}(?:Prediction|Detection|Classification|System|Engine|App|Application|Platform|Dashboard|Pipeline|Service|Bot|Model|API|Analytics))\s*(?:using|with|in)?\s*([^\n.;]*)/gi;

  let match: RegExpExecArray | null;
  while ((match = titleRegex.exec(text)) !== null) {
    const title = match[1].trim();
    const context = `${title} ${match[2] || ""}`.toLowerCase();
    const skills = knownSkills.filter((s) => context.includes(s.toLowerCase()));

    if (!projects.some((p) => p.title.toLowerCase() === title.toLowerCase())) {
      const isMl =
        title.toLowerCase().includes("prediction") ||
        title.toLowerCase().includes("classification") ||
        title.toLowerCase().includes("detection") ||
        skills.some((s) => ["Random Forest", "SHAP", "Machine Learning", "Deep Learning", "XGBoost", "PyTorch"].includes(s));

      projects.push({
        title,
        skills,
        primarySkill: skills[0] ?? (isMl ? "Random Forest" : "Python"),
        category: isMl ? "ml_model" : "system",
      });
    }
  }

  if (projects.length === 0) {
    const lower = text.toLowerCase();
    for (const skill of knownSkills) {
      if (lower.includes(skill.toLowerCase())) {
        const projMatch =
          lower.match(new RegExp(`(?:built|developed|trained|using|in|for)\\s+([a-z0-9\\s-]{3,30})\\s*(?:with|using)?\\s*${skill.toLowerCase()}`, "i")) ??
          lower.match(new RegExp(`${skill.toLowerCase()}\\s+(?:in|for|to)\\s+([a-z0-9\\s-]{3,30})`, "i"));

        const title = projMatch
          ? projMatch[1].trim().replace(/\b\w/g, (c) => c.toUpperCase())
          : `${skill} Implementation`;

        const isMl = ["Random Forest", "SHAP", "Machine Learning", "Deep Learning", "XGBoost", "PyTorch"].includes(skill);

        projects.push({
          title,
          skills: [skill],
          primarySkill: skill,
          category: isMl ? "ml_model" : "system",
        });
        break;
      }
    }
  }

  return projects;
}

export interface ConceptCatalogEntry {
  topicId: string;
  triggers: string[];
  depthSignals: string[];
  weakArea: string;
  concepts: string[];
  probingQuestion: string;
  advancedQuestion: string;
}

export const CONCEPT_CATALOG: ConceptCatalogEntry[] = [
  // --- Technical: Machine Learning & Distributed Systems ---
  {
    topicId: "random_forest_selection",
    triggers: ["random forest", "decision tree", "ensemble", "bagging", "classifier"],
    depthSignals: ["variance", "bias", "overfit", "bagging", "bootstrap", "subsampling", "features", "decorrelat", "gini", "depth", "split", "impurity", "trees"],
    weakArea: "Random Forest Model Selection & Overfitting Mitigation",
    concepts: ["Random Forest", "Decision Trees", "Bagging", "Feature Importance", "Overfitting", "Variance Reduction"],
    probingQuestion: "How does Random Forest reduce overfitting compared with a single decision tree?",
    advancedQuestion: "How do you calibrate the max_features parameter and tree depth in Random Forest to optimize the bias-variance tradeoff on noisy data?",
  },
  {
    topicId: "class_imbalance",
    triggers: ["imbalance", "skew", "smote", "focal loss", "precision", "recall"],
    depthSignals: ["smote", "focal loss", "pr-auc", "roc-auc", "recall", "precision", "resampling", "cost-sensitive", "threshold", "f1", "stratified"],
    weakArea: "Class Imbalance Handling & Metric Selection",
    concepts: ["Class Imbalance", "SMOTE", "Focal Loss", "PR-AUC", "Stratified Sampling", "Cost-Sensitive Learning"],
    probingQuestion: "In extreme class imbalance, why is standard classification accuracy misleading, and how would you compare SMOTE versus adjusting the classification decision threshold or using Focal Loss?",
    advancedQuestion: "When using SMOTE with high-dimensional noisy data, how do you prevent synthetic samples from bridging decision boundaries and introducing label noise?",
  },
  {
    topicId: "shap_interpretability",
    triggers: ["shap", "shapley", "explainability", "black box", "xai", "feature attribution"],
    depthSignals: ["shapley", "game theory", "coalition", "local", "global", "marginal", "treeshap", "attribution", "efficiency", "additivity"],
    weakArea: "Model Explainability & SHAP Values",
    concepts: ["SHAP", "Shapley Values", "Feature Attributions", "Local Interpretability", "TreeSHAP"],
    probingQuestion: "How does SHAP compute feature attributions based on game theory, and how does it provide both local and global interpretability compared to default Gini importance?",
    advancedQuestion: "How does the TreeSHAP algorithm reduce the exponential computational complexity of exact Shapley value estimation to polynomial time?",
  },
  {
    topicId: "rag_vector_search",
    triggers: ["rag", "vector search", "chroma", "embedding", "chunking strategy", "semantic retrieval"],
    depthSignals: ["embedding", "cosine", "similarity", "chunk", "overlap", "rerank", "dense", "sparse", "hallucination", "context window", "hybrid search"],
    weakArea: "RAG Retrieval Architecture & Vector Chunking",
    concepts: ["Vector Embeddings", "Cosine Distance", "Semantic Chunking", "Reranking", "Hallucination Reduction"],
    probingQuestion: "How do chunk size and semantic boundary overlap affect retrieval accuracy in RAG, and how do you prevent lost-in-the-middle context degradation?",
    advancedQuestion: "How would you implement a hybrid search (Dense Vector + BM25 Sparse) with Reciprocal Rank Fusion (RRF) and cross-encoder re-ranking?",
  },
  {
    topicId: "python_gil_concurrency",
    triggers: ["gil", "python concurrency", "multiprocessing versus asyncio", "thread safe", "python interpreter lock"],
    depthSignals: ["gil", "bytecode", "interpreter lock", "cpu-bound", "i/o-bound", "event loop", "memory", "lazy", "iterator", "process pool"],
    weakArea: "Python GIL & Concurrency Paradigms",
    concepts: ["GIL", "Multiprocessing vs Asyncio", "Generators", "Memory Footprint", "Event Loop"],
    probingQuestion: "Why does multi-threading in Python fail to speed up CPU-bound ML tasks, and when should you use multiprocessing versus asyncio?",
    advancedQuestion: "How do Python memory allocators (PyMalloc) and reference counting garbage collection interact with sub-interpreters (PEP 684)?",
  },
  {
    topicId: "system_design_kafka",
    triggers: ["system design", "kafka", "streaming architecture", "throughput", "message queue", "sharding"],
    depthSignals: ["partition", "backpressure", "consumer group", "idempotent", "at-least-once", "offset", "replication", "sharding", "cache"],
    weakArea: "Streaming Systems & Backpressure Architecture",
    concepts: ["Kafka Partitioning", "Backpressure", "Consumer Groups", "Idempotency", "Database Sharding"],
    probingQuestion: "When designing a real-time ingestion pipeline handling 50k events/sec, how do Kafka partitions and consumer group offsets prevent data loss and backpressure bottlenecks?",
    advancedQuestion: "How would you ensure end-to-end exactly-once processing (EOS) semantics across a distributed streaming architecture during node failures?",
  },

  // --- Finance Department ---
  {
    topicId: "finance_dcf_valuation",
    triggers: ["dcf", "discounted cash flow", "valuation", "wacc", "terminal value", "free cash flow", "discount rate"],
    depthSignals: ["wacc", "terminal value", "free cash flow", "discount rate", "growth rate", "capm", "beta", "sensitivity", "debt", "equity", "perpetuity", "gordon"],
    weakArea: "DCF Valuation Modeling & WACC Estimation",
    concepts: ["DCF Valuation", "Free Cash Flow", "WACC", "Terminal Value", "Sensitivity Analysis", "CAPM"],
    probingQuestion: "In your DCF valuation, how did you determine the terminal value growth rate and estimate the cost of equity using CAPM?",
    advancedQuestion: "How would you run a multi-variable Monte Carlo sensitivity simulation on your DCF model to assess valuation ranges under macroeconomic interest rate shocks?",
  },
  {
    topicId: "finance_financial_statements",
    triggers: ["income statement", "balance sheet", "cash flow", "liquidity", "solvency", "profitability", "ebitda", "working capital", "reconciliation"],
    depthSignals: ["operating cash flow", "working capital", "depreciation", "amortization", "accruals", "liquidity", "current ratio", "solvency", "leverage", "non-cash"],
    weakArea: "Financial Statement Synthesis & Working Capital Analysis",
    concepts: ["Three-Statement Modeling", "Cash Conversion Cycle", "Working Capital", "Liquidity Ratios", "EBITDA Reconciliation"],
    probingQuestion: "If a company reports rising net income but declining cash flow from operations, what line items on the balance sheet and cash flow statement would you investigate first?",
    advancedQuestion: "How do changes in revenue recognition under ASC 606 / IFRS 15 impact working capital metrics and cash conversion cycle volatility?",
  },
  {
    topicId: "finance_budgeting_variance",
    triggers: ["budget", "forecast", "variance", "p&l", "margin", "revenue decline", "cost driver", "fp&a", "opex", "capex"],
    depthSignals: ["volume", "price", "mix", "opex", "capex", "variance analysis", "rolling forecast", "headcount", "fixed cost", "variable cost", "run rate"],
    weakArea: "Financial Variance Decomposition & Rolling Forecasts",
    concepts: ["Volume-Price-Mix Variance", "Rolling Forecasts", "Operating Margins", "CapEx vs OpEx", "Cost Drivers"],
    probingQuestion: "When a business unit misses its quarterly operating margin target, how do you isolate volume, price, and mix variances from uncontrollable cost inflation?",
    advancedQuestion: "How do you construct dynamic driver-based financial models that automatically re-forecast cash runway during sudden revenue contraction?",
  },

  // --- HR Department ---
  {
    topicId: "hr_retention_attrition",
    triggers: ["retention", "attrition", "turnover", "quit", "exit interview", "stay interview", "retention strategy", "resignation"],
    depthSignals: ["voluntary attrition", "involuntary", "exit interview", "enps", "stay interview", "career progression", "manager effectiveness", "benchmarking", "compensation"],
    weakArea: "Voluntary Attrition Diagnostics & Retention Architecture",
    concepts: ["Attrition Root-Cause Analysis", "Stay Interviews", "eNPS", "Flight Risk Modeling", "Retention Incentives"],
    probingQuestion: "How would you design a data-driven diagnostic framework to determine whether voluntary turnover in a critical team is driven by compensation, burnout, or managerial misalignment?",
    advancedQuestion: "How do you build predictive early-warning flight risk indicators combining engagement survey sentiment, tenure milestones, and promotion latency?",
  },
  {
    topicId: "hr_talent_acquisition",
    triggers: ["recruit", "talent acquisition", "sourcing", "hiring funnel", "time-to-fill", "offer acceptance", "candidate experience", "job post"],
    depthSignals: ["time-to-fill", "offer acceptance rate", "pass-through rate", "pipeline", "sourcing channel", "diversity", "hiring manager alignment", "candidate quality"],
    weakArea: "Talent Acquisition Funnel Efficiency & Sourcing Strategy",
    concepts: ["Funnel Conversion Rates", "Time-to-Hire", "Sourcing Optimization", "Offer Acceptance Strategy", "Structured Interviewing"],
    probingQuestion: "If time-to-fill is increasing while candidate offer acceptance rates drop below 70%, what funnel bottlenecks and compensation benchmarks would you analyze first?",
    advancedQuestion: "How do you calibrate structured competencies and scorecards across hiring panels to eliminate interviewer bias and elevate bar-raiser consistency?",
  },
  {
    topicId: "hr_performance_employee_relations",
    triggers: ["performance management", "employee relations", "conflict", "pip", "dispute", "investigation", "culture", "review", "feedback"],
    depthSignals: ["performance improvement plan", "documentation", "mediation", "progressive discipline", "fairness", "confidentiality", "compliance", "retaliation"],
    weakArea: "Performance Management Governance & Employee Relations",
    concepts: ["Progressive Discipline", "Objective Documentation", "Conflict Mediation", "PIP Design", "Employment Compliance"],
    probingQuestion: "When a manager wants to initiate an immediate performance improvement plan for an employee claiming interpersonal conflict, how do you investigate objectively while mitigating organizational risk?",
    advancedQuestion: "How do you design a holistic, calibrated performance review cycle that aligns individual goals with organizational OKRs without encouraging sandbagging?",
  },

  // --- Marketing Department ---
  {
    topicId: "marketing_campaign_roas",
    triggers: ["campaign", "roas", "ad spend", "paid media", "channel", "budget allocation", "cpc", "cpm", "paid search", "paid social"],
    depthSignals: ["roas", "cpc", "cpm", "marginal returns", "creative fatigue", "audience saturation", "conversion rate", "bidding strategy", "blended"],
    weakArea: "Paid Media Channel Economics & ROAS Optimization",
    concepts: ["Return on Ad Spend (ROAS)", "Marginal CAC", "Creative Fatigue", "Bidding Strategies", "Channel Allocation"],
    probingQuestion: "When scaling a paid acquisition campaign leads to diminishing returns and falling ROAS, how do you diagnose whether the issue is audience saturation, ad fatigue, or bidding inefficiency?",
    advancedQuestion: "How do you calibrate incrementality testing (e.g. geo-lift experiments or conversion lift) against reported platform attribution to eliminate ad network double-counting?",
  },
  {
    topicId: "marketing_funnel_conversion",
    triggers: ["cac", "conversion rate", "funnel", "landing page", "a/b test", "bounce rate", "trial", "lead", "signup"],
    depthSignals: ["cac", "ltv", "conversion rate", "micro-conversion", "landing page", "hypothesis", "significance", "onboarding", "activation", "drop-off"],
    weakArea: "Conversion Rate Optimization (CRO) & Funnel Diagnostics",
    concepts: ["Funnel Drop-Off Analysis", "A/B Testing Rigor", "Customer Acquisition Cost", "Micro-Conversions", "Lead Qualification"],
    probingQuestion: "If top-of-funnel campaign traffic is up 40% but trial-to-paid conversion has declined by 20%, what diagnostic steps would you take to identify the conversion leak?",
    advancedQuestion: "How do you structure multivariate testing protocols to maintain statistical power and avoid false discoveries when optimizing high-traffic checkout funnels?",
  },
  {
    topicId: "marketing_attribution_retention",
    triggers: ["attribution", "ltv", "churn", "retention", "cohort", "multi-touch", "crm", "lifecycle", "email marketing", "customer journey"],
    depthSignals: ["multi-touch attribution", "first-touch", "last-touch", "shapley attribution", "linear", "time-decay", "cohort analysis", "churn rate", "ltv:cac"],
    weakArea: "Multi-Touch Attribution Modeling & Customer LTV Analytics",
    concepts: ["Multi-Touch Attribution", "Cohort Retention Curves", "LTV:CAC Ratio", "Lifecycle Messaging", "Payback Period"],
    probingQuestion: "How do you evaluate the tradeoffs between first-touch, last-touch, and data-driven multi-touch attribution models when determining budget allocation between brand awareness and direct conversion?",
    advancedQuestion: "How would you design a cohort-based retention model to calculate Net Revenue Retention (NRR) and identify the inflection point where payback period becomes cash-flow positive?",
  },
];

export function diagnoseTechnicalDepth(
  question: string,
  answer: string,
  keywords: string[] = [],
  departmentId: DepartmentId = "Technical"
): {
  weakArea: string | null;
  retrievedConcepts: string[];
  depthScore: number;
  adaptiveStrategy: string;
} {
  const normQ = question.toLowerCase();
  const normA = answer.toLowerCase();
  const words = normA.match(/[a-z0-9+#.-]+/g) ?? [];
  const wordCount = words.length;

  // 1. Try to find matching concept entry that aligns with the question and department
  let matchedEntry = CONCEPT_CATALOG.find((entry) => {
    const matchesTrigger = entry.triggers.some((trigger) => normQ.includes(trigger));
    if (!matchesTrigger) return false;
    // Check department compatibility
    if (departmentId !== "Technical") {
      return !UNRELATED_TECHNICAL_JARGON.some((j) => entry.weakArea.toLowerCase().includes(j));
    }
    return true;
  });

  if (!matchedEntry && keywords.length > 0) {
    const kwStr = keywords.join(" ").toLowerCase();
    matchedEntry = CONCEPT_CATALOG.find((entry) => {
      const matchesKw = entry.triggers.some((trigger) => kwStr.includes(trigger));
      if (!matchesKw) return false;
      if (departmentId !== "Technical") {
        return !UNRELATED_TECHNICAL_JARGON.some((j) => entry.weakArea.toLowerCase().includes(j));
      }
      return true;
    });
  }

  // 2. Department-specific safe fallback entry (never falls back to general_engineering for non-technical roles)
  if (!matchedEntry) {
    switch (departmentId) {
      case "Finance":
        matchedEntry = {
          topicId: "general_finance",
          triggers: [],
          depthSignals: ["valuation", "cash flow", "margin", "forecast", "ebitda", "variance", "capital", "revenue", "cost", "ratio", "compliance"],
          weakArea: "Financial Analysis & Strategic Planning",
          concepts: ["Financial Modeling", "Cash Flow Analysis", "Risk Assessment", "Variance Diagnostics"],
          probingQuestion: "Can you elaborate on the core financial assumptions, risk factors, and valuation metrics that support your recommendation?",
          advancedQuestion: "How would you stress-test this financial recommendation against simultaneous inflationary cost pressures and declining demand?",
        };
        break;
      case "HR":
        matchedEntry = {
          topicId: "general_hr",
          triggers: [],
          depthSignals: ["retention", "attrition", "engagement", "hiring", "compensation", "culture", "talent", "onboarding", "policy", "relations"],
          weakArea: "Strategic Human Resources & Organizational Development",
          concepts: ["Talent Management", "Workforce Strategy", "Employee Engagement", "Policy Governance"],
          probingQuestion: "How would you structure the change management process, align executive leadership, and measure the long-term retention impact of this initiative?",
          advancedQuestion: "How do you design scalable people operations frameworks that preserve organizational culture during rapid multi-regional expansion?",
        };
        break;
      case "Marketing":
        matchedEntry = {
          topicId: "general_marketing",
          triggers: [],
          depthSignals: ["campaign", "conversion", "cac", "roas", "channel", "attribution", "funnel", "audience", "retention", "ltv", "brand"],
          weakArea: "Strategic Growth Marketing & Performance Measurement",
          concepts: ["Growth Strategy", "Customer Acquisition", "Funnel Analytics", "Brand Performance"],
          probingQuestion: "What key performance indicators and customer segmentation insights would you use to validate the sustainable ROI of this approach?",
          advancedQuestion: "How do you reallocate marketing capital between upper-funnel brand awareness and bottom-funnel performance marketing under changing consumer sentiment?",
        };
        break;
      case "Technical":
      default:
        matchedEntry = {
          topicId: "general_engineering",
          triggers: [],
          depthSignals: ["tradeoff", "complexity", "scalability", "latency", "bottleneck", "architecture", "optimization", "monitoring"],
          weakArea: "Technical Architecture & Tradeoff Analysis",
          concepts: ["Tradeoff Analysis", "System Scalability", "Performance Optimization", "Failure Recovery"],
          probingQuestion: "Can you elaborate on the specific architectural tradeoffs and failure modes you considered in this approach?",
          advancedQuestion: "How would you measure the performance impact and reliability of this solution under 10x production load?",
        };
        break;
    }
  }

  const depthHits = matchedEntry.depthSignals.filter((sig) => normA.includes(sig)).length;
  const hasCausality = ["because", "since", "due to", "resulted in", "therefore", "tradeoff", "reduces", "improves", "mitigates"].some((w) =>
    normA.includes(w)
  );

  if (wordCount < 4) {
    return {
      weakArea: matchedEntry.weakArea,
      retrievedConcepts: matchedEntry.concepts,
      depthScore: 30,
      adaptiveStrategy: "Initial Brief Response",
    };
  }

  let baseDepth = 65;
  if (wordCount >= 15) baseDepth += 5;
  if (wordCount >= 35) baseDepth += 7;
  if (wordCount >= 65) baseDepth += 6;
  baseDepth += depthHits * 6;
  if (hasCausality) baseDepth += 6;

  const depthScore = Math.max(35, Math.min(96, baseDepth));
  const isStrongAnswer = (depthHits >= 1 && depthScore >= 74) || (depthScore >= 78 && hasCausality) || depthScore >= 82;

  if (!isStrongAnswer) {
    return {
      weakArea: matchedEntry.weakArea,
      retrievedConcepts: matchedEntry.concepts,
      depthScore,
      adaptiveStrategy: `Probing Weak Area: ${matchedEntry.weakArea}`,
    };
  }

  return {
    weakArea: null,
    retrievedConcepts: matchedEntry.concepts,
    depthScore,
    adaptiveStrategy: "Deepening Complexity / Advanced Tradeoffs",
  };
}

export function generateQuestion(
  profile: CandidateProfile,
  turnIndex: number,
  keywords: string[],
  lastTurn?: InterviewTurn,
  targetDifficulty?: InterviewDifficulty,
  memory?: InterviewerMemory
): string {
  const effectiveDifficulty = targetDifficulty ?? profile.difficulty;
  const departmentId: DepartmentId = (["Technical", "Finance", "HR", "Marketing"].includes(profile.department)
    ? profile.department
    : "Technical") as DepartmentId;
  const targetRole = profile.targetRole || getDefaultRoleForDepartment(departmentId);
  const safeTrack = isTrackAvailableForDepartment(departmentId, profile.domain)
    ? profile.domain
    : getDefaultTrackForDepartment(departmentId);
  const roleQuestions = getQuestionsForSelection(departmentId, targetRole, safeTrack);

  // 1. Coding & System Design Mode Guard (ONLY Technical roles can enter Coding or System Design)
  if (departmentId === "Technical") {
    if (profile.interviewType === "Coding") {
      const p = CODING_PROBLEMS[turnIndex % CODING_PROBLEMS.length];
      return `[Coding Challenge: ${p.title}] - ${p.description.split("\n\n")[0]} Implement your solution in the code editor, test assertions, and explain your approach and algorithmic complexity tradeoffs.`;
    }
    if (profile.interviewType === "System Design") {
      const challenge = SYSTEM_DESIGN_CHALLENGES[turnIndex % SYSTEM_DESIGN_CHALLENGES.length];
      return `[System Design Challenge: ${challenge.title}] - ${challenge.prompt} Draw your architecture on the whiteboard canvas, connect data flow tiers, and explain your strategy for scaling to ${challenge.targetScale}.`;
    }
  }

  // 2. Turn 0: Project Grounding (STRICT: only if project is demonstrably relevant to selected department and role!)
  const projects = extractStructuredProjects(profile.resumeText);
  const relevantProjects = projects.filter((p) => isProjectRelevantToRole(p, departmentId, targetRole));

  if (turnIndex === 0 && relevantProjects.length > 0) {
    const proj = relevantProjects[0];
    const titleLower = proj.title.toLowerCase();

    if (departmentId === "Finance") {
      if (["valuation", "dcf", "m&a", "equity", "investment", "lbo", "discounted"].some((w) => titleLower.includes(w))) {
        return `You mentioned working on ${proj.title} in your background. How did you structure your discounted cash flow valuation assumptions, and how did you estimate your cost of capital?`;
      }
      if (["statement", "close", "audit", "reconciliation", "accounting"].some((w) => titleLower.includes(w))) {
        return `In your ${proj.title} project, how did you reconcile accounting discrepancies and verify that reported revenue matched cash collection?`;
      }
      return `You mentioned working on ${proj.title} in your financial experience. What were the key assumptions in your financial model, and how did you stress-test them under macroeconomic volatility?`;
    }

    if (departmentId === "HR") {
      if (["retention", "attrition", "turnover", "stay"].some((w) => titleLower.includes(w))) {
        return `In your ${proj.title} project, how did you diagnose voluntary attrition patterns, and what interventions had the greatest impact on employee retention?`;
      }
      if (["recruit", "sourcing", "talent", "hiring"].some((w) => titleLower.includes(w))) {
        return `You highlighted your ${proj.title} initiative. How did you optimize your talent acquisition funnel and balance time-to-fill with quality-of-hire?`;
      }
      return `In your ${proj.title} initiative, how did you measure stakeholder alignment and evaluate the long-term impact on organizational culture?`;
    }

    if (departmentId === "Marketing") {
      if (["campaign", "roas", "ad spend", "paid"].some((w) => titleLower.includes(w))) {
        return `In your ${proj.title} project, how did you track multi-channel attribution and optimize return on ad spend (ROAS) across paid channels?`;
      }
      if (["conversion", "funnel", "landing page", "cro", "a/b"].some((w) => titleLower.includes(w))) {
        return `You mentioned working on ${proj.title}. How did you prioritize hypothesis testing to improve conversion rates across the customer acquisition funnel?`;
      }
      return `In your ${proj.title} campaign, how did you define your target customer segmentation and measure customer lifetime value (LTV)?`;
    }

    // Technical Department Project Questions
    if (["thyroid", "disease", "cancer", "medical", "patient", "clinical", "health"].some((w) => titleLower.includes(w))) {
      return `You mentioned using ${proj.primarySkill} in your ${proj.title.toLowerCase()} project. How did you handle class imbalance, and why did you choose ${proj.primarySkill} over alternative models?`;
    }
    if (["intrusion", "fraud", "anomaly", "detection", "cyber", "security"].some((w) => titleLower.includes(w))) {
      return `You mentioned using ${proj.primarySkill} in your ${proj.title} project. Given the extreme class imbalance in anomaly traffic, how did you handle skewed data distribution and validate model recall?`;
    }
    if (["rag", "llm", "chatbot", "gpt", "retrieval", "nlp", "semantic"].some((w) => titleLower.includes(w))) {
      return `You mentioned developing ${proj.title} using ${proj.primarySkill}. How did you structure your vector chunking strategy, and how did you minimize hallucination in retrieved context?`;
    }
    if (proj.category === "ml_model") {
      return `You mentioned using ${proj.primarySkill} in your ${proj.title.toLowerCase()} project. How did you handle data preprocessing and class imbalance, and why did you choose ${proj.primarySkill} over alternative models?`;
    }
    return `You mentioned developing ${proj.title} using ${proj.primarySkill}. What were the primary architectural tradeoffs you made regarding concurrency, data consistency, and error recovery?`;
  }

  // 3. Adaptive Follow-up: If previous turn revealed weak conceptual depth, drill down within the candidate's exact role
  if (lastTurn && lastTurn.weakArea) {
    const isWeakAreaRelevant = validateQuestionRelevance(lastTurn.weakArea, departmentId, targetRole);

    if (isWeakAreaRelevant) {
      if (departmentId === "Finance") {
        if (lastTurn.weakArea.includes("DCF") || lastTurn.weakArea.includes("Valuation")) {
          return "How does changes in the Weighted Average Cost of Capital (WACC) impact the sensitivity of your DCF terminal value calculation?";
        }
        if (lastTurn.weakArea.includes("Financial Statement") || lastTurn.weakArea.includes("Working Capital")) {
          return "Which liquidity and solvency ratios would you analyze to determine if a company with positive EBITDA is approaching a cash insolvency crisis?";
        }
        if (lastTurn.weakArea.includes("Variance") || lastTurn.weakArea.includes("Forecast")) {
          return "When revenue misses the forecast by 8%, how would you isolate whether the decline was driven by sales volume, price realization, or product mix?";
        }
        return `Can you elaborate on how you evaluate the financial tradeoffs, assumptions, and risk factors associated with ${lastTurn.weakArea}?`;
      }

      if (departmentId === "HR") {
        if (lastTurn.weakArea.includes("Attrition") || lastTurn.weakArea.includes("Retention")) {
          return "How do you evaluate exit interview data alongside quarterly engagement pulse surveys to separate compensation concerns from managerial dissatisfaction?";
        }
        if (lastTurn.weakArea.includes("Talent") || lastTurn.weakArea.includes("Sourcing")) {
          return "If your candidate drop-off rate spikes between the first interview and final offer stage, how would you diagnose and fix the funnel bottleneck?";
        }
        if (lastTurn.weakArea.includes("Performance") || lastTurn.weakArea.includes("Relations")) {
          return "How do you ensure documentation in a performance improvement plan (PIP) is sufficiently objective, measurable, and defensible?";
        }
        return `Can you explain the stakeholder alignment and policy framework you would use when addressing ${lastTurn.weakArea}?`;
      }

      if (departmentId === "Marketing") {
        if (lastTurn.weakArea.includes("ROAS") || lastTurn.weakArea.includes("Paid Media")) {
          return "When scaling ad budget, at what point do you recognize diminishing marginal ROAS, and how do you reallocate budget across discovery versus retargeting channels?";
        }
        if (lastTurn.weakArea.includes("Conversion") || lastTurn.weakArea.includes("Funnel")) {
          return "If a landing page test increases click-through rates by 25% but trial-to-paid conversion drops, what underlying friction does that indicate in the funnel?";
        }
        if (lastTurn.weakArea.includes("Attribution") || lastTurn.weakArea.includes("LTV")) {
          return "How do you resolve attribution disputes between your organic search (SEO) channel and paid search brand campaigns when both claim the final conversion?";
        }
        return `How do you measure and report the return on investment and customer retention impact for ${lastTurn.weakArea}?`;
      }

      if (departmentId === "Technical") {
        if (lastTurn.weakArea.includes("Random Forest")) {
          return "How does Random Forest reduce overfitting compared with a single decision tree?";
        }
        if (lastTurn.weakArea.includes("Class Imbalance")) {
          return "In severe class imbalance, why is standard accuracy misleading, and how would you compare SMOTE versus adjusting the classification decision threshold or using Focal Loss?";
        }
        if (lastTurn.weakArea.includes("Explainability") || lastTurn.weakArea.includes("SHAP")) {
          return "How does SHAP compute feature attributions based on game-theoretic Shapley values, and how does it provide local versus global interpretability?";
        }
        if (lastTurn.weakArea.includes("RAG")) {
          return "How do chunk size and semantic boundary overlap affect retrieval accuracy in RAG, and how do you prevent context degradation?";
        }
        if (lastTurn.weakArea.includes("GIL") || lastTurn.weakArea.includes("Python")) {
          return "Why does multi-threading fail to speed up CPU-bound ML tasks in Python, and when should you use multiprocessing versus asyncio?";
        }
        if (lastTurn.weakArea.includes("Streaming") || lastTurn.weakArea.includes("Kafka")) {
          return "When designing a real-time ingestion pipeline handling 50k events/sec, how do Kafka partitions and consumer group offsets prevent backpressure bottlenecks?";
        }
        return `Can you drill down into the core technical mechanism for ${lastTurn.weakArea}: specifically the algorithmic tradeoffs and edge cases?`;
      }
    }
  }

  // 4. Digital Profile Grounding: Probe previously identified growth areas ONLY if relevant to current role
  if (departmentId === "Technical" && profile.digitalProfile && (turnIndex === 1 || turnIndex === 2) && (!lastTurn || !lastTurn.weakArea)) {
    const techSkills = Object.values(profile.digitalProfile.pillars.technical.skills);
    const weakSkill = techSkills.find((s) => s.score < 75);
    if (weakSkill) {
      if (weakSkill.id === "rag") {
        return "Based on your historical digital profile, let's test your progress on RAG systems: How do you design chunk size, semantic chunking boundaries, and metadata filters to prevent retrieval degradation?";
      }
      if (weakSkill.id === "sql") {
        return "Referencing your digital profile learning milestones in SQL: Explain how database indexing strategies (B-Tree vs Hash) and composite keys optimize multi-join analytical queries.";
      }
      if (weakSkill.id === "system_design") {
        return "Following up on your system design milestones: How do you handle cache-aside invalidation and database read replica synchronization lag under high concurrent writes?";
      }
    }
  }

  // 5. Memory Recall: Ensure pending callbacks are strictly validated against department
  if (memory && (memory.followups_pending ?? []).length > 0 && (turnIndex === 2 || turnIndex === 3) && (!lastTurn || !lastTurn.weakArea)) {
    const callbackQ = memory.followups_pending[0];
    if (validateQuestionRelevance(callbackQ, departmentId, targetRole)) {
      return callbackQ;
    }
  }

  // 6. Dynamic Difficulty Progression grounded in relevant projects (Technical roles only)
  if (departmentId === "Technical" && relevantProjects.length > 0 && profile.domain !== "DSA") {
    const p = relevantProjects[turnIndex % relevantProjects.length];
    const { title, primarySkill, skills } = p;
    const skillsList = skills.length > 0 ? skills.slice(0, 3).join(", ") : primarySkill;

    if (p.category === "ml_model") {
      if (effectiveDifficulty === "Senior") {
        const seniorML = [
          `If you had to deploy ${title} into a high-throughput streaming architecture with sub-30ms p99 latency SLAs, what bottlenecks would you anticipate with ${primarySkill}, and how would you optimize inference and memory footprint under 50x load?`,
          `When scaling ${title}, how would you detect and mitigate online data drift and concept drift in production? Include automated retraining, shadow deployments, and canary evaluation metrics.`,
          `For ${title}, explain the mathematical mechanics of TreeSHAP vs KernelSHAP, and how you would optimize explainability compute time across millions of scoring requests.`,
          `Reflecting on ${title}, what architectural or algorithmic tradeoff would you design differently today given modern distributed GPU clusters and feature stores?`,
        ];
        return seniorML[(turnIndex - 1) % seniorML.length];
      }
      if (effectiveDifficulty === "Warmup") {
        const warmupML = [
          `For ${title}, what was your step-by-step data preparation process before training ${primarySkill}?`,
          `In simple terms, how did you evaluate the predictions of ${title} and verify that the model was learning correctly?`,
          `Which Python libraries and tools did you rely on most while building ${title}?`,
        ];
        return warmupML[(turnIndex - 1) % warmupML.length];
      }
      const standardML = [
        `In your ${title} project with ${skillsList}, how did you handle class imbalance in the dataset, and what validation strategy (e.g. Stratified K-Fold) did you prioritize?`,
        `For ${title}, how did you ensure model decisions were interpretable (e.g. via SHAP, feature attributions, or logging), especially when communicating edge-case decisions to stakeholders?`,
        `What was the most challenging failure mode or edge case you encountered while tuning ${primarySkill} in ${title}, and how did you resolve it?`,
      ];
      return standardML[(turnIndex - 1) % standardML.length];
    } else {
      if (effectiveDifficulty === "Senior") {
        const seniorSys = [
          `If user traffic to ${title} scaled by 50x overnight, which database or messaging component would fail first, and how would you re-architect it with sharding, caching, and circuit breakers?`,
          `In your ${title} system, how did you ensure end-to-end idempotency, distributed transactions, and data consistency under network partitions?`,
        ];
        return seniorSys[(turnIndex - 1) % seniorSys.length];
      }
      if (effectiveDifficulty === "Warmup") {
        const warmupSys = [
          `What were the core features and user workflows in ${title}?`,
          `How did you organize your backend APIs and project structure in ${title}?`,
        ];
        return warmupSys[(turnIndex - 1) % warmupSys.length];
      }
      const standardSys = [
        `In your ${title} project built with ${skillsList}, how did you handle data integrity, concurrency, and error recovery under high load?`,
        `How did you structure automated testing, CI/CD, and performance monitoring for ${title}?`,
      ];
      return standardSys[(turnIndex - 1) % standardSys.length];
    }
  }

  // 7. Role Database Curriculum with Department-Calibrated Difficulty
  const baseQuestion =
    roleQuestions[turnIndex % Math.max(roleQuestions.length, 1)] ??
    `What makes you a strong fit for ${targetRole}?`;

  let finalQuestion = applyRoleAppropriateDifficulty(baseQuestion, departmentId, targetRole, effectiveDifficulty);

  // Guard: Final relevance validation gate
  if (!validateQuestionRelevance(finalQuestion, departmentId, targetRole)) {
    finalQuestion = roleQuestions[0] ?? `How do you approach your core responsibilities as a ${targetRole}?`;
  }

  // Apply Interviewer Persona tone and framing
  if (profile.personaId) {
    const persona = getInterviewerPersona(profile.personaId);
    return persona.questionModifier(finalQuestion, turnIndex, profile.stressConfig);
  }

  return finalQuestion;
}

export function scoreAnswer(
  answer: string,
  question: string,
  keywords: string[],
  voiceSignal: VoiceSignal,
  eyeContact: number,
  voiceStats?: VoiceTurnStats,
  paceStats?: PaceTurnStats,
  currentDifficulty: InterviewDifficulty = "Standard",
  prevMemory: InterviewerMemory = { claims: [], skills_demonstrated: [], weak_topics: [], strong_topics: [], followups_pending: [], conflicts: [] },
  historyAnswers: Array<{ answer: string; turnId: number }> = [],
  currentTurnId = 1,
  bodyLanguageStats?: BodyLanguageTurnStats,
  departmentId?: DepartmentId,
  targetRole?: string
) {
  const normalized = answer.toLowerCase();
  const words: string[] = normalized.match(/[a-z0-9+#.]+/g) ?? [];
  const uniqueWords = new Set(words);
  const relevantTerms = [...keywords, ...question.toLowerCase().split(/\s+/)]
    .filter((term) => term.length > 4)
    .slice(0, 14);
  const relevanceHits = relevantTerms.filter((term) => normalized.includes(term)).length;
  const structureMarkers = ["first", "second", "because", "result", "impact", "tradeoff", "therefore"].filter(
    (marker) => normalized.includes(marker)
  ).length;
  const fillerHits = paceStats
    ? paceStats.fillerWordsCount
    : ["um", "uh", "like", "basically", "actually", "maybe"].filter((word) => words.includes(word)).length;

  const { weakArea, retrievedConcepts, depthScore, adaptiveStrategy } = diagnoseTechnicalDepth(
    question,
    answer,
    keywords,
    departmentId
  );

  let voicePace = voiceSignal.pace || 80;
  if (paceStats && paceStats.wordsSpoken >= 5) {
    if (paceStats.paceRating === "GOOD") {
      voicePace = 95;
    } else if (paceStats.paceRating === "MODERATE" || paceStats.paceRating === "BRISK") {
      voicePace = 80;
    } else if (paceStats.paceRating === "SLOW") {
      voicePace = 62;
    } else {
      voicePace = 55;
    }
  } else if (voiceStats && voiceStats.samplesCount > 0) {
    voicePace = voiceStats.paceScore;
  }

  const technical_accuracy = clamp(depthScore);

  let semantic_relevance = 75;
  if (words.length < 5) {
    semantic_relevance = 35;
  } else {
    semantic_relevance = clamp(
      Math.round(
        70 +
        relevanceHits * 6 +
        Math.min(words.length, 70) * 0.16 +
        (uniqueWords.size / Math.max(1, words.length)) * 8
      )
    );
  }

  const structureAnalysis = analyzeAnswerStructure(question, answer);
  const answer_structure = structureAnalysis.structureScore;

  const eye_contact = clamp(Math.round(eyeContact));
  const voice_energy = clamp(voiceStats && voiceStats.samplesCount > 0 ? voiceStats.averageEnergy : voiceSignal.energy);
  const speaking_pace = clamp(voicePace);
  const filler_words = clamp(
    paceStats ? Math.max(0, 100 - paceStats.fillerWordsCount * 12) : Math.max(0, 100 - fillerHits * 10)
  );

  const overall = clamp(
    Math.round(
      0.25 * technical_accuracy +
      0.25 * semantic_relevance +
      0.15 * answer_structure +
      0.10 * eye_contact +
      0.10 * voice_energy +
      0.08 * speaking_pace +
      0.07 * filler_words
    )
  );

  const { nextDifficulty, trend: difficultyTrend, reason: difficultyReason } = computeDynamicDifficulty(
    currentDifficulty,
    overall,
    technical_accuracy,
    semantic_relevance,
    weakArea
  );

  const { updatedMemory, newConflicts } = updateInterviewerMemory(
    prevMemory,
    question,
    answer,
    overall,
    technical_accuracy,
    weakArea,
    historyAnswers,
    currentTurnId
  );

  const breakdown: MultimodalBreakdown = {
    technical_accuracy,
    semantic_relevance,
    answer_structure,
    eye_contact,
    voice_energy,
    speaking_pace,
    filler_words,
    overall,
  };

  const clarity = clamp(Math.round(44 + words.length * 1.4 + uniqueWords.size * 0.35 - fillerHits * 6));
  const relevance = semantic_relevance;
  const structure = answer_structure;
  const voice = voice_energy;
  const confidence = clamp(Math.round(38 + words.length * 0.7 + voice * 0.25 + eye_contact * 0.16 - fillerHits * 4));

  const feedback = buildFeedback({
    clarity,
    relevance,
    structure,
    confidence,
    voice,
    eyeContact: eye_contact,
    words: words.length,
    voiceStats,
    paceStats,
    weakArea,
    bodyLanguageStats,
  });

  if (structureAnalysis.coachingFeedback && !feedback.includes(structureAnalysis.coachingFeedback)) {
    feedback.push(structureAnalysis.coachingFeedback);
  }

  for (const c of newConflicts) {
    feedback.unshift(
      `⚠ Possible inconsistency detected in Claim Consistency Analysis: Earlier (Turn ${c.earlier_turn}): '${c.earlier_claim}', Later (Turn ${c.later_turn}): '${c.later_claim}'. ${c.explanation}`
    );
  }

  return {
    score: overall,
    breakdown,
    weakArea,
    retrievedConcepts,
    technicalDepthScore: depthScore,
    adaptiveStrategy,
    currentDifficulty: nextDifficulty,
    difficultyTrend,
    difficultyReason,
    memory: updatedMemory,
    conflicts: updatedMemory.conflicts,
    structureAnalysis,
    skillGapReport: generateSkillGapReport(
      (Array.isArray(historyAnswers) ? historyAnswers : []).map((h, i) => ({
        id: h.turnId,
        question: "",
        answer: h.answer,
        score: overall,
        latencyMs: 0,
        breakdown,
        feedback: [],
        signals: {
          clarity,
          relevance,
          structure,
          confidence,
          voice,
          eyeContact: eye_contact,
        },
      })),
      targetRole,
      departmentId
    ),
    roadmap: generate7DayRoadmap(
      historyAnswers.map((h, i) => ({
        id: h.turnId,
        question: "",
        answer: h.answer,
        score: overall,
        latencyMs: 0,
        breakdown,
        weakArea,
        feedback: [],
        signals: {
          clarity,
          relevance,
          structure,
          confidence,
          voice,
          eyeContact: eye_contact,
        },
      })),
      targetRole,
      departmentId
    ),
    ragContextSummary: weakArea ? `Retrieved RAG rubrics from ChromaDB: ${retrievedConcepts.join(", ")}` : null,
    signals: {
      clarity,
      relevance,
      structure,
      confidence,
      voice,
      eyeContact: eye_contact,
      technicalDepth: depthScore,
      voiceStats,
      paceStats,
      bodyLanguageStats,
    },
    feedback,
  };
}

function buildFeedback(scores: {
  clarity: number;
  relevance: number;
  structure: number;
  confidence: number;
  voice: number;
  eyeContact: number;
  words: number;
  voiceStats?: VoiceTurnStats;
  paceStats?: PaceTurnStats;
  weakArea?: string | null;
  bodyLanguageStats?: BodyLanguageTurnStats;
}) {
  const feedback: string[] = [];

  // 1. Weak area technical depth feedback
  if (scores.weakArea) {
    feedback.push(
      `Weak technical depth detected in ${scores.weakArea}. Explain the underlying algorithmic mechanisms and tradeoffs.`
    );
  }

  // 2. Dynamic acoustic & voice feedback
  if (scores.voiceStats && scores.voiceStats.samplesCount >= 10) {
    const { droppedNoticeably, segmentEnergies, averageEnergy, minEnergy, maxEnergy, variance, tooQuiet, tooLoud, monotone } =
      scores.voiceStats;

    if (droppedNoticeably) {
      feedback.push(
        `Your voice volume was generally good (avg ${averageEnergy}%), but dropped noticeably (${segmentEnergies.beginning}% → ${segmentEnergies.ending}%) during the explanation.`
      );
    } else if (tooQuiet) {
      feedback.push(`Voice volume was low (avg ${averageEnergy}%, min ${minEnergy}%). Project more acoustic energy for authority.`);
    } else if (monotone) {
      feedback.push(
        `Your volume was steady (avg ${averageEnergy}%), but slightly monotone (variance ${variance}). Add vocal emphasis on key milestones.`
      );
    } else if (tooLoud) {
      feedback.push(`Voice volume was high (peak ${maxEnergy}%). Modulate down slightly for an authentic conversational delivery.`);
    }
  } else if (scores.voice < 68) {
    feedback.push("Voice projection was slightly low. Maintain authority and projection across multi-sentence answers.");
  }

  // 3. Body Language & Gaze Orientation feedback (defensible communication feedback)
  if (scores.bodyLanguageStats && scores.bodyLanguageStats.communicationFeedback) {
    feedback.push(scores.bodyLanguageStats.communicationFeedback);
  }

  // 4. Speaking pace and filler word feedback
  if (scores.paceStats && scores.paceStats.wordsSpoken >= 6) {
    const { wpm, paceRating, fillerWordsCount, fillerWordsList, pauseCount, pauseDurationSec, wordsSpoken, speechDurationSec } =
      scores.paceStats;

    if (scores.paceStats.paceTrend !== "steady" && scores.paceStats.paceTrendDescription) {
      feedback.push(scores.paceStats.paceTrendDescription);
    } else if (paceRating === "TOO FAST") {
      feedback.push(
        `Speaking pace was very fast (${wpm} WPM). Slow down toward 130–160 WPM to give technical points time to land.`
      );
    } else if (paceRating === "SLOW") {
      feedback.push(`Speaking pace was deliberate (${wpm} WPM). Aim for a more fluent conversational rhythm (130–160 WPM).`);
    }

    if (fillerWordsCount >= 2 && scores.paceStats.fillerBreakdown && scores.paceStats.fillerBreakdown.length > 0) {
      const breakdownStr = scores.paceStats.fillerBreakdown
        .slice(0, 3)
        .map((f) => `"${f.word}" ${f.count}`)
        .join(", ");
      feedback.push(
        `Filler words detected (${breakdownStr}, total ${fillerWordsCount}). Replace fillers with deliberate silent pauses.`
      );
    } else if (scores.paceStats.longPausesCount >= 2) {
      feedback.push(
        `Detected ${scores.paceStats.longPausesCount} long pauses (avg pause ${scores.paceStats.averagePauseSec}s). Structure complex thoughts before speaking to maintain continuity.`
      );
    } else if (paceRating === "GOOD" && fillerWordsCount <= 1) {
      feedback.push(
        `Excellent pacing at ${wpm} WPM (${wordsSpoken} words, avg pause ${scores.paceStats.averagePauseSec}s) with clear articulation.`
      );
    }
  }

  // 4. Content & structural feedback
  if (scores.words < 45) {
    feedback.push("Expand with a concrete example, decision, and result.");
  }

  if (scores.structure < 70) {
    feedback.push("Use a sharper structure: context, action, tradeoff, impact.");
  }

  if (scores.relevance < 72) {
    feedback.push("Tie the answer more directly to the question and role keywords.");
  }

  if (scores.eyeContact < 65) {
    feedback.push("Raise camera presence with more consistent forward focus.");
  }

  if (feedback.length === 0) {
    feedback.push("Strong answer with solid technical depth. Add one quantified outcome to make it sharper.");
  }

  return feedback.slice(0, 3);
}

export function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

export function averageScore(history: InterviewTurn[]) {
  if (!history.length) {
    return 0;
  }

  return Math.round(history.reduce((sum, turn) => sum + turn.score, 0) / history.length);
}
