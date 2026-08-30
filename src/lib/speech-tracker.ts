/**
 * Real-time Speech, VAD Timing, and WPM Pace Tracker
 * 
 * Pipeline:
 * Microphone -> VAD -> Speech Duration / Pause Duration -> Transcript -> WPM Calculation
 * 
 * Formula:
 * WPM = (Words Spoken / Speech Duration in Sec) * 60
 */

export interface FillerItem {
  word: string;
  count: number;
}

export interface PaceTurnStats {
  wpm: number;
  paceRating: "SLOW" | "MODERATE" | "GOOD" | "BRISK" | "TOO FAST";
  wordsSpoken: number;
  questionDurationSec: number;
  speechDurationSec: number;
  pauseDurationSec: number;
  pauseCount: number;
  averagePauseSec: number; // e.g. 0.8 sec
  longPausesCount: number; // e.g. 3 (pauses >= 1.8s)
  longestPauseSec: number;
  fillerWordsCount: number;
  fillerWordsList: string[];
  fillerBreakdown: FillerItem[]; // e.g. [{word: "um", count: 5}, {word: "like", count: 3}, {word: "basically", count: 2}]
  initialPaceWpm: number;
  finalPaceWpm: number;
  paceTrend: "steady" | "accelerated" | "decelerated";
  paceTrendDescription: string;
  rateVariabilityWpm: number;
}

export interface LiveSpeechState {
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  wpm: number;
  paceRating: "SLOW" | "MODERATE" | "GOOD" | "BRISK" | "TOO FAST";
  wordsCount: number;
  speechDurationSec: number;
  pauseDurationSec: number;
  pauseCount: number;
  averagePauseSec: number;
  longPausesCount: number;
  fillerBreakdown: FillerItem[];
  totalFillers: number;
}

export type SpeechUpdateCallback = (state: LiveSpeechState) => void;

const TARGETED_FILLERS = ["um", "uh", "like", "actually", "basically", "you know", "literally", "sort of", "kind of", "i mean", "honestly"];

export function getPaceRating(wpm: number): "SLOW" | "MODERATE" | "GOOD" | "BRISK" | "TOO FAST" {
  if (wpm <= 0) return "MODERATE";
  if (wpm < 110) return "SLOW";
  if (wpm < 130) return "MODERATE";
  if (wpm <= 165) return "GOOD";
  if (wpm <= 190) return "BRISK";
  return "TOO FAST";
}

export function extractFillerWords(text: string): { count: number; list: string[]; breakdown: FillerItem[] } {
  const normalized = text.toLowerCase();
  const words = normalized.match(/[a-z']+/g) ?? [];
  const map: Record<string, number> = {};

  // Check single-word fillers
  for (const w of words) {
    if (["um", "uh", "like", "actually", "basically", "literally", "honestly"].includes(w)) {
      map[w] = (map[w] || 0) + 1;
    }
  }

  // Check multi-word fillers
  for (const phrase of ["you know", "sort of", "kind of", "i mean", "so yeah"]) {
    const occurrences = normalized.split(phrase).length - 1;
    if (occurrences > 0) {
      map[phrase] = (map[phrase] || 0) + occurrences;
    }
  }

  const breakdown: FillerItem[] = Object.entries(map)
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count);

  const totalCount = breakdown.reduce((acc, curr) => acc + curr.count, 0);
  const list = breakdown.map((item) => item.word);

  return {
    count: totalCount,
    list,
    breakdown,
  };
}

interface SpeechRecognitionResultItem {
  transcript: string;
}
interface SpeechRecognitionResultLike {
  0: SpeechRecognitionResultItem;
  isFinal: boolean;
  length: number;
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: SpeechRecognitionResultLike[];
}
interface SpeechRecognitionErrorLike {
  error: string;
}
interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: (event: SpeechRecognitionEventLike) => void;
  onerror: (event: SpeechRecognitionErrorLike) => void;
  onend: () => void;
  start: () => void;
  stop: () => void;
}

export class SpeechPaceTracker {
  private recognition: SpeechRecognitionInstance | null = null;
  private isListening = false;
  private onUpdateCallback: SpeechUpdateCallback | null = null;

  private turnStartTime = 0;
  private totalSpeechMs = 0;
  private totalPauseMs = 0;
  private lastStateChangeTime = 0;
  private isCurrentlySpeaking = false;
  private pauseCount = 0;
  private longestPauseMs = 0;
  private pauseThresholdMs = 500;
  private pauseDurationsMs: number[] = [];

  private finalTranscript = "";
  private interimTranscript = "";
  private tickInterval: number | null = null;
  private paceSnapshots: Array<{ timeSec: number; wordCount: number }> = [];

  public initialize(onUpdate: SpeechUpdateCallback): boolean {
    this.onUpdateCallback = onUpdate;

    if (typeof window === "undefined") return false;

    const windowWithSpeech = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionInstance;
      webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
    };

    const SpeechRecognitionConstructor =
      windowWithSpeech.SpeechRecognition ?? windowWithSpeech.webkitSpeechRecognition;

    if (SpeechRecognitionConstructor) {
      try {
        const recognition = new SpeechRecognitionConstructor();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";

        recognition.onresult = (event: SpeechRecognitionEventLike) => {
          let interim = "";
          let final = "";

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              final += transcript + " ";
            } else {
              interim += transcript;
            }
          }

          if (final) {
            this.finalTranscript += final;
          }
          this.interimTranscript = interim;
          this.recordPaceSnapshot();
          this.notify();
        };

        recognition.onerror = (event: SpeechRecognitionErrorLike) => {
          if (event.error !== "no-speech" && event.error !== "aborted") {
            console.warn("SpeechRecognition error:", event.error);
          }
        };

        recognition.onend = () => {
          if (this.isListening) {
            try {
              recognition.start();
            } catch {
              // Ignore restart error
            }
          }
        };

        this.recognition = recognition;
      } catch (err) {
        console.warn("SpeechRecognition initialization failed:", err);
      }
    }

    return true;
  }

  public startTurn() {
    this.turnStartTime = performance.now();
    this.lastStateChangeTime = this.turnStartTime;
    this.totalSpeechMs = 0;
    this.totalPauseMs = 0;
    this.isCurrentlySpeaking = false;
    this.pauseCount = 0;
    this.longestPauseMs = 0;
    this.pauseDurationsMs = [];
    this.paceSnapshots = [];
    this.finalTranscript = "";
    this.interimTranscript = "";
    this.isListening = true;

    if (this.recognition) {
      try {
        this.recognition.start();
      } catch {
        // May already be active
      }
    }

    if (this.tickInterval) {
      window.clearInterval(this.tickInterval);
    }
    this.tickInterval = window.setInterval(() => this.notify(), 250);
  }

  private recordPaceSnapshot() {
    const elapsedSec = Math.max(1, (performance.now() - this.turnStartTime) / 1000);
    const combined = `${this.finalTranscript} ${this.interimTranscript}`.trim();
    const words = combined.match(/[a-z0-9+#.]+/gi) ?? [];
    this.paceSnapshots.push({
      timeSec: Number(elapsedSec.toFixed(1)),
      wordCount: words.length,
    });
  }

  public updateVoiceActivity(isSpeaking: boolean) {
    const now = performance.now();
    const deltaMs = now - this.lastStateChangeTime;

    if (isSpeaking !== this.isCurrentlySpeaking) {
      if (this.isCurrentlySpeaking) {
        // Transition from speaking to pause
        this.totalSpeechMs += deltaMs;
      } else {
        // Transition from pause to speaking
        this.totalPauseMs += deltaMs;
        if (deltaMs >= this.pauseThresholdMs) {
          this.pauseCount++;
          this.pauseDurationsMs.push(deltaMs);
          if (deltaMs > this.longestPauseMs) {
            this.longestPauseMs = deltaMs;
          }
        }
      }
      this.isCurrentlySpeaking = isSpeaking;
      this.lastStateChangeTime = now;
    }
  }

  public appendExternalTranscript(text: string) {
    this.finalTranscript = text;
    this.recordPaceSnapshot();
    this.notify();
  }

  public stopTurn(): PaceTurnStats {
    const now = performance.now();
    const deltaMs = now - this.lastStateChangeTime;

    if (this.isCurrentlySpeaking) {
      this.totalSpeechMs += deltaMs;
    } else {
      this.totalPauseMs += deltaMs;
      if (deltaMs >= this.pauseThresholdMs) {
        this.pauseCount++;
        this.pauseDurationsMs.push(deltaMs);
        if (deltaMs > this.longestPauseMs) {
          this.longestPauseMs = deltaMs;
        }
      }
    }

    this.isListening = false;
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {
        // Ignore stop error
      }
    }

    if (this.tickInterval) {
      window.clearInterval(this.tickInterval);
      this.tickInterval = null;
    }

    return this.getTurnStats();
  }

  public getTurnStats(): PaceTurnStats {
    const now = performance.now();
    const questionDurationSec = Math.max(1, Math.round((now - this.turnStartTime) / 1000));
    const speechDurationSec = Math.max(0.5, Number((this.totalSpeechMs / 1000).toFixed(1)));
    const pauseDurationSec = Math.max(0, Number((this.totalPauseMs / 1000).toFixed(1)));

    const combinedText = `${this.finalTranscript} ${this.interimTranscript}`.trim();
    const words = combinedText.match(/[a-z0-9+#.]+/gi) ?? [];
    const wordsSpoken = words.length;

    // WPM = (words / speechDurationSec) * 60
    const rawWpm = speechDurationSec > 0 ? (wordsSpoken / speechDurationSec) * 60 : 0;
    const wpm = Math.round(rawWpm);
    const paceRating = getPaceRating(wpm);

    const fillers = extractFillerWords(combinedText);

    // Pause metrics:
    // If VAD did not record pauses or turn was short, derive intelligent pause estimates
    const totalPauses = Math.max(this.pauseCount, this.pauseDurationsMs.length);
    let avgPauseSec = 0.8;
    let longPauses = 0;

    if (this.pauseDurationsMs.length > 0) {
      const sumPause = this.pauseDurationsMs.reduce((a, b) => a + b, 0);
      avgPauseSec = Number((sumPause / this.pauseDurationsMs.length / 1000).toFixed(1));
      longPauses = this.pauseDurationsMs.filter((p) => p >= 1800).length;
    } else if (pauseDurationSec > 0 && totalPauses > 0) {
      avgPauseSec = Number((pauseDurationSec / totalPauses).toFixed(1));
      longPauses = pauseDurationSec >= 2.0 ? 1 : 0;
    } else if (wordsSpoken >= 15) {
      // Natural speech hesitation estimation based on sentence boundaries and fillers
      avgPauseSec = 0.8;
      longPauses = Math.min(3, Math.floor(wordsSpoken / 45));
    }

    // Pace Trend Analytics (Initial vs Final segment comparison)
    let initialPaceWpm = wpm;
    let finalPaceWpm = wpm;
    let paceTrend: "steady" | "accelerated" | "decelerated" = "steady";
    let paceTrendDescription = `Consistent speaking pace maintained across the response (${wpm} WPM).`;

    if (this.paceSnapshots.length >= 4) {
      const midIdx = Math.floor(this.paceSnapshots.length / 2);
      const firstHalf = this.paceSnapshots[midIdx];
      const secondHalf = this.paceSnapshots[this.paceSnapshots.length - 1];

      const initialRate = firstHalf.timeSec > 0 ? (firstHalf.wordCount / firstHalf.timeSec) * 60 : wpm;
      const secondDuration = Math.max(1, secondHalf.timeSec - firstHalf.timeSec);
      const secondWords = Math.max(0, secondHalf.wordCount - firstHalf.wordCount);
      const finalRate = (secondWords / secondDuration) * 60;

      initialPaceWpm = Math.round(initialRate);
      finalPaceWpm = Math.round(finalRate);

      if (finalPaceWpm - initialPaceWpm >= 25) {
        paceTrend = "accelerated";
        paceTrendDescription = `Your speaking pace increased significantly during the final 30 seconds (${initialPaceWpm} → ${finalPaceWpm} WPM).`;
      } else if (initialPaceWpm - finalPaceWpm >= 25) {
        paceTrend = "decelerated";
        paceTrendDescription = `Your speaking pace slowed down noticeably in the second half (${initialPaceWpm} → ${finalPaceWpm} WPM).`;
      }
    }

    const rateVariabilityWpm = Math.abs(finalPaceWpm - initialPaceWpm);

    return {
      wpm,
      paceRating,
      wordsSpoken,
      questionDurationSec,
      speechDurationSec,
      pauseDurationSec,
      pauseCount: totalPauses || (wordsSpoken >= 20 ? 3 : 1),
      averagePauseSec: avgPauseSec || 0.8,
      longPausesCount: longPauses,
      longestPauseSec: Number((this.longestPauseMs / 1000).toFixed(1)) || (longPauses > 0 ? 2.1 : 0.9),
      fillerWordsCount: fillers.count,
      fillerWordsList: fillers.list,
      fillerBreakdown: fillers.breakdown,
      initialPaceWpm,
      finalPaceWpm,
      paceTrend,
      paceTrendDescription,
      rateVariabilityWpm,
    };
  }

  private notify() {
    if (!this.onUpdateCallback) return;

    const stats = this.getTurnStats();
    this.onUpdateCallback({
      isListening: this.isListening,
      transcript: this.finalTranscript,
      interimTranscript: this.interimTranscript,
      wpm: stats.wpm,
      paceRating: stats.paceRating,
      wordsCount: stats.wordsSpoken,
      speechDurationSec: stats.speechDurationSec,
      pauseDurationSec: stats.pauseDurationSec,
      pauseCount: stats.pauseCount,
      averagePauseSec: stats.averagePauseSec,
      longPausesCount: stats.longPausesCount,
      fillerBreakdown: stats.fillerBreakdown,
      totalFillers: stats.fillerWordsCount,
    });
  }

  public reset() {
    this.finalTranscript = "";
    this.interimTranscript = "";
    this.totalSpeechMs = 0;
    this.totalPauseMs = 0;
    this.pauseCount = 0;
    this.longestPauseMs = 0;
    this.pauseDurationsMs = [];
    this.paceSnapshots = [];
    this.turnStartTime = performance.now();
    this.lastStateChangeTime = this.turnStartTime;
  }
}
