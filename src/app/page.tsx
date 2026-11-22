import type { Metadata } from "next";
import InterviewSimulator from "@/components/interview-simulator";

export const metadata: Metadata = {
  title: "Interview Practice Studio",
  description:
    "Conduct full-length mock technical and behavioral interviews with real-time vocal feedback, eye tracking, resume-grounded questions, and distributed system design canvas.",
  alternates: {
    canonical: "/",
  },
};

export default function Home() {
  return <InterviewSimulator />;
}
