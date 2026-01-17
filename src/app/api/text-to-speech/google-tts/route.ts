import { NextRequest, NextResponse } from "next/server";
import { incrementStat, logApiRequest, supabase } from "@/lib/supabase";
import crypto from "crypto";
import { prettyJson } from "@/lib/utils";

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_1_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1",
];

function getRandomIP() {
  return Array.from({ length: 4 }, () => Math.floor(Math.random() * 256)).join(".");
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const text = searchParams.get("text");

  const userIP = req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
  const userAgent = req.headers.get("user-agent") || "browser";

  if (!text) {
    return prettyJson({ status: false, error: "Parameter 'text' is required" }, 400);
  }

  await incrementStat("total_hits");

  try {
    const fakeIP = getRandomIP();
    const randomUA = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
    
    // API Endpoint: https://api.siputzx.my.id/api/tools/ttsgoogle?text=...
    const targetUrl = `https://api.siputzx.my.id/api/tools/ttsgoogle?text=${encodeURIComponent(text)}`;
    
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": randomUA,
        "X-Forwarded-For": fakeIP,
        "X-Real-IP": fakeIP,
      },
    });

    const data = await response.json();

    if (!data.status || !data.data) {
      throw new Error(data.message || "Failed to generate TTS from provider");
    }

    const audioUrl = data.data;
    const audioRes = await fetch(audioUrl);
    if (!audioRes.ok) throw new Error("Failed to download audio from provider URL");

    const audioBuffer = Buffer.from(await audioRes.arrayBuffer());
    const id = crypto.randomUUID();
    const fileName = `google-tts-${id}.mp3`;

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
      router: "/api/text-to-speech/google-tts",
      status: 200,
      user_agent: userAgent
    });

    return new NextResponse(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=86400",
        "X-Result-ID": id
      },
    });

  } catch (error: any) {
    console.error("Google TTS API Error:", error);
    await incrementStat("total_errors");
    await logApiRequest({
      ip_address: userIP,
      method: "GET",
      router: "/api/text-to-speech/google-tts",
      status: 500,
      user_agent: userAgent
    });
    return prettyJson({ status: false, error: error.message }, 500);
  }
}
