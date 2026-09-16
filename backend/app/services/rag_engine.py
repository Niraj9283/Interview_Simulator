"""
RAG Engine with ChromaDB & PDF Extraction
Manages 3 specialized collections:
1. candidate_knowledge (Extracted resume projects, skills, achievements)
2. interview_knowledge (Behavioral, Technical, HR, System Design, DSA, Role-specific question banks)
3. technical_knowledge (Deep technical concepts, rubrics for Python, ML, DL, RAG, LLMs, SQL, etc.)
"""

import io
import json
import os
import re
import uuid
from pathlib import Path
from typing import Any

try:
    import chromadb
    from chromadb.config import Settings
    HAS_CHROMADB = True
except Exception:
    chromadb = None
    Settings = None
    HAS_CHROMADB = False

try:
    import pypdf
    HAS_PYPDF = True
except Exception:
    pypdf = None
    HAS_PYPDF = False


def _get_chroma_data_dir() -> Path:
    default_dir = Path(__file__).resolve().parents[2] / "data" / "chroma_db"
    try:
        default_dir.mkdir(parents=True, exist_ok=True)
        test_file = default_dir / ".write_test"
        test_file.touch()
        test_file.unlink()
        return default_dir
    except (OSError, PermissionError):
        tmp_dir = Path("/tmp/chroma_db")
        tmp_dir.mkdir(parents=True, exist_ok=True)
        return tmp_dir


class InMemoryCollection:
    """Lightweight in-memory vector/keyword collection for serverless environments."""
    def __init__(self, name: str, metadata: dict[str, Any] | None = None) -> None:
        self.name = name
        self.metadata = metadata or {}
        self.items: dict[str, dict[str, Any]] = {}

    def count(self) -> int:
        return len(self.items)

    def get(self) -> dict[str, list[Any]]:
        ids = list(self.items.keys())
        docs = [self.items[i]["document"] for i in ids]
        metas = [self.items[i]["metadata"] for i in ids]
        return {"ids": ids, "documents": docs, "metadatas": metas}

    def delete(self, ids: list[str]) -> None:
        for item_id in ids:
            self.items.pop(item_id, None)

    def add(self, ids: list[str], documents: list[str], metadatas: list[dict[str, Any]] | None = None) -> None:
        if metadatas is None:
            metadatas = [{}] * len(ids)
        for item_id, doc, meta in zip(ids, documents, metadatas):
            self.items[item_id] = {
                "id": item_id,
                "document": doc,
                "metadata": meta or {},
            }

    def query(self, query_texts: list[str], n_results: int = 3) -> dict[str, list[list[Any]]]:
        if not self.items or not query_texts:
            return {"ids": [[]], "documents": [[]], "metadatas": [[]], "distances": [[]]}

        query_text = query_texts[0].lower()
        q_tokens = set(re.findall(r"\w+", query_text))

        scored: list[tuple[float, str, str, dict[str, Any]]] = []
        for item_id, item in self.items.items():
            doc = item["document"]
            doc_lower = doc.lower()
            doc_tokens = set(re.findall(r"\w+", doc_lower))
            overlap = len(q_tokens & doc_tokens)
            meta_str = " ".join(str(v).lower() for v in item["metadata"].values())
            meta_tokens = set(re.findall(r"\w+", meta_str))
            overlap += len(q_tokens & meta_tokens) * 2

            score = 1.0 - (overlap / (max(len(q_tokens), 1) + 2))
            scored.append((max(score, 0.05), item_id, doc, item["metadata"]))

        scored.sort(key=lambda x: x[0])
        top = scored[:n_results]

        return {
            "ids": [[x[1] for x in top]],
            "documents": [[x[2] for x in top]],
            "metadatas": [[x[3] for x in top]],
            "distances": [[x[0] for x in top]],
        }


class RAGEngine:
    def __init__(self) -> None:
        self.candidate_collection: Any = None
        self.interview_collection: Any = None
        self.technical_collection: Any = None

        if HAS_CHROMADB and chromadb is not None:
            try:
                chroma_dir = _get_chroma_data_dir()
                self.client = chromadb.PersistentClient(
                    path=str(chroma_dir),
                    settings=Settings(anonymized_telemetry=False, allow_reset=True),
                )
                self.candidate_collection = self.client.get_or_create_collection(
                    name="candidate_knowledge",
                    metadata={"description": "Candidate resume chunks, projects, skills, and experience"},
                )
                self.interview_collection = self.client.get_or_create_collection(
                    name="interview_knowledge",
                    metadata={"description": "Interview question bank across behavioral, system design, DSA, and HR"},
                )
                self.technical_collection = self.client.get_or_create_collection(
                    name="technical_knowledge",
                    metadata={"description": "Deep technical knowledge rubrics for Python, ML, DL, RAG, LLMs, SQL"},
                )
            except Exception as err:
                print(f"[RAGEngine] ChromaDB initialization failed ({err}), falling back to in-memory collections.")

        if self.candidate_collection is None:
            self.candidate_collection = InMemoryCollection("candidate_knowledge")
            self.interview_collection = InMemoryCollection("interview_knowledge")
            self.technical_collection = InMemoryCollection("technical_knowledge")

        # Pre-seed default collections if empty
        self._ensure_seeded()

    def _ensure_seeded(self) -> None:
        if self.interview_collection.count() == 0:
            self._seed_interview_knowledge()
        if self.technical_collection.count() == 0:
            self._seed_technical_knowledge()

    def get_status(self) -> dict[str, Any]:
        return {
            "status": "ready",
            "collections": {
                "candidate_knowledge": {
                    "count": self.candidate_collection.count(),
                    "description": "Candidate resume chunks, projects, skills, and experience",
                },
                "interview_knowledge": {
                    "count": self.interview_collection.count(),
                    "description": "Interview question bank across behavioral, system design, DSA, and HR",
                },
                "technical_knowledge": {
                    "count": self.technical_collection.count(),
                    "description": "Deep technical knowledge rubrics for Python, ML, DL, RAG, LLMs, SQL",
                },
            },
        }

    def extract_text_from_pdf(self, pdf_bytes: bytes) -> str:
        """Extract text from uploaded PDF resume."""
        if not HAS_PYPDF or pypdf is None:
            try:
                return pdf_bytes.decode("utf-8", errors="ignore")
            except Exception:
                return ""
        try:
            reader = pypdf.PdfReader(io.BytesIO(pdf_bytes))
            extracted_pages = []
            for i, page in enumerate(reader.pages):
                text = page.extract_text()
                if text:
                    extracted_pages.append(text)
            return "\n\n".join(extracted_pages)
        except Exception:
            return ""

    def extract_text_from_docx(self, docx_bytes: bytes) -> str:
        """Extract text from uploaded DOCX resume using zipfile & XML."""
        try:
            import zipfile
            import xml.etree.ElementTree as ET
            with zipfile.ZipFile(io.BytesIO(docx_bytes)) as z:
                if "word/document.xml" not in z.namelist():
                    return ""
                xml_content = z.read("word/document.xml")
                root = ET.fromstring(xml_content)
                ns = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
                paragraphs = []
                for p in root.iter(f"{{{ns['w']}}}p"):
                    texts = [node.text for node in p.iter(f"{{{ns['w']}}}t") if node.text]
                    if texts:
                        paragraphs.append("".join(texts))
                return "\n\n".join([p.strip() for p in paragraphs if p.strip()])
        except Exception as err:
            return ""

    def parse_and_chunk_resume(self, resume_text: str, candidate_name: str = "Candidate") -> list[dict[str, Any]]:
        """
        Parses resume text into structured domain chunks:
        Projects, Skills, Experience, Education, and Summary.
        """
        chunks: list[dict[str, Any]] = []
        lines = resume_text.splitlines()

        current_category = "summary"
        current_buffer: list[str] = []

        section_headers = {
            "project": ["projects", "personal projects", "key projects", "academic projects"],
            "skill": ["skills", "technical skills", "technologies", "core competencies", "tools"],
            "experience": ["experience", "work experience", "employment", "professional experience", "internships"],
            "education": ["education", "academic background", "certifications", "degrees"],
        }

        def flush_buffer():
            nonlocal current_buffer, current_category
            content = " ".join(current_buffer).strip()
            if len(content) > 30:
                # Extract key entities/skills from content
                skills_found = self._extract_skills_from_text(content)
                chunks.append({
                    "id": f"resume_{uuid.uuid4().hex[:8]}",
                    "text": content,
                    "metadata": {
                        "category": current_category,
                        "candidate_name": candidate_name,
                        "skills": ", ".join(skills_found),
                        "char_count": len(content),
                    },
                })
            current_buffer = []

        for line in lines:
            trimmed = line.strip()
            if not trimmed:
                continue

            lower_line = trimmed.lower().strip(":#=- ")
            matched_category = None
            for cat, headers in section_headers.items():
                if any(lower_line == h or lower_line.startswith(f"{h}:") for h in headers):
                    matched_category = cat
                    break

            if matched_category:
                flush_buffer()
                current_category = matched_category
            else:
                current_buffer.append(trimmed)

        flush_buffer()

        # If no sections could be detected, fallback to paragraph chunking
        if not chunks:
            paragraphs = [p.strip() for p in resume_text.split("\n\n") if len(p.strip()) > 30]
            for p in paragraphs:
                skills_found = self._extract_skills_from_text(p)
                chunks.append({
                    "id": f"resume_{uuid.uuid4().hex[:8]}",
                    "text": p,
                    "metadata": {
                        "category": "general",
                        "candidate_name": candidate_name,
                        "skills": ", ".join(skills_found),
                        "char_count": len(p),
                    },
                })

        return chunks

    def _extract_skills_from_text(self, text: str) -> list[str]:
        known_skills = [
            "python", "random forest", "shap", "machine learning", "deep learning", "rag",
            "llms", "sql", "pytorch", "tensorflow", "fastapi", "react", "next.js", "docker",
            "kubernetes", "aws", "gcp", "scikit-learn", "xgboost", "nlp", "transformers",
            "redis", "postgresql", "kafka", "pandas", "numpy", "opencv", "mediapipe"
        ]
        text_lower = text.lower()
        return [skill.title() for skill in known_skills if skill in text_lower]

    def index_resume(self, resume_text: str, candidate_name: str = "Candidate", clear_previous: bool = True) -> int:
        """Indexes parsed resume chunks into candidate_knowledge Chroma collection."""
        if clear_previous:
            # Delete old entries
            existing = self.candidate_collection.get()
            if existing and existing["ids"]:
                self.candidate_collection.delete(ids=existing["ids"])

        chunks = self.parse_and_chunk_resume(resume_text, candidate_name)
        if not chunks:
            return 0

        self.candidate_collection.add(
            ids=[c["id"] for c in chunks],
            documents=[c["text"] for c in chunks],
            metadatas=[c["metadata"] for c in chunks],
        )
        return len(chunks)

    def query_collection(self, collection_name: str, query: str, n_results: int = 3) -> list[dict[str, Any]]:
        """Queries a specific collection and returns matches with metadata."""
        if collection_name == "candidate_knowledge":
            target = self.candidate_collection
        elif collection_name == "interview_knowledge":
            target = self.interview_collection
        elif collection_name == "technical_knowledge":
            target = self.technical_collection
        else:
            raise ValueError(f"Unknown collection: {collection_name}")

        count = target.count()
        if count == 0:
            return []

        limit = min(n_results, count)
        results = target.query(query_texts=[query], n_results=limit)

        formatted = []
        if results and results["documents"]:
            docs = results["documents"][0]
            metas = results["metadatas"][0] if results["metadatas"] else [{}] * len(docs)
            ids = results["ids"][0] if results["ids"] else [""] * len(docs)
            distances = results["distances"][0] if results["distances"] is not None else [0.0] * len(docs)

            for doc, meta, doc_id, dist in zip(docs, metas, ids, distances):
                formatted.append({
                    "id": doc_id,
                    "document": doc,
                    "metadata": meta,
                    "score": round(1.0 - (dist if dist <= 1.0 else dist / 2.0), 3),
                })
        return formatted

    def retrieve_grounded_context(self, role: str, track: str, current_query: str) -> dict[str, Any]:
        """
        Multi-collection RAG lookup:
        Gathers candidate projects + domain interview rubrics + deep technical knowledge
        to construct a hyper-personalized, grounded interview context.
        """
        candidate_matches = self.query_collection("candidate_knowledge", f"{role} {track} {current_query}", n_results=2)
        interview_matches = self.query_collection("interview_knowledge", f"{track} {role} question", n_results=2)
        technical_matches = self.query_collection("technical_knowledge", f"{role} {track} {current_query}", n_results=2)

        return {
            "candidate_knowledge": candidate_matches,
            "interview_knowledge": interview_matches,
            "technical_knowledge": technical_matches,
            "grounding_summary": {
                "projects_found": [m["metadata"].get("skills") for m in candidate_matches if "skills" in m.get("metadata", {})],
                "matched_topics": [m["metadata"].get("topic") for m in technical_matches if "topic" in m.get("metadata", {})],
            },
        }

    def diagnose_weak_area(
        self,
        question: str,
        answer: str,
        keywords: list[str] | None = None,
    ) -> tuple[str | None, list[str], int, str]:
        """
        Evaluates the technical depth of an answer, detects conceptual gaps/weaknesses,
        and retrieves relevant foundational concepts from the technical vector knowledge base.
        Returns: (weak_area, retrieved_concepts, depth_score, adaptive_strategy)
        """
        norm_q = question.lower()
        norm_a = answer.lower()
        words = re.findall(r"[a-z0-9+#.-]+", norm_a)
        word_count = len(words)

        # 1. Domain Concept Knowledge Base Mapping
        concept_catalog = [
            {
                "topic_id": "random_forest_selection",
                "triggers": ["random forest", "decision tree", "ensemble", "bagging", "thyroid", "prediction", "classifier"],
                "depth_signals": ["variance", "bias", "overfit", "bagging", "bootstrap", "subsampling", "features", "decorrelat", "gini", "depth", "split", "impurity", "trees"],
                "weak_area": "Random Forest Model Selection & Overfitting Mitigation",
                "concepts": ["Random Forest", "Decision Trees", "Bagging", "Feature Importance", "Overfitting", "Variance Reduction"],
                "probing_question": "How does Random Forest reduce overfitting compared with a single decision tree?",
                "advanced_question": "How do you calibrate the max_features parameter and tree depth in Random Forest to optimize the bias-variance tradeoff on noisy data?",
            },
            {
                "topic_id": "class_imbalance",
                "triggers": ["imbalance", "skew", "smote", "focal loss", "precision", "recall", "rare", "fraud", "anomaly", "intrusion", "attack"],
                "depth_signals": ["smote", "focal loss", "pr-auc", "roc-auc", "recall", "precision", "resampling", "cost-sensitive", "threshold", "f1", "stratified"],
                "weak_area": "Class Imbalance Handling & Metric Selection",
                "concepts": ["Class Imbalance", "SMOTE", "Focal Loss", "PR-AUC", "Stratified Sampling", "Cost-Sensitive Learning"],
                "probing_question": "In extreme class imbalance, why is standard classification accuracy misleading, and how would you compare SMOTE versus adjusting the classification decision threshold or using Focal Loss?",
                "advanced_question": "When using SMOTE with high-dimensional noisy data, how do you prevent synthetic samples from bridging decision boundaries and introducing label noise?",
            },
            {
                "topic_id": "shap_interpretability",
                "triggers": ["shap", "shapley", "explain", "interpret", "black box", "xai", "importance", "feature attribution"],
                "depth_signals": ["shapley", "game theory", "coalition", "local", "global", "marginal", "treeshap", "attribution", "efficiency", "additivity"],
                "weak_area": "Model Explainability & SHAP Values",
                "concepts": ["SHAP", "Shapley Values", "Feature Attributions", "Local Interpretability", "TreeSHAP"],
                "probing_question": "How does SHAP compute feature attributions based on game theory, and how does it provide both local and global interpretability compared to default Gini importance?",
                "advanced_question": "How does the TreeSHAP algorithm reduce the exponential computational complexity of exact Shapley value estimation to polynomial time?",
            },
            {
                "topic_id": "rag_vector_search",
                "triggers": ["rag", "vector", "chroma", "embedding", "retrieval", "chunking", "semantic", "llm"],
                "depth_signals": ["embedding", "cosine", "similarity", "chunk", "overlap", "rerank", "dense", "sparse", "hallucination", "context window", "hybrid search"],
                "weak_area": "RAG Retrieval Architecture & Vector Chunking",
                "concepts": ["Vector Embeddings", "Cosine Distance", "Semantic Chunking", "Reranking", "Hallucination Reduction"],
                "probing_question": "How do chunk size and semantic boundary overlap affect retrieval accuracy in RAG, and how do you prevent lost-in-the-middle context degradation?",
                "advanced_question": "How would you implement a hybrid search (Dense Vector + BM25 Sparse) with Reciprocal Rank Fusion (RRF) and cross-encoder re-ranking?",
            },
            {
                "topic_id": "python_gil_concurrency",
                "triggers": ["gil", "concurrency", "multiprocessing", "asyncio", "threading", "generator", "yield", "python"],
                "depth_signals": ["gil", "bytecode", "interpreter lock", "cpu-bound", "i/o-bound", "event loop", "memory", "lazy", "iterator", "process pool"],
                "weak_area": "Python GIL & Concurrency Paradigms",
                "concepts": ["GIL", "Multiprocessing vs Asyncio", "Generators", "Memory Footprint", "Event Loop"],
                "probing_question": "Why does multi-threading in Python fail to speed up CPU-bound ML tasks, and when should you use multiprocessing versus asyncio?",
                "advanced_question": "How do Python memory allocators (PyMalloc) and reference counting garbage collection interact with sub-interpreters (PEP 684)?",
            },
            {
                "topic_id": "system_design_kafka",
                "triggers": ["system design", "kafka", "streaming", "throughput", "scalable", "pipeline", "queue", "architecture"],
                "depth_signals": ["partition", "backpressure", "consumer group", "idempotent", "at-least-once", "offset", "replication", "sharding", "cache"],
                "weak_area": "Streaming Systems & Backpressure Architecture",
                "concepts": ["Kafka Partitioning", "Backpressure", "Consumer Groups", "Idempotency", "Database Sharding"],
                "probing_question": "When designing a real-time ingestion pipeline handling 50k events/sec, how do Kafka partitions and consumer group offsets prevent data loss and backpressure bottlenecks?",
                "advanced_question": "How would you ensure end-to-end exactly-once processing (EOS) semantics across a distributed streaming architecture during node failures?",
            },
        ]

        # 2. Match relevant topic based on question + candidate keywords + answer
        matched_catalog = None
        for item in concept_catalog:
            if any(t in norm_q for t in item["triggers"]):
                matched_catalog = item
                break

        if not matched_catalog and keywords:
            kw_str = " ".join(keywords).lower()
            for item in concept_catalog:
                if any(t in kw_str for t in item["triggers"]):
                    matched_catalog = item
                    break

        if not matched_catalog:
            # General Technical Evaluation Fallback
            matched_catalog = {
                "topic_id": "general_engineering",
                "triggers": [],
                "depth_signals": ["tradeoff", "complexity", "scalability", "latency", "bottleneck", "architecture", "optimization", "monitoring"],
                "weak_area": "Technical Architecture & Tradeoff Analysis",
                "concepts": ["Tradeoff Analysis", "System Scalability", "Performance Optimization", "Failure Recovery"],
                "probing_question": "Can you elaborate on the specific architectural tradeoffs and failure modes you considered in this approach?",
                "advanced_question": "How would you measure the performance impact and reliability of this solution under 10x production load?",
            }

        # 3. Calculate Technical Depth Score
        depth_hits = sum(1 for sig in matched_catalog["depth_signals"] if sig in norm_a)
        has_causality = any(w in norm_a for w in ["because", "since", "due to", "resulted in", "therefore", "tradeoff", "reduces", "improves", "mitigates"])

        base_depth = 40
        if word_count > 30:
            base_depth += 10
        if word_count > 70:
            base_depth += 15
        base_depth += depth_hits * 10
        if has_causality:
            base_depth += 10

        depth_score = max(20, min(95, base_depth))

        # 4. Decide Adaptive Strategy & Query Vector DB
        is_strong_answer = (depth_hits >= 2 and depth_score >= 68) or (depth_score >= 70 and has_causality) or depth_score >= 75
        if not is_strong_answer:
            weak_area = matched_catalog["weak_area"]
            retrieved_concepts = matched_catalog["concepts"]
            adaptive_strategy = "Probing Weak Area via RAG Retrieval"
        else:
            weak_area = None
            retrieved_concepts = matched_catalog["concepts"]
            adaptive_strategy = "Deepening Complexity / Advanced Tradeoffs"

        return weak_area, retrieved_concepts, depth_score, adaptive_strategy

    def retrieve_concepts_for_weak_area(self, weak_area: str, n_results: int = 4) -> list[dict[str, Any]]:
        """Retrieves technical rubrics and concepts for a detected weak area from ChromaDB."""
        return self.query_collection("technical_knowledge", weak_area, n_results=n_results)

    def get_status(self) -> dict[str, Any]:
        return {
            "status": "ready",
            "collections": {
                "candidate_knowledge": {
                    "count": self.candidate_collection.count(),
                    "description": "Resume sections, projects, and skills",
                },
                "interview_knowledge": {
                    "count": self.interview_collection.count(),
                    "description": "Behavioral, system design, DSA, and HR question bank",
                },
                "technical_knowledge": {
                    "count": self.technical_collection.count(),
                    "description": "Technical rubrics: Python, ML, DL, RAG, LLMs, SQL",
                },
            },
        }

    def _seed_interview_knowledge(self) -> None:
        """Seed default comprehensive interview knowledge collection."""
        items = [
            # Behavioral
            {
                "id": "ik_beh_1",
                "text": "Tell me about a high-stakes project where you had to navigate ambiguous requirements and deliver under a tight deadline. How did you prioritize tradeoffs?",
                "metadata": {"track": "Behavioral", "type": "Leadership", "framework": "STAR", "difficulty": "Senior"},
            },
            {
                "id": "ik_beh_2",
                "text": "Describe a time when you disagreed with a senior engineer or product manager on a technical architecture decision. How did you build consensus?",
                "metadata": {"track": "Behavioral", "type": "Conflict Resolution", "framework": "STAR", "difficulty": "Standard"},
            },
            # HR
            {
                "id": "ik_hr_1",
                "text": "What motivates you when working on complex systems, and how do you structure your continuous learning in rapidly evolving domains like AI/ML?",
                "metadata": {"track": "HR", "type": "Culture & Growth", "framework": "Motivation", "difficulty": "Warmup"},
            },
            # System Design
            {
                "id": "ik_sys_1",
                "text": "Design a real-time log ingestion and anomaly detection pipeline handling 50,000 events/second. Detail your ingestion, buffering (Kafka/Kinesis), streaming analytics, and alerting tradeoffs.",
                "metadata": {"track": "System Design", "type": "Distributed Systems", "topic": "Scalability & Queuing", "difficulty": "Senior"},
            },
            {
                "id": "ik_sys_2",
                "text": "How would you design a low-latency vector search service for millions of document embeddings with sub-50ms p99 latency and high availability?",
                "metadata": {"track": "System Design", "type": "Vector DB & Search", "topic": "RAG Architecture", "difficulty": "Senior"},
            },
            # DSA
            {
                "id": "ik_dsa_1",
                "text": "Given a streaming sequence of network packet timestamps and frequencies, how would you design a sliding-window algorithm to detect heavy hitters in O(1) space and O(1) update time?",
                "metadata": {"track": "DSA", "type": "Streaming Algorithms", "topic": "Sliding Window / Hash", "difficulty": "Senior"},
            },
            {
                "id": "ik_dsa_2",
                "text": "Explain how you would implement LRU Cache with O(1) get and put operations, detailing memory management and concurrency safety.",
                "metadata": {"track": "DSA", "type": "Data Structures", "topic": "Doubly Linked List + HashMap", "difficulty": "Standard"},
            },
            # Role Specific - ML / AI
            {
                "id": "ik_role_ml_1",
                "text": "In a Network Intrusion Detection model, how do you handle severe class imbalance (e.g., attacks represent <0.1% of traffic)? Explain the tradeoffs between SMOTE, Focal Loss, and Precision-Recall threshold tuning.",
                "metadata": {"track": "Role Specific", "role": "Machine Learning Engineer", "topic": "Class Imbalance", "difficulty": "Senior"},
            },
            {
                "id": "ik_role_fs_1",
                "text": "How do you optimize initial render performance and Web Vitals in a Next.js full-stack app with heavy client-side ML models (like MediaPipe WASM)?",
                "metadata": {"track": "Role Specific", "role": "Full Stack Engineer", "topic": "Frontend Optimization", "difficulty": "Senior"},
            },
        ]

        self.interview_collection.add(
            ids=[item["id"] for item in items],
            documents=[item["text"] for item in items],
            metadatas=[item["metadata"] for item in items],
        )

    def _seed_technical_knowledge(self) -> None:
        """Seed technical knowledge rubrics for Python, ML, DL, RAG, LLMs, SQL."""
        items = [
            # Python
            {
                "id": "tk_py_1",
                "text": "Python GIL (Global Interpreter Lock): Prevents multiple native threads from executing Python bytecodes simultaneously. Mitigated via multiprocessing, C-extensions (Cython/PyBind), or asyncio for I/O bound tasks.",
                "metadata": {"topic": "Python", "concept": "GIL & Concurrency", "category": "Language Core"},
            },
            {
                "id": "tk_py_2",
                "text": "Python Generators and Memory: Using yield produces an iterator that evaluates lazily, reducing memory footprint from O(N) to O(1) when streaming massive datasets or logs.",
                "metadata": {"topic": "Python", "concept": "Generators & Iterators", "category": "Memory Management"},
            },
            # Machine Learning
            {
                "id": "tk_ml_1",
                "text": "Random Forest & Ensemble Methods: Bagging ensemble of decision trees with feature subsampling. Reduces variance without increasing bias. Robust against overfitting. Feature importance computed via Gini impurity decrease or Permutation Importance.",
                "metadata": {"topic": "Machine Learning", "concept": "Random Forest & Bagging", "category": "Ensemble Models"},
            },
            {
                "id": "tk_ml_2",
                "text": "SHAP (SHapley Additive exPlanations): Game-theoretic approach to explain individual predictions by computing Shapley values across all feature coalitions. Guarantees local accuracy and consistency.",
                "metadata": {"topic": "Machine Learning", "concept": "SHAP & Model Interpretability", "category": "XAI"},
            },
            # Deep Learning
            {
                "id": "tk_dl_1",
                "text": "Transformer Attention: Multi-head scaled dot-product attention computes Attention(Q,K,V) = softmax(Q K^T / sqrt(d_k)) V. Enables parallel sequence processing with global context.",
                "metadata": {"topic": "Deep Learning", "concept": "Attention Mechanism", "category": "Neural Architectures"},
            },
            # RAG & LLMs
            {
                "id": "tk_rag_1",
                "text": "RAG (Retrieval-Augmented Generation): Combines external vector knowledge retrieval (Chroma, FAISS, Pinecone) with generative LLMs. Chunks documents, computes dense embeddings, performs cosine/L2 nearest-neighbor search, and injects context into prompts to eliminate hallucinations.",
                "metadata": {"topic": "RAG", "concept": "Vector Embeddings & Semantic Search", "category": "LLM Architecture"},
            },
            {
                "id": "tk_rag_2",
                "text": "Chunking Strategies in RAG: Fixed-size with overlap (e.g. 500 tokens, 50 overlap), semantic boundary chunking, or hierarchical document parsing to preserve local context and semantic cohesion.",
                "metadata": {"topic": "RAG", "concept": "Chunking & Preprocessing", "category": "Knowledge Engineering"},
            },
            # SQL & Databases
            {
                "id": "tk_sql_1",
                "text": "SQL Indexing & Execution Plans: B-Tree and Hash indexes speed up lookups from O(N) to O(log N). Composite indexes must satisfy leftmost prefix rule. EXPLAIN ANALYZE checks index scans vs sequential scans.",
                "metadata": {"topic": "SQL", "concept": "B-Tree Indexes & Query Optimization", "category": "Databases"},
            },
        ]

        self.technical_collection.add(
            ids=[item["id"] for item in items],
            documents=[item["text"] for item in items],
            metadatas=[item["metadata"] for item in items],
        )
