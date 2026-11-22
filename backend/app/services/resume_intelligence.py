"""Deterministic, evidence-preserving resume parsing and question planning."""

from __future__ import annotations

import re
from dataclasses import asdict, dataclass, field


KNOWN_SKILLS = [
    "Python", "Java", "JavaScript", "TypeScript", "SQL", "React", "Next.js", "FastAPI",
    "Docker", "Kubernetes", "AWS", "Azure", "GCP", "Kafka", "Redis", "PostgreSQL",
    "MongoDB", "Pandas", "NumPy", "Scikit-learn", "PyTorch", "TensorFlow", "XGBoost",
    "Machine Learning", "Deep Learning", "NLP", "RAG", "Tableau", "Power BI", "Excel",
]
SECTION_ALIASES = {
    "project": "projects", "projects": "projects", "academic projects": "projects",
    "experience": "experience", "work experience": "experience", "professional experience": "experience",
    "employment": "experience", "internship": "internships", "internships": "internships",
    "skills": "skills", "technical skills": "skills", "technologies": "skills",
    "education": "education", "certification": "certifications", "certifications": "certifications",
    "achievements": "achievements", "awards": "achievements", "coursework": "coursework",
}


@dataclass
class Evidence:
    text: str
    section: str


@dataclass
class ResumeItem:
    title: str
    details: str
    technologies: list[str] = field(default_factory=list)
    evidence: Evidence | None = None


@dataclass
class StructuredResume:
    candidate_name: str | None
    professional_summary: str | None
    technical_skills: list[str]
    projects: list[ResumeItem]
    work_experience: list[ResumeItem]
    internships: list[ResumeItem]
    education: list[ResumeItem]
    certifications: list[ResumeItem]
    achievements: list[str]
    relevant_coursework: list[str]

    def to_dict(self) -> dict:
        return asdict(self)


def _skills(text: str) -> list[str]:
    lowered = text.lower()
    return [skill for skill in KNOWN_SKILLS if skill.lower() in lowered]


def _entries(lines: list[str], section: str) -> list[ResumeItem]:
    entries, current = [], ""
    for line in lines:
        line = re.sub(r"^[\s•▪*-]+", "", line).strip()
        if not line:
            continue
        if current and re.match(r"^[A-Z][\w&/ .'+-]{2,80}(?:\s*[|—–-]\s*.+)?$", line):
            entries.append(current)
            current = line
        else:
            current = f"{current} {line}".strip()
    if current:
        entries.append(current)
    return [ResumeItem(title=entry.split(":", 1)[0].split("|", 1)[0][:120].strip(), details=entry, technologies=_skills(entry), evidence=Evidence(entry, section)) for entry in entries]


def parse_resume(text: str) -> StructuredResume:
    text = re.sub(r"\r", "", text).strip()
    sections: dict[str, list[str]] = {"summary": []}
    current = "summary"
    for raw in text.splitlines():
        line = raw.strip()
        header = re.sub(r"[^a-z ]", "", line.lower()).strip()
        if header in SECTION_ALIASES:
            current = SECTION_ALIASES[header]
            sections.setdefault(current, [])
        elif line:
            sections.setdefault(current, []).append(line)
    first_lines = [line for line in text.splitlines() if line.strip()][:3]
    name_match = re.match(r"^([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})\b", first_lines[0]) if first_lines else None
    return StructuredResume(
        candidate_name=name_match.group(1) if name_match else None,
        professional_summary=" ".join(sections["summary"])[:500] or None,
        technical_skills=_skills(" ".join(sections.get("skills", [])) or text),
        projects=_entries(sections.get("projects", []), "projects"),
        work_experience=_entries(sections.get("experience", []), "experience"),
        internships=_entries(sections.get("internships", []), "internships"),
        education=_entries(sections.get("education", []), "education"),
        certifications=_entries(sections.get("certifications", []), "certifications"),
        achievements=[item.details for item in _entries(sections.get("achievements", []), "achievements")],
        relevant_coursework=[item.details for item in _entries(sections.get("coursework", []), "coursework")],
    )


def build_question_plan(resume: StructuredResume, target_role: str, bank_questions: list[str], max_questions: int = 6) -> list[dict]:
    plan: list[dict] = []
    for project in resume.projects[:2]:
        tech = project.technologies[0] if project.technologies else None
        prompt = f"In your {project.title} project, how did you use {tech}, and what tradeoff shaped that decision?" if tech else f"Walk me through {project.title}. What problem did it solve, what was your contribution, and how did you measure the result?"
        plan.append({"question": prompt, "category": "project", "evidence": asdict(project.evidence)})
    for skill in resume.technical_skills[:2]:
        plan.append({"question": f"Your resume lists {skill}. How have you applied it in work or a project relevant to a {target_role} role?", "category": "skill", "evidence": {"text": skill, "section": "skills"}})
    for experience in (resume.work_experience + resume.internships)[:1]:
        plan.append({"question": f"Tell me about your work on {experience.title}. What was the hardest problem you owned, and how did you approach it?", "category": "experience", "evidence": asdict(experience.evidence)})
    for certification in resume.certifications[:1]:
        plan.append({"question": f"Your resume mentions {certification.title}. Which concept from it would you apply first in this {target_role} role?", "category": "certification", "evidence": asdict(certification.evidence)})
    plan.extend({"question": q, "category": "bank"} for q in bank_questions)
    seen, unique = set(), []
    for item in plan:
        key = re.sub(r"\W+", " ", item["question"].lower()).strip()
        if key not in seen:
            seen.add(key)
            unique.append(item)
    return unique[:max_questions]
