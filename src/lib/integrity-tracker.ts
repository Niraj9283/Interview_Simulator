/**
 * Interview Integrity & Focus Telemetry Service
 * 
 * Tracks real-time environment stability, camera presence, tab focus,
 * clipboard activity, and vocal continuity during interview sessions.
 * 
 * Philosophy: Provides objective telemetry and diagnostic logs without
 * accusatory assertions, recognizing natural human behavior (e.g. thinking gaze).
 */

export interface IntegrityEvent {
  id: string;
  timestamp: number;
  formattedTime: string;
  turnId?: number;
  type:
    | "multiple_faces"
    | "no_face"
    | "off_screen_gaze"
    | "tab_switch"
    | "clipboard_paste"
    | "long_silence"
    | "phone_posture";
  severity: "info" | "warning" | "flag";
  title: string;
  detail: string;
  durationSec?: number;
}

export interface DiagnosticCheckItem {
  id: string;
  label: string;
  status: "pass" | "warn" | "flag";
  symbol: "✓" | "⚠" | "✗" | "ℹ️";
  detail: string;
}

export interface IntegrityState {
  singlePersonDetected: boolean;
  noAdditionalFace: boolean;
  facesCount: number;
  frequentOffScreenGaze: boolean;
  gazeAwayCount: number;
  gazeAwayTotalSec: number;
  gazeAwayPercent: number;
  suspiciousTabSwitch: boolean;
  tabSwitchCount: number;
  totalTabSwitchDurationSec: number;
  clipboardEventsCount: number;
  pastedCharactersTotal: number;
  longSilenceEventsCount: number;
  phonePostureDetected: boolean;
  integrityScore: number; // 0 - 100
  integrityLevel: "Optimal" | "Calibrated" | "Review Suggested";
  diagnosticChecks: DiagnosticCheckItem[];
  recentEvents: IntegrityEvent[];
}

export type IntegrityCallback = (state: IntegrityState) => void;

export class InterviewIntegrityTracker {
  private events: IntegrityEvent[] = [];
  private currentFacesCount = 1;
  private tabSwitchCount = 0;
  private totalTabSwitchDurationSec = 0;
  private tabSwitchStartTimestamp: number | null = null;
  private clipboardEventsCount = 0;
  private pastedCharactersTotal = 0;
  private longSilenceEventsCount = 0;
  private phonePostureDetected = false;
  private gazeAwayCount = 0;
  private gazeAwayTotalSec = 0;
  private sessionStartTimestamp = Date.now();
  private totalFramesTracked = 0;
  private gazeAwayFrames = 0;
  private currentTurnId = 1;
  private isListeningToBrowser = false;
  private listenersCleanups: Array<() => void> = [];

  constructor() {
    this.sessionStartTimestamp = Date.now();
  }

  public initBrowserListeners(onEventTriggered?: (event: IntegrityEvent) => void) {
    if (typeof window === "undefined" || this.isListeningToBrowser) return;
    this.isListeningToBrowser = true;

    // 1. Tab Switching / Window Visibility Change
    const handleVisibilityChange = () => {
      if (document.hidden) {
        this.tabSwitchStartTimestamp = Date.now();
      } else {
        if (this.tabSwitchStartTimestamp) {
          const durationSec = Math.max(1, Math.round((Date.now() - this.tabSwitchStartTimestamp) / 1000));
          this.tabSwitchCount += 1;
          this.totalTabSwitchDurationSec += durationSec;
          this.tabSwitchStartTimestamp = null;

          const event: IntegrityEvent = {
            id: `tab-${Date.now()}`,
            timestamp: Date.now(),
            formattedTime: this.formatTime(Date.now()),
            turnId: this.currentTurnId,
            type: "tab_switch",
            severity: durationSec > 5 ? "warning" : "info",
            title: "Window / Tab Switch Recorded",
            detail: `Browser window lost focus for ${durationSec}s before candidate returned to simulator.`,
            durationSec,
          };
          this.recordEvent(event);
          onEventTriggered?.(event);
        }
      }
    };

    // 2. Window Blur / Focus
    const handleWindowBlur = () => {
      if (!this.tabSwitchStartTimestamp) {
        this.tabSwitchStartTimestamp = Date.now();
      }
    };

    const handleWindowFocus = () => {
      if (this.tabSwitchStartTimestamp) {
        const durationSec = Math.max(1, Math.round((Date.now() - this.tabSwitchStartTimestamp) / 1000));
        this.tabSwitchCount += 1;
        this.totalTabSwitchDurationSec += durationSec;
        this.tabSwitchStartTimestamp = null;

        const event: IntegrityEvent = {
          id: `blur-${Date.now()}`,
          timestamp: Date.now(),
          formattedTime: this.formatTime(Date.now()),
          turnId: this.currentTurnId,
          type: "tab_switch",
          severity: durationSec > 6 ? "warning" : "info",
          title: "Application Focus Blur",
          detail: `User navigated outside of active simulator tab for ${durationSec}s.`,
          durationSec,
        };
        this.recordEvent(event);
        onEventTriggered?.(event);
      }
    };

    // 3. Clipboard Activity (Paste Event)
    const handlePaste = (e: ClipboardEvent) => {
      const pastedData = e.clipboardData?.getData("text") || "";
      if (pastedData.length > 25) {
        this.clipboardEventsCount += 1;
        this.pastedCharactersTotal += pastedData.length;

        const event: IntegrityEvent = {
          id: `paste-${Date.now()}`,
          timestamp: Date.now(),
          formattedTime: this.formatTime(Date.now()),
          turnId: this.currentTurnId,
          type: "clipboard_paste",
          severity: pastedData.length > 120 ? "warning" : "info",
          title: "Clipboard Paste Detected",
          detail: `Pasted ${pastedData.length} characters into interview response field.`,
        };
        this.recordEvent(event);
        onEventTriggered?.(event);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    window.addEventListener("focus", handleWindowFocus);
    document.addEventListener("paste", handlePaste);

    this.listenersCleanups = [
      () => document.removeEventListener("visibilitychange", handleVisibilityChange),
      () => window.removeEventListener("blur", handleWindowBlur),
      () => window.removeEventListener("focus", handleWindowFocus),
      () => document.removeEventListener("paste", handlePaste),
    ];
  }

  public setTurn(turnId: number) {
    this.currentTurnId = turnId;
  }

  public updateFaceTelemetry(facesCount: number, isFacingCamera: boolean, pitch: number, yaw: number) {
    this.totalFramesTracked += 1;
    this.currentFacesCount = facesCount;

    if (!isFacingCamera || Math.abs(yaw) > 24 || Math.abs(pitch) > 22) {
      this.gazeAwayFrames += 1;
    }

    // Check for Multiple Faces (> 1)
    if (facesCount > 1) {
      const lastMulti = this.events.find(
        (e) => e.type === "multiple_faces" && Date.now() - e.timestamp < 10000
      );
      if (!lastMulti) {
        const event: IntegrityEvent = {
          id: `multi-face-${Date.now()}`,
          timestamp: Date.now(),
          formattedTime: this.formatTime(Date.now()),
          turnId: this.currentTurnId,
          type: "multiple_faces",
          severity: "flag",
          title: "Multiple Faces Detected in Frame",
          detail: `${facesCount} individuals detected in camera view simultaneously.`,
        };
        this.recordEvent(event);
      }
    }

    // Check for downward phone posture / excessive downward gaze
    if (pitch > 28 && Math.abs(yaw) < 15) {
      const lastPhone = this.events.find(
        (e) => e.type === "phone_posture" && Date.now() - e.timestamp < 15000
      );
      if (!lastPhone) {
        this.phonePostureDetected = true;
        const event: IntegrityEvent = {
          id: `phone-${Date.now()}`,
          timestamp: Date.now(),
          formattedTime: this.formatTime(Date.now()),
          turnId: this.currentTurnId,
          type: "phone_posture",
          severity: "info",
          title: "Downward Screen / Desk Gaze Posture",
          detail: "Candidate looking steeply downward towards desk / handheld angle (>28° pitch).",
        };
        this.recordEvent(event);
      }
    }
  }

  public registerGazeAversion(durationSec: number) {
    this.gazeAwayCount += 1;
    this.gazeAwayTotalSec += durationSec;

    if (durationSec >= 3.5) {
      const event: IntegrityEvent = {
        id: `gaze-${Date.now()}`,
        timestamp: Date.now(),
        formattedTime: this.formatTime(Date.now()),
        turnId: this.currentTurnId,
        type: "off_screen_gaze",
        severity: durationSec > 6 ? "warning" : "info",
        title: "Extended Off-Screen Gaze",
        detail: `Candidate gaze directed away from primary camera for ${durationSec.toFixed(1)}s while formulating response.`,
        durationSec,
      };
      this.recordEvent(event);
    }
  }

  public registerLongSilence(durationSec: number) {
    this.longSilenceEventsCount += 1;
    const event: IntegrityEvent = {
      id: `silence-${Date.now()}`,
      timestamp: Date.now(),
      formattedTime: this.formatTime(Date.now()),
      turnId: this.currentTurnId,
      type: "long_silence",
      severity: "info",
      title: "Extended Verbal Silence",
      detail: `Candidate paused vocal response for ${durationSec.toFixed(1)}s on Question ${this.currentTurnId}.`,
      durationSec,
    };
    this.recordEvent(event);
  }

  public registerClipboardPaste(charCount: number) {
    this.clipboardEventsCount += 1;
    this.pastedCharactersTotal += charCount;
    const event: IntegrityEvent = {
      id: `paste-manual-${Date.now()}`,
      timestamp: Date.now(),
      formattedTime: this.formatTime(Date.now()),
      turnId: this.currentTurnId,
      type: "clipboard_paste",
      severity: charCount > 150 ? "warning" : "info",
      title: "Significant Text Block Inserted",
      detail: `Candidate pasted an answer segment of ${charCount} characters.`,
    };
    this.recordEvent(event);
  }

  private recordEvent(event: IntegrityEvent) {
    this.events.unshift(event);
    if (this.events.length > 50) {
      this.events.pop();
    }
  }

  public getState(): IntegrityState {
    const singlePersonDetected = this.currentFacesCount >= 1;
    const noAdditionalFace = this.currentFacesCount <= 1;

    const gazeAwayPercent =
      this.totalFramesTracked > 0
        ? Math.round((this.gazeAwayFrames / this.totalFramesTracked) * 100)
        : 0;

    const frequentOffScreenGaze = gazeAwayPercent > 28 || this.gazeAwayCount >= 4;
    const suspiciousTabSwitch = this.tabSwitchCount >= 2;

    // Score deduction engine (calibrated, transparent)
    let score = 100;
    if (this.tabSwitchCount > 0) score -= Math.min(30, this.tabSwitchCount * 12);
    if (this.clipboardEventsCount > 0) score -= Math.min(20, this.clipboardEventsCount * 8);
    if (frequentOffScreenGaze) score -= 12;
    if (this.currentFacesCount > 1) score -= 25;
    if (this.currentFacesCount === 0 && this.totalFramesTracked > 100) score -= 10;
    if (this.longSilenceEventsCount > 2) score -= 8;

    score = Math.max(20, Math.min(100, score));

    const integrityLevel: IntegrityState["integrityLevel"] =
      score >= 85 ? "Optimal" : score >= 65 ? "Calibrated" : "Review Suggested";

    // Build diagnostic checks (matching exact user specification)
    const diagnosticChecks: DiagnosticCheckItem[] = [
      {
        id: "single_person",
        label: singlePersonDetected ? "Single person detected" : "No person detected",
        status: singlePersonDetected ? "pass" : "warn",
        symbol: singlePersonDetected ? "✓" : "⚠",
        detail: singlePersonDetected
          ? "Primary candidate verified in camera frame."
          : "Candidate face momentarily unobserved.",
      },
      {
        id: "no_additional_face",
        label: noAdditionalFace ? "No additional face" : "Multiple faces detected",
        status: noAdditionalFace ? "pass" : "flag",
        symbol: noAdditionalFace ? "✓" : "✗",
        detail: noAdditionalFace
          ? "Clean isolated testing environment."
          : `Detected ${this.currentFacesCount} faces simultaneously in frame.`,
      },
      {
        id: "gaze_behavior",
        label: frequentOffScreenGaze ? "Frequent off-screen gaze" : "Forward gaze alignment",
        status: frequentOffScreenGaze ? "warn" : "pass",
        symbol: frequentOffScreenGaze ? "⚠" : "✓",
        detail: frequentOffScreenGaze
          ? `${gazeAwayPercent}% time looking away (${this.gazeAwayCount} aversion bursts). Natural for deep thinking.`
          : "Consistent direct camera focus across questions.",
      },
      {
        id: "tab_switch",
        label: suspiciousTabSwitch ? "Tab / window focus switches" : "No suspicious tab switch",
        status: suspiciousTabSwitch ? "warn" : "pass",
        symbol: suspiciousTabSwitch ? "⚠" : "✓",
        detail: suspiciousTabSwitch
          ? `${this.tabSwitchCount} window switches (${this.totalTabSwitchDurationSec}s total).`
          : "Continuous focus on simulator interface.",
      },
      {
        id: "clipboard_activity",
        label: this.clipboardEventsCount > 0 ? "Clipboard paste event logged" : "Natural typing cadence",
        status: this.clipboardEventsCount > 0 ? "warn" : "pass",
        symbol: this.clipboardEventsCount > 0 ? "ℹ️" : "✓",
        detail: this.clipboardEventsCount > 0
          ? `${this.clipboardEventsCount} paste operations (${this.pastedCharactersTotal} chars total).`
          : "Direct live speech / manual keyboard responses.",
      },
      {
        id: "vocal_continuity",
        label: this.longSilenceEventsCount > 0 ? "Extended silence observed" : "Continuous vocal cadence",
        status: this.longSilenceEventsCount > 0 ? "warn" : "pass",
        symbol: this.longSilenceEventsCount > 0 ? "ℹ️" : "✓",
        detail: this.longSilenceEventsCount > 0
          ? `${this.longSilenceEventsCount} pauses >8s recorded during answer delivery.`
          : "Fluid vocal cadence without abnormal delay.",
      },
    ];

    return {
      singlePersonDetected,
      noAdditionalFace,
      facesCount: this.currentFacesCount,
      frequentOffScreenGaze,
      gazeAwayCount: this.gazeAwayCount,
      gazeAwayTotalSec: this.gazeAwayTotalSec,
      gazeAwayPercent,
      suspiciousTabSwitch,
      tabSwitchCount: this.tabSwitchCount,
      totalTabSwitchDurationSec: this.totalTabSwitchDurationSec,
      clipboardEventsCount: this.clipboardEventsCount,
      pastedCharactersTotal: this.pastedCharactersTotal,
      longSilenceEventsCount: this.longSilenceEventsCount,
      phonePostureDetected: this.phonePostureDetected,
      integrityScore: score,
      integrityLevel,
      diagnosticChecks,
      recentEvents: this.events,
    };
  }

  public destroy() {
    this.listenersCleanups.forEach((cleanup) => cleanup());
    this.listenersCleanups = [];
    this.isListeningToBrowser = false;
  }

  private formatTime(timestamp: number): string {
    const elapsedSec = Math.max(0, Math.floor((timestamp - this.sessionStartTimestamp) / 1000));
    const mins = Math.floor(elapsedSec / 60);
    const secs = elapsedSec % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
}
