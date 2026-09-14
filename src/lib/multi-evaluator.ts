import { CIU_KNOWLEDGE_GRAPH, CIUTopicNode } from "./knowledge-graph";

export interface IndependentEvaluatorScores {
  semanticScore: number;       // Relevance, semantic similarity to domain model answer
  technicalScore: number;      // Correctness, technical depth, factual accuracy
  problemSolvingScore: number; // Decomposition, edge cases, trade-offs
  relevanceScore: number;      // How directly the response answers the question
  communicationScore: number;  // Articulation, vocabulary, fluency
  structureScore: number;      // STAR / logical problem-solving flow
  confidenceScore: number;     // Vocal steadiness, cadence, certainty
}

export interface ScoreExplanation {
  overallScore: number;
  weightedBreakdown: {
    label: string;
    weightPercent: number;
    score: number;
    contribution: number;
    summary: string;
  }[];
  whatWasDoneWell: string[];
  whatWasMissed: string[];
  concreteRecommendation: string;
  matchedCiuTopic?: CIUTopicNode;
}

export interface ComprehensiveEvaluationResult {
  scores: IndependentEvaluatorScores;
  overallScore: number;
  explanation: ScoreExplanation;
  weakAreaDetected?: string;
}

/**
 * Multi-Aspect Evaluator
 * Evaluates candidate responses through 6 independent analytical lenses,
 * applies the 35/20/15/10/10/10 weighted formula, and explains every score.
 */
export function evaluateAnswerMultiAspect(
  question: string,
  answer: string,
  signals?: {
    eyeContact?: number;
    wpm?: number;
    fillerWords?: number;
    volumeConsistency?: number;
  }
): ComprehensiveEvaluationResult {
  const qLower = question.toLowerCase();
  const aLower = answer.toLowerCase();
  const words = aLower.match(/[a-z0-9+#.-]+/g) || [];
  const wordCount = words.length;

  // Find best matched CIU topic
  let bestTopic: CIUTopicNode | undefined;
  let highestMatchCount = 0;

  for (const topic of CIU_KNOWLEDGE_GRAPH) {
    let matches = 0;
    for (const concept of topic.keyConcepts) {
      if (qLower.includes(concept.toLowerCase()) || aLower.includes(concept.toLowerCase())) {
        matches++;
      }
    }
    if (qLower.includes(topic.name.toLowerCase())) {
      matches += 3;
    }
    if (matches > highestMatchCount) {
      highestMatchCount = matches;
      bestTopic = topic;
    }
  }

  // 1. Relevance Evaluator (15% weight)
  // Checks if the answer specifically addresses the question's core subject
  let relevanceScore = 40;
  if (wordCount >= 20) relevanceScore += 25;
  if (wordCount >= 50) relevanceScore += 15;
  const questionKeywords = qLower
    .split(/\W+/)
    .filter((w) => w.length > 3 && !["what", "explain", "describe", "would", "your", "this", "that", "with"].includes(w));
  const matchedQKeywords = questionKeywords.filter((k) => aLower.includes(k));
  if (questionKeywords.length > 0) {
    const qMatchRatio = matchedQKeywords.length / questionKeywords.length;
    relevanceScore += Math.round(qMatchRatio * 20);
  }
  relevanceScore = Math.min(95, Math.max(25, relevanceScore));

  // 2. Technical Evaluator (35% weight)
  // Assesses factual correctness and depth of technical concepts
  let technicalScore = 45;
  const whatWasDoneWell: string[] = [];
  const whatWasMissed: string[] = [];

  if (bestTopic) {
    const matchedRubricSignals = bestTopic.evaluationRubric.strongSignals.filter((signal) =>
      signal.toLowerCase().split(/\W+/).some((w) => w.length > 4 && aLower.includes(w))
    );
    const hitMinimumCriteria = bestTopic.evaluationRubric.minimumCriteria.filter((crit) =>
      crit.toLowerCase().split(/\W+/).some((w) => w.length > 4 && aLower.includes(w))
    );
    const hitRedFlags = bestTopic.evaluationRubric.redFlags.filter((flag) =>
      flag.toLowerCase().split(/\W+/).some((w) => w.length > 5 && aLower.includes(w))
    );

    if (hitMinimumCriteria.length > 0) {
      technicalScore += 20;
      whatWasDoneWell.push(`Satisfied foundational criteria: ${bestTopic.evaluationRubric.minimumCriteria[0]}`);
    } else {
      whatWasMissed.push(`Missing core premise: ${bestTopic.evaluationRubric.minimumCriteria[0]}`);
    }

    if (matchedRubricSignals.length > 0) {
      technicalScore += 25;
      whatWasDoneWell.push(`Demonstrated advanced depth: ${matchedRubricSignals[0]}`);
    } else if (bestTopic.evaluationRubric.strongSignals.length > 0) {
      whatWasMissed.push(`Could articulate deeper mechanism: ${bestTopic.evaluationRubric.strongSignals[0]}`);
    }

    if (hitRedFlags.length > 0) {
      technicalScore -= 20;
      whatWasMissed.push(`Avoid common pitfall: ${hitRedFlags[0]}`);
    }
  } else {
    // Generic technical depth heuristic
    const techSignals = ["complexity", "latency", "memory", "tradeoff", "scale", "concurrency", "optimize", "index", "cache", "async"];
    const hits = techSignals.filter((s) => aLower.includes(s));
    technicalScore += hits.length * 7;
    if (hits.length > 0) {
      whatWasDoneWell.push(`Employed precise technical terminology: ${hits.slice(0, 3).join(", ")}`);
    } else {
      whatWasMissed.push("Lacked discussion of architectural trade-offs, complexity, or resource constraints.");
    }
  }
  technicalScore = Math.min(95, Math.max(30, technicalScore));

  // 3. Problem Solving / Depth Evaluator (20% weight)
  // Assesses edge case analysis, reasoning, trade-offs
  let problemSolvingScore = 40;
  const problemSolvingTerms = ["trade-off", "tradeoff", "edge case", "worst case", "average case", "bottleneck", "alternative", "however", "whereas", "because"];
  const pstHits = problemSolvingTerms.filter((term) => aLower.includes(term));
  problemSolvingScore += Math.min(45, pstHits.length * 12);
  if (wordCount > 60) problemSolvingScore += 10;
  if (pstHits.length > 0) {
    whatWasDoneWell.push(`Analyzed trade-offs and decision rationale explicitly.`);
  } else {
    whatWasMissed.push("Did not weigh alternative approaches or evaluate boundary edge cases.");
  }
  problemSolvingScore = Math.min(95, Math.max(30, problemSolvingScore));

  // 4. Communication Evaluator (10% weight)
  let communicationScore = 65;
  if (signals?.fillerWords !== undefined) {
    if (signals.fillerWords <= 2) communicationScore += 15;
    else if (signals.fillerWords > 5) communicationScore -= 15;
  }
  if (signals?.wpm !== undefined) {
    if (signals.wpm >= 120 && signals.wpm <= 165) communicationScore += 15;
    else if (signals.wpm < 90 || signals.wpm > 190) communicationScore -= 10;
  }
  if (wordCount >= 40 && wordCount <= 220) communicationScore += 10;
  communicationScore = Math.min(95, Math.max(35, communicationScore));

  // 5. Structure Evaluator (10% weight)
  // Checks for STAR or premise -> solution -> conclusion structure
  let structureScore = 50;
  const structureMarkers = ["first", "second", "specifically", "for example", "as a result", "in conclusion", "to summarize", "finally", "situation", "task", "action", "result"];
  const smHits = structureMarkers.filter((m) => aLower.includes(m));
  structureScore += Math.min(40, smHits.length * 12);
  if (smHits.length >= 2) {
    whatWasDoneWell.push("Structured the response with clear logical transitions.");
  } else {
    whatWasMissed.push("Response was unstructured; adopt STAR method (Situation, Task, Action, Result).");
  }
  structureScore = Math.min(95, Math.max(35, structureScore));

  // 6. Confidence Evaluator (10% weight)
  let confidenceScore = 60;
  if (signals?.eyeContact !== undefined) {
    confidenceScore += Math.round((signals.eyeContact - 50) * 0.4);
  }
  if (signals?.volumeConsistency !== undefined) {
    confidenceScore += Math.round((signals.volumeConsistency - 50) * 0.3);
  }
  const hesitantPhrases = ["i guess", "i am not sure", "maybe", "probably", "i don't really know", "sort of", "kind of"];
  const hesitationHits = hesitantPhrases.filter((h) => aLower.includes(h));
  if (hesitationHits.length > 0) {
    confidenceScore -= hesitationHits.length * 10;
    whatWasMissed.push(`Reduced perceived authority due to hesitant phrasing ("${hesitationHits[0]}").`);
  } else {
    whatWasDoneWell.push("Maintained assertive, professional conviction throughout the response.");
  }
  confidenceScore = Math.min(95, Math.max(30, confidenceScore));

  // 7. Semantic Score (used for knowledge mapping)
  const semanticScore = Math.round((technicalScore * 0.6 + relevanceScore * 0.4));

  // Weighted Aggregation:
  // Technical: 35%, Problem Solving: 20%, Relevance: 15%, Communication: 10%, Structure: 10%, Confidence: 10%
  const overallScore = Math.round(
    technicalScore * 0.35 +
    problemSolvingScore * 0.20 +
    relevanceScore * 0.15 +
    communicationScore * 0.10 +
    structureScore * 0.10 +
    confidenceScore * 0.10
  );

  const concreteRecommendation = bestTopic
    ? `Study "${bestTopic.name}" in the CIU curriculum: ${bestTopic.keyConcepts.slice(0, 2).join(", ")}. Review ${bestTopic.ciuReferenceUrl}`
    : "Structure explanations by first stating the theoretical definition, then walking through algorithmic mechanics and concluding with trade-offs.";

  if (whatWasDoneWell.length === 0) {
    whatWasDoneWell.push("Addressed the general interview prompt directly.");
  }

  const weightedBreakdown = [
    {
      label: "Technical Accuracy",
      weightPercent: 35,
      score: technicalScore,
      contribution: Math.round(technicalScore * 0.35),
      summary: "Precision of technical claims, algorithmic invariants, and conceptual facts.",
    },
    {
      label: "Problem Solving & Depth",
      weightPercent: 20,
      score: problemSolvingScore,
      contribution: Math.round(problemSolvingScore * 0.20),
      summary: "Decomposition, edge case anticipation, and trade-off evaluation.",
    },
    {
      label: "Prompt Relevance",
      weightPercent: 15,
      score: relevanceScore,
      contribution: Math.round(relevanceScore * 0.15),
      summary: "Directness in answering the prompt without unnecessary tangents.",
    },
    {
      label: "Communication",
      weightPercent: 10,
      score: communicationScore,
      contribution: Math.round(communicationScore * 0.10),
      summary: "Speaking pace, vocabulary clarity, and elimination of filler words.",
    },
    {
      label: "Structure & Flow",
      weightPercent: 10,
      score: structureScore,
      contribution: Math.round(structureScore * 0.10),
      summary: "Logical ordering, STAR method execution, and clear conclusions.",
    },
    {
      label: "Confidence & Delivery",
      weightPercent: 10,
      score: confidenceScore,
      contribution: Math.round(confidenceScore * 0.10),
      summary: "Assertiveness, steady vocal cadence, and camera presence.",
    },
  ];

  return {
    scores: {
      semanticScore,
      technicalScore,
      problemSolvingScore,
      relevanceScore,
      communicationScore,
      structureScore,
      confidenceScore,
    },
    overallScore,
    explanation: {
      overallScore,
      weightedBreakdown,
      whatWasDoneWell,
      whatWasMissed,
      concreteRecommendation,
      matchedCiuTopic: bestTopic,
    },
    weakAreaDetected: technicalScore < 60 && bestTopic ? bestTopic.name : undefined,
  };
}
