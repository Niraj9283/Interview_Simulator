import { CandidateProfile, InterviewDifficulty, InterviewTurn } from "./interview";
import { DepartmentId, findRole, getQuestionsForSelection, isTrackAvailableForDepartment } from "./role-database";
import { TargetCompany, COMPANY_PROFILES } from "./company-interview-profiles";

export interface QuestionContext {
  profile: CandidateProfile;
  turnIndex: number;
  lastTurn?: InterviewTurn;
  targetCompany?: TargetCompany;
  targetCompanyEnabled?: boolean;
  experienceLevel?: string;
  sessionAskedQuestions: string[];
}

const STORAGE_KEY_ASKED_HISTORY = "interview_asked_questions_history";

let inMemoryAskedHistory = new Set<string>();

/**
 * Load persistent set of questions asked in past sessions.
 */
export function getAskedQuestionsHistory(): string[] {
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_ASKED_HISTORY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          parsed.forEach((q) => inMemoryAskedHistory.add(q));
        }
      }
    } catch {
      // ignore
    }
  }
  return Array.from(inMemoryAskedHistory);
}

/**
 * Persist a question to the history so future sessions avoid repeating it.
 */
export function recordAskedQuestion(question: string): void {
  if (!question) return;
  const cleanQ = question.trim();
  inMemoryAskedHistory.add(cleanQ);
  if (typeof window !== "undefined") {
    try {
      const history = Array.from(inMemoryAskedHistory).slice(-150);
      localStorage.setItem(STORAGE_KEY_ASKED_HISTORY, JSON.stringify(history));
    } catch {
      // Ignore storage errors
    }
  }
}

/**
 * Clear the persistent asked questions history (useful if candidate wants a reset).
 */
export function clearAskedQuestionsHistory(): void {
  inMemoryAskedHistory.clear();
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(STORAGE_KEY_ASKED_HISTORY);
    } catch {
      // Ignore storage errors
    }
  }
}

/**
 * Structure extracted from candidate's resume.
 */
export interface ExtractedResumeData {
  projects: Array<{
    title: string;
    skills: string[];
    description: string;
  }>;
  skills: string[];
  metrics: string[];
  experiences: string[];
}

/**
 * Comprehensive parser for candidate's uploaded resume text (.txt, .pdf, .docx).
 */
export function parseResumeContent(resumeText: string): ExtractedResumeData {
  const text = resumeText.trim();
  if (!text) {
    return { projects: [], skills: [], metrics: [], experiences: [] };
  }

  const commonSkills = [
    "Python", "JavaScript", "TypeScript", "Java", "C++", "C#", "Go", "Rust", "PHP", "Ruby", "Swift", "Kotlin",
    "React", "Next.js", "Vue", "Angular", "Node.js", "Express", "FastAPI", "Django", "Flask", "Spring Boot",
    "PostgreSQL", "MySQL", "MongoDB", "Redis", "Elasticsearch", "Cassandra", "DynamoDB", "SQLite", "SQL",
    "Docker", "Kubernetes", "AWS", "GCP", "Azure", "CI/CD", "Git", "Terraform", "Kafka", "RabbitMQ", "GraphQL", "REST",
    "Machine Learning", "Deep Learning", "PyTorch", "TensorFlow", "Scikit-Learn", "XGBoost", "Pandas", "NumPy",
    "RAG", "LLMs", "NLP", "Transformers", "Computer Vision", "OpenCV", "BERT", "SHAP", "Random Forest",
    "Microservices", "System Design", "Distributed Systems", "WebSockets", "gRPC"
  ];

  const lowerText = text.toLowerCase();
  const detectedSkills = commonSkills.filter((s) => {
    const escaped = s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`\\b${escaped}\\b`, "i").test(lowerText);
  });

  // Extract explicit projects
  const projects: ExtractedResumeData["projects"] = [];
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  // Pattern 1: Lines starting with "Project:", "Project Name:", or bullet points mentioning "built/developed"
  const projectRegex = /(?:project[s]?|title)?[:\s-]*([A-Z][A-Za-z0-9\s-]{3,45}(?:Prediction|Detection|Classification|System|Engine|App|Application|Platform|Dashboard|Pipeline|Service|Bot|Model|API|Analytics|Portal|Tool|Website))\s*(?:using|with|in)?\s*([^\n.;]*)/gi;
  let pMatch: RegExpExecArray | null;

  while ((pMatch = projectRegex.exec(text)) !== null) {
    const title = pMatch[1].trim();
    const context = `${title} ${pMatch[2] || ""}`.toLowerCase();
    const matchedSkills = commonSkills.filter((s) => context.includes(s.toLowerCase()));

    if (!projects.some((p) => p.title.toLowerCase() === title.toLowerCase())) {
      projects.push({
        title,
        skills: matchedSkills.length > 0 ? matchedSkills : detectedSkills.slice(0, 3),
        description: pMatch[0].trim(),
      });
    }
  }

  // If regex found few projects, scan lines for "built ... using" or "developed ... with"
  if (projects.length === 0) {
    for (const line of lines) {
      if (
        (line.toLowerCase().includes("project") ||
          line.toLowerCase().includes("developed") ||
          line.toLowerCase().includes("built") ||
          line.toLowerCase().includes("implemented") ||
          line.toLowerCase().includes("architected")) &&
        line.length > 20
      ) {
        const lineSkills = commonSkills.filter((s) => line.toLowerCase().includes(s.toLowerCase()));
        const cleanTitle = line.replace(/^(?:project[:\s-]*|developed\s+|built\s+|implemented\s+)/i, "").split(/[.;,-]/)[0].trim();

        if (cleanTitle.length >= 4 && cleanTitle.length <= 50) {
          projects.push({
            title: cleanTitle,
            skills: lineSkills.length > 0 ? lineSkills : detectedSkills.slice(0, 2),
            description: line,
          });
        }
      }
      if (projects.length >= 4) break;
    }
  }

  // Extract metrics (e.g. 40% latency reduction, 10k users, 99.9% uptime)
  const metricRegex = /\b(?:\d+%\s*|\d+[kKmM]\s*|\$\d+\s*|[0-9.]+(?:x|ms|s)\s*)(?:reduction|increase|faster|latency|throughput|accuracy|revenue|users|events|requests|scale)\b/gi;
  const metrics: string[] = [];
  let mMatch: RegExpExecArray | null;
  while ((mMatch = metricRegex.exec(text)) !== null) {
    metrics.push(mMatch[0]);
  }

  // Extract work experiences / company roles
  const experiences: string[] = [];
  for (const line of lines) {
    if (
      /\b(?:engineer|developer|intern|lead|analyst|specialist|manager|architect|associate|scientist)\b/i.test(line) &&
      line.length < 80
    ) {
      experiences.push(line.replace(/^[•*\-\s]+/, "").trim());
    }
    if (experiences.length >= 3) break;
  }

  return {
    projects,
    skills: detectedSkills,
    metrics,
    experiences,
  };
}

/**
 * Generate rich, dynamic questions derived STRICTLY from the uploaded resume.
 */
function generateQuestionsFromResume(
  data: ExtractedResumeData,
  resumeText: string,
  turnIndex: number,
  experienceLevel: string = "2-5 years",
  targetCompany?: TargetCompany,
  targetCompanyEnabled?: boolean
): string[] {
  const questions: string[] = [];
  const isSenior = experienceLevel === "5+ years" || experienceLevel === "2-5 years";
  const { projects, skills, metrics, experiences } = data;

  // 1. Project-Based Questions
  projects.forEach((proj, idx) => {
    const mainSkill = proj.skills[0] || skills[0] || "your selected stack";
    const secSkill = proj.skills[1] || skills[1] || "data storage";

    questions.push(
      `In your resume, you highlighted developing "${proj.title}". Walk me through the high-level architecture: why did you select ${mainSkill}, and what was the most difficult engineering decision you made?`,
      `For your "${proj.title}" project built with ${mainSkill}: What were the primary failure modes you anticipated, and how did you implement error recovery, retries, and data consistency?`,
      `In "${proj.title}", how did you measure and validate performance under load? If user requests scaled by 20x, where would ${mainSkill} bottleneck first?`,
      `Regarding "${proj.title}": Did you encounter any critical trade-offs between ${mainSkill} and alternative frameworks or databases? What led you to your final architectural choice?`
    );

    if (isSenior) {
      questions.push(
        `If you were to re-architect "${proj.title}" today for enterprise-grade high availability, what distributed system patterns (e.g. caching, event streams, circuit breakers) would you incorporate?`
      );
    }
  });

  // 2. Skill & Technology Deep Dives (Based on explicitly mentioned tools)
  skills.slice(0, 6).forEach((skill) => {
    questions.push(
      `You listed ${skill} on your resume. Can you describe an edge case, memory constraint, or performance bottleneck you personally diagnosed and debugged while using ${skill}?`,
      `From your hands-on experience with ${skill} mentioned in your resume: Explain how ${skill} handles concurrency and resource management under high throughput.`,
      `What are the major architectural best practices and antipatterns you watch out for when writing production-grade code in ${skill}?`
    );
  });

  // 3. Work Experience / Role / Achievement Questions
  if (experiences.length > 0) {
    experiences.forEach((exp) => {
      questions.push(
        `Your resume mentions your experience as "${exp}". Can you share a specific project during that role where technical requirements were ambiguous, and how you drove clarity and delivered on time?`,
        `During your time as "${exp}", what was the most complex cross-functional technical debate you had with peers or stakeholders, and how did you evaluate the trade-offs?`
      );
    });
  }

  // 4. Metric & Optimization Questions
  if (metrics.length > 0) {
    metrics.slice(0, 2).forEach((m) => {
      questions.push(
        `You noted achieving ${m} in your resume. How specifically did you isolate the baseline performance metrics, what instrumentation did you put in place, and what was the key breakthrough?`
      );
    });
  }

  // 5. Fallback Resume Questions (if resume text is minimal or unstructured)
  if (questions.length < 6) {
    const rawSnippet = resumeText.slice(0, 200).replace(/\s+/g, " ");
    questions.push(
      `Looking at the project background and technical experience in your uploaded resume: Walk me through the project that best represents your technical strengths and problem-solving process.`,
      `In your resume projects, how did you structure automated testing, CI/CD, and regression monitoring before releasing to production?`,
      `Tell me about a production bug or unexpected deployment issue that occurred in one of the systems detailed on your resume. How did you diagnose the root cause?`,
      `Reflecting on the technologies and architecture in your resume, what is one major design decision you would implement differently today with hindsight?`,
      `How did you ensure security, data integrity, and authentication in the web services or pipelines listed on your resume?`,
      `Can you explain how you designed APIs and contract interfaces between frontend and backend in the applications listed on your resume?`
    );
  }

  // Overlay company rigor if enabled
  if (targetCompanyEnabled && targetCompany && COMPANY_PROFILES[targetCompany]) {
    const profile = COMPANY_PROFILES[targetCompany];
    return questions.map((q) => {
      return `[${profile.name} Rigor]: ${q} Focus on ${profile.evaluationFocus.slice(0, 2).join(" & ")}.`;
    });
  }

  return questions;
}

/**
 * Generate rich, dynamic questions derived STRICTLY from the selected position/role.
 */
function generateQuestionsFromPosition(
  departmentId: DepartmentId,
  targetRole: string,
  interviewType: string,
  experienceLevel: string = "2-5 years",
  targetCompany?: TargetCompany,
  targetCompanyEnabled?: boolean
): string[] {
  const isSenior = experienceLevel === "5+ years" || experienceLevel === "2-5 years";
  const questions: string[] = [];

  // 1. Role database questions
  const safeTrack = isTrackAvailableForDepartment(departmentId, "Role Specific")
    ? "Role Specific"
    : "Behavioral";
  const dbQuestions = getQuestionsForSelection(departmentId, targetRole, safeTrack);
  questions.push(...dbQuestions);

  // 2. Department & Role Custom Curated Banks
  if (departmentId === "Technical") {
    questions.push(
      `As a ${targetRole}, how do you evaluate the trade-offs between speed of delivery versus technical debt and architectural purity? Give a concrete scenario.`,
      `Walk through how you design, document, and version RESTful or gRPC APIs to ensure zero breaking changes for existing consumers.`,
      `How do you diagnose and troubleshoot a production outage when error logs are silent and latency spikes suddenly on a critical microservice?`,
      `Explain how you structure automated testing (unit, integration, end-to-end) as a ${targetRole} to catch race conditions and edge cases.`,
      `When reviewing code submitted by a peer that works functionally but has O(N^2) complexity and poor separation of concerns, how do you provide constructive feedback?`,
      `Describe how you implement database indexing and query optimization for a high-traffic table with 50 million rows and frequent writes.`
    );

    if (isSenior) {
      questions.push(
        `As a Senior ${targetRole}, how would you architect a distributed system to guarantee at-least-once delivery without duplicate processing?`,
        `Describe your approach to capacity planning, disaster recovery, and multi-region data replication for high-availability systems.`
      );
    }
  } else if (departmentId === "Finance") {
    questions.push(
      `As a ${targetRole}, walk through your methodology for building a three-statement financial model and forecasting working capital.`,
      `How do you identify and mitigate discrepancies between balance sheet projections and actual cash flows under fluctuating market conditions?`,
      `Explain the differences between DCF valuation and comparable company analysis. In what scenarios would one be preferred over the other?`,
      `How do you structure financial variance analysis to communicate budget overruns effectively to non-financial department heads?`,
      `Describe how you audit and stress-test assumptions in capital expenditure (CapEx) proposals before executive presentation.`
    );
  } else if (departmentId === "HR") {
    questions.push(
      `As an ${targetRole}, how do you design a structured interview rubric to reduce unconscious bias across diverse hiring panels?`,
      `Walk me through a situation where you had to resolve a high-stakes employee grievance involving leadership and retain talent.`,
      `What metrics and KPIs do you prioritize to measure employee retention, team engagement, and time-to-hire?`,
      `How do you develop and roll out a progressive performance improvement plan (PIP) that is fair, legally compliant, and supportive?`,
      `Describe your strategy for talent sourcing in a hyper-competitive market where compensation budgets are constrained.`
    );
  } else if (departmentId === "Marketing") {
    questions.push(
      `As a ${targetRole}, how do you calculate Customer Acquisition Cost (CAC) vs. Customer Lifetime Value (LTV), and what ratios indicate healthy growth?`,
      `Walk through your process for running high-velocity A/B tests across landing pages and ad creatives with statistical rigor.`,
      `How do you diagnose a sudden 30% drop in organic search traffic or paid conversion rates across key campaigns?`,
      `Describe how you align product marketing messaging with technical product features for an enterprise B2B audience.`,
      `What attribution models (first-touch, last-touch, multi-touch) do you use to allocate marketing budget across multiple channels?`
    );
  }

  // Overlay company rigor if enabled
  if (targetCompanyEnabled && targetCompany && COMPANY_PROFILES[targetCompany]) {
    const profile = COMPANY_PROFILES[targetCompany];
    return questions.map((q) => {
      return `[${profile.name} Standard]: ${q} Emphasize ${profile.signatureStyle}.`;
    });
  }

  return questions;
}

/**
 * Main Question Dispatcher:
 * Guarantees:
 * 1. If resume is uploaded: ONLY asks questions derived from candidate's resume.
 * 2. If resume is NOT uploaded: Asks questions derived from candidate's selected position/role.
 * 3. Never repeats questions within the session.
 * 4. Prioritizes fresh questions never seen in past sessions (using localStorage history).
 */
export function getNextInterviewQuestion(context: QuestionContext): string {
  const {
    profile,
    turnIndex,
    lastTurn,
    targetCompany,
    targetCompanyEnabled,
    experienceLevel,
    sessionAskedQuestions,
  } = context;

  // 1. Adaptive follow-up: If previous turn had an explicit probing question from weak area diagnosis
  if (lastTurn && lastTurn.weakArea && lastTurn.probingQuestion) {
    const probe = lastTurn.probingQuestion;
    if (!sessionAskedQuestions.includes(probe)) {
      recordAskedQuestion(probe);
      return probe;
    }
  }

  const isResumeUploaded = Boolean(profile.resumeText && profile.resumeText.trim().length > 30);
  const askedHistory = getAskedQuestionsHistory();
  let candidatePool: string[] = [];

  if (isResumeUploaded) {
    // Mode A: Resume-Based Question Generation
    const resumeData = parseResumeContent(profile.resumeText);
    candidatePool = generateQuestionsFromResume(
      resumeData,
      profile.resumeText,
      turnIndex,
      experienceLevel,
      targetCompany,
      targetCompanyEnabled
    );
  } else {
    // Mode B: Position-Based Question Generation
    candidatePool = generateQuestionsFromPosition(
      profile.department,
      profile.targetRole,
      profile.interviewType,
      experienceLevel,
      targetCompany,
      targetCompanyEnabled
    );
  }

  // Filter pool:
  // First priority: Not in current session AND not in historical sessions
  const completelyFresh = candidatePool.filter(
    (q) => !sessionAskedQuestions.includes(q) && !askedHistory.includes(q)
  );

  // Second priority: Not in current session (even if seen in a very old past session)
  const sessionFresh = candidatePool.filter((q) => !sessionAskedQuestions.includes(q));

  let selectedQuestion = "";

  if (completelyFresh.length > 0) {
    // Deterministic pseudo-random shuffle seeded by turnIndex and timestamp to ensure fresh distribution
    const seed = (turnIndex * 37 + Date.now()) % completelyFresh.length;
    selectedQuestion = completelyFresh[seed] || completelyFresh[0];
  } else if (sessionFresh.length > 0) {
    const seed = (turnIndex * 19 + Date.now()) % sessionFresh.length;
    selectedQuestion = sessionFresh[seed] || sessionFresh[0];
  } else {
    // Fallback if all questions exhausted
    const contextType = isResumeUploaded ? "your uploaded resume projects" : `your role as a ${profile.targetRole}`;
    selectedQuestion = `Reflecting on ${contextType}: What was the most complex technical hurdle you overcame, and what did you learn from the outcome? (Turn ${turnIndex + 1})`;
  }

  recordAskedQuestion(selectedQuestion);
  return selectedQuestion;
}
