"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, FileText, Banknote, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { RoleToggle } from "@/components/role-toggle";
import { useRole } from "@/lib/role-context";

const navItems = [
  { href: "/student/assessments", label: "My Assessments", icon: ClipboardList },
  { href: "/student/marksheet", label: "My Marksheet", icon: FileText },
  { href: "/student/fees", label: "My Fees", icon: Banknote },
];

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { userId } = useRole();

  if (!userId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">
          Select a student from the Staff view to switch to Student mode.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top nav */}
      <header className="border-b bg-muted/40">
        <div className="flex items-center justify-between px-6 h-14">
          <div className="flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-md text-sm transition-colors",
                  pathname.startsWith(item.href)
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <User className="size-3" />
              Student View
            </span>
            <RoleToggle />
          </div>
        </div>
      </header>

      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
