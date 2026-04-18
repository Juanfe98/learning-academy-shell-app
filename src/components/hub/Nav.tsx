"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Home" },
  { href: "/paths", label: "Paths" },
  { href: "/dashboard", label: "Dashboard" },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <header className="border-b border-gray-200 dark:border-gray-800">
      <nav className="container mx-auto px-4 h-14 flex items-center gap-6">
        <Link href="/" className="font-semibold text-lg mr-4">
          SE Hub
        </Link>
        {links.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "text-sm transition-colors hover:text-foreground",
              pathname === href
                ? "text-foreground font-medium"
                : "text-gray-500"
            )}
          >
            {label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
