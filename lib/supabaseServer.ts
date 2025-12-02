import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export function getSupabaseServer() {
  const cookieStore = cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: any) {
        // Next.js only allows cookie mutations inside Server Actions/Route Handlers.
        // Attempt; if not allowed, swallow the error to avoid runtime crashes.
        try {
          cookieStore.set({ name, value, ...options });
        } catch {
          // no-op outside of mutating contexts
        }
      },
      remove(name: string, options: any) {
        try {
          cookieStore.set({ name, value: "", ...options });
        } catch {
          // no-op outside of mutating contexts
        }
      },
    },
  });
}

// Helper for Server Actions/Route Handlers where cookie mutations are allowed.
// Usage: call within the action/handler to guarantee cookies.set/remove works.
export function getSupabaseServerForMutation() {
  return getSupabaseServer();
}
