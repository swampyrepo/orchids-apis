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

function replaceCreator(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(replaceCreator);
  } else if (typeof obj === "object" && obj !== null) {
    const newObj: any = {};
    for (const key in obj) {
      if (key === "creator" && (obj[key] === "api.vreden.my.id" || obj[key] === "vreden")) {
        newObj[key] = "vallzx_service-id";
      } else {
        newObj[key] = replaceCreator(obj[key]);
      }
    }
    return newObj;
  }
  return obj;
}

function getRandomIP() {
  return Array.from({ length: 4 }, () => Math.floor(Math.random() * 256)).join(".");
}

async function handleProxy(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const rawSearchParams = req.nextUrl.searchParams;
  const searchParams = new URLSearchParams(rawSearchParams.toString());
  
  // Specific logic for screenshot
  if (path.includes("screenshot")) {
    const device = searchParams.get("device");
    if (device && !searchParams.get("type")) {
      searchParams.set("type", device);
    }
  }

  const searchParamsString = searchParams.toString();
  
  // Prepend v1 if version is missing
  let targetPath = path.join("/");
  if (!path[0].startsWith("v1") && !path[0].startsWith("v2")) {
    targetPath = `v1/${targetPath}`;
  }
  
  const url = `https://api.vreden.my.id/api/${targetPath}${searchParamsString ? `?${searchParamsString}` : ""}`;
  const method = req.method;
  const userIP = req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
  const realUA = req.headers.get("user-agent") || "browser";

  await incrementStat("total_hits");

  try {
    const headers = new Headers();
    
    // Set realistic browser headers for provider
    const randomUA = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
    const fakeIP = getRandomIP();

    headers.set("User-Agent", randomUA);
    headers.set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7");
    headers.set("Accept-Language", "en-US,en;q=0.9,id;q=0.8");
    headers.set("Accept-Encoding", "gzip, deflate, br");
    headers.set("Cache-Control", "max-age=0");
    headers.set("Connection", "keep-alive");
    headers.set("Upgrade-Insecure-Requests", "1");
    headers.set("Sec-Fetch-Dest", "document");
    headers.set("Sec-Fetch-Mode", "navigate");
    headers.set("Sec-Fetch-Site", "none");
    headers.set("Sec-Fetch-User", "?1");
    headers.set("Referer", "https://api.vreden.my.id/");
    
    // Obfuscate IP for provider
    headers.set("X-Forwarded-For", fakeIP);
    headers.set("X-Real-IP", fakeIP);
    headers.set("Client-IP", fakeIP);

    // Copy essential user headers if they exist
    const forwardedHeaders = ["authorization", "content-type"];
    req.headers.forEach((value, key) => {
      if (forwardedHeaders.includes(key.toLowerCase())) {
        headers.set(key, value);
      }
    });

    let body = undefined;
    if (method !== "GET" && method !== "HEAD") {
      try {
        body = await req.text();
      } catch (e) {
        // Body might be empty or unreadable
      }
    }

    const response = await fetch(url, {
      method,
      headers,
      body,
      redirect: "follow",
    });
    
    const contentType = response.headers.get("content-type");

    if (contentType && contentType.includes("application/json")) {
      const text = await response.text();
      try {
        let data = JSON.parse(text);
        data = replaceCreator(data);
        
        await incrementStat("total_success");
        await logApiRequest({
          ip_address: userIP,
          method,
          router: `/${targetPath}`,
          status: response.status,
          user_agent: realUA
        });

        return prettyJson(data, response.status);
      } catch (e) {
        // If not valid JSON but has JSON content-type (might happen on CF errors)
        console.error("JSON Parse Error:", text);
        if (text.includes("Cloudflare") || text.includes("blocked")) {
          await incrementStat("total_errors");
          await logApiRequest({
            ip_address: userIP,
            method,
            router: `/${targetPath}`,
            status: 403,
            user_agent: realUA
          });
          return prettyJson({ 
            status: false, 
            creator: "vallzx_service-id",
            error: "Request blocked by provider security. Try again later." 
          }, 403);
        }
        throw e;
      }
      } else {
        // For non-JSON responses (images, html, etc)
        let buffer = await response.arrayBuffer();
        
        // Apply watermark if path or search params contains "imagen" and it's an image
        const hasImagen = path.some(p => p.toLowerCase().includes("imagen")) || searchParamsString.toLowerCase().includes("imagen");
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

        // If it's an error page from CF

      if (response.status >= 400) {
        const text = new TextDecoder().decode(buffer);
        if (text.includes("Cloudflare") || text.includes("blocked")) {
          await incrementStat("total_errors");
          await logApiRequest({
            ip_address: userIP,
            method,
            router: `/${targetPath}`,
            status: response.status,
            user_agent: realUA
          });
          return prettyJson({ 
            status: false, 
            creator: "vallzx_service-id",
            error: "Provider security block detected." 
          }, response.status);
        }
      }

      await incrementStat("total_success");
      await logApiRequest({
        ip_address: userIP,
        method,
        router: `/${targetPath}`,
        status: response.status,
        user_agent: realUA
      });
      return new NextResponse(buffer, {
        status: response.status,
        headers: { "Content-Type": contentType || "application/octet-stream" },
      });
    }
  } catch (error) {
    console.error(`Proxy Error (${targetPath}):`, error);
    await incrementStat("total_errors");
    await logApiRequest({
      ip_address: userIP,
      method,
      router: `/${targetPath}`,
      status: 500,
      user_agent: realUA
    });
    return prettyJson({ 
      status: false,
      creator: "vallzx_service-id",
      error: "Internal Server Error" 
    }, 500);
  }
}

export const GET = handleProxy;
export const POST = handleProxy;
export const PUT = handleProxy;
export const DELETE = handleProxy;
