"use client";

import Link from "next/link";

const featureCards = [
  {
    icon: "✦",
    title: "Personality Cards",
    description:
      "Every person on Cultivate has a rich card that captures who they are, what they want, and what makes them tick.",
  },
  {
    icon: "⟡",
    title: "Intentional Bonds",
    description:
      "No random connections. Browse people whose goals, vibe, and background actually align with yours.",
  },
  {
    icon: "◈",
    title: "Honest Profiles",
    description:
      "Building a profile is mandatory. Real context, real people. No ghost accounts, no blank slates.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-white/5">
        <span className="text-lg font-semibold tracking-tight text-white">
          cultivate
        </span>
        <Link
          href="/signup"
          className="text-sm text-white/60 hover:text-white transition-colors"
        >
          Sign in
        </Link>
      </nav>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-24 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-violet-600/10 rounded-full blur-[120px]" />
        </div>

        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-xs text-white/50 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse inline-block" />
            Find your people
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight leading-[1.1] mb-6">
            Bond with people{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-pink-400">
              who get it.
            </span>
          </h1>

          <p className="text-lg text-white/50 max-w-xl mx-auto mb-10 leading-relaxed">
            Cultivate helps you discover people worth knowing. Browse personality
            cards, find your kind, and build connections that actually mean
            something.
          </p>

          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link
              href="/signup"
              className="px-7 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-medium text-sm transition-all hover:shadow-lg hover:shadow-violet-600/25 active:scale-95"
            >
              Get Started
            </Link>
            <Link
              href="/signup"
              className="px-7 py-3 rounded-xl border border-white/10 hover:border-white/20 bg-white/5 text-white/70 hover:text-white font-medium text-sm transition-all active:scale-95"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Feature cards */}
      <section className="px-6 pb-24 max-w-5xl mx-auto w-full">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {featureCards.map((card) => (
            <div
              key={card.title}
              className="rounded-2xl border border-white/8 bg-white/3 p-6 hover:bg-white/5 hover:border-white/12 transition-all"
            >
              <span className="text-2xl text-violet-400 block mb-3">
                {card.icon}
              </span>
              <h3 className="font-semibold text-white mb-2">{card.title}</h3>
              <p className="text-sm text-white/40 leading-relaxed">
                {card.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 px-8 py-5 flex items-center justify-between text-xs text-white/20">
        <span>cultivate</span>
        <span>find your people.</span>
      </footer>
    </main>
  );
}
