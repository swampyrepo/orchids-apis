import { NextRequest, NextResponse } from "next/server";
import { incrementStat, logApiRequest } from "@/lib/supabase";
import { prettyJson } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const prompt = searchParams.get("prompt");
  const apikey = "freeApikey";

  if (!prompt) {
    return prettyJson({ status: false, error: "Parameter 'prompt' is required" }, 400);
  }

  const userIP = req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
  const realUA = req.headers.get("user-agent") || "browser";

  await incrementStat("total_hits");

  try {
    const targetUrl = `http://anabot.my.id/api/ai/gptEmail?prompt=${encodeURIComponent(prompt)}&apikey=${apikey}`;
    
    const response = await fetch(targetUrl);
    
    if (!response.ok) {
        throw new Error(`Failed to fetch from provider: ${response.statusText}`);
    }

    const data = await response.json();
    await incrementStat("total_success");
    await logApiRequest({
      ip_address: userIP,
      method: "GET",
      router: "/api/openai/chatgpt",
      status: response.status,
      user_agent: realUA
    });
    return prettyJson(data);

  } catch (error: any) {
    console.error("ChatGPT AI API Error:", error);
    await incrementStat("total_errors");
    await logApiRequest({
      ip_address: userIP,
      method: "GET",
      router: "/api/openai/chatgpt",
      status: 500,
      user_agent: realUA
    });
    return prettyJson({ status: false, error: error.message }, 500);
  }
}
