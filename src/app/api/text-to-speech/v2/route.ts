import { NextRequest, NextResponse } from "next/server";
import { supabase, incrementStat, logApiRequest } from "@/lib/supabase";
import crypto from "crypto";
import { prettyJson } from "@/lib/utils";

const FISH_VOICE_API_KEY = "bd529b30ed754fb8b7ef689d124e297c";
const VOICE_MAP: Record<string, string> = {
  "prabowo-subianto": "18abd722bea945d5827036722b03a46d",
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const text = searchParams.get("text");
  const voice = searchParams.get("voice") || "prabowo-subianto";
  
  const userIP = req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
  const realUA = req.headers.get("user-agent") || "browser";

  if (!text) {
    return prettyJson(
      { status: false, creator: "VSID TTS Custom Voice", error: "Missing text parameter" },
      400
    );
  }

  const modelId = VOICE_MAP[voice.toLowerCase()] || voice;

  await incrementStat("total_hits");

  try {
    const response = await fetch("https://api.fish.audio/v1/tts", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${FISH_VOICE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        reference_id: modelId,
        format: "mp3",
        normalize: true,
        latency: "normal"
      }),
    });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Unknown error" }));
        console.error("Fish Voice API Error:", errorData);
        await incrementStat("total_errors");
        
        let errorMessage = "Failed to generate speech from Fish Voice";
        if (response.status === 402) {
          errorMessage = "Insufficient balance or invalid API key in Fish Voice account";
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }

        return prettyJson(
          { status: false, creator: "VSID TTS Custom Voice", error: errorMessage },
          response.status
        );
      }

    const audioBuffer = Buffer.from(await response.arrayBuffer());
    const resultId = crypto.randomUUID();
    const fileName = `custom-${resultId}.mp3`;

    // Store in Supabase
    await supabase.storage
      .from("tts-results")
      .upload(fileName, audioBuffer, {
        contentType: "audio/mpeg",
        cacheControl: "3600",
        upsert: false,
      });

    await incrementStat("total_success");
    await logApiRequest({
      ip_address: userIP,
      method: "GET",
      router: "/api/text-to-speech/v2",
      status: 200,
      user_agent: realUA
    });

    return new NextResponse(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=86400",
        "X-Result-ID": resultId,
        "X-Voice": voice
      },
    });
  } catch (error: any) {
    console.error("Fish Voice TTS Error:", error);
    await incrementStat("total_errors");
    await logApiRequest({
      ip_address: userIP,
      method: "GET",
      router: "/api/text-to-speech/v2",
      status: 500,
      user_agent: realUA
    });
    return prettyJson(
      { status: false, creator: "VSID TTS Custom Voice", error: error.message || "Internal Server Error" },
      500
    );
  }
}
