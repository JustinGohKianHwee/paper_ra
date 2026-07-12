"use client";

import { usePathname } from "next/navigation";
import { LogOut, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useState } from "react";
import { signOut } from "@/actions/auth";
import { CommandPalette } from "@/components/command-palette";
import { MobileNav } from "@/components/mobile-nav";
import { NavLinks } from "@/components/nav-links";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { APP_NAME } from "@/lib/config";
import { cn } from "@/lib/utils";

const SIDEBAR_COLLAPSED_KEY = "ra:reading-sidebar-collapsed";

export function AppShell({
  children,
  topics,
}: {
  children: React.ReactNode;
  topics: { name: string; slug: string }[];
}) {
  const pathname = usePathname();
  const isReadingMode = /^\/papers\/[^/]+\/read$/.test(pathname);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return (
        typeof window !== "undefined" && window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1"
      );
    } catch {
      return false;
    }
  });

  function toggleCollapsed() {
    setCollapsed((value) => {
      const next = !value;
      try {
        window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
      } catch {
        // Ignore unavailable storage.
      }
      return next;
    });
  }

  const sidebarCollapsed = isReadingMode && collapsed;

  return (
    <div className="flex min-h-screen w-full">
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 flex-col border-r bg-sidebar px-3 py-4 transition-[width,padding] duration-200 md:flex",
          sidebarCollapsed ? "w-14 px-2" : "w-56"
        )}
      >
        <div
          className={cn(
            "flex items-start gap-2 pb-4",
            sidebarCollapsed ? "justify-center px-0" : "justify-between px-2.5"
          )}
        >
          <div className={cn("min-w-0", sidebarCollapsed && "sr-only")}>
            <p className="text-sm font-semibold tracking-tight">{APP_NAME}</p>
            <p className="text-[11px] text-muted-foreground">private research notebook</p>
          </div>
          {sidebarCollapsed ? (
            <span className="text-sm font-semibold tracking-tight" aria-hidden>
              RA
            </span>
          ) : null}
          {isReadingMode ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className={cn(
                    "text-muted-foreground",
                    sidebarCollapsed ? "absolute right-1 top-2" : "-mr-1"
                  )}
                  onClick={toggleCollapsed}
                  aria-label={sidebarCollapsed ? "Show sidebar" : "Hide sidebar"}
                >
                  {sidebarCollapsed ? (
                    <PanelLeftOpen className="size-3.5" />
                  ) : (
                    <PanelLeftClose className="size-3.5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                {sidebarCollapsed ? "Show sidebar" : "Hide sidebar"}
              </TooltipContent>
            </Tooltip>
          ) : null}
        </div>

        <NavLinks collapsed={sidebarCollapsed} />

        <div
          className={cn(
            "mt-auto flex items-center pt-4",
            sidebarCollapsed ? "flex-col gap-1 px-0" : "justify-between px-1"
          )}
        >
          <form action={signOut}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size={sidebarCollapsed ? "icon-sm" : "sm"}
                  type="submit"
                  className="text-muted-foreground"
                  aria-label="Sign out"
                >
                  {sidebarCollapsed ? <LogOut className="size-4" /> : "Sign out"}
                </Button>
              </TooltipTrigger>
              {sidebarCollapsed ? <TooltipContent side="right">Sign out</TooltipContent> : null}
            </Tooltip>
          </form>
          <ThemeToggle />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b px-3 py-2 md:hidden">
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
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:px-8 md:py-8 [&:has([data-fullbleed])]:max-w-none [&:has([data-fullbleed])]:px-2 [&:has([data-fullbleed])]:py-3 md:[&:has([data-fullbleed])]:px-3 md:[&:has([data-fullbleed])]:py-4">
          {children}
        </main>
      </div>

      <CommandPalette topics={topics} />
    </div>
  );
}
