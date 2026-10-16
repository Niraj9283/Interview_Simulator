import type { Metadata } from "next";
import "./globals.css";

import InteractiveBackground from "@/components/interactive-background";
import { AppFeatureShell } from "@/components/features/app-feature-shell";

export const metadata: Metadata = {
  title: "MockMate AI - Real-time Interview Simulator",
  description: "Real-time interview simulator with resume-aware feedback, speech analytics, and coding sandbox.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" data-theme="dark">
      <body className="min-h-full">
        <InteractiveBackground />
        <AppFeatureShell>{children}</AppFeatureShell>
      </body>
    </html>
  );
}


