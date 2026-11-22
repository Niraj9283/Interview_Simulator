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
      <div className="mx-auto min-h-[72vh] max-w-3xl px-4 py-10 sm:px-6">
        {/* Progress Bar */}
        <div className="mb-8">
            <div className="flex items-center justify-between text-xs text-zinc-400 mb-2 font-mono">
              <span>STEP {step} OF 4</span>
              <span>
                {step === 1 && "Role & Domain"}
                {step === 2 && "Resume Grounding"}
                {step === 3 && "Edge Device Check"}
                {step === 4 && "Ready to Simulate"}
              </span>
            </div>
              <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${(step / 4) * 100}%` }}
                />
              </div>
            </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-900/90 p-6 sm:p-10 shadow-2xl backdrop-blur-md">
                {/* ================= STEP 1: Department & Target Role ================= */}
                {step === 1 && (
                  <div className="space-y-6 animate-in fade-in">
                    <div>
                        <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/20 bg-blue-500/10 px-2.5 py-0.5 text-xs font-mono text-blue-400 mb-3">
                          <Briefcase size={13} />
                          <span>Interview Personalization</span>
                        </div>
                          <h1 className="text-xl sm:text-2xl font-semibold text-zinc-100 tracking-tight">
                            Welcome, {user?.full_name || "Candidate"}
                          </h1>
                            <p className="mt-1 text-xs sm:text-sm text-zinc-400">
                              Configure your target track so MockMate generates accurate, role-grounded technical questions.
                            </p>
                          </div>

                          {/* Department Selection */}
                          <div className="space-y-3">
                              <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400">
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
                                      className={`w-full text-left p-3 rounded-xl border transition cursor-pointer ${
                                        isSelected
                                          ? "border-blue-500/60 bg-blue-500/10 text-zinc-100"
                                          : "border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                                      }`}
                    >
                      <p className="text-xs font-medium text-zinc-200">{dept.name}</p>
                      <p className="mt-1 text-[11px] text-zinc-500">{dept.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Target Role input */}
            <div className="space-y-2">
              <label htmlFor="targetRole" className="block text-xs font-mono uppercase tracking-wider text-zinc-400">
                2. Target Job Title
              </label>
              <input
                id="targetRole"
                type="text"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                placeholder="e.g. Senior Backend Engineer, Machine Learning Engineer..."
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none transition"
              />
            </div>

            {/* Experience Level */}
            <div className="space-y-3">
              <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400">
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
                                    className = {`text-left p-3 rounded-xl border transition cursor-pointer ${isSelected
                                          ? "border-blue-500/60 bg-blue-500/10 text-zinc-100"
                                          : "border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                                      }`
                                  }
                    >
                      <p className="text-xs font-medium text-zinc-200">{exp.name}</p>
                      <p className="mt-0.5 text-[10px] text-zinc-500">{exp.desc}</p>
                    </button>
                              );
                })}
                          </div>
                      </div>

                      <div className="pt-4 flex justify-end">
                        <button
                          type="button"
                          onClick={() => setStep(2)}
                          className="flex items-center gap-2 rounded-lg bg-zinc-100 px-5 py-2.5 text-xs font-semibold text-zinc-950 hover:bg-white transition cursor-pointer"
                        >
                          <span>Continue to Resume</span>
                          <ArrowRight size={14} />
                        </button>
                      </div>
                    </div>
        )}

                    {/* ================= STEP 2: Optional Resume Upload ================= */}
                    {step === 2 && (
                      <div className="space-y-6 animate-in fade-in">
                        <div>
                            <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/20 bg-blue-500/10 px-2.5 py-0.5 text-xs font-mono text-blue-400 mb-3">
                              <FileText size={13} />
                              <span>Resume Intelligence (Optional)</span>
                            </div>
                              <h1 className="text-xl sm:text-2xl font-semibold text-zinc-100 tracking-tight">
                                Ground interview questions in your background
                              </h1>
                                <p className="mt-1 text-xs text-zinc-400">
                                  Uploading your resume enables our Chroma RAG collection to synthesize project-specific questions. This step is 100% optional.
                                </p>
                              </div>

                              {/* Upload Area */}
                                  <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950/60 p-8 text-center hover:border-zinc-700 transition">
                                    <Upload size={28} className="mx-auto mb-2.5 text-zinc-400" />
                                    <p className="text-xs font-medium text-zinc-200">Upload PDF or Text Resume</p>
                                    <p className="mt-1 text-[11px] text-zinc-500">
                                      Drag and drop or select file (Max 10MB)
                                    </p>
                                    <label className="mt-4 inline-block">
                                      <input
                                        type="file"
                                        accept=".pdf,.txt"
                                        onChange={handleResumeFile}
                                        className="hidden"
                                      />
                                        <span className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3.5 py-1.5 text-xs font-medium text-zinc-300 hover:border-zinc-700 hover:text-white transition cursor-pointer">
                                          {isUploadingResume ? (
                                            <>
                                              <Loader2 size={13} className="animate-spin" />
                                              <span>Parsing with Chroma RAG...</span>
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
                                          <p className="text-xs font-medium text-emerald-400 mb-2 flex items-center gap-1.5">
                                            <CheckCircle2 size={14} />
                                            <span>Parsed {resumeSkills.length} Technical Skills:</span>
                                          </p>
                                          <div className="flex flex-wrap gap-1.5">
                                            {resumeSkills.map((skill) => (
                                              <span
                                                key={skill}
                                                className="rounded border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-mono text-emerald-300"
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
                                            className="flex items-center gap-1.5 rounded-lg border border-zinc-800 px-3.5 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
                                          >
                                            <ArrowLeft size={13} />
                                            <span>Back</span>
                                          </button>
                                            <div className="flex items-center gap-2">
                                              <button
                                                type="button"
                                                onClick={() => setStep(3)}
                                                className="text-xs text-zinc-500 hover:text-zinc-300 transition font-medium px-2 py-2 cursor-pointer"
                                              >
                                                Skip for now
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => setStep(3)}
                                                className="flex items-center gap-1.5 rounded-lg bg-zinc-100 px-5 py-2 text-xs font-semibold text-zinc-950 hover:bg-white transition cursor-pointer"
                                              >
                                                <span>Continue</span>
                                                <ArrowRight size={13} />
                                              </button>
                                            </div>
                                          </div>
                                        </div>
        )}

                                        {/* ================= STEP 3: Edge Privacy & Device Permissions ================= */}
                                        {step === 3 && (
                                          <div className="space-y-6 animate-in fade-in">
                                            <div>
                                                <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-mono text-emerald-400 mb-3">
                                                  <ShieldCheck size={13} />
                                                  <span>100% Client-Side Edge Privacy</span>
                                                </div>
                                                  <h1 className="text-xl sm:text-2xl font-semibold text-zinc-100 tracking-tight">
                                                    Camera & Microphone Diagnostics
                                                  </h1>
                                                    <p className="mt-1 text-xs text-zinc-400 leading-relaxed">
                                                      MockMate AI analyzes speech cadence, pause duration, and eye-contact trajectory.
                                                      All processing executes in browser memory via MediaPipe and Web Audio. Your video feed is never transmitted or recorded remotely.
                                                    </p>
                                                  </div>

                                                  {/* Device Status Box */}
                                                          <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 space-y-3">
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                              <div className="flex items-center gap-2.5">
                                                                <div className="grid size-8 place-items-center rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400">
                                                                  <Video size={16} />
                                                                </div>
                                                                <div>
                                                                  <p className="text-xs font-medium text-zinc-200">MediaPipe FaceLandmarker</p>
                                                                  <p className="text-[10px] text-zinc-500 font-mono">Local eye-contact trajectory</p>
                                                                </div>
                                                              </div>
                                                                  <div className="flex items-center gap-2.5">
                                                                    <div className="grid size-8 place-items-center rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400">
                                                                      <Mic size={16} />
                                                                    </div>
                                                                    <div>
                                                                      <p className="text-xs font-medium text-zinc-200">Web Audio API Telemetry</p>
                                                                      <p className="text-[10px] text-zinc-500 font-mono">WPM, pauses, and speech steadiness</p>
                                                                    </div>
                                                                  </div>
                                                                </div>

                                                                {/* Status Indicator */}
                                                                  <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-xs">
                                                                    <span className="text-zinc-500">Device Status:</span>
                                                                    {mediaStatus === "granted" && (
                                                                        <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                                                                          <CheckCircle2 size={13} />
                                                                          <span>Microphone & Camera Verified</span>
                                                                        </span>
                )}
                                                                        {mediaStatus === "denied" && (
                                                                            <span className="text-amber-400 font-medium">
                                                                              Permission Denied (Simulation will default to Text Mode)
                                                                            </span>
                )}
                                                                            {mediaStatus === "not_tested" && (
                  <span className="text-zinc-500">Not yet verified</span>
                                                                            )}
                                                                          </div>
            </div>

            {/* Permission Request Button */}
                                                                      <div className="text-center py-1">
                                                                        <button
                                                                          type="button"
                                                                          onClick={testMediaDevices}
                                                                          disabled={isTestingMedia}
                                                                          className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2 text-xs font-medium text-zinc-200 hover:border-zinc-700 hover:text-white transition cursor-pointer"
                                                                        >
                                                                          {isTestingMedia ? (
                                                                            <>
                                                                              <Loader2 size={13} className="animate-spin" />
                                                                              <span>Checking devices...</span>
                                                                            </>
                                                                          ) : (
                                                                            <>
                                                                              <ShieldCheck size={14} className="text-emerald-400" />
                                                                              <span>Verify Camera & Microphone</span>
                                                                            </>
                                                                          )}
                                                                        </button>
                                                                      </div>

                                                                      {/* Navigation Buttons */}
                                                                      <div className="pt-4 flex items-center justify-between">
                                                                        <button
                                                                          type="button"
                                                                          onClick={() => setStep(2)}
                                                                          className="flex items-center gap-1.5 rounded-lg border border-zinc-800 px-3.5 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
                                                                        >
                                                                          <ArrowLeft size={13} />
                                                                          <span>Back</span>
                                                                        </button>
                                                                        <button
                                                                          type="button"
                                                                          onClick={() => setStep(4)}
                                                                          className="flex items-center gap-1.5 rounded-lg bg-zinc-100 px-5 py-2 text-xs font-semibold text-zinc-950 hover:bg-white transition cursor-pointer"
                                                                        >
                                                                          <span>Continue to Summary</span>
                                                                          <ArrowRight size={13} />
                                                                        </button>
                                                                      </div>
                                                                    </div>
        )}

                                                                    {/* ================= STEP 4: Ready to Launch ================= */}
                                                                    {step === 4 && (
                                                                      <div className="space-y-6 animate-in fade-in text-center">
                                                                          <div className="mx-auto grid size-12 place-items-center rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-100">
                                                                            <Sparkles size={24} />
                                                                          </div>

                                                                          <div>
                                                                              <h1 className="text-xl sm:text-2xl font-semibold text-zinc-100 tracking-tight">
                                                                                Profile Calibrated
                                                                              </h1>
                                                                                <p className="mt-1 text-xs text-zinc-400 max-w-md mx-auto">
                                                                                  Your target track is ready. Start your session to receive real-time speech cadence analytics, live coding tests, and architecture evaluations.
                                                                                </p>
                                                                              </div>

                                                                              {/* Summary Card */}
                                                                                  <div className="mx-auto max-w-md rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 text-left text-xs space-y-2 font-mono">
                                                                                    <div className="flex justify-between py-1 border-b border-zinc-850">
                                                                                      <span className="text-zinc-500">Target Role:</span>
                                                                                      <span className="font-semibold text-zinc-200">{targetRole}</span>
                                                                                    </div>
                                                                                      <div className="flex justify-between py-1 border-b border-zinc-850">
                                                                                        <span className="text-zinc-500">Domain:</span>
                                                                                        <span className="font-semibold text-zinc-200">{department}</span>
                                                                                      </div>
                                                                                        <div className="flex justify-between py-1 border-b border-zinc-850">
                                                                                          <span className="text-zinc-500">Seniority:</span>
                                                                                          <span className="font-semibold text-zinc-200">{experienceLevel}</span>
                                                                                        </div>
                                                                                        <div className="flex justify-between py-1">
                                                                                            <span className="text-zinc-500">Edge Device Status:</span>
                                                                                            <span className="font-semibold text-emerald-400">
                                                                                              {mediaStatus === "granted" ? "Microphone & Camera Active" : "Text & Audio Ready"}
                                                                                            </span>
                                                                                        </div>
                                                                                      </div>

                                                                                        <div className="pt-2 flex items-center justify-center">
                                                                                          <button
                                                                                            type="button"
                                                                                            onClick={handleFinish}
                                                                                            disabled={isFinishing}
                                                                                            className="flex items-center justify-center gap-2 rounded-lg bg-zinc-100 px-6 py-2.5 text-xs font-semibold text-zinc-950 hover:bg-white transition cursor-pointer shadow-xs"
                                                                                          >
                                                                                            {isFinishing ? (
                                                                                              <>
                                                                                                <Loader2 size={14} className="animate-spin" />
                                                                                                <span>Calibrating simulator...</span>
                                                                                              </>
                                                                                            ) : (
                                                                                              <>
                                                                                                <span>Launch First Mock Interview</span>
                                                                                                <ArrowRight size={14} />
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
