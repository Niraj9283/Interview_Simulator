import rawRoleDatabase from "../../data/interview-role-database.json";

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
  if (type === "Coding") {
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

export function getDepartmentDefinition(departmentId: DepartmentId) {
  return roleDatabase.departments.find((department) => department.id === departmentId) ?? roleDatabase.departments[0];
}

export function getDepartmentLabel(departmentId: DepartmentId) {
  return getDepartmentDefinition(departmentId).label;
}

export function getRolesForDepartment(departmentId: DepartmentId) {
  return getDepartmentDefinition(departmentId).roles;
}

export function getDefaultRoleForDepartment(departmentId: DepartmentId) {
  return getRolesForDepartment(departmentId)[0]?.title ?? "Candidate";
}

export function getAvailableTracks(departmentId: DepartmentId) {
  return getDepartmentDefinition(departmentId).tracks;
}

export function getDefaultTrackForDepartment(departmentId: DepartmentId) {
  return getAvailableTracks(departmentId)[0] ?? "Role Specific";
}

export function isTrackAvailableForDepartment(departmentId: DepartmentId, track: InterviewTrack) {
  return getAvailableTracks(departmentId).includes(track);
}

export function findRole(departmentId: DepartmentId, targetRole: string) {
  const roles = getRolesForDepartment(departmentId);
  return roles.find((role) => role.title === targetRole) ?? roles[0];
}

export function getQuestionsForSelection(departmentId: DepartmentId, targetRole: string, track: InterviewTrack) {
  const safeTrack = isTrackAvailableForDepartment(departmentId, track) ? track : getDefaultTrackForDepartment(departmentId);
  const role = findRole(departmentId, targetRole);
  const roleQuestions = role?.questions[safeTrack] ?? [];

  return [...roleQuestions, ...buildFallbackQuestions(departmentId, role?.title ?? targetRole, safeTrack)];
}

function buildFallbackQuestions(departmentId: DepartmentId, targetRole: string, track: InterviewTrack) {
  const departmentLabel = getDepartmentLabel(departmentId).replace(" Department", "").toLowerCase();

  if (track === "DSA") {
    return [
      `Solve a ${targetRole} problem using the most appropriate data structure. Explain complexity and edge cases.`,
      `How would you optimize a slow ${targetRole} solution if input size grew by 100x?`,
      `Compare brute force and optimized approaches for a ${targetRole} coding challenge.`,
    ];
  }

  if (track === "System Design") {
    return [
      `Design a reliable ${targetRole} workflow with APIs, storage, monitoring, and failure recovery.`,
      `How would you scale a ${targetRole} system while keeping security and performance stable?`,
      `What tradeoffs would you make when designing data flow for a ${targetRole} product area?`,
    ];
  }

  if (track === "Case Study") {
    return [
      `A ${departmentLabel} metric is moving in the wrong direction. How would you diagnose the cause and recommend action?`,
      `A stakeholder disagrees with your ${targetRole} recommendation. How would you use data and communication to resolve it?`,
      `You have limited time and incomplete information for a ${departmentLabel} decision. What would you prioritize first?`,
    ];
  }

  if (track === "Behavioral") {
    return [
      `Tell me about a time you handled ambiguity in a ${targetRole} responsibility.`,
      `Describe a difficult collaboration you had in a ${departmentLabel} context and what changed because of your actions.`,
      `Why are you a strong fit for ${targetRole}, and what would you improve in your first 90 days?`,
    ];
  }

  return [
    `What are the most important responsibilities of a ${targetRole}, and how would you approach them?`,
    `Which tools, metrics, and decisions matter most for success in this ${departmentLabel} role?`,
    `Describe a recent project or workflow relevant to ${targetRole} and the impact you created.`,
  ];
}
