"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Briefcase,
  FileText,
  Video,
  Mic,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  ShieldCheck,
  Loader2,
  Upload,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api-client";
import { trackAnalyticsEvent } from "@/lib/analytics";

const DEPARTMENTS = [
  { id: "Technical", name: "Technical & Engineering", desc: "Software, System Design, AI, DevOps & Cloud" },
  { id: "Finance", name: "Finance & Quantitative", desc: "DCF, LBO, Equity Research, Corporate Valuation" },
  { id: "HR", name: "HR & People Operations", desc: "Talent Acquisition, Employee Relations, DEI" },
  { id: "Marketing", name: "Product & Growth Marketing", desc: "CAC/LTV, Funnel Optimization, GTM Strategy" },
];

const EXPERIENCE_LEVELS = [
  { id: "Junior", name: "Early Career (0-2 yrs)", desc: "Fundamentals, syntax, and foundational problem solving" },
  { id: "Mid", name: "Mid-Level (2-5 yrs)", desc: "Production architecture, trade-offs, and ownership" },
  { id: "Senior", name: "Senior (5-8 yrs)", desc: "System scalability, mentoring, and technical leadership" },
  { id: "Lead", name: "Staff / Principal (8+ yrs)", desc: "Organization-wide architecture, strategy, and high stakes" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { user, updateOnboarding } = useAuth();

  const [step, setStep] = useState<number>(1);
  const [department, setDepartment] = useState<string>(user?.department || "Technical");
  const [targetRole, setTargetRole] = useState<string>(user?.target_role || "Full Stack AI Engineer");
  const [experienceLevel, setExperienceLevel] = useState<string>(user?.experience_level || "Senior");

  // Step 2: Resume
  const [resumeSkills, setResumeSkills] = useState<string[]>([]);
  const [isUploadingResume, setIsUploadingResume] = useState(false);

  // Step 3: Media permissions state
  const [mediaStatus, setMediaStatus] = useState<"not_tested" | "granted" | "denied">("not_tested");
  const [isTestingMedia, setIsTestingMedia] = useState(false);

  // Submitting
  const [isFinishing, setIsFinishing] = useState(false);

  // Handle Resume Upload
  const handleResumeFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingResume(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("candidate_name", user?.full_name || "Candidate");

    try {
      const res = await apiFetch<{ extracted_skills: string[]; extracted_text: string }>(
        "/api/rag/resume/upload",
        {
          method: "POST",
          body: formData,
        }
      );
      setResumeSkills(res.extracted_skills || []);
      trackAnalyticsEvent("resume_uploaded", { skillsCount: res.extracted_skills?.length || 0 });
    } catch {
      // Allow user to continue even if resume upload fails
    } finally {
      setIsUploadingResume(false);
    }
  };

  // Test Camera & Mic on explicit user click
  const testMediaDevices = async () => {
    setIsTestingMedia(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      // Stop tracks immediately after testing
      stream.getTracks().forEach((track) => track.stop());
      setMediaStatus("granted");
    } catch {
      setMediaStatus("denied");
    } finally {
      setIsTestingMedia(false);
    }
  };

  // Complete onboarding
  const handleFinish = async () => {
    setIsFinishing(true);
    await updateOnboarding({
      target_role: targetRole,
      department,
      experience_level: experienceLevel,
    });
    setIsFinishing(false);
    router.push("/");
  };

  return (
    <div className="mx-auto min-h-[85vh] max-w-3xl px-4 py-10 sm:px-6">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between text-xs text-[#888888] mb-2 font-mono">
          <span>STEP {step} OF 4</span>
          <span>
            {step === 1 && "Role & Domain"}
            {step === 2 && "Resume (Optional)"}
            {step === 3 && "Edge Device Check"}
            {step === 4 && "Ready to Simulate"}
          </span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-[#1e1e1e] overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#D9362B] to-[#FF4D3D] transition-all duration-300"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-[#222222] bg-[#121212]/95 p-6 sm:p-10 backdrop-blur-xl shadow-2xl">
        {/* ================= STEP 1: Department & Target Role ================= */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#FF4D3D]/30 bg-[#FF4D3D]/10 px-3 py-1 text-xs font-semibold text-[#FF4D3D] mb-3">
                <Briefcase size={13} />
                <span>Interview Personalization</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Welcome, {user?.full_name || "Candidate"}!
              </h1>
              <p className="mt-1.5 text-xs sm:text-sm text-[#A0A0A0]">
                Tell us which domain you are preparing for so our AI interviewer generates
                accurate, role-grounded technical questions.
              </p>
            </div>

            {/* Department Selection */}
            <div className="space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#D4D4D4]">
                1. Select Domain
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {DEPARTMENTS.map((dept) => {
                  const isSelected = department === dept.id;
                  return (
                    <button
                      key={dept.id}
                      type="button"
                      onClick={() => setDepartment(dept.id)}
                      className={`text-left p-4 rounded-xl border transition cursor-pointer ${
                        isSelected
                          ? "border-[#FF4D3D] bg-[#FF4D3D]/10 text-white shadow-md shadow-[#FF4D3D]/10"
                          : "border-[#222222] bg-[#161616] text-[#A0A0A0] hover:border-[#333333] hover:text-white"
                      }`}
                    >
                      <p className="text-sm font-bold text-white">{dept.name}</p>
                      <p className="mt-1 text-xs text-[#888888]">{dept.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Target Role input */}
            <div className="space-y-2">
              <label htmlFor="targetRole" className="block text-xs font-bold uppercase tracking-wider text-[#D4D4D4]">
                2. Target Job Title
              </label>
              <input
                id="targetRole"
                type="text"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                placeholder="e.g. Senior Backend Engineer, Equity Research Analyst..."
                className="w-full rounded-xl border border-[#2A2A2A] bg-[#181818] px-4 py-2.5 text-sm text-white placeholder:text-[#555555] focus:border-[#FF4D3D]/80 focus:outline-none transition"
              />
            </div>

            {/* Experience Level */}
            <div className="space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#D4D4D4]">
                3. Seniority Level
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {EXPERIENCE_LEVELS.map((exp) => {
                  const isSelected = experienceLevel === exp.id;
                  return (
                    <button
                      key={exp.id}
                      type="button"
                      onClick={() => setExperienceLevel(exp.id)}
                      className={`text-left p-3.5 rounded-xl border transition cursor-pointer ${
                        isSelected
                          ? "border-[#FF4D3D] bg-[#FF4D3D]/10 text-white"
                          : "border-[#222222] bg-[#161616] text-[#A0A0A0] hover:border-[#333333]"
                      }`}
                    >
                      <p className="text-xs font-bold text-white">{exp.name}</p>
                      <p className="mt-0.5 text-[11px] text-[#888888]">{exp.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex items-center gap-2 rounded-xl bg-[#FF4D3D] px-6 py-3 text-sm font-bold text-neutral-950 shadow-lg shadow-[#FF4D3D]/25 hover:bg-[#ff3826] transition cursor-pointer"
              >
                <span>Continue to Resume</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 2: Optional Resume Upload ================= */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-400 mb-3">
                <FileText size={13} />
                <span>Resume Intelligence (Optional)</span>
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight">
                Ground interview questions in your background
              </h1>
              <p className="mt-1.5 text-xs text-[#A0A0A0]">
                Uploading your resume enables our RAG engine to ask specific questions about your
                past projects. This step is 100% optional — MockMate works seamlessly without it.
              </p>
            </div>

            {/* Upload Area */}
            <div className="rounded-2xl border-2 border-dashed border-[#2A2A2A] bg-[#161616]/60 p-8 text-center hover:border-[#FF4D3D]/50 transition">
              <Upload size={32} className="mx-auto mb-3 text-[#FF4D3D]" />
              <p className="text-sm font-semibold text-white">Upload PDF or Text Resume</p>
              <p className="mt-1 text-xs text-[#888888]">
                Drag & drop or browse from device (Max 10MB)
              </p>
              <label className="mt-4 inline-block">
                <input
                  type="file"
                  accept=".pdf,.txt"
                  onChange={handleResumeFile}
                  className="hidden"
                />
                <span className="inline-flex items-center gap-2 rounded-xl bg-[#222222] px-4 py-2 text-xs font-semibold text-white hover:bg-[#2c2c2c] transition cursor-pointer">
                  {isUploadingResume ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Parsing with RAG Engine...</span>
                    </>
                  ) : (
                    <span>Choose File</span>
                  )}
                </span>
              </label>
            </div>

            {/* Extracted Skills Preview */}
            {resumeSkills.length > 0 && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4 animate-in fade-in">
                <p className="text-xs font-bold text-emerald-300 mb-2 flex items-center gap-1.5">
                  <CheckCircle2 size={14} />
                  <span>Successfully Parsed {resumeSkills.length} Technical Skills:</span>
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {resumeSkills.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-md border border-emerald-500/20 bg-emerald-900/30 px-2 py-0.5 text-[11px] text-emerald-200"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="pt-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex items-center gap-2 rounded-xl border border-[#2A2A2A] px-4 py-2.5 text-xs font-semibold text-[#888888] hover:text-white transition cursor-pointer"
              >
                <ArrowLeft size={14} />
                <span>Back</span>
              </button>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="text-xs text-[#888888] hover:text-white transition font-medium cursor-pointer"
                >
                  Skip for now
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="flex items-center gap-2 rounded-xl bg-[#FF4D3D] px-6 py-2.5 text-xs font-bold text-neutral-950 shadow-lg shadow-[#FF4D3D]/25 hover:bg-[#ff3826] transition cursor-pointer"
                >
                  <span>Continue</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= STEP 3: Edge Privacy & Device Permissions ================= */}
        {step === 3 && (
          <div className="space-y-6 animate-in fade-in">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400 mb-3">
                <ShieldCheck size={13} />
                <span>100% Client-Side Privacy Policy</span>
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight">
                Camera & Microphone Privacy Check
              </h1>
              <p className="mt-1.5 text-xs text-[#A0A0A0] leading-relaxed">
                MockMate AI evaluates your speech pace, filler words, pitch variance, and eye contact.
                <strong>
                  {" "}All visual landmarker and audio waveform processing runs locally inside your browser via
                  WASM. Your video feed is NEVER recorded or transmitted to any server.
                </strong>
              </p>
            </div>

            {/* Device Status Box */}
            <div className="rounded-2xl border border-[#222222] bg-[#161616] p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="grid size-9 place-items-center rounded-xl bg-[#222222] text-[#FF4D3D]">
                    <Video size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">Camera (MediaPipe FaceLandmarker)</p>
                    <p className="text-[11px] text-[#888888]">Eye-contact and gaze trajectory</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="grid size-9 place-items-center rounded-xl bg-[#222222] text-[#FF4D3D]">
                    <Mic size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">Microphone (Web Audio API)</p>
                    <p className="text-[11px] text-[#888888]">WPM, pauses, and speech cadence</p>
                  </div>
                </div>
              </div>

              {/* Status Indicator */}
              <div className="pt-2 border-t border-[#222222] flex items-center justify-between text-xs">
                <span>Permission Status:</span>
                {mediaStatus === "granted" && (
                  <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                    <CheckCircle2 size={14} />
                    <span>Microphone & Camera Ready</span>
                  </span>
                )}
                {mediaStatus === "denied" && (
                  <span className="text-amber-400 font-semibold">
                    Permission Denied (Simulation will run in Text Mode)
                  </span>
                )}
                {mediaStatus === "not_tested" && (
                  <span className="text-[#888888]">Not yet requested</span>
                )}
              </div>
            </div>

            {/* Permission Request Button */}
            <div className="text-center py-2">
              <button
                type="button"
                onClick={testMediaDevices}
                disabled={isTestingMedia}
                className="inline-flex items-center gap-2 rounded-xl border border-[#2A2A2A] bg-[#1a1a1a] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#222222] transition cursor-pointer"
              >
                {isTestingMedia ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Requesting browser permission...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck size={14} className="text-emerald-400" />
                    <span>Test Camera & Mic Access</span>
                  </>
                )}
              </button>
            </div>

            {/* Navigation Buttons */}
            <div className="pt-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex items-center gap-2 rounded-xl border border-[#2A2A2A] px-4 py-2.5 text-xs font-semibold text-[#888888] hover:text-white transition cursor-pointer"
              >
                <ArrowLeft size={14} />
                <span>Back</span>
              </button>
              <button
                type="button"
                onClick={() => setStep(4)}
                className="flex items-center gap-2 rounded-xl bg-[#FF4D3D] px-6 py-2.5 text-xs font-bold text-neutral-950 shadow-lg shadow-[#FF4D3D]/25 hover:bg-[#ff3826] transition cursor-pointer"
              >
                <span>Continue to Summary</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 4: Ready to Launch ================= */}
        {step === 4 && (
          <div className="space-y-6 animate-in fade-in text-center">
            <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-gradient-to-br from-[#D9362B] to-[#FF4D3D] text-white shadow-xl shadow-[#FF4D3D]/30">
              <Sparkles size={32} />
            </div>

            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                You&apos;re All Set for Simulation
              </h1>
              <p className="mt-2 text-xs sm:text-sm text-[#A0A0A0] max-w-lg mx-auto">
                Your profile preferences are calibrated. Launch your first mock interview to get
                instant speech analytics and personalized study roadmaps.
              </p>
            </div>

            {/* Summary Card */}
            <div className="mx-auto max-w-md rounded-xl border border-[#222222] bg-[#161616] p-4 text-left text-xs space-y-2">
              <div className="flex justify-between py-1 border-b border-[#222222]">
                <span className="text-[#888888]">Target Role:</span>
                <span className="font-semibold text-white">{targetRole}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#222222]">
                <span className="text-[#888888]">Domain:</span>
                <span className="font-semibold text-white">{department}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#222222]">
                <span className="text-[#888888]">Seniority:</span>
                <span className="font-semibold text-white">{experienceLevel}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[#888888]">Edge Media Mode:</span>
                <span className="font-semibold text-emerald-400">
                  {mediaStatus === "granted" ? "Audio & Video Active" : "Text & Speech Enabled"}
                </span>
              </div>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleFinish}
                disabled={isFinishing}
                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-[#FF4D3D] px-8 py-3.5 text-sm font-bold text-neutral-950 shadow-lg shadow-[#FF4D3D]/30 hover:bg-[#ff3826] transition cursor-pointer"
              >
                {isFinishing ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Calibrating engine...</span>
                  </>
                ) : (
                  <>
                    <span>Launch First Mock Interview</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
