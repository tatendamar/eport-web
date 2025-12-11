import { getSupabaseServer } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { RegisterWarrantyButton } from "@/components/RegisterWarrantyButton";

export default async function UserDashboard() {
  const supabase = getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: assets } = await supabase
    .from("assets")
    .select("id,name,cost,created_at,categories(name),departments(name)")
    .eq("created_by", user.id)
    .order("created_at", { ascending: false });

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">User Dashboard</h1>
      <Card>
        <CardBody>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">My Assets</h2>
            <Link href="/assets/new" className="inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium bg-blue-600 text-white hover:bg-blue-700">New Asset</Link>
          </div>
          <ul className="mt-3 divide-y">
            {assets && assets.length > 0 ? (
              assets.map((a: any) => (
                <li key={a.id} className="py-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium">{a.name}</div>
                      <div className="text-gray-500">Category: {Array.isArray((a as any).categories) ? ((a as any).categories[0]?.name ?? "-") : (((a as any).categories?.name) ?? "-")}</div>
                      <div className="text-gray-500">Department: {Array.isArray((a as any).departments) ? ((a as any).departments[0]?.name ?? "-") : (((a as any).departments?.name) ?? "-")}</div>
                      <div className="text-gray-500">Cost: {typeof a.cost === "number" ? a.cost.toFixed(2) : a.cost}</div>
                      <div className="text-gray-500">Created {new Date(a.created_at as any).toLocaleString()}</div>
                    </div>
                    <RegisterWarrantyButton asset={a} />
                  </div>
                </li>
              ))
            ) : (
              <li className="text-sm text-gray-500">No assets yet.</li>
            )}
          </ul>
        </CardBody>
      </Card>
    </section>
  );
}
