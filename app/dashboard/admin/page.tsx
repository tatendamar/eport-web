import { getSupabaseServer } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";

async function requireAdmin() {
  const supabase = getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data } = await supabase.from("profiles").select("role").eq("user_id", user.id).maybeSingle();
  if (data?.role !== "admin") redirect("/dashboard/user");
  return { supabase, user } as const;
}

export default async function AdminDashboard() {
  const { supabase } = await requireAdmin();

  const [{ data: categories }, { data: departments }, { data: assets }] = await Promise.all([
    supabase.from("categories").select("id,name"),
    supabase.from("departments").select("id,name"),
    supabase.from("assets").select("id,name,created_at")
  ]);

  async function createCategory(formData: FormData) {
    "use server";
    const name = String(formData.get("name") || "").trim();
    if (!name) return;
    const supabase = getSupabaseServer();
    await supabase.from("categories").insert({ name }).select();
    revalidatePath("/dashboard/admin");
  }

  async function createDepartment(formData: FormData) {
    "use server";
    const name = String(formData.get("name") || "").trim();
    if (!name) return;
    const supabase = getSupabaseServer();
    await supabase.from("departments").insert({ name }).select();
    revalidatePath("/dashboard/admin");
  }

  async function deleteAsset(formData: FormData) {
    "use server";
    const id = String(formData.get("id") || "");
    if (!id) return;
    const supabase = getSupabaseServer();
    await supabase.from("assets").delete().eq("id", id).select();
    revalidatePath("/dashboard/admin");
  }

  async function inviteUser(formData: FormData) {
    "use server";
    const email = String(formData.get("email") || "").trim();
    if (!email) return;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) return; // optional: skip if not configured
    const admin = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
    await admin.auth.admin.inviteUserByEmail(email);
  }

  async function makeAdmin(formData: FormData) {
    "use server";
    const email = String(formData.get("email") || "").trim();
    if (!email) return;
    const supabase = getSupabaseServer();
    const { error } = await supabase.rpc("set_admin_by_email", { p_email: email });
    if (!error) {
      revalidatePath("/dashboard/admin");
    }
  }

  return (
    <main className="space-y-8">
      <h2 className="text-2xl font-semibold">Admin Dashboard</h2>

      <section className="flex items-center justify-end">
        {/* Logout action */}
        <form action={async () => { "use server"; const supabase = getSupabaseServer(); await supabase.auth.signOut(); redirect("/login"); }}>
          <button className="rounded-md border px-3 py-1 text-sm hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900">Logout</button>
        </form>
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold">Quick Links</h3>
        <div className="flex flex-wrap gap-3">
          <Link className="rounded-md bg-gray-900 px-4 py-2 text-white dark:bg-gray-100 dark:text-gray-900" href="/assets/new">Create Asset</Link>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="space-y-3 rounded-md border p-4 dark:border-gray-800">
          <h3 className="text-lg font-semibold">Create Category</h3>
          <form action={createCategory} className="flex gap-2">
            <input name="name" placeholder="Category name" required />
            <button className="bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900">Add</button>
          </form>
          <ul className="list-disc pl-6 text-sm">
            {categories?.map((c) => (
              <li key={c.id}>{c.name}</li>
            )) || <li>None</li>}
          </ul>
        </div>
        <div className="space-y-3 rounded-md border p-4 dark:border-gray-800">
          <h3 className="text-lg font-semibold">Create Department</h3>
          <form action={createDepartment} className="flex gap-2">
            <input name="name" placeholder="Department name" required />
            <button className="bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900">Add</button>
          </form>
          <ul className="list-disc pl-6 text-sm">
            {departments?.map((d) => (
              <li key={d.id}>{d.name}</li>
            )) || <li>None</li>}
          </ul>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold">Categories</h3>
        <ul className="list-disc pl-6 text-sm">
          {categories?.map((c) => (
            <li key={c.id}>{c.name}</li>
          )) || <li>None</li>}
        </ul>
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold">Departments</h3>
        <ul className="list-disc pl-6 text-sm">
          {departments?.map((d) => (
            <li key={d.id}>{d.name}</li>
          )) || <li>None</li>}
        </ul>
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold">All Assets</h3>
        <ul className="space-y-2 text-sm">
          {assets?.length ? assets.map((a) => (
            <li key={a.id} className="flex items-center justify-between rounded-md border p-3 dark:border-gray-800">
              <div>
                <div className="font-medium">{a.name}</div>
                <div className="text-gray-500">{new Date(a.created_at as any).toLocaleString()}</div>
              </div>
              <form action={deleteAsset}>
                <input type="hidden" name="id" value={a.id as any} />
                <button className="rounded-md bg-red-600 px-3 py-1 text-white hover:bg-red-700">Delete</button>
              </form>
            </li>
          )) : (<li className="text-gray-500">None</li>)}
        </ul>
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold">Promote User to Admin</h3>
        <p className="text-sm text-gray-500">Enter the user&apos;s email to grant admin role. Requires you to be an admin.</p>
        <form action={makeAdmin} className="flex max-w-md gap-2">
          <input type="email" name="email" placeholder="user@example.com" required />
          <button className="bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900">Make Admin</button>
        </form>
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold">Invite User</h3>
        <p className="text-sm text-gray-500">Requires `SUPABASE_SERVICE_ROLE_KEY` set on the server.</p>
        <form action={inviteUser} className="flex max-w-md gap-2">
          <input type="email" name="email" placeholder="user@example.com" required />
          <button className="bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900">Invite</button>
        </form>
      </section>
    </main>
  );
}
