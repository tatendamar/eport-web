import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const { userId, email } = await request.json();
    
    if (!userId && !email) {
      return NextResponse.json({ error: "userId or email required" }, { status: 400 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceKey) {
      return NextResponse.json({ error: "Missing env vars" }, { status: 500 });
    }

    // Use the REST API directly with raw SQL via postgres functions
    const adminClient = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      db: { schema: "public" },
    });

    // First check: count profiles using RPC (bypasses schema cache for functions)
    // We'll use a simple count via the function
    const { data: countResult, error: countErr } = await adminClient.rpc("set_first_admin_by_id", { 
      p_user_id: userId 
    });

    console.log("[first-admin-api] set_first_admin_by_id result:", countResult, "error:", countErr?.message);

    if (countResult === true) {
      return NextResponse.json({ success: true, method: "rpc_by_id" });
    }

    if (email) {
      const { data: emailResult, error: emailErr } = await adminClient.rpc("set_first_admin_by_email", { 
        p_email: email 
      });

      console.log("[first-admin-api] set_first_admin_by_email result:", emailResult, "error:", emailErr?.message);

      if (emailResult) {
        return NextResponse.json({ success: true, method: "rpc_by_email", userId: emailResult });
      }
    }

    // If RPC fails due to cache, we need another approach
    // Let's try using Supabase's postgres connection string directly
    // But for now, return the error details
    return NextResponse.json({ 
      success: false, 
      error: countErr?.message || "RPC returned false - either profiles exist or function failed",
      hint: "Check if profiles table has any rows already"
    });

  } catch (e) {
    console.error("[first-admin-api] Error:", e);
    return NextResponse.json({ 
      error: e instanceof Error ? e.message : "Unknown error" 
    }, { status: 500 });
  }
}
