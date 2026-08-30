/**
 * Real-time Voice Energy & Acoustics Analyzer using AudioContext and RMS Decibels.
 * 
 * Pipeline:
 * Microphone Stream -> AudioContext -> AnalyserNode -> Time-domain samples -> RMS -> dB -> Normalized Energy (0-100)
 * 
 * Tracks turn-level statistics:
 * - Average Energy
 * - Min Energy
 * - Max Energy
 * - Energy Variance
 * - Dynamic segment progression (Beginning vs Middle vs Ending)
 * - Noticeable volume drops / vocal fatigue detection
 */

export interface LiveVoiceSignal {
  energy: number; // 0 - 100 current normalized energy
  db: number; // Decibels relative to full scale (dBFS)
  rms: number; // Root Mean Square amplitude (0 - 1)
  pitchHz?: number; // Estimated fundamental frequency (Hz)
  isSpeaking: boolean;
  pace: number; // 0 - 100 cadence score
  steadiness: number; // 0 - 100 stability score
}

export interface VoiceTurnStats {
  averageEnergy: number;
  minEnergy: number;
  maxEnergy: number;
  variance: number;
  volumeVariabilityPercent: number; // Std dev / variability of speech volume
  averagePitchHz: number; // e.g. 145 Hz
  pitchVariabilityHz: number; // e.g. 28 Hz (pitch inflection range)
  consistencyScore: number; // 0 - 100 composite delivery consistency
  samplesCount: number;
  segmentEnergies: {
    beginning: number;
    middle: number;
    ending: number;
  };
  droppedNoticeably: boolean;
  dropAmount: number;
  tooQuiet: boolean;
  tooLoud: boolean;
  monotone: boolean;
  paceScore: number;
  steadinessScore: number;
}

export type VoiceUpdateCallback = (signal: LiveVoiceSignal) => void;

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

function autoCorrelatePitch(buffer: Float32Array<ArrayBuffer>, sampleRate: number): number {
  let sumOfSquares = 0;
  for (let i = 0; i < buffer.length; i++) {
    sumOfSquares += buffer[i] * buffer[i];
  }
  const rootMeanSquare = Math.sqrt(sumOfSquares / buffer.length);
  if (rootMeanSquare < 0.015) return -1;

  let r1 = 0;
  let r2 = buffer.length - 1;
  const thres = 0.2;
  for (let i = 0; i < buffer.length / 2; i++) {
    if (Math.abs(buffer[i]) < thres) {
      r1 = i;
      break;
    }
  }
  for (let i = 1; i < buffer.length / 2; i++) {
    if (Math.abs(buffer[buffer.length - i]) < thres) {
      r2 = buffer.length - i;
      break;
    }
  }

  const trimmed = buffer.slice(r1, r2);
  const c = new Array(trimmed.length).fill(0);
  for (let i = 0; i < trimmed.length; i++) {
    for (let j = 0; j < trimmed.length - i; j++) {
      c[i] = c[i] + trimmed[j] * trimmed[j + i];
    }
  }

  let d = 0;
  while (c[d] > c[d + 1]) d++;
  let maxval = -1;
  let maxpos = -1;
  for (let i = d; i < trimmed.length; i++) {
    if (c[i] > maxval) {
      maxval = c[i];
      maxpos = i;
    }
  }
  const T0 = maxpos;
  if (maxval > 0.01 && T0 > 0) {
    const pitch = sampleRate / T0;
    if (pitch >= 65 && pitch <= 420) {
      return Math.round(pitch);
    }
  }
  return -1;
}

export class VoiceAnalyzer {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private animFrameId: number | null = null;
  private timeDomainBuffer: Float32Array<ArrayBuffer> | null = null;

  // Turn recording buffer
  private turnEnergySamples: number[] = [];
  private turnPitchSamples: number[] = [];
  private speechEnvelopeHistory: number[] = [];
  private speechBurstDurations: number[] = [];
  private currentBurstFrames = 0;
  private currentPauseFrames = 0;
  private isCurrentlySpeaking = false;

  // Noise floor calibration (dB)
  private noiseFloorDb = -52;
  private peakSpeechDb = -10;

  // Real-time smoothing
  private smoothedEnergy = 0;

  public start(stream: MediaStream, onUpdate: VoiceUpdateCallback) {
    this.stop();

    const AudioContextConstructor =
      window.AudioContext ??
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextConstructor) {
      console.warn("Web Audio API is not supported in this browser.");
      return;
    }

    const context = new AudioContextConstructor();
    context.resume().catch((err) => console.warn("AudioContext resume failed:", err));

    const analyser = context.createAnalyser();
    analyser.fftSize = 2048; // Time-domain resolution
    analyser.smoothingTimeConstant = 0.3;

    const source = context.createMediaStreamSource(stream);
    source.connect(analyser);

    this.audioContext = context;
    this.analyser = analyser;
    this.source = source;
    this.timeDomainBuffer = new Float32Array(new ArrayBuffer(analyser.fftSize * 4));

    this.turnEnergySamples = [];
    this.turnPitchSamples = [];
    this.speechEnvelopeHistory = [];
    this.speechBurstDurations = [];
    this.currentBurstFrames = 0;
    this.currentPauseFrames = 0;
    this.isCurrentlySpeaking = false;
    this.smoothedEnergy = 0;

    const tick = () => {
      if (!this.analyser || !this.timeDomainBuffer) return;

      this.analyser.getFloatTimeDomainData(this.timeDomainBuffer);

      // 1. Calculate RMS from Time-Domain Samples: sqrt( sum(s_i^2) / N )
      let sumSquares = 0;
      const bufferLength = this.timeDomainBuffer.length;
      for (let i = 0; i < bufferLength; i++) {
        const sample = this.timeDomainBuffer[i];
        sumSquares += sample * sample;
      }
      const rms = Math.sqrt(sumSquares / bufferLength);

      // 2. Convert RMS to Decibels: 20 * log10(RMS)
      const db = rms > 0.00001 ? 20 * Math.log10(rms) : -100;

      // 3. Map dB to Normalized 0 - 100 Voice Energy
      // Typical conversational range: noiseFloorDb (-52 dB) to peakSpeechDb (-10 dB)
      let instantEnergy = 0;
      if (db > this.noiseFloorDb) {
        instantEnergy = ((db - this.noiseFloorDb) / (this.peakSpeechDb - this.noiseFloorDb)) * 100;
      }
      instantEnergy = clamp(instantEnergy, 0, 100);

      // Smooth energy with attack/decay filter (faster attack, smooth decay)
      if (instantEnergy > this.smoothedEnergy) {
        this.smoothedEnergy = this.smoothedEnergy * 0.4 + instantEnergy * 0.6;
      } else {
        this.smoothedEnergy = this.smoothedEnergy * 0.85 + instantEnergy * 0.15;
      }

      const displayEnergy = Math.round(this.smoothedEnergy);
      const isSpeaking = displayEnergy >= 18;

      let detectedPitch: number | undefined = undefined;

      // Track speech cadence & burst patterns for realistic pace & steadiness
      if (isSpeaking) {
        this.currentBurstFrames++;
        if (this.currentPauseFrames > 0) {
          this.currentPauseFrames = 0;
        }
        this.isCurrentlySpeaking = true;
        this.turnEnergySamples.push(displayEnergy);
        this.speechEnvelopeHistory.push(displayEnergy);
        if (this.speechEnvelopeHistory.length > 60) {
          this.speechEnvelopeHistory.shift();
        }

        const pitch = autoCorrelatePitch(this.timeDomainBuffer, this.audioContext?.sampleRate || 44100);
        if (pitch > 0) {
          detectedPitch = pitch;
          this.turnPitchSamples.push(pitch);
        }
      } else {
        this.currentPauseFrames++;
        if (this.currentBurstFrames > 0) {
          this.speechBurstDurations.push(this.currentBurstFrames);
          this.currentBurstFrames = 0;
        }
        this.isCurrentlySpeaking = false;
      }

      // Calculate real-time steadiness: low variance in active speech envelope
      let steadiness = 72;
      if (this.speechEnvelopeHistory.length >= 10) {
        const avg =
          this.speechEnvelopeHistory.reduce((a, b) => a + b, 0) / this.speechEnvelopeHistory.length;
        const variance =
          this.speechEnvelopeHistory.reduce((sum, val) => sum + Math.abs(val - avg), 0) /
          this.speechEnvelopeHistory.length;
        steadiness = clamp(Math.round(95 - variance * 1.6), 35, 98);
      }

      // Calculate real-time cadence pace: based on burst/pause ratios (0 if no speech yet)
      let pace = 0;
      if (this.speechBurstDurations.length >= 3) {
        const recentBursts = this.speechBurstDurations.slice(-8);
        const avgBurst = recentBursts.reduce((a, b) => a + b, 0) / recentBursts.length;
        // Ideal speech burst is ~15-45 frames (0.25s - 0.75s per syllable group/phrase)
        if (avgBurst >= 12 && avgBurst <= 50) {
          pace = clamp(Math.round(60 + (avgBurst / 50) * 25), 45, 92);
        } else if (avgBurst < 12) {
          pace = 48; // Too fast / staccato
        } else {
          pace = 54; // Too drawn out
        }
      }

      onUpdate({
        energy: displayEnergy,
        db: Number(db.toFixed(1)),
        rms: Number(rms.toFixed(4)),
        pitchHz: detectedPitch,
        isSpeaking,
        pace,
        steadiness,
      });

      this.animFrameId = window.requestAnimationFrame(tick);
    };

    this.animFrameId = window.requestAnimationFrame(tick);
  }

  public resetTurnStats() {
    this.turnEnergySamples = [];
    this.turnPitchSamples = [];
    this.speechBurstDurations = [];
    this.currentBurstFrames = 0;
    this.currentPauseFrames = 0;
  }

  public getTurnStats(): VoiceTurnStats {
    const samples = this.turnEnergySamples;

    if (samples.length === 0) {
      return {
        averageEnergy: 0,
        minEnergy: 0,
        maxEnergy: 0,
        variance: 0,
        volumeVariabilityPercent: 0,
        averagePitchHz: 140,
        pitchVariabilityHz: 20,
        consistencyScore: 75,
        samplesCount: 0,
        segmentEnergies: { beginning: 0, middle: 0, ending: 0 },
        droppedNoticeably: false,
        dropAmount: 0,
        tooQuiet: true,
        tooLoud: false,
        monotone: false,
        paceScore: 60,
        steadinessScore: 60,
      };
    }

    const sum = samples.reduce((acc, val) => acc + val, 0);
    const averageEnergy = Math.round(sum / samples.length);
    const minEnergy = Math.min(...samples);
    const maxEnergy = Math.max(...samples);

    // Calculate Variance
    const squaredDiffs = samples.reduce((acc, val) => acc + Math.pow(val - averageEnergy, 2), 0);
    const variance = Math.round(Math.sqrt(squaredDiffs / samples.length));

    // Pitch metrics
    let avgPitch = 145;
    let pitchVar = 24;
    if (this.turnPitchSamples.length >= 3) {
      avgPitch = Math.round(
        this.turnPitchSamples.reduce((a, b) => a + b, 0) / this.turnPitchSamples.length
      );
      const pitchDiffs = this.turnPitchSamples.reduce(
        (acc, val) => acc + Math.pow(val - avgPitch, 2),
        0
      );
      pitchVar = Math.round(Math.sqrt(pitchDiffs / this.turnPitchSamples.length));
    }

    // Calculate segment progression (3 equal segments)
    const third = Math.max(1, Math.floor(samples.length / 3));
    const seg1 = samples.slice(0, third);
    const seg2 = samples.slice(third, third * 2);
    const seg3 = samples.slice(third * 2);

    const avgSeg1 = seg1.length ? Math.round(seg1.reduce((a, b) => a + b, 0) / seg1.length) : averageEnergy;
    const avgSeg2 = seg2.length ? Math.round(seg2.reduce((a, b) => a + b, 0) / seg2.length) : averageEnergy;
    const avgSeg3 = seg3.length ? Math.round(seg3.reduce((a, b) => a + b, 0) / seg3.length) : averageEnergy;

    // Detect noticeable drop (e.g., started high/confident, but dropped by >= 16 points in middle or end)
    const dropAmount = Math.max(0, avgSeg1 - avgSeg3, avgSeg1 - avgSeg2);
    const droppedNoticeably = avgSeg1 >= 48 && dropAmount >= 16;

    const tooQuiet = averageEnergy < 32;
    const tooLoud = averageEnergy > 84 || maxEnergy > 94;
    const monotone = variance < 6 && samples.length >= 30;

    let consistencyScore = clamp(94 - Math.abs(variance - 12) * 1.5 - (droppedNoticeably ? 16 : 0));
    if (tooQuiet || tooLoud) consistencyScore -= 12;
    consistencyScore = clamp(consistencyScore, 40, 98);

    return {
      averageEnergy,
      minEnergy,
      maxEnergy,
      variance,
      volumeVariabilityPercent: variance,
      averagePitchHz: avgPitch,
      pitchVariabilityHz: pitchVar,
      consistencyScore,
      samplesCount: samples.length,
      segmentEnergies: {
        beginning: avgSeg1,
        middle: avgSeg2,
        ending: avgSeg3,
      },
      droppedNoticeably,
      dropAmount,
      tooQuiet,
      tooLoud,
      monotone,
      paceScore: clamp(Math.round(72 + (averageEnergy > 45 ? 12 : -8))),
      steadinessScore: clamp(Math.round(92 - variance * 1.4)),
    };
  }

  public stop() {
    if (this.animFrameId !== null) {
      window.cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    if (this.source) {
      try {
        this.source.disconnect();
      } catch {
        // Ignore disconnect errors
      }
      this.source = null;
    }

    if (this.audioContext && this.audioContext.state !== "closed") {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }

    this.analyser = null;
    this.timeDomainBuffer = null;
    this.smoothedEnergy = 0;
  }
}
