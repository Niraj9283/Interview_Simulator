/**
 * Voice Answer Engine & Technical Lexicon Normalizer
 * 
 * Provides:
 * 1. Explicit Voice Recording State Machine (idle -> recording -> processing -> ready).
 * 2. Technical Vocabulary Post-Transcription Normalizer (e.g. "pie torch" -> "PyTorch").
 * 3. Multimodal Delivery Metadata bundle (WPM, Energy, Gaze, Pauses, Fillers).
 */

export type VoiceAnswerState = "idle" | "recording" | "processing" | "ready";
export type InterviewInputMode = "hybrid" | "voice_only" | "text_only";

export interface DeliveryMetadata {
  durationSeconds: number;
  wordCount: number;
  wpm: number;
  averageEnergy: number; // 0 - 100
  eyeContact: number; // 0 - 100
  pauseCount: number;
  fillerWords: number;
}

export interface VoiceTranscriptBundle {
  raw: string;
  normalized: string;
  correctionsApplied: { from: string; to: string }[];
  delivery: DeliveryMetadata;
}

/**
 * Technical Vocabulary Normalization Dictionary
 * Corrects common speech-to-text misspellings of technical frameworks, databases, and algorithms.
 */
const TECH_NORMALIZATION_RULES: { pattern: RegExp; replacement: string; label: string }[] = [
  { pattern: /\b(pie\s*torch|py\s*torch)\b/gi, replacement: "PyTorch", label: "PyTorch" },
  { pattern: /\b(post\s*grass|post\s*gres|post\s*gre\s*s\s*q\s*l)\b/gi, replacement: "PostgreSQL", label: "PostgreSQL" },
  { pattern: /\b(scikit\s*learn|sci\s*kit\s*learn|sklearn)\b/gi, replacement: "scikit-learn", label: "scikit-learn" },
  { pattern: /\b(random\s*forests)\b/gi, replacement: "Random Forest", label: "Random Forest" },
  { pattern: /\b(x\s*g\s*boost|ex\s*g\s*boost)\b/gi, replacement: "XGBoost", label: "XGBoost" },
  { pattern: /\b(mongo\s*d\s*b|mongo\s*database)\b/gi, replacement: "MongoDB", label: "MongoDB" },
  { pattern: /\b(cube\s*netes|kube\s*netes|k8s|k\s*eight\s*s)\b/gi, replacement: "Kubernetes", label: "Kubernetes" },
  { pattern: /\b(fast\s*a\s*p\s*i)\b/gi, replacement: "FastAPI", label: "FastAPI" },
  { pattern: /\b(type\s*script)\b/gi, replacement: "TypeScript", label: "TypeScript" },
  { pattern: /\b(java\s*script)\b/gi, replacement: "JavaScript", label: "JavaScript" },
  { pattern: /\b(next\s*j\s*s|next\s*js)\b/gi, replacement: "Next.js", label: "Next.js" },
  { pattern: /\b(node\s*j\s*s|node\s*js)\b/gi, replacement: "Node.js", label: "Node.js" },
  { pattern: /\b(react\s*j\s*s|react\s*js)\b/gi, replacement: "React", label: "React" },
  { pattern: /\b(red\s*is|read\s*is)\b/gi, replacement: "Redis", label: "Redis" },
  { pattern: /\b(r\s*a\s*g|retrieval\s*augmented\s*generation)\b/gi, replacement: "RAG", label: "RAG" },
  { pattern: /\b(l\s*l\s*m|l\s*l\s*m\s*s)\b/gi, replacement: "LLM", label: "LLM" },
  { pattern: /\b(kafka\s*topic|apache\s*kafka)\b/gi, replacement: "Apache Kafka", label: "Apache Kafka" },
  { pattern: /\b(two\s*pointer|two\s*pointers)\b/gi, replacement: "two-pointer", label: "two-pointer" },
  { pattern: /\b(o\s*of\s*n|o\s*n|big\s*o\s*of\s*n)\b/gi, replacement: "O(N)", label: "O(N)" },
  { pattern: /\b(o\s*of\s*one|big\s*o\s*of\s*one)\b/gi, replacement: "O(1)", label: "O(1)" },
  { pattern: /\b(o\s*of\s*n\s*squared|o\s*n\s*squared)\b/gi, replacement: "O(N²)", label: "O(N²)" },
  { pattern: /\b(o\s*of\s*n\s*log\s*n|o\s*n\s*log\s*n)\b/gi, replacement: "O(N log N)", label: "O(N log N)" },
  { pattern: /\b(b\s*tree|b\s*plus\s*tree)\b/gi, replacement: "B-Tree", label: "B-Tree" },
  { pattern: /\b(hash\s*map|hash\s*table)\b/gi, replacement: "HashMap", label: "HashMap" },
];

/**
 * Normalizes speech-to-text output by applying technical dictionary rules while preserving the raw transcript.
 */
export function normalizeTechnicalTranscript(rawText: string): {
  raw: string;
  normalized: string;
  correctionsApplied: { from: string; to: string }[];
} {
  if (!rawText) {
    return { raw: "", normalized: "", correctionsApplied: [] };
  }

  let normalized = rawText;
  const correctionsApplied: { from: string; to: string }[] = [];

  for (const rule of TECH_NORMALIZATION_RULES) {
    const matches = normalized.match(rule.pattern);
    if (matches && matches.length > 0) {
      for (const m of matches) {
        if (m !== rule.replacement) {
          correctionsApplied.push({ from: m, to: rule.replacement });
        }
      }
      normalized = normalized.replace(rule.pattern, rule.replacement);
    }
  }

  // Capitalize sentence beginnings
  normalized = normalized.replace(/(^\w|\.\s+\w)/gm, (letter) => letter.toUpperCase());

  return {
    raw: rawText,
    normalized,
    correctionsApplied,
  };
}

/**
 * Bundles raw transcript with delivery metrics into a unified delivery payload.
 */
export function packageVoiceAnswer(
  rawTranscript: string,
  durationSeconds: number,
  wpm: number,
  averageEnergy: number,
  eyeContact: number,
  pauseCount: number,
  fillerWords: number
): VoiceTranscriptBundle {
  const { normalized, correctionsApplied } = normalizeTechnicalTranscript(rawTranscript);
  const wordCount = normalized.trim().split(/\s+/).filter(Boolean).length;

  return {
    raw: rawTranscript,
    normalized,
    correctionsApplied,
    delivery: {
      durationSeconds: Math.round(durationSeconds),
      wordCount,
      wpm: Math.round(wpm),
      averageEnergy: Math.round(averageEnergy),
      eyeContact: Math.round(eyeContact),
      pauseCount,
      fillerWords,
    },
  };
}
