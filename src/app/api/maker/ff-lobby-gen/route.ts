import { NextRequest, NextResponse } from "next/server";
import { incrementStat, logApiRequest } from "@/lib/supabase";
import { prettyJson } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const text = searchParams.get("text");

  if (!text) {
    return prettyJson({ status: false, error: "Parameter 'text' is required" }, 400);
  }

  const userIP = req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
  const realUA = req.headers.get("user-agent") || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

  await incrementStat("total_hits");

  try {
    const targetUrl = `https://fake-lobby-ffmax-ditzx.vercel.app/api/generate?text=${encodeURIComponent(text)}`;
    
    // Using a longer timeout if needed, but fetch doesn't have a default timeout in Next.js
    // unless configured. We'll just fetch it.
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
        "Accept": "image/*, */*",
        "Connection": "keep-alive"
      }
    });
    
    if (!response.ok) {
        throw new Error(`Failed to fetch from provider: ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") || "image/png";

    await incrementStat("total_success");
    await logApiRequest({
      ip_address: userIP,
      method: "GET",
      router: "/api/maker/ff-lobby-gen",
      status: response.status,
      user_agent: realUA
    });

    return new NextResponse(buffer, {
      status: 200,
      headers: { 
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600"
      },
    });
  } catch (error: any) {
    console.error("FF Lobby Gen API Error:", error);
    await incrementStat("total_errors");
    await logApiRequest({
      ip_address: userIP,
      method: "GET",
      router: "/api/maker/ff-lobby-gen",
      status: 500,
      user_agent: realUA
    });
    return prettyJson({ status: false, error: error.message }, 500);
  }
}
