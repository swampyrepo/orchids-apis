import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const noCacheHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  "Pragma": "no-cache",
  "Expires": "0",
};

export async function GET() {
  const { data, error } = await supabase
    .from("maintenance")
    .select("enabled, end_time")
    .eq("id", 1)
    .single();

  if (error) {
    return NextResponse.json({ enabled: false, endTime: null }, { headers: noCacheHeaders });
  }

  if (data.enabled && data.end_time) {
    const endDate = new Date(data.end_time);
    if (new Date() > endDate) {
      await supabase
        .from("maintenance")
        .update({ enabled: false, end_time: null, updated_at: new Date().toISOString() })
        .eq("id", 1);
      return NextResponse.json({ enabled: false, endTime: null }, { headers: noCacheHeaders });
    }
  }

  return NextResponse.json({ enabled: data.enabled, endTime: data.end_time }, { headers: noCacheHeaders });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { enabled, endTime } = body;

  const { data, error } = await supabase
    .from("maintenance")
    .update({ enabled, end_time: endTime, updated_at: new Date().toISOString() })
    .eq("id", 1)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: noCacheHeaders });
  }

  return NextResponse.json({ enabled: data.enabled, endTime: data.end_time }, { headers: noCacheHeaders });
}
