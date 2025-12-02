import EmailSignIn from "@/components/auth/email-signin";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export default async function LoginPage() {
  const supabase = getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  async function verifyOtp(formData: FormData) {
    "use server";
    const email = String(formData.get("email") || "").trim();
    const token = String(formData.get("token") || "").trim();
    if (!email || !token) return;
    const supabase = getSupabaseServer();
    const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
    if (error) {
      redirect(`/login?error=${encodeURIComponent(error.message)}`);
    }
    // Ensure first user is promoted to admin (no-op when profiles already has rows)
    await supabase.rpc("set_first_admin");
    revalidatePath("/dashboard");
    redirect("/dashboard");
  }

  return (
    <main className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold">Welcome</h2>
        <p className="text-sm text-gray-500">Sign in with your email to continue.</p>
      </div>
      <EmailSignIn />
      <div className="space-y-2 pt-6">
        <h3 className="text-lg font-semibold">Enter OTP code</h3>
        <p className="text-sm text-gray-500">Check your inbox for the 6-digit code and paste it here.</p>
        <form action={verifyOtp} className="grid max-w-md grid-cols-1 gap-3 sm:grid-cols-2">
          <input name="email" type="email" placeholder="you@example.com" required className="sm:col-span-2" />
          <input name="token" inputMode="numeric" pattern="[0-9]{6}" placeholder="6-digit code" required />
          <button className="bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900">Verify</button>
        </form>
      </div>
    </main>
  );
}
