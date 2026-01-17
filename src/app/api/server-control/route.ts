import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const VALID_TOKEN = "bn-ANd9GcTTcY16BnOi1zJPxCFAwh3G_AjkpE8GzY4ZPkJbzFLh9i0cyCLKu4_tzy4s";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, token, reason } = body;

    if (token !== VALID_TOKEN) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    switch (action) {
      case "down": {
        const { error } = await supabase
          .from("server_status")
          .update({
            is_down: true,
            down_reason: reason || "Server maintenance",
            updated_at: new Date().toISOString(),
          })
          .eq("id", 1);

        if (error) {
          return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: "Server has been shut down" });
      }

      case "up": {
        const { error } = await supabase
          .from("server_status")
          .update({
            is_down: false,
            down_reason: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", 1);

        if (error) {
          return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: "Server is now online" });
      }

      case "logout_all": {
        const { error } = await supabase
          .from("server_status")
          .update({
            force_logout: true,
            logout_timestamp: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", 1);

        if (error) {
          return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        setTimeout(async () => {
          await supabase
            .from("server_status")
            .update({ force_logout: false })
            .eq("id", 1);
        }, 5000);

        return NextResponse.json({ success: true, message: "All users have been logged out" });
      }

      case "update_system": {
        const newMemoryUsed = 9.95 + (Math.random() * 2 - 1);
        const { error } = await supabase
          .from("server_status")
          .update({
            memory_used_gb: Math.max(5, Math.min(20, newMemoryUsed)).toFixed(2),
            updated_at: new Date().toISOString(),
          })
          .eq("id", 1);

        if (error) {
          return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: "System updated successfully" });
      }

      default:
        return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Server control error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
