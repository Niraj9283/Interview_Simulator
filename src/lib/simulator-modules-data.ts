export interface SimulatorModule {
  id: string;
  title: string;
  shortTitle: string;
  tagline: string;
  badge: string;
  description: string;
  highlights: {
    label: string;
    detail: string;
  }[];
  evaluationRubric: {
    metric: string;
    weight: string;
    description: string;
  }[];
  proTip: string;
}

export const SIMULATOR_MODULES: SimulatorModule[] = [
  {
    id: "behavioral-star-rubric",
    title: "Behavioral STAR Rubric",
    shortTitle: "STAR Rubric",
    badge: "Evaluation Engine",
    tagline: "Automated scoring engine for behavioral & leadership responses.",
    description:
      "MockMate AI evaluates behavioral responses against the industry-standard STAR methodology (Situation, Task, Action, Result). Answers are scored on structural clarity, tactical ownership, and quantified business impact.",
    highlights: [
      {
        label: "Situation (15%)",
        detail: "Sets the stage: team environment, project stakes, and constraints.",
      },
      {
        label: "Task (15%)",
        detail: "Defines the exact problem, goal, or technical obstacle you owned.",
      },
      {
        label: "Action (45%)",
        detail: "The core focus: your personal tactical contributions, trade-offs, and decisions.",
      },
      {
        label: "Result (25%)",
        detail: "Quantified impact: latency drops, revenue lift, error reductions, and learnings.",
      },
    ],
    evaluationRubric: [
      {
        metric: "Action-to-Talk Ratio",
        weight: "45%",
        description: "Prioritizes 'I built/led' over 'we thought'. Emphasizes execution depth.",
      },
      {
        metric: "Quantitative Evidence",
        weight: "25%",
        description: "Rewards measurable metrics (e.g., 'reduced p99 latency from 450ms to 85ms').",
      },
      {
        metric: "Conciseness & Cadence",
        weight: "15%",
        description: "Optimal delivery spans 90 to 150 seconds without rambling.",
      },
      {
        metric: "Conflict & Reflection",
        weight: "15%",
        description: "Demonstrates emotional intelligence, disagreement resolution, and lessons learned.",
      },
    ],
    proTip:
      "Avoid passive storytelling. Spend at least 60% of your time on the Action and Result phases with measurable business metrics.",
  },
  {
    id: "speech-cadence-analytics",
    title: "Speech & Cadence Analytics",
    shortTitle: "Speech Analytics",
    badge: "Sub-50ms Edge Engine",
    tagline: "Real-time vocal analysis, pacing, filler words, and pause telemetry.",
    description:
      "Analyzes your vocal stream locally in real-time via Web Audio API. Calculates Words Per Minute (WPM), speech steadiness, pause patterns, and flags unconscious filler words.",
    highlights: [
      {
        label: "Optimal Pacing",
        detail: "120–160 WPM ideal range. Speeds above 180 or below 100 trigger pacing warnings.",
      },
      {
        label: "Filler Word Detection",
        detail: "Live tracking of 'um', 'uh', 'like', 'actually', 'basically', and 'you know'.",
      },
      {
        label: "Pause-to-Speech Ratio",
        detail: "Rewards structured 1–2 second deliberate pauses between technical points.",
      },
      {
        label: "Client-Side Audio",
        detail: "Zero voice recordings stored on remote servers; processed in browser memory.",
      },
    ],
    evaluationRubric: [
      {
        metric: "Pacing Consistency",
        weight: "35%",
        description: "Maintains clear, conversational rhythm between 120 and 160 WPM.",
      },
      {
        metric: "Filler Density",
        weight: "30%",
        description: "Penalizes filler word densities exceeding 2 occurrences per minute.",
      },
      {
        metric: "Breath & Thought Pauses",
        weight: "20%",
        description: "Calculates natural pause ratios for structured point separation.",
      },
      {
        metric: "Audio Clarity & RMS",
        weight: "15%",
        description: "Monitors steady volume levels without clipping or trailing off.",
      },
    ],
    proTip:
      "When formulating complex technical answers, take a silent 2-second breath rather than using vocalized fillers like 'um' or 'basically'.",
  },
  {
    id: "system-design-canvas",
    title: "System Design Canvas",
    shortTitle: "System Design",
    badge: "Distributed Systems",
    tagline: "Interactive architecture canvas for distributed scalable systems.",
    description:
      "Simulates real-world system design interviews: architect microservices, configure caching layers, partition databases, and balance latency budgets under high-throughput loads.",
    highlights: [
      {
        label: "Component Modeling",
        detail: "API Gateways, Load Balancers, App Services, Redis Caches, and Message Queues.",
      },
      {
        label: "Data Architecture",
        detail: "SQL (PostgreSQL ACID) vs NoSQL (DynamoDB/Cassandra), Sharding, and Replication.",
      },
      {
        label: "Resilience & Trade-offs",
        detail: "Mitigate Single Points of Failure (SPOF) and balance CAP theorem constraints.",
      },
      {
        label: "Throughput Estimation",
        detail: "Back-of-the-envelope calculations for QPS, bandwidth, and storage capacity.",
      },
    ],
    evaluationRubric: [
      {
        metric: "Requirement Scoping",
        weight: "25%",
        description: "Clarifying functional vs non-functional constraints and scale bounds.",
      },
      {
        metric: "High-Level Architecture",
        weight: "30%",
        description: "Logical end-to-end data flow from client requests to persistent storage.",
      },
      {
        metric: "Bottleneck Identification",
        weight: "25%",
        description: "Deep dive into caching invalidation, hot partitions, and replication lag.",
      },
      {
        metric: "Scalability Trade-offs",
        weight: "20%",
        description: "Defending consistency vs availability and cost trade-offs under load.",
      },
    ],
    proTip:
      "Always start by establishing non-functional requirements (p99 latency, DAU, read:write ratios) before sketching database schemas.",
  },
  {
    id: "coding-sandbox",
    title: "Coding Sandbox",
    shortTitle: "Coding Sandbox",
    badge: "WebAssembly Execution",
    tagline: "In-browser code editor with automated tests & algorithmic complexity scoring.",
    description:
      "Integrated code workspace supporting Python and JavaScript. Executes code in sandboxed browser runtimes with real-time linting, hidden edge-case unit test suites, and Big-O efficiency analysis.",
    highlights: [
      {
        label: "Multi-Language Runner",
        detail: "Instant execution for algorithmic questions in Python 3 and modern JavaScript.",
      },
      {
        label: "Edge-Case Testing",
        detail: "Evaluates empty inputs, off-by-one errors, single-element collections, and limits.",
      },
      {
        label: "Big-O Analysis",
        detail: "Automated analysis comparing your solution's time and space complexity.",
      },
      {
        label: "Zero-Latency REPL",
        detail: "Direct WebAssembly execution with no remote compilation delays.",
      },
    ],
    evaluationRubric: [
      {
        metric: "Correctness & Edge Cases",
        weight: "40%",
        description: "Passing 100% of test suites including empty, negative, and extreme bounds.",
      },
      {
        metric: "Algorithmic Complexity",
        weight: "30%",
        description: "Meeting target Time (O(N log N) or O(N)) and Space (O(1)) bounds.",
      },
      {
        metric: "Clean Code & Naming",
        weight: "15%",
        description: "Descriptive variable names, early returns, and modular helper functions.",
      },
      {
        metric: "Verbal Walkthrough",
        weight: "15%",
        description: "Explaining brute-force approaches before jumping into optimized code.",
      },
    ],
    proTip:
      "State your brute-force complexity first (e.g. O(N²)), then explain how a hash map or two-pointer approach optimizes it to O(N).",
  },
  {
    id: "gaze-integrity-shield",
    title: "Gaze & Integrity Shield",
    shortTitle: "Integrity Shield",
    badge: "MediaPipe Biometrics",
    tagline: "Edge gaze tracking and attention verification with zero server storage.",
    description:
      "Verifies authentic interview presence using lightweight client-side MediaPipe computer vision. Monitors gaze stability, tab blurring, and unnatural copy-paste clipboard behaviors.",
    highlights: [
      {
        label: "Iris & Gaze Tracking",
        detail: "Computes eye contact percentage and flags sustained dual-monitor looking away.",
      },
      {
        label: "Focus & Blur Detection",
        detail: "Tracks window focus loss and browser tab transitions during timed rounds.",
      },
      {
        label: "Clipboard Protection",
        detail: "Monitors sudden bulk copy-paste injections from external generative AI tools.",
      },
      {
        label: "Privacy-Preserved",
        detail: "Video frames never leave browser memory; only scalar telemetry is derived.",
      },
    ],
    evaluationRubric: [
      {
        metric: "Camera Engagement",
        weight: "40%",
        description: "Maintaining natural eye contact with the virtual interviewer (>80%).",
      },
      {
        metric: "Session Focus",
        weight: "30%",
        description: "Zero unauthorized tab switches or screen-sharing interruptions.",
      },
      {
        metric: "Authentic Typing Cadence",
        weight: "20%",
        description: "Real-time human keystroke variance vs instantaneous bulk pastes.",
      },
      {
        metric: "Environmental Stability",
        weight: "10%",
        description: "Adequate lighting and face detection continuity throughout the session.",
      },
    ],
    proTip:
      "Place your webcam at eye level directly above the interviewer's video tile to naturally score 95%+ on camera engagement.",
  },
];
