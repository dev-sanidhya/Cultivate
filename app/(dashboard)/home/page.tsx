"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import PersonalityCard, { Profile } from "@/components/PersonalityCard";
import { Loader2, Users } from "lucide-react";

export default function HomePage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [myId, setMyId] = useState<string | null>(null);

  useEffect(() => {
    setMyId(localStorage.getItem("cultivate_profile_id"));
    fetchProfiles();
  }, []);

  async function fetchProfiles() {
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    setProfiles((data as Profile[]) ?? []);
    setLoading(false);
  }

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

  const visible = profiles.filter((p) => p.id !== myId);

  return (
    <div className="px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">Discover People</h1>
        <p className="text-sm text-white/40">
          Browse personality cards and find your people.
        </p>
      </div>

      {/* Filter chips - placeholder for future filters */}
      <div className="flex gap-2 mb-8 flex-wrap">
        {["All", "College", "School", "New"].map((f, i) => (
          <button
            key={f}
            className={`px-4 py-1.5 rounded-full text-xs font-medium border transition-all ${
              i === 0
                ? "bg-violet-600/20 border-violet-500/40 text-violet-300"
                : "bg-white/5 border-white/8 text-white/40 hover:text-white/70 hover:border-white/16"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-32 text-white/30">
          <Loader2 size={24} className="animate-spin mr-2" />
          Loading cards...
        </div>
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <Users size={40} className="text-white/10 mb-4" />
          <p className="text-white/30 text-sm">No one here yet.</p>
          <p className="text-white/20 text-xs mt-1">
            Invite people and they&apos;ll show up here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visible.map((profile) => (
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
      )}
    </div>
  );
}
