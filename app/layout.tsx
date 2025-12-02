import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "Asset Manager",
  description: "Eport Asset Manager using Next.js + Supabase",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <div className="mx-auto max-w-5xl p-4 sm:p-6 lg:p-8">
          <header className="mb-6 flex items-center justify-between">
            <h1 className="text-xl font-semibold">Asset Manager</h1>
            <nav className="text-sm text-gray-500">
              <a href="/login">Login</a>
              <span className="px-2">•</span>
              <a href="/dashboard">Dashboard</a>
            </nav>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
