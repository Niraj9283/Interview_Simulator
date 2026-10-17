export interface FAQItem {
  id: string;
  category: "Speech & Audio" | "Privacy & Edge" | "Evaluation" | "Integrity";
  question: string;
  answer: string;
}

export const FAQS: FAQItem[] = [
  {
    id: "speech-analysis",
    category: "Speech & Audio",
    question: "How does real-time voice, pause, and pace tracking work?",
    answer:
      "MockMate AI analyzes your audio stream locally in real-time using the Web Audio API and SpeechRecognition engines. It continuously computes your Words Per Minute (WPM), speech-to-pause ratios, vocal steadiness, volume (RMS/dB), and counts filler words (e.g. 'um', 'like', 'actually'). Optimal pacing is rated between 120-160 WPM.",
  },
  {
    id: "data-privacy",
    category: "Privacy & Edge",
    question: "Is my resume or camera video uploaded to remote servers?",
    answer:
      "No. In Edge Mode, video gaze estimation via MediaPipe and speech analytics execute 100% locally on your computer inside browser WebAssembly runtimes. When utilizing Cloud Mode for deeper LLM reasoning, your resume text and answers are sent securely over TLS without storing persistent biometric video data.",
  },
  {
    id: "edge-vs-cloud",
    category: "Privacy & Edge",
    question: "What is the difference between Edge AI Mode and Cloud Mode?",
    answer:
      "Edge Mode runs lightweight WebAssembly / ONNX models directly on your CPU/GPU with zero network latency (sub-50ms) and works air-gapped without an internet connection. Cloud Mode taps high-parameter frontier reasoning models for hyper-nuanced technical architectural critique.",
  },
  {
    id: "integrity-shield",
    category: "Integrity",
    question: "How does the Anti-Cheating & Integrity Shield compute my score?",
    answer:
      "The integrity tracker monitors tab switching, window blur events, dual-screen gaze displacement, and unnatural copy-paste clipboard events. Maintaining genuine camera engagement and focusing on the interview workspace yields a 90%+ integrity rating.",
  },
  {
    id: "peer-benchmarks",
    category: "Evaluation",
    question: "How does the Longitudinal Peer Benchmark calculate my percentile?",
    answer:
      "Scores from your communication clarity, technical depth, problem-solving, and resume project alignment are evaluated against anonymized performance distributions of thousands of peer candidates across FAANG, Fortune 500, and top tech companies.",
  },
  {
    id: "multimodal-sandbox",
    category: "Evaluation",
    question: "Can I practice coding and system design in the same session?",
    answer:
      "Yes! MockMate AI supports multi-track interviews. You can transition from verbal behavioral questions to live code editing with real-time test execution in JavaScript/Python, or sketch distributed system topologies on the interactive canvas.",
  },
];
