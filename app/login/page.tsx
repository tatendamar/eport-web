import EmailSignIn from "@/components/auth/email-signin";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Card, CardBody } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

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
      await supabase.rpc("set_first_admin");
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
