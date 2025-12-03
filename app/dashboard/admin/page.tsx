import { getSupabaseServer } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { Card, CardBody } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { SubmitButton } from "@/components/ui/SubmitButton";

async function requireAdmin() {
  const supabase = getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data } = await supabase.from("profiles").select("role").eq("user_id", user.id).maybeSingle();
  if (data?.role !== "admin") redirect("/dashboard/user");
  return { supabase, user } as const;
}

export default async function AdminDashboard({ searchParams }: { searchParams?: { firstAdmin?: string } }) {
  const { supabase } = await requireAdmin();

  const [{ data: categories }, { data: departments }, { data: assets }] = await Promise.all([
    supabase.from("categories").select("id,name"),
    supabase.from("departments").select("id,name"),
    supabase.from("assets").select("id,name,cost,created_at,categories(name),departments(name)")
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
      <h2 className="text-2xl font-semibold tracking-tight">Admin Dashboard</h2>
      {searchParams?.firstAdmin === "1" && (
        <div className="rounded-md border border-green-300 bg-green-50 p-3 text-sm text-green-700">
          Success: You have been promoted as the first admin.
        </div>
      )}

      <section className="space-y-3">
        <h3 className="text-lg font-semibold">Quick Links</h3>
        <div className="flex flex-wrap gap-3">
          <Link className="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium bg-blue-600 text-white hover:bg-blue-700" href="/assets/new">Create Asset</Link>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <CardBody>
            <h3 className="text-lg font-semibold">Create Category</h3>
            <form action={createCategory} className="mt-2 flex gap-2">
              <Input name="name" placeholder="Category name" required />
              <SubmitButton pendingText="Adding...">Add</SubmitButton>
            </form>
            <ul className="mt-3 list-disc pl-6 text-sm">
              {categories?.map((c) => (
                <li key={c.id}>{c.name}</li>
              )) || <li>None</li>}
            </ul>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <h3 className="text-lg font-semibold">Create Department</h3>
            <form action={createDepartment} className="mt-2 flex gap-2">
              <Input name="name" placeholder="Department name" required />
              <SubmitButton pendingText="Adding...">Add</SubmitButton>
            </form>
            <ul className="mt-3 list-disc pl-6 text-sm">
              {departments?.map((d) => (
                <li key={d.id}>{d.name}</li>
              )) || <li>None</li>}
            </ul>
          </CardBody>
        </Card>
      </section>

      <Card>
        <CardBody>
          <h3 className="text-lg font-semibold">All Assets</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {assets?.length ? assets.map((a) => (
              
              <li key={a.id} className="flex items-center justify-between rounded-md border p-3 dark:border-gray-800">
                <div>
                  <div className="font-medium">{a.name}</div>
                  <div className="text-gray-500">Category: {Array.isArray((a as any).categories) ? ((a as any).categories[0]?.name ?? "-") : (((a as any).categories?.name) ?? "-")}</div>
                  <div className="text-gray-500">Department: {Array.isArray((a as any).departments) ? ((a as any).departments[0]?.name ?? "-") : (((a as any).departments?.name) ?? "-")}</div>
                  <div className="text-gray-500">Cost: {typeof a.cost === "number" ? a.cost.toFixed(2) : a.cost}</div>
                  <div className="text-gray-500">{new Date(a.created_at as any).toLocaleString()}</div>
                </div>
                <form action={deleteAsset}>
                  <input type="hidden" name="id" value={a.id as any} />
                  <SubmitButton className="bg-red-600 hover:bg-red-700" pendingText="Deleting...">Delete</SubmitButton>
                </form>
              </li>
            )) : (<li className="text-gray-500">None</li>)}
          </ul>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <h3 className="text-lg font-semibold">Promote User to Admin</h3>
          <span className="ml-2 inline-flex items-center rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-700">Coming soon</span>
          <p className="text-sm text-gray-500">Enter the user&apos;s email to grant admin role. Requires you to be an admin.</p>
          <form action={makeAdmin} className="mt-2 flex max-w-md gap-2">
            <Input type="email" name="email" placeholder="user@example.com" required />
            <SubmitButton pendingText="Promoting...">Make Admin</SubmitButton>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <h3 className="text-lg font-semibold">Invite User</h3>
          <form action={inviteUser} className="mt-2 flex max-w-md gap-2">
            <Input type="email" name="email" placeholder="user@example.com" required />
            <SubmitButton pendingText="Inviting...">Invite</SubmitButton>
          </form>
        </CardBody>
      </Card>
    </main>
  );
}
