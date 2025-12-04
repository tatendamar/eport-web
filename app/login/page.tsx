import EmailSignIn from "@/components/auth/email-signin";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";
import { Card, CardBody } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { createClient } from "@supabase/supabase-js";

// Helper to get service-role admin client
function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.warn("[first-admin] Missing env: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    return null;
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export default async function LoginPage({ searchParams }: { searchParams?: { sent?: string; email?: string; initial?: string } }) {
  const supabase = getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  async function verifyOtp(formData: FormData) {
    "use server";
    const email = String(formData.get("email") || "").trim();
    const token = String(formData.get("token") || "").trim();
    const initial = String(formData.get("initial") || "").trim();
    if (!email || !token) return;

    const supabase = getSupabaseServer();
    const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
    if (error) {
      return redirect(`/login?error=${encodeURIComponent(error.message)}`);
    }

    // First-admin promotion: only when explicitly flagged (from admin-signup flow)
    if (initial === "1") {
      console.log("[first-admin] Attempting first admin promotion for:", email);

      // Get the current user from session FIRST - this is the most reliable source
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      console.log("[first-admin] Current user from session:", currentUser?.id, currentUser?.email);

      const adminClient = getAdminClient();
      if (adminClient && currentUser?.id) {
        // Check if any profiles exist using service-role (bypasses RLS)
        const { count, error: countErr } = await adminClient
          .from("profiles")
          .select("user_id", { count: "exact", head: true });

        if ((count ?? 0) === 0) {
          const { data: rpcResult, error: rpcErr } = await adminClient.rpc("set_first_admin_by_id", { p_user_id: currentUser.id });
          if (!rpcErr && rpcResult === true) {
            return redirect("/dashboard?firstAdmin=1");
          }
         

          // Method 2: Direct upsert with service-role client
          console.log("[first-admin] Trying direct upsert for user_id:", currentUser.id);
          const { error: upsertErr } = await adminClient
            .from("profiles")
            .upsert({ user_id: currentUser.id, role: "admin" }, { onConflict: "user_id" });
          if (!upsertErr) {
            console.log("[first-admin] SUCCESS via direct upsert");
            return redirect("/dashboard?firstAdmin=1");
          }
          console.warn("[first-admin] upsert error:", upsertErr.message);

          // Method 3: Try insert (in case upsert has issues)
          console.log("[first-admin] Trying direct insert");
          const { error: insertErr } = await adminClient
            .from("profiles")
            .insert({ user_id: currentUser.id, role: "admin" });
          if (!insertErr) {
            console.log("[first-admin] SUCCESS via direct insert");
            return redirect("/dashboard?firstAdmin=1");
          }
          console.warn("[first-admin] insert error:", insertErr.message);

          // Method 4: Try the email-based RPC as fallback
          if (currentUser.email) {
            console.log("[first-admin] Trying set_first_admin_by_email RPC with:", currentUser.email);
            const { data: emailResult, error: emailErr } = await adminClient.rpc("set_first_admin_by_email", { p_email: currentUser.email });
            if (!emailErr && emailResult) {
              console.log("[first-admin] SUCCESS via set_first_admin_by_email RPC");
              return redirect("/dashboard?firstAdmin=1");
            }
           
          }

          // If all methods failed, check if profile was created anyway
          const { data: finalCheck } = await adminClient
            .from("profiles")
            .select("role")
            .eq("user_id", currentUser.id)
            .maybeSingle();
          if (finalCheck?.role === "admin") {
            console.log("[first-admin] SUCCESS - admin profile exists after all attempts");
            return redirect("/dashboard?firstAdmin=1");
          }

          console.error("[first-admin] FAILED - could not create admin profile after all attempts");
        } else {
          console.log("[first-admin] Profiles already exist, skipping promotion");
        }
      } else if (!adminClient) {
        console.error("[first-admin] No admin client available - check SUPABASE_SERVICE_ROLE_KEY");
      } else if (!currentUser?.id) {
        console.error("[first-admin] No current user ID from session after OTP verification");
      }
    }

    return redirect("/dashboard");
  }

  return (
    <main className="space-y-6 max-w-2xl">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">Welcome</h2>
        <p className="text-sm text-gray-500">Sign in with your email to continue.</p>
      </div>
      {searchParams?.sent !== "1" && (
        <Card>
          <CardBody>
            <EmailSignIn />
          </CardBody>
        </Card>
      )}
      {searchParams?.sent === "1" && (
        <Card>
          <CardBody>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Enter OTP code</h3>
              <p className="text-sm text-gray-500">Check your inbox for the 6-digit code and paste it here.</p>
            </div>
            <form action={verifyOtp} className="mt-3 grid max-w-md grid-cols-1 gap-3 sm:grid-cols-2">
              <input type="hidden" name="initial" value={searchParams?.initial === "1" ? "1" : ""} />
              <Input name="email" type="email" placeholder="you@example.com" required defaultValue={searchParams?.email || ""} className="sm:col-span-2" />
              <Input name="token" inputMode="numeric" pattern="[0-9]{6}" placeholder="6-digit code" required />
              <Button type="submit" className="sm:col-span-2">Verify</Button>
            </form>
          </CardBody>
        </Card>
      )}
    </main>
  );
}
