"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  UserSquare2,
  Search,
  MessageCircle,
  Bookmark,
  PlusCircle,
} from "lucide-react";

const navItems = [
  { href: "/home", icon: Home, label: "Home" },
  { href: "/my-card", icon: UserSquare2, label: "My Card" },
  { href: "/search", icon: Search, label: "Search" },
  { href: "/chat", icon: MessageCircle, label: "Chat" },
  { href: "/saved", icon: Bookmark, label: "Saved" },
];

const actionItems = [
  { href: "/create-card", icon: PlusCircle, label: "Create Card" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-[#0a0a0a]">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-60 border-r border-white/5 flex flex-col z-40 bg-[#0a0a0a]">
        {/* Logo */}
        <div className="px-6 py-5 border-b border-white/5">
          <Link href="/home" className="text-lg font-semibold tracking-tight text-white">
            cultivate
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ href, icon: Icon, label }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? "bg-violet-600/15 text-violet-300 border border-violet-500/20"
                    : "text-white/40 hover:text-white/80 hover:bg-white/5"
                }`}
              >
                <Icon
                  size={18}
                  className={active ? "text-violet-400" : "text-current"}
                />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Create card CTA */}
        <div className="px-3 pb-2">
          {actionItems.map(({ href, icon: Icon, label }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? "bg-violet-600/15 text-violet-300 border border-violet-500/20"
                    : "bg-violet-600/10 border border-violet-500/15 text-violet-400 hover:bg-violet-600/20 hover:text-violet-300"
                }`}
              >
                <Icon size={18} />
                {label}
              </Link>
            );
          })}
        </div>

        {/* Bottom - profile hint */}
        <div className="px-4 py-4 border-t border-white/5">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/3 border border-white/5">
            <div className="w-7 h-7 rounded-full bg-violet-600/30 border border-violet-500/30 flex items-center justify-center text-xs text-violet-300 font-medium">
              ?
            </div>
            <div>
              <p className="text-xs text-white/60 font-medium">You</p>
              <p className="text-[10px] text-white/25">View your card</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 ml-60 min-h-screen">
        {children}
      </main>
    </div>
  );
}
