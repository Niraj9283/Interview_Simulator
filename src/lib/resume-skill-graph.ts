import { CIU_KNOWLEDGE_GRAPH, CIUDomain, CIUTopicNode } from "./knowledge-graph";

export interface SkillNode {
  name: string;
  category: "Language" | "Framework" | "Core CS" | "Database" | "Cloud & DevOps" | "AI & Data";
  proficiencyPercent: number; // 0 - 100
  isWeakness: boolean;
  isStrength: boolean;
  status: "Strong" | "Competent" | "Needs Practice" | "Critical Gap";
  matchedCiuTopics: string[];
  evidenceText?: string;
}

export interface CandidateSkillGraph {
  candidateName: string;
  totalSkillsDetected: number;
  overallSkillScore: number;
  skills: SkillNode[];
  domainCoverage: {
    domain: CIUDomain;
    proficiencyPercent: number;
    skillsIdentified: string[];
    gapTopics: string[];
  }[];
  strengths: string[];
  weaknesses: string[];
  priorityInterviewTopics: string[];
  recommendedQuestions: string[];
  generatedAt: string;
}

const SKILL_KEYWORDS_MAP: {
  [skillName: string]: {
    category: SkillNode["category"];
    baseWeight: number;
    ciuTopicIds: string[];
  };
} = {
  // Languages
  python: { category: "Language", baseWeight: 88, ciuTopicIds: ["arrays-and-strings", "sorting-algorithms"] },
  javascript: { category: "Language", baseWeight: 75, ciuTopicIds: ["arrays-and-strings"] },
  typescript: { category: "Language", baseWeight: 80, ciuTopicIds: ["oop-and-design-patterns"] },
  java: { category: "Language", baseWeight: 78, ciuTopicIds: ["oop-and-design-patterns", "operating-systems-concurrency"] },
  "c++": { category: "Language", baseWeight: 82, ciuTopicIds: ["operating-systems-concurrency", "arrays-and-strings"] },
  cpp: { category: "Language", baseWeight: 82, ciuTopicIds: ["operating-systems-concurrency", "arrays-and-strings"] },
  go: { category: "Language", baseWeight: 76, ciuTopicIds: ["operating-systems-concurrency", "distributed-system-design"] },
  golang: { category: "Language", baseWeight: 76, ciuTopicIds: ["operating-systems-concurrency", "distributed-system-design"] },
  rust: { category: "Language", baseWeight: 80, ciuTopicIds: ["operating-systems-concurrency"] },

  // Frameworks & Libraries
  react: { category: "Framework", baseWeight: 75, ciuTopicIds: ["oop-and-design-patterns"] },
  "next.js": { category: "Framework", baseWeight: 72, ciuTopicIds: ["distributed-system-design"] },
  nextjs: { category: "Framework", baseWeight: 72, ciuTopicIds: ["distributed-system-design"] },
  "node.js": { category: "Framework", baseWeight: 68, ciuTopicIds: ["operating-systems-concurrency", "computer-networking"] },
  nodejs: { category: "Framework", baseWeight: 68, ciuTopicIds: ["operating-systems-concurrency", "computer-networking"] },
  fastapi: { category: "Framework", baseWeight: 74, ciuTopicIds: ["computer-networking", "distributed-system-design"] },
  django: { category: "Framework", baseWeight: 65, ciuTopicIds: ["dbms-and-storage"] },
  express: { category: "Framework", baseWeight: 62, ciuTopicIds: ["computer-networking"] },

  // Databases & Storage
  postgresql: { category: "Database", baseWeight: 70, ciuTopicIds: ["dbms-and-storage"] },
  postgres: { category: "Database", baseWeight: 70, ciuTopicIds: ["dbms-and-storage"] },
  mysql: { category: "Database", baseWeight: 65, ciuTopicIds: ["dbms-and-storage"] },
  mongodb: { category: "Database", baseWeight: 60, ciuTopicIds: ["dbms-and-storage"] },
  redis: { category: "Database", baseWeight: 72, ciuTopicIds: ["distributed-system-design", "hash-tables"] },
  elasticsearch: { category: "Database", baseWeight: 68, ciuTopicIds: ["binary-search-trees", "distributed-system-design"] },

  // Cloud & DevOps
  docker: { category: "Cloud & DevOps", baseWeight: 70, ciuTopicIds: ["operating-systems-concurrency"] },
  kubernetes: { category: "Cloud & DevOps", baseWeight: 65, ciuTopicIds: ["distributed-system-design"] },
  aws: { category: "Cloud & DevOps", baseWeight: 68, ciuTopicIds: ["distributed-system-design"] },
  gcp: { category: "Cloud & DevOps", baseWeight: 66, ciuTopicIds: ["distributed-system-design"] },
  git: { category: "Cloud & DevOps", baseWeight: 80, ciuTopicIds: ["testing-and-cicd"] },
  github: { category: "Cloud & DevOps", baseWeight: 80, ciuTopicIds: ["testing-and-cicd"] },
  "ci/cd": { category: "Cloud & DevOps", baseWeight: 65, ciuTopicIds: ["testing-and-cicd"] },

  // Core CS Domains
  dsa: { category: "Core CS", baseWeight: 45, ciuTopicIds: ["arrays-and-strings", "binary-search", "dynamic-programming"] },
  "data structures": { category: "Core CS", baseWeight: 50, ciuTopicIds: ["arrays-and-strings", "hash-tables", "binary-search-trees"] },
  algorithms: { category: "Core CS", baseWeight: 48, ciuTopicIds: ["sorting-algorithms", "dynamic-programming", "graphs"] },
  "system design": { category: "Core CS", baseWeight: 35, ciuTopicIds: ["distributed-system-design"] },
  "operating systems": { category: "Core CS", baseWeight: 40, ciuTopicIds: ["operating-systems-concurrency"] },
  os: { category: "Core CS", baseWeight: 40, ciuTopicIds: ["operating-systems-concurrency"] },
  dbms: { category: "Core CS", baseWeight: 48, ciuTopicIds: ["dbms-and-storage"] },
  networking: { category: "Core CS", baseWeight: 45, ciuTopicIds: ["computer-networking"] },
  oop: { category: "Core CS", baseWeight: 70, ciuTopicIds: ["oop-and-design-patterns"] },

  // AI & Data
  "machine learning": { category: "AI & Data", baseWeight: 82, ciuTopicIds: ["machine-learning-engineering"] },
  ml: { category: "AI & Data", baseWeight: 80, ciuTopicIds: ["machine-learning-engineering"] },
  "deep learning": { category: "AI & Data", baseWeight: 76, ciuTopicIds: ["machine-learning-engineering"] },
  tensorflow: { category: "AI & Data", baseWeight: 70, ciuTopicIds: ["machine-learning-engineering"] },
  pytorch: { category: "AI & Data", baseWeight: 78, ciuTopicIds: ["machine-learning-engineering"] },
  rag: { category: "AI & Data", baseWeight: 85, ciuTopicIds: ["genai-and-rag-architectures"] },
  llms: { category: "AI & Data", baseWeight: 82, ciuTopicIds: ["genai-and-rag-architectures"] },
  transformers: { category: "AI & Data", baseWeight: 78, ciuTopicIds: ["genai-and-rag-architectures"] },
  nlp: { category: "AI & Data", baseWeight: 72, ciuTopicIds: ["genai-and-rag-architectures"] },
  "scikit-learn": { category: "AI & Data", baseWeight: 80, ciuTopicIds: ["machine-learning-engineering"] },
  pandas: { category: "AI & Data", baseWeight: 85, ciuTopicIds: ["machine-learning-engineering"] },
};

/**
 * Parses resume text and generates a rich Candidate Skill Graph
 * benchmarked against the CIU curriculum.
 */
export function generateCandidateSkillGraph(
  resumeText: string,
  candidateName: string = "Candidate"
): CandidateSkillGraph {
  const textLower = resumeText.toLowerCase();
  const detectedSkills: SkillNode[] = [];
  const mentionedSkillsSet = new Set<string>();

  // 1. Scan for explicit skill keywords
  for (const [key, meta] of Object.entries(SKILL_KEYWORDS_MAP)) {
    const regex = new RegExp(`\\b${key.replace("+", "\\+")}\\b`, "i");
    if (regex.test(textLower)) {
      mentionedSkillsSet.add(key);

      // Extract brief evidence sentence
      let evidence = "";
      const sentences = resumeText.split(/[.\n]+/);
      for (const sentence of sentences) {
        if (new RegExp(`\\b${key.replace("+", "\\+")}\\b`, "i").test(sentence)) {
          evidence = sentence.trim();
          break;
        }
      }

      // Compute slight variance based on frequency
      const matchCount = (textLower.match(new RegExp(`\\b${key.replace("+", "\\+")}\\b`, "gi")) || []).length;
      const boost = Math.min(15, matchCount * 3);
      const finalScore = Math.min(95, meta.baseWeight + boost);

      const isWeakness = finalScore < 50;
      const isStrength = finalScore >= 75;

      let status: SkillNode["status"] = "Competent";
      if (finalScore >= 80) status = "Strong";
      else if (finalScore < 45) status = "Critical Gap";
      else if (finalScore < 60) status = "Needs Practice";

      detectedSkills.push({
        name: key.charAt(0).toUpperCase() + key.slice(1),
        category: meta.category,
        proficiencyPercent: finalScore,
        isWeakness,
        isStrength,
        status,
        matchedCiuTopics: meta.ciuTopicIds,
        evidenceText: evidence.length > 90 ? evidence.slice(0, 90) + "..." : evidence,
      });
    }
  }

  // 2. Identify missing foundational CS skills (the "CIU Baseline Check")
  const foundationalCategories: { name: string; key: string; domain: CIUDomain }[] = [
    { name: "DSA", key: "dsa", domain: "Data Structures" },
    { name: "System Design", key: "system design", domain: "System Design" },
    { name: "Operating Systems", key: "os", domain: "CS Fundamentals" },
    { name: "DBMS", key: "dbms", domain: "CS Fundamentals" },
    { name: "Networking", key: "networking", domain: "CS Fundamentals" },
  ];

  for (const found of foundationalCategories) {
    const alreadyPresent = detectedSkills.some((s) => s.name.toLowerCase() === found.name.toLowerCase());
    if (!alreadyPresent) {
      // If not mentioned on resume, mark as an unverified/weak area (20-35%)
      const score = Math.floor(Math.random() * 15) + 20; // 20 - 35%
      detectedSkills.push({
        name: found.name,
        category: "Core CS",
        proficiencyPercent: score,
        isWeakness: true,
        isStrength: false,
        status: "Critical Gap",
        matchedCiuTopics: found.key === "dsa" ? ["dynamic-programming", "graphs"] : [found.key],
        evidenceText: "Not explicitly evidenced in resume projects.",
      });
    }
  }

  // Sort: Strongest first
  detectedSkills.sort((a, b) => b.proficiencyPercent - a.proficiencyPercent);

  // 3. Calculate CIU Domain Coverage
  const domainMap: Record<CIUDomain, { scores: number[]; skills: string[]; gapTopics: string[] }> = {
    "Data Structures": { scores: [], skills: [], gapTopics: [] },
    Algorithms: { scores: [], skills: [], gapTopics: [] },
    "CS Fundamentals": { scores: [], skills: [], gapTopics: [] },
    "Software Engineering": { scores: [], skills: [], gapTopics: [] },
    "System Design": { scores: [], skills: [], gapTopics: [] },
    "Machine Learning & AI": { scores: [], skills: [], gapTopics: [] },
  };

  for (const skill of detectedSkills) {
    for (const topicId of skill.matchedCiuTopics) {
      const ciuNode = CIU_KNOWLEDGE_GRAPH.find((n) => n.id === topicId);
      if (ciuNode) {
        domainMap[ciuNode.domain].scores.push(skill.proficiencyPercent);
        if (!domainMap[ciuNode.domain].skills.includes(skill.name)) {
          domainMap[ciuNode.domain].skills.push(skill.name);
        }
      }
    }
  }

  // Check which CIU topics in each domain have gaps
  for (const node of CIU_KNOWLEDGE_GRAPH) {
    const covered = detectedSkills.some((s) => s.matchedCiuTopics.includes(node.id) && s.proficiencyPercent >= 60);
    if (!covered) {
      domainMap[node.domain].gapTopics.push(node.name);
    }
  }

  const domainCoverage = (Object.keys(domainMap) as CIUDomain[]).map((domain) => {
    const d = domainMap[domain];
    const avgScore = d.scores.length > 0 ? Math.round(d.scores.reduce((a, b) => a + b, 0) / d.scores.length) : 30;
    return {
      domain,
      proficiencyPercent: avgScore,
      skillsIdentified: d.skills,
      gapTopics: d.gapTopics.slice(0, 3),
    };
  });

  const strengths = detectedSkills.filter((s) => s.isStrength).map((s) => s.name);
  const weaknesses = detectedSkills.filter((s) => s.isWeakness).map((s) => s.name);

  // Priority topics to probe in the interview: target the candidate's top weaknesses first!
  const priorityInterviewTopics = detectedSkills
    .filter((s) => s.isWeakness || s.proficiencyPercent < 65)
    .flatMap((s) => s.matchedCiuTopics)
    .map((tid) => CIU_KNOWLEDGE_GRAPH.find((n) => n.id === tid)?.name)
    .filter((n): n is string => Boolean(n))
    .slice(0, 5);

  if (priorityInterviewTopics.length === 0) {
    priorityInterviewTopics.push("Dynamic Programming", "Distributed System Design", "Hash Tables");
  }

  const overallSkillScore =
    detectedSkills.length > 0
      ? Math.round(detectedSkills.reduce((a, b) => a + b.proficiencyPercent, 0) / detectedSkills.length)
      : 50;

  const uniquePriorityTopics = Array.from(new Set(priorityInterviewTopics));
  const recommendedQuestions: string[] = [];

  for (const topicName of uniquePriorityTopics) {
    const topicNode = CIU_KNOWLEDGE_GRAPH.find(
      (n) => n.name.toLowerCase() === topicName.toLowerCase() || n.id === topicName.toLowerCase()
    );
    if (topicNode && topicNode.sampleQuestions.length > 0) {
      recommendedQuestions.push(topicNode.sampleQuestions[0]);
    }
  }

  if (recommendedQuestions.length === 0) {
    recommendedQuestions.push(
      "How would you design an efficient caching and invalidation strategy for a distributed service?",
      "Walk me through the internal collision resolution and resizing mechanics of a Hash Table."
    );
  }

  return {
    candidateName,
    totalSkillsDetected: detectedSkills.length,
    overallSkillScore,
    skills: detectedSkills,
    domainCoverage,
    strengths,
    weaknesses,
    priorityInterviewTopics: uniquePriorityTopics,
    recommendedQuestions,
    generatedAt: new Date().toISOString(),
  };
}
