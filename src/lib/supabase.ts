import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

export async function incrementStat(field: "total_requests" | "total_visitors" | "total_success" | "total_errors" | "total_hits") {
  if (field === "total_hits") field = "total_requests";
  try {
    const { data: currentData } = await supabase
      .from("statistics")
      .select(field)
      .eq("id", 1)
      .single();
    
    if (currentData) {
      await supabase
        .from("statistics")
        .update({ 
          [field]: (currentData[field] || 0) + 1,
          updated_at: new Date().toISOString()
        })
        .eq("id", 1);
    }
  } catch (err) {
    console.error(`Error incrementing stat ${field}:`, err);
  }
}

export async function logUsage(logData: {
  endpoint: string;
  method: string;
  status_code: number;
  is_success: boolean;
  error_message?: string | null;
  ip_address: string;
  user_agent?: string | null;
  response_time_ms?: number;
}) {
  try {
    await supabase.from("usage_logs").insert({
      ...logData,
      created_at: new Date().toISOString()
    });

    await incrementStat("total_requests");
    if (logData.is_success) {
      await incrementStat("total_success");
    } else {
      await incrementStat("total_errors");
    }
  } catch (err) {
    console.error("Error logging usage:", err);
  }
}

export async function logApiRequest(logData: {
  ip_address: string;
  method: string;
  router: string;
  status: number;
  user_agent: string;
}) {
  try {
    await supabase.from("usage_logs").insert({
      endpoint: logData.router,
      method: logData.method,
      status_code: logData.status,
      is_success: logData.status >= 200 && logData.status < 400,
      error_message: logData.status >= 400 ? `HTTP ${logData.status}` : null,
      ip_address: logData.ip_address,
      user_agent: logData.user_agent,
      created_at: new Date().toISOString()
    });
  } catch (err) {
    console.error("Error logging API request:", err);
  }
}
