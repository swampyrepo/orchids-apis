import { NextRequest, NextResponse } from "next/server";
import { incrementStat, logApiRequest, supabase } from "@/lib/supabase";
import crypto from "crypto";
import { prettyJson, errorRedirect } from "@/lib/utils";
import sharp from "sharp";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const prompt = searchParams.get("prompt");

  const userIP = req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
  const userAgent = req.headers.get("user-agent") || "browser";

  if (!prompt) {
    return errorRedirect(req, 400, "Parameter 'prompt' is required");
  }

  await incrementStat("total_hits");

  try {
    const seed = Math.floor(Math.random() * 1000000);
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&model=flux&seed=${seed}&nologo=true`;
    
    const imageRes = await fetch(imageUrl, {
      headers: {
        "Accept": "image/*",
      },
    });
    
    if (!imageRes.ok) {
      throw new Error("Failed to generate image from provider");
    }

    const contentType = imageRes.headers.get("content-type") || "";
    if (!contentType.includes("image")) {
      throw new Error("Provider did not return an image");
    }

    const imageBuffer = Buffer.from(await imageRes.arrayBuffer());

    const watermarkUrl = "https://watermark-ai-imagenerator.assetsvsiddev.workers.dev/";
    const watermarkRes = await fetch(watermarkUrl);
    if (!watermarkRes.ok) throw new Error("Failed to download watermark image");
    const watermarkBuffer = Buffer.from(await watermarkRes.arrayBuffer());

    const watermarkMetadata = await sharp(watermarkBuffer).metadata();
    const watermarkWithOpacity = await sharp(watermarkBuffer)
      .ensureAlpha()
      .resize(Math.round((watermarkMetadata.width || 0) * 0.30))
      .composite([
        {
          input: Buffer.from([255, 255, 255, 107]),
          raw: { width: 1, height: 1, channels: 4 },
          tile: true,
          blend: "dest-in",
        },
      ])
      .toBuffer();

    const watermarkedImageBuffer = await sharp(imageBuffer)
      .composite([
        {
          input: watermarkWithOpacity,
          gravity: "southeast",
          blend: "over",
        },
      ])
      .png()
      .toBuffer();

    const id = crypto.randomBytes(4).toString("hex");
    const imagePath = `imagen-1.9-fast/${id}.png`;

    const { error: uploadError } = await supabase.storage
      .from("ai-image-generator")
      .upload(imagePath, watermarkedImageBuffer, {
        contentType: "image/png",
        upsert: true
      });

    if (uploadError) throw uploadError;

    await supabase
      .from("ai_images")
      .insert({
        id,
        prompt,
        image_path: imagePath
      });

    await incrementStat("total_success");
    await logApiRequest({
      ip_address: userIP,
      method: "GET",
      router: "/api/image-generator/imagen-1.9-fast",
      status: 200,
      user_agent: userAgent
    });

    return new NextResponse(watermarkedImageBuffer, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "X-Result-URL": `/image/imagen-1.9-fast/result/${id}`,
        "Cache-Control": "public, max-age=86400"
      }
    });

  } catch (error: any) {
    console.error("Imagen 1.9 Fast API Error:", error);
    await incrementStat("total_errors");
    await logApiRequest({
      ip_address: userIP,
      method: "GET",
      router: "/api/image-generator/imagen-1.9-fast",
      status: 500,
      user_agent: userAgent
    });
    return errorRedirect(req, 500, error.message || "Terjadi kesalahan saat generate gambar");
  }
}
