"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  UserSquare2,
  Search,
  MessageCircle,
  Bookmark,
  PlusCircle,
  LogOut,
} from "lucide-react";
import { useCurrentUser } from "@/lib/useCurrentUser";

const navItems = [
  { href: "/home", icon: Home, label: "Home" },
  { href: "/my-card", icon: UserSquare2, label: "My Card" },
  { href: "/search", icon: Search, label: "Search" },
  { href: "/chat", icon: MessageCircle, label: "Chat" },
  { href: "/saved", icon: Bookmark, label: "Saved" },
];

const avatarColors = [
  "from-violet-500 to-pink-500",
  "from-blue-500 to-cyan-400",
  "from-emerald-500 to-teal-400",
  "from-orange-500 to-pink-500",
  "from-fuchsia-500 to-violet-500",
];

function getGradient(name: string) {
  return avatarColors[name.charCodeAt(0) % avatarColors.length];
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile } = useCurrentUser();

  const initials = profile
    ? profile.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  function handleSignOut() {
    localStorage.removeItem("cultivate_profile_id");
    router.push("/");
  }

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
                <Icon size={18} className={active ? "text-violet-400" : "text-current"} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Create Card CTA */}
        <div className="px-3 pb-3">
          <Link
            href="/create-card"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              pathname === "/create-card"
                ? "bg-violet-600/15 text-violet-300 border border-violet-500/20"
                : "bg-violet-600/10 border border-violet-500/15 text-violet-400 hover:bg-violet-600/20 hover:text-violet-300"
            }`}
          >
            <PlusCircle size={18} />
            Create Card
          </Link>
        </div>

        {/* User + Sign Out */}
        <div className="px-4 py-4 border-t border-white/5">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/3 border border-white/5">
            <div
              className={`w-8 h-8 rounded-full bg-gradient-to-br ${
                profile ? getGradient(profile.name) : "from-white/10 to-white/5"
              } flex items-center justify-center text-xs text-white font-semibold flex-shrink-0`}
            >
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-white/70 font-medium truncate">
                {profile ? profile.name : "Loading..."}
              </p>
              <p className="text-[10px] text-white/25 truncate">
                {profile?.college_name ?? profile?.school_name ?? ""}
              </p>
            </div>
            <button
              onClick={handleSignOut}
              title="Sign out"
              className="flex-shrink-0 text-white/20 hover:text-white/60 transition-colors"
            >
              <LogOut size={14} />
            </button>
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
