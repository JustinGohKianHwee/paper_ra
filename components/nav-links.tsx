"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Compass,
  LayoutDashboard,
  Lightbulb,
  Notebook,
  Radar,
  Search,
  Tags,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Experiments is dormant: its routes and data remain, but it is deliberately
// absent from navigation and ordinary workflows until a future version.
const LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/papers", label: "Papers", icon: BookOpen },
  { href: "/topics", label: "Topics", icon: Tags },
  { href: "/concepts", label: "Concepts", icon: Compass },
  { href: "/misconceptions", label: "Misconceptions", icon: Lightbulb },
  { href: "/synthesis", label: "Synthesis", icon: Notebook },
  { href: "/search", label: "Search", icon: Search },
  { href: "/radar", label: "Radar", icon: Radar },
] as const;

export function NavLinks({
  onNavigate,
  collapsed = false,
}: {
  onNavigate?: () => void;
  collapsed?: boolean;
}) {
  const pathname = usePathname();
  return (
    <nav aria-label="Main navigation" className="flex flex-col gap-0.5">
      {LINKS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center rounded-md py-1.5 text-sm transition-colors",
              collapsed ? "justify-center px-0" : "gap-2.5 px-2.5",
              active
                ? "bg-accent text-accent-foreground font-medium"
                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
            )}
            title={collapsed ? label : undefined}
          >
            <Icon className="size-4" aria-hidden />
            <span className={collapsed ? "sr-only" : undefined}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
