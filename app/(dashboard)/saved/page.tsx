"use client";

import { Bookmark, Heart } from "lucide-react";

export default function SavedPage() {
  return (
    <div className="px-8 py-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">Liked &amp; Saved</h1>
        <p className="text-sm text-white/40">People you&apos;ve liked or bookmarked.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-white/4 border border-white/6 w-fit mb-8">
        {["Liked", "Saved"].map((tab, i) => (
          <button
            key={tab}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all ${
              i === 0
                ? "bg-white/8 text-white border border-white/10"
                : "text-white/35 hover:text-white/60"
            }`}
          >
            {i === 0 ? <Heart size={13} /> : <Bookmark size={13} />}
            {tab}
          </button>
        ))}
      </div>

      {/* Empty state */}
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <div className="w-16 h-16 rounded-2xl bg-white/4 border border-white/8 flex items-center justify-center mb-4">
          <Heart size={24} className="text-white/15" />
        </div>
        <p className="text-white/30 text-sm mb-1">Nothing saved yet.</p>
        <p className="text-white/20 text-xs">
          Like or save cards from the home feed and they&apos;ll appear here.
        </p>
      </div>
    </div>
  );
}
