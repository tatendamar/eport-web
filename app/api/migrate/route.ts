import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// This endpoint initializes the database schema if it doesn't exist
// It should only be called once during initial setup
export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    return NextResponse.json({ error: "Missing Supabase credentials" }, { status: 500 });
  }

  // Simple auth check - require a secret token
  const authHeader = request.headers.get("authorization");
  const expectedToken = process.env.MIGRATION_SECRET || serviceKey.substring(0, 32);
  
  if (authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const results: Record<string, unknown> = {};

  try {
    // Check if profiles table exists
    const { error: checkErr } = await admin.from("profiles").select("user_id").limit(1);
    
    if (checkErr?.message?.includes("does not exist")) {
      results.needsMigration = true;
      
      // Run schema creation via RPC (we need to create the tables via SQL)
      // Since we can't run raw SQL via the JS client, we'll create objects one by one
      
      // Unfortunately, Supabase JS client cannot create tables directly.
      // The migrations must be run via psql or the SQL Editor.
      
      results.message = "Database schema does not exist. Please run migrations via Supabase Dashboard SQL Editor or GitHub Actions.";
      results.migrationFile = "/supabase/combined_migration.sql";
      
      return NextResponse.json(results, { status: 503 });
    }

    results.tablesExist = true;

    // Check if functions exist
    const { error: fn1Err } = await admin.rpc("set_first_admin_by_id", { p_user_id: "00000000-0000-0000-0000-000000000000" });
    results.setFirstAdminByIdExists = !fn1Err?.message?.includes("does not exist");

    const { error: fn2Err } = await admin.rpc("set_first_admin_by_email", { p_email: "test@test.com" });
    results.setFirstAdminByEmailExists = !fn2Err?.message?.includes("does not exist");

    // Get profile count
    const { count } = await admin.from("profiles").select("user_id", { count: "exact", head: true });
    results.profileCount = count;

    results.status = "ready";
    return NextResponse.json(results);

  } catch (e) {
    results.error = e instanceof Error ? e.message : String(e);
    return NextResponse.json(results, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: "POST to this endpoint with Authorization header to check/run migrations",
    usage: "curl -X POST -H 'Authorization: Bearer YOUR_TOKEN' https://your-app.vercel.app/api/migrate"
  });
}
