"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import PersonalityCard, { Profile } from "@/components/PersonalityCard";
import { Loader2, Users } from "lucide-react";

export default function HomePage() {
  const [cards, setCards] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [myProfileId, setMyProfileId] = useState<string | null>(null);

  useEffect(() => {
    const id = localStorage.getItem("cultivate_profile_id");
    setMyProfileId(id);
    fetchCards();
  }, []);

  async function fetchCards() {
    setLoading(true);
    const { data } = await supabase
      .from("cards")
      .select("*, profiles(*)")
      .order("created_at", { ascending: false });

    if (data) {
      const flat: Profile[] = data.map((row: Record<string, unknown>) => {
        const p = row.profiles as Record<string, unknown>;
        return {
          id: row.id as string,
          name: p.name as string,
          gender: p.gender as string,
          edu_type: p.edu_type as "school" | "college",
          school_name: p.school_name as string | undefined,
          school_pin_code: p.school_pin_code as string | undefined,
          school_pass_out_year: p.school_pass_out_year as string | undefined,
          college_name: p.college_name as string | undefined,
          college_graduation_year: p.college_graduation_year as string | undefined,
          college_branch: p.college_branch as string | undefined,
          college_section: p.college_section as string | undefined,
          personality_type: row.personality_type as string | undefined,
          age: row.age as number | undefined,
          qualities: row.qualities as string[] | undefined,
          interests: row.interests as string[] | undefined,
          relations: row.relations as string[] | undefined,
          note: row.note as string | undefined,
          created_at: row.created_at as string,
          profile_id: p.id as string,
        };
      });
      setCards(flat);
    }

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

  const visible = cards.filter((c) => (c as Profile & { profile_id?: string }).profile_id !== myProfileId);

  return (
    <div className="px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">Discover People</h1>
        <p className="text-sm text-white/40">
          Browse personality cards and find your people.
        </p>
      </div>

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

      {loading ? (
        <div className="flex items-center justify-center py-32 text-white/30">
          <Loader2 size={24} className="animate-spin mr-2" />
          Loading cards...
        </div>
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <Users size={40} className="text-white/10 mb-4" />
          <p className="text-white/30 text-sm">No cards here yet.</p>
          <p className="text-white/20 text-xs mt-1">
            Invite people and they&apos;ll show up here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visible.map((card) => (
            <PersonalityCard
              key={card.id}
              profile={card}
              liked={liked.has(card.id)}
              saved={saved.has(card.id)}
              onLike={toggleLike}
              onSave={toggleSave}
            />
          ))}
        </div>
      )}
    </div>
  );
}
