import { NextRequest, NextResponse } from "next/server";
import { supabase, incrementStat, logApiRequest } from "@/lib/supabase";
import crypto from "crypto";
import { prettyJson } from "@/lib/utils";

const VOICE_MAP: Record<string, string> = {
  "putri_maharani": "I7sakys8pBZ1Z5f0UhT9",
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const text = searchParams.get("text");
  const voice = searchParams.get("voice") || "putri_maharani";
  
  const userIP = req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
  const realUA = req.headers.get("user-agent") || "browser";

  if (!text) {
    return prettyJson(
      { status: false, creator: "vallzx_service-id", error: "Missing text parameter" },
      400
    );
  }

    const voiceId = VOICE_MAP[voice] || voice;
    
    await incrementStat("total_hits");
    
    const apiKeys = (process.env.ELEVENLABS_API_KEYS || process.env.ELEVENLABS_API_KEY || "").split(",").filter(Boolean);
    if (apiKeys.length === 0) {
      return prettyJson(
        { status: false, creator: "vallzx_service-id", error: "ELEVENLABS_API_KEYS is not configured" },
        500
      );
    }
    
    let lastError = "Failed to generate speech";
    let lastStatus = 500;
    
    for (const apiKey of apiKeys) {
      try {
        const response = await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
          {
            method: "POST",
            headers: {
              "xi-api-key": apiKey.trim(),
              "Content-Type": "application/json",
              Accept: "audio/mpeg",
            },
            body: JSON.stringify({
              text,
              model_id: "eleven_multilingual_v2",
              voice_settings: {
                stability: 0.5,
                similarity_boost: 0.5,
              },
            }),
          }
        );
    
        if (response.ok) {
          const audioBuffer = await response.arrayBuffer();
          const resultId = crypto.randomUUID();
          const fileName = `tts-v3-${resultId}.mp3`;
    
          // Store in Supabase
          await supabase.storage
            .from("tts-results")
            .upload(fileName, Buffer.from(audioBuffer), {
              contentType: "audio/mpeg",
              cacheControl: "3600",
              upsert: false,
            });
    
          await incrementStat("total_success");
          await logApiRequest({
            ip_address: userIP,
            method: "GET",
            router: "/api/v3/text-to-speech",
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
        }
    
        const errorData = await response.json().catch(() => ({ detail: { status: "Failed to generate speech" } }));
        console.error(`ElevenLabs API Error with key ${apiKey.substring(0, 10)}...:`, errorData);
        lastError = errorData.detail?.status || errorData.detail?.message || "Failed to generate speech";
        lastStatus = response.status;
    
        // If it's a 401 (Unauthorized) or 429 (Too Many Requests), try next key
        if (response.status === 401 || response.status === 429) {
          continue;
        } else {
          // For other errors, we might want to break or continue. Let's continue for now to be safe.
          continue;
        }
      } catch (error: any) {
        console.error(`TTS Error with key ${apiKey.substring(0, 10)}...:`, error);
        lastError = error.message || "Internal Server Error";
      }
    }
    
    await incrementStat("total_errors");
    await logApiRequest({
      ip_address: userIP,
      method: "GET",
      router: "/api/v3/text-to-speech",
      status: lastStatus,
      user_agent: realUA
    });
    
    return prettyJson(
      { status: false, creator: "vallzx_service-id", error: lastError },
      lastStatus
    );
  }


