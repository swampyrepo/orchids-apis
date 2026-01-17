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
      .from("ai_images")
      .select("*")
      .eq("id", id)
      .single();

    if (metaError || !meta) {
      return prettyJson({
        status: false,
        error: "Image not found"
      }, 404);
    }

    // 2. Fetch image from storage
    const { data: blob, error: storageError } = await supabase.storage
      .from("ai-image-generator")
      .download(meta.image_path);

    if (storageError || !blob) {
      return prettyJson({
        status: false,
        error: "Failed to download image from storage"
      }, 500);
    }

    // 3. Serve the image
    const buffer = await blob.arrayBuffer();
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });

  } catch (error: any) {
    console.error("Result API Error:", error);
    return prettyJson({
      status: false,
      error: "Internal server error"
    }, 500);
  }
}
