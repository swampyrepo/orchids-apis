import { NextRequest, NextResponse } from "next/server";
import { incrementStat, logApiRequest } from "@/lib/supabase";
import { prettyJson } from "@/lib/utils";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  let prompt = url.searchParams.get("prompt");
  let image_size = url.searchParams.get("image_size") || "landscape_16_9";

  // Handle the case where they use & instead of ? (e.g. /api/text-to-image/fal-ai&prompt=...)
  if (!prompt && url.pathname.includes("&prompt=")) {
    const parts = url.pathname.split("&");
    parts.forEach(part => {
      const [key, value] = part.split("=");
      if (key === "prompt") prompt = decodeURIComponent(value);
      if (key === "image_size") image_size = decodeURIComponent(value);
    });
  }

  if (!prompt) {
    return prettyJson({ 
      status: false,
      creator: "vallzx_service-id",
      error: "Prompt is required. Example: /api/text-to-image/fal-ai?prompt=A beautiful sunset" 
    }, 400);
  }

  const userIP = req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
  const realUA = req.headers.get("user-agent") || "browser";

  await incrementStat("total_hits");

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const response = await fetch("https://fal.run/fal-ai/flux/dev", {
      method: "POST",
      headers: {
        "Authorization": "Key f9c4a8fa-4b82-4028-8ff4-a1394e5ec962:26168ac6cfb953d02d9ed0a03067fa60",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt,
        image_size,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: "Unknown error" }));
      throw new Error(errorData.detail || "Fal AI API error");
    }

    const data = await response.json();
    const imageUrl = data.images?.[0]?.url;

    if (!imageUrl) {
      throw new Error("No image URL returned from provider");
    }

    // Proxy the image to show it directly
    const imageResponse = await fetch(imageUrl);
    const imageBuffer = await imageResponse.arrayBuffer();
    const contentType = imageResponse.headers.get("content-type") || "image/png";

    await incrementStat("total_success");
    await logApiRequest({
      ip_address: userIP,
      method: "GET",
      router: "/api/text-to-image/fal-ai",
      status: 200,
      user_agent: realUA
    });

    return new NextResponse(imageBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
      },
    });

  } catch (error: any) {
    console.error("Fal AI Error:", error);
    await incrementStat("total_errors");
    await logApiRequest({
      ip_address: userIP,
      method: "GET",
      router: "/api/text-to-image/fal-ai",
      status: error.name === "AbortError" ? 504 : 500,
      user_agent: realUA
    });

    return prettyJson({
      status: false,
      creator: "vallzx_service-id",
      error: error.name === "AbortError" ? "Request timeout (30s)" : error.message
    }, error.name === "AbortError" ? 504 : 500);
  }
}
