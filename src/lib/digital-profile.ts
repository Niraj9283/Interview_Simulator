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

const SESSION_STORAGE_KEY = "mockmate_candidate_session_profile_v2";
const LEGACY_STORAGE_KEY = "mockmate_candidate_digital_profile_v1";

/**
 * Creates a fresh, clean digital profile with zeroed metrics and the candidate's actual entered name.
 */
export function createFreshDigitalProfile(candidateName: string = ""): CandidateDigitalProfile {
  const cleanName = candidateName.trim();
  return {
    candidateId: `cand-${Date.now().toString(36)}`,
    candidateName: cleanName,
    sessionsCompleted: 0,
    lastInterviewDate: "None yet",
    overallReadiness: 0,
    pillars: {
      technical: {
        score: 0,
        skills: {
          python: { id: "python", name: "Python", score: 0, category: "Technical", assessmentsCount: 0, lastUpdated: "Never", trend: "stable" },
          ml: { id: "ml", name: "Machine Learning (XGBoost/RF)", score: 0, category: "Technical", assessmentsCount: 0, lastUpdated: "Never", trend: "stable" },
          sql: { id: "sql", name: "SQL & Query Optimization", score: 0, category: "Technical", assessmentsCount: 0, lastUpdated: "Never", trend: "stable" },
          rag: { id: "rag", name: "RAG & LLM Architectures", score: 0, category: "Technical", assessmentsCount: 0, lastUpdated: "Never", trend: "stable" },
          system_design: { id: "system_design", name: "System Design & Scalability", score: 0, category: "Technical", assessmentsCount: 0, lastUpdated: "Never", trend: "stable" },
          dsa: { id: "dsa", name: "Data Structures & Algorithms", score: 0, category: "Technical", assessmentsCount: 0, lastUpdated: "Never", trend: "stable" },
        },
      },
      communication: {
        score: 0,
        skills: {
          eye_contact: { id: "eye_contact", name: "Eye Contact & Gaze Stability", score: 0, category: "Communication", assessmentsCount: 0, lastUpdated: "Never", trend: "stable" },
          pace: { id: "pace", name: "Speaking Pace (120-150 WPM)", score: 0, category: "Communication", assessmentsCount: 0, lastUpdated: "Never", trend: "stable" },
          voice: { id: "voice", name: "Voice Energy & Acoustic Steadiness", score: 0, category: "Communication", assessmentsCount: 0, lastUpdated: "Never", trend: "stable" },
          structure: { id: "structure", name: "Answer Structure & STAR Framing", score: 0, category: "Communication", assessmentsCount: 0, lastUpdated: "Never", trend: "stable" },
        },
      },
      behavioral: {
        score: 0,
        skills: {
          leadership: { id: "leadership", name: "Leadership & Initiative", score: 0, category: "Behavioral", assessmentsCount: 0, lastUpdated: "Never", trend: "stable" },
          problem_solving: { id: "problem_solving", name: "Problem Solving & Analytical Rigor", score: 0, category: "Behavioral", assessmentsCount: 0, lastUpdated: "Never", trend: "stable" },
          teamwork: { id: "teamwork", name: "Teamwork & Cross-functional Empathy", score: 0, category: "Behavioral", assessmentsCount: 0, lastUpdated: "Never", trend: "stable" },
          resilience: { id: "resilience", name: "Composure Under Pressure", score: 0, category: "Behavioral", assessmentsCount: 0, lastUpdated: "Never", trend: "stable" },
        },
      },
    },
    sessionHistory: [],
    ragMemoryContext:
      "Awaiting first completed interview session in this browser session to calibrate your personalized RAG knowledge memory context.",
  };
}

export const DEFAULT_DIGITAL_PROFILE: CandidateDigitalProfile = createFreshDigitalProfile("");

/**
 * Loads the candidate's digital profile from sessionStorage (automatically resets when the site/tab is closed).
 * Legacy localStorage data is purged so that stale seeded metrics never re-appear.
 */
export function loadStoredDigitalProfile(initialCandidateName?: string): CandidateDigitalProfile {
  if (typeof window === "undefined") {
    return createFreshDigitalProfile(initialCandidateName);
  }

  // Purge any legacy localStorage data
  try {
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // ignore
  }

  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) {
      const fresh = createFreshDigitalProfile(initialCandidateName);
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(fresh));
      return fresh;
    }
    const parsed = JSON.parse(raw) as CandidateDigitalProfile;
    if (initialCandidateName && initialCandidateName.trim()) {
      parsed.candidateName = initialCandidateName.trim();
    }
    return parsed;
  } catch {
    return createFreshDigitalProfile(initialCandidateName);
  }
}

/**
 * Persists the digital profile to sessionStorage (scoped strictly to the current browser session).
 */
export function saveDigitalProfile(profile: CandidateDigitalProfile): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // ignore
  }
}

/**
 * Resets the digital profile to a fresh baseline with only the currently entered name.
 */
export function resetDigitalProfile(candidateName?: string): CandidateDigitalProfile {
  if (typeof window !== "undefined") {
    try {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch {
      // ignore
    }
  }
  const fresh = createFreshDigitalProfile(candidateName);
  saveDigitalProfile(fresh);
  return fresh;
}

/**
 * Generates an updated RAG memory context string reflecting the candidate's current profile.
 */
export function generateRAGProfileContext(profile: CandidateDigitalProfile): string {
  if (profile.sessionsCompleted === 0) {
    return "Awaiting first completed interview session in this browser session to calibrate your personalized RAG knowledge memory context.";
  }

  const tech = profile.pillars.technical.skills;
  const sortedTech = Object.values(tech).sort((a, b) => b.score - a.score);
  const strongest = sortedTech.slice(0, 2).map((s) => `${s.name} (${s.score})`).join(", ");
  const weakest = sortedTech.slice(-2).map((s) => `${s.name} (${s.score})`).join(", ");

  const commScore = profile.pillars.communication.score;
  const behavScore = profile.pillars.behavioral.score;
  const displayName = profile.candidateName || "Candidate";

  return `Candidate ${displayName} profile: Top technical strengths: ${strongest}. Priority growth targets: ${weakest}. Communication index: ${commScore}/100, Behavioral index: ${behavScore}/100. Target adaptive probing on ${weakest} to verify conceptual evolution.`;
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
