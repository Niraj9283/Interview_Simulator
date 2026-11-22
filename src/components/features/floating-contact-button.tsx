"use client";

import { useDialogFocus } from "@/components/ui/use-dialog-focus";

import React, { useState, useEffect, useCallback } from "react";
import {
  MessageSquare,
  X,
  Send,
  Sparkles,
  User,
  Mail,
  Tag,
  HelpCircle,
  Search,
  ChevronDown,
  Star,
  Layers,
  Lightbulb,
  Play,
} from "lucide-react";
import { FormSuccessState, FormErrorState } from "./form-feedback-states";
import { FAQS } from "./expandable-faq";
import { SIMULATOR_MODULES } from "@/lib/simulator-modules-data";
import { getStoredUTM } from "@/lib/utm-tracker";
import { sanitizeInput } from "@/lib/sanitize";

interface FloatingContactButtonProps {
  isOpenExternal?: boolean;
  onCloseExternal?: () => void;
  onToggleExternal?: (open: boolean) => void;
}

export function FloatingContactButton({
  isOpenExternal,
  onCloseExternal,
  onToggleExternal,
}: FloatingContactButtonProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"modules" | "faq" | "contact">("faq");
  const [selectedModuleId, setSelectedModuleId] = useState<string>("behavioral-star-rubric");

  const isOpen = isOpenExternal !== undefined ? isOpenExternal : internalOpen;

  const dialogRef = useDialogFocus(isOpen);

  const setIsOpen = useCallback(
    (val: boolean) => {
      setInternalOpen(val);
      if (!val && onCloseExternal) {
        onCloseExternal();
      }
      if (onToggleExternal) {
        onToggleExternal(val);
      }
    },
    [onCloseExternal, onToggleExternal]
  );

  useEffect(() => {
    const handleOpenFaq = () => {
      setActiveTab("faq");
      setIsOpen(true);
    };
    const handleOpenContact = () => {
      setActiveTab("contact");
      setIsOpen(true);
    };
    const handleOpenModule = (e: Event) => {
      const customEvent = e as CustomEvent<{ moduleId?: string }>;
      if (customEvent.detail?.moduleId) {
        setSelectedModuleId(customEvent.detail.moduleId);
      }
      setActiveTab("modules");
      setIsOpen(true);
    };

    window.addEventListener("mockmate:open-faq", handleOpenFaq);
    window.addEventListener("mockmate:open-contact", handleOpenContact);
    window.addEventListener("mockmate:open-module", handleOpenModule);
    return () => {
      window.removeEventListener("mockmate:open-faq", handleOpenFaq);
      window.removeEventListener("mockmate:open-contact", handleOpenContact);
      window.removeEventListener("mockmate:open-module", handleOpenModule);
    };
  }, [setIsOpen]);

  // FAQ state
  const [openFaqIds, setOpenFaqIds] = useState<string[]>(["speech-analysis"]);
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");

  const categories = ["All", "Speech & Audio", "Privacy & Edge", "Evaluation", "Integrity"];

  const toggleFaqItem = (id: string) => {
    setOpenFaqIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const filteredFaqs = FAQS.filter((faq) => {
    const matchesCategory = activeCategory === "All" || faq.category === activeCategory;
    const matchesSearch =
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Contact form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState("Feedback");
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [botField, setBotField] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, setIsOpen]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage("");

    const cleanName = sanitizeInput(name, 100);
    const cleanEmail = sanitizeInput(email, 120);
    const cleanMessage = sanitizeInput(message, 5000);

    if (!cleanName.trim()) {
      setErrorMessage("Please enter your name.");
      return;
    }
    if (!cleanEmail.trim() || !cleanEmail.includes("@")) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }
    if (!cleanMessage.trim() || cleanMessage.length < 10) {
      setErrorMessage("Please provide a message with at least 10 characters.");
      return;
    }

    setIsSubmitting(true);

    try {
      const utmData = getStoredUTM();
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: cleanName,
          email: cleanEmail,
          category,
          rating,
          message: cleanMessage,
          bot_field: botField,
          utmData,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || data.message || "Failed to submit feedback.");
      }

      setIsSuccess(true);
      setName("");
      setEmail("");
      setMessage("");
      setRating(5);
      setBotField("");

      // Trigger conversion event & toast
      try {
        const { trackConversion } = await import("@/lib/conversion-tracking");
        const { toast } = await import("@/components/ui/toast");
        trackConversion("feedback_submitted", { category, rating });
        toast.success(
          "Your message has been received and our engineering team has been notified.",
          "Feedback Submitted"
        );
      } catch (trackErr) {
        console.debug("Tracking error:", trackErr);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to send message. Please check your network connection and try again.";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        aria-label={isOpen ? "Close FAQ and Help" : "Open Frequently Asked Questions and Help"}
        aria-expanded={isOpen}
        className="help-launcher print:hidden"
        title={isOpen ? "Close help center" : "Help center"}
      >
        {isOpen ? <X size={19} /> : <MessageSquare size={19} />}
      </button>

      {/* Floating Popover revealed right at the icon position */}
      {isOpen && (
        <>
          {/* Subtle click-outside backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px] transition-opacity print:hidden"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          <div
            ref={dialogRef}
          role="dialog"
            aria-modal="true"
            aria-label="Frequently Asked Questions & Support"
            className="fixed bottom-20 right-4 sm:right-6 z-50 flex flex-col w-[calc(100vw-2rem)] sm:w-[480px] h-[600px] max-h-[calc(100dvh-6rem)] rounded-2xl border border-divider bg-instrument/98  backdrop-blur-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200 print:hidden"
          >
            {/* Header */}
            <div className="border-b border-divider bg-console p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="grid size-9 place-items-center rounded-xl bg-moss text-white shadow-md ">
                    {activeTab === "modules" ? (
                      <Layers size={18} />
                    ) : activeTab === "faq" ? (
                      <HelpCircle size={18} />
                    ) : (
                      <Sparkles size={18} />
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#F5F5F5] flex items-center gap-1.5">
                      {activeTab === "modules"
                        ? "Practice modules"
                        : activeTab === "faq"
                        ? "Frequently Asked Questions"
                        : "Contact & Support"}
                      <span className="rounded-full bg-signal/10 px-2 py-0.2 text-[9px] font-mono text-signal border border-signal/30">
                        {activeTab === "modules" ? "Engine" : activeTab === "faq" ? "FAQ" : "Help"}
                      </span>
                    </h3>
                    <p className="text-[11px] text-[#A0A0A0]">
                      {activeTab === "modules"
                        ? "Explore tools and scoring criteria"
                        : activeTab === "faq"
                        ? "Answers to audio, edge mode & scoring mechanics"
                        : "Reach our engineering team or report an issue"}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="grid size-8 place-items-center rounded-lg text-[#A0A0A0] hover:bg-white/10 hover:text-white transition cursor-pointer"
                  aria-label="Close help popup"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Tab Switcher */}
              <div className="mt-3 flex rounded-xl border border-divider bg-instrument p-1 gap-1">
                <button
                  type="button"
                  onClick={() => setActiveTab("modules")}
                  className={`flex-1 rounded-lg py-1.5 text-center text-xs font-semibold transition cursor-pointer ${
                    activeTab === "modules"
                      ? "bg-moss text-white shadow-sm"
                      : "text-[#A0A0A0] hover:text-[#F5F5F5]"
                  }`}
                >
                  Modules
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("faq")}
                  className={`flex-1 rounded-lg py-1.5 text-center text-xs font-semibold transition cursor-pointer ${
                    activeTab === "faq"
                      ? "bg-moss text-white shadow-sm"
                      : "text-[#A0A0A0] hover:text-[#F5F5F5]"
                  }`}
                >
                  FAQ Questions
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("contact")}
                  className={`flex-1 rounded-lg py-1.5 text-center text-xs font-semibold transition cursor-pointer ${
                    activeTab === "contact"
                      ? "bg-moss text-white shadow-sm"
                      : "text-[#A0A0A0] hover:text-[#F5F5F5]"
                  }`}
                >
                  Send Feedback
                </button>
              </div>
            </div>

            {/* Content Area */}
            {activeTab === "modules" ? (
              <div className="flex-1 flex flex-col overflow-hidden bg-instrument">
                {/* Horizontal Module Chips */}
                <div className="p-3 border-b border-divider bg-instrument overflow-x-auto scrollbar-none flex items-center gap-1.5">
                  {SIMULATOR_MODULES.map((mod) => (
                    <button
                      key={mod.id}
                      type="button"
                      onClick={() => setSelectedModuleId(mod.id)}
                      className={`rounded-lg px-2.5 py-1 text-[11px] font-medium whitespace-nowrap transition cursor-pointer ${
                        selectedModuleId === mod.id
                          ? "bg-moss text-white shadow-sm"
                          : "border border-divider bg-console text-[#A0A0A0] hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      {mod.shortTitle}
                    </button>
                  ))}
                </div>

                {/* Selected Module Detail */}
                {(() => {
                  const activeModule =
                    SIMULATOR_MODULES.find((m) => m.id === selectedModuleId) ||
                    SIMULATOR_MODULES[0];

                  return (
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      {/* Title & Tagline Card */}
                      <div className="rounded-xl border border-divider bg-console p-3.5 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="rounded-full bg-signal/10 px-2 py-0.5 text-[10px] font-mono font-bold text-signal border border-signal/30">
                            {activeModule.badge}
                          </span>
                          <span className="text-[10px] text-[#777777] font-mono">
                            {activeModule.id}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-[#F5F5F5]">
                          {activeModule.title}
                        </h4>
                        <p className="text-xs leading-relaxed text-[#A0A0A0]">
                          {activeModule.description}
                        </p>
                      </div>

                      {/* Highlights / STAR Pillars */}
                      <div className="space-y-1.5">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-[#A0A0A0]">
                          Core Framework & Mechanics
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {activeModule.highlights.map((h, i) => (
                            <div
                              key={i}
                              className="rounded-xl border border-divider bg-instrument p-2.5 space-y-1"
                            >
                              <div className="text-xs font-semibold text-signal">
                                {h.label}
                              </div>
                              <div className="text-[11px] leading-relaxed text-[#A0A0A0]">
                                {h.detail}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Evaluation Rubric Breakdown */}
                      <div className="space-y-1.5">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-[#A0A0A0]">
                          Scoring Rubric & Weights
                        </div>
                        <div className="rounded-xl border border-divider bg-instrument divide-y divide-[#222222] overflow-hidden">
                          {activeModule.evaluationRubric.map((rubric, idx) => (
                            <div
                              key={idx}
                              className="p-2.5 flex items-start justify-between gap-3 text-xs"
                            >
                              <div className="space-y-0.5">
                                <div className="font-semibold text-[#E5E5E5]">
                                  {rubric.metric}
                                </div>
                                <div className="text-[11px] text-[#888888]">
                                  {rubric.description}
                                </div>
                              </div>
                              <span className="shrink-0 rounded-md bg-signal/15 border border-signal/30 px-2 py-0.5 text-[10px] font-bold font-mono text-signal">
                                {rubric.weight}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Pro Tip Card */}
                      <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-3 flex items-start gap-2.5 text-xs text-amber-200">
                        <Lightbulb size={16} className="text-amber-400 shrink-0 mt-0.5" />
                        <div className="leading-relaxed">
                          <strong className="text-amber-300">Pro-Tip:</strong>{" "}
                          {activeModule.proTip}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="pt-1 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setIsOpen(false);
                            const launch = document.getElementById("launch-practice");
                            if (launch instanceof HTMLButtonElement) launch.click();
                            else if (window.location.pathname !== "/") window.location.assign("/");
                            else document.getElementById("main-content")?.scrollIntoView();
                          }}
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-moss px-3 py-2 text-xs font-bold text-white shadow-md transition hover:brightness-110 cursor-pointer"
                        >
                          <Play size={12} fill="white" />
                          <span>Practice in Simulator</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab("contact");
                            setCategory("Feedback");
                            setMessage(`Feedback regarding the ${activeModule.title}: `);
                          }}
                          className="rounded-xl border border-divider bg-console px-3 py-2 text-xs font-semibold text-[#A0A0A0] hover:text-white hover:border-[#555555] transition cursor-pointer"
                        >
                          Send Feedback
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : activeTab === "faq" ? (
              <div className="flex-1 flex flex-col overflow-hidden bg-instrument">
                {/* Search & Category Filter Controls */}
                <div className="p-3.5 space-y-2.5 border-b border-divider bg-instrument">
                  <div className="relative">
                    <Search
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A0A0A0] pointer-events-none"
                    />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search questions..."
                      className="w-full rounded-xl border border-divider bg-console py-1.5 pl-8 pr-3 text-xs text-[#F5F5F5] placeholder:text-[#666666] focus:border-signal focus:outline-none"
                    />
                  </div>

                  {/* Filter chips */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setActiveCategory(cat)}
                        className={`rounded-lg px-2.5 py-1 text-[11px] font-medium whitespace-nowrap transition cursor-pointer ${
                          activeCategory === cat
                            ? "bg-moss text-white shadow-sm"
                            : "border border-divider bg-console text-[#A0A0A0] hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* FAQ Questions Accordion List */}
                <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5">
                  {filteredFaqs.length === 0 ? (
                    <div className="rounded-xl border border-divider bg-console p-6 text-center text-xs text-[#A0A0A0]">
                      No questions matched &ldquo;{searchQuery}&rdquo;.
                    </div>
                  ) : (
                    filteredFaqs.map((faq) => {
                      const isOpen = openFaqIds.includes(faq.id);
                      return (
                        <div
                          key={faq.id}
                          className="overflow-hidden rounded-xl border border-divider bg-console shadow-sm transition hover:border-divider"
                        >
                          <button
                            type="button"
                            onClick={() => toggleFaqItem(faq.id)}
                            aria-expanded={isOpen}
                            className="flex w-full items-center justify-between p-3 text-left transition cursor-pointer"
                          >
                            <div className="flex flex-col gap-1 pr-3">
                              <span className="self-start rounded bg-signal/10 px-1.5 py-0.5 text-[9px] font-bold text-signal border border-signal/20">
                                {faq.category}
                              </span>
                              <span className="text-xs font-semibold leading-snug text-[#F5F5F5]">
                                {faq.question}
                              </span>
                            </div>
                            <div
                              className={`grid size-6 shrink-0 place-items-center rounded-lg bg-white/5 text-[#A0A0A0] transition-transform duration-200 ${
                                isOpen ? "rotate-180 bg-signal/20 text-signal" : ""
                              }`}
                            >
                              <ChevronDown size={14} />
                            </div>
                          </button>

                          {isOpen && (
                            <div className="border-t border-divider bg-instrument px-3 pb-3 pt-2 text-[11px] leading-relaxed text-[#A0A0A0] animate-in fade-in duration-150">
                              {faq.answer}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* FAQ Footer Switcher */}
                <div className="border-t border-divider bg-instrument p-2.5 text-center">
                  <button
                    type="button"
                    onClick={() => setActiveTab("contact")}
                    className="text-[11px] font-medium text-signal hover:text-[#ff7466] transition cursor-pointer underline underline-offset-2"
                  >
                    Have another question? Send us a message directly →
                  </button>
                </div>
              </div>
            ) : (
              /* Contact & Feedback Tab */
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-instrument">
                {isSuccess && (
                  <FormSuccessState
                    title="Thank you for your feedback!"
                    message="Your message and telemetry context have been received. We review feedback regularly to improve the simulator."
                    onDismiss={() => setIsSuccess(false)}
                  />
                )}

                {errorMessage && (
                  <FormErrorState
                    message={errorMessage}
                    onDismiss={() => setErrorMessage("")}
                    onRetry={() => handleSubmit()}
                  />
                )}

                <form onSubmit={handleSubmit} className="space-y-3">
                  {/* Honeypot field for bot protection */}
                  <div className="hidden" aria-hidden="true" style={{ display: "none" }}>
                    <input
                      type="text"
                      name="bot_field"
                      tabIndex={-1}
                      autoComplete="off"
                      value={botField}
                      onChange={(e) => setBotField(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    <div className="space-y-1">
                      <label className="flex items-center gap-1 text-[11px] font-semibold text-[#A0A0A0]">
                        <User size={11} className="text-signal" />
                        Your Name
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Jane Doe"
                        className="w-full rounded-xl border border-divider bg-console px-3 py-1.5 text-xs text-[#F5F5F5] placeholder:text-[#555555] focus:border-signal focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="flex items-center gap-1 text-[11px] font-semibold text-[#A0A0A0]">
                        <Mail size={11} className="text-signal" />
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="jane@example.com"
                        className="w-full rounded-xl border border-divider bg-console px-3 py-1.5 text-xs text-[#F5F5F5] placeholder:text-[#555555] focus:border-signal focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    <div className="space-y-1">
                      <label className="flex items-center gap-1 text-[11px] font-semibold text-[#A0A0A0]">
                        <Tag size={11} className="text-signal" />
                        Topic / Category
                      </label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full rounded-xl border border-divider bg-console px-2.5 py-1.5 text-xs text-[#F5F5F5] focus:border-signal focus:outline-none"
                      >
                        <option value="Feedback">Feature Feedback & Suggestion</option>
                        <option value="Bug">Audio / Speech Bug Report</option>
                        <option value="Question">Question Quality & Evaluation</option>
                        <option value="Enterprise">Campus / Enterprise Inquiry</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="flex items-center justify-between text-[11px] font-semibold text-[#A0A0A0]">
                        <span className="flex items-center gap-1">
                          <Star size={11} className="text-signal fill-signal" />
                          Simulator Rating
                        </span>
                        <span className="text-[10px] text-[#A0A0A0]">
                          {rating === 5 ? "5/5 - Excellent" : rating === 4 ? "4/5 - Good" : rating === 3 ? "3/5 - Average" : rating === 2 ? "2/5 - Fair" : "1/5 - Poor"}
                        </span>
                      </label>
                      <div className="flex items-center gap-1 h-[34px] px-2 rounded-xl border border-divider bg-console">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setRating(star)}
                            onMouseEnter={() => setHoverRating(star)}
                            onMouseLeave={() => setHoverRating(null)}
                            aria-label={`${star} star${star > 1 ? "s" : ""}`}
                            className="p-1 rounded-md transition-transform hover:scale-115 focus:outline-none cursor-pointer"
                          >
                            <Star
                              size={15}
                              className={`${
                                (hoverRating !== null ? star <= hoverRating : star <= rating)
                                  ? "text-amber-400 fill-amber-400 drop-"
                                  : "text-[#444444]"
                              } transition-colors`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold text-[#A0A0A0]">
                      Message
                    </label>
                    <textarea
                      rows={3}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Describe your question or feedback..."
                      className="w-full rounded-xl border border-divider bg-console p-2.5 text-xs text-[#F5F5F5] placeholder:text-[#555555] focus:border-signal focus:outline-none resize-none"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[9px] text-[#A0A0A0] font-mono">
                      UTM & session telemetry attached
                    </span>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex items-center gap-1.5 rounded-xl bg-moss px-4 py-2 text-xs font-bold text-white shadow-md transition hover:brightness-110 disabled:opacity-50 cursor-pointer active:scale-95"
                    >
                      <Send size={13} />
                      {isSubmitting ? "Sending..." : "Submit Message"}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
