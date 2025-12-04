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
    serviceKeyPrefix: serviceKey?.substring(0, 20) + "...",
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

      // Try to insert a test and rollback to verify write access
      const testId = "00000000-0000-0000-0000-000000000001";
      const { error: insertTestErr } = await admin
        .from("profiles")
        .upsert({ user_id: testId, role: "admin" as const }, { onConflict: "user_id" });
      checks.canWriteProfiles = !insertTestErr;
      checks.writeError = insertTestErr?.message || null;
      
      // Clean up test row
      if (!insertTestErr) {
        await admin.from("profiles").delete().eq("user_id", testId);
      }

      // Check if functions exist
      const { data: fn1Data, error: fnErr1 } = await admin.rpc("set_first_admin_by_id", { p_user_id: testId });
      checks.setFirstAdminByIdExists = !fnErr1?.message?.includes("does not exist");
      checks.setFirstAdminByIdResult = fn1Data;
      checks.setFirstAdminByIdError = fnErr1?.message || null;

      const { data: fn2Data, error: fnErr2 } = await admin.rpc("set_first_admin_by_email", { p_email: "test@test.com" });
      checks.setFirstAdminByEmailExists = !fnErr2?.message?.includes("does not exist");
      checks.setFirstAdminByEmailResult = fn2Data;
      checks.setFirstAdminByEmailError = fnErr2?.message || null;

    } catch (e) {
      checks.connectionError = e instanceof Error ? e.message : String(e);
    }
  }

  return NextResponse.json(checks, { 
    headers: { "Cache-Control": "no-store" } 
  });
}
