import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  createFreshDigitalProfile,
  loadStoredDigitalProfile,
  saveDigitalProfile,
  resetDigitalProfile,
  updateDigitalProfileFromSession,
  CandidateDigitalProfile,
} from "../src/lib/digital-profile";
import { InterviewTurn, CandidateProfile } from "../src/lib/interview";

// Mock minimal browser storage environment for Node.js
class MockStorage implements Storage {
  private store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }
  clear(): void {
    this.store.clear();
  }
  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }
  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
}

describe("Candidate Digital Profile & Session Reset Tests", () => {
  beforeEach(() => {
    // Setup clean browser storage mocks
    (global as unknown as { window: unknown }).window = {};
    (global as unknown as { sessionStorage: Storage }).sessionStorage = new MockStorage();
    (global as unknown as { localStorage: Storage }).localStorage = new MockStorage();
  });

  it("1. Initializes fresh profile with zeroed metrics, 0 completed sessions, and empty ledger", () => {
    const profile = createFreshDigitalProfile("Jane Doe");

    assert.equal(profile.candidateName, "Jane Doe");
    assert.equal(profile.sessionsCompleted, 0);
    assert.equal(profile.overallReadiness, 0);
    assert.equal(profile.lastInterviewDate, "None yet");
    assert.equal(profile.sessionHistory.length, 0);
    assert.equal(profile.pillars.technical.score, 0);
    assert.equal(profile.pillars.communication.score, 0);
    assert.equal(profile.pillars.behavioral.score, 0);

    // All skill items should be initialized to 0 assessments
    Object.values(profile.pillars.technical.skills).forEach((skill) => {
      assert.equal(skill.score, 0);
      assert.equal(skill.assessmentsCount, 0);
    });
  });

  it("2. Sets candidateName only to what is being entered", () => {
    const customName = "Alice Morgan";
    const profile = createFreshDigitalProfile(customName);
    assert.equal(profile.candidateName, "Alice Morgan");

    // Must not contain hardcoded default names like Niraj Sharma
    assert.notEqual(profile.candidateName, "Niraj Sharma");
    assert.doesNotMatch(profile.ragMemoryContext, /Niraj Sharma/);
  });

  it("3. Automatically clears legacy localStorage and isolates to sessionStorage", () => {
    // Simulate legacy cached profile lingering in localStorage
    localStorage.setItem(
      "mockmate_candidate_digital_profile_v1",
      JSON.stringify({ candidateName: "Stale User", overallReadiness: 79 })
    );

    const loaded = loadStoredDigitalProfile("New User");

    // Legacy localStorage should be completely purged
    assert.equal(localStorage.getItem("mockmate_candidate_digital_profile_v1"), null);
    assert.equal(loaded.candidateName, "New User");
    assert.equal(loaded.sessionsCompleted, 0);
  });

  it("4. Resets to clean baseline when resetDigitalProfile is called, preserving entered name", () => {
    // Save an in-progress profile
    const inProgress: CandidateDigitalProfile = {
      ...createFreshDigitalProfile("Bob Smith"),
      sessionsCompleted: 2,
      overallReadiness: 65,
    };
    saveDigitalProfile(inProgress);

    // Reset profile
    const reset = resetDigitalProfile("Bob Smith");

    assert.equal(reset.candidateName, "Bob Smith");
    assert.equal(reset.sessionsCompleted, 0);
    assert.equal(reset.overallReadiness, 0);
    assert.equal(reset.sessionHistory.length, 0);
  });

  it("5. Calibrates real session scores into digital profile with entered name upon completion", () => {
    const initial = createFreshDigitalProfile("Carlos Developer");
    const mockTurns = [
      {
        id: 1,
        question: "Explain how you optimize Python data pipelines.",
        answer: "I used Python generators, vectorization, and SQL query indexing to optimize throughput.",
        score: 85,
        feedback: ["Strong Python and SQL knowledge."],
        signals: { voice: 80, eyeContact: 85, clarity: 85, relevance: 85, structure: 85, confidence: 85 },
        breakdown: { technical_accuracy: 88, speaking_pace: 135 },
      },
    ] as unknown as InterviewTurn[];

    const mockCandidate: CandidateProfile = {
      name: "Carlos Developer",
      department: "Technical",
      targetRole: "ML Engineer",
      domain: "Role Specific",
      interviewType: "General",
      difficulty: "Standard",
      personaId: "technical",
      stressConfig: {
        intensity: "moderate",
        timeLimitSec: 45,
        enableInterruptions: true,
        enableTimePressureClock: true,
      },
      resumeText: "Python ML Engineer",
    };

    const { updatedProfile } = updateDigitalProfileFromSession(initial, mockTurns, mockCandidate);

    assert.equal(updatedProfile.candidateName, "Carlos Developer");
    assert.equal(updatedProfile.sessionsCompleted, 1);
    assert.ok(updatedProfile.overallReadiness > 0);
    assert.equal(updatedProfile.sessionHistory.length, 1);
    assert.equal(updatedProfile.sessionHistory[0].targetRole, "ML Engineer");
  });
});
