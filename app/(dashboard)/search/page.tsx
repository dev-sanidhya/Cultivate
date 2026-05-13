"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import PersonalityCard, { Profile } from "@/components/PersonalityCard";
import { Search, Loader2, SlidersHorizontal } from "lucide-react";

export default function SearchPage() {
  const [all, setAll] = useState<Profile[]>([]);
  const [query, setQuery] = useState("");
  const [eduFilter, setEduFilter] = useState<"all" | "school" | "college">("all");
  const [genderFilter, setGenderFilter] = useState<"all" | "male" | "female" | "other">("all");
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [myId, setMyId] = useState<string | null>(null);

  useEffect(() => {
    setMyId(localStorage.getItem("cultivate_profile_id"));
    supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setAll((data as Profile[]) ?? []);
        setLoading(false);
      });
  }, []);

  const results = all.filter((p) => {
    if (p.id === myId) return false;
    if (eduFilter !== "all" && p.edu_type !== eduFilter) return false;
    if (genderFilter !== "all" && p.gender !== genderFilter) return false;
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    const haystack = [
      p.name,
      p.school_name,
      p.college_name,
      p.college_branch,
      p.school_pin_code,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });

  function toggleLike(id: string) {
    setLiked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleSave(id: string) {
    setSaved((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <div className="px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">Search</h1>
        <p className="text-sm text-white/40">Find people by name, college, school, or branch.</p>
      </div>

      {/* Search input */}
      <div className="relative mb-5">
        <Search
          size={16}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, college, branch..."
          className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/20 text-sm focus:outline-none focus:border-violet-500/50 transition-all"
        />
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-8 flex-wrap items-center">
        <div className="flex items-center gap-1.5 text-xs text-white/30">
          <SlidersHorizontal size={13} />
          Filters:
        </div>

        <div className="flex gap-1.5">
          {(["all", "college", "school"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setEduFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border capitalize transition-all ${
                eduFilter === f
                  ? "bg-violet-600/20 border-violet-500/40 text-violet-300"
                  : "bg-white/5 border-white/8 text-white/35 hover:text-white/60"
              }`}
            >
              {f === "all" ? "Any education" : f}
            </button>
          ))}
        </div>

        <div className="flex gap-1.5">
          {(["all", "male", "female", "other"] as const).map((g) => (
            <button
              key={g}
              onClick={() => setGenderFilter(g)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border capitalize transition-all ${
                genderFilter === g
                  ? "bg-violet-600/20 border-violet-500/40 text-violet-300"
                  : "bg-white/5 border-white/8 text-white/35 hover:text-white/60"
              }`}
            >
              {g === "all" ? "Any gender" : g}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex items-center justify-center py-32 text-white/30">
          <Loader2 size={24} className="animate-spin mr-2" />
          Loading...
        </div>
      ) : results.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <Search size={36} className="text-white/10 mb-4" />
          <p className="text-white/30 text-sm">No results found.</p>
          {query && (
            <p className="text-white/20 text-xs mt-1">
              Try a different name or keyword.
            </p>
          )}
        </div>
      ) : (
        <>
          <p className="text-xs text-white/25 mb-4">
            {results.length} {results.length === 1 ? "person" : "people"} found
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.map((profile) => (
              <PersonalityCard
                key={profile.id}
                profile={profile}
                liked={liked.has(profile.id)}
                saved={saved.has(profile.id)}
                onLike={toggleLike}
                onSave={toggleSave}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
