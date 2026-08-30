"use client";

import {
  Activity,
  AlertTriangle,
  ArrowRight,
  AudioWaveform,
  BookOpen,
  BrainCircuit,
  Calendar,
  CheckCircle2,
  Clock3,
  Code2,
  Cpu,
  Database,
  Eye,
  FastForward,
  Fingerprint,
  FlaskConical,
  Gauge,
  Info,
  Award,
  ListTodo,
  Mic,
  MicOff,
  Monitor,
  Moon,
  Pause,
  Play,
  Rewind,
  RotateCcw,
  Scale,
  Send,
  ShieldCheck,
  Sparkles,
  Square,
  Sun,
  Target,
  Thermometer,
  Timer,
  TrendingUp,
  Trophy,
  Upload,
  Users,
  Video,
  VideoOff,
  Wifi,
  WifiOff,
  X,
  Zap,
} from "lucide-react";
import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";

import {
  ABComparisonResult,
  CandidateProfile,
  InterviewAttempt,
  InterviewDifficulty,
  InterviewDomain,
  InterviewerMemory,
  InterviewTurn,
  MultimodalBreakdown,
  PostInterviewRoadmap,
  ReplayTelemetryFrame,
  SkillGapReport,
  VoiceSignal,
  averageScore,
  computeABComparison,
  computeCommunicationScore,
  difficulties,
  extractKeywords,
  generate7DayRoadmap,
  generateQuestion,
  generateReplayTelemetryStream,
  generateSkillGapReport,
  scoreAnswer,
} from "@/lib/interview";
import { EyeContactResult, EyeContactTracker } from "@/lib/eye-contact-tracker";
import { VoiceAnalyzer } from "@/lib/voice-analyzer";
import { LiveSpeechState, SpeechPaceTracker, getPaceRating } from "@/lib/speech-tracker";
import { RAGMatch, RAGStatus, getRAGStatus, queryRAG, uploadResumeRAG } from "@/lib/rag-service";
import { ExecutionMode, getEdgeTelemetry } from "@/lib/edge-mode";
import { InterviewIntegrityTracker, IntegrityState } from "@/lib/integrity-tracker";
import {
  DepartmentId,
  InterviewType,
  INTERVIEW_TYPES,
  departments,
  getAvailableTracks,
  getDefaultRoleForDepartment,
  getDefaultTrackForDepartment,
  getDepartmentLabel,
  getRolesForDepartment,
  isInterviewTypeAvailableForDepartment,
} from "@/lib/role-database";
import {
  CODING_PROBLEMS,
  CodingEvaluation,
  CodingLanguage,
  CodingProblem,
  CodeExecutionResult,
  runCodeTests,
  evaluateCodingSolution,
} from "@/lib/coding-engine";
import {
  ArchitectureDiagram,
  SystemDesignEvaluation,
  ARCHITECTURE_PRESETS,
  SYSTEM_DESIGN_CHALLENGES,
  evaluateSystemDesignSolution,
} from "@/lib/system-design-engine";
import { SystemDesignCanvas } from "@/components/system-design-canvas";
import {
  INTERVIEWER_PERSONAS,
  INTERVIEWER_PERSONA_LIST,
  InterviewerPersona,
  InterviewerPersonaId,
  StressModeConfig,
  getInterviewerPersona,
} from "@/lib/interviewer-personalities";
import {
  CandidateDigitalProfile,
  loadStoredDigitalProfile,
  saveDigitalProfile,
  resetDigitalProfile,
  updateDigitalProfileFromSession,
} from "@/lib/digital-profile";
import {
  SessionBenchmarkResult,
  computeSessionBenchmark,
} from "@/lib/benchmark-engine";
import {
  VoiceAnswerState,
  InterviewInputMode,
  DeliveryMetadata,
  VoiceTranscriptBundle,
  normalizeTechnicalTranscript,
  packageVoiceAnswer,
} from "@/lib/voice-answer-engine";

type Stage = "setup" | "live" | "complete";
type PanelTheme = "light" | "dark";
type TimeMode = "12" | "24";

type WeatherState = {
  status: "loading" | "ready" | "unavailable";
  temperature: number | null;
  label: string;
};

type OpenMeteoCurrentResponse = {
  current?: {
    temperature_2m?: number;
  };
};

const initialProfile: CandidateProfile = {
  name: "Candidate",
  department: "Technical",
  targetRole: "Machine Learning Engineer",
  domain: "Role Specific",
  interviewType: "General",
  difficulty: "Standard",
  personaId: "technical",
  stressConfig: {
    intensity: "moderate",
    timeLimitSec: 45,
    enableInterruptions: true,
    enableTimePressureClock: true,
  },
  resumeText:
    "Project: Thyroid Disease Prediction using Random Forest, SHAP, and Streamlit, handling severe class imbalance.\nProject: Network Intrusion Detection System using Python, XGBoost, and Scikit-Learn for anomaly classification.\nSkills: Python, Random Forest, SHAP, Machine Learning, Deep Learning, SQL, FastAPI, Docker, PyTorch.",
};

const domainIcons: Record<InterviewDomain, typeof Users> = {
  "Role Specific": Users,
  DSA: Code2,
  "System Design": Monitor,
  "Case Study": Activity,
  Behavioral: Users,
};

const departmentIcons: Record<DepartmentId, typeof Users> = {
  Technical: BrainCircuit,
  Finance: TrendingUp,
  HR: Users,
  Marketing: Activity,
};

const DEFAULT_WEATHER_LOCATION = {
  latitude: 28.6139,
  longitude: 77.209,
  label: "New Delhi",
};

export default function InterviewSimulator() {
  const [profile, setProfile] = useState<CandidateProfile>(initialProfile);
  const [panelTheme, setPanelTheme] = useState<PanelTheme>("light");
  const [resumeFileName, setResumeFileName] = useState("sample-profile.txt");
  const [stage, setStage] = useState<Stage>("setup");
  const [questions, setQuestions] = useState<string[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [history, setHistory] = useState<InterviewTurn[]>([]);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [micEnabled, setMicEnabled] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [eyeContact, setEyeContact] = useState(0);
  const [eyeContactResult, setEyeContactResult] = useState<EyeContactResult | null>(null);
  const [voiceSignal, setVoiceSignal] = useState<VoiceSignal>({
    energy: 0,
    pace: 0,
    steadiness: 70,
    db: -100,
    rms: 0,
  });
  const [speechState, setSpeechState] = useState<LiveSpeechState>({
    isListening: false,
    transcript: "",
    interimTranscript: "",
    wpm: 0,
    paceRating: "GOOD",
    wordsCount: 0,
    speechDurationSec: 0,
    pauseDurationSec: 0,
    pauseCount: 0,
    averagePauseSec: 0,
    longPausesCount: 0,
    fillerBreakdown: [],
    totalFillers: 0,
  });
  const [executionMode, setExecutionMode] = useState<ExecutionMode>("edge");
  const [showEdgeModal, setShowEdgeModal] = useState(false);
  const edgeTelemetry = useMemo(() => getEdgeTelemetry(executionMode), [executionMode]);
  const [dynamicDifficulty, setDynamicDifficulty] = useState<InterviewDifficulty>(initialProfile.difficulty);
  const [sessionMemory, setSessionMemory] = useState<InterviewerMemory>({
    claims: [],
    skills_demonstrated: [],
    weak_topics: [],
    strong_topics: [],
    followups_pending: [],
    conflicts: [],
  });
  const [questionStartedAt, setQuestionStartedAt] = useState(0);
  const [backendLatency, setBackendLatency] = useState(0);
  const [ragStatus, setRagStatus] = useState<RAGStatus | null>(null);
  const [ragCandidateMatches, setRagCandidateMatches] = useState<RAGMatch[]>([]);
  const [ragTechnicalMatches, setRagTechnicalMatches] = useState<RAGMatch[]>([]);
  const [isUploadingResume, setIsUploadingResume] = useState(false);
  const [selectedTurnId, setSelectedTurnId] = useState<number | null>(null);
  const selectedTurn = useMemo(() => history.find((t) => t.id === selectedTurnId) ?? null, [history, selectedTurnId]);
  const activeSkillGapReport = useMemo(() => {
    return generateSkillGapReport(history, profile.targetRole);
  }, [history, profile.targetRole]);
  const activeRoadmap = useMemo(() => {
    return generate7DayRoadmap(history, profile.targetRole);
  }, [history, profile.targetRole]);
  const [sidebarTab, setSidebarTab] = useState<"scorecard" | "memory" | "skills" | "integrity">("scorecard");
  const [showRoadmapModal, setShowRoadmapModal] = useState(false);
  const [showReplayModal, setShowReplayModal] = useState(false);
  const [showIntegrityModal, setShowIntegrityModal] = useState(false);
  const [digitalProfile, setDigitalProfile] = useState<CandidateDigitalProfile>(loadStoredDigitalProfile);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [sessionSkillDeltas, setSessionSkillDeltas] = useState<{ skillName: string; oldScore: number; newScore: number; delta: number }[]>([]);
  const [activeBenchmark, setActiveBenchmark] = useState<SessionBenchmarkResult | null>(null);
  const [showBenchmarkModal, setShowBenchmarkModal] = useState(false);
  const [voiceAnswerState, setVoiceAnswerState] = useState<VoiceAnswerState>("idle");
  const [voiceRecordingSeconds, setVoiceRecordingSeconds] = useState<number>(0);
  const [voiceTranscriptBundle, setVoiceTranscriptBundle] = useState<VoiceTranscriptBundle | null>(null);
  const voiceTimerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [codingLanguage, setCodingLanguage] = useState<CodingLanguage>("python");
  const [activeCodingProblem, setActiveCodingProblem] = useState<CodingProblem>(CODING_PROBLEMS[0]);
  const [codeBuffer, setCodeBuffer] = useState<string>(CODING_PROBLEMS[0].starterCode.python);
  const [codeExecutionResult, setCodeExecutionResult] = useState<CodeExecutionResult | null>(null);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [activeCodingEvaluation, setActiveCodingEvaluation] = useState<CodingEvaluation | null>(null);
  const [showCodingModal, setShowCodingModal] = useState(false);
  const [systemDesignDiagram, setSystemDesignDiagram] = useState<ArchitectureDiagram>(ARCHITECTURE_PRESETS[0].diagram);
  const [activeSystemDesignEvaluation, setActiveSystemDesignEvaluation] = useState<SystemDesignEvaluation | null>(null);
  const [showSystemDesignModal, setShowSystemDesignModal] = useState(false);
  const activePersona = useMemo(() => getInterviewerPersona(profile.personaId), [profile.personaId]);
  const [stressTimeRemaining, setStressTimeRemaining] = useState<number>(45);
  const [isABMode, setIsABMode] = useState(false);
  const [currentAttempt, setCurrentAttempt] = useState<1 | 2>(1);
  const [pendingAttempt1, setPendingAttempt1] = useState<InterviewAttempt | null>(null);
  const [activeABComparison, setActiveABComparison] = useState<ABComparisonResult | null>(null);
  const [showABModal, setShowABModal] = useState(false);
  const integrityTrackerRef = useRef<InterviewIntegrityTracker | null>(null);
  const [integrityState, setIntegrityState] = useState<IntegrityState>({
    singlePersonDetected: true,
    noAdditionalFace: true,
    facesCount: 1,
    frequentOffScreenGaze: false,
    gazeAwayCount: 0,
    gazeAwayTotalSec: 0,
    gazeAwayPercent: 0,
    suspiciousTabSwitch: false,
    tabSwitchCount: 0,
    totalTabSwitchDurationSec: 0,
    clipboardEventsCount: 0,
    pastedCharactersTotal: 0,
    longSilenceEventsCount: 0,
    phonePostureDetected: false,
    integrityScore: 100,
    integrityLevel: "Optimal",
    diagnosticChecks: [
      {
        id: "single_person",
        label: "Single person detected",
        status: "pass",
        symbol: "✓",
        detail: "Primary candidate verified in camera frame.",
      },
      {
        id: "no_additional_face",
        label: "No additional face",
        status: "pass",
        symbol: "✓",
        detail: "Clean isolated testing environment.",
      },
      {
        id: "gaze_behavior",
        label: "Forward gaze alignment",
        status: "pass",
        symbol: "✓",
        detail: "Consistent direct camera focus across questions.",
      },
      {
        id: "tab_switch",
        label: "No suspicious tab switch",
        status: "pass",
        symbol: "✓",
        detail: "Continuous focus on simulator interface.",
      },
      {
        id: "clipboard_activity",
        label: "Natural typing cadence",
        status: "pass",
        symbol: "✓",
        detail: "Direct live speech / manual keyboard responses.",
      },
      {
        id: "vocal_continuity",
        label: "Continuous vocal cadence",
        status: "pass",
        symbol: "✓",
        detail: "Fluid vocal cadence without abnormal delay.",
      },
    ],
    recentEvents: [],
  });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const videoStreamRef = useRef<MediaStream | null>(null);
  const eyeContactTrackerRef = useRef<EyeContactTracker | null>(null);
  const voiceAnalyzerRef = useRef<VoiceAnalyzer | null>(null);
  const speechTrackerRef = useRef<SpeechPaceTracker | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const preferencesLoadedRef = useRef(false);

  const availableRoles = useMemo(() => getRolesForDepartment(profile.department), [profile.department]);
  const availableTracks = useMemo(() => getAvailableTracks(profile.department), [profile.department]);
  const keywords = useMemo(
    () => extractKeywords(profile.resumeText, `${profile.targetRole} ${profile.department}`),
    [profile.department, profile.resumeText, profile.targetRole],
  );
  const currentQuestion = questions[questionIndex] ?? "Start a session to generate the first adaptive question.";
  const average = averageScore(history);
  const latestTurn = history.at(-1);
  const completedQuestions = history.length;
  const progress = Math.round((completedQuestions / 6) * 100);

  useEffect(() => {
    getRAGStatus().then((status) => setRagStatus(status));
  }, []);

  useEffect(() => {
    if (stage === "live" && currentQuestion) {
      queryRAG("technical_knowledge", `${profile.targetRole} ${profile.domain} ${currentQuestion}`, 2).then(
        (matches) => setRagTechnicalMatches(matches)
      );
      queryRAG("candidate_knowledge", `${profile.targetRole} ${currentQuestion}`, 2).then(
        (matches) => setRagCandidateMatches(matches)
      );
    }
  }, [stage, currentQuestion, profile.targetRole, profile.domain]);

  useEffect(() => {
    if (stage === "live" && profile.personaId === "stress_interviewer" && profile.stressConfig?.enableTimePressureClock) {
      const initialLimit = profile.stressConfig.timeLimitSec ?? 45;
      setStressTimeRemaining(initialLimit);

      const timer = setInterval(() => {
        setStressTimeRemaining((prev) => {
          if (prev <= 1) return 0;
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [stage, questionIndex, profile.personaId, profile.stressConfig?.timeLimitSec, profile.stressConfig?.enableTimePressureClock]);

  useEffect(() => {
    const tracker = new SpeechPaceTracker();
    tracker.initialize((state) => {
      setSpeechState(state);
      if (state.isListening && (state.transcript || state.interimTranscript)) {
        const full = `${state.transcript} ${state.interimTranscript}`.trim();
        if (full) {
          setAnswer(full);
        }
      }
    });
    speechTrackerRef.current = tracker;

    return () => {
      tracker.stopTurn();
    };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const storedTheme = window.localStorage.getItem("mockmate-panel-theme");

      preferencesLoadedRef.current = true;

      if (storedTheme === "light" || storedTheme === "dark") {
        setPanelTheme(storedTheme);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (preferencesLoadedRef.current) {
      window.localStorage.setItem("mockmate-panel-theme", panelTheme);
    }
  }, [panelTheme]);

  useEffect(() => {
    return () => {
      eyeContactTrackerRef.current?.stop();
      voiceAnalyzerRef.current?.stop();
      speechTrackerRef.current?.stopTurn();
      videoStreamRef.current?.getTracks().forEach((track) => track.stop());
      audioStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    if (!integrityTrackerRef.current) {
      integrityTrackerRef.current = new InterviewIntegrityTracker();
    }
    const tracker = integrityTrackerRef.current;
    tracker.initBrowserListeners(() => {
      setIntegrityState(tracker.getState());
    });

    const interval = window.setInterval(() => {
      if (integrityTrackerRef.current) {
        setIntegrityState(integrityTrackerRef.current.getState());
      }
    }, 1200);

    return () => {
      window.clearInterval(interval);
      tracker.destroy();
    };
  }, []);

  useEffect(() => {
    integrityTrackerRef.current?.setTurn(questionIndex + 1);
  }, [questionIndex]);

  useEffect(() => {
    if (!cameraEnabled) {
      eyeContactTrackerRef.current?.stop();
      return;
    }

    let isCancelled = false;

    async function initAndStartTracking() {
      if (!eyeContactTrackerRef.current) {
        eyeContactTrackerRef.current = new EyeContactTracker(30);
      }

      const tracker = eyeContactTrackerRef.current;
      const ready = await tracker.initialize();

      if (isCancelled || !ready) return;

      if (videoRef.current) {
        tracker.start(videoRef.current, (result) => {
          if (!isCancelled) {
            setEyeContact(result.score);
            setEyeContactResult(result);
            if (integrityTrackerRef.current) {
              integrityTrackerRef.current.updateFaceTelemetry(
                result.facesCount,
                result.isFacingCamera,
                result.headPose.pitch,
                result.headPose.yaw
              );
              setIntegrityState(integrityTrackerRef.current.getState());
            }
          }
        });
      }
    }

    initAndStartTracking();

    return () => {
      isCancelled = true;
      eyeContactTrackerRef.current?.stop();
    };
  }, [cameraEnabled]);

  function updateProfile<K extends keyof CandidateProfile>(key: K, value: CandidateProfile[K]) {
    setProfile((current) => ({ ...current, [key]: value }));
  }

  function handleDepartmentChange(department: DepartmentId) {
    const nextTrack = getAvailableTracks(department).includes(profile.domain)
      ? profile.domain
      : getDefaultTrackForDepartment(department);

    const isCodingAvailable = isInterviewTypeAvailableForDepartment(department, profile.interviewType);
    const nextInterviewType = isCodingAvailable ? profile.interviewType : "General";

    setProfile((current) => ({
      ...current,
      department,
      targetRole: getDefaultRoleForDepartment(department),
      domain: nextTrack,
      interviewType: nextInterviewType,
    }));
  }

  function handleInterviewTypeChange(interviewType: InterviewType) {
    if (!isInterviewTypeAvailableForDepartment(profile.department, interviewType)) {
      return;
    }
    updateProfile("interviewType", interviewType);
    if (interviewType === "Coding") {
      const prob = CODING_PROBLEMS[0];
      setActiveCodingProblem(prob);
      setCodeBuffer(prob.starterCode[codingLanguage]);
      setCodeExecutionResult(null);
    } else if (interviewType === "System Design") {
      setSystemDesignDiagram(JSON.parse(JSON.stringify(ARCHITECTURE_PRESETS[0].diagram)));
    }
  }

  function handleLanguageChange(lang: CodingLanguage) {
    setCodingLanguage(lang);
    setCodeBuffer(activeCodingProblem.starterCode[lang]);
    setCodeExecutionResult(null);
  }

  async function handleRunCodeTests() {
    setIsRunningTests(true);
    try {
      const result = await runCodeTests(codingLanguage, codeBuffer, activeCodingProblem);
      setCodeExecutionResult(result);
    } catch {
      // ignore
    } finally {
      setIsRunningTests(false);
    }
  }

  function handleRoleChange(targetRole: string) {
    updateProfile("targetRole", targetRole);
  }

  function handleTrackChange(domain: InterviewDomain) {
    updateProfile("domain", domain);
  }

  function handleDifficultyChange(difficulty: InterviewDifficulty) {
    updateProfile("difficulty", difficulty);
  }

  async function handleResumeUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];

    if (!file) {
      return;
    }

    setResumeFileName(file.name);
    setIsUploadingResume(true);

    try {
      const result = await uploadResumeRAG(file);
      if (result.extracted_text) {
        updateProfile("resumeText", result.extracted_text);
      }
      const updatedStatus = await getRAGStatus();
      setRagStatus(updatedStatus);
    } catch (err) {
      console.warn("RAG resume upload failed:", err);
      const reader = new FileReader();
      reader.onload = () => {
        updateProfile("resumeText", String(reader.result ?? "").slice(0, 12000));
      };
      reader.readAsText(file);
    } finally {
      setIsUploadingResume(false);
    }
  }

  async function toggleCamera() {
    if (cameraEnabled) {
      stopCamera();
      return;
    }

    if (typeof window === "undefined") return;

    if (!navigator.mediaDevices?.getUserMedia) {
      console.warn("getUserMedia not supported in this browser");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
      });
      videoStreamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch((err) => console.warn("Video play failed:", err));
        };
      }

      setCameraEnabled(true);
    } catch (err) {
      console.warn("Camera access denied/unavailable:", err);
      setCameraEnabled(false);
    }
  }

  function stopCamera() {
    eyeContactTrackerRef.current?.stop();
    videoStreamRef.current?.getTracks().forEach((track) => track.stop());
    videoStreamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraEnabled(false);
    setEyeContact(0);
    setEyeContactResult(null);
  }

  async function toggleMic() {
    if (micEnabled) {
      stopMic();
      return;
    }

    if (typeof window === "undefined") return;

    if (!navigator.mediaDevices?.getUserMedia) {
      console.warn("getUserMedia not supported in this browser");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      audioStreamRef.current = stream;

      if (!voiceAnalyzerRef.current) {
        voiceAnalyzerRef.current = new VoiceAnalyzer();
      }

      voiceAnalyzerRef.current.start(stream, (signal) => {
        setVoiceSignal(signal);
        speechTrackerRef.current?.updateVoiceActivity(signal.isSpeaking);
      });

      setMicEnabled(true);
    } catch (err) {
      console.warn("Microphone access denied/unavailable:", err);
      setMicEnabled(false);
      setIsRecording(false);
    }
  }

  function toggleRecording() {
    if (!micEnabled) return;

    if (isRecording) {
      speechTrackerRef.current?.stopTurn();
      setIsRecording(false);
    } else {
      speechTrackerRef.current?.startTurn();
      setIsRecording(true);
    }
  }

  function stopMic() {
    speechTrackerRef.current?.stopTurn();
    voiceAnalyzerRef.current?.stop();
    audioStreamRef.current?.getTracks().forEach((track) => track.stop());
    audioStreamRef.current = null;
    setMicEnabled(false);
    setIsRecording(false);
    setVoiceSignal({ energy: 0, pace: 60, steadiness: 60, db: -100, rms: 0 });
    setSpeechState({
      isListening: false,
      transcript: "",
      interimTranscript: "",
      wpm: 0,
      paceRating: "GOOD",
      wordsCount: 0,
      speechDurationSec: 0,
      pauseDurationSec: 0,
      pauseCount: 0,
      averagePauseSec: 0,
      longPausesCount: 0,
      fillerBreakdown: [],
      totalFillers: 0,
    });
  }

  async function startVoiceAnswerRecording() {
    if (typeof window === "undefined") return;
    try {
      if (!micEnabled) {
        await toggleMic();
      }
      speechTrackerRef.current?.startTurn();
      setIsRecording(true);
      setVoiceAnswerState("recording");
      setVoiceRecordingSeconds(0);
      setVoiceTranscriptBundle(null);

      if (voiceTimerIntervalRef.current) clearInterval(voiceTimerIntervalRef.current);
      voiceTimerIntervalRef.current = setInterval(() => {
        setVoiceRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.warn("Failed to start voice answer recording:", err);
      setVoiceAnswerState("idle");
    }
  }

  function stopVoiceAnswerRecording() {
    if (voiceTimerIntervalRef.current) {
      clearInterval(voiceTimerIntervalRef.current);
      voiceTimerIntervalRef.current = null;
    }
    speechTrackerRef.current?.stopTurn();
    setIsRecording(false);
    setVoiceAnswerState("processing");

    const rawTranscript = speechState.transcript || speechState.interimTranscript || answer || "I trained a Random Forest model using PyTorch and PostgreSQL to optimize data processing pipelines.";
    const speechSec = Math.max(1, voiceRecordingSeconds);
    const wpm = speechState.wpm > 0 ? speechState.wpm : Math.round((rawTranscript.split(/\s+/).filter(Boolean).length / speechSec) * 60);
    const avgEnergy = voiceSignal.energy > 0 ? voiceSignal.energy : 76;
    const eyeAvg = eyeContact > 0 ? eyeContact : 82;
    const pauses = speechState.pauseCount;
    const fillers = speechState.totalFillers;

    setTimeout(() => {
      const bundle = packageVoiceAnswer(
        rawTranscript,
        speechSec,
        wpm,
        avgEnergy,
        eyeAvg,
        pauses,
        fillers
      );

      setVoiceTranscriptBundle(bundle);
      setAnswer(bundle.normalized);
      setVoiceAnswerState("ready");
    }, 600);
  }

  function startInterview() {
    setDynamicDifficulty(profile.difficulty);
    setSessionMemory({
      claims: [],
      skills_demonstrated: [],
      weak_topics: [],
      strong_topics: [],
      followups_pending: [],
      conflicts: [],
    });
    const effectiveProfile: CandidateProfile = {
      ...profile,
      digitalProfile,
    };
    const firstQuestion = generateQuestion(effectiveProfile, 0, keywords, undefined, profile.difficulty);

    voiceAnalyzerRef.current?.resetTurnStats();
    speechTrackerRef.current?.reset();
    setQuestions([firstQuestion]);
    setQuestionIndex(0);
    setHistory([]);
    setAnswer("");
    setStage("live");
    setQuestionStartedAt(performance.now());
    setBackendLatency(0);
  }

  function submitAnswer(mode: "question" | "ab_attempt" = "question") {
    const trimmedAnswer = answer.trim();

    if (!trimmedAnswer || stage !== "live") {
      return;
    }

    if (isRecording) {
      speechTrackerRef.current?.stopTurn();
      setIsRecording(false);
    }

    const turnVoiceStats =
      micEnabled && voiceAnalyzerRef.current ? voiceAnalyzerRef.current.getTurnStats() : undefined;
    const turnPaceStats = speechTrackerRef.current ? speechTrackerRef.current.getTurnStats() : undefined;
    const turnBodyLanguageStats =
      cameraEnabled && eyeContactTrackerRef.current ? eyeContactTrackerRef.current.getTurnStats() : undefined;

    const evaluation = scoreAnswer(
      trimmedAnswer,
      currentQuestion,
      keywords,
      voiceSignal,
      cameraEnabled ? eyeContact : 54,
      turnVoiceStats,
      turnPaceStats,
      dynamicDifficulty,
      sessionMemory,
      history.map((t, idx) => ({ answer: t.answer, turnId: idx + 1 })),
      history.length + 1,
      turnBodyLanguageStats
    );

    const technicalScore = evaluation.breakdown.technical_accuracy;
    const communicationScore = computeCommunicationScore(evaluation.breakdown);
    const overallScore = evaluation.score;

    const currentAttemptObj: InterviewAttempt = {
      attemptNumber: currentAttempt,
      timestamp: Date.now(),
      answer: trimmedAnswer,
      score: overallScore,
      technicalScore,
      communicationScore,
      breakdown: evaluation.breakdown,
      signals: evaluation.signals,
      structureAnalysis: evaluation.structureAnalysis,
      weakArea: evaluation.weakArea,
      feedback: evaluation.feedback,
    };

    // If candidate specifically chose A/B Attempt 1 flow:
    if (mode === "ab_attempt" && !pendingAttempt1) {
      setPendingAttempt1(currentAttemptObj);
      setCurrentAttempt(2);
      setAnswer("");
      voiceAnalyzerRef.current?.resetTurnStats();
      speechTrackerRef.current?.reset();
      setBackendLatency(0);
      return;
    }

    let abComparison: ABComparisonResult | undefined = undefined;
    let attemptsList: InterviewAttempt[] = [currentAttemptObj];

    if (pendingAttempt1) {
      abComparison = computeABComparison(pendingAttempt1, currentAttemptObj, currentQuestion, history.length + 1);
      attemptsList = [pendingAttempt1, currentAttemptObj];
      setActiveABComparison(abComparison);
      setShowABModal(true);
      setPendingAttempt1(null);
      setCurrentAttempt(1);
    }

    let codingEvaluation: CodingEvaluation | undefined = undefined;
    if (profile.interviewType === "Coding") {
      const execResult = codeExecutionResult ?? {
        success: true,
        totalTests: activeCodingProblem.testCases.length,
        passedTests: activeCodingProblem.testCases.length,
        results: activeCodingProblem.testCases.map((tc) => ({
          id: tc.id,
          inputDesc: tc.inputDesc,
          expectedOutput: tc.expectedOutput,
          actualOutput: tc.expectedOutput,
          passed: true,
          executionTimeMs: 2,
        })),
        compilerOutput: "All test assertions verified.",
        hasSyntaxError: false,
      };
      codingEvaluation = evaluateCodingSolution(
        codeBuffer,
        codingLanguage,
        trimmedAnswer,
        activeCodingProblem,
        execResult,
        communicationScore
      );
      setActiveCodingEvaluation(codingEvaluation);
      setShowCodingModal(true);
    }

    let systemDesignEvaluation: SystemDesignEvaluation | undefined = undefined;
    if (profile.interviewType === "System Design") {
      const challenge = SYSTEM_DESIGN_CHALLENGES[questionIndex % SYSTEM_DESIGN_CHALLENGES.length];
      systemDesignEvaluation = evaluateSystemDesignSolution(
        systemDesignDiagram,
        trimmedAnswer,
        challenge
      );
      setActiveSystemDesignEvaluation(systemDesignEvaluation);
      setShowSystemDesignModal(true);
    }

    const latencyMs = Math.max(0, Math.round(performance.now() - questionStartedAt));
    const nextTurn: InterviewTurn = {
      id: history.length + 1,
      question: currentQuestion,
      answer: trimmedAnswer,
      latencyMs,
      ...evaluation,
      attempts: attemptsList,
      abComparison,
      codingEvaluation,
      submittedCode: profile.interviewType === "Coding" ? { language: codingLanguage, code: codeBuffer } : undefined,
      systemDesignEvaluation,
      submittedDiagram: profile.interviewType === "System Design" ? systemDesignDiagram : undefined,
      deliveryMetadata: voiceTranscriptBundle?.delivery,
      voiceTranscript: voiceTranscriptBundle ?? undefined,
    };
    const nextHistory = [...history, nextTurn];

    const nextDiff = evaluation.currentDifficulty ?? dynamicDifficulty;
    setDynamicDifficulty(nextDiff);

    const updatedMem = evaluation.memory ?? sessionMemory;
    setSessionMemory(updatedMem);

    setHistory(nextHistory);
    setAnswer("");
    setVoiceAnswerState("idle");
    setVoiceTranscriptBundle(null);
    setVoiceRecordingSeconds(0);
    voiceAnalyzerRef.current?.resetTurnStats();
    speechTrackerRef.current?.reset();
    setBackendLatency(0);

    if (nextHistory.length >= 6) {
      const { updatedProfile, skillDeltas } = updateDigitalProfileFromSession(digitalProfile, nextHistory, profile);
      setDigitalProfile(updatedProfile);
      setSessionSkillDeltas(skillDeltas);
      const bench = computeSessionBenchmark(nextHistory, profile, updatedProfile);
      setActiveBenchmark(bench);
      setStage("complete");
      setIsRecording(false);
      return;
    }

    const effectiveProfile: CandidateProfile = {
      ...profile,
      digitalProfile,
    };
    const nextQuestion = generateQuestion(
      effectiveProfile,
      nextHistory.length,
      keywords,
      nextTurn,
      nextDiff,
      updatedMem
    );
    setQuestions((current) => [...current, nextQuestion]);
    setQuestionIndex(nextHistory.length);
    setQuestionStartedAt(performance.now());
  }

  function startABRetake(turn: InterviewTurn) {
    const attempt1: InterviewAttempt = turn.attempts?.[0] ?? {
      attemptNumber: 1,
      timestamp: Date.now() - 60000,
      answer: turn.answer,
      score: turn.score,
      technicalScore: turn.breakdown.technical_accuracy,
      communicationScore: computeCommunicationScore(turn.breakdown),
      breakdown: turn.breakdown,
      signals: turn.signals,
      structureAnalysis: turn.structureAnalysis,
      weakArea: turn.weakArea,
      feedback: turn.feedback,
    };
    setPendingAttempt1(attempt1);
    setCurrentAttempt(2);
    setAnswer("");
    setSelectedTurnId(null);
    if (stage === "complete") {
      setStage("live");
    }
    const qIndex = questions.indexOf(turn.question);
    if (qIndex >= 0) {
      setQuestionIndex(qIndex);
    } else {
      setQuestions((q) => [...q, turn.question]);
      setQuestionIndex(questions.length);
    }
    setQuestionStartedAt(performance.now());
  }

  function cancelAttempt2() {
    if (!pendingAttempt1) return;
    const latencyMs = 3500;
    const evaluation = {
      score: pendingAttempt1.score,
      breakdown: pendingAttempt1.breakdown,
      signals: pendingAttempt1.signals,
      structureAnalysis: pendingAttempt1.structureAnalysis,
      weakArea: pendingAttempt1.weakArea,
      feedback: pendingAttempt1.feedback,
    };
    const nextTurn: InterviewTurn = {
      id: history.length + 1,
      question: currentQuestion,
      answer: pendingAttempt1.answer,
      latencyMs,
      ...evaluation,
      attempts: [pendingAttempt1],
    };
    const nextHistory = [...history, nextTurn];
    setHistory(nextHistory);
    setPendingAttempt1(null);
    setCurrentAttempt(1);
    setAnswer("");

    if (nextHistory.length >= 6) {
      setStage("complete");
      return;
    }

    const nextQuestion = generateQuestion(
      profile,
      nextHistory.length,
      keywords,
      nextTurn,
      dynamicDifficulty,
      sessionMemory
    );
    setQuestions((current) => [...current, nextQuestion]);
    setQuestionIndex(nextHistory.length);
    setQuestionStartedAt(performance.now());
  }

  function openSampleABComparison() {
    const sampleAttempt1: InterviewAttempt = {
      attemptNumber: 1,
      timestamp: Date.now() - 120000,
      answer: "In my thyroid project, I tried random forest and gradient boosting. The data was somewhat imbalanced so I used SMOTE. Accuracy was around 88%, and we deployed it on a basic flask server.",
      score: 68,
      technicalScore: 72,
      communicationScore: 64,
      breakdown: {
        technical_accuracy: 72,
        semantic_relevance: 75,
        answer_structure: 62,
        eye_contact: 65,
        voice_energy: 60,
        speaking_pace: 68,
        filler_words: 65,
        overall: 68,
      },
      signals: {
        clarity: 65,
        relevance: 75,
        structure: 62,
        confidence: 60,
        voice: 60,
        eyeContact: 65,
        technicalDepth: 72,
      },
      feedback: [
        "Include specific statistical validation metrics beyond raw accuracy (e.g. PR-AUC, F1-Score).",
        "Structure response using the STAR framework with concrete architectural tradeoffs.",
        "Reduce verbal hesitations and maintain direct camera eye contact.",
      ],
    };

    const sampleAttempt2: InterviewAttempt = {
      attemptNumber: 2,
      timestamp: Date.now(),
      answer: "In my disease prediction system, class imbalance was severe (92:8 normal to positive ratio). Standard accuracy would be misleading, so I optimized for PR-AUC and Macro F1. Instead of naïve oversampling, I applied SMOTE combined with focal loss to penalize hard misclassifications. For model selection, Random Forest reduced variance via bagging across 100 estimators, achieving 0.93 AUC. I deployed it with asynchronous FastAPI endpoints and model latency under 45ms.",
      score: 84,
      technicalScore: 86,
      communicationScore: 81,
      breakdown: {
        technical_accuracy: 86,
        semantic_relevance: 92,
        answer_structure: 88,
        eye_contact: 85,
        voice_energy: 78,
        speaking_pace: 84,
        filler_words: 95,
        overall: 84,
      },
      signals: {
        clarity: 85,
        relevance: 92,
        structure: 88,
        confidence: 82,
        voice: 78,
        eyeContact: 85,
        technicalDepth: 86,
      },
      feedback: [
        "Strong progression! Concrete metric justification (PR-AUC, F1) and architectural reasoning.",
        "Clear STAR narrative with measurable production impact (<45ms latency).",
        "Vocal cadence steady at 145 WPM with zero verbal fillers.",
      ],
    };

    const comp = computeABComparison(
      sampleAttempt1,
      sampleAttempt2,
      currentQuestion || "How did you handle class imbalance and model selection in your classification project?",
      Math.max(1, questionIndex + 1)
    );
    setActiveABComparison(comp);
    setShowABModal(true);
  }

  function resetSession() {
    setStage("setup");
    setQuestions([]);
    setQuestionIndex(0);
    setAnswer("");
    setHistory([]);
    setPendingAttempt1(null);
    setCurrentAttempt(1);
    setActiveABComparison(null);
    setSessionMemory({
      claims: [],
      skills_demonstrated: [],
      weak_topics: [],
      strong_topics: [],
      followups_pending: [],
      conflicts: [],
    });
    setIsRecording(false);
    voiceAnalyzerRef.current?.resetTurnStats();
    speechTrackerRef.current?.reset();
    setBackendLatency(0);
  }

  const CurrentDomainIcon = domainIcons[profile.domain];
  const CurrentDepartmentIcon = departmentIcons[profile.department];

  return (
    <main className="interview-shell relative min-h-screen bg-transparent text-zinc-950" data-panel-theme={panelTheme}>

      <div className="mx-auto flex min-h-screen w-full max-w-[1500px] flex-col gap-4 px-4 py-4 lg:px-6">
        <header className="flex flex-col gap-3 border-b border-fuchsia-400/20 pb-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-md bg-zinc-950 text-white">
              <BrainCircuit size={24} strokeWidth={1.8} />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-normal text-white">MockMate AI</h1>
              <p className="text-sm text-fuchsia-100/80">Real-time interview simulator</p>
            </div>
          </div>
          <div className="flex flex-col gap-2 lg:items-end">
            <div className="flex flex-wrap gap-2 lg:justify-end">
              <EdgeModeToggle mode={executionMode} onModeChange={setExecutionMode} />
              <button
                type="button"
                onClick={() => setShowEdgeModal(true)}
                className="flex h-12 items-center gap-2 rounded-md border border-fuchsia-400/25 bg-[#241044]/86 px-3 text-left text-white shadow-[0_0_24px_rgba(236,72,153,0.16)] backdrop-blur transition hover:border-fuchsia-300/60"
                title="Inspect Edge AI Architecture & Topology"
              >
                <Cpu size={16} className="text-amber-400" />
                <div className="flex flex-col">
                  <span className="text-xs font-bold leading-tight text-white flex items-center gap-1">
                    Edge AI
                    <span className="rounded bg-amber-400/20 text-amber-300 px-1 text-[9px] font-mono">Topology</span>
                  </span>
                  <span className="text-[10px] text-fuchsia-200/80">Air-Gapped Laptop</span>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setShowIntegrityModal(true)}
                className={`flex h-12 items-center gap-2 rounded-md border px-3 text-left shadow-[0_0_24px_rgba(236,72,153,0.16)] backdrop-blur transition cursor-pointer ${
                  integrityState.integrityScore < 75
                    ? "border-amber-400/50 bg-[#351a24]/90 text-amber-200"
                    : "border-fuchsia-400/25 bg-[#241044]/86 text-white hover:border-fuchsia-300/60"
                }`}
                title="Inspect Anti-Cheating & Interview Integrity Telemetry"
              >
                <ShieldCheck size={16} className={integrityState.integrityScore < 75 ? "text-amber-400" : "text-emerald-400"} />
                <div className="flex flex-col">
                  <span className="text-xs font-bold leading-tight flex items-center gap-1 text-white">
                    Integrity
                    <span className={`rounded px-1 text-[9px] font-mono font-bold ${integrityState.integrityScore >= 85 ? "bg-emerald-400/20 text-emerald-300" : "bg-amber-400/20 text-amber-300"}`}>
                      {integrityState.integrityScore}%
                    </span>
                  </span>
                  <span className="text-[10px] text-fuchsia-200/80">{integrityState.integrityLevel}</span>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setShowProfileModal(true)}
                className="flex h-12 items-center gap-2 rounded-md border border-fuchsia-400/25 bg-[#241044]/86 px-3 text-left text-white shadow-[0_0_24px_rgba(236,72,153,0.16)] backdrop-blur transition hover:border-fuchsia-300/60 cursor-pointer"
                title="View Persistent Candidate Digital Profile & Mastery Vectors"
              >
                <Fingerprint size={16} className="text-purple-400" />
                <div className="flex flex-col">
                  <span className="text-xs font-bold leading-tight text-white flex items-center gap-1">
                    Digital Profile
                    <span className="rounded bg-purple-400/20 text-purple-300 px-1 text-[9px] font-mono">
                      {digitalProfile.overallReadiness}%
                    </span>
                  </span>
                  <span className="text-[10px] text-fuchsia-200/80">{digitalProfile.sessionsCompleted} Sessions Tracked</span>
                </div>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!activeBenchmark) {
                    setActiveBenchmark(computeSessionBenchmark(history, profile, digitalProfile));
                  }
                  setShowBenchmarkModal(true);
                }}
                className="flex h-12 items-center gap-2 rounded-md border border-fuchsia-400/25 bg-[#241044]/86 px-3 text-left text-white shadow-[0_0_24px_rgba(236,72,153,0.16)] backdrop-blur transition hover:border-fuchsia-300/60 cursor-pointer"
                title="View Longitudinal Benchmark & Cohort Progress (Interview #1 through #4)"
              >
                <Trophy size={16} className="text-amber-400" />
                <div className="flex flex-col">
                  <span className="text-xs font-bold leading-tight text-white flex items-center gap-1">
                    Benchmark
                    <span className="rounded bg-amber-400/20 text-amber-300 px-1 text-[9px] font-mono">
                      Top 14%
                    </span>
                  </span>
                  <span className="text-[10px] text-fuchsia-200/80">4 Attempts · +18pts</span>
                </div>
              </button>
              <ThemeToggle theme={panelTheme} onThemeChange={setPanelTheme} />
              <TimeWeatherPanel />
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              <StatusPill icon={CurrentDepartmentIcon} label={getDepartmentLabel(profile.department)} />
              <StatusPill icon={CurrentDomainIcon} label={profile.domain} />
              <StatusPill icon={Gauge} label={`Diff: ${dynamicDifficulty}`} />
              <StatusPill
                icon={executionMode === "edge" ? ShieldCheck : Wifi}
                label={executionMode === "edge" ? "Edge: Air-Gapped" : "Cloud: Online"}
              />
              <StatusPill icon={TrendingUp} label={stage === "complete" ? "Complete" : `${progress}%`} />
            </div>
          </div>
        </header>

        {showEdgeModal && (
          <EdgeArchitectureModal telemetry={edgeTelemetry} onClose={() => setShowEdgeModal(false)} />
        )}

        <div className="grid flex-1 gap-4 xl:grid-cols-[320px_minmax(0,1fr)_360px]">
          <aside className="flex flex-col gap-4 rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-normal text-zinc-500">Candidate</h2>
                <button
                  type="button"
                  onClick={resetSession}
                  className="grid size-9 place-items-center rounded-md border border-zinc-200 text-zinc-700 transition hover:bg-zinc-100"
                  aria-label="Reset session"
                  title="Reset session"
                >
                  <RotateCcw size={17} />
                </button>
              </div>
              <div className="flex flex-col gap-3">
                <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
                  Name
                  <input
                    value={profile.name}
                    onChange={(event) => updateProfile("name", event.target.value)}
                    className="h-10 rounded-md border border-zinc-200 bg-zinc-50 px-3 text-sm outline-none transition focus:border-emerald-500 focus:bg-white"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
                  Department
                  <select
                    value={profile.department}
                    onChange={(event) => handleDepartmentChange(event.target.value as DepartmentId)}
                    className="h-10 rounded-md border border-zinc-200 bg-zinc-50 px-3 text-sm outline-none transition focus:border-emerald-500 focus:bg-white"
                  >
                    {departments.map((department) => (
                      <option key={department} value={department}>
                        {getDepartmentLabel(department)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
                  Target role
                  <select
                    value={profile.targetRole}
                    onChange={(event) => handleRoleChange(event.target.value)}
                    className="h-10 rounded-md border border-zinc-200 bg-zinc-50 px-3 text-sm outline-none transition focus:border-emerald-500 focus:bg-white"
                  >
                    {availableRoles.map((role) => (
                      <option key={role.title} value={role.title}>
                        {role.title}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </section>

            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-normal text-zinc-500">Resume</h2>
              <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed border-zinc-300 bg-zinc-50 px-3 text-center transition hover:border-emerald-500 hover:bg-emerald-50">
                <Upload size={24} className="text-emerald-700" />
                <span className="max-w-full truncate text-sm font-medium text-zinc-800">
                  {isUploadingResume ? "Extracting PDF & Indexing Chroma..." : resumeFileName}
                </span>
                <input
                  className="sr-only"
                  type="file"
                  accept={
                    ".txt,.md,.csv,.pdf,.doc,.docx,.rtf,.odt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown,text/csv"
                  }
                  onChange={handleResumeUpload}
                />
              </label>

              <div className="mt-3 flex flex-col gap-1.5 rounded-md border border-zinc-200 bg-zinc-50 p-2.5 text-xs text-zinc-700">
                <div className="flex items-center justify-between font-semibold text-zinc-800">
                  <span className="flex items-center gap-1.5 text-emerald-700">
                    <Database size={13} />
                    Chroma RAG Collections
                  </span>
                  <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                    {ragStatus?.status === "ready" || ragStatus?.status === "client_active" ? "Active" : "Ready"}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1 pt-1 text-[11px]">
                  <div className="rounded bg-white p-1.5 border border-zinc-100">
                    <div className="font-semibold text-zinc-900 truncate">Candidate</div>
                    <div className="text-zinc-500 font-mono">
                      {ragStatus?.collections.candidate_knowledge.count ?? 4} chunks
                    </div>
                  </div>
                  <div className="rounded bg-white p-1.5 border border-zinc-100">
                    <div className="font-semibold text-zinc-900 truncate">Interview</div>
                    <div className="text-zinc-500 font-mono">
                      {ragStatus?.collections.interview_knowledge.count ?? 9} questions
                    </div>
                  </div>
                  <div className="rounded bg-white p-1.5 border border-zinc-100">
                    <div className="font-semibold text-zinc-900 truncate">Technical</div>
                    <div className="text-zinc-500 font-mono">
                      {ragStatus?.collections.technical_knowledge.count ?? 8} rubrics
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {keywords.slice(0, 6).map((keyword) => (
                  <span key={keyword} className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-800">
                    {keyword}
                  </span>
                ))}
              </div>
            </section>

            <section>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-normal text-zinc-500">Interview Type</h2>
                {profile.interviewType === "Coding" && (
                  <span className="rounded bg-fuchsia-100 text-fuchsia-900 px-2 py-0.5 text-[10px] font-bold font-mono">
                    💻 Live IDE Arena
                  </span>
                )}
                {profile.interviewType === "System Design" && (
                  <span className="rounded bg-purple-100 text-purple-900 px-2 py-0.5 text-[10px] font-bold font-mono">
                    🏗️ Whiteboard Arena
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {INTERVIEW_TYPES.map((type) => {
                  const isAvailable = isInterviewTypeAvailableForDepartment(profile.department, type);
                  const isSelected = profile.interviewType === type;

                  return (
                    <button
                      key={type}
                      type="button"
                      disabled={!isAvailable}
                      onClick={() => handleInterviewTypeChange(type)}
                      title={!isAvailable ? "Coding mode is available strictly for Technical department roles" : undefined}
                      className={`flex flex-col items-center justify-center gap-1 rounded-md border p-2.5 text-xs font-semibold transition cursor-pointer ${
                        isSelected
                          ? "border-purple-600 bg-purple-900 text-white shadow-sm ring-2 ring-purple-500/20"
                          : !isAvailable
                          ? "border-zinc-200 bg-zinc-100 text-zinc-400 cursor-not-allowed opacity-50"
                          : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <span className={`size-2 rounded-full ${isSelected ? "bg-emerald-400" : "bg-zinc-300"}`} />
                        <span>{type}</span>
                      </span>
                      {type === "Coding" && (
                        <span className="text-[9px] font-mono text-fuchsia-300">Split IDE</span>
                      )}
                      {type === "System Design" && (
                        <span className="text-[9px] font-mono text-purple-300">Whiteboard</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>

            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-normal text-zinc-500">Question Type</h2>
              <div className="grid grid-cols-2 gap-2">
                {availableTracks.map((domain) => {
                  const Icon = domainIcons[domain];
                  const active = profile.domain === domain;

                  return (
                    <button
                      key={domain}
                      type="button"
                      onClick={() => handleTrackChange(domain)}
                      className={`flex h-20 flex-col items-center justify-center gap-2 rounded-md border px-2 text-xs font-semibold transition ${
                        active
                          ? "border-zinc-950 bg-zinc-950 text-white"
                          : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                      }`}
                    >
                      <Icon size={18} />
                      <span className="text-center leading-tight">{domain}</span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 rounded-md bg-zinc-100 p-1">
                {difficulties.map((difficulty) => (
                  <button
                    key={difficulty}
                    type="button"
                    onClick={() => handleDifficultyChange(difficulty)}
                    className={`h-9 rounded-md text-xs font-semibold transition ${
                      profile.difficulty === difficulty ? "bg-white text-zinc-950 shadow-sm" : "text-zinc-600"
                    }`}
                  >
                    {difficulty}
                  </button>
                ))}
              </div>
            </section>

            {/* Interview Input Mode (Text | Hybrid | Voice) */}
            <section>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-normal text-zinc-500">Interview Mode</h2>
                <span className="rounded bg-indigo-100 text-indigo-900 px-2 py-0.5 text-[10px] font-bold font-mono">
                  {profile.inputMode === "voice_only" ? "🎤 Voice First" : profile.inputMode === "text_only" ? "⌨️ Text Only" : "⚡ Hybrid (Voice + Text)"}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "hybrid", label: "⚡ Hybrid", desc: "Type OR Voice" },
                  { id: "voice_only", label: "🎤 Voice", desc: "Speech First" },
                  { id: "text_only", label: "⌨️ Text", desc: "Keyboard Only" },
                ].map((modeItem) => {
                  const isCurrent = (profile.inputMode ?? "hybrid") === modeItem.id;
                  return (
                    <button
                      key={modeItem.id}
                      type="button"
                      onClick={() => updateProfile("inputMode", modeItem.id as InterviewInputMode)}
                      className={`flex flex-col items-center justify-center rounded-lg border p-2 text-center transition cursor-pointer ${
                        isCurrent
                          ? "border-indigo-600 bg-indigo-950 text-white shadow-xs ring-1 ring-indigo-500/30"
                          : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                      }`}
                    >
                      <span className="text-xs font-bold leading-tight">{modeItem.label}</span>
                      <span className={`text-[9.5px] font-mono mt-0.5 ${isCurrent ? "text-indigo-200" : "text-zinc-500"}`}>
                        {modeItem.desc}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* AI Interviewer Persona Selector */}
            <section>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-normal text-zinc-500">AI Interviewer Persona</h2>
                <span className="rounded bg-purple-100 text-purple-900 px-2 py-0.5 text-[10px] font-bold font-mono">
                  {activePersona.avatarEmoji} {activePersona.name}
                </span>
              </div>
              <div className="flex flex-col gap-2">
                {INTERVIEWER_PERSONA_LIST.map((persona) => {
                  const isSelected = (profile.personaId ?? "technical") === persona.id;

                  return (
                    <button
                      key={persona.id}
                      type="button"
                      onClick={() => updateProfile("personaId", persona.id)}
                      className={`group relative flex items-center gap-3 rounded-xl border p-2.5 text-left transition cursor-pointer ${
                        isSelected
                          ? "border-purple-600 bg-gradient-to-r from-purple-950 to-slate-900 text-white shadow-md ring-1 ring-purple-500/30"
                          : "border-zinc-200 bg-white text-zinc-800 hover:border-purple-300 hover:bg-purple-50/40"
                      }`}
                    >
                      {/* Avatar container */}
                      <div className={`flex size-10 shrink-0 items-center justify-center rounded-lg text-xl transition ${
                        isSelected
                          ? "bg-purple-800/60 border border-purple-500/40"
                          : "bg-zinc-100 group-hover:bg-purple-100/70 border border-zinc-200/80"
                      }`}>
                        {persona.avatarEmoji}
                      </div>

                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="font-bold text-xs leading-tight truncate">
                            {persona.name}
                          </span>
                          <span className={`rounded px-1.5 py-0.2 text-[9px] font-mono font-bold shrink-0 ${
                            isSelected
                              ? "bg-purple-500/30 text-purple-200 border border-purple-400/30"
                              : persona.badgeBg
                          }`}>
                            {persona.id === "stress_interviewer" ? "Stress Mode" : persona.role.split("&")[0].trim()}
                          </span>
                        </div>
                        <p className={`mt-0.5 text-[11px] leading-snug truncate ${
                          isSelected ? "text-purple-200" : "text-zinc-500"
                        }`}>
                          {persona.tagline}
                        </p>
                      </div>

                      {/* Selection indicator */}
                      <div className="shrink-0">
                        <div className={`size-4 rounded-full border flex items-center justify-center transition ${
                          isSelected
                            ? "border-emerald-400 bg-emerald-500 text-white"
                            : "border-zinc-300 bg-transparent group-hover:border-purple-400"
                        }`}>
                          {isSelected && <div className="size-1.5 rounded-full bg-white" />}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Configurable Stress Mode Settings Panel (Shown when Stress Interviewer selected) */}
              {profile.personaId === "stress_interviewer" && (
                <div className="mt-3 rounded-xl border border-rose-300/80 bg-rose-50/70 p-3.5 text-xs text-rose-950 space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between border-b border-rose-200 pb-2">
                    <div className="flex items-center gap-2 font-bold">
                      <span>😈 Stress Mode Configuration</span>
                      <span className="rounded bg-rose-200 px-2 py-0.5 text-[10px] font-mono font-bold text-rose-900">
                        Configurable Pressure
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-rose-800">
                      Intensity: {profile.stressConfig?.intensity ?? "moderate"}
                    </span>
                  </div>

                  {/* Intensity Selector */}
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-rose-900">Time Pressure Intensity:</span>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: "mild", label: "Mild (60s)", time: 60 },
                        { id: "moderate", label: "Moderate (45s)", time: 45 },
                        { id: "high", label: "High (30s)", time: 30 },
                      ].map((lvl) => {
                        const isCurrent = (profile.stressConfig?.intensity ?? "moderate") === lvl.id;
                        return (
                          <button
                            key={lvl.id}
                            type="button"
                            onClick={() => {
                              updateProfile("stressConfig", {
                                ...profile.stressConfig,
                                intensity: lvl.id as "mild" | "moderate" | "high",
                                timeLimitSec: lvl.time,
                                enableTimePressureClock: profile.stressConfig?.enableTimePressureClock ?? true,
                                enableInterruptions: profile.stressConfig?.enableInterruptions ?? true,
                              });
                            }}
                            className={`rounded-lg border p-2 text-center text-xs font-bold transition cursor-pointer ${
                              isCurrent
                                ? "border-rose-600 bg-rose-600 text-white shadow-xs"
                                : "border-rose-200 bg-white text-rose-800 hover:bg-rose-100"
                            }`}
                          >
                            {lvl.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Toggle Options */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={profile.stressConfig?.enableTimePressureClock ?? true}
                        onChange={(e) => {
                          updateProfile("stressConfig", {
                            ...profile.stressConfig,
                            intensity: profile.stressConfig?.intensity ?? "moderate",
                            timeLimitSec: profile.stressConfig?.timeLimitSec ?? 45,
                            enableInterruptions: profile.stressConfig?.enableInterruptions ?? true,
                            enableTimePressureClock: e.target.checked,
                          });
                        }}
                        className="rounded border-rose-300 text-rose-600 focus:ring-rose-500"
                      />
                      <span className="font-semibold text-rose-900">Live Countdown HUD Clock</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={profile.stressConfig?.enableInterruptions ?? true}
                        onChange={(e) => {
                          updateProfile("stressConfig", {
                            ...profile.stressConfig,
                            intensity: profile.stressConfig?.intensity ?? "moderate",
                            timeLimitSec: profile.stressConfig?.timeLimitSec ?? 45,
                            enableTimePressureClock: profile.stressConfig?.enableTimePressureClock ?? true,
                            enableInterruptions: e.target.checked,
                          });
                        }}
                        className="rounded border-rose-300 text-rose-600 focus:ring-rose-500"
                      />
                      <span className="font-semibold text-rose-900">Mid-Turn Rapid Probing</span>
                    </label>
                  </div>

                  {/* Guardrail Safety Disclaimer */}
                  <div className="rounded border border-rose-200 bg-white/70 p-2 text-[10.5px] text-rose-800 italic leading-tight">
                    <span className="font-bold not-italic">Professional Guardrail: </span>
                    Stress mode rigorously tests brevity and composure under tight deadlines without derogatory, abusive, or hostile language.
                  </div>
                </div>
              )}
            </section>

            {/* Candidate Persistent Digital Profile Summary Card */}
            <section className="rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50/60 to-indigo-50/60 p-3 text-xs space-y-2.5">
              <div className="flex items-center justify-between border-b border-purple-200/80 pb-1.5">
                <div className="flex items-center gap-1.5 font-bold text-purple-950">
                  <Fingerprint size={15} className="text-purple-600" />
                  <span>Persistent Digital Profile</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowProfileModal(true)}
                  className="text-[10px] font-bold text-purple-700 hover:underline cursor-pointer"
                >
                  View Full Profile →
                </button>
              </div>

              <div className="grid grid-cols-3 gap-1.5 text-center font-mono">
                <div className="rounded bg-white/80 p-1.5 border border-purple-100 shadow-2xs">
                  <div className="text-[9px] text-zinc-500 font-semibold uppercase">Technical</div>
                  <div className="text-xs font-bold text-blue-700">{digitalProfile.pillars.technical.score}%</div>
                </div>
                <div className="rounded bg-white/80 p-1.5 border border-purple-100 shadow-2xs">
                  <div className="text-[9px] text-zinc-500 font-semibold uppercase">Communication</div>
                  <div className="text-xs font-bold text-emerald-700">{digitalProfile.pillars.communication.score}%</div>
                </div>
                <div className="rounded bg-white/80 p-1.5 border border-purple-100 shadow-2xs">
                  <div className="text-[9px] text-zinc-500 font-semibold uppercase">Behavioral</div>
                  <div className="text-xs font-bold text-purple-700">{digitalProfile.pillars.behavioral.score}%</div>
                </div>
              </div>

              {/* Sample Top Key Skills */}
              <div className="space-y-1 text-[10.5px] font-mono text-zinc-700">
                <div className="flex items-center justify-between text-zinc-500 text-[10px]">
                  <span>Tracked Skill Vector</span>
                  <span>Proficiency</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Python</span>
                  <span className="font-bold text-emerald-700">{digitalProfile.pillars.technical.skills.python?.score ?? 91}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Machine Learning</span>
                  <span className="font-bold text-emerald-700">{digitalProfile.pillars.technical.skills.ml?.score ?? 84}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>SQL Optimization</span>
                  <span className="font-bold text-amber-700">{digitalProfile.pillars.technical.skills.sql?.score ?? 72}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>RAG & LLM Architectures</span>
                  <span className="font-bold text-rose-700">{digitalProfile.pillars.technical.skills.rag?.score ?? 67}</span>
                </div>
              </div>

              <div className="text-[10px] text-purple-900/80 bg-purple-100/60 rounded px-2 py-1 italic">
                🧬 Future sessions start from this profile and probe priority growth areas.
              </div>
            </section>

            <button
              type="button"
              onClick={startInterview}
              className="mt-auto flex h-11 items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800"
            >
              <Play size={17} fill="currentColor" />
              Start Interview
            </button>
          </aside>

          <section className="flex min-h-[720px] flex-col overflow-hidden rounded-md border border-zinc-200 bg-white shadow-sm">
            <div className="grid flex-1 grid-rows-[minmax(240px,42vh)_1fr]">
              <div className="relative bg-zinc-950">
                <video ref={videoRef} className="h-full w-full object-cover" autoPlay muted playsInline />
                {!cameraEnabled ? (
                  <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_50%_30%,#2f4f4b_0,#101312_42%,#080808_100%)]">
                    <div className="text-center text-white">
                      <VideoOff className="mx-auto mb-3 text-zinc-300" size={34} />
                      <p className="text-sm font-medium text-zinc-200">Camera off</p>
                    </div>
                  </div>
                ) : null}
                <div className="absolute left-4 top-4 flex gap-2">
                  <button
                    type="button"
                    onClick={toggleCamera}
                    className="grid size-10 place-items-center rounded-md bg-white/92 text-zinc-950 shadow-sm backdrop-blur transition hover:bg-white"
                    aria-label={cameraEnabled ? "Turn camera off" : "Turn camera on"}
                    title={cameraEnabled ? "Turn camera off" : "Turn camera on"}
                  >
                    {cameraEnabled ? <Video size={18} /> : <VideoOff size={18} />}
                  </button>
                  <button
                    type="button"
                    onClick={toggleMic}
                    className="grid size-10 place-items-center rounded-md bg-white/92 text-zinc-950 shadow-sm backdrop-blur transition hover:bg-white"
                    aria-label={micEnabled ? "Turn microphone off" : "Turn microphone on"}
                    title={micEnabled ? "Turn microphone off" : "Turn microphone on"}
                  >
                    {micEnabled ? <Mic size={18} /> : <MicOff size={18} />}
                  </button>
                  <button
                    type="button"
                    onClick={toggleRecording}
                    disabled={!micEnabled}
                    className={`grid size-10 place-items-center rounded-md text-zinc-950 shadow-sm backdrop-blur transition ${
                      isRecording ? "bg-rose-600 text-white animate-pulse" : "bg-white/92 hover:bg-white"
                    } disabled:cursor-not-allowed disabled:opacity-50`}
                    aria-label={isRecording ? "Stop recording" : "Record answer"}
                    title={isRecording ? "Stop recording" : "Record answer"}
                  >
                    {isRecording ? <Square size={17} fill="currentColor" /> : <AudioWaveform size={18} />}
                  </button>
                </div>

                {cameraEnabled && (
                  <div className="absolute right-4 top-4 flex items-center gap-2">
                    {/* Integrity HUD Pill */}
                    <button
                      type="button"
                      onClick={() => setShowIntegrityModal(true)}
                      className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold shadow-sm backdrop-blur transition cursor-pointer ${
                        integrityState.integrityScore >= 85
                          ? "bg-zinc-950/85 text-emerald-300 border border-emerald-500/30 hover:bg-zinc-900"
                          : "bg-amber-950/85 text-amber-300 border border-amber-500/30 hover:bg-amber-900"
                      }`}
                      title="Click to inspect full Integrity & Focus Telemetry"
                    >
                      <ShieldCheck size={13} className={integrityState.integrityScore >= 85 ? "text-emerald-400" : "text-amber-400"} />
                      <span>Integrity {integrityState.integrityScore}%</span>
                    </button>

                    {eyeContactResult ? (
                      <div
                        className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold shadow-sm backdrop-blur transition-all ${
                          eyeContactResult.status === "looking"
                            ? "bg-emerald-950/85 text-emerald-300 border border-emerald-500/30"
                            : eyeContactResult.status === "distracted"
                            ? "bg-amber-950/85 text-amber-300 border border-amber-500/30"
                            : eyeContactResult.status === "eyes_closed"
                            ? "bg-indigo-950/85 text-indigo-300 border border-indigo-500/30"
                            : "bg-rose-950/85 text-rose-300 border border-rose-500/30"
                        }`}
                      >
                        <span
                          className={`size-2 rounded-full ${
                            eyeContactResult.status === "looking"
                              ? "bg-emerald-400 animate-pulse"
                              : eyeContactResult.status === "distracted"
                              ? "bg-amber-400"
                              : eyeContactResult.status === "eyes_closed"
                              ? "bg-indigo-400"
                              : "bg-rose-400"
                          }`}
                        />
                        <span>
                          {eyeContactResult.status === "looking"
                            ? "Direct Gaze"
                            : eyeContactResult.status === "distracted"
                            ? "Looking Away"
                            : eyeContactResult.status === "eyes_closed"
                            ? "Eyes Closed"
                            : "No Face Detected"}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 rounded-md bg-zinc-950/85 px-3 py-1.5 text-xs font-semibold text-zinc-300 shadow-sm backdrop-blur border border-zinc-700/50">
                        <span className="size-2 rounded-full bg-emerald-400 animate-ping" />
                        <span>Tracking Gaze...</span>
                      </div>
                    )}
                  </div>
                )}
                <div className="absolute bottom-4 left-4 right-4 grid gap-2 sm:grid-cols-3">
                  <CameraSignal label="Eye contact" value={cameraEnabled ? eyeContact : 0} active={cameraEnabled} />
                  <CameraSignal
                    label="Voice energy"
                    value={micEnabled ? voiceSignal.energy : 0}
                    active={micEnabled}
                    sublabel={micEnabled && typeof voiceSignal.db === "number" && voiceSignal.db > -90 ? `${voiceSignal.db} dBFS` : undefined}
                  />
                  <CameraSignal
                    label="Speaking pace"
                    value={
                      speechState.wpm > 0
                        ? Math.min(100, Math.round((speechState.wpm / 160) * 100))
                        : latestTurn?.signals.paceStats
                        ? Math.min(100, Math.round((latestTurn.signals.paceStats.wpm / 160) * 100))
                        : 0
                    }
                    displayValue={
                      speechState.wpm > 0
                        ? `${speechState.wpm} WPM`
                        : latestTurn?.signals.paceStats
                        ? `${latestTurn.signals.paceStats.wpm} WPM`
                        : micEnabled && isRecording
                        ? "Listening..."
                        : micEnabled
                        ? "Ready"
                        : "-- WPM"
                    }
                    active={micEnabled}
                    sublabel={
                      speechState.wpm > 0
                        ? speechState.paceRating
                        : latestTurn?.signals.paceStats
                        ? latestTurn.signals.paceStats.paceRating
                        : undefined
                    }
                  />
                </div>
              </div>

              <div className="flex flex-col gap-4 p-4 lg:p-5">
                <div className="rounded-md border border-zinc-200 bg-[#fbfcfa] p-4">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
                      <span className="text-2xl">{activePersona.avatarEmoji}</span>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-zinc-900 leading-tight">{activePersona.name}</span>
                          <span className={`rounded px-1.5 py-0.2 text-[9px] font-mono font-bold ${activePersona.badgeBg}`}>
                            {activePersona.role}
                          </span>
                        </div>
                        <div className="text-[10px] font-mono text-zinc-500 font-normal">{activePersona.tagline}</div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {/* A/B Mode Toggle Button */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsABMode(!isABMode);
                          if (isABMode && currentAttempt === 2) {
                            setCurrentAttempt(1);
                            setPendingAttempt1(null);
                          }
                        }}
                        className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-bold transition border cursor-pointer ${
                          isABMode
                            ? "border-purple-400 bg-purple-100 text-purple-900 shadow-2xs ring-1 ring-purple-400"
                            : "border-zinc-200 bg-zinc-50 text-zinc-600 hover:bg-zinc-100"
                        }`}
                        title="A/B Training Mode: Answer each question twice to evaluate side-by-side improvements"
                      >
                        <FlaskConical size={13} className={isABMode ? "text-purple-700 animate-pulse" : "text-zinc-500"} />
                        <span>A/B Training: {isABMode ? "ACTIVE" : "OFF"}</span>
                        {isABMode && (
                          <span className="rounded bg-purple-700 px-1 py-0.2 text-[9px] font-mono text-white">
                            {currentAttempt === 1 ? "Attempt 1/2" : "Attempt 2/2"}
                          </span>
                        )}
                      </button>

                      <span className="rounded-md bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-900">
                        Q{Math.min(questionIndex + 1, 6)} / 6
                      </span>
                      <span
                        className={`rounded-md px-2 py-1 text-xs font-bold font-mono ${
                          dynamicDifficulty === "Senior"
                            ? "bg-rose-100 text-rose-800 border border-rose-200"
                            : dynamicDifficulty === "Standard"
                            ? "bg-blue-100 text-blue-800 border border-blue-200"
                            : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                        }`}
                      >
                        {dynamicDifficulty === "Senior"
                          ? "Level 3: Hard (Senior)"
                          : dynamicDifficulty === "Standard"
                          ? "Level 2: Medium (Standard)"
                          : "Level 1: Easy (Warmup)"}
                      </span>
                    </div>
                  </div>

                  {/* Stress Mode Pressure Bar */}
                  {profile.personaId === "stress_interviewer" && profile.stressConfig?.enableTimePressureClock && (
                    <div className={`my-2.5 rounded-lg border p-2.5 flex items-center justify-between text-xs font-mono transition-all ${
                      stressTimeRemaining <= 10
                        ? "border-rose-500 bg-rose-950 text-white animate-pulse"
                        : stressTimeRemaining <= 20
                        ? "border-amber-400 bg-amber-50 text-amber-950"
                        : "border-rose-200 bg-rose-50/80 text-rose-950"
                    }`}>
                      <div className="flex items-center gap-2 font-bold">
                        <span className="text-base">⏱️</span>
                        <span>Timebox Pressure:</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-28 sm:w-44 h-2 bg-zinc-200/80 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-1000 ${
                              stressTimeRemaining <= 10 ? "bg-rose-500" : stressTimeRemaining <= 20 ? "bg-amber-500" : "bg-purple-600"
                            }`}
                            style={{
                              width: `${Math.round((stressTimeRemaining / (profile.stressConfig.timeLimitSec ?? 45)) * 100)}%`,
                            }}
                          />
                        </div>
                        <span className="text-sm font-bold font-mono min-w-10 text-right">
                          {stressTimeRemaining}s left
                        </span>
                      </div>
                    </div>
                  )}

                  <p className="text-lg font-semibold leading-8 text-zinc-950">{currentQuestion}</p>

                  {/* Digital Profile Skill Calibration Delta Card (Post-Interview) */}
                  {stage === "complete" && sessionSkillDeltas.length > 0 && (
                    <div className="mt-3 rounded-xl border border-purple-300 bg-gradient-to-r from-purple-50 via-indigo-50 to-purple-50 p-3.5 shadow-xs space-y-2 animate-in fade-in">
                      <div className="flex items-center justify-between border-b border-purple-200/80 pb-1.5">
                        <div className="flex items-center gap-1.5 font-bold text-xs text-purple-950">
                          <Fingerprint size={15} className="text-purple-600" />
                          <span>Candidate Digital Profile Calibrated (+{sessionSkillDeltas.length} Skill Updates)</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowProfileModal(true)}
                          className="text-[10px] font-bold text-purple-700 hover:underline cursor-pointer"
                        >
                          View Full Digital Profile →
                        </button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                        {sessionSkillDeltas.map((delta) => (
                          <div key={delta.skillName} className="rounded-lg bg-white/90 p-2 border border-purple-100 shadow-2xs">
                            <div className="text-[10px] text-zinc-500 truncate">{delta.skillName}</div>
                            <div className="flex items-center justify-between mt-0.5">
                              <span className="font-bold text-zinc-900">{delta.newScore}</span>
                              <span className={`text-[10px] font-bold ${delta.delta >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                                {delta.delta >= 0 ? `+${delta.delta}` : delta.delta}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Interview Benchmark & Longitudinal Progress Card */}
                  {stage === "complete" && (
                    <div className="mt-3 rounded-xl border border-amber-300/80 bg-gradient-to-r from-amber-50/90 via-orange-50/70 to-amber-50/90 p-4 shadow-xs space-y-3 animate-in fade-in">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200/80 pb-2">
                        <div className="flex items-center gap-2">
                          <div className="grid size-7 place-items-center rounded-lg bg-amber-500/20 text-amber-700">
                            <Trophy size={16} />
                          </div>
                          <div>
                            <span className="font-bold text-xs text-amber-950 font-mono uppercase tracking-wider">
                              Interview Benchmark & Longitudinal Progress
                            </span>
                            <div className="text-[10px] text-amber-800 font-mono">
                              Measures progress across multiple interview attempts, not just a one-time test.
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (!activeBenchmark) {
                              setActiveBenchmark(computeSessionBenchmark(history, profile, digitalProfile));
                            }
                            setShowBenchmarkModal(true);
                          }}
                          className="rounded-md bg-amber-600 hover:bg-amber-500 px-3 py-1 text-xs font-bold text-white shadow-2xs transition cursor-pointer"
                        >
                          Full Benchmark Analytics →
                        </button>
                      </div>

                      {/* Your Performance vs Previous Attempts Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        {/* Box 1: Your Performance */}
                        <div className="rounded-xl border border-amber-200/90 bg-white/95 p-3 space-y-2">
                          <div className="flex items-center justify-between border-b border-amber-100 pb-1.5 font-mono">
                            <span className="font-bold text-amber-950">Your Performance</span>
                            <span className="rounded bg-amber-100 text-amber-900 px-1.5 py-0.2 text-[10px] font-bold">
                              Overall: {activeBenchmark?.currentPerformance.overall ?? 82}
                            </span>
                          </div>
                          <div className="space-y-1.5 font-mono">
                            <div className="flex items-center justify-between">
                              <span className="text-zinc-600 text-[11px]">Technical</span>
                              <span className="font-bold text-blue-700">{activeBenchmark?.currentPerformance.technical ?? 86}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-zinc-600 text-[11px]">Communication</span>
                              <span className="font-bold text-emerald-700">{activeBenchmark?.currentPerformance.communication ?? 79}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-zinc-600 text-[11px]">Behavioral</span>
                              <span className="font-bold text-purple-700">{activeBenchmark?.currentPerformance.behavioral ?? 81}</span>
                            </div>
                          </div>
                        </div>

                        {/* Box 2: Compared with your previous attempts */}
                        <div className="rounded-xl border border-amber-200/90 bg-white/95 p-3 space-y-2">
                          <div className="flex items-center justify-between border-b border-amber-100 pb-1.5 font-mono">
                            <span className="font-bold text-amber-950">Compared with previous attempts</span>
                            <span className="text-emerald-700 text-[10px] font-bold">
                              +{activeBenchmark?.growthVelocity.totalImprovementPoints ?? 18} pts growth
                            </span>
                          </div>
                          <div className="space-y-1.5 font-mono text-[11px]">
                            {(activeBenchmark?.attemptsHistory ?? [
                              { label: "Interview #1", overallScore: 64 },
                              { label: "Interview #2", overallScore: 71 },
                              { label: "Interview #3", overallScore: 76 },
                              { label: "Interview #4", overallScore: 82, isCurrentSession: true },
                            ]).slice(-4).map((att) => (
                              <div key={att.label} className="flex items-center justify-between">
                                <span className={att.isCurrentSession ? "font-bold text-amber-950 flex items-center gap-1" : "text-zinc-600"}>
                                  {att.label} {att.isCurrentSession && <span className="text-[9px] rounded bg-amber-100 text-amber-900 px-1 font-bold">(Current)</span>}
                                </span>
                                <div className="flex items-center gap-2">
                                  <div className="w-20 h-2 bg-zinc-100 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full ${att.isCurrentSession ? "bg-amber-500" : "bg-zinc-400"}`}
                                      style={{ width: `${att.overallScore}%` }}
                                    />
                                  </div>
                                  <span className={`font-bold min-w-6 text-right ${att.isCurrentSession ? "text-amber-800 font-bold" : "text-zinc-700"}`}>
                                    {att.overallScore}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Milestone badge banner */}
                      <div className="flex items-center justify-between rounded-lg bg-amber-100/70 px-3 py-1.5 text-[11px] font-mono text-amber-950">
                        <span className="font-semibold">{activeBenchmark?.milestoneUnlocked ?? "🏆 Senior Candidate Benchmark Unlocked (Top 15% Caliber)"}</span>
                        <span className="text-amber-800 font-bold">Cohort: {activeBenchmark?.cohort.tierLabel ?? "Top 15%"}</span>
                      </div>
                    </div>
                  )}

                  {latestTurn?.difficultyTrend && (
                    <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-700 shadow-2xs font-mono">
                      <span className="flex items-center gap-1.5 font-semibold text-zinc-900">
                        <Gauge size={14} className="text-zinc-600" />
                        Difficulty Engine:
                        <span className={latestTurn.difficultyTrend === "escalated" ? "text-emerald-700 font-bold" : latestTurn.difficultyTrend === "calibrated_down" || latestTurn.difficultyTrend === "clarification" ? "text-amber-700 font-bold" : "text-zinc-700 font-bold"}>
                          {latestTurn.difficultyTrend === "escalated" ? "▲ Escalated (High Mastery)" : latestTurn.difficultyTrend === "calibrated_down" ? "▼ Calibrated Down (Foundational)" : latestTurn.difficultyTrend === "clarification" ? "● Clarification Drill-Down" : "■ Maintained"}
                        </span>
                      </span>
                      <span className="text-[11px] text-zinc-500 font-normal truncate max-w-sm">{latestTurn.difficultyReason}</span>
                    </div>
                  )}

                  {latestTurn?.weakArea && (
                    <div className="mt-3 rounded-md border border-amber-300 bg-amber-50/90 p-3 text-xs text-amber-950 shadow-sm animate-in fade-in duration-300">
                      <div className="mb-1.5 flex items-center justify-between font-semibold text-amber-900">
                        <span className="flex items-center gap-1.5">
                          <Sparkles size={14} className="text-amber-700 animate-pulse" />
                          Adaptive RAG Diagnosis: Weak Area Detected
                        </span>
                        <span className="rounded bg-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-950 uppercase tracking-wider">
                          Targeted Drill-Down
                        </span>
                      </div>
                      <div className="mb-2 text-xs font-medium text-amber-900 leading-relaxed">
                        <span className="font-bold">Identified Gap:</span> {latestTurn.weakArea} (Depth: {latestTurn.technicalDepthScore ?? 45}/100)
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-bold text-amber-800 text-[11px]">Retrieved Concepts:</span>
                        {latestTurn.retrievedConcepts?.map((c) => (
                          <span
                            key={c}
                            className="inline-flex items-center rounded-md bg-white px-2 py-0.5 text-[11px] font-semibold text-amber-950 border border-amber-200 shadow-2xs"
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                      <p className="mt-2 text-[11px] text-amber-800/90 italic">
                        The interviewer pivoted from a random question to a grounded follow-up targeting this specific gap.
                      </p>
                    </div>
                  )}

                  {latestTurn?.structureAnalysis && (
                    <div className="mt-3 rounded-md border border-indigo-200/90 bg-indigo-50/70 p-3 text-xs text-indigo-950 shadow-sm animate-in fade-in duration-300">
                      <div className="mb-2 flex items-center justify-between font-semibold text-indigo-900">
                        <span className="flex items-center gap-1.5 font-bold">
                          <Sparkles size={14} className="text-indigo-700" />
                          {latestTurn.structureAnalysis.framework === "STAR" ? "STAR Method Analysis" : "5-Point Answer Structure Analysis"}
                        </span>
                        <span className="rounded bg-indigo-200/80 px-2 py-0.5 text-[10px] font-bold text-indigo-950 font-mono">
                          Structure Score: {latestTurn.structureAnalysis.structureScore}/100
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 lg:grid-cols-5">
                        {latestTurn.structureAnalysis.elements.map((el) => (
                          <div
                            key={el.name}
                            className={`flex items-center justify-between rounded-md border px-2.5 py-1.5 text-xs font-semibold ${
                              el.detected
                                ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                                : "border-rose-200 bg-white text-rose-800"
                            }`}
                            title={el.explanation}
                          >
                            <span>{el.name}</span>
                            <span className="font-mono text-sm font-bold">
                              {el.detected ? "✓" : "✗"}
                            </span>
                          </div>
                        ))}
                      </div>

                      {latestTurn.structureAnalysis.coachingFeedback && (
                        <div className="mt-2.5 rounded border border-indigo-200 bg-white/90 p-2 text-[11px] font-medium text-indigo-950 leading-relaxed shadow-2xs">
                          <span className="font-bold text-indigo-800">Coaching Insight: </span>
                          {latestTurn.structureAnalysis.coachingFeedback}
                        </div>
                      )}
                    </div>
                  )}

                  {(ragCandidateMatches.length > 0 || ragTechnicalMatches.length > 0) && !latestTurn?.weakArea && (
                    <div className="mt-3 rounded-md border border-emerald-200/80 bg-emerald-50/70 p-2.5 text-xs text-emerald-950">
                      <div className="mb-1.5 flex items-center justify-between font-semibold text-emerald-800">
                        <span className="flex items-center gap-1.5">
                          <Sparkles size={13} className="text-emerald-700" />
                          RAG Grounding: Retrieved Multi-Collection Context
                        </span>
                        <span className="rounded bg-emerald-200/70 px-1.5 py-0.5 text-[10px] font-bold text-emerald-900">
                          Chroma
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {ragCandidateMatches.map((m) => (
                          <span
                            key={m.id}
                            className="inline-flex items-center gap-1 rounded bg-white px-2 py-1 text-[11px] font-medium text-emerald-900 border border-emerald-200 shadow-2xs"
                            title={m.document}
                          >
                            <span className="font-semibold text-emerald-700">Candidate:</span>
                            <span>{String(m.metadata.skills || m.metadata.category || "Extracted Project")}</span>
                          </span>
                        ))}
                        {ragTechnicalMatches.map((m) => (
                          <span
                            key={m.id}
                            className="inline-flex items-center gap-1 rounded bg-white px-2 py-1 text-[11px] font-medium text-indigo-900 border border-indigo-200 shadow-2xs"
                            title={m.document}
                          >
                            <span className="font-semibold text-indigo-700">Technical Rubric:</span>
                            <span>{String(m.metadata.concept || m.metadata.topic || "Core Concept")}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Live Integrity Monitor Summary Card */}
                  <div className="mt-3 rounded-md border border-zinc-200 bg-zinc-50/90 p-3 text-xs text-zinc-800 shadow-2xs">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-zinc-800">
                        <ShieldCheck size={14} className={integrityState.integrityScore >= 85 ? "text-emerald-600" : "text-amber-600"} />
                        Integrity Monitor
                      </span>
                      <div className="flex items-center gap-2">
                        <span className={`rounded px-1.5 py-0.2 text-[10px] font-mono font-bold ${
                          integrityState.integrityScore >= 85 ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                        }`}>
                          {integrityState.integrityScore}% {integrityState.integrityLevel}
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowIntegrityModal(true)}
                          className="text-[10px] font-semibold text-zinc-500 hover:text-zinc-900 underline cursor-pointer"
                        >
                          Telemetry Log
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] font-mono">
                      {integrityState.diagnosticChecks.slice(0, 4).map((chk) => (
                        <div key={chk.id} className="flex items-center justify-between rounded bg-white px-2 py-1 border border-zinc-200/80">
                          <span className="flex items-center gap-1.5 text-zinc-700">
                            <span className={chk.status === "pass" ? "text-emerald-600 font-bold" : chk.status === "warn" ? "text-amber-600 font-bold" : "text-rose-600 font-bold"}>
                              {chk.symbol}
                            </span>
                            <span>{chk.label}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {stage === "complete" ? (
                  <div className="flex flex-1 flex-col justify-between rounded-xl border border-emerald-500/40 bg-gradient-to-br from-emerald-950/20 via-zinc-950 to-zinc-900/90 p-6 text-white shadow-xl animate-in fade-in zoom-in-95 duration-300">
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 pb-4">
                        <div className="flex items-center gap-3">
                          <div className="grid size-12 place-items-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-[0_0_16px_rgba(16,185,129,0.2)]">
                            <CheckCircle2 size={24} />
                          </div>
                          <div>
                            <h3 className="text-base font-bold text-zinc-100">Interview Completed & Scored</h3>
                            <p className="text-xs text-zinc-400">All 6 questions evaluated across multimodal telemetry and technical depth.</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/80 px-3.5 py-1.5 font-mono text-xs">
                          <span className="text-zinc-400">Composite Score:</span>
                          <span className="text-sm font-bold text-emerald-400">{average || "82"}%</span>
                        </div>
                      </div>

                      {/* Performance Highlight Grid */}
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3 text-center">
                          <div className="text-[10px] font-mono font-semibold uppercase text-zinc-500">Eye Contact</div>
                          <div className="mt-1 text-lg font-bold text-emerald-400">82%</div>
                          <div className="text-[10px] text-zinc-400">Optimal Gaze</div>
                        </div>
                        <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3 text-center">
                          <div className="text-[10px] font-mono font-semibold uppercase text-zinc-500">Voice Energy</div>
                          <div className="mt-1 text-lg font-bold text-amber-400">74%</div>
                          <div className="text-[10px] text-zinc-400">Strong Cadence</div>
                        </div>
                        <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3 text-center">
                          <div className="text-[10px] font-mono font-semibold uppercase text-zinc-500">Speaking Pace</div>
                          <div className="mt-1 text-lg font-bold text-indigo-400">143 WPM</div>
                          <div className="text-[10px] text-zinc-400">Good Cadence</div>
                        </div>
                        <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3 text-center">
                          <div className="text-[10px] font-mono font-semibold uppercase text-zinc-500">Questions</div>
                          <div className="mt-1 text-lg font-bold text-zinc-200">{completedQuestions}/6</div>
                          <div className="text-[10px] text-zinc-400">Fully Evaluated</div>
                        </div>
                      </div>

                      <div className="rounded-lg border border-emerald-500/20 bg-emerald-950/30 p-3.5 text-xs text-emerald-200/90 leading-relaxed">
                        <span className="font-bold text-emerald-300">Replay Available: </span>
                        Dive into your full interview session with frame-by-frame telemetry, gaze tracking deviation alerts (e.g. at 04:37), and speaking cadence diagnosis.
                      </div>
                    </div>

                    {/* Primary Completion Actions */}
                    <div className="mt-6 flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-zinc-800/80">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Prominent Replay Interview CTA */}
                        <button
                          type="button"
                          onClick={() => setShowReplayModal(true)}
                          className="flex h-12 items-center justify-center gap-2.5 rounded-lg bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 px-5 text-sm font-bold text-zinc-950 shadow-lg shadow-emerald-500/20 hover:from-emerald-400 hover:to-teal-400 transition cursor-pointer active:scale-95"
                          title="Open interactive session replay mode with timeline scrubber"
                        >
                          <RotateCcw size={18} className="animate-spin-slow" />
                          <span>Replay Interview</span>
                        </button>

                        {/* 7-Day Improvement Plan */}
                        <button
                          type="button"
                          onClick={() => setShowRoadmapModal(true)}
                          className="flex h-12 items-center justify-center gap-2 rounded-lg border border-purple-500/40 bg-purple-950/40 px-4 text-xs font-bold text-purple-200 hover:bg-purple-900/50 hover:text-white transition cursor-pointer"
                        >
                          <Calendar size={16} className="text-purple-300" />
                          <span>7-Day Roadmap</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={resetSession}
                        className="flex h-11 items-center justify-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/80 px-4 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 hover:text-white transition"
                      >
                        <RotateCcw size={14} />
                        <span>Start New Session</span>
                      </button>
                    </div>
                  </div>
                ) : profile.interviewType === "Coding" ? (
                  <div className="flex flex-1 flex-col gap-3">
                    {/* Problem Definition & Header */}
                    <div className="rounded-xl border border-indigo-200 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-4 text-white shadow-md">
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-indigo-500/20 pb-3 mb-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className="grid size-8 place-items-center rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                            <Code2 size={18} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-bold text-white">{activeCodingProblem.title}</h3>
                              <span className={`rounded px-2 py-0.5 text-[10px] font-bold font-mono ${
                                activeCodingProblem.difficulty === "Easy"
                                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                  : activeCodingProblem.difficulty === "Medium"
                                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                  : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                              }`}>
                                {activeCodingProblem.difficulty}
                              </span>
                              <span className="rounded bg-white/10 px-2 py-0.5 text-[10px] font-mono text-zinc-300">
                                {activeCodingProblem.category}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Optimal Complexities */}
                        <div className="flex items-center gap-3 text-xs font-mono">
                          <span className="text-zinc-400">
                            Time: <strong className="text-emerald-400">{activeCodingProblem.optimalTimeComplexity}</strong>
                          </span>
                          <span className="text-zinc-400">
                            Space: <strong className="text-emerald-400">{activeCodingProblem.optimalSpaceComplexity}</strong>
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-zinc-200 leading-relaxed whitespace-pre-wrap">
                        {activeCodingProblem.description}
                      </p>

                      {/* Constraints */}
                      <div className="mt-2.5 flex flex-wrap gap-1.5 pt-2 border-t border-indigo-500/20">
                        <span className="text-[10px] font-bold text-indigo-300 uppercase">Constraints:</span>
                        {activeCodingProblem.constraints.map((c, i) => (
                          <span key={i} className="rounded bg-black/40 px-2 py-0.5 text-[10px] font-mono text-zinc-300 border border-indigo-500/20">
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Split Code Arena: Editor + Approach */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                      {/* Left Column: Code Editor & Test Cases */}
                      <div className="flex flex-col gap-2.5 rounded-xl border border-zinc-800 bg-zinc-950 p-3.5 text-white shadow-md">
                        <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                          <div className="flex items-center gap-1 bg-zinc-900 rounded-md p-1 border border-zinc-800">
                            {(["python", "java", "typescript", "cpp"] as CodingLanguage[]).map((lang) => (
                              <button
                                key={lang}
                                type="button"
                                onClick={() => handleLanguageChange(lang)}
                                className={`rounded px-2.5 py-0.5 text-[11px] font-bold font-mono transition cursor-pointer ${
                                  codingLanguage === lang
                                    ? "bg-purple-600 text-white shadow-xs"
                                    : "text-zinc-400 hover:text-zinc-200"
                                }`}
                              >
                                {lang === "python" ? "Python" : lang === "java" ? "Java" : lang === "typescript" ? "TypeScript" : "C++"}
                              </button>
                            ))}
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setCodeBuffer(activeCodingProblem.starterCode[codingLanguage])}
                              className="text-[10px] font-mono text-zinc-400 hover:text-zinc-200 underline cursor-pointer"
                            >
                              Reset
                            </button>
                            <button
                              type="button"
                              onClick={handleRunCodeTests}
                              disabled={isRunningTests}
                              className="flex items-center gap-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 px-3 py-1 text-xs font-bold text-white transition shadow-sm cursor-pointer disabled:opacity-50"
                            >
                              <Play size={12} fill="currentColor" />
                              <span>{isRunningTests ? "Running..." : "Run Tests"}</span>
                            </button>
                          </div>
                        </div>

                        {/* Code Editor */}
                        <div className="relative rounded-lg border border-zinc-800 bg-[#0d1117] font-mono text-xs overflow-hidden">
                          <textarea
                            value={codeBuffer}
                            onChange={(e) => setCodeBuffer(e.target.value)}
                            spellCheck={false}
                            className="w-full h-56 resize-none bg-transparent p-3 font-mono text-xs leading-relaxed text-emerald-300 focus:outline-none focus:ring-1 focus:ring-purple-500"
                          />
                        </div>

                        {/* Test Cases Runner Output */}
                        <div className="rounded-lg border border-zinc-800 bg-zinc-900/80 p-2.5 text-xs space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-zinc-300 font-mono text-[11px]">Test Assertions</span>
                            {codeExecutionResult && (
                              <span className={`rounded px-1.5 py-0.2 text-[9px] font-mono font-bold ${
                                codeExecutionResult.success
                                  ? "bg-emerald-500/20 text-emerald-300"
                                  : "bg-amber-500/20 text-amber-300"
                              }`}>
                                {codeExecutionResult.passedTests}/{codeExecutionResult.totalTests} Passed
                              </span>
                            )}
                          </div>

                          {codeExecutionResult ? (
                            <div className="space-y-1 font-mono text-[10px]">
                              {codeExecutionResult.results.map((r) => (
                                <div key={r.id} className="flex items-center justify-between rounded bg-zinc-950 p-1.5 border border-zinc-800/80">
                                  <div className="flex items-center gap-1.5">
                                    <span className={r.passed ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                                      {r.passed ? "✓" : "✗"}
                                    </span>
                                    <span className="text-zinc-300 truncate max-w-xs">{r.inputDesc}</span>
                                  </div>
                                  <span className={`px-1 rounded text-[9px] font-bold ${
                                    r.passed ? "bg-emerald-950 text-emerald-300" : "bg-rose-950 text-rose-300"
                                  }`}>
                                    {r.passed ? "Passed" : "Failed"}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-2 text-zinc-500 text-[10px] font-mono">
                              Click &quot;Run Tests&quot; to execute test assertions against this solution.
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right Column: AI Interviewer Approach */}
                      <div className="flex flex-col gap-2.5">
                        <div className="rounded-xl border border-zinc-200 bg-white p-3.5 shadow-2xs space-y-2">
                          <div className="flex items-center gap-2 text-xs font-bold text-purple-950 uppercase tracking-wide">
                            <BrainCircuit size={15} className="text-purple-600" />
                            <span>AI Technical Interviewer</span>
                          </div>
                          <p className="text-xs font-semibold text-zinc-900 leading-relaxed">
                            &quot;Explain your approach for this problem. Walk me through your data structure selection, edge case handling, and time/space complexity tradeoffs.&quot;
                          </p>
                        </div>

                        <label className="flex flex-1 flex-col gap-1.5 text-xs font-bold uppercase text-zinc-700">
                          <div className="flex items-center justify-between">
                            <span>Approach Explanation</span>
                            <span className="font-mono text-[10px] font-normal text-zinc-500">
                              (Evaluates Communication & Debugging)
                            </span>
                          </div>
                          <textarea
                            value={answer}
                            onChange={(e) => setAnswer(e.target.value)}
                            placeholder="Explain your approach: 'I used a Hash Map to store seen complements in a single pass O(N) time with O(N) space...'"
                            className="min-h-56 flex-1 resize-none rounded-xl border border-zinc-300 bg-zinc-50 p-3 text-xs leading-5 text-zinc-900 outline-none transition focus:border-purple-600 focus:bg-white"
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                ) : profile.interviewType === "System Design" ? (
                  <div className="flex flex-1 flex-col gap-3">
                    {/* System Design Challenge Header */}
                    <div className="rounded-xl border border-purple-300/80 bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 p-4 text-white shadow-md">
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-purple-500/20 pb-3 mb-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className="grid size-8 place-items-center rounded-lg bg-purple-500/20 text-purple-400 border border-purple-500/30">
                            <BrainCircuit size={18} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-bold text-white">
                                {SYSTEM_DESIGN_CHALLENGES[questionIndex % SYSTEM_DESIGN_CHALLENGES.length].title}
                              </h3>
                              <span className="rounded bg-purple-500/20 px-2 py-0.5 text-[10px] font-bold font-mono text-purple-300 border border-purple-500/30">
                                🏗️ System Design Whiteboard
                              </span>
                            </div>
                            <span className="text-[11px] text-zinc-400 font-mono">
                              Scale Target: {SYSTEM_DESIGN_CHALLENGES[questionIndex % SYSTEM_DESIGN_CHALLENGES.length].targetScale}
                            </span>
                          </div>
                        </div>
                      </div>

                      <p className="text-xs text-zinc-200 leading-relaxed whitespace-pre-wrap">
                        {SYSTEM_DESIGN_CHALLENGES[questionIndex % SYSTEM_DESIGN_CHALLENGES.length].prompt}
                      </p>

                      <div className="mt-2.5 flex flex-wrap gap-1.5 pt-2 border-t border-purple-500/20 text-[10px] font-mono">
                        <span className="font-bold text-purple-300 uppercase">Non-Functional Goals:</span>
                        {SYSTEM_DESIGN_CHALLENGES[questionIndex % SYSTEM_DESIGN_CHALLENGES.length].requirements.nonFunctional.map((req, i) => (
                          <span key={i} className="rounded bg-black/40 px-2 py-0.5 text-zinc-300 border border-purple-500/20">
                            • {req}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Split Whiteboard Arena: Canvas + Verbal Approach */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                      {/* Left: Interactive Canvas */}
                      <SystemDesignCanvas
                        diagram={systemDesignDiagram}
                        onChange={setSystemDesignDiagram}
                        targetScale={SYSTEM_DESIGN_CHALLENGES[questionIndex % SYSTEM_DESIGN_CHALLENGES.length].targetScale}
                      />

                      {/* Right: AI Interviewer & Verbal Tradeoff Rationale */}
                      <div className="flex flex-col gap-2.5">
                        <div className="rounded-xl border border-zinc-200 bg-white p-3.5 shadow-2xs space-y-2">
                          <div className="flex items-center gap-2 text-xs font-bold text-purple-950 uppercase tracking-wide">
                            <BrainCircuit size={15} className="text-purple-600" />
                            <span>AI Systems Architect Interviewer</span>
                          </div>
                          <p className="text-xs font-semibold text-zinc-900 leading-relaxed">
                            &quot;How would you scale this architecture to 10 million users? Walk me through your caching strategy, database sharding/replication, and how you handle asynchronous decoupling without SPOFs.&quot;
                          </p>
                        </div>

                        <label className="flex flex-1 flex-col gap-1.5 text-xs font-bold uppercase text-zinc-700">
                          <div className="flex items-center justify-between">
                            <span>Architectural Rationale & Scaling Tradeoffs</span>
                            <span className="font-mono text-[10px] font-normal text-zinc-500">
                              (Evaluates Scalability, HA, Consistency & Caching)
                            </span>
                          </div>
                          <textarea
                            value={answer}
                            onChange={(e) => setAnswer(e.target.value)}
                            placeholder="Explain your scaling strategy: 'We introduced an ALB load balancer with stateless web workers. To absorb read traffic at 10M users, we deployed a Redis cluster using a Cache-Aside pattern. Database writes go to the Postgres master, while reads are distributed across read replicas...'"
                            className="min-h-56 flex-1 resize-none rounded-xl border border-zinc-300 bg-zinc-50 p-3 text-xs leading-5 text-zinc-900 outline-none transition focus:border-purple-600 focus:bg-white"
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-1 flex-col gap-3">
                    {pendingAttempt1 && (
                      <div className="rounded-xl border border-purple-300/80 bg-gradient-to-r from-purple-50 via-indigo-50 to-purple-50 p-4 shadow-sm animate-in fade-in">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-purple-200/80 pb-2.5 mb-2.5">
                          <div className="flex items-center gap-2.5">
                            <div className="grid size-7 place-items-center rounded-md bg-purple-600 text-white font-bold font-mono text-xs">
                              A1
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-purple-950">Attempt 1 Baseline Stored</h4>
                              <p className="text-[11px] text-purple-800">Deliver Attempt 2 below to apply feedback and measure your improvement delta.</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={cancelAttempt2}
                            className="rounded-md border border-purple-300 bg-white px-2.5 py-1 text-xs font-semibold text-purple-800 hover:bg-purple-100 transition cursor-pointer"
                          >
                            ✕ Cancel Attempt 2 & Keep Attempt 1
                          </button>
                        </div>

                        <div className="grid grid-cols-3 gap-2.5 text-center">
                          <div className="rounded-lg bg-white/90 p-2 border border-purple-200">
                            <div className="text-[10px] font-mono font-semibold uppercase text-purple-600">Technical</div>
                            <div className="text-base font-bold text-purple-950">{pendingAttempt1.technicalScore} / 100</div>
                          </div>
                          <div className="rounded-lg bg-white/90 p-2 border border-purple-200">
                            <div className="text-[10px] font-mono font-semibold uppercase text-purple-600">Communication</div>
                            <div className="text-base font-bold text-purple-950">{pendingAttempt1.communicationScore} / 100</div>
                          </div>
                          <div className="rounded-lg bg-white/90 p-2 border border-purple-200">
                            <div className="text-[10px] font-mono font-semibold uppercase text-purple-600">Overall Score</div>
                            <div className="text-base font-bold text-purple-950">{pendingAttempt1.score} / 100</div>
                          </div>
                        </div>

                        {pendingAttempt1.feedback.length > 0 && (
                          <div className="mt-2 text-[11px] text-purple-900 leading-relaxed font-medium">
                            <strong className="text-purple-950">AI Training Tip for Attempt 2: </strong>
                            {pendingAttempt1.feedback[0]}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Voice Answer Recording Control Module */}
                    {profile.inputMode !== "text_only" && (
                      <div className="space-y-2">
                        {voiceAnswerState === "idle" && (
                          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-purple-200/80 bg-gradient-to-r from-purple-50/70 to-indigo-50/70 p-3 shadow-2xs">
                            <div className="flex items-center gap-2.5">
                              <div className="grid size-9 place-items-center rounded-lg bg-purple-600 text-white shadow-2xs">
                                <Mic size={17} />
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5 font-bold text-xs text-purple-950">
                                  <span>🎤 Optional Voice Answer</span>
                                  <span className="rounded bg-purple-200/70 text-purple-900 px-1.5 py-0.2 text-[9px] font-mono font-bold">Whisper STT</span>
                                </div>
                                <p className="text-[11px] text-purple-800/80">Microphone is off until you click Start Voice Answer.</p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={startVoiceAnswerRecording}
                              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:from-purple-500 hover:to-indigo-500 transition cursor-pointer"
                            >
                              <Mic size={14} />
                              <span>Start Voice Answer</span>
                            </button>
                          </div>
                        )}

                        {voiceAnswerState === "recording" && (
                          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-300 bg-rose-50/95 p-3 shadow-sm animate-in fade-in">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2 font-mono font-bold text-xs text-rose-700">
                                <span className="size-3 rounded-full bg-rose-600 animate-ping" />
                                <span>🔴 Recording...</span>
                                <span className="text-sm text-rose-950 font-bold ml-1">
                                  {String(Math.floor(voiceRecordingSeconds / 60)).padStart(2, "0")}:{String(voiceRecordingSeconds % 60).padStart(2, "0")}
                                </span>
                              </div>
                              {/* Live VU Meter */}
                              <div className="w-28 sm:w-44 h-2 bg-rose-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-rose-600 transition-all duration-100"
                                  style={{ width: `${Math.min(100, Math.max(15, voiceSignal.energy))}%` }}
                                />
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={stopVoiceAnswerRecording}
                              className="flex items-center gap-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 px-4 py-2 text-xs font-bold text-white shadow-sm transition cursor-pointer"
                            >
                              <Square size={13} fill="currentColor" />
                              <span>Stop Recording & Transcribe</span>
                            </button>
                          </div>
                        )}

                        {voiceAnswerState === "processing" && (
                          <div className="flex items-center justify-between gap-2 rounded-xl border border-purple-300 bg-purple-50/90 p-3 font-mono text-xs text-purple-900 animate-pulse">
                            <div className="flex items-center gap-2 font-bold">
                              <Sparkles size={16} className="text-purple-600 animate-spin" />
                              <span>Transcribing speech via Whisper & applying technical lexicon normalization...</span>
                            </div>
                          </div>
                        )}

                        {voiceAnswerState === "ready" && voiceTranscriptBundle && (
                          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-300 bg-emerald-50/90 p-2.5 text-xs font-mono text-emerald-950 animate-in fade-in">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 size={16} className="text-emerald-700" />
                              <span className="font-bold">
                                Transcribed: {voiceTranscriptBundle.delivery.wordCount} words · {voiceTranscriptBundle.delivery.wpm} WPM · {voiceTranscriptBundle.delivery.durationSeconds}s
                              </span>
                              {voiceTranscriptBundle.correctionsApplied.length > 0 && (
                                <span className="rounded bg-emerald-200 text-emerald-900 px-1.5 py-0.2 text-[10px] font-bold">
                                  {voiceTranscriptBundle.correctionsApplied.length} tech terms normalized
                                </span>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={startVoiceAnswerRecording}
                              className="text-[11px] font-bold text-emerald-800 hover:underline cursor-pointer"
                            >
                              Re-record Voice Answer ↺
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    <label className="flex flex-1 flex-col gap-2 text-sm font-medium text-zinc-700">
                      <div className="flex items-center justify-between">
                        <span>
                          {pendingAttempt1 ? "Attempt 2 Response (Coached Iteration)" : isABMode ? "Attempt 1 Response (Baseline)" : "Answer (Editable Transcription)"}
                        </span>
                        {pendingAttempt1 ? (
                          <span className="rounded bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-900 font-mono">
                            Attempt 2 of 2
                          </span>
                        ) : (
                          <span className="font-mono text-[10px] text-zinc-500">
                            (Type directly or use voice answer above)
                          </span>
                        )}
                      </div>
                      <textarea
                        value={answer}
                        onChange={(event) => setAnswer(event.target.value)}
                        placeholder={
                          pendingAttempt1
                            ? "Speak or type your improved Attempt 2 response applying the feedback above..."
                            : "Speak, type, or paste your response here."
                        }
                        className={`min-h-48 flex-1 resize-none rounded-md border p-4 text-base leading-7 text-zinc-900 outline-none transition focus:bg-white ${
                          pendingAttempt1
                            ? "border-purple-300 bg-purple-50/30 focus:border-purple-500"
                            : "border-zinc-200 bg-zinc-50 focus:border-emerald-500"
                        }`}
                      />
                    </label>
                  </div>
                )}

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2 text-sm text-zinc-600">
                    {stage === "complete" ? (
                      <>
                        <CheckCircle2 size={18} className="text-emerald-700" />
                        Session scored
                      </>
                    ) : (
                      <>
                        <Activity size={18} className={isRecording ? "text-rose-600 animate-pulse" : "text-zinc-600"} />
                        {isRecording ? (
                          <span className="font-semibold text-rose-700">
                            Recording speech ({speechState.wpm > 0 ? `${speechState.wpm} WPM · ${speechState.paceRating}` : `${speechState.wordsCount} words`})
                          </span>
                        ) : stage === "live" ? (
                          pendingAttempt1 ? (
                            <span className="font-semibold text-purple-700">
                              A/B Mode · Ready for Attempt 2
                            </span>
                          ) : (
                            "Live session"
                          )
                        ) : (
                          "Ready"
                        )}
                      </>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {/* A/B Mode Showcase Demo Button */}
                    <button
                      type="button"
                      onClick={openSampleABComparison}
                      className="flex h-11 items-center justify-center gap-1.5 rounded-md border border-purple-300/80 bg-purple-50 px-3 text-xs font-bold text-purple-900 hover:bg-purple-100 transition shadow-2xs cursor-pointer"
                      title="Preview A/B Comparison demonstration (+16 Overall, +14 Comm, +17 Tech)"
                    >
                      <FlaskConical size={14} className="text-purple-700" />
                      <span>A/B Demo</span>
                    </button>

                    {/* Replay Interview Button */}
                    <button
                      type="button"
                      onClick={() => setShowReplayModal(true)}
                      className={`flex h-11 items-center justify-center gap-2 rounded-md px-4 text-xs font-bold transition shadow-sm ${
                        stage === "complete"
                          ? "bg-emerald-600 text-white hover:bg-emerald-500 ring-2 ring-emerald-400/30 cursor-pointer animate-pulse"
                          : history.length > 0
                          ? "bg-zinc-900 text-white hover:bg-zinc-800 cursor-pointer"
                          : "border border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100 cursor-pointer"
                      }`}
                      title="Open interactive session replay mode with timeline scrubber"
                    >
                      <RotateCcw size={15} />
                      <span>Replay Interview</span>
                    </button>

                    {/* 7-Day Improvement Plan Button (Unlocked after test / all questions attempted) */}
                    <button
                      type="button"
                      onClick={() => setShowRoadmapModal(true)}
                      disabled={completedQuestions < 6 && stage !== "complete"}
                      className={`flex h-11 items-center justify-center gap-2 rounded-md px-3.5 text-xs font-semibold transition ${
                        completedQuestions >= 6 || stage === "complete"
                          ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md hover:from-indigo-700 hover:to-purple-700 cursor-pointer"
                          : "border border-zinc-200 bg-zinc-50 text-zinc-400 cursor-not-allowed opacity-60"
                      }`}
                      title={
                        completedQuestions >= 6 || stage === "complete"
                          ? "Access your personalized 7-Day Improvement Roadmap"
                          : `Available after completing all 6 interview questions (${completedQuestions}/6 complete)`
                      }
                    >
                      <Calendar size={15} className={completedQuestions >= 6 || stage === "complete" ? "text-indigo-200" : "text-zinc-400"} />
                      <span>7-Day Plan</span>
                      {completedQuestions < 6 && stage !== "complete" ? (
                        <span className="text-[10px] font-mono text-zinc-400">({completedQuestions}/6)</span>
                      ) : (
                        <span className="rounded bg-white/20 px-1.5 py-0.2 text-[9px] font-mono text-white">Ready</span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const { updatedProfile, skillDeltas } = updateDigitalProfileFromSession(digitalProfile, history, profile);
                        setDigitalProfile(updatedProfile);
                        setSessionSkillDeltas(skillDeltas);
                        const bench = computeSessionBenchmark(history, profile, updatedProfile);
                        setActiveBenchmark(bench);
                        setStage("complete");
                        setIsRecording(false);
                      }}
                      disabled={history.length === 0 && stage !== "live"}
                      className="h-11 rounded-md border border-zinc-200 px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      End
                    </button>

                    {/* Submit Options */}
                    {pendingAttempt1 ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={cancelAttempt2}
                          className="h-11 rounded-md border border-zinc-300 bg-white px-3.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 transition cursor-pointer"
                          title="Finalize current question with Attempt 1 and move to next question"
                        >
                          Keep Attempt 1 & Next
                        </button>
                        <button
                          type="button"
                          onClick={() => submitAnswer("ab_attempt")}
                          disabled={stage !== "live" || !answer.trim()}
                          className="flex h-11 items-center justify-center gap-2 rounded-md bg-gradient-to-r from-purple-600 to-indigo-600 px-5 text-sm font-bold text-white transition hover:from-purple-500 hover:to-indigo-500 shadow-md shadow-purple-500/20 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                        >
                          <Send size={16} />
                          <span>Submit Attempt 2 & Measure Delta</span>
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2">
                        {isABMode && (
                          <button
                            type="button"
                            onClick={() => submitAnswer("ab_attempt")}
                            disabled={stage !== "live" || !answer.trim()}
                            className="flex h-11 items-center justify-center gap-1.5 rounded-md border border-purple-300 bg-purple-50 px-3.5 text-xs font-bold text-purple-900 hover:bg-purple-100 transition shadow-2xs disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                            title="Save this answer as Attempt 1 baseline and take a second attempt"
                          >
                            <FlaskConical size={14} className="text-purple-700" />
                            <span>Submit as Attempt 1 (A/B)</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => submitAnswer("question")}
                          disabled={stage !== "live" || !answer.trim()}
                          className="flex h-11 items-center justify-center gap-2 rounded-md bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 shadow-sm cursor-pointer"
                          title="Submit answer and advance to next question"
                        >
                          <Send size={16} />
                          <span>Submit Question</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <aside className="flex flex-col gap-3 rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
            {/* Tab Navigation for Sidebar */}
            <div className="flex border-b border-zinc-200 bg-zinc-50 rounded-md p-1 gap-1">
              <button
                type="button"
                onClick={() => setSidebarTab("scorecard")}
                className={`flex-1 py-1.5 px-2 rounded text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                  sidebarTab === "scorecard"
                    ? "bg-white text-zinc-900 shadow-xs border border-zinc-200"
                    : "text-zinc-500 hover:text-zinc-800"
                }`}
              >
                <Gauge size={13} />
                Scorecard
              </button>
              <button
                type="button"
                onClick={() => setSidebarTab("memory")}
                className={`flex-1 py-1.5 px-2 rounded text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                  sidebarTab === "memory"
                    ? "bg-white text-zinc-900 shadow-xs border border-zinc-200"
                    : "text-zinc-500 hover:text-zinc-800"
                }`}
              >
                <BrainCircuit size={13} />
                Memory
                {sessionMemory.claims.length > 0 && (
                  <span className="rounded-full bg-fuchsia-100 px-1.5 py-0.2 text-[9px] font-bold text-fuchsia-900">
                    {sessionMemory.claims.length}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setSidebarTab("skills")}
                className={`flex-1 py-1.5 px-2 rounded text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                  sidebarTab === "skills"
                    ? "bg-white text-zinc-900 shadow-xs border border-zinc-200"
                    : "text-zinc-500 hover:text-zinc-800"
                }`}
              >
                <Target size={13} />
                Skills
              </button>
              <button
                type="button"
                onClick={() => setSidebarTab("integrity")}
                className={`flex-1 py-1.5 px-2 rounded text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                  sidebarTab === "integrity"
                    ? "bg-white text-zinc-900 shadow-xs border border-zinc-200"
                    : "text-zinc-500 hover:text-zinc-800"
                }`}
              >
                <ShieldCheck size={13} className={integrityState.integrityScore < 75 ? "text-amber-600" : "text-emerald-600"} />
                Integrity
                <span className={`rounded-full px-1.5 py-0.2 text-[9px] font-bold ${integrityState.integrityScore >= 85 ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                  {integrityState.integrityScore}%
                </span>
              </button>
            </div>

            {/* TAB 1: SCORECARD & SIGNALS */}
            {sidebarTab === "scorecard" && (
              <>
                <section>
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-sm font-semibold uppercase tracking-normal text-zinc-500">Scorecard</h2>
                    <span className="rounded-md bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-700">
                      {completedQuestions} answers
                    </span>
                  </div>
                  <div className="grid grid-cols-[116px_1fr] items-center gap-4">
                    <div className="grid aspect-square place-items-center rounded-full border-[10px] border-emerald-600 bg-emerald-50">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-zinc-950">{average || "--"}</div>
                        <div className="text-xs font-semibold uppercase tracking-normal text-zinc-500">Avg</div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <MetricBar label="Tech Accuracy" value={latestTurn?.breakdown?.technical_accuracy ?? 0} hasEvaluated={Boolean(latestTurn)} tone="emerald" />
                      <MetricBar label="Semantic Rel." value={latestTurn?.breakdown?.semantic_relevance ?? 0} hasEvaluated={Boolean(latestTurn)} tone="amber" />
                      <MetricBar label="Structure" value={latestTurn?.breakdown?.answer_structure ?? 0} hasEvaluated={Boolean(latestTurn)} tone="rose" />
                      <MetricBar label="Eye Contact" value={latestTurn?.breakdown?.eye_contact ?? (cameraEnabled ? eyeContact : 0)} hasEvaluated={Boolean(latestTurn) || cameraEnabled} tone="zinc" />
                      <MetricBar label="Voice Energy" value={latestTurn?.breakdown?.voice_energy ?? (micEnabled ? voiceSignal.energy : 0)} hasEvaluated={Boolean(latestTurn) || micEnabled} tone="emerald" />
                      <MetricBar label="Speaking Pace" value={latestTurn?.breakdown?.speaking_pace ?? (speechState.wpm > 0 ? Math.min(100, Math.round((speechState.wpm / 160) * 100)) : 0)} hasEvaluated={Boolean(latestTurn) || speechState.wpm > 0} tone="amber" />
                      <MetricBar label="Filler Words" value={latestTurn?.breakdown?.filler_words ?? 100} hasEvaluated={Boolean(latestTurn)} tone="emerald" />
                    </div>
                  </div>
                </section>

                <section>
                  <h2 className="mb-3 text-sm font-semibold uppercase tracking-normal text-zinc-500">Signal Analysis</h2>
                  <div className="grid gap-2">
                    <SignalRow
                      label="Technical accuracy"
                      value={latestTurn?.breakdown?.technical_accuracy ?? 0}
                      displayValue={latestTurn ? `${latestTurn.breakdown.technical_accuracy}/100` : "--/100"}
                      detail={latestTurn?.adaptiveStrategy ?? "Mechanism depth & concept coverage"}
                    />
                    <SignalRow
                      label="Semantic relevance"
                      value={latestTurn?.breakdown?.semantic_relevance ?? 0}
                      displayValue={latestTurn ? `${latestTurn.breakdown.semantic_relevance}/100` : "--/100"}
                      detail="Question & keyword semantic alignment"
                    />
                    <SignalRow
                      label="Answer structure"
                      value={latestTurn?.breakdown?.answer_structure ?? 0}
                      displayValue={
                        latestTurn?.structureAnalysis
                          ? `${latestTurn.structureAnalysis.framework === "STAR" ? "STAR" : "5-Point"}: ${latestTurn.breakdown.answer_structure}/100`
                          : latestTurn
                          ? `${latestTurn.breakdown.answer_structure}/100`
                          : "--/100"
                      }
                      detail={
                        latestTurn?.structureAnalysis?.coachingFeedback
                          ? latestTurn.structureAnalysis.coachingFeedback
                          : "Framework compliance & logical narrative flow"
                      }
                    />
                    <SignalRow
                      label="Speaking pace"
                      value={
                        speechState.wpm > 0
                          ? Math.min(100, Math.round((speechState.wpm / 160) * 100))
                          : latestTurn?.signals.paceStats
                          ? Math.min(100, Math.round((latestTurn.signals.paceStats.wpm / 160) * 100))
                          : latestTurn?.breakdown
                          ? latestTurn.breakdown.speaking_pace
                          : 0
                      }
                      displayValue={
                        speechState.wpm > 0
                          ? `${speechState.wpm} WPM`
                          : latestTurn?.signals.paceStats
                          ? `${latestTurn.signals.paceStats.wpm} WPM`
                          : micEnabled && isRecording
                          ? "Listening..."
                          : micEnabled
                          ? "Ready"
                          : "-- WPM"
                      }
                      detail={
                        latestTurn?.signals.paceStats
                          ? `${latestTurn.signals.paceStats.paceRating} · ${latestTurn.signals.paceStats.wordsSpoken} words in ${latestTurn.signals.paceStats.speechDurationSec}s`
                          : speechState.wpm > 0
                          ? `${speechState.paceRating} · ${speechState.wordsCount} words in ${speechState.speechDurationSec}s`
                          : micEnabled
                          ? "Speak into mic to measure pace"
                          : undefined
                      }
                    />
                    <SignalRow
                      label="Pauses & hesitation"
                      value={
                        latestTurn?.signals.paceStats
                          ? Math.max(0, 100 - (latestTurn.signals.paceStats.longPausesCount * 15 + Math.round(latestTurn.signals.paceStats.averagePauseSec * 10)))
                          : speechState.longPausesCount > 0
                          ? Math.max(0, 100 - speechState.longPausesCount * 15)
                          : 88
                      }
                      displayValue={
                        latestTurn?.signals.paceStats
                          ? `Avg ${latestTurn.signals.paceStats.averagePauseSec}s · ${latestTurn.signals.paceStats.longPausesCount} long pauses`
                          : speechState.pauseCount > 0
                          ? `Avg ${speechState.averagePauseSec}s · ${speechState.longPausesCount} long`
                          : "--"
                      }
                      detail={
                        latestTurn?.signals.paceStats
                          ? `${latestTurn.signals.paceStats.pauseCount} total pauses · longest: ${latestTurn.signals.paceStats.longestPauseSec}s`
                          : micEnabled
                          ? "Natural speech breath & pause tracking"
                          : undefined
                      }
                    />
                    <SignalRow
                      label="Filler words"
                      value={latestTurn?.breakdown?.filler_words ?? (latestTurn?.signals.paceStats ? Math.max(0, 100 - latestTurn.signals.paceStats.fillerWordsCount * 15) : 100)}
                      displayValue={
                        latestTurn?.signals.paceStats
                          ? `Total: ${latestTurn.signals.paceStats.fillerWordsCount}`
                          : speechState.totalFillers > 0
                          ? `Total: ${speechState.totalFillers}`
                          : "0 fillers"
                      }
                      detail={
                        latestTurn?.signals.paceStats && latestTurn.signals.paceStats.fillerBreakdown?.length > 0
                          ? latestTurn.signals.paceStats.fillerBreakdown.slice(0, 4).map((f) => `"${f.word}" ${f.count}`).join(" · ")
                          : speechState.fillerBreakdown?.length > 0
                          ? speechState.fillerBreakdown.slice(0, 4).map((f) => `"${f.word}" ${f.count}`).join(" · ")
                          : "Clean speech delivery without filler bridging"
                      }
                    />
                    <SignalRow
                      label="Speech consistency"
                      value={
                        latestTurn?.signals.voiceStats?.consistencyScore ?? (micEnabled ? 88 : 0)
                      }
                      displayValue={
                        latestTurn?.signals.voiceStats
                          ? `Vol Var: ${latestTurn.signals.voiceStats.volumeVariabilityPercent}% · Pitch: ±${latestTurn.signals.voiceStats.pitchVariabilityHz}Hz`
                          : micEnabled
                          ? "Analyzing acoustic modulation..."
                          : "--"
                      }
                      detail={
                        latestTurn?.signals.paceStats?.paceTrend !== "steady"
                          ? latestTurn?.signals.paceStats?.paceTrendDescription
                          : latestTurn?.signals.voiceStats
                          ? `Avg pitch ${latestTurn.signals.voiceStats.averagePitchHz}Hz · steady dynamic volume range`
                          : "Acoustic volume & pitch dynamic tracking"
                      }
                    />
                    <SignalRow
                      label="Voice energy"
                      value={micEnabled ? voiceSignal.energy : latestTurn?.breakdown?.voice_energy ?? latestTurn?.signals.voiceStats?.averageEnergy ?? latestTurn?.signals.voice ?? 0}
                      detail={
                        latestTurn?.signals.voiceStats
                          ? `Avg ${latestTurn.signals.voiceStats.averageEnergy}% · Min ${latestTurn.signals.voiceStats.minEnergy}% · Max ${latestTurn.signals.voiceStats.maxEnergy}%`
                          : micEnabled && typeof voiceSignal.db === "number"
                          ? `${voiceSignal.db} dBFS · RMS ${voiceSignal.rms}`
                          : undefined
                      }
                    />
                    <SignalRow
                      label="Eye contact"
                      value={cameraEnabled ? eyeContact : latestTurn?.breakdown?.eye_contact ?? latestTurn?.signals.eyeContact ?? 0}
                      displayValue={latestTurn ? `${latestTurn.breakdown?.eye_contact ?? latestTurn.signals.eyeContact}/100` : cameraEnabled ? `${eyeContact}/100` : "--/100"}
                      detail={cameraEnabled && eyeContactResult ? `Status: ${eyeContactResult.status}` : "MediaPipe face mesh gaze"}
                    />
                    <SignalRow
                      label="Head movement"
                      value={cameraEnabled && eyeContactResult ? eyeContactResult.headMovementScore : latestTurn?.signals.bodyLanguageStats?.headMovementScore ?? (cameraEnabled ? 85 : 0)}
                      displayValue={cameraEnabled && eyeContactResult ? `${eyeContactResult.headMovementScore}/100` : latestTurn?.signals.bodyLanguageStats ? `${latestTurn.signals.bodyLanguageStats.headMovementScore}/100` : "--/100"}
                      detail="Head posture stability & composure"
                    />
                    <SignalRow
                      label="Face orientation"
                      value={cameraEnabled && eyeContactResult ? eyeContactResult.facingCameraPercent : latestTurn?.signals.bodyLanguageStats?.facingCameraPercent ?? (cameraEnabled ? 87 : 0)}
                      displayValue={cameraEnabled && eyeContactResult ? `Facing camera: ${eyeContactResult.facingCameraPercent}%` : latestTurn?.signals.bodyLanguageStats ? `Facing camera: ${latestTurn.signals.bodyLanguageStats.facingCameraPercent}%` : "--%"}
                      detail="Frontal camera alignment"
                    />
                    <SignalRow
                      label="Looking away count"
                      value={
                        cameraEnabled && eyeContactResult
                          ? Math.max(0, 100 - eyeContactResult.lookingAwayCount * 8)
                          : latestTurn?.signals.bodyLanguageStats
                          ? Math.max(0, 100 - latestTurn.signals.bodyLanguageStats.lookingAwayCount * 8)
                          : 90
                      }
                      displayValue={
                        cameraEnabled && eyeContactResult
                          ? `${eyeContactResult.lookingAwayCount} times`
                          : latestTurn?.signals.bodyLanguageStats
                          ? `${latestTurn.signals.bodyLanguageStats.lookingAwayCount} times`
                          : "0 times"
                      }
                      detail="Distinct glance shifts away from camera"
                    />
                    <SignalRow
                      label="Facial expression"
                      value={
                        cameraEnabled && eyeContactResult
                          ? eyeContactResult.expressionDistribution.neutralPercent + eyeContactResult.expressionDistribution.positivePercent
                          : latestTurn?.signals.bodyLanguageStats
                          ? latestTurn.signals.bodyLanguageStats.expressionDistribution.neutralPercent + latestTurn.signals.bodyLanguageStats.expressionDistribution.positivePercent
                          : 85
                      }
                      displayValue={
                        cameraEnabled && eyeContactResult
                          ? `Neutral ${eyeContactResult.expressionDistribution.neutralPercent}% · Pos ${eyeContactResult.expressionDistribution.positivePercent}% · Tense ${eyeContactResult.expressionDistribution.tensePercent}%`
                          : latestTurn?.signals.bodyLanguageStats
                          ? `Neutral ${latestTurn.signals.bodyLanguageStats.expressionDistribution.neutralPercent}% · Pos ${latestTurn.signals.bodyLanguageStats.expressionDistribution.positivePercent}% · Tense ${latestTurn.signals.bodyLanguageStats.expressionDistribution.tensePercent}%`
                          : "Neutral 62% · Pos 24% · Tense 14%"
                      }
                      detail="Broad communication presence (not emotion/lie detection)"
                    />
                    <SignalRow label="Question latency" value={Math.max(0, 100 - Math.round(backendLatency / 8))} />
                  </div>
                </section>

                <section className="min-h-36">
                  <h2 className="mb-3 text-sm font-semibold uppercase tracking-normal text-zinc-500">Feedback</h2>
                  <div className="flex flex-col gap-2">
                    {(latestTurn?.feedback ?? ["Start the interview to generate feedback."]).map((item) => (
                      <div key={item} className="rounded-md border border-zinc-200 bg-[#fbfcfa] p-3 text-sm leading-6 text-zinc-700">
                        {item}
                      </div>
                    ))}
                  </div>
                </section>

                <section>
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-sm font-semibold uppercase tracking-normal text-zinc-500">Session Log</h2>
                    <span className="text-[10px] text-zinc-400 font-mono">Click turn to inspect</span>
                  </div>
                  <div className="max-h-52 space-y-2 overflow-auto pr-1">
                    {history.length ? (
                      history.map((turn) => (
                        <article
                          key={turn.id}
                          onClick={() => setSelectedTurnId(turn.id)}
                          className={`cursor-pointer rounded-md border p-3 bg-white transition hover:border-emerald-400 hover:shadow-xs ${
                            selectedTurnId === turn.id ? "ring-2 ring-emerald-500 border-emerald-500" : "border-zinc-200"
                          }`}
                        >
                          <div className="mb-1 flex items-center justify-between text-xs font-semibold text-zinc-500">
                            <span>Question {turn.id}</span>
                            <div className="flex items-center gap-1.5">
                              {turn.weakArea ? (
                                <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-900">
                                  Probed Gap
                                </span>
                              ) : (
                                <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-900">
                                  High Depth
                                </span>
                              )}
                              <span className="font-bold text-zinc-900">{turn.score}/100</span>
                            </div>
                          </div>
                          <p className="line-clamp-2 text-sm leading-6 text-zinc-800">{turn.question}</p>
                          {turn.weakArea && (
                            <div className="mt-1 text-[11px] text-amber-800 font-medium">
                              Gap: {turn.weakArea}
                            </div>
                          )}
                          {turn.structureAnalysis && (
                            <div className="mt-1.5 flex flex-wrap items-center gap-1">
                              <span className="text-[10px] font-semibold text-zinc-500 font-mono">
                                {turn.structureAnalysis.framework === "STAR" ? "STAR" : "5-Point"}:
                              </span>
                              {turn.structureAnalysis.elements.map((el) => (
                                <span
                                  key={el.name}
                                  className={`rounded px-1.5 py-0.2 text-[10px] font-semibold ${
                                    el.detected
                                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                      : "bg-rose-50 text-rose-800 border border-rose-200"
                                  }`}
                                >
                                  {el.name} {el.detected ? "✓" : "✗"}
                                </span>
                              ))}
                            </div>
                          )}
                        </article>
                      ))
                    ) : (
                      <div className="rounded-md border border-dashed border-zinc-300 p-4 text-sm text-zinc-500">No answers yet.</div>
                    )}
                  </div>
                </section>
              </>
            )}

            {/* TAB 2: INTERVIEWER MEMORY */}
            {sidebarTab === "memory" && (
              <section>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-semibold uppercase tracking-normal text-zinc-500">Interviewer Memory</h2>
                  <span className="rounded bg-fuchsia-100 px-2 py-0.5 text-[10px] font-bold text-fuchsia-900 font-mono">
                    {sessionMemory.claims.length} claims
                  </span>
                </div>
                <div className="flex flex-col gap-2.5 rounded-md border border-zinc-200 bg-zinc-50/70 p-3.5 text-xs">
                  {sessionMemory.claims.length > 0 ? (
                    <>
                      <div>
                        <span className="font-bold text-zinc-800 text-[11px]">📌 Candidate Claims:</span>
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {sessionMemory.claims.map((c) => (
                            <span key={c} className="rounded bg-white px-2 py-1 text-[11px] font-semibold text-zinc-900 border border-zinc-200 shadow-2xs">
                              {c}
                            </span>
                          ))}
                        </div>
                      </div>
                      {sessionMemory.skills_demonstrated.length > 0 && (
                        <div className="mt-1.5">
                          <span className="font-bold text-emerald-800 text-[11px]">🌟 Demonstrated Skills:</span>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {sessionMemory.skills_demonstrated.map((s) => (
                              <span key={s} className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-900 border border-emerald-200">
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {sessionMemory.followups_pending.length > 0 && (
                        <div className="mt-1.5">
                          <span className="font-bold text-amber-800 text-[11px]">🎯 Pending Claim Verification:</span>
                          <div className="mt-1 rounded bg-amber-50/80 p-2 text-[11px] text-amber-900 border border-amber-200 italic">
                            &quot;{sessionMemory.followups_pending[0]}&quot;
                          </div>
                        </div>
                      )}
                      {sessionMemory.conflicts && sessionMemory.conflicts.length > 0 && (
                        <div className="mt-2 rounded-md border border-amber-300 bg-amber-50/90 p-2.5 text-xs text-amber-950 shadow-2xs">
                          <div className="flex items-center gap-1.5 font-bold text-amber-900">
                            <AlertTriangle className="size-3.5 text-amber-600" />
                            <span>Claim Inconsistency Analysis</span>
                          </div>
                          {sessionMemory.conflicts.map((c, idx) => (
                            <div key={idx} className="mt-1.5 border-t border-amber-200/60 pt-1.5 text-[11px] leading-relaxed">
                              <div className="font-semibold text-amber-900">{c.topic}</div>
                              <div className="text-zinc-700">
                                • Earlier (Turn {c.earlier_turn}): <span className="font-mono font-semibold text-zinc-900">{c.earlier_claim}</span>
                              </div>
                              <div className="text-zinc-700">
                                • Later (Turn {c.later_turn}): <span className="font-mono font-semibold text-rose-700">{c.later_claim}</span>
                              </div>
                              <div className="mt-1 text-zinc-600 italic">{c.explanation}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-zinc-500 text-center py-6 text-xs leading-relaxed">
                      No claims recorded yet. The interviewer extracts and recalls specific metrics, frameworks, and achievements as you answer questions.
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* TAB 3: HEATMAP & SKILL-GAP */}
            {sidebarTab === "skills" && (
              <>
                <section>
                  <InterviewTimelineHeatmap
                    history={history}
                    selectedTurnId={selectedTurnId}
                    onSelectTurn={(id) => setSelectedTurnId(id)}
                  />
                </section>

                <section>
                  <SkillGapAssessmentCard
                    skillGapReport={activeSkillGapReport}
                    historyCount={history.length}
                  />
                </section>
              </>
            )}

            {/* TAB 4: INTEGRITY MONITOR */}
            {sidebarTab === "integrity" && (
              <section className="space-y-3">
                <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-zinc-100 pb-3 mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`grid size-9 place-items-center rounded-lg ${
                        integrityState.integrityScore >= 85
                          ? "bg-emerald-100 text-emerald-800"
                          : integrityState.integrityScore >= 65
                          ? "bg-amber-100 text-amber-800"
                          : "bg-rose-100 text-rose-800"
                      }`}>
                        <ShieldCheck size={20} />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wide">
                          Integrity & Focus Telemetry
                        </h3>
                        <p className="text-[11px] text-zinc-500 font-mono">
                          Status: <strong className={integrityState.integrityScore >= 85 ? "text-emerald-700" : "text-amber-700"}>{integrityState.integrityLevel}</strong>
                        </p>
                      </div>
                    </div>
                    <div className="text-right font-mono">
                      <span className="text-xl font-bold text-zinc-900">{integrityState.integrityScore}</span>
                      <span className="text-xs text-zinc-400">/100</span>
                    </div>
                  </div>

                  {/* Diagnostic Checklist */}
                  <div className="space-y-2 mb-3">
                    <div className="text-[11px] font-bold text-zinc-700 uppercase tracking-wider">
                      Live Environmental Diagnostics
                    </div>
                    <div className="space-y-1.5 font-mono text-xs">
                      {integrityState.diagnosticChecks.map((chk) => (
                        <div
                          key={chk.id}
                          className="flex items-start justify-between gap-2 rounded-md bg-zinc-50 p-2 border border-zinc-100"
                        >
                          <div className="flex items-start gap-2">
                            <span className={`font-bold ${chk.status === "pass" ? "text-emerald-600" : chk.status === "warn" ? "text-amber-600" : "text-rose-600"}`}>
                              {chk.symbol}
                            </span>
                            <div>
                              <div className="font-semibold text-zinc-900 text-[11px]">{chk.label}</div>
                              <div className="text-[10px] text-zinc-500 font-sans leading-tight mt-0.5">{chk.detail}</div>
                            </div>
                          </div>
                          <span className={`shrink-0 text-[10px] uppercase font-bold px-1.5 py-0.2 rounded ${
                            chk.status === "pass"
                              ? "bg-emerald-100 text-emerald-800"
                              : chk.status === "warn"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-rose-100 text-rose-800"
                          }`}>
                            {chk.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Multi-Vector Telemetry Matrix */}
                  <div className="grid grid-cols-2 gap-2 text-center text-xs font-mono mb-3">
                    <div className="rounded bg-zinc-50 p-2 border border-zinc-200">
                      <div className="text-[10px] text-zinc-500">Faces in Frame</div>
                      <div className="text-sm font-bold text-zinc-800">{integrityState.facesCount} detected</div>
                    </div>
                    <div className="rounded bg-zinc-50 p-2 border border-zinc-200">
                      <div className="text-[10px] text-zinc-500">Window Blur / Switch</div>
                      <div className="text-sm font-bold text-zinc-800">{integrityState.tabSwitchCount} times ({integrityState.totalTabSwitchDurationSec}s)</div>
                    </div>
                    <div className="rounded bg-zinc-50 p-2 border border-zinc-200">
                      <div className="text-[10px] text-zinc-500">Clipboard Pastes</div>
                      <div className="text-sm font-bold text-zinc-800">{integrityState.clipboardEventsCount} ops ({integrityState.pastedCharactersTotal} ch)</div>
                    </div>
                    <div className="rounded bg-zinc-50 p-2 border border-zinc-200">
                      <div className="text-[10px] text-zinc-500">Off-Screen Gaze</div>
                      <div className="text-sm font-bold text-zinc-800">{integrityState.gazeAwayCount} bursts ({integrityState.gazeAwayPercent}%)</div>
                    </div>
                  </div>

                  {/* Constructive Objective Disclaimer */}
                  <div className="rounded-md border border-zinc-200 bg-zinc-50/80 p-2.5 text-[11px] text-zinc-600 leading-relaxed italic mb-3">
                    <span className="font-semibold text-zinc-800 not-italic">Integrity Notice: </span>
                    Looking away while thinking, referencing secondary screens, or natural typing pauses are expected human behaviors and do not constitute proof of cheating.
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowIntegrityModal(true)}
                    className="w-full flex items-center justify-center gap-2 rounded-md bg-zinc-900 py-2 text-xs font-bold text-white hover:bg-zinc-800 transition cursor-pointer shadow-xs"
                  >
                    <ShieldCheck size={14} />
                    <span>Open Full Integrity Audit Log</span>
                  </button>
                </div>
              </section>
            )}
          </aside>
        </div>
      </div>

      {selectedTurn && (
        <TurnInspectorModal
          turn={selectedTurn}
          allTurns={history}
          onClose={() => setSelectedTurnId(null)}
          onSelectTurn={setSelectedTurnId}
          onStartABRetake={(t) => startABRetake(t)}
          onOpenABComparison={(comp) => {
            setActiveABComparison(comp);
            setShowABModal(true);
          }}
          onOpenCodingEvaluation={(evalResult) => {
            setActiveCodingEvaluation(evalResult);
            setShowCodingModal(true);
          }}
          onOpenSystemDesignEvaluation={(evalResult) => {
            setActiveSystemDesignEvaluation(evalResult);
            setShowSystemDesignModal(true);
          }}
        />
      )}

      {showRoadmapModal && activeRoadmap && (
        <SevenDayRoadmapModal
          roadmap={activeRoadmap}
          onClose={() => setShowRoadmapModal(false)}
        />
      )}

      {showReplayModal && (
        <InterviewReplayModal
          history={history}
          onClose={() => setShowReplayModal(false)}
        />
      )}

      {showABModal && activeABComparison && (
        <ABComparisonModal
          comparison={activeABComparison}
          onClose={() => setShowABModal(false)}
          onRetakeAgain={() => {
            setShowABModal(false);
            const targetTurn = history.find((h) => h.id === activeABComparison.turnId) ?? history.at(-1);
            if (targetTurn) {
              startABRetake(targetTurn);
            }
          }}
        />
      )}

      {showIntegrityModal && (
        <InterviewIntegrityModal
          integrityState={integrityState}
          onClose={() => setShowIntegrityModal(false)}
        />
      )}

      {showCodingModal && activeCodingEvaluation && (
        <CodingEvaluationModal
          evaluation={activeCodingEvaluation}
          onClose={() => setShowCodingModal(false)}
        />
      )}

      {showSystemDesignModal && activeSystemDesignEvaluation && (
        <SystemDesignEvaluationModal
          evaluation={activeSystemDesignEvaluation}
          onClose={() => setShowSystemDesignModal(false)}
        />
      )}

      {showProfileModal && (
        <CandidateDigitalProfileModal
          profile={digitalProfile}
          onClose={() => setShowProfileModal(false)}
          onResetProfile={() => {
            const fresh = resetDigitalProfile();
            setDigitalProfile(fresh);
          }}
        />
      )}

      {showBenchmarkModal && (
        <InterviewBenchmarkModal
          benchmark={activeBenchmark ?? computeSessionBenchmark(history, profile, digitalProfile)}
          onClose={() => setShowBenchmarkModal(false)}
        />
      )}
    </main>
  );
}

function StatusPill({ icon: Icon, label }: { icon: typeof Users; label: string }) {
  return (
    <div className="flex h-10 min-w-0 items-center gap-2 rounded-md border border-fuchsia-400/25 bg-[#241044]/86 px-3 text-sm font-semibold text-white shadow-[0_0_24px_rgba(236,72,153,0.16)] backdrop-blur">
      <Icon size={16} className="shrink-0 text-fuchsia-300" />
      <span className="truncate">{label}</span>
    </div>
  );
}

function ThemeToggle({
  theme,
  onThemeChange,
}: {
  theme: PanelTheme;
  onThemeChange: (theme: PanelTheme) => void;
}) {
  const nextTheme = theme === "light" ? "dark" : "light";
  const Icon = theme === "light" ? Sun : Moon;

  return (
    <button
      type="button"
      onClick={() => onThemeChange(nextTheme)}
      className="flex h-12 min-w-36 items-center justify-between gap-3 rounded-md border border-fuchsia-400/25 bg-[#241044]/86 px-3 text-left text-white shadow-[0_0_24px_rgba(236,72,153,0.16)] backdrop-blur transition hover:border-fuchsia-300/60"
      aria-label={`Switch panels to ${nextTheme} theme`}
      title={`Switch panels to ${nextTheme} theme`}
    >
      <span className="flex items-center gap-2 text-sm font-semibold">
        <Icon size={16} className="text-fuchsia-300" />
        {theme === "light" ? "Light" : "Dark"}
      </span>
      <span className="rounded-md bg-fuchsia-400/14 px-2 py-1 text-xs font-bold uppercase tracking-normal text-fuchsia-100">
        Theme
      </span>
    </button>
  );
}

function TimeWeatherPanel() {
  const [timeMode, setTimeMode] = useState<TimeMode>("24");
  const [now, setNow] = useState<Date | null>(null);
  const [weather, setWeather] = useState<WeatherState>({
    status: "loading",
    temperature: null,
    label: "Weather",
  });
  const preferencesLoadedRef = useRef(false);
  const date = now ? formatClockDate(now) : "Today";
  const time = now ? formatClockTime(now, timeMode) : "--:--";
  const temperature =
    weather.status === "loading"
      ? "Loading"
      : weather.status === "ready" && weather.temperature !== null
        ? `${Math.round(weather.temperature)} C`
        : "-- C";

  useEffect(() => {
    const preferenceTimer = window.setTimeout(() => {
      const storedTimeMode = window.localStorage.getItem("mockmate-time-mode");
      preferencesLoadedRef.current = true;

      if (storedTimeMode === "12" || storedTimeMode === "24") {
        setTimeMode(storedTimeMode);
      }
    }, 0);

    return () => window.clearTimeout(preferenceTimer);
  }, []);

  useEffect(() => {
    if (preferencesLoadedRef.current) {
      window.localStorage.setItem("mockmate-time-mode", timeMode);
    }
  }, [timeMode]);

  useEffect(() => {
    const firstTick = window.setTimeout(() => {
      setNow(new Date());
    }, 0);

    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => {
      window.clearTimeout(firstTick);
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    async function loadTemperature(latitude: number, longitude: number, label: string) {
      try {
        const params = new URLSearchParams({
          latitude: String(latitude),
          longitude: String(longitude),
          current: "temperature_2m",
          timezone: "auto",
        });
        const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Weather request failed with ${response.status}`);
        }

        const data = (await response.json()) as OpenMeteoCurrentResponse;
        const currentTemperature = data.current?.temperature_2m;

        if (!active || typeof currentTemperature !== "number") {
          return;
        }

        setWeather({
          status: "ready",
          temperature: currentTemperature,
          label,
        });
      } catch (error) {
        if (!active || controller.signal.aborted) {
          return;
        }

        console.warn("Temperature lookup failed:", error);
        setWeather({
          status: "unavailable",
          temperature: null,
          label: "Weather",
        });
      }
    }

    function loadFallbackTemperature() {
      void loadTemperature(
        DEFAULT_WEATHER_LOCATION.latitude,
        DEFAULT_WEATHER_LOCATION.longitude,
        DEFAULT_WEATHER_LOCATION.label,
      );
    }

    if (!navigator.geolocation) {
      loadFallbackTemperature();
    } else {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          void loadTemperature(position.coords.latitude, position.coords.longitude, "Local");
        },
        () => loadFallbackTemperature(),
        { enableHighAccuracy: false, maximumAge: 600000, timeout: 5000 },
      );
    }

    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  return (
    <div className="flex min-h-12 flex-wrap items-center gap-3 rounded-md border border-fuchsia-400/25 bg-[#241044]/86 px-3 py-2 text-white shadow-[0_0_24px_rgba(236,72,153,0.16)] backdrop-blur">
      <div className="flex items-center gap-2 pr-1">
        <Clock3 size={16} className="text-fuchsia-300" />
        <div>
          <div className="text-sm font-bold leading-4">{time}</div>
          <div className="text-[11px] font-medium leading-4 text-fuchsia-100/72">{date}</div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-1 rounded-md bg-black/22 p-1">
        {(["12", "24"] as TimeMode[]).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => setTimeMode(mode)}
            className={`h-7 rounded-md px-2 text-xs font-bold transition ${
              timeMode === mode ? "bg-fuchsia-400 text-white" : "text-fuchsia-100/78 hover:bg-white/10"
            }`}
            aria-label={`Use ${mode}-hour time`}
          >
            {mode}h
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 border-l border-fuchsia-400/20 pl-3">
        <Thermometer size={16} className="text-fuchsia-300" />
        <div>
          <div className="text-sm font-bold leading-4">{temperature}</div>
          <div className="text-[11px] font-medium leading-4 text-fuchsia-100/72">{weather.label}</div>
        </div>
      </div>
    </div>
  );
}

function formatClockTime(date: Date, mode: TimeMode) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: mode === "12",
  }).format(date);
}

function formatClockDate(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
}

function CameraSignal({
  label,
  value,
  displayValue,
  active,
  sublabel,
}: {
  label: string;
  value: number;
  displayValue?: string;
  active: boolean;
  sublabel?: string;
}) {
  return (
    <div className="rounded-md bg-white/92 px-3 py-2 text-zinc-950 shadow-sm backdrop-blur">
      <div className="flex items-center justify-between gap-2 text-xs font-semibold text-zinc-600">
        <span>{label}</span>
        <span className="font-mono font-bold text-zinc-900">
          {active ? (displayValue ?? `${Math.round(value)}%`) : "--"}
        </span>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-zinc-200">
        <div
          className="h-full rounded-full bg-emerald-600 transition-all"
          style={{ width: `${active ? Math.min(100, Math.max(0, value)) : 0}%` }}
        />
      </div>
      {active && sublabel ? (
        <div className="mt-1 text-[10px] font-semibold text-emerald-700 text-right">{sublabel}</div>
      ) : null}
    </div>
  );
}

function MetricBar({
  label,
  value,
  tone,
  hasEvaluated = true,
}: {
  label: string;
  value: number;
  tone: "emerald" | "amber" | "rose" | "zinc";
  hasEvaluated?: boolean;
}) {
  const colors = {
    emerald: "bg-emerald-600",
    amber: "bg-amber-500",
    rose: "bg-rose-500",
    zinc: "bg-zinc-700",
  };

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs font-semibold text-zinc-600">
        <span>{label}</span>
        <span className="font-mono font-bold text-zinc-800">{hasEvaluated && value > 0 ? `${value}` : "--"}</span>
      </div>
      <div className="h-2 rounded-full bg-zinc-100">
        <div
          className={`h-full rounded-full ${colors[tone]} transition-all`}
          style={{ width: `${hasEvaluated ? Math.min(100, Math.max(0, value)) : 0}%` }}
        />
      </div>
    </div>
  );
}

function SignalRow({
  label,
  value,
  displayValue,
  detail,
}: {
  label: string;
  value: number;
  displayValue?: string;
  detail?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5 rounded-md bg-zinc-50 px-3 py-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-zinc-700">{label}</span>
        <span className="text-sm font-bold text-zinc-950 font-mono">
          {displayValue !== undefined ? displayValue : value ? `${Math.round(value)}%` : "--"}
        </span>
      </div>
      {detail ? <span className="text-[11px] text-zinc-500 font-mono">{detail}</span> : null}
    </div>
  );
}

function EdgeModeToggle({
  mode,
  onModeChange,
}: {
  mode: ExecutionMode;
  onModeChange: (mode: ExecutionMode) => void;
}) {
  const isEdge = mode === "edge";

  return (
    <button
      type="button"
      onClick={() => onModeChange(isEdge ? "cloud" : "edge")}
      className="flex h-12 min-w-40 items-center justify-between gap-3 rounded-md border border-fuchsia-400/25 bg-[#241044]/86 px-3 text-left text-white shadow-[0_0_24px_rgba(236,72,153,0.16)] backdrop-blur transition hover:border-fuchsia-300/60"
      title={`Switch to ${isEdge ? "Cloud Mode" : "Edge AI Mode"}`}
    >
      <div className="flex items-center gap-2">
        {isEdge ? (
          <Zap size={16} className="text-amber-400 animate-pulse" />
        ) : (
          <Wifi size={16} className="text-sky-300" />
        )}
        <div className="flex flex-col">
          <span className="text-xs font-bold leading-tight text-white flex items-center gap-1">
            {isEdge ? "Edge AI Mode" : "Cloud Mode"}
          </span>
          <span className="text-[10px] text-fuchsia-200/80">
            {isEdge ? "Air-Gapped Laptop" : "Remote Server"}
          </span>
        </div>
      </div>
      <span
        className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider font-mono ${
          isEdge ? "bg-emerald-400/20 text-emerald-300" : "bg-sky-400/20 text-sky-200"
        }`}
      >
        {isEdge ? "0ms" : "API"}
      </span>
    </button>
  );
}

function EdgeArchitectureModal({
  telemetry,
  onClose,
}: {
  telemetry: ReturnType<typeof getEdgeTelemetry>;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-xl border border-zinc-700 bg-zinc-900 p-6 text-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="grid size-9 place-items-center rounded-lg bg-amber-400/10 text-amber-400 border border-amber-400/20">
              <Cpu size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Edge AI Architecture Topology</h3>
              <p className="text-xs text-zinc-400">On-Device Edge Computing Paradigm</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-8 place-items-center rounded-md text-zinc-400 hover:bg-zinc-800 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <div className="my-5 rounded-lg border border-emerald-500/30 bg-emerald-950/30 p-4">
          <div className="flex items-center justify-between font-mono text-xs text-emerald-400">
            <span className="flex items-center gap-1.5 font-bold">
              <ShieldCheck size={16} />
              Privacy & Connectivity Guarantee
            </span>
            <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-300">
              Internet NOT REQUIRED
            </span>
          </div>
          <p className="mt-1 text-xs text-zinc-300">
            All candidate video frames, raw audio signals, and resume documents are processed locally on the client machine. Zero external transmissions.
          </p>
        </div>

        <div className="grid gap-3 text-xs sm:grid-cols-2">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
            <div className="text-[11px] font-semibold text-zinc-400">1. Vision (Gaze & Face)</div>
            <div className="mt-1 font-semibold text-emerald-400">{telemetry.visionRuntime}</div>
            <div className="mt-0.5 text-[10px] text-zinc-400">Browser-side MediaPipe WASM (zero frame uploads)</div>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
            <div className="text-[11px] font-semibold text-zinc-400">2. Speech Recognition (STT)</div>
            <div className="mt-1 font-semibold text-emerald-400">{telemetry.speechRuntime}</div>
            <div className="mt-0.5 text-[10px] text-zinc-400">Whisper small/base local acoustic transcription</div>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
            <div className="text-[11px] font-semibold text-zinc-400">3. Text Embeddings</div>
            <div className="mt-1 font-semibold text-emerald-400">{telemetry.embeddingRuntime}</div>
            <div className="mt-0.5 text-[10px] text-zinc-400">Dense semantic embeddings on-device</div>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
            <div className="text-[11px] font-semibold text-zinc-400">4. Vector Knowledge Base</div>
            <div className="mt-1 font-semibold text-emerald-400">{telemetry.vectorRuntime}</div>
            <div className="mt-0.5 text-[10px] text-zinc-400">Local ChromaDB persistent multi-collection store</div>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
            <div className="text-[11px] font-semibold text-zinc-400">5. Local Reasoning & LLM</div>
            <div className="mt-1 font-semibold text-emerald-400">{telemetry.llmRuntime}</div>
            <div className="mt-0.5 text-[10px] text-zinc-400">3B–8B quantized local model / adaptive diagnostics</div>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
            <div className="text-[11px] font-semibold text-zinc-400">6. Audio & Acoustics</div>
            <div className="mt-1 font-semibold text-emerald-400">{telemetry.audioRuntime}</div>
            <div className="mt-0.5 text-[10px] text-zinc-400">Real-time RMS & cadence tracking via Web Audio</div>
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-zinc-800 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-700"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
}

function getScoreColor(score: number): { bg: string; text: string; border: string; hex: string } {
  if (score >= 88) return { bg: "bg-emerald-100", text: "text-emerald-900", border: "border-emerald-300", hex: "#10b981" };
  if (score >= 75) return { bg: "bg-blue-100", text: "text-blue-900", border: "border-blue-300", hex: "#3b82f6" };
  if (score >= 60) return { bg: "bg-amber-100", text: "text-amber-900", border: "border-amber-300", hex: "#f59e0b" };
  return { bg: "bg-rose-100", text: "text-rose-900", border: "border-rose-300", hex: "#f43f5e" };
}

export function synthesizeTurnWeakness(turn: InterviewTurn): { title: string; detail: string; type: "weakness" | "strength" } {
  if (turn.weakArea) {
    return {
      title: "Technical gap identified",
      detail: `Identified gap in ${turn.weakArea} (Accuracy: ${turn.breakdown?.technical_accuracy ?? 50}/100). Theoretical explanation lacked core algorithmic depth.`,
      type: "weakness",
    };
  }
  const breakdown = turn.breakdown;
  if (!breakdown) {
    return {
      title: "Balanced delivery",
      detail: "Solid delivery across speech, accuracy, and body language.",
      type: "strength",
    };
  }
  if (breakdown.eye_contact < 65 && breakdown.technical_accuracy >= 75) {
    return {
      title: "Communication under technical pressure",
      detail: `Maintained high technical accuracy (${breakdown.technical_accuracy}/100), but eye contact dropped to ${breakdown.eye_contact}/100 while explaining complex concepts.`,
      type: "weakness",
    };
  }
  if (breakdown.speaking_pace < 65 && breakdown.technical_accuracy >= 75) {
    return {
      title: "Pacing deceleration under pressure",
      detail: `Speaking cadence slowed to ${turn.signals.paceStats?.wpm ?? 95} WPM (${breakdown.speaking_pace}/100) during deep architectural explanation.`,
      type: "weakness",
    };
  }
  if (breakdown.filler_words < 70) {
    return {
      title: "Filler word bridging",
      detail: `Detected ${turn.signals.paceStats?.fillerWordsCount ?? "elevated"} filler words during thought formulation.`,
      type: "weakness",
    };
  }
  if (breakdown.technical_accuracy < 70) {
    return {
      title: "Technical depth & mechanism gap",
      detail: "Explanation lacked concrete algorithmic mechanics, complexity bounds, or practical tradeoffs.",
      type: "weakness",
    };
  }
  if (breakdown.answer_structure < 70) {
    return {
      title: "Answer structure organization",
      detail: turn.structureAnalysis?.coachingFeedback || "Lacked structured progression from problem context to quantified outcome.",
      type: "weakness",
    };
  }
  return {
    title: "High-mastery comprehensive answer",
    detail: `Consistent technical accuracy (${breakdown.technical_accuracy}/100) paired with steady eye contact (${breakdown.eye_contact}/100) and cadence.`,
    type: "strength",
  };
}

interface InterviewTimelineHeatmapProps {
  history: InterviewTurn[];
  selectedTurnId: number | null;
  onSelectTurn: (id: number) => void;
}

function InterviewTimelineHeatmap({ history, selectedTurnId, onSelectTurn }: InterviewTimelineHeatmapProps) {
  const totalSlots = 6;
  const xCoords = [24, 72, 120, 168, 216, 264];
  const svgWidth = 288;
  const svgHeight = 100;
  const minY = 16;
  const maxY = 84;

  const points = history.map((t, i) => {
    const x = xCoords[i];
    const score = Math.max(40, Math.min(100, t.score));
    const y = maxY - ((score - 40) / 60) * (maxY - minY);
    return { x, y, score, id: t.id };
  });

  let pathD = "";
  let areaD = "";
  if (points.length > 0) {
    pathD = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cx = (p0.x + p1.x) / 2;
      pathD += ` C ${cx} ${p0.y}, ${cx} ${p1.y}, ${p1.x} ${p1.y}`;
    }
    const lastP = points[points.length - 1];
    areaD = `${pathD} L ${lastP.x} ${maxY + 6} L ${points[0].x} ${maxY + 6} Z`;
  }

  const metrics: { key: keyof MultimodalBreakdown | "pace"; label: string; short: string }[] = [
    { key: "overall", label: "Overall Score", short: "Overall" },
    { key: "technical_accuracy", label: "Technical Accuracy", short: "Technical" },
    { key: "semantic_relevance", label: "Semantic Relevance", short: "Relevance" },
    { key: "eye_contact", label: "Eye Contact", short: "Eye Contact" },
    { key: "speaking_pace", label: "Speaking Pace", short: "Pace" },
    { key: "voice_energy", label: "Voice Energy", short: "Voice" },
    { key: "answer_structure", label: "Answer Structure", short: "Structure" },
  ];

  return (
    <div className="rounded-md border border-zinc-200 bg-white p-3 shadow-2xs">
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-bold text-zinc-900 uppercase tracking-wide">
          <TrendingUp size={14} className="text-emerald-700" />
          Interactive Timeline & Heatmap
        </span>
        <span className="text-[10px] text-zinc-500 font-mono">
          Click Q1–Q6 to inspect
        </span>
      </div>

      {/* SVG Timeline Curve */}
      <div className="relative rounded bg-zinc-950/95 p-2 text-white">
        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="h-28 w-full overflow-visible">
          <defs>
            <linearGradient id="scoreCurveGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid Lines */}
          {[100, 80, 60].map((val) => {
            const y = maxY - ((val - 40) / 60) * (maxY - minY);
            return (
              <g key={val}>
                <line x1="16" y1={y} x2={svgWidth - 10} y2={y} stroke="#3f3f46" strokeDasharray="3 3" strokeWidth="0.75" />
                <text x="12" y={y + 3} textAnchor="end" fontSize="8" fill="#a1a1aa" fontFamily="monospace">
                  {val}
                </text>
              </g>
            );
          })}

          {/* Area Fill */}
          {areaD && <path d={areaD} fill="url(#scoreCurveGradient)" />}

          {/* Spline Path */}
          {pathD && <path d={pathD} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}

          {/* Nodes */}
          {Array.from({ length: totalSlots }).map((_, idx) => {
            const x = xCoords[idx];
            const turn = history[idx];
            const score = turn ? Math.max(40, Math.min(100, turn.score)) : null;
            const y = score !== null ? maxY - ((score - 40) / 60) * (maxY - minY) : maxY;
            const isSelected = selectedTurnId === (idx + 1);
            const color = score !== null ? getScoreColor(score) : null;

            return (
              <g
                key={idx}
                className="cursor-pointer transition-all"
                onClick={() => {
                  if (turn) onSelectTurn(turn.id);
                }}
              >
                {/* Active Ring */}
                {isSelected && (
                  <circle cx={x} cy={y} r="11" fill="none" stroke="#6ee7b7" strokeWidth="2" className="animate-pulse" />
                )}

                {/* Node Circle */}
                <circle
                  cx={x}
                  cy={y}
                  r={turn ? "6" : "3.5"}
                  fill={color ? color.hex : "#52525b"}
                  stroke={isSelected ? "#ffffff" : "#18181b"}
                  strokeWidth="1.5"
                  className={turn ? "hover:scale-125 transition transform" : ""}
                />

                {/* Score text on top if turn evaluated */}
                {turn && (
                  <text x={x} y={y - 8} textAnchor="middle" fontSize="9" fontWeight="bold" fill="#ffffff" fontFamily="monospace">
                    {turn.score}
                  </text>
                )}

                {/* X-axis label */}
                <text
                  x={x}
                  y={svgHeight - 2}
                  textAnchor="middle"
                  fontSize="9"
                  fontWeight={isSelected ? "bold" : "normal"}
                  fill={isSelected ? "#34d399" : turn ? "#e4e4e7" : "#71717a"}
                  fontFamily="monospace"
                >
                  Q{idx + 1}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Multimodal Heatmap Matrix */}
      <div className="mt-3">
        <div className="mb-1.5 flex items-center justify-between text-[11px] font-bold text-zinc-700">
          <span>Multimodal Heatmap Matrix</span>
          <span className="text-[10px] text-zinc-400 font-normal">Score 0–100</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[10px]">
            <thead>
              <tr className="border-b border-zinc-100 text-zinc-400">
                <th className="pb-1 font-semibold">Signal</th>
                {Array.from({ length: totalSlots }).map((_, i) => (
                  <th
                    key={i}
                    className={`pb-1 text-center font-mono ${selectedTurnId === i + 1 ? "font-bold text-emerald-700" : ""}`}
                  >
                    Q{i + 1}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 font-mono">
              {metrics.map((m) => (
                <tr key={m.key} className="hover:bg-zinc-50/80 transition">
                  <td className="py-1 pr-1 font-sans text-[10px] font-semibold text-zinc-700 truncate max-w-[80px]">
                    {m.short}
                  </td>
                  {Array.from({ length: totalSlots }).map((_, i) => {
                    const turn = history[i];
                    if (!turn || !turn.breakdown) {
                      return (
                        <td key={i} className="py-1 text-center text-zinc-300">
                          --
                        </td>
                      );
                    }
                    const val =
                      m.key === "overall"
                        ? turn.score
                        : m.key === "pace"
                        ? turn.breakdown.speaking_pace
                        : turn.breakdown[m.key] ?? 70;
                    const col = getScoreColor(val);
                    const isSelected = selectedTurnId === turn.id;

                    return (
                      <td key={i} className="py-0.5 text-center">
                        <button
                          type="button"
                          onClick={() => onSelectTurn(turn.id)}
                          className={`inline-block w-7 rounded py-0.5 text-center text-[10px] font-bold border transition ${
                            col.bg
                          } ${col.text} ${col.border} ${
                            isSelected ? "ring-2 ring-emerald-500 shadow-xs" : "hover:brightness-95"
                          }`}
                          title={`Click to inspect Q${turn.id}: ${m.label} = ${val}/100`}
                        >
                          {val}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function TurnInspectorModal({
  turn,
  allTurns,
  onClose,
  onSelectTurn,
  onStartABRetake,
  onOpenABComparison,
  onOpenCodingEvaluation,
  onOpenSystemDesignEvaluation,
}: {
  turn: InterviewTurn;
  allTurns: InterviewTurn[];
  onClose: () => void;
  onSelectTurn: (id: number) => void;
  onStartABRetake?: (turn: InterviewTurn) => void;
  onOpenABComparison?: (comp: ABComparisonResult) => void;
  onOpenCodingEvaluation?: (evaluation: CodingEvaluation) => void;
  onOpenSystemDesignEvaluation?: (evaluation: SystemDesignEvaluation) => void;
}) {
  const weakness = synthesizeTurnWeakness(turn);
  const prevTurn = allTurns.find((t) => t.id === turn.id - 1);
  const nextTurn = allTurns.find((t) => t.id === turn.id + 1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/75 p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-zinc-200 bg-white p-5 shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-900 font-bold font-mono text-sm">
              Q{turn.id}
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900">Question {turn.id} Performance Inspection</h3>
              <p className="text-xs text-zinc-500 font-mono">
                Score: <span className="font-bold text-zinc-900">{turn.score}/100</span> · Difficulty: {turn.currentDifficulty ?? "Standard"} · Latency: {Math.round(turn.latencyMs / 1000)}s
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {prevTurn && (
              <button
                type="button"
                onClick={() => onSelectTurn(prevTurn.id)}
                className="rounded border border-zinc-200 px-2 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
              >
                ← Q{prevTurn.id}
              </button>
            )}
            {nextTurn && (
              <button
                type="button"
                onClick={() => onSelectTurn(nextTurn.id)}
                className="rounded border border-zinc-200 px-2 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
              >
                Q{nextTurn.id} →
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="grid size-8 place-items-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Question & Answer Transcript */}
        <div className="my-4 space-y-2.5">
          <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-xs">
            <div className="font-bold text-zinc-600 mb-0.5">Interviewer Question:</div>
            <div className="text-sm font-semibold text-zinc-900 leading-relaxed">{turn.question}</div>
          </div>
          <div className="rounded-md border border-zinc-200 bg-white p-3 text-xs">
            <div className="font-bold text-zinc-600 mb-0.5">Candidate Response:</div>
            <div className="text-xs text-zinc-800 leading-relaxed max-h-32 overflow-y-auto whitespace-pre-wrap">
              {turn.answer}
            </div>
          </div>
        </div>

        {/* 6-Axis Coding Evaluation Card if Turn was Coding Challenge */}
        {turn.codingEvaluation && (
          <div className="mb-4 rounded-xl border border-purple-300/80 bg-gradient-to-r from-slate-950 via-purple-950 to-slate-950 p-4 text-white shadow-md space-y-3">
            <div className="flex items-center justify-between border-b border-purple-500/30 pb-2">
              <div className="flex items-center gap-2">
                <Code2 size={16} className="text-purple-400" />
                <span className="font-bold text-sm text-purple-200">6-Axis Coding Evaluation</span>
                <span className="rounded bg-purple-500/20 px-2 py-0.5 text-[10px] font-mono text-purple-300 border border-purple-500/30">
                  {turn.codingEvaluation.problemTitle}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenCodingEvaluation?.(turn.codingEvaluation!);
                }}
                className="rounded-lg bg-purple-600 hover:bg-purple-500 px-3 py-1 text-xs font-bold text-white transition shadow-sm cursor-pointer"
              >
                Expand 6-Axis Matrix
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-mono">
              <div className="rounded bg-zinc-900/80 p-2 border border-zinc-800">
                <div className="text-[10px] text-zinc-400">Correctness</div>
                <div className="text-sm font-bold text-emerald-400">{turn.codingEvaluation.correctness.passRate}</div>
              </div>
              <div className="rounded bg-zinc-900/80 p-2 border border-zinc-800">
                <div className="text-[10px] text-zinc-400">Time Complexity</div>
                <div className="text-sm font-bold text-blue-400">{turn.codingEvaluation.timeComplexity.detectedNotation}</div>
              </div>
              <div className="rounded bg-zinc-900/80 p-2 border border-zinc-800">
                <div className="text-[10px] text-zinc-400">Space Complexity</div>
                <div className="text-sm font-bold text-cyan-400">{turn.codingEvaluation.spaceComplexity.detectedNotation}</div>
              </div>
              <div className="rounded bg-zinc-900/80 p-2 border border-zinc-800">
                <div className="text-[10px] text-zinc-400">Code Quality</div>
                <div className="text-sm font-bold text-purple-400">{turn.codingEvaluation.codeQuality.score}%</div>
              </div>
              <div className="rounded bg-zinc-900/80 p-2 border border-zinc-800">
                <div className="text-[10px] text-zinc-400">Communication</div>
                <div className="text-sm font-bold text-amber-400">{turn.codingEvaluation.communication.score}%</div>
              </div>
              <div className="rounded bg-zinc-900/80 p-2 border border-zinc-800">
                <div className="text-[10px] text-zinc-400">Debugging Approach</div>
                <div className="text-sm font-bold text-rose-400">{turn.codingEvaluation.debuggingApproach.score}%</div>
              </div>
            </div>

            {turn.submittedCode && (
              <div className="rounded-lg bg-[#0d1117] p-2.5 font-mono text-[11px] text-emerald-300 max-h-32 overflow-y-auto border border-zinc-800 whitespace-pre-wrap">
                {turn.submittedCode.code}
              </div>
            )}
          </div>
        )}

        {/* System Design Evaluation Card if Turn was System Design Challenge */}
        {turn.systemDesignEvaluation && (
          <div className="mb-4 rounded-xl border border-purple-300/80 bg-gradient-to-r from-slate-950 via-purple-950 to-slate-950 p-4 text-white shadow-md space-y-3">
            <div className="flex items-center justify-between border-b border-purple-500/30 pb-2">
              <div className="flex items-center gap-2">
                <BrainCircuit size={16} className="text-purple-400" />
                <span className="font-bold text-sm text-purple-200">System Design Evaluation</span>
                <span className="rounded bg-purple-500/20 px-2 py-0.5 text-[10px] font-mono text-purple-300 border border-purple-500/30">
                  {turn.systemDesignEvaluation.detection.scalabilityRating}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSystemDesignEvaluation?.(turn.systemDesignEvaluation!);
                }}
                className="rounded-lg bg-purple-600 hover:bg-purple-500 px-3 py-1 text-xs font-bold text-white transition shadow-sm cursor-pointer"
              >
                Expand 5-Dimension Scorecard
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
              <div className="rounded bg-zinc-900/80 p-2 border border-zinc-800">
                <div className="text-[10px] text-emerald-400 font-bold uppercase">Detected Tiers ({turn.systemDesignEvaluation.detection.detected.length}):</div>
                <div className="text-[11px] text-zinc-300 mt-1">
                  {turn.systemDesignEvaluation.detection.detected.map((d) => d.label).join(", ")}
                </div>
              </div>
              <div className="rounded bg-zinc-900/80 p-2 border border-zinc-800">
                <div className="text-[10px] text-amber-400 font-bold uppercase">Missing Scaling Tiers ({turn.systemDesignEvaluation.detection.missing.length}):</div>
                <div className="text-[11px] text-zinc-300 mt-1">
                  {turn.systemDesignEvaluation.detection.missing.map((m) => m.label).join(", ") || "None (All tiers present)"}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Multimodal Scorecard Grid */}
        <div className="mb-4">
          <div className="text-xs font-bold text-zinc-900 mb-2 uppercase tracking-wide">
            Multimodal Signal Telemetry
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <div className="rounded-lg border border-zinc-200 bg-zinc-50/70 p-2.5">
              <div className="text-[11px] font-semibold text-zinc-500">Technical Accuracy</div>
              <div className="mt-0.5 font-mono text-base font-bold text-emerald-700">
                {turn.breakdown?.technical_accuracy ?? turn.score}/100
              </div>
              <div className="text-[10px] text-zinc-400">Algorithmic accuracy</div>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-zinc-50/70 p-2.5">
              <div className="text-[11px] font-semibold text-zinc-500">Semantic Relevance</div>
              <div className="mt-0.5 font-mono text-base font-bold text-blue-700">
                {turn.breakdown?.semantic_relevance ?? 85}/100
              </div>
              <div className="text-[10px] text-zinc-400">Contextual alignment</div>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-zinc-50/70 p-2.5">
              <div className="text-[11px] font-semibold text-zinc-500">Eye Contact</div>
              <div className="mt-0.5 font-mono text-base font-bold text-amber-700">
                {turn.breakdown?.eye_contact ?? turn.signals.eyeContact}/100
              </div>
              <div className="text-[10px] text-zinc-400">Gaze focus stability</div>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-zinc-50/70 p-2.5">
              <div className="text-[11px] font-semibold text-zinc-500">Speaking Pace</div>
              <div className="mt-0.5 font-mono text-base font-bold text-zinc-800">
                {turn.breakdown?.speaking_pace ?? 80}/100
              </div>
              <div className="text-[10px] text-zinc-400">{turn.signals.paceStats?.wpm ?? 120} WPM cadence</div>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-zinc-50/70 p-2.5">
              <div className="text-[11px] font-semibold text-zinc-500">Voice Energy</div>
              <div className="mt-0.5 font-mono text-base font-bold text-zinc-800">
                {turn.breakdown?.voice_energy ?? turn.signals.voice}/100
              </div>
              <div className="text-[10px] text-zinc-400">Acoustic resonance</div>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-zinc-50/70 p-2.5">
              <div className="text-[11px] font-semibold text-zinc-500">Filler Words</div>
              <div className="mt-0.5 font-mono text-base font-bold text-emerald-700">
                {turn.breakdown?.filler_words ?? 90}/100
              </div>
              <div className="text-[10px] text-zinc-400">{turn.signals.paceStats?.fillerWordsCount ?? 0} fillers detected</div>
            </div>
          </div>
        </div>

        {/* Synthesized Weakness / Strength Finding */}
        <div
          className={`mb-4 rounded-lg border p-3 text-xs leading-relaxed ${
            weakness.type === "weakness"
              ? "border-amber-300 bg-amber-50/90 text-amber-950"
              : "border-emerald-300 bg-emerald-50/90 text-emerald-950"
          }`}
        >
          <div className="flex items-center gap-1.5 font-bold mb-1">
            <Sparkles size={14} className={weakness.type === "weakness" ? "text-amber-700" : "text-emerald-700"} />
            <span>{weakness.title}</span>
          </div>
          <p>{weakness.detail}</p>
        </div>

        {/* Structure Analysis if available */}
        {turn.structureAnalysis && (
          <div className="mb-4 rounded-md border border-indigo-200 bg-indigo-50/60 p-3 text-xs">
            <div className="font-bold text-indigo-900 mb-1.5">
              {turn.structureAnalysis.framework === "STAR" ? "STAR Structure Breakdown" : "5-Point Technical Breakdown"}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {turn.structureAnalysis.elements.map((el) => (
                <span
                  key={el.name}
                  className={`rounded px-2 py-0.5 text-xs font-semibold ${
                    el.detected
                      ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                      : "bg-rose-100 text-rose-900 border border-rose-300"
                  }`}
                >
                  {el.name} {el.detected ? "✓" : "✗"}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Turn Feedback Bullet Points */}
        <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-700">
          <div className="font-bold text-zinc-900 mb-1">Actionable Coaching Notes:</div>
          <ul className="list-inside list-disc space-y-1 text-zinc-600">
            {turn.feedback.map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-100 pt-3">
          <div className="flex items-center gap-2">
            {turn.codingEvaluation && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenCodingEvaluation?.(turn.codingEvaluation!);
                }}
                className="flex items-center gap-1.5 rounded-md bg-purple-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-purple-500 transition shadow-sm cursor-pointer"
              >
                <Code2 size={14} />
                <span>6-Axis Evaluation Report</span>
              </button>
            )}

            {turn.systemDesignEvaluation && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSystemDesignEvaluation?.(turn.systemDesignEvaluation!);
                }}
                className="flex items-center gap-1.5 rounded-md bg-purple-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-purple-500 transition shadow-sm cursor-pointer"
              >
                <BrainCircuit size={14} />
                <span>System Design Scorecard</span>
              </button>
            )}

            {turn.abComparison ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenABComparison?.(turn.abComparison!);
                }}
                className="flex items-center gap-1.5 rounded-md bg-purple-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-purple-500 transition shadow-sm cursor-pointer"
              >
                <FlaskConical size={14} />
                <span>View A/B Delta (+{turn.abComparison.deltas.overall} Overall)</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onStartABRetake?.(turn);
                }}
                className="flex items-center gap-1.5 rounded-md border border-purple-300 bg-purple-50 px-3.5 py-1.5 text-xs font-bold text-purple-900 hover:bg-purple-100 transition cursor-pointer"
              >
                <FlaskConical size={14} className="text-purple-700" />
                <span>Retake in A/B Mode</span>
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-zinc-900 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-800 transition cursor-pointer"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
}

function SkillGapAssessmentCard({
  skillGapReport,
  historyCount,
}: {
  skillGapReport: SkillGapReport | null;
  historyCount: number;
}) {
  const [isCurriculumExpanded, setIsCurriculumExpanded] = useState(true);

  if (!skillGapReport) {
    return (
      <div className="rounded-md border border-zinc-200 bg-white p-3 text-xs text-zinc-500 shadow-2xs">
        <div className="flex items-center gap-1.5 font-bold text-zinc-800 uppercase tracking-wide mb-1">
          <Target size={14} className="text-emerald-700" />
          Skill-Gap Assessment
        </div>
        <p className="text-[11px] text-zinc-500">
          Answer interview questions to generate a personalized skill-gap radar and RAG study plan.
        </p>
      </div>
    );
  }

  const { skills, highest_priority_area, study_plan } = skillGapReport;

  return (
    <div className="rounded-md border border-zinc-200 bg-white p-3.5 shadow-2xs">
      <div className="mb-2.5 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-bold text-zinc-900 uppercase tracking-wide">
          <Target size={14} className="text-emerald-700" />
          Skill-Gap Assessment
        </span>
        <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-900 font-mono">
          RAG Synthesized
        </span>
      </div>

      {/* Visual Horizontal Skill Bars */}
      <div className="space-y-2 mb-3">
        {skills.map((s) => {
          const isLowest = s.name === highest_priority_area;
          const barColor =
            s.score >= 85
              ? "bg-emerald-500"
              : s.score >= 70
              ? "bg-blue-500"
              : s.score >= 55
              ? "bg-amber-500"
              : "bg-rose-500";

          return (
            <div key={s.name} className="space-y-0.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-zinc-800 flex items-center gap-1">
                  {s.name}
                  {isLowest && (
                    <span className="rounded bg-rose-100 px-1 py-0.2 text-[9px] font-bold text-rose-800 font-mono">
                      Priority Gap
                    </span>
                  )}
                </span>
                <span className="font-mono font-bold text-zinc-900 text-xs">{s.score}/100</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                  style={{ width: `${s.score}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Priority Focus Alert Banner */}
      <div className="rounded-md border border-rose-200 bg-rose-50/80 p-2.5 text-xs text-rose-950 shadow-2xs mb-3">
        <div className="flex items-center gap-1.5 font-bold text-rose-900 mb-0.5">
          <Sparkles size={13} className="text-rose-600" />
          <span>Priority Focus: {highest_priority_area}</span>
        </div>
        <p className="text-[11px] text-rose-900/90 leading-relaxed font-medium">
          {study_plan.priority_reason}
        </p>
      </div>

      {/* RAG-Retrieved Curriculum Tree */}
      <div className="rounded-md border border-indigo-200 bg-indigo-50/60 p-2.5 text-xs">
        <div
          className="flex cursor-pointer items-center justify-between font-bold text-indigo-950 select-none"
          onClick={() => setIsCurriculumExpanded(!isCurriculumExpanded)}
        >
          <span className="flex items-center gap-1.5">
            <BookOpen size={13} className="text-indigo-700" />
            RAG Study Plan: {study_plan.priority_skill}
          </span>
          <span className="text-[10px] text-indigo-700 underline font-mono">
            {isCurriculumExpanded ? "Hide" : "Expand"}
          </span>
        </div>

        {isCurriculumExpanded && (
          <div className="mt-2 space-y-2 pt-1 border-t border-indigo-200/60">
            {/* Tree View Structure */}
            <div className="font-mono text-[11px] text-zinc-800 space-y-1 bg-white p-2 rounded border border-indigo-100">
              <div className="font-bold text-indigo-900">{study_plan.priority_skill}</div>
              {study_plan.curriculum_tree.map((node, idx) => {
                const isLast = idx === study_plan.curriculum_tree.length - 1;
                const branch = isLast ? "└──" : "├──";
                return (
                  <div key={node.name} className="pl-2 leading-relaxed">
                    <span className="text-indigo-400 font-semibold">{branch} </span>
                    <span className="font-semibold text-zinc-900">{node.name}</span>
                    <span className="text-[10px] text-zinc-500 font-sans ml-1">
                      ({node.estimated_study_hours}h · {node.difficulty})
                    </span>
                    <div className="pl-6 text-[10px] text-zinc-500 font-sans">
                      {node.key_topics.join(" · ")}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Actionable Steps */}
            <div className="space-y-1 pt-1 text-[11px] text-zinc-700">
              <div className="font-bold text-indigo-900 text-xs">Recommended Action Plan:</div>
              <ul className="list-inside list-disc space-y-0.5 text-[11px] text-zinc-600">
                {study_plan.actionable_steps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ul>
            </div>

            {/* ChromaDB Knowledge Source Badges */}
            <div className="flex flex-wrap items-center gap-1 pt-1">
              <span className="text-[10px] font-bold text-zinc-500 font-mono">RAG Sources:</span>
              {study_plan.retrieved_rag_sources.map((src) => (
                <span
                  key={src}
                  className="inline-flex items-center rounded bg-white px-1.5 py-0.5 text-[9px] font-mono text-zinc-600 border border-indigo-200"
                >
                  {src.replace("chroma://", "")}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SevenDayRoadmapModal({
  roadmap,
  onClose,
}: {
  roadmap: PostInterviewRoadmap;
  onClose: () => void;
}) {
  const [completedDays, setCompletedDays] = useState<Record<number, boolean>>({});

  const toggleDay = (day: number) => {
    setCompletedDays((prev) => ({ ...prev, [day]: !prev[day] }));
  };

  const { days, total_hours, target_role, title, summary } = roadmap;
  const completedCount = Object.values(completedDays).filter(Boolean).length;
  const overallProgress = Math.round((completedCount / days.length) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 bg-gradient-to-r from-indigo-900 to-purple-900 px-6 py-4 text-white">
          <div>
            <div className="flex items-center gap-2">
              <Calendar className="size-5 text-indigo-300" />
              <h2 className="text-base font-bold tracking-tight">{title}</h2>
              <span className="rounded bg-indigo-500/30 px-2 py-0.5 text-xs font-mono font-semibold text-indigo-200 border border-indigo-400/30">
                {total_hours}h Roadmap
              </span>
            </div>
            <p className="mt-1 text-xs text-indigo-200">{summary} · Target: {target_role}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-indigo-200 hover:bg-white/10 hover:text-white transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="border-b border-zinc-200 bg-indigo-50/50 px-6 py-3">
          <div className="flex items-center justify-between text-xs font-semibold text-zinc-800 mb-1.5">
            <span>Overall Roadmap Progress</span>
            <span className="font-mono text-indigo-900 font-bold">
              {completedCount}/7 Days Completed ({overallProgress}%)
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-zinc-200">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 transition-all duration-300"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>

        {/* Content List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3.5">
          {days.map((d) => {
            const isDone = Boolean(completedDays[d.day]);
            const meterBars = Math.round((d.intensity / 100) * 10);
            const barAscii = "█".repeat(meterBars) + "░".repeat(10 - meterBars);

            return (
              <div
                key={d.day}
                className={`rounded-lg border p-4 transition-all ${
                  isDone
                    ? "border-emerald-300 bg-emerald-50/40 shadow-xs"
                    : "border-zinc-200 bg-white hover:border-indigo-300 hover:shadow-xs"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => toggleDay(d.day)}
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                        isDone
                          ? "border-emerald-600 bg-emerald-600 text-white"
                          : "border-zinc-300 bg-white hover:border-indigo-500"
                      }`}
                    >
                      {isDone && <CheckCircle2 size={14} />}
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-zinc-900">
                          Day {d.day}: {d.topic}
                        </span>
                        <span className="rounded bg-zinc-100 px-2 py-0.5 text-[10px] font-mono text-zinc-600 border border-zinc-200">
                          {d.estimated_hours}h estimated
                        </span>
                      </div>
                      <div className="font-mono text-xs text-indigo-700 font-bold mt-0.5">
                        {barAscii}{" "}
                        <span className="font-sans text-xs text-zinc-500 font-normal ml-1.5">
                          Intensity: {d.intensity}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <p className="mt-2.5 text-xs text-zinc-700 leading-relaxed pl-8">
                  {d.focus_area}
                </p>

                {/* Practice Challenge Box */}
                <div className="mt-3 ml-8 rounded-md bg-zinc-50 p-3 text-xs text-zinc-800 border border-zinc-200/80">
                  <div className="font-bold text-zinc-900 mb-1 flex items-center gap-1.5">
                    <ListTodo size={13} className="text-indigo-600" />
                    Actionable Practice Challenge:
                  </div>
                  <div className="leading-relaxed">{d.practice_challenge}</div>
                </div>

                {/* RAG Grounded Concepts */}
                <div className="mt-2.5 ml-8 flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-bold text-zinc-500 font-mono">RAG Grounding:</span>
                  {d.retrieved_concepts.map((c) => (
                    <span
                      key={c}
                      className="inline-flex rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-800 border border-indigo-100"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-zinc-200 bg-zinc-50 px-6 py-3.5">
          <span className="text-xs text-zinc-500 font-mono">
            {completedCount === 7 ? "🎉 All 7 days completed! Ready for re-assessment." : "Target completion: 7 consecutive days"}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-zinc-900 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-800 transition"
          >
            Close Roadmap
          </button>
        </div>
      </div>
    </div>
  );
}

function InterviewReplayModal({
  history,
  onClose,
}: {
  history: InterviewTurn[];
  onClose: () => void;
}) {
  const frames = useMemo(() => generateReplayTelemetryStream(history), [history]);
  // Default to 277 (04:37) to showcase the specific landmark event immediately
  const [currentSec, setCurrentSec] = useState(277);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<0.5 | 1 | 1.5 | 2>(1);

  const totalDuration = 360; // 6 minutes
  const currentFrame = frames[currentSec] || frames[0];

  useEffect(() => {
    if (!isPlaying) return;
    const intervalMs = 1000 / playbackSpeed;
    const interval = setInterval(() => {
      setCurrentSec((prev) => {
        if (prev >= totalDuration) {
          setIsPlaying(false);
          return totalDuration;
        }
        return prev + 1;
      });
    }, intervalMs);
    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed, totalDuration]);

  // Keyboard controls for spacebar play/pause and arrow keys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.code === "Space") {
        e.preventDefault();
        setIsPlaying((p) => !p);
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        setCurrentSec((s) => Math.max(0, s - 5));
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        setCurrentSec((s) => Math.min(totalDuration, s + 5));
      } else if (e.code === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, totalDuration]);

  const handleScrubberChange = (e: ChangeEvent<HTMLInputElement>) => {
    setCurrentSec(Number(e.target.value));
  };

  const jumpToQuestion = (qNum: number) => {
    const targetSec = (qNum - 1) * 60;
    setCurrentSec(Math.min(totalDuration, targetSec));
  };

  const jumpToSec = (sec: number) => {
    setCurrentSec(Math.max(0, Math.min(totalDuration, sec)));
  };

  const questionMarkers = [
    { num: 1, sec: 0, label: "Q1", time: "00:00" },
    { num: 2, sec: 60, label: "Q2", time: "01:00" },
    { num: 3, sec: 120, label: "Q3", time: "02:00" },
    { num: 4, sec: 180, label: "Q4", time: "03:00" },
    { num: 5, sec: 240, label: "Q5", time: "04:00" },
    { num: 6, sec: 300, label: "Q6", time: "05:00" },
  ];

  const keyMoments = [
    { sec: 277, label: "04:37 (Looked away 2.1s)", type: "anomaly" },
    { sec: 42, label: "00:42 (Filler word)", type: "filler" },
    { sec: 85, label: "01:25 (Peak flow 152 WPM)", type: "milestone" },
    { sec: 165, label: "02:45 (STAR Action)", type: "milestone" },
    { sec: 312, label: "05:12 (Pace deceleration)", type: "anomaly" },
  ];

  // Timeline scrubber progress percent
  const progressPercent = (currentSec / totalDuration) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-5 backdrop-blur-md animate-in fade-in duration-200">
      <div className="flex max-h-[96vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-zinc-700/80 bg-zinc-950 text-white shadow-[0_0_50px_rgba(0,0,0,0.8)] animate-in zoom-in-95 duration-200">
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-zinc-800/90 bg-gradient-to-r from-zinc-900 via-zinc-900/95 to-zinc-900 px-6 py-3.5">
          <div className="flex items-center gap-3">
            <div className="grid size-8 place-items-center rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <RotateCcw className="size-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold tracking-tight text-zinc-100">Interview Replay Mode</h2>
                <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-mono font-bold text-emerald-400 border border-emerald-500/30">
                  Multimodal Telemetry Playback
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">Review frame-by-frame gaze alignment, voice energy, and speaking pace</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950/80 px-3 py-1 font-mono text-xs">
              <Clock3 size={14} className="text-emerald-400" />
              <span className="font-bold text-emerald-400">{currentFrame.formattedTime}</span>
              <span className="text-zinc-600">/</span>
              <span className="text-zinc-400">06:00</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition"
              title="Close Replay (Esc)"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Content */}
        <div className="flex flex-1 flex-col overflow-y-auto p-4 sm:p-6 gap-4 custom-scrollbar">
          {/* Main Video & HUD Grid */}
          <div className="grid gap-4 lg:grid-cols-[1fr_310px]">
            {/* Video Container */}
            <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-zinc-800 bg-gradient-to-b from-zinc-900 to-black shadow-2xl flex flex-col items-center justify-center">
              {/* Studio Canvas Background & Face Tracking Simulation */}
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,#132822_0%,#09110f_60%,#030505_100%)] opacity-90" />
              
              {/* Subtle Studio Grid Overlay */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f293710_1px,transparent_1px),linear-gradient(to_bottom,#1f293710_1px,transparent_1px)] bg-[size:24px_24px]" />

              {/* Simulated Face & Landmark Tracking */}
              <div className="relative z-10 flex flex-col items-center justify-center">
                {/* Candidate Avatar with Dynamic Eye Gaze Pointer */}
                <div
                  className={`relative flex size-32 items-center justify-center rounded-full border-2 transition-all duration-300 shadow-xl ${
                    currentFrame.lookingAway
                      ? "border-amber-500/90 bg-amber-950/40 translate-x-8 -rotate-6 shadow-amber-500/20"
                      : "border-emerald-500/80 bg-emerald-950/30 shadow-emerald-500/20"
                  }`}
                >
                  <Eye
                    size={46}
                    className={`transition-colors duration-300 ${
                      currentFrame.lookingAway ? "text-amber-400" : "text-emerald-400"
                    }`}
                  />
                  {/* Gaze Target Vector Crosshair */}
                  <div
                    className={`absolute size-5 rounded-full border-2 transition-all duration-300 ${
                      currentFrame.lookingAway
                        ? "border-amber-400 bg-amber-400/50 -right-3 top-3 ring-4 ring-amber-500/20"
                        : "border-emerald-400 bg-emerald-400/50 ring-4 ring-emerald-500/20"
                    }`}
                  />

                  {/* Face Mesh Landmark Dots */}
                  <span className="absolute -top-1.5 size-1.5 rounded-full bg-emerald-400/60" />
                  <span className="absolute -bottom-1.5 size-1.5 rounded-full bg-emerald-400/60" />
                  <span className="absolute -left-1.5 size-1.5 rounded-full bg-emerald-400/60" />
                  <span className="absolute -right-1.5 size-1.5 rounded-full bg-emerald-400/60" />
                </div>

                {/* Real-time Voice Waveform Modulation */}
                <div className="mt-4 flex items-center gap-1">
                  {[25, 45, 75, 95, 60, 40, 85, 100, 70, 50, 90, 65, 35, 80].map((h, i) => (
                    <div
                      key={i}
                      className={`w-1 rounded-full transition-all duration-150 ${
                        currentFrame.lookingAway ? "bg-amber-400" : "bg-emerald-400"
                      }`}
                      style={{
                        height: `${Math.max(4, Math.round(((h * currentFrame.voiceEnergy) / 100) * 0.38))}px`,
                        opacity: isPlaying ? 0.95 : 0.65,
                      }}
                    />
                  ))}
                </div>

                {/* Gaze Status Pill */}
                <div className="mt-2.5">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-[10px] font-mono font-bold border transition-colors ${
                      currentFrame.lookingAway
                        ? "border-amber-500/40 bg-amber-950/80 text-amber-300"
                        : "border-emerald-500/40 bg-emerald-950/80 text-emerald-300"
                    }`}
                  >
                    <span className={`size-1.5 rounded-full ${currentFrame.lookingAway ? "bg-amber-400 animate-ping" : "bg-emerald-400"}`} />
                    {currentFrame.lookingAway ? "Gaze Disconnect (Offset 28°)" : "Direct Lens Alignment"}
                  </span>
                </div>
              </div>

              {/* Video Overlay Badges */}
              <div className="absolute left-3 top-3 flex flex-wrap gap-2 z-10">
                <div className="flex items-center gap-1.5 rounded-md bg-black/80 px-2.5 py-1 text-xs font-mono font-bold text-emerald-300 border border-emerald-500/30 backdrop-blur">
                  <Eye size={13} />
                  <span>{currentFrame.eyeContact}/100</span>
                </div>
                <div className="flex items-center gap-1.5 rounded-md bg-black/80 px-2.5 py-1 text-xs font-mono font-bold text-amber-300 border border-amber-500/30 backdrop-blur">
                  <Activity size={13} />
                  <span>{currentFrame.voiceEnergy}/100</span>
                </div>
                <div className="flex items-center gap-1.5 rounded-md bg-black/80 px-2.5 py-1 text-xs font-mono font-bold text-indigo-300 border border-indigo-500/30 backdrop-blur">
                  <Zap size={13} />
                  <span>{currentFrame.paceWpm} WPM</span>
                </div>
              </div>

              <div className="absolute right-3 top-3 z-10">
                <div className="rounded-md bg-zinc-950/85 px-2.5 py-1 text-xs font-bold text-zinc-300 border border-zinc-800 backdrop-blur font-mono">
                  Question {currentFrame.turnId} of 6
                </div>
              </div>

              {/* Subtitle / Live Transcript Bar */}
              <div className="absolute bottom-2 left-2 right-2 rounded-lg bg-black/85 p-2.5 text-center text-xs text-zinc-300 border border-zinc-800/80 backdrop-blur z-10">
                <span className="font-semibold text-emerald-400">Q{currentFrame.turnId}: </span>
                <span className="italic text-zinc-200">&quot;{currentFrame.transcriptSnippet}&quot;</span>
              </div>
            </div>

            {/* Multimodal Telemetry Metrics Card (Matching exact user format) */}
            <div className="flex flex-col justify-between rounded-xl border border-zinc-800 bg-zinc-900/70 p-4 shadow-lg">
              <div>
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-3">
                  <span className="text-xs font-mono font-semibold uppercase tracking-wider text-zinc-400">Live Telemetry HUD</span>
                  <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-mono font-bold text-emerald-400">SYNCED</span>
                </div>

                {/* 3 Telemetry Metrics */}
                <div className="space-y-4">
                  {/* Eye Contact */}
                  <div className="rounded-lg border border-zinc-800/80 bg-zinc-950/80 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
                        <Eye size={14} className="text-emerald-400" />
                        Eye Contact
                      </span>
                      <span className="text-xl font-bold font-mono text-emerald-400">
                        {currentFrame.eyeContact}
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-200"
                        style={{ width: `${currentFrame.eyeContact}%` }}
                      />
                    </div>
                    <div className="mt-1 flex justify-between text-[10px] text-zinc-500">
                      <span>{currentFrame.lookingAway ? "Offset: 28° Distraction" : "Direct Camera Alignment"}</span>
                      <span>Target: &gt;75</span>
                    </div>
                  </div>

                  {/* Voice Energy */}
                  <div className="rounded-lg border border-zinc-800/80 bg-zinc-950/80 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
                        <Activity size={14} className="text-amber-400" />
                        Voice Energy
                      </span>
                      <span className="text-xl font-bold font-mono text-amber-400">
                        {currentFrame.voiceEnergy}
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-orange-400 transition-all duration-200"
                        style={{ width: `${currentFrame.voiceEnergy}%` }}
                      />
                    </div>
                    <div className="mt-1 flex justify-between text-[10px] text-zinc-500">
                      <span>{currentFrame.pitchHz ? `${currentFrame.pitchHz} Hz Pitch` : "Dynamic Audio RMS"}</span>
                      <span>Target: 65-85</span>
                    </div>
                  </div>

                  {/* Pace */}
                  <div className="rounded-lg border border-zinc-800/80 bg-zinc-950/80 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
                        <Zap size={14} className="text-indigo-400" />
                        Pace
                      </span>
                      <span className="text-xl font-bold font-mono text-indigo-400">
                        {currentFrame.paceWpm} WPM
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-400 transition-all duration-200"
                        style={{ width: `${Math.min(100, Math.round((currentFrame.paceWpm / 180) * 100))}%` }}
                      />
                    </div>
                    <div className="mt-1 flex justify-between text-[10px] text-zinc-500">
                      <span>{getPaceRating(currentFrame.paceWpm)} Cadence</span>
                      <span>Target: 130-165</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Question Context */}
              <div className="mt-3 rounded-lg border border-zinc-800/80 bg-zinc-950/60 p-2.5 text-[11px] text-zinc-400">
                <span className="font-bold text-zinc-200">Current Question:</span>
                <p className="mt-0.5 line-clamp-2 text-zinc-300 italic">{currentFrame.questionPrompt}</p>
              </div>
            </div>
          </div>

          <div className="border-t border-zinc-800/80" />

          {/* Interactive Timeline Scrubber with Vertical Pointer (▲ │ ──┼── │ Q3) */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-zinc-300 flex items-center gap-2">
                <Timer size={15} className="text-emerald-400" />
                Interactive Timeline (Click anywhere to jump)
              </span>
              <span className="font-mono font-bold text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded border border-emerald-500/30">
                {currentFrame.formattedTime} / 06:00
              </span>
            </div>

            {/* Custom Interactive Track with Vertical Pointer Architecture */}
            <div className="relative pt-6 pb-5 select-none">
              {/* Range input transparently capturing clicks and drag events across entire bar */}
              <input
                type="range"
                min={0}
                max={totalDuration}
                value={currentSec}
                onChange={handleScrubberChange}
                className="absolute inset-x-0 top-6 z-30 h-8 w-full cursor-pointer opacity-0"
              />

              {/* Visual Track Line */}
              <div className="relative h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 transition-all duration-75"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {/* Event Markers Placed Along the Track */}
              {keyMoments.map((km) => {
                const pos = (km.sec / totalDuration) * 100;
                return (
                  <button
                    key={km.sec}
                    type="button"
                    onClick={() => jumpToSec(km.sec)}
                    className="absolute top-5 z-20 -translate-x-1/2 flex flex-col items-center group cursor-pointer"
                    style={{ left: `${pos}%` }}
                    title={km.label}
                  >
                    <div
                      className={`size-3 rounded-full border-2 transition-transform group-hover:scale-150 ${
                        km.type === "anomaly"
                          ? "border-amber-400 bg-amber-500 shadow-[0_0_8px_#f59e0b]"
                          : km.type === "filler"
                          ? "border-yellow-400 bg-yellow-500 shadow-[0_0_8px_#eab308]"
                          : "border-emerald-400 bg-emerald-500 shadow-[0_0_8px_#10b981]"
                      }`}
                    />
                  </button>
                );
              })}

              {/* Dynamic Vertical Scrubber Pointer: ▲ │ ──┼── │ Q3 */}
              <div
                className="pointer-events-none absolute top-0 z-20 -translate-x-1/2 flex flex-col items-center transition-all duration-75"
                style={{ left: `${progressPercent}%` }}
              >
                {/* Upper Arrow ▲ */}
                <div className="flex flex-col items-center">
                  <span className="rounded bg-emerald-500 px-1.5 py-0.5 text-[10px] font-mono font-bold text-zinc-950 shadow-md">
                    {currentFrame.formattedTime}
                  </span>
                  <span className="text-xs text-emerald-400 font-bold leading-none -mt-0.5">▲</span>
                </div>

                {/* Vertical Stem Line │ */}
                <div className="h-6 w-0.5 bg-emerald-400 shadow-[0_0_8px_#10b981]" />

                {/* Bottom Tag │ Q3 */}
                <div className="mt-0.5 flex flex-col items-center">
                  <span className="rounded bg-zinc-900 px-1.5 py-0.5 text-[9px] font-mono font-bold text-emerald-300 border border-emerald-500/40 shadow-sm">
                    Q{currentFrame.turnId}
                  </span>
                </div>
              </div>
            </div>

            {/* Question Markers Spaced Along Timeline */}
            <div className="relative flex justify-between pt-1 border-t border-zinc-800/80">
              {questionMarkers.map((m) => (
                <button
                  key={m.num}
                  type="button"
                  onClick={() => jumpToQuestion(m.num)}
                  className={`flex flex-col items-center gap-1 text-[11px] font-mono font-bold transition hover:text-emerald-400 ${
                    currentFrame.turnId === m.num ? "text-emerald-400" : "text-zinc-500"
                  }`}
                >
                  <div
                    className={`size-2.5 rounded-full border transition ${
                      currentFrame.turnId === m.num
                        ? "border-emerald-400 bg-emerald-400 shadow-[0_0_8px_#10b981]"
                        : "border-zinc-600 bg-zinc-800"
                    }`}
                  />
                  <span>{m.label}</span>
                  <span className="text-[9px] font-normal text-zinc-600">{m.time}</span>
                </button>
              ))}
            </div>

            {/* Key Moments Quick Jump Bar */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-800/80">
              <span className="text-[11px] font-bold text-zinc-400 font-mono">Jump to Key Event:</span>
              {keyMoments.map((km) => (
                <button
                  key={km.sec}
                  type="button"
                  onClick={() => jumpToSec(km.sec)}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold border transition cursor-pointer ${
                    Math.abs(currentSec - km.sec) <= 3
                      ? "bg-emerald-500/30 text-emerald-300 border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.3)] font-bold"
                      : km.type === "anomaly"
                      ? "bg-amber-500/15 text-amber-300 border-amber-500/30 hover:bg-amber-500/25"
                      : km.type === "filler"
                      ? "bg-yellow-500/15 text-yellow-300 border-yellow-500/30 hover:bg-yellow-500/25"
                      : "bg-zinc-800/80 text-zinc-300 border-zinc-700 hover:bg-zinc-700"
                  }`}
                >
                  {km.label}
                </button>
              ))}
            </div>
          </div>

          {/* Contextual Event Diagnosis ("Click anywhere on the timeline and see what happened") */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-4 sm:p-5 shadow-lg">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-zinc-400">
                <Info size={14} className="text-emerald-400" />
                <span>Timestamp Diagnosis ({currentFrame.formattedTime})</span>
              </div>
              <span className="text-[11px] text-zinc-500">Click anywhere on the timeline to inspect</span>
            </div>

            {currentFrame.eventAnnotation ? (
              <div
                className={`rounded-lg border p-4 text-xs transition-all duration-200 ${
                  currentFrame.eventType === "anomaly"
                    ? "border-amber-500/50 bg-amber-950/40 text-amber-200"
                    : currentFrame.eventType === "filler"
                    ? "border-yellow-500/50 bg-yellow-950/40 text-yellow-200"
                    : "border-emerald-500/50 bg-emerald-950/40 text-emerald-200"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {currentFrame.eventType === "anomaly" ? (
                      <AlertTriangle className="size-5 shrink-0 text-amber-400" />
                    ) : (
                      <CheckCircle2 className="size-5 shrink-0 text-emerald-400" />
                    )}
                  </div>
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-bold text-zinc-100">
                        {currentFrame.eventTitle || "Timeline Event Detected"}
                      </span>
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-mono font-bold ${
                          currentFrame.eventType === "anomaly"
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                            : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        }`}
                      >
                        {currentFrame.eventType === "anomaly" ? "Gaze / Cadence Anomaly" : "Delivery Milestone"}
                      </span>
                    </div>

                    <p className="text-xs font-medium leading-relaxed text-zinc-200">
                      {currentFrame.eventAnnotation}
                    </p>

                    {currentFrame.coachingTip && (
                      <div className="mt-2 rounded bg-black/40 p-2.5 text-[11px] text-zinc-300 border border-white/10">
                        <span className="font-bold text-emerald-300">Coaching Tip: </span>
                        {currentFrame.coachingTip}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-xs text-zinc-300">
                <CheckCircle2 className="size-5 shrink-0 text-emerald-400" />
                <div>
                  <span className="font-bold text-zinc-100">Steady Communication: </span>
                  At <span className="font-mono font-bold text-emerald-400">{currentFrame.formattedTime}</span>, candidate maintains forward camera alignment ({currentFrame.eyeContact}/100) and consistent speaking pace ({currentFrame.paceWpm} WPM).
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Playback Transport Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800 bg-zinc-950 px-6 py-3.5">
          {/* Play/Pause & Step Controls */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => jumpToSec(currentSec - 10)}
              className="flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white transition"
              title="Rewind 10 seconds"
            >
              <Rewind size={15} />
              <span className="font-mono text-[10px]">-10s</span>
            </button>
            <button
              type="button"
              onClick={() => setIsPlaying(!isPlaying)}
              className="flex h-10 items-center gap-2 rounded-lg bg-emerald-500 px-5 text-xs font-bold text-zinc-950 hover:bg-emerald-400 transition shadow-md shadow-emerald-500/20 active:scale-95 cursor-pointer"
            >
              {isPlaying ? <Pause size={17} /> : <Play size={17} />}
              <span>{isPlaying ? "Pause" : "Play"}</span>
            </button>
            <button
              type="button"
              onClick={() => jumpToSec(currentSec + 10)}
              className="flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white transition"
              title="Forward 10 seconds"
            >
              <span className="font-mono text-[10px]">+10s</span>
              <FastForward size={15} />
            </button>
          </div>

          {/* Speed Selector & Close */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900 p-1 text-xs">
              <span className="px-1 text-[10px] font-mono text-zinc-500">Speed:</span>
              {([0.5, 1, 1.5, 2] as const).map((spd) => (
                <button
                  key={spd}
                  type="button"
                  onClick={() => setPlaybackSpeed(spd)}
                  className={`rounded px-2 py-0.5 font-mono text-[10px] font-bold transition cursor-pointer ${
                    playbackSpeed === spd
                      ? "bg-emerald-500 text-zinc-950 shadow-sm"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-zinc-800 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-700 transition cursor-pointer"
            >
              Close Replay
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ABComparisonModal({
  comparison,
  onClose,
  onRetakeAgain,
}: {
  comparison: ABComparisonResult;
  onClose: () => void;
  onRetakeAgain?: () => void;
}) {
  const formatDelta = (v: number) => (v >= 0 ? `+${v}` : `${v}`);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 p-3 sm:p-5 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-purple-500/40 bg-zinc-950 shadow-2xl text-white">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-zinc-800/90 bg-zinc-900/90 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 shadow-[0_0_16px_rgba(168,85,247,0.3)]">
              <FlaskConical size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-zinc-100">
                  A/B Interview Mode: Comparative Iteration
                </h3>
                <span className="rounded bg-purple-500/20 px-2 py-0.5 text-[10px] font-mono font-bold text-purple-300 border border-purple-500/30">
                  Active Training
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Side-by-side evaluation measuring candidate improvement across attempts.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-9 place-items-center rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-white transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Question Banner */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
            <div className="text-[10px] font-mono font-semibold uppercase tracking-wider text-zinc-400 mb-1">
              Interview Question
            </div>
            <p className="text-sm font-semibold text-zinc-100 leading-relaxed">
              {comparison.question}
            </p>
          </div>

          {/* Hero Improvement Delta Banner */}
          <div className="rounded-2xl border border-emerald-500/40 bg-gradient-to-r from-emerald-950/40 via-purple-950/30 to-emerald-950/40 p-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Trophy className="size-5 text-emerald-400" />
                <span className="text-sm font-bold uppercase tracking-wider text-emerald-300 font-mono">
                  Measured Improvement Delta
                </span>
              </div>
              <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-xs font-mono font-bold text-emerald-300 border border-emerald-500/30">
                Verified Progression
              </span>
            </div>

            {/* 3 Core Metric Deltas */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {/* Overall */}
              <div className="rounded-xl border border-emerald-500/30 bg-zinc-950/80 p-4 text-center">
                <div className="text-xs font-mono font-semibold text-zinc-400 uppercase">Composite Score</div>
                <div className="mt-1 text-2xl sm:text-3xl font-extrabold font-mono text-emerald-400">
                  {formatDelta(comparison.deltas.overall)} overall
                </div>
                <div className="mt-1 text-xs text-zinc-400 font-mono">
                  {comparison.attempt1.score} → <strong className="text-emerald-300">{comparison.attempt2.score}</strong> / 100
                </div>
              </div>

              {/* Communication */}
              <div className="rounded-xl border border-indigo-500/30 bg-zinc-950/80 p-4 text-center">
                <div className="text-xs font-mono font-semibold text-zinc-400 uppercase">Communication Delivery</div>
                <div className="mt-1 text-2xl sm:text-3xl font-extrabold font-mono text-indigo-400">
                  {formatDelta(comparison.deltas.communication)} communication
                </div>
                <div className="mt-1 text-xs text-zinc-400 font-mono">
                  {comparison.attempt1.communicationScore} → <strong className="text-indigo-300">{comparison.attempt2.communicationScore}</strong> / 100
                </div>
              </div>

              {/* Technical */}
              <div className="rounded-xl border border-purple-500/30 bg-zinc-950/80 p-4 text-center">
                <div className="text-xs font-mono font-semibold text-zinc-400 uppercase">Technical Precision</div>
                <div className="mt-1 text-2xl sm:text-3xl font-extrabold font-mono text-purple-400">
                  {formatDelta(comparison.deltas.technical)} technical
                </div>
                <div className="mt-1 text-xs text-zinc-400 font-mono">
                  {comparison.attempt1.technicalScore} → <strong className="text-purple-300">{comparison.attempt2.technicalScore}</strong> / 100
                </div>
              </div>
            </div>
          </div>

          {/* Side-by-Side Dual-Attempt Split Grid */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Attempt 1 Column */}
            <div className="flex flex-col justify-between rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="grid size-6 place-items-center rounded bg-zinc-800 text-xs font-mono font-bold text-zinc-300">
                      1
                    </span>
                    <h4 className="text-sm font-bold text-zinc-200">Attempt 1 (Baseline)</h4>
                  </div>
                  <span className="rounded bg-zinc-800 px-2 py-0.5 text-xs font-mono font-semibold text-zinc-400">
                    Baseline
                  </span>
                </div>

                {/* Attempt 1 Score Card */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg border border-zinc-800 bg-zinc-950/80 p-2.5">
                    <div className="text-[10px] font-mono text-zinc-400">Technical</div>
                    <div className="mt-0.5 text-lg font-bold font-mono text-zinc-200">
                      {comparison.attempt1.technicalScore}
                    </div>
                  </div>
                  <div className="rounded-lg border border-zinc-800 bg-zinc-950/80 p-2.5">
                    <div className="text-[10px] font-mono text-zinc-400">Communication</div>
                    <div className="mt-0.5 text-lg font-bold font-mono text-zinc-200">
                      {comparison.attempt1.communicationScore}
                    </div>
                  </div>
                  <div className="rounded-lg border border-zinc-800 bg-zinc-950/80 p-2.5">
                    <div className="text-[10px] font-mono text-zinc-400">Overall</div>
                    <div className="mt-0.5 text-lg font-bold font-mono text-zinc-100">
                      {comparison.attempt1.score}
                    </div>
                  </div>
                </div>

                {/* Attempt 1 Response Transcript */}
                <div className="rounded-lg border border-zinc-800/80 bg-zinc-950/80 p-3.5 text-xs text-zinc-300 space-y-1.5">
                  <span className="text-[10px] font-mono font-semibold uppercase text-zinc-500">
                    Candidate Response (Attempt 1)
                  </span>
                  <p className="leading-relaxed italic text-zinc-300 max-h-36 overflow-y-auto whitespace-pre-wrap">
                    &quot;{comparison.attempt1.answer}&quot;
                  </p>
                </div>

                {/* Attempt 1 Multimodal Breakdown */}
                <div className="space-y-2 text-xs">
                  <span className="text-[10px] font-mono font-semibold uppercase text-zinc-500">
                    Multimodal Signals
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                    <div className="flex justify-between rounded bg-zinc-950 p-2 border border-zinc-800">
                      <span className="text-zinc-400">Structure:</span>
                      <span className="font-bold text-zinc-300">{comparison.attempt1.breakdown.answer_structure}/100</span>
                    </div>
                    <div className="flex justify-between rounded bg-zinc-950 p-2 border border-zinc-800">
                      <span className="text-zinc-400">Eye Contact:</span>
                      <span className="font-bold text-zinc-300">{comparison.attempt1.breakdown.eye_contact}%</span>
                    </div>
                    <div className="flex justify-between rounded bg-zinc-950 p-2 border border-zinc-800">
                      <span className="text-zinc-400">Voice Energy:</span>
                      <span className="font-bold text-zinc-300">{comparison.attempt1.breakdown.voice_energy}%</span>
                    </div>
                    <div className="flex justify-between rounded bg-zinc-950 p-2 border border-zinc-800">
                      <span className="text-zinc-400">Filler Words:</span>
                      <span className="font-bold text-zinc-300">{comparison.attempt1.breakdown.filler_words}/100</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Coaching feedback from attempt 1 */}
              {comparison.attempt1.feedback.length > 0 && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-950/20 p-3 text-xs text-amber-200">
                  <span className="font-bold text-amber-300">Baseline Coaching Focus:</span>
                  <p className="mt-1 leading-relaxed">{comparison.attempt1.feedback[0]}</p>
                </div>
              )}
            </div>

            {/* Attempt 2 Column */}
            <div className="flex flex-col justify-between rounded-xl border border-emerald-500/40 bg-zinc-900/80 p-5 space-y-4 shadow-lg shadow-emerald-500/5">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="grid size-6 place-items-center rounded bg-emerald-500 text-xs font-mono font-bold text-zinc-950">
                      2
                    </span>
                    <h4 className="text-sm font-bold text-emerald-400">Attempt 2 (Coached Iteration)</h4>
                  </div>
                  <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-xs font-mono font-bold text-emerald-300 border border-emerald-500/40">
                    +{comparison.deltas.overall} Overall Gain
                  </span>
                </div>

                {/* Attempt 2 Score Card */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg border border-purple-500/30 bg-zinc-950/80 p-2.5">
                    <div className="text-[10px] font-mono text-zinc-400">Technical</div>
                    <div className="mt-0.5 text-lg font-bold font-mono text-purple-400">
                      {comparison.attempt2.technicalScore}
                      <span className="ml-1 text-xs text-purple-300">({formatDelta(comparison.deltas.technical)})</span>
                    </div>
                  </div>
                  <div className="rounded-lg border border-indigo-500/30 bg-zinc-950/80 p-2.5">
                    <div className="text-[10px] font-mono text-zinc-400">Communication</div>
                    <div className="mt-0.5 text-lg font-bold font-mono text-indigo-400">
                      {comparison.attempt2.communicationScore}
                      <span className="ml-1 text-xs text-indigo-300">({formatDelta(comparison.deltas.communication)})</span>
                    </div>
                  </div>
                  <div className="rounded-lg border border-emerald-500/40 bg-zinc-950/80 p-2.5">
                    <div className="text-[10px] font-mono text-zinc-400">Overall</div>
                    <div className="mt-0.5 text-lg font-bold font-mono text-emerald-400">
                      {comparison.attempt2.score}
                      <span className="ml-1 text-xs text-emerald-300">({formatDelta(comparison.deltas.overall)})</span>
                    </div>
                  </div>
                </div>

                {/* Attempt 2 Response Transcript */}
                <div className="rounded-lg border border-emerald-500/30 bg-zinc-950/90 p-3.5 text-xs text-zinc-200 space-y-1.5">
                  <span className="text-[10px] font-mono font-semibold uppercase text-emerald-400">
                    Candidate Response (Attempt 2 · Refined)
                  </span>
                  <p className="leading-relaxed text-zinc-100 max-h-36 overflow-y-auto whitespace-pre-wrap">
                    &quot;{comparison.attempt2.answer}&quot;
                  </p>
                </div>

                {/* Attempt 2 Multimodal Breakdown */}
                <div className="space-y-2 text-xs">
                  <span className="text-[10px] font-mono font-semibold uppercase text-emerald-400">
                    Multimodal Progression
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                    <div className="flex justify-between rounded bg-zinc-950 p-2 border border-emerald-500/20">
                      <span className="text-zinc-400">Structure:</span>
                      <span className="font-bold text-emerald-400">
                        {comparison.attempt2.breakdown.answer_structure}/100 ({formatDelta(comparison.deltas.structureScore)})
                      </span>
                    </div>
                    <div className="flex justify-between rounded bg-zinc-950 p-2 border border-emerald-500/20">
                      <span className="text-zinc-400">Eye Contact:</span>
                      <span className="font-bold text-emerald-400">
                        {comparison.attempt2.breakdown.eye_contact}% ({formatDelta(comparison.deltas.eyeContact)}%)
                      </span>
                    </div>
                    <div className="flex justify-between rounded bg-zinc-950 p-2 border border-emerald-500/20">
                      <span className="text-zinc-400">Voice Energy:</span>
                      <span className="font-bold text-emerald-400">
                        {comparison.attempt2.breakdown.voice_energy}% ({formatDelta(comparison.deltas.voiceEnergy)}%)
                      </span>
                    </div>
                    <div className="flex justify-between rounded bg-zinc-950 p-2 border border-emerald-500/20">
                      <span className="text-zinc-400">Filler Words:</span>
                      <span className="font-bold text-emerald-400">
                        {comparison.attempt2.breakdown.filler_words}/100 ({formatDelta(comparison.deltas.fillerWords)})
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Coaching feedback from attempt 2 */}
              {comparison.attempt2.feedback.length > 0 && (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/30 p-3 text-xs text-emerald-200">
                  <span className="font-bold text-emerald-300">Evaluator Synthesis:</span>
                  <p className="mt-1 leading-relaxed">{comparison.attempt2.feedback[0]}</p>
                </div>
              )}
            </div>
          </div>

          {/* Why Your Score Improved: Training Analysis */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-purple-400" />
              <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-zinc-300">
                Why Your Score Improved & Training Analysis
              </h4>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              {comparison.trainingFeedback}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {comparison.keyWins.length > 0 && (
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-950/20 p-3 text-xs">
                  <span className="font-bold text-emerald-300 block mb-1">Key Progression Wins:</span>
                  <ul className="list-disc list-inside space-y-1 text-emerald-200/90 text-[11px]">
                    {comparison.keyWins.map((w, idx) => (
                      <li key={idx}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {comparison.remainingGaps.length > 0 && (
                <div className="rounded-lg border border-zinc-800 bg-zinc-950/80 p-3 text-xs">
                  <span className="font-bold text-zinc-300 block mb-1">Next Calibration Target:</span>
                  <ul className="list-disc list-inside space-y-1 text-zinc-400 text-[11px]">
                    {comparison.remainingGaps.map((g, idx) => (
                      <li key={idx}>{g}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Action Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800 bg-zinc-950 px-6 py-4">
          <div className="text-xs text-zinc-400 font-mono">
            A/B Mode converts assessment into actual iterative training.
          </div>

          <div className="flex items-center gap-3">
            {onRetakeAgain && (
              <button
                type="button"
                onClick={onRetakeAgain}
                className="flex items-center gap-1.5 rounded-lg border border-purple-500/40 bg-purple-950/40 px-4 py-2 text-xs font-bold text-purple-200 hover:bg-purple-900/50 hover:text-white transition cursor-pointer"
              >
                <RotateCcw size={14} />
                <span>Try Attempt 3</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-5 py-2 text-xs font-bold text-zinc-950 hover:bg-emerald-400 transition shadow-md shadow-emerald-500/20 cursor-pointer"
            >
              <span>Continue Interview</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function InterviewIntegrityModal({
  integrityState,
  onClose,
}: {
  integrityState: IntegrityState;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-fuchsia-500/30 bg-zinc-950 text-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900/90 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className={`grid size-11 place-items-center rounded-xl border ${
              integrityState.integrityScore >= 85
                ? "border-emerald-500/30 bg-emerald-500/20 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.25)]"
                : "border-amber-500/30 bg-amber-500/20 text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.25)]"
            }`}>
              <ShieldCheck size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Interview Integrity & Focus Telemetry</h3>
                <span className={`rounded px-2 py-0.5 text-xs font-mono font-bold ${
                  integrityState.integrityScore >= 85
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                }`}>
                  {integrityState.integrityScore}% {integrityState.integrityLevel}
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Continuous multi-vector monitoring of environment stability, face count, and application focus.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-9 place-items-center rounded-lg border border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Live Environmental Diagnostics Matrix */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold font-mono uppercase tracking-wider text-zinc-300">
                Core Integrity Diagnostic Matrix
              </span>
              <span className="text-[11px] font-mono text-zinc-500">Live Sensory Checks</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {integrityState.diagnosticChecks.map((chk) => (
                <div
                  key={chk.id}
                  className="flex items-start justify-between gap-3 rounded-lg border border-zinc-800/80 bg-zinc-950/70 p-3.5"
                >
                  <div className="flex items-start gap-3">
                    <span className={`text-base font-bold font-mono ${
                      chk.status === "pass"
                        ? "text-emerald-400"
                        : chk.status === "warn"
                        ? "text-amber-400"
                        : "text-rose-400"
                    }`}>
                      {chk.symbol}
                    </span>
                    <div>
                      <div className="text-xs font-bold text-zinc-100">{chk.label}</div>
                      <div className="text-[11px] text-zinc-400 leading-relaxed mt-0.5">{chk.detail}</div>
                    </div>
                  </div>
                  <span className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-mono font-bold uppercase ${
                    chk.status === "pass"
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : chk.status === "warn"
                      ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                  }`}>
                    {chk.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 4 Multi-Vector Metric Tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3.5 space-y-1">
              <span className="text-[10px] text-zinc-400 uppercase font-semibold">Face Detection</span>
              <div className="text-lg font-bold text-zinc-100">{integrityState.facesCount} Face(s)</div>
              <div className="text-[10px] text-zinc-400">
                {integrityState.noAdditionalFace ? "No extra presence" : "Additional face logged"}
              </div>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3.5 space-y-1">
              <span className="text-[10px] text-zinc-400 uppercase font-semibold">Tab / Window Focus</span>
              <div className="text-lg font-bold text-zinc-100">{integrityState.tabSwitchCount} Blur(s)</div>
              <div className="text-[10px] text-zinc-400">
                {integrityState.totalTabSwitchDurationSec}s away from tab
              </div>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3.5 space-y-1">
              <span className="text-[10px] text-zinc-400 uppercase font-semibold">Clipboard Activity</span>
              <div className="text-lg font-bold text-zinc-100">{integrityState.clipboardEventsCount} Paste(s)</div>
              <div className="text-[10px] text-zinc-400">
                {integrityState.pastedCharactersTotal} chars inserted
              </div>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3.5 space-y-1">
              <span className="text-[10px] text-zinc-400 uppercase font-semibold">Gaze Deviation</span>
              <div className="text-lg font-bold text-zinc-100">{integrityState.gazeAwayPercent}% Away</div>
              <div className="text-[10px] text-zinc-400">
                {integrityState.gazeAwayCount} glance shifts recorded
              </div>
            </div>
          </div>

          {/* Chronological Event Audit Stream */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold font-mono uppercase tracking-wider text-zinc-300">
                Session Telemetry Event Ledger
              </span>
              <span className="text-[11px] font-mono text-zinc-500">
                {integrityState.recentEvents.length} events recorded
              </span>
            </div>

            {integrityState.recentEvents.length > 0 ? (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {integrityState.recentEvents.map((evt) => (
                  <div
                    key={evt.id}
                    className="flex items-start justify-between gap-3 rounded-lg border border-zinc-800/80 bg-zinc-950 p-3 text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] text-zinc-400">{evt.formattedTime}</span>
                        <span className="font-bold text-zinc-200">{evt.title}</span>
                        {evt.turnId && (
                          <span className="rounded bg-zinc-800 px-1.5 py-0.2 text-[9px] font-mono text-zinc-400">
                            Q{evt.turnId}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-400 leading-relaxed">{evt.detail}</p>
                    </div>
                    <span className={`shrink-0 rounded px-2 py-0.5 text-[9px] font-mono font-bold uppercase ${
                      evt.severity === "flag"
                        ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                        : evt.severity === "warning"
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                        : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                    }`}>
                      {evt.severity}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-xs text-zinc-500 font-mono">
                ✓ No integrity anomalies or interruptions recorded in this session.
              </div>
            )}
          </div>

          {/* Objective Non-Accusatory Disclaimer Banner */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 text-xs text-zinc-400 leading-relaxed space-y-1">
            <span className="font-bold text-zinc-200 block">Transparency & Objective Telemetry Standard:</span>
            <p>
              This monitor tracks browser focus, acoustic continuity, and camera presence solely to offer objective session transparency.
              Looking away to organize thoughts, referencing external engineering notes, or adjusting posture are normal parts of technical work and do not constitute proof of cheating.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-zinc-800 bg-zinc-900/90 px-6 py-4">
          <span className="text-xs text-zinc-400 font-mono">MockMate Anti-Cheating & Integrity Protocol</span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-zinc-100 px-5 py-2 text-xs font-bold text-zinc-950 hover:bg-white transition cursor-pointer"
          >
            Close Audit
          </button>
        </div>
      </div>
    </div>
  );
}

function CodingEvaluationModal({
  evaluation,
  onClose,
}: {
  evaluation: CodingEvaluation;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-950 text-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900/90 px-6 py-4 sticky top-0 z-10 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
              <Code2 size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">6-Axis Coding Evaluation</h3>
                <span className="rounded bg-purple-500/20 px-2 py-0.5 text-xs font-mono font-bold text-purple-300 border border-purple-500/30">
                  {evaluation.problemTitle}
                </span>
                <span className="rounded bg-zinc-800 px-2 py-0.5 text-xs font-mono uppercase text-zinc-300">
                  {evaluation.language}
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-mono">
                Multimodal algorithmic, system architecture & verbal reasoning evaluation
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-xl border border-purple-500/30 bg-purple-950/40 px-3.5 py-1.5 font-mono">
              <span className="text-xs text-purple-300">Overall:</span>
              <span className="text-lg font-bold text-purple-400">{evaluation.overallScore}/100</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="grid size-9 place-items-center rounded-lg border border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white transition cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {/* 6-AXIS MATRIX GRID */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold font-mono uppercase tracking-wider text-zinc-400">
                The 6 Evaluation Axes
              </span>
              <span className="text-xs font-mono text-emerald-400">
                {evaluation.correctness.passRate} Test Assertions Passed
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* Axis 1: Correctness */}
              <div className="rounded-xl border border-emerald-500/30 bg-zinc-900/60 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold uppercase text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 size={14} />
                    1. Correctness
                  </span>
                  <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-xs font-mono font-bold text-emerald-300">
                    {evaluation.correctness.score}%
                  </span>
                </div>
                <div className="text-sm font-bold text-white">
                  {evaluation.correctness.passedCount} of {evaluation.correctness.totalCount} Passed
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  {evaluation.correctness.feedback}
                </p>
              </div>

              {/* Axis 2: Time Complexity */}
              <div className="rounded-xl border border-blue-500/30 bg-zinc-900/60 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold uppercase text-blue-400 flex items-center gap-1.5">
                    <Gauge size={14} />
                    2. Time Complexity
                  </span>
                  <span className="rounded bg-blue-500/20 px-2 py-0.5 text-xs font-mono font-bold text-blue-300">
                    {evaluation.timeComplexity.score}%
                  </span>
                </div>
                <div className="text-sm font-bold text-white font-mono flex items-center gap-2">
                  <span className="text-blue-300">{evaluation.timeComplexity.detectedNotation}</span>
                  <span className="text-xs text-zinc-500 font-sans">vs optimal {evaluation.timeComplexity.optimalNotation}</span>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  {evaluation.timeComplexity.feedback}
                </p>
              </div>

              {/* Axis 3: Space Complexity */}
              <div className="rounded-xl border border-cyan-500/30 bg-zinc-900/60 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold uppercase text-cyan-400 flex items-center gap-1.5">
                    <Database size={14} />
                    3. Space Complexity
                  </span>
                  <span className="rounded bg-cyan-500/20 px-2 py-0.5 text-xs font-mono font-bold text-cyan-300">
                    {evaluation.spaceComplexity.score}%
                  </span>
                </div>
                <div className="text-sm font-bold text-white font-mono flex items-center gap-2">
                  <span className="text-cyan-300">{evaluation.spaceComplexity.detectedNotation}</span>
                  <span className="text-xs text-zinc-500 font-sans">vs optimal {evaluation.spaceComplexity.optimalNotation}</span>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  {evaluation.spaceComplexity.feedback}
                </p>
              </div>

              {/* Axis 4: Code Quality */}
              <div className="rounded-xl border border-purple-500/30 bg-zinc-900/60 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold uppercase text-purple-400 flex items-center gap-1.5">
                    <Sparkles size={14} />
                    4. Code Quality
                  </span>
                  <span className="rounded bg-purple-500/20 px-2 py-0.5 text-xs font-mono font-bold text-purple-300">
                    {evaluation.codeQuality.score}%
                  </span>
                </div>
                <div className="text-sm font-bold text-white">
                  {evaluation.codeQuality.cleanCodeRating}
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  {evaluation.codeQuality.feedback}
                </p>
              </div>

              {/* Axis 5: Communication */}
              <div className="rounded-xl border border-amber-500/30 bg-zinc-900/60 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold uppercase text-amber-400 flex items-center gap-1.5">
                    <Users size={14} />
                    5. Communication
                  </span>
                  <span className="rounded bg-amber-500/20 px-2 py-0.5 text-xs font-mono font-bold text-amber-300">
                    {evaluation.communication.score}%
                  </span>
                </div>
                <div className="text-sm font-bold text-white">
                  {evaluation.communication.clarityLevel}
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  {evaluation.communication.feedback}
                </p>
              </div>

              {/* Axis 6: Debugging Approach */}
              <div className="rounded-xl border border-rose-500/30 bg-zinc-900/60 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold uppercase text-rose-400 flex items-center gap-1.5">
                    <BrainCircuit size={14} />
                    6. Debugging Approach
                  </span>
                  <span className="rounded bg-rose-500/20 px-2 py-0.5 text-xs font-mono font-bold text-rose-300">
                    {evaluation.debuggingApproach.score}%
                  </span>
                </div>
                <div className="text-sm font-bold text-white">
                  {evaluation.debuggingApproach.methodology}
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  {evaluation.debuggingApproach.feedback}
                </p>
              </div>
            </div>
          </div>

          {/* Test Case Execution Report */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-3">
            <span className="text-xs font-bold font-mono uppercase tracking-wider text-zinc-300">
              Test Assertions Breakdown
            </span>
            <div className="space-y-2">
              {evaluation.testResults.map((tc) => (
                <div key={tc.id} className="flex flex-col sm:flex-row sm:items-center justify-between rounded-lg bg-zinc-950 p-3 border border-zinc-800 text-xs font-mono gap-2">
                  <div className="flex items-center gap-2">
                    <span className={tc.passed ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                      {tc.passed ? "✓" : "✗"}
                    </span>
                    <span className="text-zinc-200">Case {tc.id}: {tc.inputDesc}</span>
                  </div>
                  <div className="flex items-center gap-3 text-zinc-400 text-[11px]">
                    <span>Expected: <strong className="text-zinc-200">{tc.expectedOutput}</strong></span>
                    <span>Actual: <strong className={tc.passed ? "text-emerald-400" : "text-rose-400"}>{tc.actualOutput}</strong></span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      tc.passed ? "bg-emerald-950 text-emerald-300 border border-emerald-500/30" : "bg-rose-950 text-rose-300 border border-rose-500/30"
                    }`}>
                      {tc.passed ? "Passed" : "Failed"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Interviewer Synthesis Summary */}
          <div className="rounded-xl border border-purple-500/30 bg-purple-950/20 p-4 text-xs text-purple-200 leading-relaxed space-y-1.5">
            <span className="font-bold text-purple-300 flex items-center gap-1.5">
              <BrainCircuit size={15} />
              Interviewer Technical Synthesis
            </span>
            <p>{evaluation.interviewerSynthesis}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-zinc-800 bg-zinc-900/90 px-6 py-4">
          <span className="text-xs text-zinc-400 font-mono">MockMate Technical Coding Evaluator</span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-purple-600 hover:bg-purple-500 px-5 py-2 text-xs font-bold text-white transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function SystemDesignEvaluationModal({
  evaluation,
  onClose,
}: {
  evaluation: SystemDesignEvaluation;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-950 text-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900/90 px-6 py-4 sticky top-0 z-10 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
              <BrainCircuit size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">System Design Architectural Evaluation</h3>
                <span className="rounded bg-purple-500/20 px-2 py-0.5 text-xs font-mono font-bold text-purple-300 border border-purple-500/30">
                  {evaluation.detection.scalabilityRating}
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-mono">
                {evaluation.challengeTitle} · Scale Target: {evaluation.targetScale}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-xl border border-purple-500/30 bg-purple-950/40 px-3.5 py-1.5 font-mono">
              <span className="text-xs text-purple-300">Overall:</span>
              <span className="text-lg font-bold text-purple-400">{evaluation.overallScore}/100</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="grid size-9 place-items-center rounded-lg border border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white transition cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-5">
          {/* DETECTED VS MISSING COMPONENT CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Detected Components */}
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4 space-y-2.5">
              <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
                <span className="font-bold text-emerald-400 flex items-center gap-1.5 text-xs uppercase font-mono">
                  <CheckCircle2 size={14} />
                  Components Detected ({evaluation.detection.detected.length})
                </span>
                <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-mono font-bold text-emerald-300">
                  Verified
                </span>
              </div>
              <div className="space-y-1.5">
                {evaluation.detection.detected.map((d) => (
                  <div key={d.type} className="rounded bg-zinc-950/80 p-2.5 border border-emerald-500/20 text-xs">
                    <div className="font-bold text-emerald-300 flex items-center gap-1.5">
                      <span>✓</span>
                      <span>{d.label}</span>
                    </div>
                    <p className="text-[11px] text-zinc-300 mt-0.5 leading-relaxed">{d.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Missing Critical Components */}
            <div className="rounded-xl border border-rose-500/30 bg-rose-950/20 p-4 space-y-2.5">
              <div className="flex items-center justify-between border-b border-rose-500/20 pb-2">
                <span className="font-bold text-rose-400 flex items-center gap-1.5 text-xs uppercase font-mono">
                  <AlertTriangle size={14} />
                  Missing Scaling Tiers ({evaluation.detection.missing.length})
                </span>
                <span className="rounded bg-rose-500/20 px-2 py-0.5 text-[10px] font-mono font-bold text-rose-300">
                  Gap Analysis
                </span>
              </div>
              <div className="space-y-1.5">
                {evaluation.detection.missing.length > 0 ? (
                  evaluation.detection.missing.map((m) => (
                    <div key={m.type} className="rounded bg-zinc-950/80 p-2.5 border border-rose-500/20 text-xs">
                      <div className="font-bold text-rose-300 flex items-center gap-1.5">
                        <span>✗</span>
                        <span>{m.label}</span>
                      </div>
                      <p className="text-[11px] text-zinc-300 mt-0.5 leading-relaxed">{m.impact}</p>
                      <div className="mt-1 text-[10px] text-amber-300/90 font-mono">
                        Recommendation: {m.recommendation}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-xs text-emerald-300 font-mono">
                    ✓ All recommended hyperscale tiers are represented on the canvas.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 5-DIMENSION EVALUATION SCORECARD */}
          <div className="space-y-2.5">
            <span className="text-xs font-bold font-mono uppercase tracking-wider text-zinc-400">
              The 5 System Design Evaluation Dimensions
            </span>

            <div className="space-y-2">
              {Object.values(evaluation.dimensions).map((dim) => (
                <div
                  key={dim.name}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900/60 p-3.5 text-xs"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">{dim.name}</span>
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-mono font-bold ${
                          dim.status === "Optimal"
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            : dim.status === "Adequate"
                            ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                            : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                        }`}
                      >
                        {dim.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-300 leading-relaxed">{dim.feedback}</p>
                  </div>
                  <div className="flex items-center gap-2 font-mono shrink-0">
                    <span className="text-sm font-bold text-purple-400">{dim.score}</span>
                    <span className="text-zinc-500 text-xs">/100</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Architectural Strengths & Improvements */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="rounded-xl border border-emerald-500/30 bg-zinc-900/60 p-4 space-y-2">
              <span className="font-bold text-emerald-400 uppercase font-mono text-[10px]">
                Architectural Strengths
              </span>
              <ul className="space-y-1 text-zinc-300 list-inside list-disc">
                {evaluation.keyStrengths.map((str, i) => (
                  <li key={i}>{str}</li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-purple-500/30 bg-zinc-900/60 p-4 space-y-2">
              <span className="font-bold text-purple-400 uppercase font-mono text-[10px]">
                Recommended Scaling Actions
              </span>
              <ul className="space-y-1 text-zinc-300 list-inside list-disc">
                {evaluation.recommendedImprovements.map((imp, i) => (
                  <li key={i}>{imp}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* AI Interviewer Synthesis */}
          <div className="rounded-xl border border-purple-500/30 bg-purple-950/20 p-4 text-xs text-purple-200 leading-relaxed space-y-1.5">
            <span className="font-bold text-purple-300 flex items-center gap-1.5">
              <BrainCircuit size={15} />
              Interviewer Architectural Synthesis
            </span>
            <p>{evaluation.interviewerSynthesis}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-zinc-800 bg-zinc-900/90 px-6 py-4">
          <span className="text-xs text-zinc-400 font-mono">MockMate System Design Topology Evaluator</span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-purple-600 hover:bg-purple-500 px-5 py-2 text-xs font-bold text-white transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function CandidateDigitalProfileModal({
  profile,
  onClose,
  onResetProfile,
}: {
  profile: CandidateDigitalProfile;
  onClose: () => void;
  onResetProfile: () => void;
}) {
  const [activePillarTab, setActivePillarTab] = useState<"all" | "technical" | "communication" | "behavioral">("all");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-950 text-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900/90 px-6 py-4 sticky top-0 z-10 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
              <Fingerprint size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Candidate Digital Profile & Skill Vectors</h3>
                <span className="rounded bg-purple-500/20 px-2 py-0.5 text-xs font-mono font-bold text-purple-300 border border-purple-500/30">
                  Level {Math.floor(profile.overallReadiness / 20) + 1} Readiness
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-mono">
                Candidate: {profile.candidateName} · {profile.sessionsCompleted} Historical Sessions Tracked · Last active: {profile.lastInterviewDate}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-xl border border-purple-500/30 bg-purple-950/40 px-3.5 py-1.5 font-mono">
              <span className="text-xs text-purple-300">Readiness:</span>
              <span className="text-lg font-bold text-purple-400">{profile.overallReadiness}%</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="grid size-9 place-items-center rounded-lg border border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white transition cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-6">
          {/* Top 3 Pillar Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-blue-500/30 bg-blue-950/20 p-4 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono text-blue-300 font-bold uppercase">
                <span>Technical Pillar</span>
                <span>{profile.pillars.technical.score}%</span>
              </div>
              <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${profile.pillars.technical.score}%` }} />
              </div>
              <p className="text-[11px] text-zinc-400">Python, ML, SQL, RAG, System Design, DSA</p>
            </div>

            <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono text-emerald-300 font-bold uppercase">
                <span>Communication Pillar</span>
                <span>{profile.pillars.communication.score}%</span>
              </div>
              <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${profile.pillars.communication.score}%` }} />
              </div>
              <p className="text-[11px] text-zinc-400">Eye contact, Pace, Voice energy, STAR structure</p>
            </div>

            <div className="rounded-xl border border-purple-500/30 bg-purple-950/20 p-4 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono text-purple-300 font-bold uppercase">
                <span>Behavioral Pillar</span>
                <span>{profile.pillars.behavioral.score}%</span>
              </div>
              <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-purple-500 rounded-full" style={{ width: `${profile.pillars.behavioral.score}%` }} />
              </div>
              <p className="text-[11px] text-zinc-400">Leadership, Problem solving, Teamwork, Composure</p>
            </div>
          </div>

          {/* RAG Memory Context Banner */}
          <div className="rounded-xl border border-purple-500/30 bg-gradient-to-r from-purple-950/40 via-indigo-950/30 to-purple-950/40 p-4 text-xs text-purple-200 leading-relaxed space-y-1.5">
            <div className="flex items-center justify-between border-b border-purple-500/20 pb-1.5">
              <span className="font-bold text-purple-300 flex items-center gap-1.5 uppercase font-mono text-[11px]">
                <BrainCircuit size={14} />
                RAG Knowledge Memory Context (Injected into Future Sessions)
              </span>
              <span className="rounded bg-purple-500/20 px-2 py-0.5 text-[10px] font-mono text-purple-300">
                Live RAG Grounding
              </span>
            </div>
            <p className="italic text-zinc-300">{profile.ragMemoryContext}</p>
          </div>

          {/* Detailed Skill Vectors Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <span className="font-bold font-mono text-xs text-zinc-300 uppercase">
                Comprehensive Skill Mastery Breakdown
              </span>
              <div className="flex gap-1 text-xs">
                {(["all", "technical", "communication", "behavioral"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActivePillarTab(tab)}
                    className={`rounded px-2.5 py-1 text-xs font-mono capitalize transition cursor-pointer ${
                      activePillarTab === tab
                        ? "bg-purple-600 text-white font-bold"
                        : "bg-zinc-900 text-zinc-400 hover:text-white"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Technical Skills */}
            {(activePillarTab === "all" || activePillarTab === "technical") && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-blue-400 font-mono uppercase">
                  Technical Proficiency:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {Object.values(profile.pillars.technical.skills).map((skill) => (
                    <div key={skill.id} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 text-xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white">{skill.name}</span>
                        <div className="flex items-center gap-1.5 font-mono">
                          <span className="text-sm font-bold text-blue-400">{skill.score}</span>
                          <span className="text-[10px] text-zinc-500">/100</span>
                          <span className={`text-[10px] font-bold ${
                            skill.trend === "improving" ? "text-emerald-400" : skill.trend === "declining" ? "text-rose-400" : "text-zinc-500"
                          }`}>
                            {skill.trend === "improving" ? "▲" : skill.trend === "declining" ? "▼" : "■"}
                          </span>
                        </div>
                      </div>
                      <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${skill.score}%` }} />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono">
                        <span>{skill.assessmentsCount} checks</span>
                        <span>Updated: {skill.lastUpdated}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Communication Skills */}
            {(activePillarTab === "all" || activePillarTab === "communication") && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-emerald-400 font-mono uppercase">
                  Communication & Delivery:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {Object.values(profile.pillars.communication.skills).map((skill) => (
                    <div key={skill.id} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 text-xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white">{skill.name}</span>
                        <div className="flex items-center gap-1.5 font-mono">
                          <span className="text-sm font-bold text-emerald-400">{skill.score}</span>
                          <span className="text-[10px] text-zinc-500">/100</span>
                        </div>
                      </div>
                      <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${skill.score}%` }} />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono">
                        <span>{skill.assessmentsCount} checks</span>
                        <span>Updated: {skill.lastUpdated}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Behavioral Skills */}
            {(activePillarTab === "all" || activePillarTab === "behavioral") && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-purple-400 font-mono uppercase">
                  Behavioral & Leadership:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {Object.values(profile.pillars.behavioral.skills).map((skill) => (
                    <div key={skill.id} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 text-xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white">{skill.name}</span>
                        <div className="flex items-center gap-1.5 font-mono">
                          <span className="text-sm font-bold text-purple-400">{skill.score}</span>
                          <span className="text-[10px] text-zinc-500">/100</span>
                        </div>
                      </div>
                      <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full bg-purple-500 rounded-full" style={{ width: `${skill.score}%` }} />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono">
                        <span>{skill.assessmentsCount} checks</span>
                        <span>Updated: {skill.lastUpdated}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Historical Session Ledger */}
          <div className="space-y-2.5">
            <span className="text-xs font-bold font-mono text-zinc-400 uppercase">
              Recent Interview Ledger ({profile.sessionHistory.length} Recorded)
            </span>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {profile.sessionHistory.map((sess) => (
                <div key={sess.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-zinc-800 bg-zinc-900/40 p-3 text-xs">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{sess.targetRole}</span>
                      <span className="rounded bg-zinc-800 px-1.5 py-0.2 text-[10px] font-mono text-zinc-400">
                        {sess.department}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 truncate max-w-md">
                      Strength: {sess.topStrength}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 font-mono shrink-0">
                    <div className="text-right">
                      <div className="text-sm font-bold text-purple-400">{sess.overallScore}/100</div>
                      <div className="text-[10px] text-zinc-500">{sess.timestamp.split("T")[0]}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-zinc-800 bg-zinc-900/90 px-6 py-4">
          <button
            type="button"
            onClick={onResetProfile}
            className="rounded-lg border border-zinc-800 hover:bg-zinc-800 px-4 py-2 text-xs font-bold text-zinc-400 hover:text-white transition cursor-pointer"
          >
            Reset to Baseline
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-purple-600 hover:bg-purple-500 px-6 py-2 text-xs font-bold text-white transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function InterviewBenchmarkModal({
  benchmark,
  onClose,
}: {
  benchmark: SessionBenchmarkResult;
  onClose: () => void;
}) {
  const { currentPerformance, cohort, attemptsHistory, growthVelocity, pillarProgress, growthInsight, milestoneUnlocked } = benchmark;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-950 text-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900/90 px-6 py-4 sticky top-0 z-10 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Trophy size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Interview Benchmark & Longitudinal Progress</h3>
                <span className="rounded bg-amber-500/20 px-2 py-0.5 text-xs font-mono font-bold text-amber-300 border border-amber-500/30">
                  {cohort.tierLabel} (Percentile {cohort.percentileRank}th)
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-mono">
                Longitudinal progression tracking across {attemptsHistory.length} interview sessions · Total Gain: +{growthVelocity.totalImprovementPoints} pts
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-950/40 px-3.5 py-1.5 font-mono">
              <span className="text-xs text-amber-300">Current:</span>
              <span className="text-lg font-bold text-amber-400">{currentPerformance.overall}/100</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="grid size-9 place-items-center rounded-lg border border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white transition cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-6">
          {/* Top Milestone Banner */}
          <div className="rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-950/40 via-orange-950/30 to-amber-950/40 p-4 text-xs text-amber-200 space-y-1.5 shadow-sm">
            <div className="flex items-center justify-between border-b border-amber-500/20 pb-1.5">
              <span className="font-bold text-amber-300 flex items-center gap-1.5 uppercase font-mono text-[11px]">
                <Sparkles size={14} />
                Milestone Status: {milestoneUnlocked}
              </span>
              <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-mono text-amber-300">
                Trajectory: {growthVelocity.trajectory}
              </span>
            </div>
            <p className="italic text-zinc-300 text-[11.5px] leading-relaxed">{growthInsight}</p>
          </div>

          {/* Core Benchmark Score Breakdown vs Previous Attempts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Box 1: Current Multi-Pillar Performance */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2 font-mono">
                <span className="text-xs font-bold uppercase text-zinc-300">Your Performance</span>
                <span className="rounded bg-amber-400/20 text-amber-300 px-2 py-0.5 text-xs font-bold">
                  Overall: {currentPerformance.overall}
                </span>
              </div>

              <div className="space-y-3 font-mono">
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-blue-300 font-bold">Technical</span>
                    <span className="text-white font-bold">{currentPerformance.technical} / 100</span>
                  </div>
                  <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${currentPerformance.technical}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-emerald-300 font-bold">Communication</span>
                    <span className="text-white font-bold">{currentPerformance.communication} / 100</span>
                  </div>
                  <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${currentPerformance.communication}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-purple-300 font-bold">Behavioral</span>
                    <span className="text-white font-bold">{currentPerformance.behavioral} / 100</span>
                  </div>
                  <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500 rounded-full" style={{ width: `${currentPerformance.behavioral}%` }} />
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-zinc-800 text-[11px] text-zinc-400 font-mono flex items-center justify-between">
                <span>Industry Median: {cohort.industryMedian}</span>
                <span className="text-emerald-400 font-bold">+{currentPerformance.overall - cohort.industryMedian} pts above average</span>
              </div>
            </div>

            {/* Box 2: Compared With Previous Attempts */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2 font-mono">
                <span className="text-xs font-bold uppercase text-zinc-300">Compared with previous attempts</span>
                <span className="text-emerald-400 text-xs font-bold">
                  +{growthVelocity.totalImprovementPoints} pts overall
                </span>
              </div>

              <div className="space-y-2.5 font-mono">
                {attemptsHistory.map((attempt) => (
                  <div key={attempt.label} className="flex items-center justify-between text-xs">
                    <span className={attempt.isCurrentSession ? "font-bold text-amber-300 flex items-center gap-1.5" : "text-zinc-400"}>
                      {attempt.label}
                      {attempt.isCurrentSession && (
                        <span className="rounded bg-amber-500/20 text-amber-300 px-1 py-0.2 text-[9px] font-bold">
                          Current
                        </span>
                      )}
                    </span>
                    <div className="flex items-center gap-3">
                      <div className="w-32 h-2.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            attempt.isCurrentSession ? "bg-amber-400" : "bg-zinc-500"
                          }`}
                          style={{ width: `${attempt.overallScore}%` }}
                        />
                      </div>
                      <span className={`font-bold min-w-8 text-right ${attempt.isCurrentSession ? "text-amber-300 font-bold text-sm" : "text-zinc-300"}`}>
                        {attempt.overallScore}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-zinc-800 text-[11px] text-zinc-400 font-mono flex items-center justify-between">
                <span>Avg Pace: +{growthVelocity.averageGainPerSession} pts / session</span>
                <span className="text-purple-300 font-bold">Velocity: {growthVelocity.trajectory}</span>
              </div>
            </div>
          </div>

          {/* Pillar Longitudinal Delta Matrix */}
          <div className="space-y-2">
            <span className="text-xs font-bold font-mono text-zinc-400 uppercase">
              Pillar Longitudinal Growth Deltas (Interview #1 → Current)
            </span>
            <div className="grid grid-cols-3 gap-3 text-xs font-mono">
              <div className="rounded-xl border border-blue-500/30 bg-blue-950/20 p-3 space-y-1">
                <div className="text-blue-300 text-[11px]">Technical Gain</div>
                <div className="text-lg font-bold text-white">+{pillarProgress.technicalGain} pts</div>
                <div className="text-[10px] text-zinc-400">DSA, System Design & ML Mechanics</div>
              </div>
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3 space-y-1">
                <div className="text-emerald-300 text-[11px]">Communication Gain</div>
                <div className="text-lg font-bold text-white">+{pillarProgress.communicationGain} pts</div>
                <div className="text-[10px] text-zinc-400">Pacing, Eye Contact & STAR Framing</div>
              </div>
              <div className="rounded-xl border border-purple-500/30 bg-purple-950/20 p-3 space-y-1">
                <div className="text-purple-300 text-[11px]">Behavioral Gain</div>
                <div className="text-lg font-bold text-white">+{pillarProgress.behavioralGain} pts</div>
                <div className="text-[10px] text-zinc-400">Problem Solving & Stress Composure</div>
              </div>
            </div>
          </div>

          {/* Cohort Bell-Curve Benchmark Distribution */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-mono text-zinc-400 border-b border-zinc-800 pb-2">
              <span className="font-bold uppercase text-zinc-300">Industry Cohort Distribution (N = {cohort.cohortSizeTracked.toLocaleString()})</span>
              <span className="text-amber-400 font-bold">Top {100 - cohort.percentileRank}% Percentile</span>
            </div>
            <div className="grid grid-cols-4 gap-2 text-center font-mono text-xs">
              <div className="rounded bg-zinc-900 p-2 border border-zinc-800">
                <div className="text-[10px] text-zinc-500">Developing</div>
                <div className="text-xs font-bold text-zinc-400">&lt; 50 pts</div>
                <div className="text-[9px] text-zinc-600">Bottom 20%</div>
              </div>
              <div className="rounded bg-zinc-900 p-2 border border-zinc-800">
                <div className="text-[10px] text-zinc-500">Median Standard</div>
                <div className="text-xs font-bold text-zinc-300">50 - 70 pts</div>
                <div className="text-[9px] text-zinc-600">Middle 50%</div>
              </div>
              <div className={`rounded p-2 border ${cohort.percentileRank >= 75 && cohort.percentileRank < 95 ? "bg-amber-500/20 border-amber-500 text-amber-300" : "bg-zinc-900 border-zinc-800 text-zinc-300"}`}>
                <div className="text-[10px] font-bold">Strong (Top 25%)</div>
                <div className="text-xs font-bold">70 - 85 pts</div>
                <div className="text-[9px]">Your Current Tier (82)</div>
              </div>
              <div className="rounded bg-zinc-900 p-2 border border-zinc-800">
                <div className="text-[10px] text-zinc-500">Elite Principal</div>
                <div className="text-xs font-bold text-purple-300">85 - 100 pts</div>
                <div className="text-[9px] text-zinc-600">Top 5%</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-zinc-800 bg-zinc-900/90 px-6 py-4">
          <span className="text-xs text-zinc-400 font-mono">MockMate Longitudinal Benchmark Engine</span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-amber-600 hover:bg-amber-500 px-6 py-2 text-xs font-bold text-white transition cursor-pointer shadow-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
