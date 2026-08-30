/**
 * System Design Engine & Architectural Topology Analyzer
 * 
 * Provides:
 * 1. Node & Edge graph data models for distributed architectures.
 * 2. Component classifier detecting active tiers (Load Balancer, App Servers, DB)
 *    and missing critical tiers (Cache, Queue, Replication, CDN).
 * 3. 5-Dimension Architectural Evaluator for 10M+ scaling scenarios.
 * 4. Curated system design challenges and preset templates.
 */

export type ArchitecturalNodeType =
  | "client"
  | "cdn"
  | "api_gateway"
  | "load_balancer"
  | "app_server"
  | "cache"
  | "message_queue"
  | "primary_db"
  | "read_replica"
  | "object_storage"
  | "search_index";

export interface ArchitecturalNode {
  id: string;
  type: ArchitecturalNodeType;
  label: string;
  x: number;
  y: number;
  sublabel?: string;
  notes?: string;
}

export interface ArchitecturalEdge {
  id: string;
  from: string; // Source Node ID
  to: string;   // Target Node ID
  label?: string; // e.g. "HTTPS", "gRPC", "Async Event", "Replication Stream"
  style?: "solid" | "dashed" | "bi-directional";
}

export interface ArchitectureDiagram {
  nodes: ArchitecturalNode[];
  edges: ArchitecturalEdge[];
}

export interface ComponentDetectionResult {
  detected: {
    type: ArchitecturalNodeType;
    label: string;
    description: string;
    symbol: string;
  }[];
  missing: {
    type: ArchitecturalNodeType;
    label: string;
    impact: string;
    recommendation: string;
    symbol: string;
  }[];
  singlePointOfFailure: boolean;
  spofDetails?: string[];
  scalabilityRating: "Monolithic (Low Scale <100k)" | "Decoupled (Medium Scale ~1M)" | "Hyperscale Ready (10M+ Users)";
}

export interface SystemDesignDimension {
  name: string;
  score: number; // 0 - 100
  status: "Optimal" | "Adequate" | "Needs Attention" | "Critical Gap";
  feedback: string;
}

export interface SystemDesignEvaluation {
  overallScore: number; // 0 - 100
  challengeTitle: string;
  targetScale: string;
  detection: ComponentDetectionResult;
  dimensions: {
    scalability: SystemDesignDimension;
    highAvailability: SystemDesignDimension;
    latencyAndPerformance: SystemDesignDimension;
    dataConsistencyAndStorage: SystemDesignDimension;
    asynchronousDecoupling: SystemDesignDimension;
  };
  keyStrengths: string[];
  recommendedImprovements: string[];
  interviewerSynthesis: string;
}

export interface SystemDesignChallenge {
  id: string;
  title: string;
  category: string;
  targetScale: string;
  prompt: string;
  requirements: {
    functional: string[];
    nonFunctional: string[];
  };
  expectedComponents: ArchitecturalNodeType[];
}

export const ARCHITECTURAL_NODE_DEFS: Record<
  ArchitecturalNodeType,
  { label: string; defaultSublabel: string; color: string; iconName: string; category: string }
> = {
  client: {
    label: "Client Tier",
    defaultSublabel: "Mobile App / Web Browser",
    color: "from-blue-500 to-indigo-600",
    iconName: "Smartphone",
    category: "Edge & Clients",
  },
  cdn: {
    label: "CDN & Edge DNS",
    defaultSublabel: "Cloudflare / CloudFront",
    color: "from-sky-500 to-blue-600",
    iconName: "Globe",
    category: "Edge & Clients",
  },
  api_gateway: {
    label: "API Gateway",
    defaultSublabel: "Rate Limiting & Auth",
    color: "from-violet-500 to-purple-600",
    iconName: "Shield",
    category: "Routing & Compute",
  },
  load_balancer: {
    label: "Load Balancer",
    defaultSublabel: "ALB / HAProxy Round Robin",
    color: "from-purple-500 to-fuchsia-600",
    iconName: "GitMerge",
    category: "Routing & Compute",
  },
  app_server: {
    label: "Application Servers",
    defaultSublabel: "Stateless Microservices",
    color: "from-indigo-500 to-purple-700",
    iconName: "Server",
    category: "Routing & Compute",
  },
  cache: {
    label: "Distributed Cache",
    defaultSublabel: "Redis / Memcached (Sub-ms)",
    color: "from-rose-500 to-red-600",
    iconName: "Zap",
    category: "Storage & Caching",
  },
  message_queue: {
    label: "Message Queue / Event Bus",
    defaultSublabel: "Kafka / RabbitMQ (Async)",
    color: "from-amber-500 to-orange-600",
    iconName: "Layers",
    category: "Asynchronous & Queues",
  },
  primary_db: {
    label: "Primary Database (Master)",
    defaultSublabel: "PostgreSQL / MySQL (ACID)",
    color: "from-emerald-500 to-teal-600",
    iconName: "Database",
    category: "Storage & Caching",
  },
  read_replica: {
    label: "Read Replicas & Sharding",
    defaultSublabel: "Read Cluster (Horizontal)",
    color: "from-teal-500 to-cyan-600",
    iconName: "Copy",
    category: "Storage & Caching",
  },
  object_storage: {
    label: "Blob / Object Storage",
    defaultSublabel: "AWS S3 / GCS Buckets",
    color: "from-cyan-500 to-blue-500",
    iconName: "HardDrive",
    category: "Storage & Caching",
  },
  search_index: {
    label: "Search & Analytics Engine",
    defaultSublabel: "Elasticsearch / OpenSearch",
    color: "from-yellow-500 to-amber-600",
    iconName: "Search",
    category: "Storage & Caching",
  },
};

export const SYSTEM_DESIGN_CHALLENGES: SystemDesignChallenge[] = [
  {
    id: "scale-10m-web",
    title: "Scale Core Web Platform to 10 Million Users",
    category: "High-Throughput Web Scalability",
    targetScale: "10,000,000 Daily Active Users (50,000 QPS Peak)",
    prompt: "How would you scale this architecture to support 10 million daily active users with sub-50ms latency, high availability, and zero data loss?",
    requirements: {
      functional: [
        "Handle user authentication, profile read/writes, and stateful checkout workflows.",
        "Serve high-volume read queries (>80% read-heavy traffic).",
        "Process background notification events without blocking web threads.",
      ],
      nonFunctional: [
        "99.99% High Availability with no Single Point of Failure (SPOF).",
        "Sub-50ms read latency for hot data.",
        "Zero data loss under database master failover.",
      ],
    },
    expectedComponents: ["load_balancer", "app_server", "cache", "message_queue", "primary_db", "read_replica"],
  },
  {
    id: "url-shortener",
    title: "Design a Global URL Shortener (TinyURL)",
    category: "High Read-Heavy System",
    targetScale: "100 Million Short URLs generated / 10 Billion Redirects Monthly",
    prompt: "Design a highly available URL shortening service that converts long URLs into 7-character tokens with instant redirects at 100:1 read/write ratio.",
    requirements: {
      functional: [
        "Given a long URL, generate a unique shortened alias.",
        "Given a shortened alias, redirect user to the original URL within 20ms.",
        "Collect analytics on click count and geolocation.",
      ],
      nonFunctional: [
        "Sub-15ms redirection latency.",
        "Distributed cache with 80-20 rule hot link eviction (LRU).",
        "High availability across global regions.",
      ],
    },
    expectedComponents: ["cdn", "load_balancer", "app_server", "cache", "primary_db", "message_queue"],
  },
];

export const ARCHITECTURE_PRESETS: {
  name: string;
  description: string;
  diagram: ArchitectureDiagram;
}[] = [
  {
    name: "Baseline Monolith (3-Tier)",
    description: "Traditional starter architecture: Client → Load Balancer → App Server → Database",
    diagram: {
      nodes: [
        { id: "node-1", type: "client", label: "Client Apps", sublabel: "iOS / Android / Web", x: 50, y: 160 },
        { id: "node-2", type: "load_balancer", label: "Load Balancer", sublabel: "Round Robin ALB", x: 230, y: 160 },
        { id: "node-3", type: "app_server", label: "Server Cluster", sublabel: "Monolithic Workers", x: 410, y: 160 },
        { id: "node-4", type: "primary_db", label: "Database", sublabel: "PostgreSQL Master", x: 590, y: 160 },
      ],
      edges: [
        { id: "edge-1", from: "node-1", to: "node-2", label: "HTTPS" },
        { id: "edge-2", from: "node-2", to: "node-3", label: "HTTP/2" },
        { id: "edge-3", from: "node-3", to: "node-4", label: "TCP / SQL" },
      ],
    },
  },
  {
    name: "Add Distributed Caching Tier",
    description: "Adds Redis in-memory cache to offload 85% of read traffic from the database",
    diagram: {
      nodes: [
        { id: "node-1", type: "client", label: "Client Apps", sublabel: "iOS / Android / Web", x: 50, y: 160 },
        { id: "node-2", type: "load_balancer", label: "Load Balancer", sublabel: "Round Robin ALB", x: 220, y: 160 },
        { id: "node-3", type: "app_server", label: "Server Cluster", sublabel: "Stateless App Nodes", x: 390, y: 160 },
        { id: "node-5", type: "cache", label: "Redis Cache Tier", sublabel: "In-Memory (Sub-ms)", x: 560, y: 80 },
        { id: "node-4", type: "primary_db", label: "Primary Database", sublabel: "PostgreSQL Master", x: 560, y: 240 },
      ],
      edges: [
        { id: "edge-1", from: "node-1", to: "node-2", label: "HTTPS" },
        { id: "edge-2", from: "node-2", to: "node-3", label: "HTTP/2" },
        { id: "edge-3", from: "node-3", to: "node-5", label: "Cache Read/Write" },
        { id: "edge-4", from: "node-3", to: "node-4", label: "Cache Miss / Writes" },
      ],
    },
  },
  {
    name: "Full 10M Hyperscale Architecture",
    description: "Production ready: CDN + LB + App Cluster + Redis + Kafka + DB Replicas",
    diagram: {
      nodes: [
        { id: "node-1", type: "client", label: "Clients (10M Users)", sublabel: "Web & Mobile", x: 30, y: 170 },
        { id: "node-0", type: "cdn", label: "CDN & Edge DNS", sublabel: "Static Asset Caching", x: 160, y: 70 },
        { id: "node-2", type: "load_balancer", label: "Load Balancers (Multi-AZ)", sublabel: "HAProxy / ALB", x: 160, y: 230 },
        { id: "node-3", type: "app_server", label: "App Server Fleet", sublabel: "Auto-Scaled Cluster", x: 330, y: 170 },
        { id: "node-5", type: "cache", label: "Redis Cache Cluster", sublabel: "Multi-Node LRU (Sub-ms)", x: 500, y: 70 },
        { id: "node-6", type: "message_queue", label: "Kafka Event Bus", sublabel: "Async Worker Buffering", x: 500, y: 170 },
        { id: "node-4", type: "primary_db", label: "Primary Database", sublabel: "Master Writes (ACID)", x: 500, y: 270 },
        { id: "node-7", type: "read_replica", label: "Read Replicas & Shards", sublabel: "Horizontal Read Scale", x: 670, y: 270 },
      ],
      edges: [
        { id: "edge-0", from: "node-1", to: "node-0", label: "Static Content" },
        { id: "edge-1", from: "node-1", to: "node-2", label: "Dynamic API (HTTPS)" },
        { id: "edge-2", from: "node-2", to: "node-3", label: "Round Robin" },
        { id: "edge-3", from: "node-3", to: "node-5", label: "Read Cache (Sub-ms)" },
        { id: "edge-4", from: "node-3", to: "node-6", label: "Async Ingestion" },
        { id: "edge-5", from: "node-3", to: "node-4", label: "Authoritative Writes" },
        { id: "edge-6", from: "node-4", to: "node-7", label: "Binlog Streaming Replication" },
      ],
    },
  },
];

/**
 * Analyzes an active whiteboard architecture diagram and extracts detected components,
 * missing critical architectural tiers, Single-Point-of-Failure (SPOF) risks, and scalability ratings.
 */
export function analyzeArchitectureTopology(
  diagram: ArchitectureDiagram,
  targetScaleUsers: number = 10_000_000
): ComponentDetectionResult {
  const nodeTypes = new Set(diagram.nodes.map((n) => n.type));

  const detected: ComponentDetectionResult["detected"] = [];
  const missing: ComponentDetectionResult["missing"] = [];
  const spofDetails: string[] = [];

  // 1. Check Load Balancer
  if (nodeTypes.has("load_balancer") || nodeTypes.has("api_gateway")) {
    detected.push({
      type: "load_balancer",
      label: "Load Balancer / API Gateway",
      description: "Distributes incoming traffic across redundant stateless server pools.",
      symbol: "✓",
    });
  } else {
    missing.push({
      type: "load_balancer",
      label: "Load Balancer",
      impact: "Direct server exposure leads to hotspot overload and lack of failover.",
      recommendation: "Introduce an ALB or HAProxy load balancer to distribute traffic evenly.",
      symbol: "✗",
    });
    spofDetails.push("No load balancer detected; single compute entry point creates immediate bottleneck.");
  }

  // 2. Check Application Server Cluster
  if (nodeTypes.has("app_server")) {
    detected.push({
      type: "app_server",
      label: "Application Servers",
      description: "Stateless compute layer capable of horizontal autoscaling.",
      symbol: "✓",
    });
  } else {
    missing.push({
      type: "app_server",
      label: "Application Server Fleet",
      impact: "No compute layer detected to execute business logic.",
      recommendation: "Deploy stateless application containers behind the load balancer.",
      symbol: "✗",
    });
  }

  // 3. Check Database
  if (nodeTypes.has("primary_db")) {
    detected.push({
      type: "primary_db",
      label: "Primary Database (Master)",
      description: "Persistent transactional data store maintaining ACID guarantees.",
      symbol: "✓",
    });
  } else {
    missing.push({
      type: "primary_db",
      label: "Primary Database",
      impact: "No authoritative persistence layer found for structured data.",
      recommendation: "Add a primary relational or document database tier.",
      symbol: "✗",
    });
  }

  // 4. Check Distributed Cache
  if (nodeTypes.has("cache")) {
    detected.push({
      type: "cache",
      label: "Distributed Cache (Redis)",
      description: "In-memory caching layer absorbing 80%+ of read requests at sub-millisecond latencies.",
      symbol: "✓",
    });
  } else {
    missing.push({
      type: "cache",
      label: "Distributed Cache (Redis/Memcached)",
      impact: "At 10M users, direct database hits will cause catastrophic connection saturation and I/O thrashing.",
      recommendation: "Add Redis or Memcached in front of the database with an LRU eviction policy.",
      symbol: "✗",
    });
    if (targetScaleUsers >= 1_000_000) {
      spofDetails.push("Missing cache tier: Database will suffer I/O exhaustion under 50k QPS peak read load.");
    }
  }

  // 5. Check Message Queue / Asynchronous Buffer
  if (nodeTypes.has("message_queue")) {
    detected.push({
      type: "message_queue",
      label: "Message Queue (Kafka / RabbitMQ)",
      description: "Asynchronous event buffer preventing request timeout cascading and managing backpressure.",
      symbol: "✓",
    });
  } else {
    missing.push({
      type: "message_queue",
      label: "Message Queue / Event Bus (Kafka/SQS)",
      impact: "Synchronous processing of background tasks (emails, notifications, transcoding) will tie up web threads.",
      recommendation: "Add Kafka or SQS to decouple write spikes and process heavy background workflows asynchronously.",
      symbol: "✗",
    });
  }

  // 6. Check Database Replication / Sharding
  if (nodeTypes.has("read_replica") || (nodeTypes.has("primary_db") && diagram.nodes.filter((n) => n.type === "primary_db").length > 1)) {
    detected.push({
      type: "read_replica",
      label: "Database Read Replication & Sharding",
      description: "Horizontal read scaling with dedicated read replicas and master write isolation.",
      symbol: "✓",
    });
  } else {
    missing.push({
      type: "read_replica",
      label: "Database Replication (Read Replicas)",
      impact: "Single master database will hit disk IOPS limits under concurrent 10M user queries.",
      recommendation: "Provision Read Replicas with asynchronous binlog replication and read/write splitting.",
      symbol: "✗",
    });
    spofDetails.push("Single Database Master: A single database node represents an unmitigated Single Point of Failure (SPOF).");
  }

  // 7. Check CDN & Static Edge
  if (nodeTypes.has("cdn")) {
    detected.push({
      type: "cdn",
      label: "CDN & Edge Caching",
      description: "Edge POP distribution offloading static media and reducing origin roundtrips.",
      symbol: "✓",
    });
  }

  const singlePointOfFailure = spofDetails.length > 0;

  let scalabilityRating: ComponentDetectionResult["scalabilityRating"] = "Monolithic (Low Scale <100k)";
  if (nodeTypes.has("cache") && nodeTypes.has("read_replica") && (nodeTypes.has("message_queue") || nodeTypes.has("cdn"))) {
    scalabilityRating = "Hyperscale Ready (10M+ Users)";
  } else if (nodeTypes.has("load_balancer") && nodeTypes.has("app_server") && (nodeTypes.has("cache") || nodeTypes.has("read_replica"))) {
    scalabilityRating = "Decoupled (Medium Scale ~1M)";
  }

  return {
    detected,
    missing,
    singlePointOfFailure,
    spofDetails: singlePointOfFailure ? spofDetails : undefined,
    scalabilityRating,
  };
}

/**
 * Evaluates the full system design architecture across 5 core dimensions,
 * analyzing verbal explanation tradeoffs against the visual canvas topology.
 */
export function evaluateSystemDesignSolution(
  diagram: ArchitectureDiagram,
  verbalExplanation: string,
  challenge: SystemDesignChallenge = SYSTEM_DESIGN_CHALLENGES[0]
): SystemDesignEvaluation {
  const detection = analyzeArchitectureTopology(diagram, 10_000_000);
  const textLower = verbalExplanation.toLowerCase();

  // Dimension 1: Scalability & Horizontal Scale
  const hasLB = detection.detected.some((d) => d.type === "load_balancer");
  const hasApp = detection.detected.some((d) => d.type === "app_server");
  const mentionsHorizontal = ["horizontal", "autoscale", "stateless", "cluster", "sharding", "partition", "scale out"].some((k) =>
    textLower.includes(k)
  );

  let scaleScore = 45;
  if (hasLB) scaleScore += 20;
  if (hasApp) scaleScore += 15;
  if (mentionsHorizontal) scaleScore += 20;
  scaleScore = Math.min(100, Math.max(30, scaleScore));

  const scalabilityDim: SystemDesignDimension = {
    name: "1. Scalability & Horizontal Capacity",
    score: scaleScore,
    status: scaleScore >= 85 ? "Optimal" : scaleScore >= 65 ? "Adequate" : "Critical Gap",
    feedback: hasLB && mentionsHorizontal
      ? "Strong horizontal architecture. Stateless application fleet with load balancing enables seamless auto-scaling."
      : "Ensure all app servers remain stateless and traffic is balanced across availability zones to handle 50k QPS.",
  };

  // Dimension 2: High Availability & SPOF Elimination
  const hasReplicas = detection.detected.some((d) => d.type === "read_replica");
  const mentionsHA = ["failover", "redundancy", "multi-az", "backup", "disaster recovery", "replication", "active-passive"].some((k) =>
    textLower.includes(k)
  );

  let haScore = 40;
  if (hasReplicas) haScore += 30;
  if (!detection.singlePointOfFailure) haScore += 15;
  if (mentionsHA) haScore += 15;
  haScore = Math.min(100, Math.max(25, haScore));

  const haDim: SystemDesignDimension = {
    name: "2. High Availability & Fault Tolerance",
    score: haScore,
    status: haScore >= 85 ? "Optimal" : haScore >= 65 ? "Adequate" : "Critical Gap",
    feedback: hasReplicas
      ? "Redundant database nodes and read replicas eliminate Single Points of Failure (SPOF)."
      : "A single database master creates an immediate SPOF. Add multi-AZ read replicas and automated leader election.",
  };

  // Dimension 3: Latency & Caching Strategy
  const hasCache = detection.detected.some((d) => d.type === "cache");
  const hasCDN = detection.detected.some((d) => d.type === "cdn");
  const mentionsCache = ["redis", "memcached", "lru", "cache-aside", "write-through", "ttl", "hit ratio", "sub-millisecond"].some((k) =>
    textLower.includes(k)
  );

  let latencyScore = 35;
  if (hasCache) latencyScore += 35;
  if (hasCDN) latencyScore += 15;
  if (mentionsCache) latencyScore += 15;
  latencyScore = Math.min(100, Math.max(20, latencyScore));

  const latencyDim: SystemDesignDimension = {
    name: "3. Latency & Caching Strategy",
    score: latencyScore,
    status: latencyScore >= 85 ? "Optimal" : latencyScore >= 65 ? "Adequate" : "Needs Attention",
    feedback: hasCache
      ? "Distributed in-memory caching tier absorbs heavy read traffic with sub-millisecond response times."
      : "Missing distributed cache. Direct database queries at 10M users will cause query queue explosion and high latency.",
  };

  // Dimension 4: Data Consistency & Storage Partitioning
  const hasDB = detection.detected.some((d) => d.type === "primary_db");
  const mentionsConsistency = ["acid", "cap theorem", "eventual consistency", "sharding key", "wal", "binlog", "replication lag"].some((k) =>
    textLower.includes(k)
  );

  let storageScore = 40;
  if (hasDB) storageScore += 25;
  if (hasReplicas) storageScore += 20;
  if (mentionsConsistency) storageScore += 15;
  storageScore = Math.min(100, Math.max(30, storageScore));

  const storageDim: SystemDesignDimension = {
    name: "4. Data Consistency & Storage Partitioning",
    score: storageScore,
    status: storageScore >= 85 ? "Optimal" : storageScore >= 65 ? "Adequate" : "Needs Attention",
    feedback: mentionsConsistency
      ? "Clear discussion of CAP theorem tradeoffs, replication lag mitigations, and database partitioning strategy."
      : "Define whether the system prioritizes strong consistency or eventual availability, and specify database sharding keys.",
  };

  // Dimension 5: Asynchronous Decoupling & Event Queuing
  const hasQueue = detection.detected.some((d) => d.type === "message_queue");
  const mentionsAsync = ["kafka", "queue", "async", "event-driven", "backpressure", "worker", "pub/sub", "rabbitmq", "sqs"].some((k) =>
    textLower.includes(k)
  );

  let asyncScore = 30;
  if (hasQueue) asyncScore += 45;
  if (mentionsAsync) asyncScore += 25;
  asyncScore = Math.min(100, Math.max(20, asyncScore));

  const asyncDim: SystemDesignDimension = {
    name: "5. Asynchronous Decoupling & Event Queues",
    score: asyncScore,
    status: asyncScore >= 85 ? "Optimal" : asyncScore >= 65 ? "Adequate" : "Needs Attention",
    feedback: hasQueue
      ? "Kafka / Message Queue provides robust asynchronous buffering, shielding downstream databases from write bursts."
      : "Add a message queue to decouple write-heavy background tasks (e.g. notifications, analytics) from the web request thread.",
  };

  const overallScore = Math.round(
    scaleScore * 0.25 +
    haScore * 0.20 +
    latencyScore * 0.20 +
    storageScore * 0.20 +
    asyncScore * 0.15
  );

  const keyStrengths: string[] = [];
  const recommendedImprovements: string[] = [];

  if (hasLB && hasApp) keyStrengths.push("Stateless compute separation behind an elastic load balancer");
  if (hasCache) keyStrengths.push("Sub-millisecond Redis caching layer protecting persistent storage");
  if (hasQueue) keyStrengths.push("Asynchronous event queue decouples traffic spikes from database writes");
  if (hasReplicas) keyStrengths.push("Read replication allows horizontal read scaling to 10M+ users");

  if (!hasCache) recommendedImprovements.push("Deploy a Redis / Memcached cluster using a Cache-Aside pattern with explicit TTLs.");
  if (!hasQueue) recommendedImprovements.push("Introduce a Kafka or RabbitMQ event queue to buffer background write workloads.");
  if (!hasReplicas) recommendedImprovements.push("Configure multi-AZ database read replicas to eliminate Single Points of Failure.");
  if (!hasCDN) recommendedImprovements.push("Place a CDN (Cloudflare/CloudFront) at the edge to offload static assets.");

  return {
    overallScore,
    challengeTitle: challenge.title,
    targetScale: challenge.targetScale,
    detection,
    dimensions: {
      scalability: scalabilityDim,
      highAvailability: haDim,
      latencyAndPerformance: latencyDim,
      dataConsistencyAndStorage: storageDim,
      asynchronousDecoupling: asyncDim,
    },
    keyStrengths: keyStrengths.length > 0 ? keyStrengths : ["Basic multi-tier functional topology mapped."],
    recommendedImprovements:
      recommendedImprovements.length > 0 ? recommendedImprovements : ["Fine-tune database connection pooling and cache eviction policies."],
    interviewerSynthesis: `Candidate designed an architecture evaluated at ${overallScore}/100 for the "${challenge.title}" challenge. Detected ${detection.detected.length} core components (${detection.detected.map((d) => d.label).join(", ")}) and flagged ${detection.missing.length} missing architectural recommendations. Scalability classification: "${detection.scalabilityRating}".`,
  };
}
