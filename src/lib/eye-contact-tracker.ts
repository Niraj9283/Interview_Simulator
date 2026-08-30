/**
 * Real-time Eye Contact & Gaze Estimation using MediaPipe Face Landmarker
 * 
 * Flow:
 * Camera frame -> Face detected? -> No -> 0
 *                                -> Yes -> Eye landmarks + Iris position + Head pose -> Gaze vector -> Camera alignment score
 * Score is smoothed via a 30-frame rolling window.
 */

export type FacialExpressionState = "neutral" | "positive" | "tense";

export interface BodyLanguageTurnStats {
  headMovementScore: number; // 0 - 100 (80 = steady, 30 = excessive movement)
  facingCameraPercent: number; // e.g. 87%
  lookingAwayCount: number; // e.g. 12 times
  expressionDistribution: {
    neutralPercent: number; // e.g. 62%
    positivePercent: number; // e.g. 24%
    tensePercent: number; // e.g. 14%
  };
  communicationFeedback: string;
}

export interface EyeContactResult {
  score: number; // 0 - 100 smoothed score
  instantScore: number; // 0 - 100 current frame score
  isLookingAtCamera: boolean;
  isFacingCamera: boolean;
  faceDetected: boolean;
  facesCount: number;
  multipleFacesDetected: boolean;
  eyesClosed: boolean;
  headPose: {
    yaw: number; // Left (-) / Right (+)
    pitch: number; // Up (-) / Down (+)
    roll: number;
  };
  headMovementScore: number;
  facingCameraPercent: number;
  lookingAwayCount: number;
  currentExpression: FacialExpressionState;
  expressionDistribution: {
    neutralPercent: number;
    positivePercent: number;
    tensePercent: number;
  };
  gazeDeviation: number;
  status: "looking" | "distracted" | "no_face" | "eyes_closed" | "initializing";
}

export type EyeContactCallback = (result: EyeContactResult) => void;

// Filter out Emscripten WASM INFO/debug logs that get piped into console.error
if (typeof window !== "undefined" && !(window as unknown as { __mediapipe_logger_filtered?: boolean }).__mediapipe_logger_filtered) {
  (window as unknown as { __mediapipe_logger_filtered?: boolean }).__mediapipe_logger_filtered = true;
  const originalConsoleError = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    const firstArg = typeof args[0] === "string" ? args[0] : "";
    if (
      firstArg.includes("INFO: Created TensorFlow Lite XNNPACK delegate") ||
      firstArg.includes("face_landmarker_graph.cc") ||
      firstArg.includes("gl_context.cc") ||
      firstArg.includes("Sets FaceBlendshapesGraph acceleration")
    ) {
      console.info(...args);
      return;
    }
    originalConsoleError(...args);
  };
}

// MediaPipe landmark indices for eye and face geometry
const LANDMARKS = {
  // Left eye
  leftEyeOuter: 33,
  leftEyeInner: 133,
  leftEyeTop: 159,
  leftEyeBottom: 145,
  leftIrisCenter: 468,

  // Right eye
  rightEyeInner: 362,
  rightEyeOuter: 263,
  rightEyeTop: 386,
  rightEyeBottom: 374,
  rightIrisCenter: 473,

  // Head pose anchor points
  noseTip: 1,
  chin: 152,
  forehead: 10,
  leftCheek: 234,
  rightCheek: 454,
  leftMouthCorner: 61,
  rightMouthCorner: 291,
  upperLipTop: 0,
  lowerLipBottom: 17,
  leftEyebrowInner: 107,
  rightEyebrowInner: 336,
};

interface Landmark {
  x: number;
  y: number;
  z: number;
}

export class EyeContactTracker {
  private faceLandmarker: unknown = null;
  private isInitialized = false;
  private isInitializing = false;
  private history: number[] = [];
  private historyMaxSize = 30; // ~1 sec smoothing window
  private blinkCounter = 0;
  private consecutiveBlinkFrames = 0;
  private lastVideoTime = -1;
  private onResultCallback: EyeContactCallback | null = null;
  private animFrameId: number | null = null;
  private lastProcessedTimestamp = 0;

  // Longitudinal turn statistics
  private facingCameraFrames = 0;
  private totalDetectedFrames = 0;
  private headMotionHistory: number[] = [];
  private headMotionDeltas: number[] = [];
  private lastHeadPose: { yaw: number; pitch: number; roll: number } | null = null;
  private lookingAwayEventsCount = 0;
  private lookingAwayFrames = 0;
  private isLookingAwayActive = false;
  private wasLookingAway = false;
  private currentExpression: FacialExpressionState = "neutral";
  private expressionCounts = { neutral: 0, positive: 0, tense: 0 };

  constructor(windowSize = 30) {
    this.historyMaxSize = windowSize;
  }

  public async initialize(): Promise<boolean> {
    if (this.isInitialized) return true;
    if (this.isInitializing) return false;
    if (typeof window === "undefined") return false;

    this.isInitializing = true;

    try {
      const vision = await import("@mediapipe/tasks-vision");
      const { FilesetResolver, FaceLandmarker } = vision;

      // Try local assets first, fall back to CDN
      let filesetResolver;
      try {
        filesetResolver = await FilesetResolver.forVisionTasks("/mediapipe/wasm");
      } catch {
        filesetResolver = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );
      }

      let modelAssetPath = "/mediapipe/face_landmarker.task";
      // Verify local file or fallback
      try {
        const check = await fetch(modelAssetPath, { method: "HEAD" });
        if (!check.ok) {
          modelAssetPath =
            "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
        }
      } catch {
        modelAssetPath =
          "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
      }

      try {
        this.faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath,
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numFaces: 2,
          outputFaceBlendshapes: false,
          outputFacialTransformationMatrixes: false,
        });
      } catch (gpuError) {
        console.warn("GPU delegate failed for FaceLandmarker, falling back to CPU:", gpuError);
        this.faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath,
            delegate: "CPU",
          },
          runningMode: "VIDEO",
          numFaces: 2,
          outputFaceBlendshapes: false,
          outputFacialTransformationMatrixes: false,
        });
      }

      this.isInitialized = true;
      this.isInitializing = false;
      return true;
    } catch (err) {
      console.error("Failed to initialize MediaPipe FaceLandmarker:", err);
      this.isInitializing = false;
      return false;
    }
  }

  public start(videoElement: HTMLVideoElement, onResult: EyeContactCallback) {
    this.onResultCallback = onResult;
    this.history = [];
    this.blinkCounter = 0;
    this.lastVideoTime = -1;
    this.lastProcessedTimestamp = 0;

    const processLoop = () => {
      if (!videoElement || videoElement.paused || videoElement.ended) {
        this.animFrameId = window.requestAnimationFrame(processLoop);
        return;
      }

      if (
        this.isInitialized &&
        this.faceLandmarker &&
        videoElement.readyState >= 2 &&
        videoElement.videoWidth > 0 &&
        videoElement.videoHeight > 0
      ) {
        if (videoElement.currentTime !== this.lastVideoTime) {
          this.lastVideoTime = videoElement.currentTime;
          try {
            const result = this.processFrame(videoElement);
            if (this.onResultCallback && result) {
              this.onResultCallback(result);
            }
          } catch {
            // Ignore transient frame detection errors
          }
        }
      }

      this.animFrameId = window.requestAnimationFrame(processLoop);
    };

    this.animFrameId = window.requestAnimationFrame(processLoop);
  }

  public stop() {
    if (this.animFrameId !== null) {
      window.cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    this.history = [];
    this.onResultCallback = null;
  }

  public reset() {
    this.history = [];
    this.blinkCounter = 0;
    this.lastProcessedTimestamp = 0;
  }

  private getEmptyResult(
    status: "no_face" | "eyes_closed" | "initializing",
    eyesClosed = false,
    faceDetected = false,
    instantScore = 0,
    facesCount = 0
  ): EyeContactResult {
    const totalExpr = Math.max(
      1,
      this.expressionCounts.neutral + this.expressionCounts.positive + this.expressionCounts.tense
    );
    return {
      score: this.getSmoothedScore(),
      instantScore,
      isLookingAtCamera: instantScore >= 60,
      isFacingCamera: false,
      faceDetected,
      facesCount,
      multipleFacesDetected: facesCount > 1,
      eyesClosed,
      headPose: { yaw: 0, pitch: 0, roll: 0 },
      headMovementScore: 80,
      facingCameraPercent:
        this.totalDetectedFrames > 0
          ? Math.round((this.facingCameraFrames / this.totalDetectedFrames) * 100)
          : 0,
      lookingAwayCount: this.lookingAwayEventsCount,
      currentExpression: this.currentExpression,
      expressionDistribution: {
        neutralPercent: Math.round((this.expressionCounts.neutral / totalExpr) * 100),
        positivePercent: Math.round((this.expressionCounts.positive / totalExpr) * 100),
        tensePercent: Math.round((this.expressionCounts.tense / totalExpr) * 100),
      },
      gazeDeviation: 1.0,
      status,
    };
  }

  private processFrame(videoElement: HTMLVideoElement): EyeContactResult {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const landmarker = this.faceLandmarker as any;
    if (!landmarker) {
      return this.getEmptyResult("no_face");
    }

    let now = performance.now();
    if (now <= this.lastProcessedTimestamp) {
      now = this.lastProcessedTimestamp + 1;
    }
    this.lastProcessedTimestamp = now;

    let detections: {
      faceLandmarks?: Array<Array<{ x: number; y: number; z: number }>>;
    } | null = null;

    try {
      detections = landmarker.detectForVideo(videoElement, now);
    } catch {
      return this.getEmptyResult("no_face");
    }

    if (!detections || !detections.faceLandmarks || detections.faceLandmarks.length === 0) {
      this.pushHistory(0);
      return this.getEmptyResult("no_face");
    }

    const landmarks: Landmark[] = detections.faceLandmarks[0];

    // 1. Eye Landmarks & Iris Position
    const leftOuter = landmarks[LANDMARKS.leftEyeOuter];
    const leftInner = landmarks[LANDMARKS.leftEyeInner];
    const leftTop = landmarks[LANDMARKS.leftEyeTop];
    const leftBottom = landmarks[LANDMARKS.leftEyeBottom];
    const leftIris = landmarks[LANDMARKS.leftIrisCenter] ?? {
      x: (leftInner.x + leftOuter.x) / 2,
      y: (leftTop.y + leftBottom.y) / 2,
      z: 0,
    };

    const rightOuter = landmarks[LANDMARKS.rightEyeOuter];
    const rightInner = landmarks[LANDMARKS.rightEyeInner];
    const rightTop = landmarks[LANDMARKS.rightEyeTop];
    const rightBottom = landmarks[LANDMARKS.rightEyeBottom];
    const rightIris = landmarks[LANDMARKS.rightIrisCenter] ?? {
      x: (rightInner.x + rightOuter.x) / 2,
      y: (rightTop.y + rightBottom.y) / 2,
      z: 0,
    };

    // 2. Eye Aspect Ratio (EAR) for blink detection
    const leftEyeHeight = Math.hypot(leftTop.x - leftBottom.x, leftTop.y - leftBottom.y);
    const leftEyeWidth = Math.hypot(leftInner.x - leftOuter.x, leftInner.y - leftOuter.y);
    const leftEAR = leftEyeWidth > 0 ? leftEyeHeight / leftEyeWidth : 0;

    const rightEyeHeight = Math.hypot(rightTop.x - rightBottom.x, rightTop.y - rightBottom.y);
    const rightEyeWidth = Math.hypot(rightInner.x - rightOuter.x, rightInner.y - rightOuter.y);
    const rightEAR = rightEyeWidth > 0 ? rightEyeHeight / rightEyeWidth : 0;

    const avgEAR = (leftEAR + rightEAR) / 2;
    const isBlinking = avgEAR < 0.16;

    if (isBlinking) {
      this.blinkCounter++;
      // If it's a quick blink (< 8 frames / ~250ms), hold previous score so score doesn't flicker on normal blinks
      if (this.blinkCounter <= 8 && this.history.length > 0) {
        const lastScore = this.history[this.history.length - 1];
        this.pushHistory(lastScore);
        return this.getEmptyResult("eyes_closed", true, true, lastScore);
      }
      // Prolonged eyes closed
      this.pushHistory(0);
      return this.getEmptyResult("eyes_closed", true, true, 0);
    } else {
      this.blinkCounter = 0;
    }

    // 3. Iris Relative Position inside eye bounds
    // Horizontal ratio (0 = outer, 1 = inner or vice-versa)
    const leftIrisRatioX = leftEyeWidth > 0 ? (leftIris.x - leftOuter.x) / (leftInner.x - leftOuter.x) : 0.5;
    const rightIrisRatioX = rightEyeWidth > 0 ? (rightIris.x - rightInner.x) / (rightOuter.x - rightInner.x) : 0.5;
    
    // Vertical ratio
    const leftIrisRatioY = leftEyeHeight > 0 ? (leftIris.y - leftTop.y) / (leftBottom.y - leftTop.y) : 0.5;
    const rightIrisRatioY = rightEyeHeight > 0 ? (rightIris.y - rightTop.y) / (rightBottom.y - rightTop.y) : 0.5;

    // Normal centered iris ratios are ~0.5
    const irisOffsetX = ((leftIrisRatioX + rightIrisRatioX) / 2) - 0.5;
    const irisOffsetY = ((leftIrisRatioY + rightIrisRatioY) / 2) - 0.5;

    // 4. Head Pose Estimation
    const nose = landmarks[LANDMARKS.noseTip];
    const leftCheek = landmarks[LANDMARKS.leftCheek];
    const rightCheek = landmarks[LANDMARKS.rightCheek];
    const forehead = landmarks[LANDMARKS.forehead];
    const chin = landmarks[LANDMARKS.chin];

    const faceWidth = Math.max(0.001, rightCheek.x - leftCheek.x);
    const faceHeight = Math.max(0.001, chin.y - forehead.y);

    // Yaw: Nose horizontal symmetry relative to cheeks (0 = facing forward)
    const noseXRatio = (nose.x - leftCheek.x) / faceWidth;
    const yawOffset = (noseXRatio - 0.5) * 2; // -1 to 1

    // Pitch: Nose vertical position relative to face height (centered ~0.56)
    const noseYRatio = (nose.y - forehead.y) / faceHeight;
    const pitchOffset = (noseYRatio - 0.56) * 2.2;

    // Roll: Eye tilt
    const rollAngle = Math.atan2(rightOuter.y - leftOuter.y, rightOuter.x - leftOuter.x);

    const yawDeg = Math.round(yawOffset * 45);
    const pitchDeg = Math.round(pitchOffset * 45);
    const rollDeg = Math.round((rollAngle * 180) / Math.PI);

    // 5. Head Movement Stability Score (0-100)
    let motionScore = 88;
    if (this.lastHeadPose) {
      const delta = Math.hypot(
        yawDeg - this.lastHeadPose.yaw,
        pitchDeg - this.lastHeadPose.pitch,
        rollDeg - this.lastHeadPose.roll
      );
      motionScore = Math.max(20, Math.min(100, Math.round(100 - delta * 3.5)));
    }
    this.lastHeadPose = { yaw: yawDeg, pitch: pitchDeg, roll: rollDeg };
    this.headMotionHistory.push(motionScore);
    if (this.headMotionHistory.length > 30) this.headMotionHistory.shift();
    const headMovementScore = Math.round(
      this.headMotionHistory.reduce((a, b) => a + b, 0) / this.headMotionHistory.length
    );

    // 6. Face Orientation Alignment (% Facing Camera)
    const isFacing = Math.abs(yawDeg) <= 15 && Math.abs(pitchDeg) <= 15;
    this.totalDetectedFrames++;
    if (isFacing) this.facingCameraFrames++;
    const facingCameraPercent = Math.round((this.facingCameraFrames / this.totalDetectedFrames) * 100);

    // 7. Calculate Gaze Direction & Camera Alignment
    const totalGazeX = yawOffset * 0.75 + irisOffsetX * 1.5;
    const totalGazeY = pitchOffset * 0.65 + irisOffsetY * 1.2;
    const deviation = Math.hypot(totalGazeX, totalGazeY);

    let instantScore = 0;
    if (deviation <= 0.10) {
      instantScore = 100 - (deviation / 0.10) * 10;
    } else if (deviation <= 0.22) {
      instantScore = 90 - ((deviation - 0.10) / 0.12) * 25;
    } else if (deviation <= 0.38) {
      instantScore = 65 - ((deviation - 0.22) / 0.16) * 45;
    } else {
      instantScore = Math.max(0, 20 - ((deviation - 0.38) / 0.2) * 20);
    }

    instantScore = Math.round(Math.max(0, Math.min(100, instantScore)));
    this.pushHistory(instantScore);
    const smoothedScore = this.getSmoothedScore();
    const isLooking = smoothedScore >= 60;

    // 8. Excessive Looking Away Events Counter
    const isLookingAway = !isLooking && !isFacing;
    if (isLookingAway) {
      this.lookingAwayFrames++;
      if (this.lookingAwayFrames >= 12 && !this.isLookingAwayActive) {
        this.lookingAwayEventsCount++;
        this.isLookingAwayActive = true;
      }
    } else {
      this.lookingAwayFrames = 0;
      this.isLookingAwayActive = false;
    }

    // 9. Facial Expression State Estimation (Communication feedback)
    const leftMouth = landmarks[LANDMARKS.leftMouthCorner];
    const rightMouth = landmarks[LANDMARKS.rightMouthCorner];
    const lipTop = landmarks[LANDMARKS.upperLipTop];
    const lipBottom = landmarks[LANDMARKS.lowerLipBottom];
    const leftBrow = landmarks[LANDMARKS.leftEyebrowInner];
    const rightBrow = landmarks[LANDMARKS.rightEyebrowInner];

    const mouthCenterY = (lipTop.y + lipBottom.y) / 2;
    const mouthCornersY = (leftMouth.y + rightMouth.y) / 2;
    const mouthElevation = (mouthCenterY - mouthCornersY) / faceHeight;

    const browDist = (rightBrow.x - leftBrow.x) / faceWidth;

    if (mouthElevation > 0.04) {
      this.currentExpression = "positive";
    } else if (browDist < 0.19 || pitchDeg < -12) {
      this.currentExpression = "tense";
    } else {
      this.currentExpression = "neutral";
    }
    this.expressionCounts[this.currentExpression]++;

    const totalExpr = Math.max(
      1,
      this.expressionCounts.neutral + this.expressionCounts.positive + this.expressionCounts.tense
    );
    const expressionDistribution = {
      neutralPercent: Math.round((this.expressionCounts.neutral / totalExpr) * 100),
      positivePercent: Math.round((this.expressionCounts.positive / totalExpr) * 100),
      tensePercent: Math.round((this.expressionCounts.tense / totalExpr) * 100),
    };

    const facesCount = detections.faceLandmarks.length;

    return {
      score: smoothedScore,
      instantScore,
      isLookingAtCamera: isLooking,
      isFacingCamera: isFacing,
      faceDetected: true,
      facesCount,
      multipleFacesDetected: facesCount > 1,
      eyesClosed: false,
      headPose: {
        yaw: yawDeg,
        pitch: pitchDeg,
        roll: rollDeg,
      },
      headMovementScore,
      facingCameraPercent,
      lookingAwayCount: this.lookingAwayEventsCount,
      currentExpression: this.currentExpression,
      expressionDistribution,
      gazeDeviation: Number(deviation.toFixed(3)),
      status: isLooking ? "looking" : "distracted",
    };
  }

  public getTurnStats(): BodyLanguageTurnStats {
    const totalFrames = Math.max(1, this.totalDetectedFrames);
    const facingPercent = Math.round((this.facingCameraFrames / totalFrames) * 100);
    const headScore =
      this.headMotionHistory.length > 0
        ? Math.round(this.headMotionHistory.reduce((a, b) => a + b, 0) / this.headMotionHistory.length)
        : 82;

    const totalExpr = Math.max(
      1,
      this.expressionCounts.neutral + this.expressionCounts.positive + this.expressionCounts.tense
    );
    const expressionDistribution = {
      neutralPercent: Math.round((this.expressionCounts.neutral / totalExpr) * 100),
      positivePercent: Math.round((this.expressionCounts.positive / totalExpr) * 100),
      tensePercent: Math.round((this.expressionCounts.tense / totalExpr) * 100),
    };

    let feedback = "";
    if (this.lookingAwayEventsCount >= 6) {
      feedback = `Your facial orientation frequently shifted away from the camera (${this.lookingAwayEventsCount} times) while answering technical questions.`;
    } else if (facingPercent >= 80) {
      feedback = `Strong camera presence with ${facingPercent}% direct facial orientation and steady head composure.`;
    } else {
      feedback = `Good composure with ${facingPercent}% camera alignment (${this.lookingAwayEventsCount} glance shifts).`;
    }

    return {
      headMovementScore: headScore,
      facingCameraPercent: facingPercent,
      lookingAwayCount: this.lookingAwayEventsCount,
      expressionDistribution,
      communicationFeedback: feedback,
    };
  }

  public resetTurnStats(): void {
    this.facingCameraFrames = 0;
    this.totalDetectedFrames = 0;
    this.lookingAwayEventsCount = 0;
    this.lookingAwayFrames = 0;
    this.isLookingAwayActive = false;
    this.headMotionHistory = [];
    this.expressionCounts = { neutral: 0, positive: 0, tense: 0 };
  }

  private pushHistory(score: number) {
    this.history.push(score);
    if (this.history.length > this.historyMaxSize) {
      this.history.shift();
    }
  }

  private getSmoothedScore(): number {
    if (this.history.length === 0) return 0;
    const sum = this.history.reduce((a, b) => a + b, 0);
    return Math.round(sum / this.history.length);
  }
}
