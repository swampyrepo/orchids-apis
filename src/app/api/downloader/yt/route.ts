import { NextRequest, NextResponse } from "next/server";
import { incrementStat, logApiRequest, supabase } from "@/lib/supabase";
import { prettyJson } from "@/lib/utils";

const COBALT_INSTANCES = [
  "https://dwnld.nichind.dev",
  "https://cobalt.nohello.net",
];

function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

async function downloadFromCobalt(youtubeUrl: string, type: "mp3" | "mp4"): Promise<{ url: string; filename?: string }> {
  const isAudio = type === "mp3";
  
  for (const instance of COBALT_INSTANCES) {
    try {
      const response = await fetch(instance, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: youtubeUrl,
          videoQuality: "1080",
          audioFormat: isAudio ? "mp3" : "best",
          downloadMode: isAudio ? "audio" : "auto",
          filenameStyle: "basic",
        }),
      });

      if (!response.ok) continue;
      
      const data = await response.json();
      
      if (data.status === "error") continue;
      
      if (data.status === "tunnel" || data.status === "redirect" || data.status === "stream") {
        return { url: data.url, filename: data.filename };
      }
      
      if (data.url) {
        return { url: data.url, filename: data.filename };
      }
    } catch (e) {
      console.error(`Cobalt instance ${instance} failed:`, e);
      continue;
    }
  }
  
  throw new Error("YouTube download tidak tersedia saat ini. Silakan coba lagi nanti.");
}

async function getVideoInfo(youtubeUrl: string): Promise<{ title: string; author: string; thumbnail: string }> {
  const videoId = extractVideoId(youtubeUrl);
  if (!videoId) throw new Error("Invalid YouTube URL");
  
  try {
    const response = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
    if (response.ok) {
      const data = await response.json();
      return {
        title: data.title || "YouTube Video",
        author: data.author_name || "Unknown",
        thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      };
    }
  } catch (e) {
    console.error("Failed to get video info:", e);
  }
  
  return {
    title: "YouTube Video",
    author: "Unknown",
    thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const youtubeUrl = searchParams.get("youtube_url");
  const type = searchParams.get("type") as "mp3" | "mp4";

  if (!youtubeUrl) {
    return prettyJson({ status: false, error: "Parameter 'youtube_url' is required" }, 400);
  }

  if (!type || (type !== "mp3" && type !== "mp4")) {
    return prettyJson({ status: false, error: "Parameter 'type' is required and must be 'mp3' or 'mp4'" }, 400);
  }

  const videoId = extractVideoId(youtubeUrl);
  if (!videoId) {
    return prettyJson({ status: false, error: "Invalid YouTube URL" }, 400);
  }

  const userIP = req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
  const realUA = req.headers.get("user-agent") || "Mozilla/5.0";

  await incrementStat("total_hits");

  try {
    const [downloadResult, videoInfo] = await Promise.all([
      downloadFromCobalt(youtubeUrl, type),
      getVideoInfo(youtubeUrl),
    ]);

    const mediaResponse = await fetch(downloadResult.url, {
      headers: { "User-Agent": realUA },
    });

    if (!mediaResponse.ok) {
      throw new Error(`Failed to fetch media: ${mediaResponse.status}`);
    }

    const buffer = await mediaResponse.arrayBuffer();
    const id = crypto.randomUUID();
    const ext = type === "mp3" ? "mp3" : "mp4";
    const fileName = `${id}.${ext}`;
    const contentType = type === "mp3" ? "audio/mpeg" : "video/mp4";

    const { error: uploadError } = await supabase.storage
      .from("yt-downloads")
      .upload(fileName, buffer, {
        contentType,
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Failed to upload to storage: ${uploadError.message}`);
    }

    const { error: dbError } = await supabase
      .from("yt_downloads")
      .insert({
        id,
        youtube_url: youtubeUrl,
        title: videoInfo.title,
        author: videoInfo.author,
        thumbnail_url: videoInfo.thumbnail,
        mp4_path: type === "mp4" ? fileName : null,
        mp3_path: type === "mp3" ? fileName : null,
        type,
      });

    if (dbError) {
      throw new Error(`Failed to save metadata: ${dbError.message}`);
    }

    await incrementStat("total_success");
    await logApiRequest({
      ip_address: userIP,
      method: "GET",
      router: "/api/downloader/yt",
      status: 200,
      user_agent: realUA,
    });

    if (type === "mp4") {
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Content-Disposition": `inline; filename="youtube_${id}.${ext}"`,
        },
      });
    }

    const resultUrl = `https://apis.visora.my.id/result/ytdownloader/${id}`;

    return prettyJson({
      status: true,
      result: {
        id,
        youtube_url: youtubeUrl,
        title: videoInfo.title,
        author: videoInfo.author,
        thumbnail: videoInfo.thumbnail,
        type,
        result_url: resultUrl,
      },
    });

  } catch (error: any) {
    console.error("YouTube Downloader API Error:", error);
    await incrementStat("total_errors");
    await logApiRequest({
      ip_address: userIP,
      method: "GET",
      router: "/api/downloader/yt",
      status: 500,
      user_agent: realUA,
    });
    return prettyJson({ status: false, error: error.message }, 500);
  }
}
