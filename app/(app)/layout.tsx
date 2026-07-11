import { redirect } from "next/navigation";
import { signOut } from "@/actions/auth";
import { CommandPalette } from "@/components/command-palette";
import { MobileNav } from "@/components/mobile-nav";
import { NavLinks } from "@/components/nav-links";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/config";
import { createClient, getUser } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { data: topics } = await supabase.from("topics").select("name, slug").order("name");

  return (
    <div className="flex min-h-screen w-full">
      <aside className="hidden md:flex w-56 shrink-0 flex-col border-r bg-sidebar px-3 py-4 sticky top-0 h-screen">
        <div className="px-2.5 pb-4">
          <p className="text-sm font-semibold tracking-tight">{APP_NAME}</p>
          <p className="text-[11px] text-muted-foreground">private research notebook</p>
        </div>
        <NavLinks />
        <div className="mt-auto flex items-center justify-between px-1 pt-4">
          <form action={signOut}>
            <Button variant="ghost" size="sm" type="submit" className="text-muted-foreground">
              Sign out
            </Button>
          </form>
          <ThemeToggle />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex md:hidden items-center justify-between border-b px-3 py-2">
          <div className="flex items-center gap-1">
            <MobileNav />
            <span className="text-sm font-semibold">{APP_NAME}</span>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <form action={signOut}>
              <Button variant="ghost" size="sm" type="submit" className="text-muted-foreground">
                Sign out
              </Button>
            </form>
          </div>
        </header>
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8 max-w-6xl w-full mx-auto">
          {children}
        </main>
      </div>

      <CommandPalette topics={topics ?? []} />
    </div>
  );
}
