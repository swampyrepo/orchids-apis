import { NextRequest, NextResponse } from "next/server";
import { incrementStat, logApiRequest, supabase } from "@/lib/supabase";
import crypto from "crypto";
import { errorRedirect } from "@/lib/utils";
import sharp from "sharp";

const BOT_USER_AGENTS = [
  "Googlebot/2.1 (+http://www.google.com/bot.html)",
  "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
  "Mozilla/5.0 (compatible; Bingbot/2.0; +http://www.bing.com/bingbot.htm)",
  "Mozilla/5.0 (compatible; YandexBot/3.0; +http://yandex.com/bots)",
];

function getRandomBotUA(): string {
  return BOT_USER_AGENTS[Math.floor(Math.random() * BOT_USER_AGENTS.length)];
}

async function generateFromFlux(prompt: string): Promise<Buffer> {
  const apiUrl = `https://api.siputzx.my.id/api/ai/flux?prompt=${encodeURIComponent(prompt)}`;
  
  const res = await fetch(apiUrl, {
    method: "GET",
    headers: {
      "User-Agent": getRandomBotUA(),
      "Accept": "*/*",
    },
  });
  
  if (!res.ok) {
    throw new Error("Failed to generate image from Flux API");
  }
  
  const contentType = res.headers.get("content-type") || "";
  
  if (contentType.includes("application/json")) {
    const jsonData = await res.json();
    if (jsonData.data || jsonData.result || jsonData.url || jsonData.image) {
      const imageUrl = jsonData.data || jsonData.result || jsonData.url || jsonData.image;
      const imgRes = await fetch(imageUrl, {
        headers: {
          "User-Agent": getRandomBotUA(),
          "Accept": "image/*",
        },
      });
      if (!imgRes.ok) throw new Error("Failed to download generated image");
      return Buffer.from(await imgRes.arrayBuffer());
    }
    throw new Error("Invalid response from Flux API");
  }
  
  if (!contentType.includes("image")) {
    throw new Error("Flux API did not return an image");
  }
  
  return Buffer.from(await res.arrayBuffer());
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const prompt = searchParams.get("prompt");

  const userIP = req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
  const userAgent = req.headers.get("user-agent") || "browser";

  if (!prompt) {
    return errorRedirect(req, 400, "Parameter 'prompt' is required");
  }

  await incrementStat("total_requests");

  try {
    const imageBuffer = await generateFromFlux(prompt);

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
    const imagePath = `imagen-3.5-pro/${id}.png`;

    const { error: uploadError } = await supabase.storage
      .from("ai-images")
      .upload(imagePath, watermarkedImageBuffer, {
        contentType: "image/png",
        upsert: true
      });

    if (uploadError) throw uploadError;

    const { error: dbError } = await supabase
      .from("ai_images")
      .insert({
        id,
        prompt,
        image_path: imagePath
      });

    if (dbError) throw dbError;

    await incrementStat("total_success");
    await logApiRequest({
      ip_address: userIP,
      method: "GET",
      router: "/api/image-generator/imagen-3.5-pro",
      status: 200,
      user_agent: userAgent
    });

    return new NextResponse(watermarkedImageBuffer, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "X-Result-URL": `/image/imagen-3.5-pro/result/${id}`
      }
    });

  } catch (error: any) {
    console.error("Imagen 3.5 Pro API Error:", error);
    await incrementStat("total_errors");
    await logApiRequest({
      ip_address: userIP,
      method: "GET",
      router: "/api/image-generator/imagen-3.5-pro",
      status: 500,
      user_agent: userAgent
    });
    return errorRedirect(req, 500, error.message || "Terjadi kesalahan saat generate gambar");
  }
}
