import { getSupabaseServer } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

// Allow initial admin signup only when there are absolutely no user profiles yet.
// This ensures the first created account becomes the admin, even if not explicitly role='admin' yet.
async function noUserExists() {
  const supabase = getSupabaseServer();
  const { count } = await supabase.from("profiles").select("user_id", { count: "exact", head: true });
  return (count ?? 0) === 0;
}

export const metadata = {
  title: "Admin Signup",
};

export default async function AdminSignupPage() {
  // If any user exists already, block access to initial admin signup.
  const allow = await noUserExists();
  if (!allow) redirect("/login");

  // OTP self-signup for the first admin (no service role required)
  async function createAdmin(formData: FormData) {
    "use server";
    const email = String(formData.get("email") || "").trim().toLowerCase();
    if (!email) return;
    const supabase = getSupabaseServer();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true, emailRedirectTo: undefined },
    });
    if (error) {
      redirect("/admin-signup?error=" + encodeURIComponent(error.message));
    }
    // Instruct user to check inbox; after OTP verify or callback, set_first_admin will promote them
    redirect("/admin-signup?success=1");
  }

  return (
    <main className="space-y-6 max-w-lg">
      <h1 className="text-2xl font-semibold">Initial Admin Signup</h1>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        This application has no users yet. Enter an email below to create and invite the first (admin) account. The
        recipient must click the verification link before logging in with OTP on the normal login page.
      </p>
      <form action={createAdmin} className="space-y-4">
        <div className="space-y-1">
          <label htmlFor="email">Admin Email</label>
          <input id="email" name="email" type="email" required placeholder="admin@example.com" />
        </div>
        <button className="rounded-md bg-gray-900 px-4 py-2 text-white dark:bg-gray-100 dark:text-gray-900">
          Send Invite
        </button>
      </form>
      <div className="space-y-2 text-xs text-gray-500">
        <p>Prerequisites:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Email auth enabled in Supabase.</li>
          <li>Email template includes <code>{'{{ .Token }}'}</code> to show the OTP.</li>
        </ul>
      </div>
    </main>
  );
}
