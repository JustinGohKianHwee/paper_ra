import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { TooltipProvider } from "@/components/ui/tooltip";
import { createClient, getUser } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { data: topics } = await supabase.from("topics").select("name, slug").order("name");

  return (
    <TooltipProvider delayDuration={250}>
      <AppShell topics={topics ?? []}>{children}</AppShell>
    </TooltipProvider>
  );
}
