import type { Metadata } from "next";
import "./globals.css";

import InteractiveBackground from "@/components/interactive-background";

export const metadata: Metadata = {

  title: "MockMate AI",
  description: "Real-time interview simulator with resume-aware feedback.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">
        <InteractiveBackground />
        {children}
      </body>

    </html>
  );
}

