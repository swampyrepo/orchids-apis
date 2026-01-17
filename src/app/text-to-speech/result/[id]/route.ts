import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const fileName = `${id}.mp3`;

  const { data, error } = await supabase.storage
    .from("tts-results")
    .download(fileName);

  if (error || !data) {
    return NextResponse.json(
      { status: false, creator: "vallzx_service-id", error: "File not found" },
      { status: 404 }
    );
  }

  return new NextResponse(data, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Content-Disposition": `inline; filename="${fileName}"`,
    },
  });
}
