"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import {
  ArrowRight,
  ArrowUpRight,
  AudioLines,
  Braces,
  Cpu,
  Fingerprint,
  GitFork,
  MessageSquareText,
  Mic,
  Pause,
  Play,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { ExpandableFAQ } from "@/components/features/expandable-faq";

const capabilities = [
  {
    id: "behavioral-star-rubric",
    title: "Behavioral STAR Assessment",
    description: "Evaluates responses on Situation, Task, Action, and Quantified Results with clear ownership scoring.",
    icon: MessageSquareText,
    badge: "Evaluation Engine",
  },
  {
    id: "coding-sandbox",
    title: "Live Algorithmic Sandbox",
    description: "Write solutions in Python or JavaScript with runtime unit tests and Big-O computational complexity analysis.",
    icon: Braces,
    badge: "Code Execution",
  },
  {
    id: "system-design-canvas",
    title: "Distributed System Design",
    description: "Interactive architecture canvas: connect load balancers, caching tiers, microservices, and databases.",
    icon: GitFork,
    badge: "Interactive Canvas",
  },
  {
    id: "speech-cadence-analytics",
    title: "Speech & Cadence Forensics",
    description: "Sub-50ms local audio tracking for optimal pace (120–160 WPM), pause ratios, and unconscious filler words.",
    icon: Mic,
    badge: "Local Audio Telemetry",
  },
];

function VoicePreview() {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [failed, setFailed] = useState(false);

  async function togglePlayback() {
    const player = audio.current;
    if (!player) return;
      if (playing) {
        player.pause();
      } else {
        try {
          setFailed(false);
          await player.play();
        } catch {
          setFailed(true);
        }
      }
    }

    return (
        <figure className="voice-preview" aria-label="Sample technical behavioral interview prompt">
          <div className="preview-header">
            <span><AudioLines size={15} /> Vocal cadence preview</span>
            <span className="sample-label"><i /> Web Audio engine</span>
          </div>
          <div className="voice-plot">
            <div className="plot-label">Real-time spectrum analysis</div>
            <Image
              src="/media/voiceprint.webp"
              width={1100}
              height={408}
              alt="Frequency spectrum of the sample interview question"
              unoptimized
              sizes="(max-width: 860px) 100vw, 550px"
            />
            <div className="plot-ruler" aria-hidden="true">
              <span>0.0s</span>
              <span>1.2s</span>
              <span>2.4s</span>
              <span>3.6s</span>
              <span>4.8s</span>
            </div>
          </div>
          <figcaption className="sample-question">
              <button
                type="button"
                className="sample-play"
                onClick={togglePlayback}
                aria-label={playing ? "Pause sample question" : "Play sample question"}
              >
                {playing ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
              </button>
                <div>
                  <span className="prompt-type">
                    {failed ? "Audio unavailable" : playing ? "Playing prompt" : "Behavioral prompt"}
                    <span> / {playing ? `0:0${Math.floor(elapsed)}` : "0:05"}</span>
                  </span>
                  <p className="font-medium text-zinc-100">
                    &ldquo;Tell me about an architectural decision you made under severe time constraints. What trade-offs did you accept?&rdquo;
                  </p>
                </div>
              </figcaption>
              <audio
                ref={audio}
                src="/media/interview-prompt.mp3"
                preload="none"
                onTimeUpdate={() => setElapsed(audio.current?.currentTime ?? 0)}
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onEnded={() => setPlaying(false)}
              />
            </figure>
            );
}

export function PracticeLanding({
              onLaunch,
              onEdge,
              signedIn,
}: {
              onLaunch: () => void;
  onEdge: () => void;
            signedIn: boolean;
}) {
  return (
            <div className="landing page-width">
              {/* Hero Section */}
              <section className="studio-hero" aria-labelledby="studio-title">
                <div className="hero-copy">
                  <div className="studio-label">
                    <span aria-hidden="true" /> Technical interview simulator
                  </div>
                  <h1 id="studio-title">
                    Master your next interview with <em>real-time feedback.</em>
                  </h1>
                  <p>
                    Conduct realistic mock coding sessions, distributed system design whiteboards, and behavioral prompts with sub-50ms vocal cadence forensics and gaze tracking.
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      id="launch-practice"
                      className="primary-action cursor-pointer"
                      onClick={onLaunch}
                    >
                      <span>{signedIn ? "Launch Practice Session" : "Sign In & Start Practice"}</span>
                      <ArrowRight size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={onEdge}
                      className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/80 px-4 py-2.5 text-xs font-medium text-zinc-300 hover:border-zinc-700 hover:text-white transition mt-6 cursor-pointer"
                    >
                      <Cpu size={14} className="text-zinc-400" />
                      <span>Explore Edge AI Architecture</span>
                    </button>
                  </div>
                  <div className="launch-note">
                    <ShieldCheck size={14} className="text-emerald-400" />
                    <span>Zero biometric video storage. 100% on-device MediaPipe & Web Audio processing.</span>
                  </div>
                </div>
                <VoicePreview />
              </section>

              {/* Core Capabilities Grid */}
              <section id="practice-modes" className="practice-section" aria-labelledby="modes-title">
                <div className="section-heading">
                  <div>
                    <div className="studio-label"><span aria-hidden="true" /> Core Capabilities</div>
                    <h2 id="modes-title">Engineered for technical depth.</h2>
                  </div>
                  <p>
                    Evaluate your problem solving across coding, systems architecture, and communication delivery.
                  </p>
                </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {capabilities.map(({ id, title, description, icon: Icon, badge }) => (
                          <button
                            type="button"
                            key={id}
                            className="mode-card cursor-pointer group"
                            onClick={() =>
                              window.dispatchEvent(new CustomEvent("mockmate:open-module", { detail: { moduleId: id } }))
                            }
                          >
                            <div className="mode-top">
                              <span className="mode-icon">
                                <Icon size={20} strokeWidth={1.8} />
                              </span>
                              <span className="rounded border border-zinc-800 bg-zinc-950 px-2 py-0.5 text-[9px] font-mono text-zinc-400">
                                {badge}
                              </span>
                            </div>
                            <strong>{title}</strong>
                            <span className="mode-description">{description}</span>
                            <span className="mt-4 flex items-center gap-1 text-xs text-zinc-400 group-hover:text-zinc-200 transition">
                              <span>View Rubric</span>
                              <ArrowUpRight size={13} className="text-zinc-500 group-hover:text-zinc-200 transition" />
                            </span>
                          </button>
                        ))}
                      </div>
                    </section>

      {/* Privacy & Edge Callout */ }
                    < div className = "landing-resources" >
        <button type="button" title="Edge AI architecture" onClick={onEdge}>
          <Fingerprint size={15} />
          <span>On-device Edge Execution</span>
          <ArrowUpRight size={13} />
        </button>
        <button
          type="button"
          onClick={() =>
            window.dispatchEvent(
              new CustomEvent("mockmate:open-module", { detail: { moduleId: "speech-cadence-analytics" } })
            )
          }
        >
          <Mic size={15} />
          <span>Speech & Cadence Forensics</span>
          <ArrowUpRight size={13} />
        </button>
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent("mockmate:open-faq"))}
        >
          <Zap size={15} />
          <span>Frequently Asked Questions</span>
          <ArrowUpRight size={13} />
        </button>
      </div>

                {/* Interactive FAQ Section */}
                <div className="pt-8">
                  <ExpandableFAQ />
                </div>
            </div>
            );
}
