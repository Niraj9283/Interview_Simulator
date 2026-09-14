export type TargetCompany =
  | "Google"
  | "Amazon"
  | "Microsoft"
  | "Infosys"
  | "TCS"
  | "Accenture"
  | "Fast-Paced Startup"
  | "Custom Company";

export type ExperienceLevel = "Fresher" | "0-2 years" | "2-5 years" | "5+ years";

export type TargetRole =
  | "Software Engineer"
  | "Data Scientist"
  | "ML Engineer"
  | "GenAI Engineer"
  | "Frontend Developer"
  | "Backend Developer";

export type PlatformInterviewMode =
  | "HR Interview"
  | "Technical Interview"
  | "Resume Interview"
  | "DSA Coding"
  | "System Design"
  | "ML Interview"
  | "GenAI Interview";

export interface CompanyProfile {
  id: TargetCompany;
  name: string;
  badge: string;
  color: string;
  interviewCulture: string;
  coreEvaluationCriteria: string[];
  recommendedPersonality: string;
  roleQuestions: Record<
    TargetRole,
    Record<PlatformInterviewMode, string[]>
  >;
}

export const TARGET_COMPANIES: TargetCompany[] = [
  "Google",
  "Amazon",
  "Microsoft",
  "Infosys",
  "TCS",
  "Accenture",
  "Fast-Paced Startup",
  "Custom Company",
];

export const EXPERIENCE_LEVELS: ExperienceLevel[] = [
  "Fresher",
  "0-2 years",
  "2-5 years",
  "5+ years",
];

export const TARGET_ROLES: TargetRole[] = [
  "Software Engineer",
  "Data Scientist",
  "ML Engineer",
  "GenAI Engineer",
  "Frontend Developer",
  "Backend Developer",
];

export const PLATFORM_INTERVIEW_MODES: PlatformInterviewMode[] = [
  "Technical Interview",
  "DSA Coding",
  "System Design",
  "Resume Interview",
  "ML Interview",
  "GenAI Interview",
  "HR Interview",
];

export const COMPANY_PROFILES: Record<TargetCompany, {
  name: string;
  badge: string;
  color: string;
  culture: string;
  evaluationFocus: string[];
  signatureStyle: string;
}> = {
  Google: {
    name: "Google",
    badge: "FAANG / Rigor",
    color: "#4285F4",
    culture: "Algorithmic excellence, rigorous Big-O proof, clean maintainable code, and Googlyness (humility & collaboration).",
    evaluationFocus: ["Algorithmic Correctness", "Time/Space Complexity Proof", "Edge Case Rigor", "Open-Ended Problem Solving"],
    signatureStyle: "Strict mathematical correctness, deep data structure invariants, and proactive edge-case discovery.",
  },
  Amazon: {
    name: "Amazon",
    badge: "Leadership Principles",
    color: "#FF9900",
    culture: "Deep adherence to 16 Leadership Principles (Customer Obsession, Ownership, Bias for Action, Dive Deep) with Bar Raiser veto.",
    evaluationFocus: ["Customer Obsession", "Ownership & Accountability", "Scalable Resilient Design", "STAR Behavioral Metric Impact"],
    signatureStyle: "STAR format probing, relentless dive-deep questioning into metrics, and customer-first trade-offs.",
  },
  Microsoft: {
    name: "Microsoft",
    badge: "Enterprise Systems",
    color: "#00A4EF",
    culture: "Growth mindset, deep systems architecture, maintainable enterprise software, and empathetic collaboration.",
    evaluationFocus: ["System Scalability & Reliability", "OOP & Design Patterns", "Growth Mindset", "Production Robustness"],
    signatureStyle: "Clean architectural abstractions, failure isolation, and real-world maintainability.",
  },
  Infosys: {
    name: "Infosys",
    badge: "Global Tech Services",
    color: "#007CC3",
    culture: "Strong programming fundamentals, SQL/DBMS fluency, structured logical reasoning, and client delivery discipline.",
    evaluationFocus: ["Core Data Structures", "DBMS & SQL Querying", "OOP Principles", "Agile Execution"],
    signatureStyle: "Speed of core fundamentals, clean code syntax, and database query optimization.",
  },
  TCS: {
    name: "TCS",
    badge: "Enterprise IT",
    color: "#E21836",
    culture: "Core CS knowledge, clear articulate communication, enterprise SDLC standards, and adaptability.",
    evaluationFocus: ["Core CS Concepts", "Coding Fundamentals", "Problem Solving Clarity", "Professional Communication"],
    signatureStyle: "Foundational CS verification, thread safety, and structured delivery communication.",
  },
  Accenture: {
    name: "Accenture",
    badge: "Consulting & Cloud",
    color: "#A100FF",
    culture: "High business value delivery, cloud migration architecture, stakeholder communication, and modern tech stacks.",
    evaluationFocus: ["Business-to-Tech Translation", "Cloud & Modern Architecture", "Communication & Structure", "Pragmatic Solutions"],
    signatureStyle: "High-level architecture trade-offs, business requirements mapping, and client presentation clarity.",
  },
  "Fast-Paced Startup": {
    name: "Fast-Paced Startup",
    badge: "Velocity & Impact",
    color: "#10B981",
    culture: "Extreme product velocity, pragmatic trade-offs, rapid prototyping, and end-to-end full stack ownership.",
    evaluationFocus: ["Velocity & Practical Delivery", "Pragmatic Stack Decisions", "Debugging Under Pressure", "High Ownership"],
    signatureStyle: "Fast decision-making, direct trade-off analysis, and building without unnecessary over-engineering.",
  },
  "Custom Company": {
    name: "Custom Company",
    badge: "Custom Simulation",
    color: "#8B5CF6",
    culture: "Balanced holistic interview simulating industry-standard technical and behavioral benchmarks.",
    evaluationFocus: ["Technical Accuracy", "Problem Solving", "Communication", "System Design"],
    signatureStyle: "Comprehensive evaluation across technical competency and professional delivery.",
  },
};

/**
 * Builds tailored interview questions based on Company, Role, Mode, and Experience.
 */
export function getCompanyTailoredQuestions(
  company: TargetCompany,
  role: TargetRole,
  mode: PlatformInterviewMode,
  experience: ExperienceLevel
): string[] {
  const isSenior = experience === "5+ years" || experience === "2-5 years";

  if (mode === "Technical Interview") {
    if (company === "Google") {
      return [
        "Explain how you would optimize search across 10 billion documents with prefix matching. Detail the Trie/Inverted Index memory trade-offs and Big-O.",
        "Compare Red-Black Trees and AVL Trees. Why does Java's TreeMap use Red-Black trees while performance-critical databases often prefer B+ Trees?",
        "Given a graph with positive and negative edge weights, when does Dijkstra fail and how does Bellman-Ford detect negative cycles?",
      ];
    }
    if (company === "Amazon") {
      return [
        "In a high-throughput fulfillment service, how do you handle idempotency for order placement when network timeouts occur?",
        "Explain how DynamoDB achieves single-digit millisecond latency at scale and how consistent hashing distributes partitioning keys.",
        "How do you resolve a deadlocked distributed transaction without locking the entire relational database table?",
      ];
    }
    if (company === "Microsoft") {
      return [
        "Walk through the implementation of an in-memory thread-safe LRU Cache. Explain the locking granularity or lock-free concurrent approach.",
        "Explain the Liskov Substitution Principle and how violating it in an enterprise microservice causes subtle production outages.",
        "Describe what happens at the kernel and memory management level during a context switch between two heavy threads.",
      ];
    }
    if (company === "Fast-Paced Startup") {
      return [
        "We need to ship an autocomplete feature by Friday. What data structure and database approach would you implement first, and where will it fail as users grow?",
        "How do you diagnose and resolve a memory leak in a production Node/Python service that crashes every 6 hours under peak traffic?",
        "Walk through your decision criteria for picking between PostgreSQL JSONB vs MongoDB for rapidly changing product models.",
      ];
    }
    return [
      `What are the core architectural and data structure choices you rely on as a ${role} to ensure sub-100ms response times?`,
      "Explain the trade-offs between separate chaining and open addressing in hash tables when memory is constrained.",
      "How do you implement reliable error handling and retries with exponential backoff across microservices?",
    ];
  }

  if (mode === "DSA Coding") {
    return [
      "Given an array of integers and a target sum, return indices of the two numbers such that they add up to the target in O(N) time and O(N) space.",
      "Given a string containing parentheses '()', '{}', '[]', determine if the input string is valid using a stack in O(N) time.",
      "Merge K sorted linked lists and analyze the time complexity using a Min-Heap / Priority Queue.",
    ];
  }

  if (mode === "System Design") {
    if (isSenior) {
      return [
        "Design a global video streaming platform like YouTube handling 100M active daily users, 500 hours of video uploaded per minute, and global CDN delivery.",
        "Design a distributed rate limiter that throttles API clients across 5 global AWS regions with sub-2ms latency overhead.",
        "Design a real-time collaborative document editing system (like Google Docs) using Operational Transformation (OT) or CRDTs.",
      ];
    }
    return [
      "Design a URL shortening service like TinyURL. Calculate storage requirements, hash collision strategies, and caching layers.",
      "Design a real-time notifications service handling push notifications, SMS, and email with priority queues and deduplication.",
      "Design an e-commerce shopping cart checkout flow that guarantees no double-purchasing of limited stock inventory.",
    ];
  }

  if (mode === "ML Interview") {
    return [
      "How does a Random Forest reduce variance compared to a single decision tree, and how do you calibrate max_features and tree depth on noisy data?",
      "Explain why ROC-AUC can be dangerously misleading for severely imbalanced fraud detection datasets, and explain how Precision-Recall AUC behaves.",
      "Walk through the mathematical difference between TreeSHAP and KernelSHAP for model interpretability in credit scoring.",
    ];
  }

  if (mode === "GenAI Interview") {
    return [
      "Walk through the end-to-end architecture of an Enterprise RAG pipeline. How do you evaluate and optimize retrieval recall, precision, and generation faithfulness?",
      "How does Low-Rank Adaptation (LoRA) enable parameter-efficient fine-tuning of 70B LLMs on consumer hardware without updating full weight matrices?",
      "How do you architect an autonomous multi-agent system with tool calling while preventing infinite execution loops and hallucinations?",
    ];
  }

  if (mode === "Resume Interview") {
    return [
      "Walk me through the most technically challenging project on your resume. What was the critical architectural bottleneck and how did you resolve it?",
      "Looking at your experience, tell me about a time your initial design failed under real load or unexpected user behavior, and what you changed.",
      "What concrete metrics (latency, cost, throughput, revenue) demonstrate the impact of the key project listed on your resume?",
    ];
  }

  // HR Interview
  if (company === "Amazon") {
    return [
      "Tell me about a time you had a strong disagreement with your manager or team lead on a technical decision. How did you disagree and commit? (Amazon LP: Have Backbone; Disagree and Commit)",
      "Give me an example of a time you invented a simple solution to a complex problem. (Amazon LP: Invent and Simplify)",
      "Describe a situation where you had to make an important decision with incomplete information and strict time constraints. (Amazon LP: Bias for Action)",
    ];
  }
  return [
    "Tell me about yourself and walk me through the key transitions in your software engineering journey.",
    "Describe a challenging team conflict or tight deadline pressure you encountered and how you handled it.",
    `Why are you specifically targeting ${company} and this ${role} position at this stage in your career?`,
  ];
}
