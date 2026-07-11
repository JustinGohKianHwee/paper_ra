"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Compass,
  FlaskConical,
  LayoutDashboard,
  Lightbulb,
  Notebook,
  Radar,
  Search,
  Tags,
} from "lucide-react";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/papers", label: "Papers", icon: BookOpen },
  { href: "/topics", label: "Topics", icon: Tags },
  { href: "/concepts", label: "Concepts", icon: Compass },
  { href: "/experiments", label: "Experiments", icon: FlaskConical },
  { href: "/misconceptions", label: "Misconceptions", icon: Lightbulb },
  { href: "/synthesis", label: "Synthesis", icon: Notebook },
  { href: "/search", label: "Search", icon: Search },
  { href: "/radar", label: "Radar", icon: Radar },
] as const;

export function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
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
              "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors",
              active
                ? "bg-accent text-accent-foreground font-medium"
                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
            )}
          >
            <Icon className="size-4" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
