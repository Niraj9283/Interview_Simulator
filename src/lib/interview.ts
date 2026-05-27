import {
  DepartmentId,
  InterviewTrack,
  getQuestionsForSelection,
  isTrackAvailableForDepartment,
} from "./role-database";

export type InterviewDomain = InterviewTrack;

export type InterviewDifficulty = "Warmup" | "Standard" | "Senior";

export type VoiceSignal = {
  pace: number;
  energy: number;
  steadiness: number;
};

export type CandidateProfile = {
  name: string;
  department: DepartmentId;
  targetRole: string;
  domain: InterviewDomain;
  difficulty: InterviewDifficulty;
  resumeText: string;
};

export type InterviewTurn = {
  id: number;
  question: string;
  answer: string;
  score: number;
  latencyMs: number;
  signals: {
    clarity: number;
    relevance: number;
    structure: number;
    confidence: number;
    voice: number;
    eyeContact: number;
  };
  feedback: string[];
};

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

export function generateQuestion(
  profile: CandidateProfile,
  turnIndex: number,
  history: InterviewTurn[],
) {
  const keywords = extractKeywords(profile.resumeText, profile.targetRole);
  const anchor = keywords[turnIndex % Math.max(keywords.length, 1)] ?? profile.targetRole;
  const lastTurn = history.at(-1);
  const needsClarification = lastTurn ? lastTurn.score < 68 : false;
  const safeTrack = isTrackAvailableForDepartment(profile.department, profile.domain)
    ? profile.domain
    : "Role Specific";
  const roleQuestions = getQuestionsForSelection(profile.department, profile.targetRole, safeTrack);
  const baseQuestion =
    roleQuestions[turnIndex % Math.max(roleQuestions.length, 1)] ??
    `What makes you a strong fit for ${profile.targetRole}?`;

  if (needsClarification) {
    return `Let's tighten the previous answer. Can you restate your approach for ${anchor} in the ${profile.targetRole} role with a clearer problem, action, and measurable result?`;
  }

  if (profile.difficulty === "Senior") {
    return `${baseQuestion} Include tradeoffs, risks, and how you would measure success.`;
  }

  if (profile.difficulty === "Warmup") {
    return `${baseQuestion} Keep the answer concise and practical.`;
  }

  return baseQuestion;
}

export function scoreAnswer(
  answer: string,
  question: string,
  keywords: string[],
  voiceSignal: VoiceSignal,
  eyeContact: number,
) {
  const normalized = answer.toLowerCase();
  const words: string[] = normalized.match(/[a-z0-9+#.]+/g) ?? [];
  const uniqueWords = new Set(words);
  const relevantTerms = [...keywords, ...question.toLowerCase().split(/\s+/)]
    .filter((term) => term.length > 4)
    .slice(0, 14);
  const relevanceHits = relevantTerms.filter((term) => normalized.includes(term)).length;
  const structureMarkers = ["first", "second", "because", "result", "impact", "tradeoff", "therefore"].filter(
    (marker) => normalized.includes(marker),
  ).length;
  const fillerHits = ["um", "uh", "like", "basically", "actually", "maybe"].filter((word) =>
    words.includes(word),
  ).length;

  const clarity = clamp(Math.round(44 + words.length * 1.4 + uniqueWords.size * 0.35 - fillerHits * 7));
  const relevance = clamp(Math.round(48 + relevanceHits * 8 + Math.min(words.length, 120) * 0.08));
  const structure = clamp(Math.round(40 + structureMarkers * 12 + (normalized.includes("example") ? 8 : 0)));
  const voice = clamp(Math.round((voiceSignal.energy + voiceSignal.steadiness + voiceSignal.pace) / 3));
  const confidence = clamp(Math.round(38 + words.length * 0.7 + voice * 0.25 + eyeContact * 0.16 - fillerHits * 5));
  const score = clamp(Math.round(clarity * 0.22 + relevance * 0.28 + structure * 0.2 + confidence * 0.18 + voice * 0.12));

  const feedback = buildFeedback({
    clarity,
    relevance,
    structure,
    confidence,
    voice,
    eyeContact,
    words: words.length,
  });

  return {
    score,
    signals: {
      clarity,
      relevance,
      structure,
      confidence,
      voice,
      eyeContact: clamp(Math.round(eyeContact)),
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
}) {
  const feedback: string[] = [];

  if (scores.words < 45) {
    feedback.push("Expand with a concrete example, decision, and result.");
  }

  if (scores.structure < 70) {
    feedback.push("Use a sharper structure: context, action, tradeoff, impact.");
  }

  if (scores.relevance < 72) {
    feedback.push("Tie the answer more directly to the question and role keywords.");
  }

  if (scores.voice < 68) {
    feedback.push("Aim for steadier pacing and fuller sentence endings.");
  }

  if (scores.eyeContact < 65) {
    feedback.push("Raise camera presence with more consistent forward focus.");
  }

  if (feedback.length === 0) {
    feedback.push("Strong answer. Add one quantified outcome to make it sharper.");
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
