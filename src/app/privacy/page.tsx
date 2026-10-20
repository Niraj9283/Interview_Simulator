import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, Lock, Video, Server, Trash2, ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Learn how MockMate AI protects your data, video feeds, audio telemetry, and resume records.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto min-h-[85vh] max-w-4xl px-4 py-14 sm:px-6">
      {/* Header */}
      <div className="mb-10 space-y-3">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-[#888888] hover:text-white transition mb-2"
        >
          <ArrowLeft size={14} />
          <span>Back to Simulator</span>
        </Link>
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
          <ShieldCheck size={14} />
          <span>Privacy & Governance</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Privacy Policy
        </h1>
        <p className="text-xs text-[#888888] font-mono">
          Last Updated: October 2026 &bull; Effective Immediately
        </p>
      </div>

      <div className="space-y-8 text-xs sm:text-sm text-[#A0A0A0] leading-relaxed">
        {/* Section 1: Overview */}
        <section className="rounded-2xl border border-[#222222] bg-[#121212]/95 p-6 backdrop-blur space-y-3">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Lock size={18} className="text-[#FF4D3D]" />
            <span>1. Overview & Privacy Principles</span>
          </h2>
          <p>
            At <strong>MockMate AI</strong> (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;), we believe that
            privacy is foundational to genuine technical preparation. MockMate AI is engineered from the ground up
            with privacy-first, client-side edge computing principles. This Privacy Policy discloses our exact
            technical architecture, what information is processed, where it is computed, and your rights over your data.
          </p>
        </section>

        {/* Section 2: Camera & Microphone */}
        <section className="rounded-2xl border border-emerald-500/20 bg-emerald-950/10 p-6 backdrop-blur space-y-3">
          <h2 className="text-base font-bold text-emerald-300 flex items-center gap-2">
            <Video size={18} />
            <span>2. Zero-Storage Video & Local Audio Processing</span>
          </h2>
          <p className="text-neutral-200 font-medium">
            We operate an uncompromising Zero-Storage policy regarding your camera video and raw audio streams:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-neutral-300">
            <li>
              <strong>Video Landmarker Edge Engine:</strong> When you grant camera access, visual facial landmarking
              (468 face coordinate mesh, eye contact, head orientation) is calculated <strong>100% locally in your
              browser</strong> using MediaPipe WebAssembly (WASM). Your camera feed is NEVER uploaded, recorded, or
              transmitted to any remote server or third party.
            </li>
            <li>
              <strong>Speech Cadence Engine:</strong> Audio time-domain RMS, speaking cadence (WPM), pitch stability,
              and filler word detection run via the client-side Web Audio API. Raw audio is processed in memory and
              discarded immediately after metrics are extracted.
            </li>
            <li>
              <strong>Explicit User Consent:</strong> Device access is never automatically requested upon site load.
              Access is requested only after you click the microphone or camera button.
            </li>
          </ul>
        </section>

        {/* Section 3: Information Collected */}
        <section className="rounded-2xl border border-[#222222] bg-[#121212]/95 p-6 backdrop-blur space-y-3">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Server size={18} className="text-[#FF4D3D]" />
            <span>3. Account & Simulation Information Collected</span>
          </h2>
          <p>
            When you create an account and practice interviews, we store the following data in a protected,
            isolated database:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Account Identity:</strong> Full name, email address, role, and verification status.</li>
            <li><strong>Credentials:</strong> Passwords are never stored in plaintext. They are salted with 16 bytes of cryptographic entropy and hashed using PBKDF2-HMAC-SHA256 with 600,000 iterations (OWASP standard).</li>
            <li><strong>Interview Ledger:</strong> Generated questions, submitted answers, STAR evaluation breakdowns, scores, and personalized 7-day roadmaps.</li>
            <li><strong>Uploaded Resumes:</strong> Extracted skill keywords and project summaries if you upload a resume for personalized question generation.</li>
          </ul>
        </section>

        {/* Section 4: Data Isolation & RLS */}
        <section className="rounded-2xl border border-[#222222] bg-[#121212]/95 p-6 backdrop-blur space-y-3">
          <h2 className="text-base font-bold text-white">4. Row-Level Security & Data Isolation</h2>
          <p>
            Your interview sessions, performance metrics, and resumes are strictly bound to your account ID via
            relational foreign keys. Queries and mutations enforce user isolation so that no user can view, alter,
            or delete another user&apos;s simulation ledger. In PostgreSQL container deployments, database-level Row-Level
            Security (RLS) policies are active.
          </p>
        </section>

        {/* Section 5: Cookies & Sessions */}
        <section className="rounded-2xl border border-[#222222] bg-[#121212]/95 p-6 backdrop-blur space-y-3">
          <h2 className="text-base font-bold text-white">5. Cookies & Session Storage</h2>
          <p>
            We use strictly necessary <strong>HttpOnly, Secure, SameSite=Lax</strong> cookies for authentication.
            Because tokens are kept in HttpOnly cookies, malicious scripts cannot extract your credentials from
            the browser. Essential cookies cannot be disabled. Optional telemetry and analytics preferences can
            be calibrated via the Cookie Preferences modal at any time.
          </p>
        </section>

        {/* Section 6: Analytics & Third Parties */}
        <section className="rounded-2xl border border-[#222222] bg-[#121212]/95 p-6 backdrop-blur space-y-3">
          <h2 className="text-base font-bold text-white">6. Analytics & Error Monitoring</h2>
          <p>
            We use Vercel Analytics and Sentry monitoring to detect crashes, calculate page speed, and enhance
            platform stability. These services are configured with automated PII scrubbing — passwords, JWT tokens,
            resume text, and interview transcripts are scrubbed before telemetry payloads leave the server.
          </p>
        </section>

        {/* Section 7: Account Deletion */}
        <section className="rounded-2xl border border-red-500/20 bg-red-950/10 p-6 backdrop-blur space-y-3">
          <h2 className="text-base font-bold text-red-300 flex items-center gap-2">
            <Trash2 size={18} />
            <span>7. Right to Deletion (GDPR & CCPA Compliance)</span>
          </h2>
          <p className="text-neutral-300">
            You maintain full ownership of your data. You may execute a complete, permanent account erasure at any
            time from <strong>Settings &gt; Security Settings &gt; Danger Zone</strong>.
          </p>
          <p className="text-neutral-300">
            Upon confirmation, our backend executes a transactional database purge deleting all your interview
            sessions, evaluations, scores, resumes, and user records. Active sessions are revoked immediately.
            Please note that protected offline backups expire and roll off according to our 7-day retention cycle.
          </p>
        </section>

        {/* Section 8: Contact */}
        <section className="rounded-2xl border border-[#222222] bg-[#121212]/95 p-6 backdrop-blur space-y-3">
          <h2 className="text-base font-bold text-white">8. Contact & Data Protection Inquiries</h2>
          <p>
            If you have questions or requests regarding your personal data or privacy rights, please reach out to:
          </p>
          <div className="rounded-xl border border-[#222222] bg-[#161616] p-4 text-xs font-mono text-[#D4D4D4] space-y-1">
            <p><strong>MockMate AI Privacy & Data Protection</strong></p>
            <p>Email: <a href="mailto:privacy@mockmate.ai" className="text-[#FF4D3D] hover:underline">privacy@mockmate.ai</a></p>
            <p>Support: <Link href="/#contact" className="text-[#FF4D3D] hover:underline">Interactive Feedback Center</Link></p>
          </div>
        </section>
      </div>
    </div>
  );
}
