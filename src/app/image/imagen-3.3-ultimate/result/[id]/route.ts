import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

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
      return NextResponse.json({
        status: false,
        error: "Image not found"
      }, { status: 404 });
    }

    // 2. Fetch image from storage
    const { data: blob, error: storageError } = await supabase.storage
      .from("ai-image-generator")
      .download(meta.image_path);

    if (storageError || !blob) {
      return NextResponse.json({
        status: false,
        error: "Failed to download image from storage"
      }, { status: 500 });
    }

    // 3. Serve the image
    const buffer = await blob.arrayBuffer();
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });

    } catch (error: any) {
      console.error("Imagen 3.3 Ultimate Result API Error:", error);
      return NextResponse.json({
      status: false,
      error: "Internal server error"
    }, { status: 500 });
  }
}
