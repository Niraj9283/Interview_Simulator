/**
 * Edge AI & Local Execution Mode Architecture
 * 
 * Configures MockMate as an on-device Edge AI appliance:
 * - Edge Device: Host Laptop / Local Client
 * - Zero Cloud Dependency: Internet NOT REQUIRED
 * - Vision: MediaPipe WASM FaceLandmarker on CPU (XNNPACK) / WebGL GPU
 * - Voice: Web Audio API Time-Domain Float32 RMS
 * - STT: Local Whisper / On-Device Browser Speech API
 * - RAG: Local ChromaDB Persistent Instance
 * - Privacy: Zero candidate frames, audio, or resume data transmitted across network
 */

export type ExecutionMode = "edge" | "cloud";

export interface EdgeTelemetry {
  mode: ExecutionMode;
  deviceType: string;
  visionRuntime: string;
  audioRuntime: string;
  speechRuntime: string;
  embeddingRuntime: string;
  vectorRuntime: string;
  llmRuntime: string;
  browserWebcamProcessing: boolean;
  networkRequired: boolean;
  cloudLatencyMs: number;
  privacyGuarantee: string;
  localMemoryUsageMb?: number;
}

export function getEdgeTelemetry(mode: ExecutionMode): EdgeTelemetry {
  if (mode === "edge") {
    return {
      mode: "edge",
      deviceType: "Local Edge Device (Laptop / Client Workstation)",
      visionRuntime: "MediaPipe FaceLandmarker (In-Browser WASM + WebGL)",
      audioRuntime: "Web Audio API Float32 Time-Domain RMS",
      speechRuntime: "Whisper (small / base) / On-Device Speech API",
      embeddingRuntime: "Lightweight Sentence-Transformer (all-MiniLM-L6-v2)",
      vectorRuntime: "Local Persistent ChromaDB Store",
      llmRuntime: "Quantized 3B–8B Local Model (Llama-3.2 / Phi-3 / Qwen)",
      browserWebcamProcessing: true,
      networkRequired: false,
      cloudLatencyMs: 0,
      privacyGuarantee: "100% Air-Gapped / In-Browser Vision / Zero Frame Uploads",
    };
  }

  return {
    mode: "cloud",
    deviceType: "Hybrid Cloud Architecture",
    visionRuntime: "MediaPipe Client Vision + Server Analytics",
    audioRuntime: "Web Audio API + Cloud Acoustic Analysis",
    speechRuntime: "Cloud Whisper API (/api/transcribe)",
    embeddingRuntime: "Cloud Dense Embedding Model (text-embedding-3)",
    vectorRuntime: "Remote Hosted Vector Database",
    llmRuntime: "Cloud Frontier LLM (GPT-4o / Claude 3.5)",
    browserWebcamProcessing: true,
    networkRequired: true,
    cloudLatencyMs: 280,
    privacyGuarantee: "Encrypted Cloud Transmission (HTTPS / TLS 1.3)",
  };
}
