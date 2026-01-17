import { NextRequest, NextResponse } from "next/server";
import { incrementStat, logApiRequest, supabase } from "@/lib/supabase";
import { prettyJson } from "@/lib/utils";

interface TikTokData {
  videoUrl: string;
  musicUrl: string | null;
  title: string;
  author: string;
  thumbnailUrl: string | null;
}

async function tryTikwm(url: string, ua: string): Promise<TikTokData | null> {
  try {
    const targetUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(url)}&hd=1`;
    const response = await fetch(targetUrl, {
      headers: { "User-Agent": ua, "Accept": "application/json" }
    });
    if (!response.ok) return null;
    const data = await response.json();
    if (data.code !== 0 || !data.data) return null;
    const videoUrl = data.data.hdplay || data.data.play;
    if (!videoUrl) return null;
    return {
      videoUrl,
      musicUrl: data.data.music || data.data.music_info?.play || null,
      title: data.data.title || "TikTok Video",
      author: data.data.author?.nickname || "Unknown",
      thumbnailUrl: data.data.cover || data.data.origin_cover || null,
    };
  } catch {
    return null;
  }
}

async function tryCobalt(url: string, isAudio: boolean): Promise<{ downloadUrl: string } | null> {
  const instances = ["https://dwnld.nichind.dev", "https://cobalt.nohello.net"];
  for (const instance of instances) {
    try {
      const response = await fetch(instance, {
        method: "POST",
        headers: { "Accept": "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          downloadMode: isAudio ? "audio" : "auto",
          audioFormat: "mp3",
          videoQuality: "1080",
        }),
      });
      if (!response.ok) continue;
      const data = await response.json();
      if (data.status === "error") continue;
      if (data.url) return { downloadUrl: data.url };
    } catch {
      continue;
    }
  }
  return null;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tiktokvid_url = searchParams.get("tiktokvid_url");
  const autoShow = searchParams.get("auto_show") !== "false";
  const type = searchParams.get("type");

  if (!tiktokvid_url) {
    return prettyJson({ status: false, error: "Parameter 'tiktokvid_url' is required" }, 400);
  }

  if (!type || (type !== "mp3" && type !== "mp4")) {
    return prettyJson({ status: false, error: "Parameter 'type' is required and must be 'mp3' or 'mp4'" }, 400);
  }

  const userIP = req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
  const realUA = req.headers.get("user-agent") || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

  await incrementStat("total_hits");

  try {
    let videoUrl: string | null = null;
    let musicUrl: string | null = null;
    let title = "TikTok Video";
    let author = "Unknown";
    let thumbnailUrl: string | null = null;

    const tikwmResult = await tryTikwm(tiktokvid_url, realUA);
    if (tikwmResult) {
      videoUrl = tikwmResult.videoUrl;
      musicUrl = tikwmResult.musicUrl;
      title = tikwmResult.title;
      author = tikwmResult.author;
      thumbnailUrl = tikwmResult.thumbnailUrl;
    } else {
      const cobaltResult = await tryCobalt(tiktokvid_url, type === "mp3");
      if (cobaltResult) {
        if (type === "mp3") {
          musicUrl = cobaltResult.downloadUrl;
        } else {
          videoUrl = cobaltResult.downloadUrl;
        }
      }
    }

    if (type === "mp4" && !videoUrl) {
      throw new Error("No video URL found from any provider");
    }
    if (type === "mp3" && !musicUrl) {
      throw new Error("No music URL found from any provider");
    }

    let videoBuffer: ArrayBuffer | null = null;
    let musicBuffer: ArrayBuffer | null = null;

    if (type === "mp4" && videoUrl) {
      const videoResponse = await fetch(videoUrl, {
        headers: { "User-Agent": realUA }
      });
      if (!videoResponse.ok) throw new Error("Failed to fetch video file");
      videoBuffer = await videoResponse.arrayBuffer();
    }

    if (type === "mp3" && musicUrl) {
      const musicResponse = await fetch(musicUrl, {
        headers: { "User-Agent": realUA }
      });
      if (!musicResponse.ok) throw new Error("Failed to fetch music file");
      musicBuffer = await musicResponse.arrayBuffer();
    }

    const id = crypto.randomUUID();
    const mp4FileName = videoBuffer ? `${id}.mp4` : null;
    const mp3FileName = musicBuffer ? `${id}.mp3` : null;

    if (videoBuffer && mp4FileName) {
      const { error: videoUploadError } = await supabase.storage
        .from("tiktok-downloads")
        .upload(mp4FileName, videoBuffer, {
          contentType: "video/mp4",
          upsert: true
        });

      if (videoUploadError) {
        throw new Error(`Failed to upload video to storage: ${videoUploadError.message}`);
      }
    }

    if (musicBuffer && mp3FileName) {
      const { error: musicUploadError } = await supabase.storage
        .from("tiktok-downloads")
        .upload(mp3FileName, musicBuffer, {
          contentType: "audio/mpeg",
          upsert: true
        });

      if (musicUploadError) {
        throw new Error(`Failed to upload music to storage: ${musicUploadError.message}`);
      }
    }

    let thumbnailPath: string | null = null;
    if (thumbnailUrl) {
      try {
        const thumbResponse = await fetch(thumbnailUrl);
        if (thumbResponse.ok) {
          const thumbBuffer = await thumbResponse.arrayBuffer();
          const thumbFileName = `${id}_thumb.jpg`;
          await supabase.storage
            .from("tiktok-downloads")
            .upload(thumbFileName, thumbBuffer, {
              contentType: "image/jpeg",
              upsert: true
            });
          thumbnailPath = thumbFileName;
        }
      } catch (e) {
        console.error("Failed to upload thumbnail:", e);
      }
    }

    const { error: dbError } = await supabase
      .from("tiktok_downloads")
      .insert({
        id,
        tiktok_url: tiktokvid_url,
        mp4_path: mp4FileName,
        mp3_path: mp3FileName,
        thumbnail_path: thumbnailPath,
        title,
        author,
        thumbnail_url: thumbnailUrl,
      });

    if (dbError) {
      console.error("DB Error:", dbError);
    }

    await incrementStat("total_success");
    await logApiRequest({
      ip_address: userIP,
      method: "GET",
      router: "/api/downloader/tiktokmp4downloader",
      status: 200,
      user_agent: realUA,
    });

    if (autoShow && type === "mp4" && videoBuffer) {
      return new NextResponse(videoBuffer, {
        status: 200,
        headers: {
          "Content-Type": "video/mp4",
          "Content-Disposition": `inline; filename="tiktok_${id}.mp4"`,
        },
      });
    }

    if (type === "mp3") {
      const resultUrl = `https://apis.visora.my.id/result/mp4tiktok/${id}`;
      return prettyJson({
        status: true,
        result: {
          id,
          tiktok_url: tiktokvid_url,
          title,
          author,
          thumbnail: thumbnailUrl,
          type,
          result_url: resultUrl,
        },
      });
    }

    const { data: publicUrl } = supabase.storage
      .from("tiktok-downloads")
      .getPublicUrl(mp4FileName!);

    return prettyJson({
      status: true,
      result: {
        id,
        tiktok_url: tiktokvid_url,
        title,
        author,
        thumbnail: thumbnailUrl,
        video_url: publicUrl?.publicUrl,
      },
    });

  } catch (error: any) {
    console.error("TikTok Downloader API Error:", error);
    await incrementStat("total_errors");
    await logApiRequest({
      ip_address: userIP,
      method: "GET",
      router: "/api/downloader/tiktokmp4downloader",
      status: 500,
      user_agent: realUA,
    });
    return prettyJson({ status: false, error: error.message }, 500);
  }
}
