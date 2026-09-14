import { ConfidenceCalibrationResult } from "./confidence-calibration";
import { IndependentEvaluatorScores } from "./multi-evaluator";
import { PostInterviewRoadmap } from "./interview";

export interface StoredInterviewSession {
  id: string;
  timestamp: string;
  candidateName: string;
  targetCompany: string;
  targetRole: string;
  interviewMode: string;
  experienceLevel: string;
  overallScore: number;
  evaluatorScores: IndependentEvaluatorScores;
  domainReadiness: {
    dsa: number;
    dbms: number;
    os: number;
    networking: number;
    systemDesign: number;
    communication: number;
  };
  questionsCount: number;
  weakAreas: string[];
  confidenceCalibration?: ConfidenceCalibrationResult;
  roadmap?: PostInterviewRoadmap;
}

export interface ReadinessProgressSummary {
  overallReadiness: number; // 0 - 100
  deltaVsPrevious: number;  // e.g. +6 or -2
  totalSessionsCompleted: number;
  latestScore: number;
  averageScore: number;
  domainReadiness: {
    dsa: number;
    dbms: number;
    os: number;
    networking: number;
    systemDesign: number;
    communication: number;
  };
  recommendationBadge: string;
  criticalGapsToReview: string[];
}

const STORAGE_KEY = "mockmate_interview_history_v2";

/**
 * Loads all saved interview sessions from localStorage.
 */
export function loadInterviewHistory(): StoredInterviewSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultSampleSessions();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : getDefaultSampleSessions();
  } catch (err) {
    console.warn("Failed to read interview history from localStorage:", err);
    return getDefaultSampleSessions();
  }
}

/**
 * Saves a new completed interview session to localStorage.
 */
export function saveInterviewSession(session: StoredInterviewSession): void {
  if (typeof window === "undefined") return;
  try {
    const history = loadInterviewHistory();
    // Keep maximum 20 latest sessions
    const updated = [session, ...history.filter((s) => s.id !== session.id)].slice(0, 20);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn("Failed to persist interview session:", err);
  }
}

/**
 * Computes interview readiness progress and delta across completed interviews.
 */
export function computeReadinessProgress(history: StoredInterviewSession[]): ReadinessProgressSummary {
  if (!history || history.length === 0) {
    return {
      overallReadiness: 50,
      deltaVsPrevious: 0,
      totalSessionsCompleted: 0,
      latestScore: 50,
      averageScore: 50,
      domainReadiness: {
        dsa: 50,
        dbms: 50,
        os: 50,
        networking: 50,
        systemDesign: 50,
        communication: 50,
      },
      recommendationBadge: "Initial Assessment Required",
      criticalGapsToReview: ["Data Structures & Algorithms", "System Design"],
    };
  }

  const latest = history[0];
  const previous = history.length > 1 ? history[1] : null;
  const deltaVsPrevious = previous ? latest.overallScore - previous.overallScore : 0;

  const totalScore = history.reduce((acc, s) => acc + s.overallScore, 0);
  const averageScore = Math.round(totalScore / history.length);

  // Blend weighted scores from recent history
  const domainTotals = history.slice(0, 5).reduce(
    (acc, s) => {
      acc.dsa += s.domainReadiness.dsa;
      acc.dbms += s.domainReadiness.dbms;
      acc.os += s.domainReadiness.os;
      acc.networking += s.domainReadiness.networking;
      acc.systemDesign += s.domainReadiness.systemDesign;
      acc.communication += s.domainReadiness.communication;
      return acc;
    },
    { dsa: 0, dbms: 0, os: 0, networking: 0, systemDesign: 0, communication: 0 }
  );

  const sampleCount = Math.min(history.length, 5);
  const domainReadiness = {
    dsa: Math.round(domainTotals.dsa / sampleCount),
    dbms: Math.round(domainTotals.dbms / sampleCount),
    os: Math.round(domainTotals.os / sampleCount),
    networking: Math.round(domainTotals.networking / sampleCount),
    systemDesign: Math.round(domainTotals.systemDesign / sampleCount),
    communication: Math.round(domainTotals.communication / sampleCount),
  };

  const overallReadiness = Math.round(
    domainReadiness.dsa * 0.25 +
    domainReadiness.systemDesign * 0.20 +
    domainReadiness.communication * 0.20 +
    domainReadiness.dbms * 0.15 +
    domainReadiness.os * 0.10 +
    domainReadiness.networking * 0.10
  );

  let recommendationBadge = "Needs Core Preparation";
  if (overallReadiness >= 85) recommendationBadge = "Ready for Senior FAANG Onsites";
  else if (overallReadiness >= 75) recommendationBadge = "Ready for Tech Screenings";
  else if (overallReadiness >= 65) recommendationBadge = "Competitive for Junior / Mid Roles";

  const criticalGapsToReview: string[] = [];
  if (domainReadiness.os < 60) criticalGapsToReview.push("Operating Systems & Concurrency");
  if (domainReadiness.dbms < 60) criticalGapsToReview.push("DBMS & B+ Tree Storage Internals");
  if (domainReadiness.systemDesign < 60) criticalGapsToReview.push("Distributed System Scalability & Caching");
  if (domainReadiness.dsa < 60) criticalGapsToReview.push("Dynamic Programming & Graph Algorithms");
  if (criticalGapsToReview.length === 0) criticalGapsToReview.push("Polishing STAR Delivery & Edge Cases");

  return {
    overallReadiness,
    deltaVsPrevious,
    totalSessionsCompleted: history.length,
    latestScore: latest.overallScore,
    averageScore,
    domainReadiness,
    recommendationBadge,
    criticalGapsToReview,
  };
}

/**
 * Returns default baseline benchmark sessions if user has no recorded history yet.
 */
function getDefaultSampleSessions(): StoredInterviewSession[] {
  return [
    {
      id: "session_sample_02",
      timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
      candidateName: "Candidate",
      targetCompany: "Google",
      targetRole: "Software Engineer",
      interviewMode: "Technical Interview",
      experienceLevel: "0-2 years",
      overallScore: 74,
      evaluatorScores: {
        semanticScore: 76,
        technicalScore: 75,
        problemSolvingScore: 78,
        relevanceScore: 82,
        communicationScore: 70,
        structureScore: 72,
        confidenceScore: 68,
      },
      domainReadiness: {
        dsa: 80,
        dbms: 62,
        os: 51,
        networking: 60,
        systemDesign: 52,
        communication: 84,
      },
      questionsCount: 4,
      weakAreas: ["Operating Systems Paging & Virtual Memory", "Hash Table Collision Resolution"],
    },
    {
      id: "session_sample_01",
      timestamp: new Date(Date.now() - 86400000 * 6).toISOString(),
      candidateName: "Candidate",
      targetCompany: "Amazon",
      targetRole: "Software Engineer",
      interviewMode: "Technical Interview",
      experienceLevel: "0-2 years",
      overallScore: 68,
      evaluatorScores: {
        semanticScore: 70,
        technicalScore: 66,
        problemSolvingScore: 68,
        relevanceScore: 75,
        communicationScore: 65,
        structureScore: 68,
        confidenceScore: 62,
      },
      domainReadiness: {
        dsa: 72,
        dbms: 55,
        os: 44,
        networking: 52,
        systemDesign: 45,
        communication: 78,
      },
      questionsCount: 3,
      weakAreas: ["B+ Tree Storage vs LSM-Trees", "Deadlock Prevention Coffman Conditions"],
    },
  ];
}
