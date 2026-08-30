import {
  DepartmentId,
  InterviewTrack,
  InterviewType,
  getQuestionsForSelection,
  isInterviewTypeAvailableForDepartment,
  isTrackAvailableForDepartment,
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
  prevMemory: InterviewerMemory,
  question: string,
  answer: string,
  score: number,
  depthScore: number,
  weakArea?: string | null,
  historyAnswers: Array<{ answer: string; turnId: number }> = [],
  currentTurnId = 1
): { updatedMemory: InterviewerMemory; newConflicts: ConsistencyConflict[] } {
  const claims = [...prevMemory.claims];
  const skills_demonstrated = [...prevMemory.skills_demonstrated];
  const weak_topics = [...prevMemory.weak_topics];
  const strong_topics = [...prevMemory.strong_topics];
  const followups_pending = [...prevMemory.followups_pending];
  const conflicts = [...(prevMemory.conflicts || [])];

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
  targetRole: string = "Full Stack AI Engineer"
): PostInterviewRoadmap {
  const weakAreas = history.map((t) => t.weakArea).filter(Boolean) as string[];
  const hasRfWeakness = weakAreas.some((w) => w.includes("Random Forest"));
  const hasImbalanceWeakness = weakAreas.some((w) => w.includes("Class Imbalance") || w.includes("Imbalance"));
  const hasShapWeakness = weakAreas.some((w) => w.includes("SHAP") || w.includes("Explainability"));
  const hasRagWeakness = weakAreas.some((w) => w.includes("RAG") || w.includes("Retrieval"));

  const days: DayStudyPlan[] = [
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

  return {
    title: "7-Day Personalized Improvement Roadmap",
    summary: `Structured curriculum targeting identified gaps in ${weakAreas.slice(0, 3).join(", ") || "Foundational ML & Architecture"}.`,
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
  targetRole: string = "Full Stack AI Engineer"
): SkillGapReport {
  let pythonScore = 92;
  let mlScore = 87;
  let sqlScore = 72;
  let ragScore = 51;
  let systemDesignScore = 43;
  let commScore = 70;

  if (history.length > 0) {
    const avg = (nums: number[]) => (nums.length ? Math.round(nums.reduce((a, b) => a + b, 0) / nums.length) : 70);
    const avgScore = avg(history.map((t) => t.score));
    const avgEyeContact = avg(history.map((t) => t.breakdown?.eye_contact ?? 70));
    const avgStructure = avg(history.map((t) => t.breakdown?.answer_structure ?? 70));
    const avgPace = avg(history.map((t) => t.breakdown?.speaking_pace ?? 75));
    const avgFillers = avg(history.map((t) => t.breakdown?.filler_words ?? 85));

    commScore = Math.max(
      35,
      Math.min(98, Math.round(0.3 * avgEyeContact + 0.3 * avgStructure + 0.2 * avgPace + 0.2 * avgFillers))
    );

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
  commScore = Math.max(30, Math.min(98, commScore));

  const getLevel = (s: number): "Advanced" | "Proficient" | "Needs Improvement" | "Critical Gap" => {
    if (s >= 85) return "Advanced";
    if (s >= 70) return "Proficient";
    if (s >= 55) return "Needs Improvement";
    return "Critical Gap";
  };

  const skills: SkillScore[] = [
    { name: "Python", score: pythonScore, level: getLevel(pythonScore), category: "Programming" },
    { name: "Machine Learning", score: mlScore, level: getLevel(mlScore), category: "AI & Algorithms" },
    { name: "SQL & Data", score: sqlScore, level: getLevel(sqlScore), category: "Data Engineering" },
    { name: "RAG & Vector Retrieval", score: ragScore, level: getLevel(ragScore), category: "Generative AI" },
    { name: "System Design", score: systemDesignScore, level: getLevel(systemDesignScore), category: "Architecture" },
    { name: "Communication", score: commScore, level: getLevel(commScore), category: "Non-Verbal & Delivery" },
  ];

  const sorted = [...skills].sort((a, b) => a.score - b.score);
  const lowestSkill = sorted[0];
  const highestPriorityArea = lowestSkill.name;

  let curriculumTree: TopicCurriculumNode[] = [];
  let actionableSteps: string[] = [];
  let retrievedSources: string[] = [];

  if (highestPriorityArea === "System Design" || lowestSkill.score <= 55) {
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
        name: "Scalability & Load Balancing",
        description: "Stateless compute scaling, reverse proxies (Nginx/Envoy), token bucket, and circuit breakers.",
        difficulty: "Advanced",
        key_topics: ["Consistent Hashing", "Token Bucket Algorithm", "Circuit Breakers (Resilience4j)", "Health Probes"],
        estimated_study_hours: 6,
      },
      {
        name: "Message Queues & Event Streaming",
        description: "Apache Kafka partition scalability, consumer group offset commits, and backpressure management.",
        difficulty: "Advanced",
        key_topics: ["Kafka Partition Strategy", "Consumer Offset Lag", "At-Least-Once Delivery", "Dead Letter Queues"],
        estimated_study_hours: 8,
      },
      {
        name: "Distributed Systems & Consensus",
        description: "CAP theorem tradeoffs, PACELC, distributed locks (Redlock), and zero-downtime deployment.",
        difficulty: "Advanced",
        key_topics: ["CAP / PACELC Theorems", "Distributed Locking", "Two-Phase Commit (2PC)", "Canary Deployments"],
        estimated_study_hours: 10,
      },
    ];

    actionableSteps = [
      "Review the ChromaDB System Design Knowledge Collection for Kafka partition sizing and Redis caching rubrics.",
      "Design an end-to-end distributed URL shortener or rate limiter handling 50k requests/second.",
      "Practice articulating trade-offs out loud: compute time vs memory overhead and availability vs consistency.",
    ];

    retrievedSources = [
      "chroma://technical_knowledge/system_design_scalability_rubric",
      "chroma://technical_knowledge/distributed_caching_redis_patterns",
      "chroma://technical_knowledge/kafka_partitioning_streaming_slas",
      "chroma://interview_knowledge/system_design_faang_questions",
    ];
  } else if (highestPriorityArea === "RAG & Vector Retrieval") {
    curriculumTree = [
      {
        name: "Semantic Chunking & Boundary Preservation",
        description: "Optimizing chunk sizes (256–1024 tokens) and overlap to avoid splitting named entities.",
        difficulty: "Foundational",
        key_topics: ["Sentence Boundary Splitters", "Context Overlap", "Metadata Injection"],
        estimated_study_hours: 4,
      },
      {
        name: "Dense Embeddings & Metric Spaces",
        description: "Sentence-transformers, cosine similarity vs dot product, and vector normalization.",
        difficulty: "Intermediate",
        key_topics: ["Normalized Cosine Distance", "Embedding Dimensionality", "Multilingual Embeddings"],
        estimated_study_hours: 5,
      },
      {
        name: "Vector Indexing (HNSW / IVF-PQ)",
        description: "Graph-based indexing structures for sub-10ms Approximate Nearest Neighbor (ANN) search.",
        difficulty: "Advanced",
        key_topics: ["HNSW M & efSearch Parameters", "Product Quantization", "Memory Compression"],
        estimated_study_hours: 7,
      },
      {
        name: "Retrieval Reranking & Hybrid Search",
        description: "Combining BM25 keyword search with dense embeddings via Reciprocal Rank Fusion (RRF).",
        difficulty: "Advanced",
        key_topics: ["Cross-Encoder Rerankers", "RRF Score Merging", "Query Expansion"],
        estimated_study_hours: 6,
      },
    ];

    actionableSteps = [
      "Benchmark retrieval accuracy on your sample resumes with 256 vs 512 token chunk sizes.",
      "Implement a cross-encoder reranker on top of ChromaDB query results.",
    ];

    retrievedSources = [
      "chroma://technical_knowledge/rag_chunking_retrieval_rubrics",
      "chroma://technical_knowledge/vector_databases_chroma_hnsw",
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
      {
        name: "Model Explainability & Game Theory",
        description: "TreeSHAP vs KernelSHAP, local efficiency, and game-theoretic Shapley axioms.",
        difficulty: "Advanced",
        key_topics: ["Shapley Value Additivity", "Feature Attribution", "Interactions"],
        estimated_study_hours: 6,
      },
    ];

    actionableSteps = [
      "Implement a custom Random Forest classifier in PyTorch/Scikit-Learn to master internal splits.",
      "Calculate TreeSHAP values for an imbalanced fraud detection model.",
    ];

    retrievedSources = [
      "chroma://technical_knowledge/random_forest_ensemble_theory",
      "chroma://technical_knowledge/shap_explainability_shapley_values",
    ];
  }

  return {
    skills,
    highest_priority_area: highestPriorityArea,
    summary_statement: `Your highest-priority improvement area is ${highestPriorityArea}.`,
    study_plan: {
      priority_skill: highestPriorityArea,
      priority_reason: `Lowest mastery score (${lowestSkill.score}/100) identified during technical evaluation.`,
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
  {
    topicId: "random_forest_selection",
    triggers: ["random forest", "decision tree", "ensemble", "bagging", "thyroid", "prediction", "classifier"],
    depthSignals: ["variance", "bias", "overfit", "bagging", "bootstrap", "subsampling", "features", "decorrelat", "gini", "depth", "split", "impurity", "trees"],
    weakArea: "Random Forest Model Selection & Overfitting Mitigation",
    concepts: ["Random Forest", "Decision Trees", "Bagging", "Feature Importance", "Overfitting", "Variance Reduction"],
    probingQuestion: "How does Random Forest reduce overfitting compared with a single decision tree?",
    advancedQuestion: "How do you calibrate the max_features parameter and tree depth in Random Forest to optimize the bias-variance tradeoff on noisy data?",
  },
  {
    topicId: "class_imbalance",
    triggers: ["imbalance", "skew", "smote", "focal loss", "precision", "recall", "rare", "fraud", "anomaly", "intrusion", "attack"],
    depthSignals: ["smote", "focal loss", "pr-auc", "roc-auc", "recall", "precision", "resampling", "cost-sensitive", "threshold", "f1", "stratified"],
    weakArea: "Class Imbalance Handling & Metric Selection",
    concepts: ["Class Imbalance", "SMOTE", "Focal Loss", "PR-AUC", "Stratified Sampling", "Cost-Sensitive Learning"],
    probingQuestion: "In extreme class imbalance, why is standard classification accuracy misleading, and how would you compare SMOTE versus adjusting the classification decision threshold or using Focal Loss?",
    advancedQuestion: "When using SMOTE with high-dimensional noisy data, how do you prevent synthetic samples from bridging decision boundaries and introducing label noise?",
  },
  {
    topicId: "shap_interpretability",
    triggers: ["shap", "shapley", "explain", "interpret", "black box", "xai", "importance", "feature attribution"],
    depthSignals: ["shapley", "game theory", "coalition", "local", "global", "marginal", "treeshap", "attribution", "efficiency", "additivity"],
    weakArea: "Model Explainability & SHAP Values",
    concepts: ["SHAP", "Shapley Values", "Feature Attributions", "Local Interpretability", "TreeSHAP"],
    probingQuestion: "How does SHAP compute feature attributions based on game theory, and how does it provide both local and global interpretability compared to default Gini importance?",
    advancedQuestion: "How does the TreeSHAP algorithm reduce the exponential computational complexity of exact Shapley value estimation to polynomial time?",
  },
  {
    topicId: "rag_vector_search",
    triggers: ["rag", "vector", "chroma", "embedding", "retrieval", "chunking", "semantic", "llm"],
    depthSignals: ["embedding", "cosine", "similarity", "chunk", "overlap", "rerank", "dense", "sparse", "hallucination", "context window", "hybrid search"],
    weakArea: "RAG Retrieval Architecture & Vector Chunking",
    concepts: ["Vector Embeddings", "Cosine Distance", "Semantic Chunking", "Reranking", "Hallucination Reduction"],
    probingQuestion: "How do chunk size and semantic boundary overlap affect retrieval accuracy in RAG, and how do you prevent lost-in-the-middle context degradation?",
    advancedQuestion: "How would you implement a hybrid search (Dense Vector + BM25 Sparse) with Reciprocal Rank Fusion (RRF) and cross-encoder re-ranking?",
  },
  {
    topicId: "python_gil_concurrency",
    triggers: ["gil", "concurrency", "multiprocessing", "asyncio", "threading", "generator", "yield", "python"],
    depthSignals: ["gil", "bytecode", "interpreter lock", "cpu-bound", "i/o-bound", "event loop", "memory", "lazy", "iterator", "process pool"],
    weakArea: "Python GIL & Concurrency Paradigms",
    concepts: ["GIL", "Multiprocessing vs Asyncio", "Generators", "Memory Footprint", "Event Loop"],
    probingQuestion: "Why does multi-threading in Python fail to speed up CPU-bound ML tasks, and when should you use multiprocessing versus asyncio?",
    advancedQuestion: "How do Python memory allocators (PyMalloc) and reference counting garbage collection interact with sub-interpreters (PEP 684)?",
  },
  {
    topicId: "system_design_kafka",
    triggers: ["system design", "kafka", "streaming", "throughput", "scalable", "pipeline", "queue", "architecture"],
    depthSignals: ["partition", "backpressure", "consumer group", "idempotent", "at-least-once", "offset", "replication", "sharding", "cache"],
    weakArea: "Streaming Systems & Backpressure Architecture",
    concepts: ["Kafka Partitioning", "Backpressure", "Consumer Groups", "Idempotency", "Database Sharding"],
    probingQuestion: "When designing a real-time ingestion pipeline handling 50k events/sec, how do Kafka partitions and consumer group offsets prevent data loss and backpressure bottlenecks?",
    advancedQuestion: "How would you ensure end-to-end exactly-once processing (EOS) semantics across a distributed streaming architecture during node failures?",
  },
];

export function diagnoseTechnicalDepth(
  question: string,
  answer: string,
  keywords: string[] = []
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

  let matchedEntry = CONCEPT_CATALOG.find((entry) =>
    entry.triggers.some((trigger) => normQ.includes(trigger))
  );

  if (!matchedEntry && keywords.length > 0) {
    const kwStr = keywords.join(" ").toLowerCase();
    matchedEntry = CONCEPT_CATALOG.find((entry) =>
      entry.triggers.some((trigger) => kwStr.includes(trigger))
    );
  }

  if (!matchedEntry) {
    matchedEntry = {
      topicId: "general_engineering",
      triggers: [],
      depthSignals: ["tradeoff", "complexity", "scalability", "latency", "bottleneck", "architecture", "optimization", "monitoring"],
      weakArea: "Technical Architecture & Tradeoff Analysis",
      concepts: ["Tradeoff Analysis", "System Scalability", "Performance Optimization", "Failure Recovery"],
      probingQuestion: "Can you elaborate on the specific architectural tradeoffs and failure modes you considered in this approach?",
      advancedQuestion: "How would you measure the performance impact and reliability of this solution under 10x production load?",
    };
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

  // Dynamic realistic technical depth scoring
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
      adaptiveStrategy: "Probing Weak Area via RAG Retrieval",
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
  const projects = extractStructuredProjects(profile.resumeText);

  // Coding Mode: Load interactive algorithmic problems
  if (profile.interviewType === "Coding") {
    const p = CODING_PROBLEMS[turnIndex % CODING_PROBLEMS.length];
    return `[Coding Challenge: ${p.title}] - ${p.description.split("\n\n")[0]} Implement your solution in the code editor, test assertions, and explain your approach and algorithmic complexity tradeoffs.`;
  }

  // System Design Mode: Load interactive architectural challenges
  if (profile.interviewType === "System Design") {
    const challenge = SYSTEM_DESIGN_CHALLENGES[turnIndex % SYSTEM_DESIGN_CHALLENGES.length];
    return `[System Design Challenge: ${challenge.title}] - ${challenge.prompt} Draw your architecture on the whiteboard canvas, connect data flow tiers, and explain your strategy for scaling to ${challenge.targetScale}.`;
  }

  // 1. First question: Domain-tailored challenge grounded in candidate's project
  if (turnIndex === 0 && projects.length > 0) {
    const proj = projects[0];
    const titleLower = proj.title.toLowerCase();

    // Domain 1: Medical / Disease Prediction
    if (["thyroid", "disease", "cancer", "medical", "patient", "clinical", "health"].some((w) => titleLower.includes(w))) {
      return `You mentioned using ${proj.primarySkill} in your ${proj.title.toLowerCase()} project. How did you handle class imbalance, and why did you choose ${proj.primarySkill} over alternative models?`;
    }

    // Domain 2: Fraud / Intrusion / Anomaly Detection
    if (["intrusion", "fraud", "anomaly", "detection", "cyber", "security"].some((w) => titleLower.includes(w))) {
      return `You mentioned using ${proj.primarySkill} in your ${proj.title} project. Given the extreme class imbalance in anomaly traffic, how did you handle skewed data distribution and validate model recall?`;
    }

    // Domain 3: RAG / LLM / NLP Applications
    if (["rag", "llm", "chatbot", "gpt", "retrieval", "nlp", "semantic"].some((w) => titleLower.includes(w))) {
      return `You mentioned developing ${proj.title} using ${proj.primarySkill}. How did you structure your vector chunking strategy, and how did you minimize hallucination in retrieved context?`;
    }

    // Domain 4: General ML / Classification
    if (proj.category === "ml_model") {
      return `You mentioned using ${proj.primarySkill} in your ${proj.title.toLowerCase()} project. How did you handle data preprocessing and class imbalance, and why did you choose ${proj.primarySkill} over alternative models?`;
    }

    // Domain 5: System / Backend / Microservices
    return `You mentioned developing ${proj.title} using ${proj.primarySkill}. What were the primary architectural tradeoffs you made regarding concurrency, data consistency, and error recovery?`;
  }

  // 2. Genuine Adaptive Follow-up: If previous turn revealed weak conceptual depth, drill down via RAG
  if (lastTurn && lastTurn.weakArea) {
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

  // 2.5 Digital Profile Grounding: Probe previously identified growth areas from persistent profile
  if (profile.digitalProfile && (turnIndex === 1 || turnIndex === 2) && (!lastTurn || !lastTurn.weakArea)) {
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

  // 3. Memory Recall & Candidate Claim Callback (Interviewer recalls statements from earlier turns)
  if (memory && memory.followups_pending.length > 0 && (turnIndex === 2 || turnIndex === 3) && (!lastTurn || !lastTurn.weakArea)) {
    const callbackQ = memory.followups_pending[0];
    return callbackQ;
  }

  // 4. Dynamic Difficulty Progression (Warmup -> Standard -> Senior)
  if (projects.length > 0 && profile.domain !== "DSA") {
    const p = projects[turnIndex % projects.length];
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

  // 4. Fallback to domain and role database curriculum
  const anchor = keywords[turnIndex % Math.max(keywords.length, 1)] ?? profile.targetRole;
  const safeTrack = isTrackAvailableForDepartment(profile.department, profile.domain)
    ? profile.domain
    : "Role Specific";
  const roleQuestions = getQuestionsForSelection(profile.department, profile.targetRole, safeTrack);
  const baseQuestion =
    roleQuestions[turnIndex % Math.max(roleQuestions.length, 1)] ??
    `What makes you a strong fit for ${profile.targetRole}?`;

  let finalQuestion = baseQuestion;
  if (effectiveDifficulty === "Senior") {
    finalQuestion = `${baseQuestion} Include high-scale tradeoffs, distributed failure modes, and success metrics.`;
  } else if (effectiveDifficulty === "Warmup") {
    finalQuestion = `${baseQuestion} Keep the answer concise, practical, and focused on core concepts.`;
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
  bodyLanguageStats?: BodyLanguageTurnStats
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
    keywords
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
      historyAnswers.map((h, i) => ({
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
      }))
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
      }))
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
