import {
  DepartmentId,
  InterviewTrack,
  getQuestionsForSelection,
  isProjectRelevantToRole,
  validateQuestionRelevance,
} from "./role-database";

export type ResumeEvidence = {
  text: string;
  section: string;
};

export type ResumeProject = {
  title: string;
  description: string;
  technologies: string[];
  evidence: ResumeEvidence;
};

export type ResumeExperience = {
  title: string;
  organization: string | null;
  details: string[];
  technologies: string[];
  evidence: ResumeEvidence;
};

export type StructuredResumeProfile = {
  candidateName: string | null;
  professionalSummary: string | null;
  professionalTitle: string | null;
  links: string[];
  technicalSkills: string[];
  softSkills: string[];
  projects: ResumeProject[];
  internships: ResumeExperience[];
  workExperience: ResumeExperience[];
  education: ResumeExperience[];
  certifications: ResumeExperience[];
  achievements: string[];
  relevantCoursework: string[];
  resumeText: string;
};

export type PlannedQuestion = {
  question: string;
  category: "project" | "skill" | "experience" | "certification" | "role" | "behavioral" | "bank";
  evidence?: ResumeEvidence;
};

const SECTION_NAMES: Record<string, keyof Pick<StructuredResumeProfile,
  "projects" | "internships" | "workExperience" | "education" | "certifications" | "achievements" | "relevantCoursework" | "technicalSkills"
>> = {
  "project": "projects",
  "projects": "projects",
  "academic projects": "projects",
  "personal projects": "projects",
  "experience": "workExperience",
  "work experience": "workExperience",
  "professional experience": "workExperience",
  "employment": "workExperience",
  "internship": "internships",
  "internships": "internships",
  "education": "education",
  "certification": "certifications",
  "certifications": "certifications",
  "skills": "technicalSkills",
  "technical skills": "technicalSkills",
  "technologies": "technicalSkills",
  "coursework": "relevantCoursework",
  "relevant coursework": "relevantCoursework",
  "achievements": "achievements",
  "awards": "achievements",
};

const KNOWN_TECHNOLOGIES = [
  "Python", "Java", "JavaScript", "TypeScript", "C++", "C#", "Go", "SQL", "React", "Next.js",
  "Node.js", "FastAPI", "Django", "Flask", "Spring Boot", "PostgreSQL", "MySQL", "MongoDB", "Redis",
  "Docker", "Kubernetes", "AWS", "Azure", "GCP", "Git", "GitHub Actions", "Kafka", "RabbitMQ",
  "Pandas", "NumPy", "Scikit-learn", "PyTorch", "TensorFlow", "OpenCV", "ChromaDB", "LangChain",
  "RAG", "Machine Learning", "Deep Learning", "NLP", "Tableau", "Power BI", "Excel",
];

const SOFT_SKILL_TERMS = ["leadership", "communication", "collaboration", "mentoring", "stakeholder", "presentation", "problem solving"];

function normalizeText(text: string): string {
  return text.replace(/\r/g, "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

function sectionKey(line: string): keyof typeof SECTION_NAMES | null {
  const cleaned = line.toLowerCase().replace(/[^a-z ]/g, "").trim();
  return Object.keys(SECTION_NAMES).find((key) => cleaned === key || cleaned === `${key} section`) as keyof typeof SECTION_NAMES | null;
}

function extractTechnologies(text: string): string[] {
  const lower = text.toLowerCase();
  return KNOWN_TECHNOLOGIES.filter((technology) => lower.includes(technology.toLowerCase()));
}

function splitEntries(lines: string[]): string[] {
  const entries: string[] = [];
  let current = "";
  for (const rawLine of lines) {
    const line = rawLine.replace(/^[-•▪]\s*/, "").trim();
    if (!line) continue;
    if (/^(?:[A-Z][\w&/+.' -]{2,70})(?:\s*[|—–-]\s*.+)?$/.test(line) && current) {
      entries.push(current);
      current = line;
    } else {
      current = current ? `${current} ${line}` : line;
    }
  }
  if (current) entries.push(current);
  return entries;
}

function entryToExperience(entry: string, section: string): ResumeExperience {
  const [heading, ...details] = entry.split(/(?<=\.)\s+|\s*[|—–]\s*/);
  const organizationMatch = heading.match(/(?:at|@)\s+([A-Z][\w& .-]+)/);
  return {
    title: heading.slice(0, 120),
    organization: organizationMatch?.[1]?.trim() ?? null,
    details: details.filter(Boolean),
    technologies: extractTechnologies(entry),
    evidence: { text: entry, section },
  };
}

export function analyzeResume(resumeText: string): StructuredResumeProfile {
  const text = normalizeText(resumeText);
  const sections = new Map<string, string[]>();
  let current = "summary";
  sections.set(current, []);

  for (const line of text.split("\n")) {
    const key = sectionKey(line);
    if (key) {
      current = SECTION_NAMES[key];
      if (!sections.has(current)) sections.set(current, []);
    } else {
      sections.get(current)?.push(line);
    }
  }

  const firstLines = text.split("\n").filter(Boolean).slice(0, 3);
  const candidateName = firstLines[0]?.match(/^([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){1,3})\b/)?.[1] ?? null;
  const professionalTitle = firstLines.find((line) => /(?:engineer|developer|analyst|manager|designer|scientist|intern)/i.test(line))?.slice(0, 120) ?? null;
  const summaryLines = sections.get("summary") ?? [];
  const summary = summaryLines.join(" ").trim() || null;
  const projects = splitEntries(sections.get("projects") ?? []).map((entry) => {
    const title = entry.split(/[:|—–-]/)[0].trim().slice(0, 120);
    return { title, description: entry, technologies: extractTechnologies(entry), evidence: { text: entry, section: "projects" } };
  });
  const toExperiences = (section: string) => splitEntries(sections.get(section) ?? []).map((entry) => entryToExperience(entry, section));

  const skillText = (sections.get("technicalSkills") ?? []).join(" ");
  const technicalSkills = [...new Set([...extractTechnologies(skillText), ...extractTechnologies(text)])];
  const softSkills = SOFT_SKILL_TERMS.filter((term) => text.toLowerCase().includes(term));

  return {
    candidateName,
    professionalSummary: summary,
    professionalTitle,
    links: text.match(/https?:\/\/[^\s)]+|(?:github\.com|linkedin\.com)\/[^\s)]+/gi) ?? [],
    technicalSkills,
    softSkills,
    projects,
    internships: toExperiences("internships"),
    workExperience: toExperiences("workExperience"),
    education: toExperiences("education"),
    certifications: toExperiences("certifications"),
    achievements: splitEntries(sections.get("achievements") ?? []),
    relevantCoursework: splitEntries(sections.get("relevantCoursework") ?? []),
    resumeText: text,
  };
}

function projectRelevant(project: ResumeProject, department: DepartmentId, targetRole: string): boolean {
  return isProjectRelevantToRole(
    { title: project.title, skills: project.technologies, primarySkill: project.technologies[0] },
    department,
    targetRole,
  );
}

function dedupeQuestions(questions: PlannedQuestion[]): PlannedQuestion[] {
  const seen = new Set<string>();
  return questions.filter(({ question }) => {
    const signature = question.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    if (seen.has(signature)) return false;
    seen.add(signature);
    return true;
  });
}

export function buildPersonalizedQuestionPlan({
  profile,
  department,
  targetRole,
  track,
  maxQuestions = 6,
}: {
  profile: StructuredResumeProfile;
  department: DepartmentId;
  targetRole: string;
  track: InterviewTrack;
  maxQuestions?: number;
}): PlannedQuestion[] {
  const questions: PlannedQuestion[] = [];
  const relevantProjects = profile.projects.filter((project) => projectRelevant(project, department, targetRole));
  const roleSkillTerms = getQuestionsForSelection(department, targetRole, track).join(" ").toLowerCase();

  for (const project of relevantProjects) {
    const technology = project.technologies[0];
    questions.push({
      category: "project",
      evidence: project.evidence,
      question: technology
        ? `In your ${project.title} project, how did you use ${technology}, and what tradeoff or challenge shaped that decision?`
        : `Walk me through ${project.title}. What problem did it solve, what was your contribution, and how did you measure the outcome?`,
    });
  }

  const roleMatchedSkills = profile.technicalSkills.filter((skill) => roleSkillTerms.includes(skill.toLowerCase()));
  // A role bank may use broad wording (for example, "service design") rather than
  // naming every valid tool. Keep a small evidence-backed skill set in that case.
  for (const skill of (roleMatchedSkills.length ? roleMatchedSkills : profile.technicalSkills).slice(0, 3)) {
    questions.push({
      category: "skill",
      evidence: { text: skill, section: "technical skills" },
      question: `Your résumé lists ${skill}. How have you used it in work or a project relevant to a ${targetRole} role?`,
    });
  }

  for (const experience of [...profile.workExperience, ...profile.internships].slice(0, 2)) {
    questions.push({
      category: "experience",
      evidence: experience.evidence,
      question: `Tell me about your work on ${experience.title}. What was the most difficult problem you owned, and how did you approach it?`,
    });
  }

  for (const certification of profile.certifications.slice(0, 1)) {
    questions.push({
      category: "certification",
      evidence: certification.evidence,
      question: `Your résumé mentions ${certification.title}. Which concepts from it would you apply first in this ${targetRole} role?`,
    });
  }

  for (const storedQuestion of getQuestionsForSelection(department, targetRole, track)) {
    if (validateQuestionRelevance(storedQuestion, department, targetRole)) {
      questions.push({ category: "bank", question: storedQuestion });
    }
  }

  if (questions.length < maxQuestions) {
    questions.push({
      category: "role",
      question: `What core responsibilities would you prioritize during your first 90 days as a ${targetRole}, and how would you measure progress?`,
    });
  }

  const planned = dedupeQuestions(questions).filter((item) => validateQuestionRelevance(item.question, department, targetRole));
  return planned.slice(0, maxQuestions);
}

export function buildResumeFollowUp(answer: string, question: PlannedQuestion, profile: StructuredResumeProfile): string | null {
  const normalizedAnswer = answer.toLowerCase();
  const mentionedSkill = profile.technicalSkills.find((skill) => normalizedAnswer.includes(skill.toLowerCase()));
  if (!mentionedSkill || question.category === "role") return null;
  return `You mentioned ${mentionedSkill}. What limitation or risk did you encounter with it, and how did you validate your approach?`;
}
