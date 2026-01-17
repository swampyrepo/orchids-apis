import { NextRequest, NextResponse } from "next/server";
import { incrementStat, logApiRequest } from "@/lib/supabase";
import { prettyJson } from "@/lib/utils";
import sharp from "sharp";

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_1_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1",
];

function getRandomIP() {
  return Array.from({ length: 4 }, () => Math.floor(Math.random() * 256)).join(".");
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const searchParams = req.nextUrl.searchParams.toString();
  
  // Map our new /api/image-generator/path to the provider's /api/artificial/path
  // This allows us to keep the provider's structure while organizing ours
  let targetPath = path.join("/");
  
  // If it's one of the known image generators from the AI category
  const knownGenerators = ["amazonai", "animagine", "deepai", "text2img"];
  if (knownGenerators.includes(path[0])) {
    targetPath = `artificial/${targetPath}`;
  }

  const url = `https://api.vreden.my.id/api/v1/${targetPath}${searchParams ? `?${searchParams}` : ""}`;
  
  const userIP = req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
  const realUA = req.headers.get("user-agent") || "browser";

  await incrementStat("total_hits");

  try {
    const headers = new Headers();
    const randomUA = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
    const fakeIP = getRandomIP();

    headers.set("User-Agent", randomUA);
    headers.set("X-Forwarded-For", fakeIP);
    headers.set("X-Real-IP", fakeIP);
    headers.set("Client-IP", fakeIP);

    const response = await fetch(url, { headers });
    const contentType = response.headers.get("content-type");

    if (contentType && contentType.includes("application/json")) {
      const data = await response.json();
      await incrementStat("total_success");
      await logApiRequest({
        ip_address: userIP,
        method: "GET",
        router: `/api/image-generator/${path.join("/")}`,
        status: response.status,
        user_agent: realUA
      });
      return prettyJson(data, response.status);
    } else {
      let buffer = await response.arrayBuffer();
      
      // Apply watermark if path or search params contains "imagen" and it's an image
      const hasImagen = path.some(p => p.toLowerCase().includes("imagen")) || searchParams.toLowerCase().includes("imagen");
      if (hasImagen && contentType?.startsWith("image/")) {
        try {
          const imageBuffer = Buffer.from(buffer);
          const watermarkUrl = "https://watermark-ai-imagenerator.assetsvsiddev.workers.dev/";
          const watermarkRes = await fetch(watermarkUrl);
          if (watermarkRes.ok) {
            const watermarkBuffer = Buffer.from(await watermarkRes.arrayBuffer());
            const watermarkMetadata = await sharp(watermarkBuffer).metadata();
            const watermarkWithOpacity = await sharp(watermarkBuffer)
              .ensureAlpha()
              .resize(Math.round((watermarkMetadata.width || 0) * 0.30)) // 30% of original size
              .composite([
                {
                  input: Buffer.from([255, 255, 255, 107]), // 42% opacity (107/255)
                  raw: { width: 1, height: 1, channels: 4 },
                  tile: true,
                  blend: "dest-in",
                },
              ])
              .toBuffer();

            buffer = await sharp(imageBuffer)
              .composite([
                {
                  input: watermarkWithOpacity,
                  gravity: "southeast",
                  blend: "over",
                },
              ])
              .toBuffer();
          }
        } catch (watermarkError) {
          console.error("Watermark Error in Proxy:", watermarkError);
          // Continue without watermark if it fails
        }
      }

      await incrementStat("total_success");
      await logApiRequest({
        ip_address: userIP,
        method: "GET",
        router: `/api/image-generator/${path.join("/")}`,
        status: response.status,
        user_agent: realUA
      });
      return new NextResponse(buffer, {
        status: response.status,
        headers: { "Content-Type": contentType || "image/png" },
      });
    }
  } catch (error: any) {
    console.error(`Image Generator Proxy Error (${targetPath}):`, error);
    await incrementStat("total_errors");
    await logApiRequest({
      ip_address: userIP,
      method: "GET",
      router: `/api/image-generator/${path.join("/")}`,
      status: 500,
      user_agent: realUA
    });
    return prettyJson({ status: false, error: "Internal Server Error" }, 500);
  }
}
