import { NextRequest, NextResponse } from "next/server";
import { incrementStat, logApiRequest, supabase } from "@/lib/supabase";
import sharp from "sharp";
import crypto from "crypto";
import { prettyJson } from "@/lib/utils";

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_1_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
  "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0",
];

const WATERMARK_URL = "https://visora-dev-assets-id.assetsvsiddev.workers.dev/index/base-logo.png";

function getRandomIP() {
  return Array.from({ length: 4 }, () => Math.floor(Math.random() * 256)).join(".");
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ prompt: string }> }
) {
  const resolvedParams = await params;
  const searchParams = req.nextUrl.searchParams;
  let prompt = decodeURIComponent(resolvedParams.prompt);
  let widthStr = searchParams.get("width");
  let heightStr = searchParams.get("height");

  // Handle the case where width/height are passed as part of the path string
  if (prompt.includes("&width=")) {
    const widthMatch = prompt.match(/&width=([^&]+)/);
    if (widthMatch) widthStr = widthMatch[1];
    prompt = prompt.replace(/&width=[^&]+/, "");
  }
  
  if (prompt.includes("&height=")) {
    const heightMatch = prompt.match(/&height=([^&]+)/);
    if (heightMatch) heightStr = heightMatch[1];
    prompt = prompt.replace(/&height=[^&]+/, "");
  }

  // Set defaults
  const width = parseInt(widthStr || "1024");
  const height = parseInt(heightStr || "1024");

  const userIP = req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
  const userAgent = req.headers.get("user-agent") || "browser";

  if (!prompt) {
    await incrementStat("total_hits");
    await incrementStat("total_errors");
    await logApiRequest({
      ip_address: userIP,
      method: "GET",
      router: "/ai-image-generator/prompt",
      status: 400,
      user_agent: userAgent
    });
    return prettyJson({
      status: false,
      creator: "VSID Image Generator",
      error: "Prompt is required"
    }, 400);
  }

  await incrementStat("total_hits");

  try {
    const fakeIP = getRandomIP();
    const randomUA = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

    // Construct the external URL
    const targetUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${width}&height=${height}&nologo=true`;

    // Fetch generated image and watermark in parallel
    const [imageRes, watermarkRes] = await Promise.all([
      fetch(targetUrl, {
        headers: {
          "User-Agent": randomUA,
          "X-Forwarded-For": fakeIP,
          "X-Real-IP": fakeIP,
          "Client-IP": fakeIP,
        },
      }),
      fetch(WATERMARK_URL)
    ]);

    if (!imageRes.ok) throw new Error(`Pollinations API returned ${imageRes.status}`);
    if (!watermarkRes.ok) throw new Error(`Failed to fetch watermark`);

    const imageBuffer = Buffer.from(await imageRes.arrayBuffer());
    
    if (imageBuffer.length === 0) {
      throw new Error("Received empty image buffer from Pollinations");
    }

    const watermarkBuffer = Buffer.from(await watermarkRes.arrayBuffer());
    
    if (watermarkBuffer.length === 0) {
      throw new Error("Received empty watermark buffer");
    }

      // Process with sharp: resize watermark and composite
      const watermarkSize = Math.floor(width * 0.15); // 15% of image width (medium size)
      const resizedWatermark = await sharp(watermarkBuffer)
        .resize(watermarkSize)
        .toBuffer();

      const finalImageBuffer = await sharp(imageBuffer)
        .composite([
          { 
            input: resizedWatermark, 
            top: height - watermarkSize - 20, // 20px padding from bottom
            left: width - watermarkSize - 20 // 20px padding from right
          }
        ])
        .webp()
        .toBuffer();

    // Generate unique ID and save to Supabase
    const id = crypto.randomBytes(4).toString("hex");
    const fileName = `${id}.webp`;

    const { error: uploadError } = await supabase.storage
      .from("ai-image-generator")
      .upload(fileName, finalImageBuffer, {
        contentType: "image/webp",
        cacheControl: "3600",
        upsert: true
      });

    if (uploadError) throw uploadError;

    const { error: dbError } = await supabase
      .from("ai_images")
      .insert({
        id,
        prompt,
        width,
        height,
        image_path: fileName
      });

    if (dbError) throw dbError;

    await incrementStat("total_success");
    await logApiRequest({
      ip_address: userIP,
      method: "GET",
      router: "/ai-image-generator/prompt",
      status: 200,
      user_agent: userAgent
    });

    const resultUrl = `/api/result/ai-image-generator/${id}`;

    // Return the response as an image directly, but include the metadata in headers if needed
    // Or just return the image as requested by the flow
    return new NextResponse(finalImageBuffer, {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "public, max-age=86400",
        "X-Result-ID": id,
        "X-Result-URL": resultUrl
      },
    });

  } catch (error: any) {
    console.error("Processing Error:", error);
    await incrementStat("total_errors");
    await logApiRequest({
      ip_address: userIP,
      method: "GET",
      router: "/ai-image-generator/prompt",
      status: 500,
      user_agent: userAgent
    });

    return prettyJson({
      status: false,
      creator: "VSID Image Generator",
      error: "Failed to generate or process image"
    }, 500);
  }
}
