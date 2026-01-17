import { NextRequest, NextResponse } from "next/server";
import { incrementStat, logApiRequest } from "@/lib/supabase";
import { prettyJson } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const text = searchParams.get("text");
  const apikey = "freeApikey";

  if (!text) {
    return prettyJson({ status: false, error: "Parameter 'text' is required" }, 400);
  }

  const userIP = req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
  const realUA = req.headers.get("user-agent") || "browser";

  await incrementStat("total_hits");

  try {
    const targetUrl = `http://anabot.my.id/api/maker/brat?text=${encodeURIComponent(text)}&apikey=${apikey}`;
    const response = await fetch(targetUrl);
    
    if (!response.ok) {
        throw new Error(`Failed to fetch from provider: ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") || "image/png";

    await incrementStat("total_success");
    await logApiRequest({
      ip_address: userIP,
      method: "GET",
      router: "/api/maker/brat",
      status: response.status,
      user_agent: realUA
    });

    return new NextResponse(buffer, {
      status: 200,
      headers: { "Content-Type": contentType },
    });
  } catch (error: any) {
    console.error("Brat API Error:", error);
    await incrementStat("total_errors");
    await logApiRequest({
      ip_address: userIP,
      method: "GET",
      router: "/api/maker/brat",
      status: 500,
      user_agent: realUA
    });
    return prettyJson({ status: false, error: error.message }, 500);
  }
}

