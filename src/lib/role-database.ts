import rawRoleDatabase from "../../data/interview-role-database.json" with { type: "json" };

export type DepartmentId = "Technical" | "Finance" | "HR" | "Marketing";

export type InterviewType = "General" | "HR" | "Technical" | "Coding" | "System Design" | "Behavioral";

export const INTERVIEW_TYPES: InterviewType[] = [
  "General",
  "HR",
  "Technical",
  "Coding",
  "System Design",
  "Behavioral",
];

export function isInterviewTypeAvailableForDepartment(departmentId: DepartmentId, type: InterviewType): boolean {
  if (type === "Coding" || type === "System Design") {
    return departmentId === "Technical";
  }
  return true;
}

export type InterviewTrack = "Role Specific" | "DSA" | "System Design" | "Case Study" | "Behavioral";

export type RoleQuestionBank = Partial<Record<InterviewTrack, string[]>>;

export type CompanyRole = {
  title: string;
  questions: RoleQuestionBank;
};

export type DepartmentDefinition = {
  id: DepartmentId;
  label: string;
  tracks: InterviewTrack[];
  roles: CompanyRole[];
};

type RoleDatabase = {
  departments: DepartmentDefinition[];
};

export const roleDatabase = rawRoleDatabase as unknown as RoleDatabase;

export const departments = roleDatabase.departments.map((department) => department.id);

export function getDepartmentDefinition(departmentId: DepartmentId): DepartmentDefinition {
  const found = roleDatabase.departments.find((department) => department.id === departmentId);
  return found ?? roleDatabase.departments[0];
}

export function getDepartmentLabel(departmentId: DepartmentId): string {
  return getDepartmentDefinition(departmentId).label;
}

export function getRolesForDepartment(departmentId: DepartmentId): CompanyRole[] {
  return getDepartmentDefinition(departmentId).roles;
}

export function getDefaultRoleForDepartment(departmentId: DepartmentId): string {
  return getRolesForDepartment(departmentId)[0]?.title ?? "Candidate";
}

export function getAvailableTracks(departmentId: DepartmentId): InterviewTrack[] {
  return getDepartmentDefinition(departmentId).tracks;
}

export function getDefaultTrackForDepartment(departmentId: DepartmentId): InterviewTrack {
  return getAvailableTracks(departmentId)[0] ?? "Role Specific";
}

export function isTrackAvailableForDepartment(departmentId: DepartmentId, track: InterviewTrack): boolean {
  return getAvailableTracks(departmentId).includes(track);
}

/**
 * Safely resolves a role within the specified department.
 * Guarantees that resolution NEVER crosses into another department or silently defaults to Technical.
 */
export function findRole(departmentId: DepartmentId, targetRole: string): CompanyRole {
  const roles = getRolesForDepartment(departmentId);
  if (!roles || roles.length === 0) {
    return { title: targetRole, questions: {} };
  }

  const normalizedTarget = targetRole.trim().toLowerCase();
  const exactMatch = roles.find((role) => role.title.toLowerCase() === normalizedTarget);
  if (exactMatch) return exactMatch;

  const partialMatch = roles.find(
    (role) =>
      role.title.toLowerCase().includes(normalizedTarget) ||
      normalizedTarget.includes(role.title.toLowerCase())
  );
  if (partialMatch) return partialMatch;

  return roles[0];
}

export function getQuestionsForSelection(
  departmentId: DepartmentId,
  targetRole: string,
  track: InterviewTrack
): string[] {
  const safeTrack = isTrackAvailableForDepartment(departmentId, track)
    ? track
    : getDefaultTrackForDepartment(departmentId);
  const role = findRole(departmentId, targetRole);
  const roleQuestions = role?.questions[safeTrack] ?? [];

  return [...roleQuestions, ...buildFallbackQuestions(departmentId, role?.title ?? targetRole, safeTrack)];
}

/**
 * Unrelated technical jargon that must never be asked to non-technical roles (Finance, HR, Marketing)
 */
export const UNRELATED_TECHNICAL_JARGON: string[] = [
  "random forest",
  "decision tree",
  "class imbalance",
  "smote",
  "focal loss",
  "shap",
  "shapley",
  "rag architecture",
  "rag system",
  "rag pipeline",
  "vector chunking",
  "chromadb",
  "embedding",
  "cosine similarity",
  "python gil",
  "multiprocessing versus asyncio",
  "kafka",
  "consumer group",
  "backpressure",
  "sharding",
  "database indexing strategies (b-tree",
  "cache-aside invalidation",
  "read replica synchronization lag",
  "distributed failure modes",
  "p99 latency",
  "circuit breakers",
  "microservices",
  "pytorch",
  "tensorflow",
  "scikit-learn",
  "xgboost",
  "loss function",
  "hyperparameter",
  "overfitting compared with a single",
];

/**
 * Checks whether a resume project is demonstrably relevant to the candidate's selected department and role.
 * Prohibits technical ML / systems projects from leaking into Finance, HR, or Marketing interviews.
 */
export function isProjectRelevantToRole(
  project: { title: string; primarySkill?: string; skills?: string[]; category?: string },
  departmentId: DepartmentId,
  targetRole: string
): boolean {
  const text = `${project.title} ${project.primarySkill ?? ""} ${(project.skills ?? []).join(" ")}`.toLowerCase();

  if (departmentId === "Finance") {
    const financeTerms = [
      "finance", "financial", "accounting", "valuation", "dcf", "budget", "forecast", "cash flow",
      "p&l", "balance sheet", "equity", "audit", "tax", "treasury", "margin", "revenue", "cost",
      "investment", "credit", "portfolio", "banking", "ledger", "gaap", "ifrs", "ebitda", "capital",
      "pricing", "reconciliation", "variance", "liquidity", "solvency"
    ];
    return financeTerms.some((term) => text.includes(term));
  }

  if (departmentId === "HR") {
    const hrTerms = [
      "hr", "human resources", "recruit", "talent", "hiring", "onboarding", "retention", "attrition",
      "employee", "workforce", "compensation", "benefits", "payroll", "people", "engagement",
      "culture", "performance management", "diversity", "training", "relations", "pip"
    ];
    return hrTerms.some((term) => text.includes(term));
  }

  if (departmentId === "Marketing") {
    const marketingTerms = [
      "marketing", "campaign", "seo", "sem", "conversion", "cac", "roas", "ltv", "social media",
      "brand", "acquisition", "retention", "funnel", "content", "crm", "analytics", "growth",
      "email marketing", "audience", "segmentation", "advertising", "copywriting"
    ];
    return marketingTerms.some((term) => text.includes(term));
  }

  // Technical Department
  return true;
}

/**
 * Validates whether a question is relevant to the selected department and position.
 * Returns true if valid, false if it contains unrelated cross-department jargon.
 */
export function validateQuestionRelevance(
  question: string,
  departmentId: DepartmentId,
  targetRole: string
): boolean {
  if (!question || typeof question !== "string") return false;
  const qLower = question.toLowerCase();

  // If non-technical department, reject software/ML-specific jargon
  if (departmentId !== "Technical") {
    if (/\brag\b/i.test(question)) {
      return false;
    }
    for (const jargon of UNRELATED_TECHNICAL_JARGON) {
      if (qLower.includes(jargon)) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Role-appropriate difficulty adjustments that modify depth without changing the topic to software engineering.
 */
export function applyRoleAppropriateDifficulty(
  baseQuestion: string,
  departmentId: DepartmentId,
  targetRole: string,
  difficulty: "Warmup" | "Standard" | "Senior"
): string {
  if (difficulty === "Warmup") {
    return `${baseQuestion} Keep your response focused on core principles, clear definitions, and foundational workflow.`;
  }

  if (difficulty === "Senior") {
    switch (departmentId) {
      case "Finance":
        return `${baseQuestion} Frame your response with sensitivity analysis, regulatory compliance, executive stakeholder communication, and capital allocation tradeoffs.`;
      case "HR":
        return `${baseQuestion} Include organizational change management, cross-functional stakeholder alignment, policy risk, and long-term retention impact.`;
      case "Marketing":
        return `${baseQuestion} Include multi-channel attribution models, unit economics (CAC:LTV), cohort retention curves, and high-stakes budget allocation tradeoffs.`;
      case "Technical":
      default:
        return `${baseQuestion} Include high-scale architectural tradeoffs, system reliability, error boundaries, and observable telemetry.`;
    }
  }

  return baseQuestion;
}

export function buildFallbackQuestions(
  departmentId: DepartmentId,
  targetRole: string,
  track: InterviewTrack
): string[] {
  const departmentLabel = getDepartmentLabel(departmentId).replace(" Department", "");

  if (departmentId === "Finance") {
    if (track === "Case Study") {
      return [
        `A key business unit missed its quarterly operating margin forecast by 5%. How would you investigate the underlying revenue and cost drivers?`,
        `Leadership is deciding between leasing versus purchasing a high-value asset. How would you structure the financial evaluation and present your recommendation?`,
        `Working capital has declined for two consecutive quarters despite increasing reported revenue. How would you analyze the cash conversion cycle to diagnose the problem?`,
      ];
    }
    if (track === "Behavioral") {
      return [
        `Tell me about a time you identified an error or discrepancy in a financial model before it reached executive stakeholders.`,
        `Describe a scenario where cross-functional partners resisted your budget or cost recommendations. How did you gain alignment?`,
        `How do you maintain rigor, accuracy, and compliance under strict quarter-end or audit closing deadlines?`,
      ];
    }
    return [
      `How would you evaluate a company's financial performance using its income statement, balance sheet, and cash flow statement?`,
      `How would you construct a discounted cash flow (DCF) valuation, and what sensitivity analyses would you prioritize?`,
      `Which financial metrics and ratios would you use to evaluate liquidity, profitability, and solvency for ${targetRole}?`,
      `How do you build rolling forecasts and account for macroeconomic volatility in your financial modeling?`,
    ];
  }

  if (departmentId === "HR") {
    if (track === "Case Study") {
      return [
        `A high-performing department is experiencing 25% annual voluntary attrition. How would you diagnose root causes and design a retention strategy?`,
        `Two department heads have conflicting compensation expectations for a newly created leadership role. How would you mediate this using market benchmarks?`,
        `Employee engagement survey scores dropped significantly following an organizational restructuring. What action plan would you recommend to leadership?`,
      ];
    }
    if (track === "Behavioral") {
      return [
        `Tell me about a time you handled a sensitive employee relations dispute while maintaining fairness and confidentiality.`,
        `Describe an initiative where you improved the hiring funnel or candidate experience under aggressive headcount timelines.`,
        `Tell me about a situation where you had to coach a manager through delivering difficult performance feedback.`,
      ];
    }
    return [
      `What are the most critical talent acquisition and employee retention levers for a ${targetRole}?`,
      `How do you align people operations initiatives with strategic business objectives and measurable KPIs?`,
      `How do you design and implement fair, compliant performance management and compensation evaluation systems?`,
      `What frameworks do you use to diagnose team dysfunction and improve organizational culture?`,
    ];
  }

  if (departmentId === "Marketing") {
    if (track === "Case Study") {
      return [
        `Customer Acquisition Cost (CAC) has increased by 30% over the last two quarters while conversion rate has plateaued. How would you diagnose the marketing funnel?`,
        `You have a $250,000 quarterly budget to launch a new product line. How would you distribute spend across paid, organic, and retention channels?`,
        `An A/B test on a core landing page shows higher click-through rates but lower downstream trial-to-paid conversion. How do you interpret this and decide next steps?`,
      ];
    }
    if (track === "Behavioral") {
      return [
        `Tell me about a successful multi-channel campaign you led and how you measured its return on ad spend (ROAS).`,
        `Describe a time a marketing campaign underperformed expectations. How did you pivot and what did you learn?`,
        `How do you manage cross-functional collaboration between marketing, sales, product, and creative design teams?`,
      ];
    }
    return [
      `How do you approach audience segmentation, persona building, and value proposition messaging for ${targetRole}?`,
      `What attribution models do you use to measure the true ROI of multi-touch customer journeys?`,
      `How do you balance short-term performance marketing and direct acquisition with long-term brand equity?`,
      `What metrics and reporting dashboards do you rely on to assess marketing efficiency and customer lifetime value (LTV)?`,
    ];
  }

  // Technical Department Fallbacks
  if (track === "DSA") {
    return [
      `Solve a ${targetRole} algorithmic problem using the most appropriate data structure. Explain time and space complexity tradeoffs.`,
      `How would you optimize a slow database query or search algorithm when input size grows by 100x?`,
      `Compare brute force, greedy, and dynamic programming approaches for an optimization challenge in ${targetRole}.`,
    ];
  }

  if (track === "System Design") {
    return [
      `Design a reliable, scalable system architecture for a ${targetRole} application with APIs, caching, and failure recovery.`,
      `How would you design data flow and storage tiers to handle high write concurrency without sacrificing consistency?`,
      `What tradeoffs would you make between synchronous RPC vs asynchronous event-driven messaging in this architecture?`,
    ];
  }

  if (track === "Behavioral") {
    return [
      `Tell me about a challenging technical bug or production outage you diagnosed and how you prevented its recurrence.`,
      `Describe a time you had to balance engineering excellence with rapid product delivery deadlines.`,
      `Tell me about a time you advocated for code quality, testing standards, or technical debt remediation.`,
    ];
  }

  return [
    `What are the most critical responsibilities of a ${targetRole}, and how do you approach them?`,
    `Which architecture patterns, development tools, and testing practices are essential in your engineering workflow?`,
    `Walk me through an end-to-end technical project you designed and shipped, highlighting key tradeoffs.`,
  ];
}
