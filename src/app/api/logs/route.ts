import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { prettyJson } from "@/lib/utils";

export async function GET() {
  try {
    const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString();
    
    const { data: successLogs, error: successError } = await supabase
      .from("usage_logs")
      .select("*")
      .eq("is_success", true)
      .gte("created_at", fiveHoursAgo)
      .order("created_at", { ascending: false })
      .limit(20);

    const { data: errorLogs, error: errorError } = await supabase
      .from("usage_logs")
      .select("*")
      .eq("is_success", false)
      .gte("created_at", fiveHoursAgo)
      .order("created_at", { ascending: false })
      .limit(20);

    if (successError) throw successError;
    if (errorError) throw errorError;

    const formatLogs = (logs: any[]) => logs?.map(log => ({
      ...log,
      router: log.endpoint,
      method: log.method,
      status: log.status_code,
      user_agent: log.user_agent,
      ip_address: log.ip_address,
      timestamp: new Date(log.created_at).toLocaleTimeString(),
      date_now: new Date(log.created_at).toLocaleString()
    })) || [];

    return prettyJson({
      success: true,
      latest_command: formatLogs(successLogs),
      latest_error: formatLogs(errorLogs)
    });
  } catch (error) {
    console.error("Error fetching logs:", error);
    return prettyJson({ error: "Failed to fetch logs" }, 500);
  }
}
