import { NextRequest, NextResponse } from "next/server";
import { incrementStat, logApiRequest, supabase } from "@/lib/supabase";
import { prettyJson } from "@/lib/utils";

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
    const targetUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(tiktokvid_url)}`;
    
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": realUA
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch from provider: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (data.code !== 0 || !data.data || (!data.data.music && !data.data.music_info?.play)) {
      throw new Error(data.msg || "Failed to get MP3 from provider response");
    }

    const musicUrl = data.data.music || data.data.music_info.play;
    const musicResponse = await fetch(musicUrl, {
      headers: {
        "User-Agent": realUA
      }
    });
    
    if (!musicResponse.ok) {
      throw new Error("Failed to fetch music file from provider");
    }

    const buffer = await musicResponse.arrayBuffer();
    const contentType = "audio/mpeg";

    // Store in Supabase
    const id = crypto.randomUUID();
    const fileName = `${id}.mp3`;
    const { error: uploadError } = await supabase.storage
      .from("tiktok-mp3s")
      .upload(fileName, buffer, {
        contentType: contentType,
        upsert: true
      });

    if (uploadError) {
      throw new Error(`Failed to upload to storage: ${uploadError.message}`);
    }

    // Save metadata
    const { error: dbError } = await supabase
      .from("tiktok_mp3s")
      .insert({
        id,
        tiktok_url: tiktokvid_url,
        mp3_path: fileName
      });

    if (dbError) {
      throw new Error(`Failed to save metadata: ${dbError.message}`);
    }

    await incrementStat("total_success");
    await logApiRequest({
      ip_address: userIP,
      method: "GET",
      router: "/api/downloader/tiktokvid2mp3",
      status: 200,
      user_agent: realUA
    });

    const resultUrl = `${req.nextUrl.origin}/result/tiktokvid2mp3/${id}`;

    if (instantAppearance) {
      return new NextResponse(buffer, {
        status: 200,
        headers: { 
          "Content-Type": contentType,
          "Content-Disposition": `inline; filename="tiktok_${id}.mp3"`
        },
      });
    }

    return prettyJson({
      status: true,
      result: {
        id,
        tiktok_url: tiktokvid_url,
        result_url: resultUrl
      }
    });

  } catch (error: any) {
    console.error("TikTok to MP3 API Error:", error);
    await incrementStat("total_errors");
    await logApiRequest({
      ip_address: userIP,
      method: "GET",
      router: "/api/downloader/tiktokvid2mp3",
      status: 500,
      user_agent: realUA
    });
    return prettyJson({ status: false, error: error.message }, 500);
  }
}
