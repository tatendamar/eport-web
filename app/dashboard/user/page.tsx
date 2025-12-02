import { getSupabaseServer } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function UserDashboard() {
  const supabase = getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: assets } = await supabase
    .from("assets")
    .select("id,name,created_at")
    .eq("created_by", user.id)
    .order("created_at", { ascending: false });

  return (
    <main className="space-y-6">
      <section className="flex items-center justify-end">
        {/* Logout action */}
        <form action={async () => { "use server"; const supabase = getSupabaseServer(); await supabase.auth.signOut(); redirect("/login"); }}>
          <button className="rounded-md border px-3 py-1 text-sm hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900">Logout</button>
        </form>
      </section>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Your Assets</h2>
        <Link className="rounded-md bg-gray-900 px-4 py-2 text-white dark:bg-gray-100 dark:text-gray-900" href="/assets/new">New Asset</Link>
      </div>
      <ul className="space-y-2">
        {assets?.length ? (
          assets.map((a) => (
            <li key={a.id} className="rounded-md border p-4 text-sm dark:border-gray-800">
              <div className="font-medium">{a.name}</div>
              <div className="text-gray-500">Created {new Date(a.created_at as any).toLocaleString()}</div>
            </li>
          ))
        ) : (
          <li className="text-sm text-gray-500">No assets yet.</li>
        )}
      </ul>
    </main>
  );
}
