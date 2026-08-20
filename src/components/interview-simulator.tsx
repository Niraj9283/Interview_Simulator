"use client";

import {
  Activity,
  AudioWaveform,
  BrainCircuit,
  CheckCircle2,
  Clock3,
  Code2,
  Gauge,
  Mic,
  MicOff,
  Monitor,
  Moon,
  Play,
  RotateCcw,
  Send,
  Square,
  Sun,
  Thermometer,
  Timer,
  TrendingUp,
  Upload,
  Users,
  Video,
  VideoOff,
} from "lucide-react";
import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";

import {
  CandidateProfile,
  InterviewDifficulty,
  InterviewDomain,
  InterviewTurn,
  VoiceSignal,
  averageScore,
  clamp,
  difficulties,
  extractKeywords,
  generateQuestion,
  scoreAnswer,
} from "@/lib/interview";
import {
  DepartmentId,
  departments,
  getAvailableTracks,
  getDefaultRoleForDepartment,
  getDefaultTrackForDepartment,
  getDepartmentLabel,
  getRolesForDepartment,
} from "@/lib/role-database";

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
  targetRole: "Full Stack AI Engineer",
  domain: "Role Specific",
  difficulty: "Standard",
  resumeText:
    "Built full-stack applications with React, Node.js, Python, PostgreSQL, Docker, REST APIs, authentication, dashboards, and AI integrations.",
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
  const [eyeContact, setEyeContact] = useState(62);
  const [voiceSignal, setVoiceSignal] = useState<VoiceSignal>({
    energy: 58,
    pace: 64,
    steadiness: 70,
  });
  const [questionStartedAt, setQuestionStartedAt] = useState(0);
  const [backendLatency, setBackendLatency] = useState(312);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const videoStreamRef = useRef<MediaStream | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserFrameRef = useRef<number | null>(null);
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
      videoStreamRef.current?.getTracks().forEach((track) => track.stop());
      audioStreamRef.current?.getTracks().forEach((track) => track.stop());
      audioContextRef.current?.close();

      if (analyserFrameRef.current) {
        window.cancelAnimationFrame(analyserFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!cameraEnabled) {
      return;
    }

    const timer = window.setInterval(() => {
      setEyeContact((value) => clamp(value + Math.round(Math.random() * 10 - 4), 42, 94));
    }, 1400);

    return () => window.clearInterval(timer);
  }, [cameraEnabled]);

  function updateProfile<K extends keyof CandidateProfile>(key: K, value: CandidateProfile[K]) {
    setProfile((current) => ({ ...current, [key]: value }));
  }

  function handleDepartmentChange(department: DepartmentId) {
    const nextTrack = getAvailableTracks(department).includes(profile.domain)
      ? profile.domain
      : getDefaultTrackForDepartment(department);

    setProfile((current) => ({
      ...current,
      department,
      targetRole: getDefaultRoleForDepartment(department),
      domain: nextTrack,
    }));
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

  function handleResumeUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];

    if (!file) {
      return;
    }

    setResumeFileName(file.name);

    const isTextFile =
      file.type.startsWith("text/") || [".md", ".txt", ".csv"].some((extension) => file.name.endsWith(extension));

    if (!isTextFile) {
      updateProfile(
        "resumeText",
        `${file.name} uploaded for ${profile.targetRole}. Add backend parsing for PDF and DOCX extraction.`,
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      updateProfile("resumeText", String(reader.result ?? "").slice(0, 12000));
    };
    reader.readAsText(file);
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
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      videoStreamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      setCameraEnabled(true);
      setEyeContact(74);
    } catch (err) {
      console.warn("Camera access denied/unavailable:", err);
      setCameraEnabled(false);
    }
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
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      startVoiceAnalysis(stream);
      setMicEnabled(true);
    } catch (err) {
      console.warn("Microphone access denied/unavailable:", err);
      setMicEnabled(false);
      setIsRecording(false);
    }
  }



  function stopCamera() {
    videoStreamRef.current?.getTracks().forEach((track) => track.stop());
    videoStreamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraEnabled(false);
  }

  function stopMic() {
    if (analyserFrameRef.current) {
      window.cancelAnimationFrame(analyserFrameRef.current);
    }

    audioStreamRef.current?.getTracks().forEach((track) => track.stop());
    audioStreamRef.current = null;
    audioContextRef.current?.close();
    audioContextRef.current = null;
    analyserFrameRef.current = null;
    setMicEnabled(false);
    setIsRecording(false);
  }

  function startVoiceAnalysis(stream: MediaStream) {
    const AudioContextConstructor =
      window.AudioContext ??
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextConstructor) return;

    // AudioContext needs to be resumed after user gesture on some browsers.
    const context = new AudioContextConstructor();
    context
      .resume()
      .catch((err) => console.warn("AudioContext resume failed:", err));

    const analyser = context.createAnalyser();
    const source = context.createMediaStreamSource(stream);
    const buffer = new Uint8Array(analyser.frequencyBinCount);

    analyser.fftSize = 256;
    source.connect(analyser);
    audioContextRef.current = context;

    const tick = () => {
      analyser.getByteFrequencyData(buffer);
      const averageVolume = buffer.reduce((sum, value) => sum + value, 0) / buffer.length;
      const variance =
        buffer.reduce((sum, value) => sum + Math.abs(value - averageVolume), 0) / Math.max(buffer.length, 1);
      const energy = clamp(Math.round(averageVolume * 1.4), 32, 96);
      const steadiness = clamp(Math.round(96 - variance * 0.9), 38, 96);
      const pace = clamp(Math.round(52 + averageVolume * 0.38 + Math.random() * 8), 42, 96);

      setVoiceSignal({ energy, pace, steadiness });
      analyserFrameRef.current = window.requestAnimationFrame(tick);
    };

    tick();
  }


  function startInterview() {
    const firstQuestion = generateQuestion(profile, 0, []);

    setQuestions([firstQuestion]);
    setQuestionIndex(0);
    setHistory([]);
    setAnswer("");
    setStage("live");
    setQuestionStartedAt(performance.now());
    setBackendLatency(Math.round(240 + Math.random() * 180));
  }

  function submitAnswer() {
    const trimmedAnswer = answer.trim();

    if (!trimmedAnswer || stage !== "live") {
      return;
    }

    const evaluation = scoreAnswer(trimmedAnswer, currentQuestion, keywords, voiceSignal, cameraEnabled ? eyeContact : 54);
    const latencyMs = Math.max(0, Math.round(performance.now() - questionStartedAt));
    const nextTurn: InterviewTurn = {
      id: history.length + 1,
      question: currentQuestion,
      answer: trimmedAnswer,
      latencyMs,
      ...evaluation,
    };
    const nextHistory = [...history, nextTurn];

    setHistory(nextHistory);
    setAnswer("");
    setBackendLatency(Math.round(220 + Math.random() * 260));

    if (nextHistory.length >= 6) {
      setStage("complete");
      setIsRecording(false);
      return;
    }

    const nextQuestion = generateQuestion(profile, nextHistory.length, nextHistory);
    setQuestions((current) => [...current, nextQuestion]);
    setQuestionIndex(nextHistory.length);
    setQuestionStartedAt(performance.now());
  }

  function resetSession() {
    setStage("setup");
    setQuestions([]);
    setQuestionIndex(0);
    setAnswer("");
    setHistory([]);
    setIsRecording(false);
    setBackendLatency(312);
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
              <ThemeToggle theme={panelTheme} onThemeChange={setPanelTheme} />
              <TimeWeatherPanel />
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              <StatusPill icon={CurrentDepartmentIcon} label={getDepartmentLabel(profile.department)} />
              <StatusPill icon={CurrentDomainIcon} label={profile.domain} />
              <StatusPill icon={Gauge} label={profile.difficulty} />
              <StatusPill icon={Timer} label={`${backendLatency} ms`} />
              <StatusPill icon={TrendingUp} label={stage === "complete" ? "Complete" : `${progress}%`} />
            </div>
          </div>
        </header>

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
                <span className="max-w-full truncate text-sm font-medium text-zinc-800">{resumeFileName}</span>
                <input
                  className="sr-only"
                  type="file"
                  accept={
                    ".txt,.md,.csv,.pdf,.doc,.docx,.rtf,.odt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown,text/csv"
                  }
                  onChange={handleResumeUpload}
                />
              </label>
              <div className="mt-3 flex flex-wrap gap-2">
                {keywords.slice(0, 6).map((keyword) => (
                  <span key={keyword} className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-800">
                    {keyword}
                  </span>
                ))}
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
                    onClick={() => setIsRecording((value) => !value)}
                    disabled={!micEnabled}
                    className="grid size-10 place-items-center rounded-md bg-white/92 text-zinc-950 shadow-sm backdrop-blur transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label={isRecording ? "Stop recording" : "Record answer"}
                    title={isRecording ? "Stop recording" : "Record answer"}
                  >
                    {isRecording ? <Square size={17} fill="currentColor" /> : <AudioWaveform size={18} />}
                  </button>
                </div>

                <div className="absolute right-4 top-4 rounded-md bg-rose-50 px-3 py-2 text-xs font-medium text-rose-800 shadow-sm" style={{ display: "none" }} />
                <div className="absolute bottom-4 left-4 right-4 grid gap-2 sm:grid-cols-3">
                  <CameraSignal label="Eye contact" value={cameraEnabled ? eyeContact : 0} active={cameraEnabled} />
                  <CameraSignal label="Voice energy" value={micEnabled ? voiceSignal.energy : 0} active={micEnabled} />
                  <CameraSignal label="Pace" value={micEnabled ? voiceSignal.pace : 0} active={micEnabled} />
                </div>
              </div>

              <div className="flex flex-col gap-4 p-4 lg:p-5">
                <div className="rounded-md border border-zinc-200 bg-[#fbfcfa] p-4">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-zinc-600">
                      <BrainCircuit size={17} className="text-emerald-700" />
                      AI Interviewer
                    </div>
                    <span className="rounded-md bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-900">
                      Q{Math.min(questionIndex + 1, 6)} / 6
                    </span>
                  </div>
                  <p className="text-lg font-semibold leading-8 text-zinc-950">{currentQuestion}</p>
                </div>

                <label className="flex flex-1 flex-col gap-2 text-sm font-medium text-zinc-700">
                  Answer
                  <textarea
                    value={answer}
                    onChange={(event) => setAnswer(event.target.value)}
                    placeholder="Speak, type, or paste your response here."
                    className="min-h-48 flex-1 resize-none rounded-md border border-zinc-200 bg-zinc-50 p-4 text-base leading-7 text-zinc-900 outline-none transition focus:border-emerald-500 focus:bg-white"
                  />
                </label>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2 text-sm text-zinc-600">
                    {stage === "complete" ? (
                      <>
                        <CheckCircle2 size={18} className="text-emerald-700" />
                        Session scored
                      </>
                    ) : (
                      <>
                        <Activity size={18} className="text-rose-600" />
                        {isRecording ? "Recording" : stage === "live" ? "Live session" : "Ready"}
                      </>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setStage("complete")}
                      disabled={history.length === 0}
                      className="h-11 rounded-md border border-zinc-200 px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      End
                    </button>
                    <button
                      type="button"
                      onClick={submitAnswer}
                      disabled={stage !== "live" || !answer.trim()}
                      className="flex h-11 items-center justify-center gap-2 rounded-md bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Send size={17} />
                      Submit
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <aside className="flex flex-col gap-4 rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
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
                <div className="flex flex-col gap-2">
                  <MetricBar label="Clarity" value={latestTurn?.signals.clarity ?? 0} tone="emerald" />
                  <MetricBar label="Relevance" value={latestTurn?.signals.relevance ?? 0} tone="amber" />
                  <MetricBar label="Structure" value={latestTurn?.signals.structure ?? 0} tone="rose" />
                  <MetricBar label="Confidence" value={latestTurn?.signals.confidence ?? 0} tone="zinc" />
                </div>
              </div>
            </section>

            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-normal text-zinc-500">Signal Analysis</h2>
              <div className="grid gap-2">
                <SignalRow label="Voice steadiness" value={micEnabled ? voiceSignal.steadiness : latestTurn?.signals.voice ?? 0} />
                <SignalRow label="Eye contact" value={cameraEnabled ? eyeContact : latestTurn?.signals.eyeContact ?? 0} />
                <SignalRow label="Question latency" value={Math.max(0, 100 - Math.round(backendLatency / 8))} />
              </div>
            </section>

            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-normal text-zinc-500">Trend</h2>
              <div className="flex h-28 items-end gap-2 rounded-md bg-zinc-50 p-3">
                {Array.from({ length: 6 }).map((_, index) => {
                  const turn = history[index];
                  const height = turn ? `${Math.max(14, turn.score)}%` : "10%";

                  return (
                    <div key={index} className="flex flex-1 flex-col items-center gap-2">
                      <div
                        className={`w-full rounded-t-md ${turn ? "bg-emerald-600" : "bg-zinc-200"}`}
                        style={{ height }}
                      />
                      <span className="text-[11px] font-semibold text-zinc-500">{index + 1}</span>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="min-h-44">
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
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-normal text-zinc-500">Session Log</h2>
              <div className="max-h-52 space-y-2 overflow-auto pr-1">
                {history.length ? (
                  history.map((turn) => (
                    <article key={turn.id} className="rounded-md border border-zinc-200 p-3">
                      <div className="mb-1 flex items-center justify-between text-xs font-semibold text-zinc-500">
                        <span>Question {turn.id}</span>
                        <span>{turn.score}/100</span>
                      </div>
                      <p className="line-clamp-2 text-sm leading-6 text-zinc-800">{turn.question}</p>
                    </article>
                  ))
                ) : (
                  <div className="rounded-md border border-dashed border-zinc-300 p-4 text-sm text-zinc-500">No answers yet.</div>
                )}
              </div>
            </section>
          </aside>
        </div>
      </div>
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

function CameraSignal({ label, value, active }: { label: string; value: number; active: boolean }) {
  return (
    <div className="rounded-md bg-white/92 px-3 py-2 text-zinc-950 shadow-sm backdrop-blur">
      <div className="flex items-center justify-between gap-2 text-xs font-semibold text-zinc-600">
        <span>{label}</span>
        <span>{active ? `${Math.round(value)}%` : "--"}</span>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-zinc-200">
        <div className="h-full rounded-full bg-emerald-600 transition-all" style={{ width: `${active ? value : 0}%` }} />
      </div>
    </div>
  );
}

function MetricBar({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "emerald" | "amber" | "rose" | "zinc";
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
        <span>{value || "--"}</span>
      </div>
      <div className="h-2 rounded-full bg-zinc-100">
        <div className={`h-full rounded-full ${colors[tone]} transition-all`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function SignalRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-md bg-zinc-50 px-3 py-2">
      <span className="text-sm font-medium text-zinc-700">{label}</span>
      <span className="text-sm font-bold text-zinc-950">{value ? `${Math.round(value)}%` : "--"}</span>
    </div>
  );
}
