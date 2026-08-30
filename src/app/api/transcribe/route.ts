import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as Blob | null;

    if (!file) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY || process.env.WHISPER_API_KEY;

    if (apiKey) {
      const openAiFormData = new FormData();
      openAiFormData.append("file", file, "audio.webm");
      openAiFormData.append("model", "whisper-1");
      openAiFormData.append("response_format", "verbose_json");
      openAiFormData.append("timestamp_granularities[]", "word");

      const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: openAiFormData,
      });

      if (response.ok) {
        const data = await response.json();
        return NextResponse.json({
          text: data.text,
          words: data.words || [],
          duration: data.duration,
        });
      }
    }

    return NextResponse.json({
      text: "",
      words: [],
      message: "Browser speech recognition or client fallback active.",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal transcription error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
