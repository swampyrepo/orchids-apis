import { NextRequest, NextResponse } from "next/server";
import { incrementStat, logApiRequest, supabase } from "@/lib/supabase";
import { prettyJson } from "@/lib/utils";

async function tryTikwm(url: string, ua: string): Promise<{ musicUrl: string } | null> {
  try {
    const targetUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`;
    const response = await fetch(targetUrl, {
      headers: { "User-Agent": ua }
    });
    if (!response.ok) return null;
    const data = await response.json();
    if (data.code !== 0 || !data.data) return null;
    const musicUrl = data.data.music || data.data.music_info?.play;
    if (!musicUrl) return null;
    return { musicUrl };
  } catch {
    return null;
  }
}

async function tryCobalt(url: string): Promise<{ musicUrl: string } | null> {
  const instances = ["https://dwnld.nichind.dev", "https://cobalt.nohello.net"];
  for (const instance of instances) {
    try {
      const response = await fetch(instance, {
        method: "POST",
        headers: { "Accept": "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ url, downloadMode: "audio", audioFormat: "mp3" }),
      });
      if (!response.ok) continue;
      const data = await response.json();
      if (data.status === "error") continue;
      if (data.url) return { musicUrl: data.url };
    } catch {
      continue;
    }
  }
  return null;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tiktokvid_url = searchParams.get("tiktokvid_url");
  const instantAppearance = searchParams.get("instant-appearance") === "true";

  if (!tiktokvid_url) {
    return prettyJson({ status: false, error: "Parameter 'tiktokvid_url' is required" }, 400);
  }

  const userIP = req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
  const realUA = req.headers.get("user-agent") || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

  await incrementStat("total_hits");

  try {
    let result = await tryTikwm(tiktokvid_url, realUA);
    if (!result) {
      result = await tryCobalt(tiktokvid_url);
    }
    
    if (!result) {
      throw new Error("All providers failed to get music URL");
    }

    const musicResponse = await fetch(result.musicUrl, {
      headers: { "User-Agent": realUA }
    });
    
    if (!musicResponse.ok) {
      throw new Error("Failed to fetch music file from provider");
    }

    const buffer = await musicResponse.arrayBuffer();
    const id = crypto.randomUUID();
    const fileName = `${id}.mp3`;

    const { error: uploadError } = await supabase.storage
      .from("tiktok-mp3s")
      .upload(fileName, buffer, {
        contentType: "audio/mpeg",
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Failed to upload to storage: ${uploadError.message}`);
    }

    const { error: dbError } = await supabase
      .from("tiktok_mp3s")
      .insert({
        id,
        tiktok_url: tiktokvid_url,
        mp3_path: fileName,
      });

    if (dbError) {
      console.error("DB Error:", dbError);
    }

    await incrementStat("total_success");
    await logApiRequest({
      ip_address: userIP,
      method: "GET",
      router: "/api/downloader/tiktokvid2mp3",
      status: 200,
      user_agent: realUA,
    });

    if (instantAppearance) {
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          "Content-Type": "audio/mpeg",
          "Content-Disposition": `inline; filename="tiktok_${id}.mp3"`,
        },
      });
    }

    const resultUrl = `https://apis.visora.my.id/result/tiktokvid2mp3/${id}`;

    return prettyJson({
      status: true,
      result: {
        id,
        tiktok_url: tiktokvid_url,
        result_url: resultUrl,
      },
    });

  } catch (error: any) {
    console.error("TikTok MP3 API Error:", error);
    await incrementStat("total_errors");
    await logApiRequest({
      ip_address: userIP,
      method: "GET",
      router: "/api/downloader/tiktokvid2mp3",
      status: 500,
      user_agent: realUA,
    });
    return prettyJson({ status: false, error: error.message }, 500);
  }
}
