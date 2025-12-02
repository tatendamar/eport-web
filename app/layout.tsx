import "./globals.css";
import type { ReactNode } from "react";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/Button";

export const metadata = {
  title: "Asset Manager",
  description: "Eport Asset Manager using Next.js + Supabase",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  async function logout() {
    "use server";
    const supabase = getSupabaseServer();
    await supabase.auth.signOut();
    redirect("/login");
  }
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <header className="sticky top-0 z-30 border-b bg-white/80 backdrop-blur">
          <nav className="max-w-6xl mx-auto flex items-center justify-between p-4">
            <a href="/" className="text-lg font-semibold tracking-tight">Asset Manager</a>
            <div className="flex items-center gap-3">
              {!user ? (
                <a href="/login" className="text-sm text-gray-700 hover:text-gray-900">Login</a>
              ) : (
                <form action={logout}>
                  <Button variant="secondary" type="submit">Logout</Button>
                </form>
              )}
              <a href="/dashboard" className="inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium bg-blue-600 text-white hover:bg-blue-700">Dashboard</a>
            </div>
          </nav>
        </header>
        <main className="max-w-6xl mx-auto p-4">{children}</main>
        <footer className="mt-12 border-t">
          <div className="max-w-6xl mx-auto p-4 text-sm text-gray-600">© {new Date().getFullYear()} Asset Manager</div>
        </footer>
      </body>
    </html>
  );
}
