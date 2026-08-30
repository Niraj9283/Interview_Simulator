/**
 * Candidate Digital Profile & Cross-Session Mastery Engine
 * 
 * Provides:
 * 1. Persistent 3-Pillar Skill Mastery Model (Technical, Communication, Behavioral).
 * 2. Exponential smoothing update algorithm after every completed interview session.
 * 3. RAG Grounding context generator for personalized subsequent interviews.
 * 4. LocalStorage persistence and profile export capabilities.
 */

import { InterviewTurn, CandidateProfile } from "./interview";

export interface SkillMasteryItem {
  id: string;
  name: string;
  score: number; // 0 - 100
  category: "Technical" | "Communication" | "Behavioral";
  assessmentsCount: number;
  lastUpdated: string;
  trend: "improving" | "stable" | "declining";
}

export interface ProfileSessionRecord {
  id: string;
  timestamp: string;
  targetRole: string;
  department: string;
  overallScore: number;
  technicalScore: number;
  communicationScore: number;
  behavioralScore: number;
  topStrength: string;
  primaryWeakArea: string;
}

export interface CandidateDigitalProfile {
  candidateId: string;
  candidateName: string;
  sessionsCompleted: number;
  lastInterviewDate: string;
  overallReadiness: number; // 0 - 100
  pillars: {
    technical: {
      score: number;
      skills: Record<string, SkillMasteryItem>;
    };
    communication: {
      score: number;
      skills: Record<string, SkillMasteryItem>;
    };
    behavioral: {
      score: number;
      skills: Record<string, SkillMasteryItem>;
    };
  };
  sessionHistory: ProfileSessionRecord[];
  ragMemoryContext: string;
}

const STORAGE_KEY = "mockmate_candidate_digital_profile_v1";

export const DEFAULT_DIGITAL_PROFILE: CandidateDigitalProfile = {
  candidateId: "cand-default-001",
  candidateName: "Niraj Sharma",
  sessionsCompleted: 3,
  lastInterviewDate: "2026-08-29",
  overallReadiness: 79,
  pillars: {
    technical: {
      score: 79,
      skills: {
        python: { id: "python", name: "Python", score: 91, category: "Technical", assessmentsCount: 4, lastUpdated: "2026-08-29", trend: "improving" },
        ml: { id: "ml", name: "Machine Learning (XGBoost/RF)", score: 84, category: "Technical", assessmentsCount: 4, lastUpdated: "2026-08-29", trend: "improving" },
        sql: { id: "sql", name: "SQL & Query Optimization", score: 72, category: "Technical", assessmentsCount: 3, lastUpdated: "2026-08-28", trend: "stable" },
        rag: { id: "rag", name: "RAG & LLM Architectures", score: 67, category: "Technical", assessmentsCount: 3, lastUpdated: "2026-08-29", trend: "declining" },
        system_design: { id: "system_design", name: "System Design & Scalability", score: 78, category: "Technical", assessmentsCount: 2, lastUpdated: "2026-08-29", trend: "improving" },
        dsa: { id: "dsa", name: "Data Structures & Algorithms", score: 82, category: "Technical", assessmentsCount: 3, lastUpdated: "2026-08-29", trend: "stable" },
      },
    },
    communication: {
      score: 82,
      skills: {
        eye_contact: { id: "eye_contact", name: "Eye Contact & Gaze Stability", score: 82, category: "Communication", assessmentsCount: 4, lastUpdated: "2026-08-29", trend: "improving" },
        pace: { id: "pace", name: "Speaking Pace (120-150 WPM)", score: 88, category: "Communication", assessmentsCount: 4, lastUpdated: "2026-08-29", trend: "improving" },
        voice: { id: "voice", name: "Voice Energy & Acoustic Steadiness", score: 76, category: "Communication", assessmentsCount: 4, lastUpdated: "2026-08-29", trend: "stable" },
        structure: { id: "structure", name: "Answer Structure & STAR Framing", score: 82, category: "Communication", assessmentsCount: 3, lastUpdated: "2026-08-29", trend: "improving" },
      },
    },
    behavioral: {
      score: 80,
      skills: {
        leadership: { id: "leadership", name: "Leadership & Initiative", score: 74, category: "Behavioral", assessmentsCount: 3, lastUpdated: "2026-08-28", trend: "stable" },
        problem_solving: { id: "problem_solving", name: "Problem Solving & Analytical Rigor", score: 86, category: "Behavioral", assessmentsCount: 4, lastUpdated: "2026-08-29", trend: "improving" },
        teamwork: { id: "teamwork", name: "Teamwork & Cross-functional Empathy", score: 79, category: "Behavioral", assessmentsCount: 3, lastUpdated: "2026-08-28", trend: "stable" },
        resilience: { id: "resilience", name: "Composure Under Pressure", score: 80, category: "Behavioral", assessmentsCount: 3, lastUpdated: "2026-08-29", trend: "improving" },
      },
    },
  },
  sessionHistory: [
    {
      id: "sess-101",
      timestamp: "2026-08-27T10:30:00Z",
      targetRole: "ML Engineer",
      department: "Technical",
      overallScore: 74,
      technicalScore: 75,
      communicationScore: 78,
      behavioralScore: 70,
      topStrength: "Clear Python fundamentals and data preprocessing workflows",
      primaryWeakArea: "SQL window functions and slow speaking cadence",
    },
    {
      id: "sess-102",
      timestamp: "2026-08-28T14:15:00Z",
      targetRole: "ML Engineer",
      department: "Technical",
      overallScore: 78,
      technicalScore: 78,
      communicationScore: 81,
      behavioralScore: 76,
      topStrength: "Strong explanation of Random Forest vs XGBoost mechanics",
      primaryWeakArea: "Vector chunk overlap and RAG semantic retrieval",
    },
    {
      id: "sess-103",
      timestamp: "2026-08-29T16:45:00Z",
      targetRole: "ML Engineer",
      department: "Technical",
      overallScore: 81,
      technicalScore: 82,
      communicationScore: 84,
      behavioralScore: 80,
      topStrength: "Exemplary 2-pointer algorithmic optimization (Two Sum)",
      primaryWeakArea: "Deep RAG chunk boundary degradations (scored 67)",
    },
  ],
  ragMemoryContext:
    "Candidate Niraj Sharma exhibits high mastery in Python (91) and Problem Solving (86). Known growth areas: RAG & LLM Architectures (67) and SQL Optimization (72). In future interviews, probe RAG chunking, vector similarity metrics, and database sharding to measure improvement.",
};

/**
 * Loads the candidate's persistent digital profile from localStorage.
 */
export function loadStoredDigitalProfile(): CandidateDigitalProfile {
  if (typeof window === "undefined") {
    return DEFAULT_DIGITAL_PROFILE;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_DIGITAL_PROFILE));
      return DEFAULT_DIGITAL_PROFILE;
    }
    return JSON.parse(raw) as CandidateDigitalProfile;
  } catch {
    return DEFAULT_DIGITAL_PROFILE;
  }
}

/**
 * Persists the digital profile to localStorage.
 */
export function saveDigitalProfile(profile: CandidateDigitalProfile): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // ignore
  }
}

/**
 * Resets the digital profile to the default baseline.
 */
export function resetDigitalProfile(): CandidateDigitalProfile {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_DIGITAL_PROFILE));
    } catch {
      // ignore
    }
  }
  return DEFAULT_DIGITAL_PROFILE;
}

/**
 * Generates an updated RAG memory context string reflecting the candidate's current profile.
 */
export function generateRAGProfileContext(profile: CandidateDigitalProfile): string {
  const tech = profile.pillars.technical.skills;
  const sortedTech = Object.values(tech).sort((a, b) => b.score - a.score);
  const strongest = sortedTech.slice(0, 2).map((s) => `${s.name} (${s.score})`).join(", ");
  const weakest = sortedTech.slice(-2).map((s) => `${s.name} (${s.score})`).join(", ");

  const commScore = profile.pillars.communication.score;
  const behavScore = profile.pillars.behavioral.score;

  return `Candidate ${profile.candidateName} profile: Top technical strengths: ${strongest}. Priority growth targets: ${weakest}. Communication index: ${commScore}/100, Behavioral index: ${behavScore}/100. Target adaptive probing on ${weakest} to verify conceptual evolution.`;
}

/**
 * Updates the candidate's digital profile after completing an interview session.
 * Uses exponential smoothing to update skill masteries and appends to session ledger.
 */
export function updateDigitalProfileFromSession(
  currentProfile: CandidateDigitalProfile,
  turns: InterviewTurn[],
  candidateProfile: CandidateProfile
): {
  updatedProfile: CandidateDigitalProfile;
  skillDeltas: { skillName: string; oldScore: number; newScore: number; delta: number }[];
} {
  if (turns.length === 0) {
    return { updatedProfile: currentProfile, skillDeltas: [] };
  }

  // Calculate session averages
  const overallAvg = Math.round(turns.reduce((acc, t) => acc + t.score, 0) / turns.length);
  const eyeContactAvg = Math.round(turns.reduce((acc, t) => acc + t.signals.eyeContact, 0) / turns.length);
  const paceAvg = Math.round(turns.reduce((acc, t) => acc + (t.breakdown?.speaking_pace ?? 80), 0) / turns.length);
  const voiceAvg = Math.round(turns.reduce((acc, t) => acc + t.signals.voice, 0) / turns.length);
  const techAvg = Math.round(turns.reduce((acc, t) => acc + (t.breakdown?.technical_accuracy ?? t.score), 0) / turns.length);

  const skillDeltas: { skillName: string; oldScore: number; newScore: number; delta: number }[] = [];
  const alpha = 0.25; // Exponential smoothing rate

  // Clone profile pillars
  const nextPillars = JSON.parse(JSON.stringify(currentProfile.pillars)) as typeof currentProfile.pillars;

  function updateSkill(skill: SkillMasteryItem, sampleScore: number) {
    const oldScore = skill.score;
    const newScore = Math.round(alpha * sampleScore + (1 - alpha) * oldScore);
    const delta = newScore - oldScore;

    skill.score = Math.min(100, Math.max(10, newScore));
    skill.assessmentsCount += 1;
    skill.lastUpdated = new Date().toISOString().split("T")[0];
    skill.trend = delta > 0 ? "improving" : delta < 0 ? "declining" : "stable";

    skillDeltas.push({
      skillName: skill.name,
      oldScore,
      newScore: skill.score,
      delta,
    });
  }

  // 1. Update Technical Skills based on turns content
  const transcriptText = turns.map((t) => `${t.question} ${t.answer}`).join(" ").toLowerCase();

  if (transcriptText.includes("python") || transcriptText.includes("function") || transcriptText.includes("class")) {
    if (nextPillars.technical.skills.python) updateSkill(nextPillars.technical.skills.python, techAvg);
  }
  if (transcriptText.includes("ml") || transcriptText.includes("model") || transcriptText.includes("forest") || transcriptText.includes("xgboost")) {
    if (nextPillars.technical.skills.ml) updateSkill(nextPillars.technical.skills.ml, techAvg);
  }
  if (transcriptText.includes("sql") || transcriptText.includes("database") || transcriptText.includes("query")) {
    if (nextPillars.technical.skills.sql) updateSkill(nextPillars.technical.skills.sql, techAvg);
  }
  if (transcriptText.includes("rag") || transcriptText.includes("chunk") || transcriptText.includes("retrieval") || transcriptText.includes("vector")) {
    if (nextPillars.technical.skills.rag) updateSkill(nextPillars.technical.skills.rag, techAvg);
  }
  if (candidateProfile.interviewType === "Coding" || transcriptText.includes("algorithm") || transcriptText.includes("complexity")) {
    if (nextPillars.technical.skills.dsa) updateSkill(nextPillars.technical.skills.dsa, techAvg);
  }
  if (candidateProfile.interviewType === "System Design" || transcriptText.includes("load balancer") || transcriptText.includes("cache")) {
    if (nextPillars.technical.skills.system_design) updateSkill(nextPillars.technical.skills.system_design, techAvg);
  }

  // 2. Update Communication Skills
  if (nextPillars.communication.skills.eye_contact) updateSkill(nextPillars.communication.skills.eye_contact, eyeContactAvg);
  if (nextPillars.communication.skills.pace) updateSkill(nextPillars.communication.skills.pace, paceAvg);
  if (nextPillars.communication.skills.voice) updateSkill(nextPillars.communication.skills.voice, voiceAvg);
  if (nextPillars.communication.skills.structure) {
    const starDetected = turns.some((t) => t.structureAnalysis && t.structureAnalysis.structureScore >= 75);
    updateSkill(nextPillars.communication.skills.structure, starDetected ? 90 : 78);
  }

  // 3. Update Behavioral Skills
  if (nextPillars.behavioral.skills.problem_solving) updateSkill(nextPillars.behavioral.skills.problem_solving, overallAvg);
  if (nextPillars.behavioral.skills.resilience) {
    const stressScore = candidateProfile.personaId === "stress_interviewer" ? Math.min(100, overallAvg + 5) : overallAvg;
    updateSkill(nextPillars.behavioral.skills.resilience, stressScore);
  }

  // Recompute Pillar Scores
  const techSkillsArr = Object.values(nextPillars.technical.skills);
  nextPillars.technical.score = Math.round(techSkillsArr.reduce((a, b) => a + b.score, 0) / techSkillsArr.length);

  const commSkillsArr = Object.values(nextPillars.communication.skills);
  nextPillars.communication.score = Math.round(commSkillsArr.reduce((a, b) => a + b.score, 0) / commSkillsArr.length);

  const behavSkillsArr = Object.values(nextPillars.behavioral.skills);
  nextPillars.behavioral.score = Math.round(behavSkillsArr.reduce((a, b) => a + b.score, 0) / behavSkillsArr.length);

  const newOverallReadiness = Math.round(
    nextPillars.technical.score * 0.45 +
    nextPillars.communication.score * 0.35 +
    nextPillars.behavioral.score * 0.20
  );

  // New Session Record
  const newSessionRecord: ProfileSessionRecord = {
    id: `sess-${Date.now().toString().slice(-4)}`,
    timestamp: new Date().toISOString(),
    targetRole: candidateProfile.targetRole,
    department: candidateProfile.department,
    overallScore: overallAvg,
    technicalScore: techAvg,
    communicationScore: Math.round((eyeContactAvg + paceAvg + voiceAvg) / 3),
    behavioralScore: nextPillars.behavioral.score,
    topStrength: turns[0]?.retrievedConcepts?.[0] ?? "Solid conceptual articulation",
    primaryWeakArea: turns[0]?.weakArea ?? "Deep technical precision on edge conditions",
  };

  const updatedProfile: CandidateDigitalProfile = {
    ...currentProfile,
    candidateName: candidateProfile.name || currentProfile.candidateName,
    sessionsCompleted: currentProfile.sessionsCompleted + 1,
    lastInterviewDate: new Date().toISOString().split("T")[0],
    overallReadiness: newOverallReadiness,
    pillars: nextPillars,
    sessionHistory: [newSessionRecord, ...currentProfile.sessionHistory].slice(0, 10),
    ragMemoryContext: "",
  };

  updatedProfile.ragMemoryContext = generateRAGProfileContext(updatedProfile);

  saveDigitalProfile(updatedProfile);

  return {
    updatedProfile,
    skillDeltas,
  };
}
