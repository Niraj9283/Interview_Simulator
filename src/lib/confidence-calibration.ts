export type CalibrationStatus = "Well-Calibrated" | "Overconfident" | "Underconfident";

export interface ConfidenceCalibrationResult {
  status: CalibrationStatus;
  confidenceScore: number;
  technicalScore: number;
  gap: number;
  badgeColor: string;
  headline: string;
  diagnosis: string;
  coachingAdvice: string;
}

/**
 * Calibrates candidate confidence against demonstrated technical accuracy.
 * Identifies potential knowledge blindspots (bluffing/overconfidence)
 * or imposter syndrome (under-confidence).
 */
export function computeConfidenceCalibration(
  confidenceScore: number,
  technicalScore: number
): ConfidenceCalibrationResult {
  const gap = confidenceScore - technicalScore;

  if (gap >= 22) {
    return {
      status: "Overconfident",
      confidenceScore,
      technicalScore,
      gap,
      badgeColor: "#EF4444", // Red
      headline: "Confidence Exceeds Demonstrated Depth",
      diagnosis: `Your delivery confidence (${confidenceScore}%) significantly exceeded your verified technical accuracy (${technicalScore}%). This triggers a potential knowledge-blindspot warning with senior interviewers.`,
      coachingAdvice:
        "When encountering topics where your recall is uncertain, resist making speculative statements. Acknowledge trade-offs and edge cases explicitly, or verify your assumptions before asserting conclusions.",
    };
  }

  if (gap <= -22) {
    return {
      status: "Underconfident",
      confidenceScore,
      technicalScore,
      gap,
      badgeColor: "#F59E0B", // Amber
      headline: "Under-Confident Delivery Despite Strong Knowledge",
      diagnosis: `Your technical knowledge (${technicalScore}%) was very strong, but your delivery confidence (${confidenceScore}%) was noticeably hesitant. You may be underselling your competency.`,
      coachingAdvice:
        "Replace hedge words ('I guess', 'maybe', 'sort of') with definitive engineering terminology. Speak with steady vocal cadence and state your proven architectural reasoning with conviction.",
    };
  }

  return {
    status: "Well-Calibrated",
    confidenceScore,
    technicalScore,
    gap,
    badgeColor: "#10B981", // Emerald
    headline: "Well-Calibrated Engineering Poise",
    diagnosis: `Your confidence (${confidenceScore}%) and technical accuracy (${technicalScore}%) are harmoniously aligned. You project credible authority grounded in verified engineering principles.`,
    coachingAdvice:
      "Maintain this balanced posture: assert what you know with clarity while remaining transparent and thoughtful when navigating open-ended architectural ambiguities.",
  };
}
