# MockMate AI — Adaptive AI Interview & Career Preparation Platform

An AI-powered multimodal interview simulator that analyzes a candidate's resume, maps their skills against a structured Coding Interview University (CIU) computer science knowledge graph, conducts adaptive technical, coding, system design, and behavioral interviews, evaluates answers across 6 independent evaluators, analyzes optional speech and camera signals, identifies knowledge gaps, and generates a personalized 7-day preparation roadmap.

---

## 🌟 Core Architecture & 20 Capabilities

### 1. CIU Knowledge Graph Intelligence Layer
- **Structured CS Curriculum**: Hierarchical knowledge graph inspired by Coding Interview University covering **Data Structures**, **Algorithms**, **CS Fundamentals (OS, DBMS, Networking)**, **Software Engineering (OOP, Design Patterns, Testing)**, and **System Design**.
- **Topic Metadata & Prerequisite Chains**: Each topic includes prerequisites, core competencies, key evaluation concepts, adaptive question banks, and direct CIU reference links.

### 2. Resume → Skill Graph
- Parses resume text/PDF and maps extracted skills against the CIU knowledge domains.
- Automatically computes verified competencies and highlights critical knowledge gaps (e.g. `Python 90%`, `React 72%`, `DSA 25% [Gap]`, `System Design 20% [Gap]`).
- Prioritizes interview probing on detected gap areas.

### 3. Real Adaptive Interviewing & Dynamic Difficulty
- **Adaptive Closed-Loop**: Question → Answer → Evaluation → Competency Assessment → Targeted Follow-up.
- **Difficulty Engine**: Four dynamic tiers (`Easy`, `Medium`, `Hard`, `Expert`) calibrated from:
  $$\text{difficulty}_{\text{next}} = \text{candidate\_skill} + \text{previous\_answer\_score} + \text{question\_complexity} + \text{consistency}$$

### 4. 6-Aspect Intelligent Multi-Evaluator
Independent evaluation across 6 specialized evaluators:
- **Technical Accuracy (35%)**: Factual precision, algorithmic invariants, and mechanism depth.
- **Problem Solving & Depth (20%)**: Decomposition, edge cases, and trade-off analysis.
- **Prompt Relevance (15%)**: Directness in addressing the prompt.
- **Communication (10%)**: Pacing, articulation, and elimination of filler words.
- **Structure & Flow (10%)**: STAR framework and logical narrative structure.
- **Confidence & Delivery (10%)**: Vocal steadiness and asserted conviction.

### 5. Explain Every Score & Confidence Calibration
- **Explain Every Score**: Itemizes what was explained correctly (`✓`), what was missed (`⚠`), and provides actionable study recommendations.
- **Confidence Calibration Engine**: Diagnoses `Well-Calibrated`, `Overconfident` (high confidence but low technical depth), or `Underconfident` (strong technical knowledge with hesitant delivery), delivering tailored coaching cues.

### 6. Defensible Multimodal Signals
- **Camera Engagement**: High / Medium / Low classification, face visibility %, camera-facing gaze %, head orientation (Good / Slight Turn / Looking Away), and gaze break tracking.
- **Voice & Speech Analytics**: Speaking rate (WPM), pause count and duration, volume consistency, and filler word detection.
- **Microphone Answer Mode**: Optional mic input with live transcript editing before submission.

### 7. DSA Coding & System Design Arenas
- **Live DSA Editor**: Problem statements, multi-language code editor, test case runner (pass/fail), and time/space complexity evaluation.
- **System Design Whiteboard**: Interactive topology builder with components (Client, Load Balancer, Cache, Database, Message Queue) and automated architecture evaluation.

### 8. 7 Interview Modes & Company-Specific Simulations
- **7 Modes**: `Technical Interview`, `DSA Coding`, `System Design`, `Resume Interview`, `ML Interview`, `GenAI Interview`, `HR Interview`.
- **Target Companies**: `Google`, `Amazon` (16 Leadership Principles), `Microsoft`, `Infosys`, `TCS`, `Accenture`, `Fast-Paced Startup`, `Custom Company`.
- **Experience Tiers**: `Fresher`, `0–2 years`, `2–5 years`, `5+ years`.

### 9. 7-Day Improvement Plan & Interview Readiness Dashboard
- **Personal Weakness Engine**: Auto-generates a day-by-day 7-day study curriculum tailored to identified gaps.
- **Readiness Progress Dashboard**: Computes overall Readiness Index (e.g. `74 / 100`) across DSA, DBMS, OS, Networking, System Design, and Communication with delta tracking across sessions.
- **Persistent Session History**: Stores past attempts, transcripts, scores, and improvement trajectories in local and backend persistence.

---

## 🚀 Quickstart

### Prerequisites
- Node.js 18+
- Python 3.10+

### 1. Run Frontend (Next.js)

```bash
npm install
npm run dev
```

Open `http://localhost:3000` in your browser.

### 2. Run Backend (FastAPI + ChromaDB)

```bash
cd backend
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On Linux/macOS:
source .venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Health check:
```bash
curl http://localhost:8000/health
```

### 3. Run with Docker Compose

```bash
docker compose up --build
```
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:8000`
- ChromaDB: `http://localhost:8001`
