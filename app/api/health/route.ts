import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Extract project ref from URL
  const projectRef = url?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] || "unknown";

  const checks: Record<string, unknown> = {
    projectRef,
    hasUrl: !!url,
    hasAnonKey: !!anonKey,
    hasServiceKey: !!serviceKey,
    serviceKeyLength: serviceKey?.length || 0,
  };

  // Test service-role connection
  if (url && serviceKey) {
    try {
      const admin = createClient(url, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      // Check profiles count
      const { count, error: countErr } = await admin
        .from("profiles")
        .select("user_id", { count: "exact", head: true });

      checks.profilesCount = count;
      checks.profilesError = countErr?.message || null;

      // Check if functions exist
      const { error: fnErr1 } = await admin.rpc("set_first_admin_by_id", { p_user_id: "00000000-0000-0000-0000-000000000000" });
      checks.setFirstAdminByIdExists = !fnErr1?.message?.includes("does not exist");

      const { error: fnErr2 } = await admin.rpc("set_first_admin_by_email", { p_email: "test@test.com" });
      checks.setFirstAdminByEmailExists = !fnErr2?.message?.includes("does not exist");

    } catch (e) {
      checks.connectionError = e instanceof Error ? e.message : String(e);
    }
  }

  return NextResponse.json(checks);
}
