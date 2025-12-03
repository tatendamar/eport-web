import EmailSignIn from "@/components/auth/email-signin";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Card, CardBody } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { createClient } from "@supabase/supabase-js";

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
    // Promote only when explicitly flagged (from admin-signup flow)
    if (initial === "1") {
      const { count } = await supabase
        .from("profiles")
        .select("user_id", { count: "exact", head: true });
      if ((count ?? 0) === 0) {
        // Get the freshly authenticated user
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (currentUser?.id) {
          // Prefer service role to bypass any RLS issues on profiles
          const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
          const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
          if (!url || !serviceKey) {
            console.warn("[first-admin] Missing service-role env: URL or KEY not set");
          }
          if (url && serviceKey) {
            const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
            // Try concrete RPC by email if function exists
            if (currentUser.email) {
              const { error: rpcEmailErr } = await admin.rpc("set_first_admin_by_email", { p_email: currentUser.email });
              if (!rpcEmailErr) {
                // Double-check the role was set
                const { data: row } = await admin
                  .from("profiles")
                  .select("role")
                  .eq("user_id", currentUser.id)
                  .maybeSingle();
                if (row?.role === "admin") {
                  return redirect("/dashboard?firstAdmin=1");
                }
              } else {
                console.warn("[first-admin] set_first_admin_by_email error", rpcEmailErr?.message);
              }
            }
            // Upsert to be idempotent
            const { error: srError } = await admin
              .from("profiles")
              .upsert({ user_id: currentUser.id, role: "admin" }, { onConflict: "user_id" });
            if (!srError) {
              // Verify role is set; enforce update if needed
              const { data: row, error: selErr } = await admin
                .from("profiles")
                .select("role")
                .eq("user_id", currentUser.id)
                .maybeSingle();
              if (selErr) {
                console.warn("[first-admin] select role error", selErr?.message);
              }
              if (row?.role !== "admin") {
                const { error: updErr1 } = await admin
                  .from("profiles")
                  .update({ role: "admin" })
                  .eq("user_id", currentUser.id);
                if (updErr1) {
                  console.warn("[first-admin] enforce admin update error", updErr1?.message);
                }
              }
              // Final check using function if available
              try {
                const { data: isAdmin, error: rpcErr } = await admin.rpc("is_admin", { p_user_id: currentUser.id });
                if (rpcErr) {
                  console.warn("[first-admin] is_admin rpc error", rpcErr?.message);
                }
                if (isAdmin) {
                  return redirect("/dashboard?firstAdmin=1");
                }
              } catch {
                // fallback to redirect after update
                return redirect("/dashboard?firstAdmin=1");
              }
              return redirect("/dashboard?firstAdmin=1");
            }
            if (srError) {
              console.warn("[first-admin] service-role upsert error", srError?.message);
            }
          }
          // Fallback: try normal insert (requires insert RLS policy)
          const { error: insertError } = await supabase
            .from("profiles")
            .insert({ user_id: currentUser.id, role: "admin" });
          if (!insertError) {
            return redirect("/dashboard?firstAdmin=1");
          }
          if (insertError) {
            console.warn("[first-admin] normal insert error", insertError?.message);
          }
          // As a last resort in production, try service-role update
          if (url && serviceKey) {
            const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
            const { error: updErr } = await admin
              .from("profiles")
              .update({ role: "admin" })
              .eq("user_id", currentUser.id);
            if (!updErr) {
              return redirect("/dashboard?firstAdmin=1");
            }
            if (updErr) {
              console.warn("[first-admin] last-resort update error", updErr?.message);
            }
          }
        }
      }
    }
    // Always return immediately to avoid further processing
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
