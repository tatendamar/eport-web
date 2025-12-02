import { getSupabaseServer } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";

async function getRole(): Promise<"admin" | "user" | null> {
  const supabase = getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("profiles").select("role").eq("user_id", user.id).maybeSingle();
  return (data?.role as any) ?? "user";
}

export default async function DashboardRouter() {
  const role = await getRole();
  if (!role) redirect("/login");
  if (role === "admin") redirect("/dashboard/admin");
  redirect("/dashboard/user");
}
