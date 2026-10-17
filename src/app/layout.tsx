import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

import InteractiveBackground from "@/components/interactive-background";
import { AppFeatureShell } from "@/components/features/app-feature-shell";
import { StructuredData } from "@/components/seo/structured-data";

// Feature #21: Font Optimization via next/font with zero external requests & swap display
const sansFont = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
  preload: true,
});

const monoFont = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
  preload: true,
});

export const viewport: Viewport = {
  themeColor: "#080808",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

const baseUrl = new URL(process.env.NEXT_PUBLIC_APP_URL || "https://mockmate.ai");

// Features #11, #12, #15: Page Title, Meta Description, Open Graph & Canonical Tags
export const metadata: Metadata = {
  metadataBase: baseUrl,
  title: {
    default: "MockMate AI - Real-time Interview Simulator & Speech Analytics",
    template: "%s | MockMate AI",
  },
  description:
    "Master technical coding, system design, and behavioral interviews with real-time AI feedback, edge speech metrics, eye-contact tracking, and resume-aware question generation.",
  applicationName: "MockMate AI",
  authors: [{ name: "MockMate AI Engineering" }],
  generator: "Next.js",
  keywords: [
    "AI mock interview",
    "interview simulator",
    "coding interview practice",
    "system design interview",
    "speech cadence analysis",
    "behavioral STAR interview",
    "technical interview preparation",
    "edge AI interview",
  ],
  referrer: "origin-when-cross-origin",
  creator: "MockMate AI",
  publisher: "MockMate AI",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: baseUrl.toString(),
    siteName: "MockMate AI",
    title: "MockMate AI - Real-time Interview Simulator & Speech Analytics",
    description:
      "Autonomous real-time AI interview simulator with speech cadence analytics, live coding sandbox, distributed system design canvas, and local edge privacy.",
  },
  twitter: {
    card: "summary_large_image",
    title: "MockMate AI - Real-time Interview Simulator & Speech Analytics",
    description:
      "Master technical coding, system design, and behavioral interviews with real-time AI feedback and edge speech metrics.",
    creator: "@MockMateAI",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico" },
    ],
    apple: [
      { url: "/apple-icon.svg", sizes: "180x180", type: "image/svg+xml" },
    ],
  },
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`h-full antialiased ${sansFont.variable} ${monoFont.variable}`}
      data-theme="dark"
    >
      <head>
        {/* Feature #16: Schema.org Structured Data */}
        <StructuredData />
      </head>
      <body className="min-h-full font-sans">
        <InteractiveBackground />
        <AppFeatureShell>{children}</AppFeatureShell>
      </body>
    </html>
  );
}
