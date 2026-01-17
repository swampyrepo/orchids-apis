import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { prettyJson } from "@/lib/utils";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  const id = resolvedParams.id;

  try {
    const { data: meta, error: metaError } = await supabase
      .from("yt_downloads")
      .select("*")
      .eq("id", id)
      .single();

    if (metaError || !meta) {
      return prettyJson({
        status: false,
        error: "Download not found"
      }, 404);
    }

    const filePath = meta.mp3_path || meta.mp4_path;
    if (!filePath) {
      return prettyJson({
        status: false,
        error: "File not found"
      }, 404);
    }

    const { data: publicUrl } = supabase.storage
      .from("yt-downloads")
      .getPublicUrl(filePath);

    return prettyJson({
      status: true,
      result: {
        id: meta.id,
        youtube_url: meta.youtube_url,
        title: meta.title,
        author: meta.author,
        thumbnail_url: meta.thumbnail_url,
        type: meta.type,
        mp3_url: publicUrl?.publicUrl,
      }
    });

  } catch (error: any) {
    console.error("YT Result API Error:", error);
    return prettyJson({
      status: false,
      error: "Internal server error"
    }, 500);
  }
}
