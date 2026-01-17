import { NextRequest, NextResponse } from "next/server";
import { supabase, incrementStat } from "@/lib/supabase";
import { prettyJson } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const isVisitor = searchParams.get("visitor") === "true";

  try {
    if (isVisitor) {
      await incrementStat("total_visitors");
    }

    const { data, error } = await supabase
      .from("statistics")
      .select("total_requests, total_visitors, total_success, total_errors")
      .eq("id", 1)
      .single();

    if (error) throw error;

      const totalSuccess = Number(data?.total_success || 0);
      const totalErrors = Number(data?.total_errors || 0);
      const total = totalSuccess + totalErrors;
      const percentageRate = total > 0 ? ((totalSuccess / total) * 100).toFixed(1) : "0";

      const stats = {
        total_hits: data?.total_requests?.toString() || "0",
        total_visitors: data?.total_visitors?.toString() || "0",
        total_success: data?.total_success?.toString() || "0",
        total_errors: data?.total_errors?.toString() || "0",
        percentage_rate: percentageRate,
      };

      return prettyJson(stats);
  } catch (error) {
    console.error("Error fetching stats:", error);
    return prettyJson({ error: "Failed to fetch stats" }, 500);
  }
}
