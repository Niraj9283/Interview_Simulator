/**
 * Coding Interview University (CIU) Knowledge Graph
 * A structured, hierarchical computer science interview curriculum representing
 * topics, prerequisites, target skills, key concepts, rubrics, and CIU resources.
 */

export type CIUDomain =
  | "Data Structures"
  | "Algorithms"
  | "CS Fundamentals"
  | "Software Engineering"
  | "System Design"
  | "Machine Learning & AI";

export type TopicDifficulty = "easy" | "medium" | "hard" | "expert";

export interface CIUTopicNode {
  id: string;
  name: string;
  domain: CIUDomain;
  subdomain: string;
  difficulty: TopicDifficulty;
  prerequisites: string[];
  skills: string[];
  keyConcepts: string[];
  description: string;
  sampleQuestions: string[];
  evaluationRubric: {
    minimumCriteria: string[];
    strongSignals: string[];
    redFlags: string[];
  };
  ciuReferenceUrl: string;
}

export const CIU_KNOWLEDGE_GRAPH: CIUTopicNode[] = [
  // ==================== DATA STRUCTURES ====================
  {
    id: "arrays-and-strings",
    name: "Arrays & Dynamic Arrays",
    domain: "Data Structures",
    subdomain: "Linear Structures",
    difficulty: "easy",
    prerequisites: ["programming-basics"],
    skills: ["contiguous memory", "pointer arithmetic", "amortized resizing"],
    keyConcepts: [
      "Amortized O(1) appending",
      "Memory locality & cache lines",
      "Two-pointer techniques",
      "Sliding window optimization",
      "Prefix sum array precomputation",
    ],
    description:
      "Contiguous memory buffers, dynamic resizing strategies (geometric scaling factor 1.5x/2x), and amortized runtime complexity.",
    sampleQuestions: [
      "How does a dynamic array (like std::vector or Python list) resize internally and why is resizing amortized O(1)?",
      "When would you prefer a two-pointer approach over a hash map for pair-sum queries?",
    ],
    evaluationRubric: {
      minimumCriteria: ["Mentions contiguous memory allocation", "Explains doubling/geometric resizing"],
      strongSignals: ["Calculates amortized sum via aggregate analysis", "Cites CPU cache line locality advantages"],
      redFlags: ["Believes resizing takes O(1) worst-case", "Confuses capacity with length"],
    },
    ciuReferenceUrl: "https://github.com/jwasham/coding-interview-university#arrays",
  },
  {
    id: "linked-lists",
    name: "Linked Lists",
    domain: "Data Structures",
    subdomain: "Linear Structures",
    difficulty: "easy",
    prerequisites: ["arrays-and-strings"],
    skills: ["pointer manipulation", "node allocation", "cycle detection"],
    keyConcepts: [
      "Singly vs Doubly linked lists",
      "Sentinel (dummy) nodes",
      "Floyd's Cycle Detection (Tortoise and Hare)",
      "In-place list reversal",
      "Cache miss overhead compared to arrays",
    ],
    description:
      "Node-based linear collections linked by explicit memory references, sentinel node simplifications, and pointer cycle invariants.",
    sampleQuestions: [
      "Explain Floyd's cycle-finding algorithm and prove why the fast and slow pointers must meet if a cycle exists.",
      "Why do linked lists generally perform worse in sequential iterations than arrays despite identical O(N) theoretical bounds?",
    ],
    evaluationRubric: {
      minimumCriteria: ["Explains fast/slow pointer mechanics", "Identifies O(1) insertion at head/tail when pointer exists"],
      strongSignals: ["Discusses CPU cache thrashing from heap allocations", "Handles edge cases with dummy sentinel heads"],
      redFlags: ["Claims random access is O(1)", "Loses list references causing memory leaks"],
    },
    ciuReferenceUrl: "https://github.com/jwasham/coding-interview-university#linked-lists",
  },
  {
    id: "stack-and-queue",
    name: "Stacks & Queues",
    domain: "Data Structures",
    subdomain: "Linear Structures",
    difficulty: "easy",
    prerequisites: ["arrays-and-strings", "linked-lists"],
    skills: ["LIFO/FIFO invariants", "monotonic stacks", "deque buffering"],
    keyConcepts: [
      "LIFO (Stack) vs FIFO (Queue)",
      "Circular buffer queue implementation",
      "Monotonic stack for next-greater-element in O(N)",
      "Double-ended queue (Deque) ring buffers",
      "Call stack activation records & recursion frames",
    ],
    description:
      "Constrained access data structures used for call stacks, syntax parsing, breadth-first traversal, and sliding window maximums.",
    sampleQuestions: [
      "How do you implement a queue using two stacks, and what is the amortized cost per dequeue operation?",
      "Explain how a monotonic stack solves the 'Daily Temperatures' or 'Next Greater Element' problem in linear time.",
    ],
    evaluationRubric: {
      minimumCriteria: ["Identifies LIFO and FIFO properties correctly", "Explains push/pop O(1) operations"],
      strongSignals: ["Proves O(1) amortized dequeue via potential method", "Applies monotonic stacks effectively to optimize O(N^2) loops"],
      redFlags: ["Asserts stack search is O(1)", "Fails to handle circular buffer wraparound"],
    },
    ciuReferenceUrl: "https://github.com/jwasham/coding-interview-university#stack",
  },
  {
    id: "hash-tables",
    name: "Hash Tables & Hashing",
    domain: "Data Structures",
    subdomain: "Associative Structures",
    difficulty: "medium",
    prerequisites: ["arrays-and-strings"],
    skills: ["collision resolution", "load factor tuning", "cryptographic vs non-cryptographic hash functions"],
    keyConcepts: [
      "Hash functions (uniform distribution & avalanche effect)",
      "Separate Chaining vs Open Addressing (Linear, Quadratic, Double Hashing)",
      "Load Factor (alpha = n/k) and dynamic re-hashing",
      "Robin Hood Hashing & Cuckoo Hashing",
      "Worst-case O(N) hash collision Denial-of-Service (HashDoS)",
    ],
    description:
      "Key-value associative mapping achieving O(1) average lookup via hashing, collision handling policies, and re-hash thresholds.",
    sampleQuestions: [
      "What happens when two keys map to the same bucket in a hash table, and how do separate chaining and linear probing differ in cache efficiency?",
      "What is load factor, and how does dynamically resizing a hash table preserve O(1) average-time complexity?",
    ],
    evaluationRubric: {
      minimumCriteria: ["Explains separate chaining vs open addressing", "Understands load factor triggers reallocation"],
      strongSignals: ["Discusses tombstone markers in open addressing deletions", "Analyzes clustering effects and cache locality"],
      redFlags: ["Claims hash table lookup is guaranteed O(1) worst-case", "Forgets to re-hash keys upon array expansion"],
    },
    ciuReferenceUrl: "https://github.com/jwasham/coding-interview-university#hash-table",
  },
  {
    id: "binary-search-trees",
    name: "Trees & Binary Search Trees (BST)",
    domain: "Data Structures",
    subdomain: "Hierarchical Structures",
    difficulty: "medium",
    prerequisites: ["recursion", "linked-lists"],
    skills: ["tree traversal", "balanced BST invariants", "lowest common ancestor"],
    keyConcepts: [
      "BST property (Left < Node < Right)",
      "In-order, pre-order, post-order, and level-order traversals",
      "Tree height balance (AVL rotations, Red-Black color invariants)",
      "Trie (Prefix Tree) for prefix search & auto-complete",
      "Segment Tree & Fenwick Tree (Binary Indexed Tree)",
    ],
    description:
      "Hierarchical node structures enabling logarithmic search, balanced rotation guarantees, and hierarchical spatial indexing.",
    sampleQuestions: [
      "Why does a naive BST degrade to O(N) runtime, and how do Red-Black trees prevent this degeneration?",
      "Walk through in-order traversal of a BST without recursion using an explicit stack or Morris traversal.",
    ],
    evaluationRubric: {
      minimumCriteria: ["Accurately describes BST ordering rules", "Explains O(log N) average vs O(N) unbalanced worst case"],
      strongSignals: ["Details tree rotation mechanics (LL, RR, LR, RL)", "Explains Trie prefix compression (Radix Tree)"],
      redFlags: ["Confuses binary tree with binary search tree", "Cannot describe recursive base cases"],
    },
    ciuReferenceUrl: "https://github.com/jwasham/coding-interview-university#binary-search-trees-bsts",
  },
  {
    id: "heaps-and-priority-queues",
    name: "Heaps & Priority Queues",
    domain: "Data Structures",
    subdomain: "Hierarchical Structures",
    difficulty: "medium",
    prerequisites: ["arrays-and-strings", "binary-search-trees"],
    skills: ["complete binary tree", "heapify up/down", "top-k streaming"],
    keyConcepts: [
      "Min-Heap and Max-Heap invariants",
      "Array representation (Parent: (i-1)/2, Left: 2i+1, Right: 2i+2)",
      "Build-Heap in O(N) mathematical proof",
      "Extract-Min and Insert in O(log N)",
      "Streaming top-K elements using min-heap of size K",
    ],
    description:
      "Complete binary trees satisfying the heap-order property stored compactly in flat arrays for efficient priority scheduling.",
    sampleQuestions: [
      "Why does building a heap from an unordered array take O(N) time instead of O(N log N)?",
      "How would you find the median of a continuous stream of numbers in O(1) time using heaps?",
    ],
    evaluationRubric: {
      minimumCriteria: ["States parent/child index formulas", "Explains O(log N) insert and extract"],
      strongSignals: ["Derives O(N) build-heap via summation of heights", "Explains dual-heap median tracking mechanics"],
      redFlags: ["Claims heap search for arbitrary element is O(log N)", "Forgets complete binary tree shape property"],
    },
    ciuReferenceUrl: "https://github.com/jwasham/coding-interview-university#heap--priority-queue--binary-heap",
  },
  {
    id: "graphs",
    name: "Graphs & Graph Algorithms",
    domain: "Data Structures",
    subdomain: "Non-Linear Structures",
    difficulty: "hard",
    prerequisites: ["stack-and-queue", "heaps-and-priority-queues"],
    skills: ["adjacency representations", "shortest path", "topological sorting"],
    keyConcepts: [
      "Adjacency List vs Adjacency Matrix memory & iteration tradeoffs",
      "Breadth-First Search (BFS) for unweighted shortest paths",
      "Depth-First Search (DFS) with cycle detection & back-edges",
      "Dijkstra's Algorithm with Min-Heap in O((V + E) log V)",
      "Topological Sort (Kahn's algorithm & DFS finish times)",
      "Disjoint Set Union (DSU) with Union by Rank & Path Compression",
    ],
    description:
      "Vertices connected by edges modeling complex networks, shortest path finding, minimum spanning trees, and dependency resolution.",
    sampleQuestions: [
      "Compare Dijkstra and Bellman-Ford algorithms. When must you use Bellman-Ford over Dijkstra?",
      "How does Union-Find achieve nearly O(1) amortized operations using Path Compression and Union by Rank?",
    ],
    evaluationRubric: {
      minimumCriteria: ["Distinguishes BFS and DFS use cases", "Understands visited set to avoid infinite cycles"],
      strongSignals: ["Quotes Ackermann inverse alpha(N) for DSU", "Explains negative weight cycle detection in Bellman-Ford"],
      redFlags: ["Attempts to run Dijkstra on graphs with negative weights without caveats", "Confuses DAG with general directed graph"],
    },
    ciuReferenceUrl: "https://github.com/jwasham/coding-interview-university#graphs",
  },

  // ==================== ALGORITHMS ====================
  {
    id: "sorting-algorithms",
    name: "Sorting Algorithms",
    domain: "Algorithms",
    subdomain: "Sorting & Searching",
    difficulty: "medium",
    prerequisites: ["arrays-and-strings"],
    skills: ["in-place sorting", "stable vs unstable", "comparison lower bound"],
    keyConcepts: [
      "Comparison lower bound: Omega(N log N)",
      "QuickSort (partitioning, pivot choice, worst-case O(N^2) avoidance)",
      "MergeSort (divide-and-conquer, stability, O(N) auxiliary space)",
      "HeapSort (in-place O(N log N), unstable)",
      "Linear non-comparison sorts: Counting Sort, Radix Sort, Bucket Sort",
    ],
    description:
      "Foundational sorting paradigms, stability characteristics, comparison theoretical limits, and non-comparison linear optimizations.",
    sampleQuestions: [
      "Why is MergeSort preferred over QuickSort for sorting linked lists, while QuickSort is often preferred for arrays?",
      "Prove why comparison-based sorting algorithms cannot beat O(N log N) in the worst case.",
    ],
    evaluationRubric: {
      minimumCriteria: ["Lists time and space complexity for QuickSort, MergeSort, HeapSort", "Defines stability in sorting"],
      strongSignals: ["Constructs decision tree model proving Omega(N log N)", "Discusses dual-pivot QuickSort and Timsort adaptive mechanics"],
      redFlags: ["Claims BubbleSort is acceptable for large arrays", "Thinks QuickSort is always O(N log N) without randomized pivot"],
    },
    ciuReferenceUrl: "https://github.com/jwasham/coding-interview-university#sorting",
  },
  {
    id: "binary-search",
    name: "Binary Search & Search Spaces",
    domain: "Algorithms",
    subdomain: "Sorting & Searching",
    difficulty: "easy",
    prerequisites: ["arrays-and-strings"],
    skills: ["boundary conditions", "search on answer", "integer overflow safety"],
    keyConcepts: [
      "O(log N) reduction invariant",
      "Midpoint calculation avoiding overflow: mid = low + (high - low) / 2",
      "Lower bound / Upper bound (first true condition)",
      "Binary search on monotonically decreasing/increasing answer space",
      "Rotated sorted array search",
    ],
    description:
      "Logarithmic search over sorted arrays and monotonic predicate spaces to find target values, insertion bounds, or optimal thresholds.",
    sampleQuestions: [
      "How do you modify binary search to find the minimum element in a rotated sorted array in O(log N)?",
      "Explain the concept of 'Binary Search on Answer' with an example like the Painter's Partition or Capacity to Ship Packages.",
    ],
    evaluationRubric: {
      minimumCriteria: ["Writes correct loop condition (low <= high vs low < high)", "Avoids (low + high) / 2 overflow"],
      strongSignals: ["Formulates monotonic condition f(x) for search on answer", "Handles duplicates in rotated array edge cases"],
      redFlags: ["Infinite loops on two-element arrays", "Cannot articulate loop invariant"],
    },
    ciuReferenceUrl: "https://github.com/jwasham/coding-interview-university#binary-search",
  },
  {
    id: "recursion-and-backtracking",
    name: "Recursion & Backtracking",
    domain: "Algorithms",
    subdomain: "Combinatorics",
    difficulty: "medium",
    prerequisites: ["stack-and-queue"],
    skills: ["state space tree", "pruning branches", "call stack depth"],
    keyConcepts: [
      "Base case and inductive step",
      "State restoration upon backtracking",
      "Branch-and-bound pruning optimization",
      "Permutations, Combinations, and Subsets generation",
      "Constraint satisfaction (N-Queens, Sudoku Solver)",
    ],
    description:
      "Systematic search over combinatorial state trees with deliberate rollback and branch pruning when constraints are violated.",
    sampleQuestions: [
      "How do you avoid generating duplicate subsets when the input array contains duplicate numbers?",
      "What is the difference between backtracking and pure recursion, and how does pruning reduce factorial complexity?",
    ],
    evaluationRubric: {
      minimumCriteria: ["Identifies base cases clearly", "Restores mutable state upon backtracking return"],
      strongSignals: ["Applies bitmask state compression", "Calculates branch pruning asymptotic reduction"],
      redFlags: ["Overlooks stack overflow depth limits", "Leaves mutated state dirty across sibling branches"],
    },
    ciuReferenceUrl: "https://github.com/jwasham/coding-interview-university#recursion",
  },
  {
    id: "dynamic-programming",
    name: "Dynamic Programming (DP)",
    domain: "Algorithms",
    subdomain: "Optimization",
    difficulty: "hard",
    prerequisites: ["recursion-and-backtracking", "arrays-and-strings"],
    skills: ["overlapping subproblems", "optimal substructure", "state space reduction"],
    keyConcepts: [
      "Optimal substructure & Overlapping subproblems",
      "Top-down Memoization vs Bottom-up Tabulation",
      "1D DP (Fibonacci, House Robber, Climbing Stairs)",
      "2D DP (0/1 Knapsack, Longest Common Subsequence, Edit Distance)",
      "Space optimization from O(N^2) to O(N) using rolling arrays",
      "Bitmask DP and Interval DP",
    ],
    description:
      "Mathematical optimization technique solving complex problems by decomposing them into subproblems and storing overlapping results.",
    sampleQuestions: [
      "How do you determine if a problem can be solved using Dynamic Programming rather than a Greedy algorithm?",
      "Walk through the state transition relation and space optimization for the 0/1 Knapsack problem.",
    ],
    evaluationRubric: {
      minimumCriteria: ["Defines recurrence relation explicitly", "Distinguishes memoization and tabulation"],
      strongSignals: ["Reduces space from O(N*W) to O(W) with reverse iteration", "Proves greedy choice property failure requiring DP"],
      redFlags: ["Guesses state without defining dimensions", "Recomputes overlapping subproblems exponentially"],
    },
    ciuReferenceUrl: "https://github.com/jwasham/coding-interview-university#dynamic-programming",
  },

  // ==================== CS FUNDAMENTALS ====================
  {
    id: "operating-systems-concurrency",
    name: "Operating Systems & Concurrency",
    domain: "CS Fundamentals",
    subdomain: "Systems",
    difficulty: "hard",
    prerequisites: ["programming-basics"],
    skills: ["process vs thread", "synchronization primitives", "virtual memory"],
    keyConcepts: [
      "Process (PCB, address space) vs Thread (TCB, shared heap)",
      "Context switching overhead and CPU cache invalidation",
      "Race conditions, Mutexes, Semaphores, and Spinlocks",
      "Coffman's four conditions for Deadlock and Banker's Algorithm",
      "Virtual Memory: Paging, Page Faults, TLB, and LRU replacement",
      "Inter-Process Communication (IPC): Pipes, Sockets, Shared Memory",
    ],
    description:
      "Core OS architectures, memory paging translation, process scheduling, synchronization barriers, and thread concurrency control.",
    sampleQuestions: [
      "What are Coffman's four conditions for deadlock, and how does modern software architecture prevent at least one of them?",
      "Explain what happens at the hardware and OS kernel level when a thread experiences a page fault.",
    ],
    evaluationRubric: {
      minimumCriteria: ["Clarifies process address space separation vs thread shared memory", "Names at least 3 Coffman conditions"],
      strongSignals: ["Details TLB miss -> Page Table Walk -> Page Fault interrupt -> Disk I/O pipeline", "Contrasts user-space mutex futex with kernel context switch"],
      redFlags: ["Thinks threads have completely isolated memory spaces", "Claims mutex and semaphore are identical"],
    },
    ciuReferenceUrl: "https://github.com/jwasham/coding-interview-university#threads-processes",
  },
  {
    id: "dbms-and-storage",
    name: "Database Management & Storage Engines",
    domain: "CS Fundamentals",
    subdomain: "Databases",
    difficulty: "hard",
    prerequisites: ["hash-tables", "binary-search-trees"],
    skills: ["ACID transactions", "indexing structures", "isolation levels"],
    keyConcepts: [
      "ACID properties (Atomicity, Consistency, Isolation, Durability)",
      "B-Tree / B+ Tree indexing mechanics and disk block alignment",
      "LSM-Trees (Log-Structured Merge-Tree) vs B+ Trees for write-heavy loads",
      "SQL Isolation Levels: Read Uncommitted, Read Committed, Repeatable Read, Serializable",
      "WAL (Write-Ahead Logging) and Crash Recovery (ARIES)",
      "Sharding, Read Replicas, and Master-Slave replication lag",
    ],
    description:
      "Relational and non-relational database internals, index page layouts, transaction isolation phenomena, and persistence guarantees.",
    sampleQuestions: [
      "Why do databases use B+ Trees rather than standard Binary Search Trees or Hash Tables for disk storage indexes?",
      "Explain the Dirty Read, Non-Repeatable Read, and Phantom Read phenomena and which SQL isolation levels prevent them.",
    ],
    evaluationRubric: {
      minimumCriteria: ["Explains B+ Tree leaf node linked list sequential scan", "Defines ACID accurately"],
      strongSignals: ["Compares LSM-Tree sequential append write throughput to B+ Tree random I/O", "Explains MVCC (Multi-Version Concurrency Control) implementation"],
      redFlags: ["Claims NoSQL databases cannot support ACID", "Thinks indexing every column is free of write overhead"],
    },
    ciuReferenceUrl: "https://github.com/jwasham/coding-interview-university#system-design-scalability-data-handling",
  },
  {
    id: "computer-networking",
    name: "Computer Networking & Protocols",
    domain: "CS Fundamentals",
    subdomain: "Networking",
    difficulty: "medium",
    prerequisites: ["programming-basics"],
    skills: ["TCP vs UDP", "HTTP protocols", "TLS handshake"],
    keyConcepts: [
      "OSI 7-Layer model vs TCP/IP 4-layer stack",
      "TCP 3-way handshake (SYN, SYN-ACK, ACK) and 4-way termination",
      "TCP flow control (sliding window) & congestion control (Slow Start, AIMD)",
      "UDP connectionless transmission for real-time video/gaming",
      "HTTP/1.1 vs HTTP/2 (Multiplexing, Header Compression) vs HTTP/3 (QUIC over UDP)",
      "TLS/SSL cryptographic handshake and symmetric session key exchange",
    ],
    description:
      "Transport and application layer network protocols, packet loss retransmission, connection handshakes, and encryption layers.",
    sampleQuestions: [
      "Describe the complete sequence of events when you type 'https://www.google.com' into a browser and press Enter.",
      "How does HTTP/2 multiplexing eliminate Head-of-Line blocking in HTTP/1.1, and why does HTTP/3 move to UDP?",
    ],
    evaluationRubric: {
      minimumCriteria: ["Walks through DNS resolution, TCP handshake, HTTP request/response", "Contrasts TCP reliability with UDP speed"],
      strongSignals: ["Details TLS 1.3 1-RTT handshake with Diffie-Hellman ephemeral keys", "Explains TCP head-of-line blocking vs QUIC independent stream frames"],
      redFlags: ["Claims DNS uses TCP by default for standard queries", "Confuses asymmetric key encryption with symmetric bulk data cipher"],
    },
    ciuReferenceUrl: "https://github.com/jwasham/coding-interview-university#networking",
  },

  // ==================== SOFTWARE ENGINEERING ====================
  {
    id: "oop-and-design-patterns",
    name: "Object-Oriented Design & SOLID Principles",
    domain: "Software Engineering",
    subdomain: "Architecture & Design",
    difficulty: "medium",
    prerequisites: ["programming-basics"],
    skills: ["SOLID principles", "design patterns", "loose coupling"],
    keyConcepts: [
      "SOLID Principles (Single Responsibility, Open/Closed, Liskov, Interface Segregation, Dependency Inversion)",
      "Composition over Inheritance",
      "Creational Patterns: Singleton, Factory Method, Abstract Factory, Builder",
      "Structural Patterns: Adapter, Decorator, Facade, Proxy",
      "Behavioral Patterns: Observer, Strategy, Command, State",
      "Polymorphism: Compile-time (Overloading) vs Runtime (Overriding / Virtual tables)",
    ],
    description:
      "Architectural principles for maintainable, testable code, dynamic dispatch mechanics, and battle-tested Gang of Four patterns.",
    sampleQuestions: [
      "Explain the Dependency Inversion Principle with a real-world code example and how it enables unit testing with mocks.",
      "How does the Strategy Pattern differ from the State Pattern despite their similar class diagrams?",
    ],
    evaluationRubric: {
      minimumCriteria: ["Explains all 5 letters of SOLID", "Contrasts overloading with overriding"],
      strongSignals: ["Explains vtable (virtual method table) pointer dereference in C++/Java", "Applies Decorator vs Inheritance to avoid subclass explosion"],
      redFlags: ["Violates Liskov substitution by throwing unexpected exceptions in subclasses", "Overuses Singleton leading to hidden global state"],
    },
    ciuReferenceUrl: "https://github.com/jwasham/coding-interview-university#design-patterns",
  },
  {
    id: "testing-and-cicd",
    name: "Software Testing, Clean Code & Git",
    domain: "Software Engineering",
    subdomain: "Engineering Practices",
    difficulty: "easy",
    prerequisites: ["programming-basics"],
    skills: ["unit testing", "TDD", "git branch strategies"],
    keyConcepts: [
      "Testing pyramid: Unit vs Integration vs End-to-End (E2E)",
      "Test-Driven Development (Red-Green-Refactor)",
      "Mocking vs Stubbing vs Fakes",
      "Git internals: DAG commits, trees, blobs, and references",
      "Git Rebase vs Merge and interactive squashing",
      "CI/CD automated regression suites and canary deployments",
    ],
    description:
      "Software verification methodologies, test isolation techniques, version control DAG mechanics, and automated continuous delivery pipelines.",
    sampleQuestions: [
      "What is the difference between a Mock, a Stub, and a Fake in test architecture?",
      "How does Git store commits and file changes internally? Is a commit a delta or a snapshot?",
    ],
    evaluationRubric: {
      minimumCriteria: ["Distinguishes unit tests from integration tests", "Understands merge vs rebase consequences"],
      strongSignals: ["Explains Git object store SHA-1/SHA-256 DAG snapshots", "Applies mutation testing concepts to evaluate test quality"],
      redFlags: ["Claims 100% test coverage guarantees absence of bugs", "Does not understand merge conflict resolution"],
    },
    ciuReferenceUrl: "https://github.com/jwasham/coding-interview-university#testing",
  },

  // ==================== SYSTEM DESIGN ====================
  {
    id: "distributed-system-design",
    name: "Large-Scale Distributed System Design",
    domain: "System Design",
    subdomain: "Distributed Architectures",
    difficulty: "expert",
    prerequisites: ["dbms-and-storage", "computer-networking", "operating-systems-concurrency"],
    skills: ["high availability", "horizontal scalability", "eventual consistency"],
    keyConcepts: [
      "Horizontal vs Vertical Scaling and Stateless Application Tiers",
      "Load Balancing: Round Robin, Least Connections, Consistent Hashing",
      "Caching Strategies: Cache-Aside, Write-Through, Write-Back, Eviction (LRU/LFU)",
      "CAP Theorem and PACELC trade-offs in distributed data stores",
      "Message Queues (Kafka / RabbitMQ) for asynchronous decoupling & backpressure",
      "Rate Limiting algorithms (Token Bucket, Leaky Bucket, Sliding Window Counter)",
      "Resilience: Circuit Breakers, Bulkheads, Retries with Exponential Backoff and Jitter",
    ],
    description:
      "End-to-end architectures serving millions of requests per second, resilient fault isolation, distributed consensus, and horizontal scaling.",
    sampleQuestions: [
      "Design a distributed rate limiter for a public API gateway handling 100,000 requests/second across multiple global data centers.",
      "How does Consistent Hashing minimize key redistribution when nodes are added or removed from a caching cluster?",
    ],
    evaluationRubric: {
      minimumCriteria: ["Identifies functional and non-functional requirements", "Draws clear separation between client, load balancer, app, cache, DB"],
      strongSignals: ["Applies Consistent Hashing with virtual nodes", "Calculates back-of-the-envelope QPS, bandwidth, and storage requirements"],
      redFlags: ["Designs a single point of failure without replica failover", "Assumes distributed transactions with 2PC scale arbitrarily"],
    },
    ciuReferenceUrl: "https://github.com/jwasham/coding-interview-university#system-design-scalability-data-handling",
  },

  // ==================== ML & AI ====================
  {
    id: "machine-learning-engineering",
    name: "Machine Learning & Model Evaluation",
    domain: "Machine Learning & AI",
    subdomain: "Core ML",
    difficulty: "hard",
    prerequisites: ["arrays-and-strings", "programming-basics"],
    skills: ["bias-variance tradeoff", "feature engineering", "metric calibration"],
    keyConcepts: [
      "Supervised vs Unsupervised vs Self-supervised learning",
      "Bias-Variance Tradeoff and Regularization (L1 Lasso, L2 Ridge, Dropout)",
      "Ensemble Methods: Random Forest (Bagging) vs Gradient Boosting (XGBoost / LightGBM)",
      "Imbalanced Data: SMOTE, Focal Loss, PR-AUC vs ROC-AUC, Cost-sensitive matrices",
      "Model Interpretability: SHAP (Shapley Additive exPlanations) and LIME",
      "Data leakage prevention in cross-validation pipelines",
    ],
    description:
      "Statistical modeling foundations, feature representation, ensemble mechanics, loss calibration, and explainable AI techniques.",
    sampleQuestions: [
      "How does a Random Forest reduce variance without increasing bias compared to an individual deep decision tree?",
      "Why is ROC-AUC misleading for severely imbalanced fraud detection datasets, and what should you use instead?",
    ],
    evaluationRubric: {
      minimumCriteria: ["Explains bootstrap aggregation mechanics", "Distinguishes Precision/Recall from Accuracy"],
      strongSignals: ["Proves variance reduction as tree correlation drops", "Explains TreeSHAP game-theoretic local attribution"],
      redFlags: ["Uses Accuracy to evaluate a 99:1 imbalanced dataset", "Leaks test fold statistics into training feature scaling"],
    },
    ciuReferenceUrl: "https://github.com/jwasham/coding-interview-university",
  },
  {
    id: "genai-and-rag-architectures",
    name: "Generative AI, RAG & LLM Systems",
    domain: "Machine Learning & AI",
    subdomain: "Generative AI",
    difficulty: "expert",
    prerequisites: ["machine-learning-engineering", "distributed-system-design"],
    skills: ["vector embeddings", "hybrid retrieval", "hallucination mitigation"],
    keyConcepts: [
      "Transformer Architecture: Multi-Head Self-Attention, Query-Key-Value projection",
      "Vector Embeddings & Approximate Nearest Neighbors (HNSW, IVFFlat)",
      "Retrieval-Augmented Generation (RAG): Chunking, Dense + Sparse Hybrid Search (BM25 + ColBERT)",
      "Prompt Engineering, Chain-of-Thought, and Few-Shot In-Context Learning",
      "LLM Evaluation: Ragas (Faithfulness, Answer Relevance), LLM-as-a-Judge, BERTScore",
      "Fine-Tuning: LoRA (Low-Rank Adaptation) and QLoRA memory optimization",
    ],
    description:
      "Modern Large Language Model architectures, vector index retrieval mechanics, multi-stage RAG pipelines, and grounded evaluation.",
    sampleQuestions: [
      "Explain the complete pipeline of an Enterprise Hybrid RAG system and how you measure retrieval recall and faithfulness.",
      "How does LoRA (Low-Rank Adaptation) enable fine-tuning 70B parameter models on consumer GPUs without full rank updates?",
    ],
    evaluationRubric: {
      minimumCriteria: ["Explains vector similarity search vs keyword search", "Describes chunking and context injection into prompts"],
      strongSignals: ["Details HNSW graph skip-list layers and Reciprocal Rank Fusion (RRF)", "Addresses context window dilution and lost-in-the-middle phenomena"],
      redFlags: ["Claims vector embeddings guarantee 100% factual accuracy without grounding", "Confuses fine-tuning with pre-training from scratch"],
    },
    ciuReferenceUrl: "https://github.com/jwasham/coding-interview-university",
  },
];

/**
 * Knowledge Graph Helper Utilities
 */

export function getTopicsByDomain(domain: CIUDomain): CIUTopicNode[] {
  return CIU_KNOWLEDGE_GRAPH.filter((node) => node.domain === domain);
}

export function getTopicById(id: string): CIUTopicNode | undefined {
  return CIU_KNOWLEDGE_GRAPH.find((node) => node.id === id);
}

export function getAllDomains(): CIUDomain[] {
  return [
    "Data Structures",
    "Algorithms",
    "CS Fundamentals",
    "Software Engineering",
    "System Design",
    "Machine Learning & AI",
  ];
}

export function searchTopics(query: string): CIUTopicNode[] {
  const q = query.toLowerCase().trim();
  if (!q) return CIU_KNOWLEDGE_GRAPH;

  return CIU_KNOWLEDGE_GRAPH.filter(
    (node) =>
      node.name.toLowerCase().includes(q) ||
      node.keyConcepts.some((c) => c.toLowerCase().includes(q)) ||
      node.skills.some((s) => s.toLowerCase().includes(q)) ||
      node.description.toLowerCase().includes(q)
  );
}

export function getPrerequisiteChain(topicId: string): CIUTopicNode[] {
  const result: CIUTopicNode[] = [];
  const visited = new Set<string>();

  function traverse(id: string) {
    if (visited.has(id)) return;
    visited.add(id);

    const topic = getTopicById(id);
    if (!topic) return;

    for (const prereq of topic.prerequisites) {
      traverse(prereq);
    }
    result.push(topic);
  }

  traverse(topicId);
  return result;
}
