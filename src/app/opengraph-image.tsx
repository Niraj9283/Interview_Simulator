import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt = "MockMate AI. Rehearse your next interview.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: "100%", height: "100%", background: "#f7f8f3", color: "#192b22", padding: 64 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 36 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, width: 54, height: 54, background: "#174a35", borderRadius: 12 }}>
          {[8, 20, 32, 17, 26, 12].map((height) => <div key={height} style={{ width: 3, height, background: "#d3ec98", borderRadius: 2 }} />)}
        </div>
        MockMate.AI
      </div>
      <div style={{ display: "flex", flexDirection: "column", fontSize: 94, letterSpacing: -6, lineHeight: 1.05 }}>
        <span>Rehearse your</span><span style={{ color: "#174a35" }}>next interview.</span>
      </div>
      <div style={{ display: "flex", borderTop: "1px solid #aebbad", paddingTop: 24, fontSize: 27 }}>Behavioral interviews · Live coding · System design</div>
    </div>,
    size
  );
}
