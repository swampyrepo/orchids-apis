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
    // 1. Get metadata from DB
    const { data: meta, error: metaError } = await supabase
      .from("tiktok_mp3s")
      .select("*")
      .eq("id", id)
      .single();

    if (metaError || !meta) {
      return prettyJson({
        status: false,
        error: "MP3 not found"
      }, 404);
    }

    // 2. Fetch MP3 from storage
    const { data: blob, error: storageError } = await supabase.storage
      .from("tiktok-mp3s")
      .download(meta.mp3_path);

    if (storageError || !blob) {
      return prettyJson({
        status: false,
        error: "Failed to download MP3 from storage"
      }, 500);
    }

    // 3. Serve the MP3
    const buffer = await blob.arrayBuffer();
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Disposition": `attachment; filename="tiktok_${id}.mp3"`,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });

  } catch (error: any) {
    console.error("TikTok Result API Error:", error);
    return prettyJson({
      status: false,
      error: "Internal server error"
    }, 500);
  }
}
