"""
Coding Interview University (CIU) Knowledge Graph Service
Stores and indexes hierarchical computer science topics, key concepts,
prerequisites, and evaluation rubrics.
"""

from typing import Any, Optional


CIU_KNOWLEDGE_GRAPH_PYTHON: list[dict[str, Any]] = [
    # Data Structures
    {
        "id": "arrays-and-strings",
        "name": "Arrays & Dynamic Arrays",
        "domain": "Data Structures",
        "subdomain": "Linear Structures",
        "difficulty": "easy",
        "prerequisites": ["programming-basics"],
        "skills": ["contiguous memory", "pointer arithmetic", "amortized resizing"],
        "key_concepts": [
            "Amortized O(1) appending",
            "Memory locality & cache lines",
            "Two-pointer techniques",
            "Sliding window optimization",
            "Prefix sum array precomputation",
        ],
        "description": "Contiguous memory buffers, dynamic geometric resizing (1.5x/2x), and amortized runtime complexity.",
        "sample_questions": [
            "How does a dynamic array resize internally and why is resizing amortized O(1)?",
            "When would you prefer a two-pointer approach over a hash map for pair-sum queries?",
        ],
        "ciu_reference_url": "https://github.com/jwasham/coding-interview-university#arrays",
    },
    {
        "id": "linked-lists",
        "name": "Linked Lists",
        "domain": "Data Structures",
        "subdomain": "Linear Structures",
        "difficulty": "easy",
        "prerequisites": ["arrays-and-strings"],
        "skills": ["pointer manipulation", "node allocation", "cycle detection"],
        "key_concepts": [
            "Singly vs Doubly linked lists",
            "Sentinel (dummy) nodes",
            "Floyd's Cycle Detection (Tortoise and Hare)",
            "In-place list reversal",
            "Cache miss overhead compared to arrays",
        ],
        "description": "Node-based linear collections linked by explicit pointers, sentinel head node simplifications, and cycle invariants.",
        "sample_questions": [
            "Explain Floyd's cycle-finding algorithm and prove why the fast and slow pointers must meet if a cycle exists.",
            "Why do linked lists perform worse in sequential iteration than flat arrays despite identical O(N) bounds?",
        ],
        "ciu_reference_url": "https://github.com/jwasham/coding-interview-university#linked-lists",
    },
    {
        "id": "hash-tables",
        "name": "Hash Tables & Hashing",
        "domain": "Data Structures",
        "subdomain": "Associative Structures",
        "difficulty": "medium",
        "prerequisites": ["arrays-and-strings"],
        "skills": ["collision resolution", "load factor tuning", "cryptographic vs non-cryptographic hash functions"],
        "key_concepts": [
            "Hash functions (uniform distribution & avalanche effect)",
            "Separate Chaining vs Open Addressing (Linear Probing, Double Hashing)",
            "Load Factor (alpha = n/k) and dynamic re-hashing",
            "Robin Hood Hashing & Cuckoo Hashing",
            "Worst-case O(N) collision degradation",
        ],
        "description": "Key-value associative mapping achieving O(1) average lookup via hashing, collision handling, and re-hash thresholds.",
        "sample_questions": [
            "What happens when two keys map to the same bucket in a hash table, and how do chaining and open addressing differ in cache efficiency?",
            "What is load factor, and how does dynamically resizing a hash table preserve O(1) average-time complexity?",
        ],
        "ciu_reference_url": "https://github.com/jwasham/coding-interview-university#hash-table",
    },
    {
        "id": "binary-search-trees",
        "name": "Trees & Binary Search Trees (BST)",
        "domain": "Data Structures",
        "subdomain": "Hierarchical Structures",
        "difficulty": "medium",
        "prerequisites": ["recursion", "linked-lists"],
        "skills": ["tree traversal", "balanced BST invariants", "lowest common ancestor"],
        "key_concepts": [
            "BST property (Left < Node < Right)",
            "In-order, pre-order, post-order, and level-order traversals",
            "Tree height balance (AVL rotations, Red-Black color invariants)",
            "Trie (Prefix Tree) for prefix search & auto-complete",
            "Segment Tree & Fenwick Tree",
        ],
        "description": "Hierarchical node structures enabling logarithmic search, balanced rotation guarantees, and hierarchical spatial indexing.",
        "sample_questions": [
            "Why does a naive BST degrade to O(N) runtime, and how do Red-Black trees prevent this degeneration?",
            "Walk through in-order traversal of a BST without recursion using an explicit stack.",
        ],
        "ciu_reference_url": "https://github.com/jwasham/coding-interview-university#binary-search-trees-bsts",
    },
    {
        "id": "graphs",
        "name": "Graphs & Graph Algorithms",
        "domain": "Data Structures",
        "subdomain": "Non-Linear Structures",
        "difficulty": "hard",
        "prerequisites": ["stack-and-queue", "heaps-and-priority-queues"],
        "skills": ["adjacency representations", "shortest path", "topological sorting"],
        "key_concepts": [
            "Adjacency List vs Adjacency Matrix memory tradeoffs",
            "Breadth-First Search (BFS) for unweighted shortest paths",
            "Depth-First Search (DFS) with cycle detection & back-edges",
            "Dijkstra's Algorithm with Min-Heap in O((V + E) log V)",
            "Topological Sort (Kahn's algorithm & DFS finish times)",
            "Disjoint Set Union (DSU) with Union by Rank & Path Compression",
        ],
        "description": "Vertices connected by edges modeling complex networks, shortest path finding, minimum spanning trees, and dependency resolution.",
        "sample_questions": [
            "Compare Dijkstra and Bellman-Ford algorithms. When must you use Bellman-Ford over Dijkstra?",
            "How does Union-Find achieve nearly O(1) amortized operations using Path Compression and Union by Rank?",
        ],
        "ciu_reference_url": "https://github.com/jwasham/coding-interview-university#graphs",
    },

    # Algorithms
    {
        "id": "sorting-algorithms",
        "name": "Sorting Algorithms",
        "domain": "Algorithms",
        "subdomain": "Sorting & Searching",
        "difficulty": "medium",
        "prerequisites": ["arrays-and-strings"],
        "skills": ["in-place sorting", "stable vs unstable", "comparison lower bound"],
        "key_concepts": [
            "Comparison lower bound: Omega(N log N)",
            "QuickSort (partitioning, pivot choice, worst-case O(N^2) avoidance)",
            "MergeSort (divide-and-conquer, stability, O(N) auxiliary space)",
            "HeapSort (in-place O(N log N), unstable)",
            "Linear non-comparison sorts: Counting Sort, Radix Sort",
        ],
        "description": "Foundational sorting paradigms, stability characteristics, comparison theoretical limits, and non-comparison linear optimizations.",
        "sample_questions": [
            "Why is MergeSort preferred over QuickSort for sorting linked lists, while QuickSort is often preferred for arrays?",
            "Prove why comparison-based sorting algorithms cannot beat O(N log N) in the worst case.",
        ],
        "ciu_reference_url": "https://github.com/jwasham/coding-interview-university#sorting",
    },
    {
        "id": "dynamic-programming",
        "name": "Dynamic Programming (DP)",
        "domain": "Algorithms",
        "subdomain": "Optimization",
        "difficulty": "hard",
        "prerequisites": ["recursion-and-backtracking", "arrays-and-strings"],
        "skills": ["overlapping subproblems", "optimal substructure", "state space reduction"],
        "key_concepts": [
            "Optimal substructure & Overlapping subproblems",
            "Top-down Memoization vs Bottom-up Tabulation",
            "1D DP (Fibonacci, House Robber)",
            "2D DP (0/1 Knapsack, Longest Common Subsequence, Edit Distance)",
            "Space optimization from O(N^2) to O(N) using rolling arrays",
        ],
        "description": "Mathematical optimization solving complex problems by decomposing them into subproblems and storing overlapping results.",
        "sample_questions": [
            "How do you determine if a problem can be solved using Dynamic Programming rather than a Greedy algorithm?",
            "Walk through the state transition relation and space optimization for the 0/1 Knapsack problem.",
        ],
        "ciu_reference_url": "https://github.com/jwasham/coding-interview-university#dynamic-programming",
    },

    # CS Fundamentals
    {
        "id": "operating-systems-concurrency",
        "name": "Operating Systems & Concurrency",
        "domain": "CS Fundamentals",
        "subdomain": "Systems",
        "difficulty": "hard",
        "prerequisites": ["programming-basics"],
        "skills": ["process vs thread", "synchronization primitives", "virtual memory"],
        "key_concepts": [
            "Process (PCB, address space) vs Thread (TCB, shared heap)",
            "Context switching overhead and CPU cache invalidation",
            "Race conditions, Mutexes, Semaphores, and Spinlocks",
            "Coffman's four conditions for Deadlock and Banker's Algorithm",
            "Virtual Memory: Paging, Page Faults, TLB, and LRU replacement",
        ],
        "description": "Core OS architectures, memory paging translation, process scheduling, synchronization barriers, and thread concurrency control.",
        "sample_questions": [
            "What are Coffman's four conditions for deadlock, and how does modern software architecture prevent at least one of them?",
            "Explain what happens at the hardware and OS kernel level when a thread experiences a page fault.",
        ],
        "ciu_reference_url": "https://github.com/jwasham/coding-interview-university#threads-processes",
    },
    {
        "id": "dbms-and-storage",
        "name": "Database Management & Storage Engines",
        "domain": "CS Fundamentals",
        "subdomain": "Databases",
        "difficulty": "hard",
        "prerequisites": ["hash-tables", "binary-search-trees"],
        "skills": ["ACID transactions", "indexing structures", "isolation levels"],
        "key_concepts": [
            "ACID properties (Atomicity, Consistency, Isolation, Durability)",
            "B-Tree / B+ Tree indexing mechanics and disk block alignment",
            "LSM-Trees (Log-Structured Merge-Tree) vs B+ Trees for write-heavy loads",
            "SQL Isolation Levels: Read Uncommitted, Read Committed, Repeatable Read, Serializable",
            "WAL (Write-Ahead Logging) and Crash Recovery",
        ],
        "description": "Relational and non-relational database internals, index page layouts, transaction isolation phenomena, and persistence guarantees.",
        "sample_questions": [
            "Why do databases use B+ Trees rather than standard Binary Search Trees or Hash Tables for disk storage indexes?",
            "Explain the Dirty Read, Non-Repeatable Read, and Phantom Read phenomena and which SQL isolation levels prevent them.",
        ],
        "ciu_reference_url": "https://github.com/jwasham/coding-interview-university#system-design-scalability-data-handling",
    },
    {
        "id": "computer-networking",
        "name": "Computer Networking & Protocols",
        "domain": "CS Fundamentals",
        "subdomain": "Networking",
        "difficulty": "medium",
        "prerequisites": ["programming-basics"],
        "skills": ["TCP vs UDP", "HTTP protocols", "TLS handshake"],
        "key_concepts": [
            "OSI 7-Layer model vs TCP/IP 4-layer stack",
            "TCP 3-way handshake (SYN, SYN-ACK, ACK) and 4-way termination",
            "TCP flow control & congestion control (Slow Start, AIMD)",
            "HTTP/1.1 vs HTTP/2 vs HTTP/3 (QUIC over UDP)",
            "TLS/SSL cryptographic handshake",
        ],
        "description": "Transport and application layer network protocols, packet loss retransmission, connection handshakes, and encryption layers.",
        "sample_questions": [
            "Describe the complete sequence of events when you type 'https://www.google.com' into a browser and press Enter.",
            "How does HTTP/2 multiplexing eliminate Head-of-Line blocking in HTTP/1.1, and why does HTTP/3 move to UDP?",
        ],
        "ciu_reference_url": "https://github.com/jwasham/coding-interview-university#networking",
    },

    # System Design
    {
        "id": "distributed-system-design",
        "name": "Large-Scale Distributed System Design",
        "domain": "System Design",
        "subdomain": "Distributed Architectures",
        "difficulty": "expert",
        "prerequisites": ["dbms-and-storage", "computer-networking", "operating-systems-concurrency"],
        "skills": ["high availability", "horizontal scalability", "eventual consistency"],
        "key_concepts": [
            "Horizontal vs Vertical Scaling and Stateless Application Tiers",
            "Load Balancing: Round Robin, Least Connections, Consistent Hashing",
            "Caching Strategies: Cache-Aside, Write-Through, Eviction (LRU/LFU)",
            "CAP Theorem and PACELC trade-offs",
            "Message Queues (Kafka / RabbitMQ) for asynchronous decoupling",
            "Resilience: Circuit Breakers, Bulkheads, Retries with Exponential Backoff",
        ],
        "description": "End-to-end architectures serving millions of requests per second, resilient fault isolation, distributed consensus, and horizontal scaling.",
        "sample_questions": [
            "Design a distributed rate limiter for a public API gateway handling 100,000 requests/second across multiple global regions.",
            "How does Consistent Hashing minimize key redistribution when nodes are added or removed from a caching cluster?",
        ],
        "ciu_reference_url": "https://github.com/jwasham/coding-interview-university#system-design-scalability-data-handling",
    },
]


class KnowledgeGraphService:
    def __init__(self) -> None:
        self.graph = CIU_KNOWLEDGE_GRAPH_PYTHON

    def get_all_topics(self) -> list[dict[str, Any]]:
        return self.graph

    def get_topic_by_id(self, topic_id: str) -> Optional[dict[str, Any]]:
        for topic in self.graph:
            if topic["id"] == topic_id:
                return topic
        return None

    def get_topics_by_domain(self, domain: str) -> list[dict[str, Any]]:
        return [t for t in self.graph if t["domain"].lower() == domain.lower()]

    def search_topics(self, query: str) -> list[dict[str, Any]]:
        q = query.lower().strip()
        if not q:
            return self.graph
        return [
            t for t in self.graph
            if q in t["name"].lower()
            or any(q in c.lower() for c in t["key_concepts"])
            or any(q in s.lower() for s in t["skills"])
            or q in t["description"].lower()
        ]
