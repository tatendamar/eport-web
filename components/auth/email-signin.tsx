"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function EmailSignIn() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [debug, setDebug] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    try {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        throw new Error("Supabase env vars missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
      }
      const supabase = getSupabaseClient();
      let { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false,
          emailRedirectTo: undefined,
        },
      });

      // Handle case where user does not yet exist and signups are blocked for this call.
      if (error && /Signups not allowed for otp/i.test(error.message)) {
        // If self-signup allowed via env flag, retry allowing creation.
        if (process.env.NEXT_PUBLIC_ALLOW_SELF_SIGNUP === "1") {
          const retry = await supabase.auth.signInWithOtp({
            email,
            options: { shouldCreateUser: true, emailRedirectTo: undefined },
          });
            error = retry.error;
        } else {
          throw new Error(
            "Account not found. Signups are disabled. Ask an admin to invite you or set NEXT_PUBLIC_ALLOW_SELF_SIGNUP=1 in .env.local to enable self signup."
          );
        }
      }
      if (error) throw error;
      setStatus("OTP sent. Check email and enter the 6-digit code below.");
      // Navigate to show OTP form and prefill email
      router.push(`/login?sent=1&email=${encodeURIComponent(email)}`);
      setDebug(null);
    } catch (err: any) {
      setStatus(err.message || "Sign-in failed");
      setDebug(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="space-y-1">
        <label htmlFor="email" className="text-sm font-medium">Email</label>
        <Input
          id="email"
          type="email"
          required
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? "Sending..." : "Send OTP"}
      </Button>
      {status && <p className="text-sm text-gray-500">{status}</p>}
      {debug && <p className="text-xs text-gray-400">{debug}</p>}
    </form>
  );
}
