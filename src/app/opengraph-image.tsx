import { ImageResponse } from "next/og";

export const runtime = "nodejs";

export const alt = "MockMate AI - Real-time Interview Simulator & Speech Analytics";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#080808",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background Radial Glow */}
        <div
          style={{
            position: "absolute",
            top: "-150px",
            right: "-100px",
            width: "600px",
            height: "600px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(255, 77, 61, 0.25) 0%, transparent 70%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-150px",
            left: "-100px",
            width: "500px",
            height: "500px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(217, 54, 43, 0.18) 0%, transparent 70%)",
          }}
        />

        {/* Top Header / Brand */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "16px",
                background: "linear-gradient(135deg, #D9362B 0%, #FF4D3D 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 30px rgba(255, 77, 61, 0.4)",
              }}
            >
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  border: "3px solid #FFFFFF",
                  borderRadius: "8px",
                }}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span
                style={{
                  fontSize: "32px",
                  fontWeight: 800,
                  color: "#F5F5F5",
                  letterSpacing: "-0.5px",
                }}
              >
                MockMate<span style={{ color: "#FF4D3D" }}>.AI</span>
              </span>
              <span style={{ fontSize: "14px", color: "#A0A0A0", letterSpacing: "1px" }}>
                AUTONOMOUS EVALUATION ENGINE
              </span>
            </div>
          </div>

          <div
            style={{
              padding: "8px 18px",
              borderRadius: "999px",
              border: "1px solid rgba(255, 77, 61, 0.4)",
              background: "rgba(255, 77, 61, 0.1)",
              color: "#FF4D3D",
              fontSize: "15px",
              fontWeight: 700,
              letterSpacing: "0.5px",
            }}
          >
            v2.0 • Edge AI Suite
          </div>
        </div>

        {/* Center Main Pitch */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px", maxWidth: "950px" }}>
          <h1
            style={{
              fontSize: "58px",
              fontWeight: 900,
              color: "#FFFFFF",
              lineHeight: 1.1,
              letterSpacing: "-1.5px",
              margin: 0,
            }}
          >
            Master Technical & Behavioral Interviews with Real-time AI
          </h1>
          <p
            style={{
              fontSize: "24px",
              color: "#A0A0A0",
              lineHeight: 1.4,
              margin: 0,
            }}
          >
            Real-time speech cadence metrics, live coding sandbox, distributed system design
            canvas, and zero-latency local privacy.
          </p>
        </div>

        {/* Bottom Feature Badges */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "12px 20px",
              borderRadius: "12px",
              border: "1px solid #2A2A2A",
              background: "rgba(255, 255, 255, 0.04)",
              color: "#E5E5E5",
              fontSize: "16px",
              fontWeight: 600,
            }}
          >
            🎙️ Speech & WPM Metrics
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "12px 20px",
              borderRadius: "12px",
              border: "1px solid #2A2A2A",
              background: "rgba(255, 255, 255, 0.04)",
              color: "#E5E5E5",
              fontSize: "16px",
              fontWeight: 600,
            }}
          >
            📐 System Design Canvas
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "12px 20px",
              borderRadius: "12px",
              border: "1px solid #2A2A2A",
              background: "rgba(255, 255, 255, 0.04)",
              color: "#E5E5E5",
              fontSize: "16px",
              fontWeight: 600,
            }}
          >
            💻 Interactive Code Execution
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "12px 20px",
              borderRadius: "12px",
              border: "1px solid #2A2A2A",
              background: "rgba(255, 255, 255, 0.04)",
              color: "#E5E5E5",
              fontSize: "16px",
              fontWeight: 600,
            }}
          >
            🔒 Zero Data Upload
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
