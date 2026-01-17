import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { prettyJson } from "@/lib/utils";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  const id = resolvedParams.id;
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "mp4";

  try {
    // 1. Get metadata from DB
    const { data: meta, error: metaError } = await supabase
      .from("tiktok_downloads")
      .select("*")
      .eq("id", id)
      .single();

    if (metaError || !meta) {
      return prettyJson({
        status: false,
        error: "Resource not found"
      }, 404);
    }

    const filePath = type === "mp3" ? meta.mp3_path : meta.mp4_path;
    const contentType = type === "mp3" ? "audio/mpeg" : "video/mp4";
    const extension = type === "mp3" ? "mp3" : "mp4";

    if (!filePath) {
      return prettyJson({
        status: false,
        error: `No ${type.toUpperCase()} available for this record`
      }, 404);
    }

    // 2. Fetch from storage
    const { data: blob, error: storageError } = await supabase.storage
      .from("tiktok-downloads")
      .download(filePath);

    if (storageError || !blob) {
      return prettyJson({
        status: false,
        error: `Failed to download ${type.toUpperCase()} from storage`
      }, 500);
    }

    // 3. Serve the file
    const buffer = await blob.arrayBuffer();
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="tiktok_${id}.${extension}"`,
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
