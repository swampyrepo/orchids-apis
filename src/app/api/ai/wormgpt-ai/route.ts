import { NextRequest } from "next/server";
import { incrementStat, logApiRequest } from "@/lib/supabase";
import { prettyJson } from "@/lib/utils";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const prompt = searchParams.get("prompt") || searchParams.get("prompt?");

  const userIP = req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
  const userAgent = req.headers.get("user-agent") || "browser";

  if (!prompt) {
    return prettyJson({ status: false, error: "Parameter 'prompt' is required" }, 400);
  }

  await incrementStat("total_hits");

  const apiKey = "wgpt-live-v1-jbifdh6l8qa";
  const apiUrl = `https://wormgpt-api-key-manager.vercel.app/api/v1/chat?apikey=${apiKey}&prompt=${encodeURIComponent(prompt)}`;

  try {
    const response = await fetch(apiUrl);
    const data = await response.json();

    await incrementStat("total_success");
    await logApiRequest({
      ip_address: userIP,
      method: "GET",
      router: "/api/ai/wormgpt-ai",
      status: 200,
      user_agent: userAgent
    });

      return prettyJson({
        status: true,
        creator: "Vallzx",
        result: data.choices?.[0]?.message?.content || data.result || data.message || data
      });
  } catch (error: any) {
    console.error("WormGPT AI API Error:", error);
    await incrementStat("total_errors");
    await logApiRequest({
      ip_address: userIP,
      method: "GET",
      router: "/api/ai/wormgpt-ai",
      status: 500,
      user_agent: userAgent
    });
    return prettyJson({ status: false, error: "Failed to fetch from WormGPT API" }, 500);
  }
}
