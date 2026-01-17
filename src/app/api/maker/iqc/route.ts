import { NextRequest, NextResponse } from "next/server";
import { incrementStat, logApiRequest } from "@/lib/supabase";
import { prettyJson } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const text = searchParams.get("text");
  const chatTime = searchParams.get("chatTime") || "11:02";
  const statusBarTime = searchParams.get("statusBarTime") || "17:01";
  const bubbleColor = searchParams.get("bubbleColor") || "#272a2f";
  const menuColor = searchParams.get("menuColor") || "#272a2f";
  const textColor = searchParams.get("textColor") || "#FFFFFF";
  const fontName = searchParams.get("fontName") || "Arial";
  const signalName = searchParams.get("signalName") || "Telkomsel";
  const apikey = "freeApikey";

  if (!text) {
    return prettyJson({ status: false, error: "Parameter 'text' is required" }, 400);
  }

  const userIP = req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
  const realUA = req.headers.get("user-agent") || "browser";

  await incrementStat("total_hits");

  try {
    const targetUrl = `http://anabot.my.id/api/maker/iqc?text=${encodeURIComponent(text)}&chatTime=${encodeURIComponent(chatTime)}&statusBarTime=${encodeURIComponent(statusBarTime)}&bubbleColor=${encodeURIComponent(bubbleColor)}&menuColor=${encodeURIComponent(menuColor)}&textColor=${encodeURIComponent(textColor)}&fontName=${encodeURIComponent(fontName)}&signalName=${encodeURIComponent(signalName)}&apikey=${apikey}`;
    
    const response = await fetch(targetUrl);
    
    if (!response.ok) {
        throw new Error(`Failed to fetch from provider: ${response.statusText}`);
    }

    const contentType = response.headers.get("content-type") || "application/json";
    
    if (contentType.includes("application/json")) {
        const data = await response.json();
        await incrementStat("total_success");
        await logApiRequest({
          ip_address: userIP,
          method: "GET",
          router: "/api/maker/iqc",
          status: response.status,
          user_agent: realUA
        });
        return prettyJson(data);
    } else {
        const buffer = await response.arrayBuffer();
        await incrementStat("total_success");
        await logApiRequest({
          ip_address: userIP,
          method: "GET",
          router: "/api/maker/iqc",
          status: response.status,
          user_agent: realUA
        });
        return new NextResponse(buffer, {
          status: 200,
          headers: { "Content-Type": contentType },
        });
    }

  } catch (error: any) {
    console.error("IQC API Error:", error);
    await incrementStat("total_errors");
    await logApiRequest({
      ip_address: userIP,
      method: "GET",
      router: "/api/maker/iqc",
      status: 500,
      user_agent: realUA
    });
    return prettyJson({ status: false, error: error.message }, 500);
  }
}
