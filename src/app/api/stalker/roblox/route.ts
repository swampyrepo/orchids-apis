import { NextRequest } from "next/server";
import { incrementStat, logApiRequest } from "@/lib/supabase";
import { prettyJson } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const usernameParam = searchParams.get("username");
  const account_uid = searchParams.get("account_uid");
  const apikey = searchParams.get("apikey") || "freeApikey";

  let username = usernameParam;

  if (account_uid) {
    try {
      const robloxUserResp = await fetch(`https://users.roblox.com/v1/users/${account_uid}`);
      if (robloxUserResp.ok) {
        const robloxUserData = await robloxUserResp.json();
        username = robloxUserData.name;
      } else {
        return prettyJson({ status: false, error: "Invalid account_uid or user not found" }, 400);
      }
    } catch (error) {
      return prettyJson({ status: false, error: "Failed to resolve account_uid" }, 500);
    }
  }

  if (!username) {
    return prettyJson({ status: false, error: "Parameter 'username' or 'account_uid' is required" }, 400);
  }

  const userIP = req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
  const realUA = req.headers.get("user-agent") || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

  await incrementStat("total_hits");

  try {
    const targetUrl = `https://anabot.my.id/api/search/robloxStalk?username=${encodeURIComponent(username)}&apikey=${encodeURIComponent(apikey)}`;
    
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        "User-Agent": realUA
      }
    });
    
    const data = await response.json();

    await incrementStat("total_success");
    await logApiRequest({
      ip_address: userIP,
      method: "GET",
      router: "/api/stalker/roblox",
      status: 200,
      user_agent: realUA
    });

    return prettyJson(data);

  } catch (error: any) {
    console.error("Roblox Stalker API Error:", error);
    await incrementStat("total_errors");
    await logApiRequest({
      ip_address: userIP,
      method: "GET",
      router: "/api/stalker/roblox",
      status: 500,
      user_agent: realUA
    });
    return prettyJson({ status: false, error: error.message }, 500);
  }
}
