"use client";

import React, { useState, useEffect, useRef } from "react";
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
} from "lucide-react";
import { FormSuccessState, FormErrorState } from "./form-feedback-states";
import { FAQS } from "./expandable-faq";
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

  useEffect(() => {
    if (isOpenExternal !== undefined) {
      setInternalOpen(isOpenExternal);
    }
  }, [isOpenExternal]);

  const setIsOpen = (val: boolean) => {
    setInternalOpen(val);
    if (!val && onCloseExternal) {
      onCloseExternal();
    }
    if (onToggleExternal) {
      onToggleExternal(val);
    }
  };

  const isOpen = internalOpen;

  // Active tab inside popup: "faq" | "contact"
  const [activeTab, setActiveTab] = useState<"faq" | "contact">("faq");

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
  const [message, setMessage] = useState("");

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
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
          message: cleanMessage,
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
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#D9362B] to-[#FF4D3D] p-0.5 text-white shadow-[0_0_24px_rgba(255,77,61,0.5)] transition-all duration-300 hover:scale-105 hover:shadow-[0_0_35px_rgba(255,77,61,0.75)] active:scale-95 cursor-pointer print:hidden"
        title={isOpen ? "Close FAQ" : "Frequently Asked Questions & Help"}
      >
        <div className="flex size-full items-center justify-center rounded-[14px] bg-[#111111] backdrop-blur-sm pointer-events-none">
          {isOpen ? (
            <X size={22} className="text-[#FF4D3D] transition-transform duration-200 rotate-90 animate-in spin-in-90" />
          ) : (
            <MessageSquare size={22} className="text-[#F5F5F5] transition-transform group-hover:rotate-6" />
          )}
        </div>

        {/* Pulsing Notification Dot (visible when closed) */}
        {!isOpen && (
          <span className="absolute -top-1 -right-1 flex size-3.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#FF4D3D] opacity-75" />
            <span className="relative inline-flex size-3.5 rounded-full border-2 border-[#080808] bg-[#FF4D3D] shadow-sm" />
          </span>
        )}
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
            role="dialog"
            aria-modal="true"
            aria-label="Frequently Asked Questions & Support"
            className="fixed bottom-24 right-4 sm:right-6 z-50 flex flex-col w-[calc(100vw-2rem)] sm:w-[480px] h-[600px] max-h-[82vh] rounded-2xl border border-[#2A2A2A] bg-[#111111]/98 shadow-[0_25px_60px_rgba(0,0,0,0.9),0_0_35px_rgba(255,77,61,0.15)] backdrop-blur-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200 print:hidden"
          >
            {/* Header */}
            <div className="border-b border-[#222222] bg-[#151515] p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="grid size-9 place-items-center rounded-xl bg-gradient-to-tr from-[#D9362B] to-[#FF4D3D] text-white shadow-md shadow-[#FF4D3D]/20">
                    {activeTab === "faq" ? <HelpCircle size={18} /> : <Sparkles size={18} />}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#F5F5F5] flex items-center gap-1.5">
                      {activeTab === "faq" ? "Frequently Asked Questions" : "Contact & Support"}
                      <span className="rounded-full bg-[#FF4D3D]/10 px-2 py-0.2 text-[9px] font-mono text-[#FF4D3D] border border-[#FF4D3D]/30">
                        Help
                      </span>
                    </h3>
                    <p className="text-[11px] text-[#A0A0A0]">
                      {activeTab === "faq"
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
              <div className="mt-3 flex rounded-xl border border-[#222222] bg-[#080808] p-1">
                <button
                  type="button"
                  onClick={() => setActiveTab("faq")}
                  className={`flex-1 rounded-lg py-1.5 text-center text-xs font-semibold transition cursor-pointer ${
                    activeTab === "faq"
                      ? "bg-[#FF4D3D] text-white shadow-sm"
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
                      ? "bg-[#FF4D3D] text-white shadow-sm"
                      : "text-[#A0A0A0] hover:text-[#F5F5F5]"
                  }`}
                >
                  Send Feedback
                </button>
              </div>
            </div>

            {/* Content Area */}
            {activeTab === "faq" ? (
              <div className="flex-1 flex flex-col overflow-hidden bg-[#0e0e0e]">
                {/* Search & Category Filter Controls */}
                <div className="p-3.5 space-y-2.5 border-b border-[#222222] bg-[#111111]">
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
                      className="w-full rounded-xl border border-[#262626] bg-[#161616] py-1.5 pl-8 pr-3 text-xs text-[#F5F5F5] placeholder:text-[#666666] focus:border-[#FF4D3D] focus:outline-none"
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
                            ? "bg-[#FF4D3D] text-white shadow-sm"
                            : "border border-[#262626] bg-[#151515] text-[#A0A0A0] hover:bg-white/10 hover:text-white"
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
                    <div className="rounded-xl border border-[#222222] bg-[#151515] p-6 text-center text-xs text-[#A0A0A0]">
                      No questions matched &ldquo;{searchQuery}&rdquo;.
                    </div>
                  ) : (
                    filteredFaqs.map((faq) => {
                      const isOpen = openFaqIds.includes(faq.id);
                      return (
                        <div
                          key={faq.id}
                          className="overflow-hidden rounded-xl border border-[#222222] bg-[#151515] shadow-sm transition hover:border-[#333333]"
                        >
                          <button
                            type="button"
                            onClick={() => toggleFaqItem(faq.id)}
                            aria-expanded={isOpen}
                            className="flex w-full items-center justify-between p-3 text-left transition cursor-pointer"
                          >
                            <div className="flex flex-col gap-1 pr-3">
                              <span className="self-start rounded bg-[#FF4D3D]/10 px-1.5 py-0.5 text-[9px] font-bold text-[#FF4D3D] border border-[#FF4D3D]/20">
                                {faq.category}
                              </span>
                              <span className="text-xs font-semibold leading-snug text-[#F5F5F5]">
                                {faq.question}
                              </span>
                            </div>
                            <div
                              className={`grid size-6 shrink-0 place-items-center rounded-lg bg-white/5 text-[#A0A0A0] transition-transform duration-200 ${
                                isOpen ? "rotate-180 bg-[#FF4D3D]/20 text-[#FF4D3D]" : ""
                              }`}
                            >
                              <ChevronDown size={14} />
                            </div>
                          </button>

                          {isOpen && (
                            <div className="border-t border-[#222222] bg-[#0c0c0c] px-3 pb-3 pt-2 text-[11px] leading-relaxed text-[#A0A0A0] animate-in fade-in duration-150">
                              {faq.answer}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* FAQ Footer Switcher */}
                <div className="border-t border-[#222222] bg-[#111111] p-2.5 text-center">
                  <button
                    type="button"
                    onClick={() => setActiveTab("contact")}
                    className="text-[11px] font-medium text-[#FF4D3D] hover:text-[#ff7466] transition cursor-pointer underline underline-offset-2"
                  >
                    Have another question? Send us a message directly →
                  </button>
                </div>
              </div>
            ) : (
              /* Contact & Feedback Tab */
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#0e0e0e]">
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
                  />
                )}

                <form onSubmit={handleSubmit} className="space-y-3">
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    <div className="space-y-1">
                      <label className="flex items-center gap-1 text-[11px] font-semibold text-[#A0A0A0]">
                        <User size={11} className="text-[#FF4D3D]" />
                        Your Name
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Jane Doe"
                        className="w-full rounded-xl border border-[#262626] bg-[#161616] px-3 py-1.5 text-xs text-[#F5F5F5] placeholder:text-[#555555] focus:border-[#FF4D3D] focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="flex items-center gap-1 text-[11px] font-semibold text-[#A0A0A0]">
                        <Mail size={11} className="text-[#FF4D3D]" />
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="jane@example.com"
                        className="w-full rounded-xl border border-[#262626] bg-[#161616] px-3 py-1.5 text-xs text-[#F5F5F5] placeholder:text-[#555555] focus:border-[#FF4D3D] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="flex items-center gap-1 text-[11px] font-semibold text-[#A0A0A0]">
                      <Tag size={11} className="text-[#FF4D3D]" />
                      Topic / Category
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full rounded-xl border border-[#262626] bg-[#161616] px-2.5 py-1.5 text-xs text-[#F5F5F5] focus:border-[#FF4D3D] focus:outline-none"
                    >
                      <option value="Feedback">Feature Feedback & Suggestion</option>
                      <option value="Bug">Audio / Speech Bug Report</option>
                      <option value="Question">Question Quality & Evaluation</option>
                      <option value="Enterprise">Campus / Enterprise Inquiry</option>
                    </select>
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
                      className="w-full rounded-xl border border-[#262626] bg-[#161616] p-2.5 text-xs text-[#F5F5F5] placeholder:text-[#555555] focus:border-[#FF4D3D] focus:outline-none resize-none"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[9px] text-[#A0A0A0] font-mono">
                      UTM & session telemetry attached
                    </span>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#D9362B] to-[#FF4D3D] px-4 py-2 text-xs font-bold text-white shadow-md shadow-[#FF4D3D]/25 transition hover:brightness-110 disabled:opacity-50 cursor-pointer active:scale-95"
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
