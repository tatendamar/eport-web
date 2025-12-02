import { z } from "zod";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";
import { Card, CardBody } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

const AssetSchema = z.object({
  name: z.string().min(2),
  category_id: z.string().uuid(),
  department_id: z.string().uuid(),
  date_purchased: z.string(),
  cost: z.string(),
});

async function getData() {
  const supabase = getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const [{ data: categories }, { data: departments }] = await Promise.all([
    supabase.from("categories").select("id,name").order("name"),
    supabase.from("departments").select("id,name").order("name"),
  ]);
  return { categories: categories ?? [], departments: departments ?? [] } as const;
}

export default async function NewAssetPage() {
  const { categories, departments } = await getData();

  async function create(formData: FormData) {
    "use server";
    const parsed = AssetSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!parsed.success) {
      throw new Error("Invalid input");
    }
    const { name, category_id, department_id, date_purchased, cost } = parsed.data;
    const supabase = getSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");
    const { error } = await supabase.from("assets").insert({
      name,
      category_id,
      department_id,
      date_purchased,
      cost,
      created_by: user.id,
    });
    if (error) {
      throw new Error(error.message);
    }
    redirect("/dashboard/user");
  }

  return (
    <main className="space-y-6 max-w-2xl">
      <h2 className="text-2xl font-semibold tracking-tight">Create Asset</h2>
      <Card>
        <CardBody>
          <form action={create} className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="name" className="text-sm font-medium">Asset Name</label>
              <Input id="name" name="name" placeholder="e.g., MacBook Pro" required />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label htmlFor="category_id" className="text-sm font-medium">Category</label>
                <select id="category_id" name="category_id" required defaultValue="" className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="" disabled>
                    Select category
                  </option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label htmlFor="department_id" className="text-sm font-medium">Department</label>
                <select id="department_id" name="department_id" required defaultValue="" className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="" disabled>
                    Select department
                  </option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label htmlFor="date_purchased" className="text-sm font-medium">Date Purchased</label>
                <Input id="date_purchased" name="date_purchased" type="date" required />
              </div>
              <div className="space-y-1">
                <label htmlFor="cost" className="text-sm font-medium">Cost</label>
                <Input id="cost" name="cost" type="number" step="0.01" min="0" required />
              </div>
            </div>
            <Button type="submit">Create</Button>
          </form>
        </CardBody>
      </Card>
    </main>
  );
}
