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
      .from("tiktok_downloads")
      .select("*")
      .eq("id", id)
      .single();

    if (metaError || !meta) {
      return prettyJson({ status: false, error: "Resource not found" }, 404);
    }

    const filePath = meta.mp4_path;
    if (!filePath) {
      return prettyJson({ status: false, error: "No MP4 available for this record" }, 404);
    }

    const { data: blob, error: storageError } = await supabase.storage
      .from("tiktok-downloads")
      .download(filePath);

    if (storageError || !blob) {
      return prettyJson({ status: false, error: "Failed to download MP4 from storage" }, 500);
    }

    const buffer = await blob.arrayBuffer();
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": `inline; filename="tiktok_${id}.mp4"`,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });

  } catch (error: any) {
    console.error("TikTok MP4 Result Error:", error);
    return prettyJson({ status: false, error: "Internal server error" }, 500);
  }
}
