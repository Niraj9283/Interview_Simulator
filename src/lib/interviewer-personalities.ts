/**
 * Interviewer Personalities Engine
 * 
 * Provides 5 distinct AI interviewer personas with specialized behavioral dynamics,
 * tone modifiers, questioning depths, and configurable stress-mode parameters.
 */

export type InterviewerPersonaId =
  | "technical"
  | "hr"
  | "manager"
  | "senior_engineer"
  | "stress_interviewer";

export interface StressModeConfig {
  intensity: "mild" | "moderate" | "high";
  timeLimitSec: number; // e.g. 60s (mild), 45s (moderate), 30s (high)
  enableInterruptions: boolean;
  enableTimePressureClock: boolean;
}

export interface InterviewerPersona {
  id: InterviewerPersonaId;
  name: string;
  role: string;
  avatarEmoji: string;
  tagline: string;
  accentColor: string;
  borderColor: string;
  badgeBg: string;
  behavioralFocus: string[];
  speechStyle: string;
  defaultStressConfig?: StressModeConfig;
  greetingPrompt: string;
  questionModifier: (baseQuestion: string, turnIndex: number, stressConfig?: StressModeConfig) => string;
}

export const INTERVIEWER_PERSONAS: Record<InterviewerPersonaId, InterviewerPersona> = {
  technical: {
    id: "technical",
    name: "Alex Rivera",
    role: "Technical Lead",
    avatarEmoji: "🧑",
    tagline: "Pragmatic Architect & Code Reviewer",
    accentColor: "text-blue-400",
    borderColor: "border-blue-500/40",
    badgeBg: "bg-blue-500/20 text-blue-300",
    behavioralFocus: [
      "Clean Code & Idiomatic Patterns",
      "Practical System Design Tradeoffs",
      "Maintainability & Modularity",
    ],
    speechStyle: "Objective, collaborative, and focused on production engineering realities.",
    greetingPrompt: "Hi there! I'm Alex. Let's explore your technical background, problem-solving habits, and how you approach building maintainable software.",
    questionModifier: (base, turnIndex) => {
      if (turnIndex === 0) return `[Alex Rivera - Tech Lead]: Let's start with your engineering foundation. ${base}`;
      if (turnIndex % 2 === 1) return `[Alex Rivera - Tech Lead]: From an implementation and maintenance perspective: ${base} What tradeoffs would you make in a live production environment?`;
      return `[Alex Rivera - Tech Lead]: ${base}`;
    },
  },

  hr: {
    id: "hr",
    name: "Sarah Jenkins",
    role: "HR & Culture Director",
    avatarEmoji: "👩",
    tagline: "People, Values & Collaboration",
    accentColor: "text-emerald-400",
    borderColor: "border-emerald-500/40",
    badgeBg: "bg-emerald-500/20 text-emerald-300",
    behavioralFocus: [
      "STAR Framework (Situation, Task, Action, Result)",
      "Conflict Resolution & Empathy",
      "Growth Mindset & Cultural Alignment",
    ],
    speechStyle: "Warm, empathetic, and attentive to team dynamics and communication habits.",
    greetingPrompt: "Hello! I'm Sarah from Talent & Culture. I'm excited to learn about your journey, how you collaborate with teammates, and your values.",
    questionModifier: (base, turnIndex) => {
      if (turnIndex === 0) return `[Sarah Jenkins - HR]: Welcome! I'd love to understand your working style. ${base}`;
      return `[Sarah Jenkins - HR]: Thinking about collaboration and team communication: ${base} Please structure your response using the STAR method (Situation, Task, Action, Result).`;
    },
  },

  manager: {
    id: "manager",
    name: "David Vance",
    role: "Engineering Manager",
    avatarEmoji: "👨‍💼",
    tagline: "Delivery, Stakeholders & Prioritization",
    accentColor: "text-amber-400",
    borderColor: "border-amber-500/40",
    badgeBg: "bg-amber-500/20 text-amber-300",
    behavioralFocus: [
      "Timeline & Effort Estimation",
      "Managing Technical Debt vs Business Deadlines",
      "Cross-Functional Stakeholder Alignment",
    ],
    speechStyle: "Strategic, outcome-driven, and focused on business value delivery.",
    greetingPrompt: "Good to meet you! I'm David, Engineering Manager. I'll be looking closely at how you balance engineering excellence with business delivery.",
    questionModifier: (base, turnIndex) => {
      if (turnIndex === 0) return `[David Vance - EM]: Let's look at your execution track record. ${base}`;
      return `[David Vance - EM]: From a project delivery standpoint: ${base} How do you manage stakeholder expectations when deadlines or scope change?`;
    },
  },

  senior_engineer: {
    id: "senior_engineer",
    name: "Dr. Elena Rostova",
    role: "Principal / Senior Staff Engineer",
    avatarEmoji: "🧑‍💻",
    tagline: "Deep Technical Follow-ups & Internals",
    accentColor: "text-purple-400",
    borderColor: "border-purple-500/40",
    badgeBg: "bg-purple-500/20 text-purple-300",
    behavioralFocus: [
      "Under-the-Hood Runtime Internals & OS Mechanics",
      "Concurrency, Race Conditions & Memory Models",
      "Distributed Edge Cases & Failure Modes",
    ],
    speechStyle: "Analytical, deeply rigorous, and probes edge-case mechanics.",
    greetingPrompt: "Greetings. I'm Elena, Principal Engineer. We'll be diving deep into algorithmic complexity, low-level execution mechanics, and edge case resilience.",
    questionModifier: (base, turnIndex) => {
      if (turnIndex === 0) return `[Dr. Elena Rostova - Principal]: Let's probe the internal mechanics of your work. ${base} What happens under the hood at the runtime / kernel level?`;
      if (turnIndex % 2 === 1) return `[Dr. Elena Rostova - Principal]: Deep technical follow-up: ${base} How does your solution behave under lock contention, memory pressure, or asynchronous race conditions?`;
      return `[Dr. Elena Rostova - Principal]: ${base} Be specific about internal data structures and computational complexity.`;
    },
  },

  stress_interviewer: {
    id: "stress_interviewer",
    name: "Marcus 'Viper' Stone",
    role: "High-Pressure Stress Interviewer",
    avatarEmoji: "😈",
    tagline: "Time Pressure & Rapid Follow-ups",
    accentColor: "text-rose-400",
    borderColor: "border-rose-500/40",
    badgeBg: "bg-rose-500/20 text-rose-300",
    behavioralFocus: [
      "Composure & Resilience Under Rapid Timelines",
      "Challenging Initial Assumptions",
      "Defending Architectural Decisions Under Fire",
    ],
    speechStyle: "Fast-paced, direct, probing, yet strictly professional and constructive.",
    defaultStressConfig: {
      intensity: "moderate",
      timeLimitSec: 45,
      enableInterruptions: true,
      enableTimePressureClock: true,
    },
    greetingPrompt: "Let's move quickly. I'm Marcus. In this session, we test your composure, rapid reasoning, and how well you defend your decisions under tight deadlines.",
    questionModifier: (base, turnIndex, stressConfig) => {
      const timeSec = stressConfig?.timeLimitSec ?? 45;
      const intensity = stressConfig?.intensity ?? "moderate";

      if (turnIndex === 0) {
        return `[Marcus Stone - High-Pressure]: Rapid Checkpoint (${timeSec}s clock): ${base} Give me your most concise, high-impact answer without fluff.`;
      }
      if (intensity === "high" || turnIndex % 2 === 1) {
        return `[Marcus Stone - High-Pressure]: [CHALLENGE PROBE - ${timeSec}s limit]: ${base} Most candidates fail to anticipate edge failure. Defend your decision: why wouldn't this collapse under extreme load?`;
      }
      return `[Marcus Stone - High-Pressure]: (${timeSec}s timebox): ${base} Be direct and justify your core assumption.`;
    },
  },
};

export const INTERVIEWER_PERSONA_LIST = Object.values(INTERVIEWER_PERSONAS);

export function getInterviewerPersona(id: InterviewerPersonaId = "technical"): InterviewerPersona {
  return INTERVIEWER_PERSONAS[id] || INTERVIEWER_PERSONAS.technical;
}
