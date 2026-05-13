"use client";

import Link from "next/link";
import { Loader2, PlusCircle, Brain, Target, GraduationCap, School, Trash2 } from "lucide-react";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const MBTI_LABELS: Record<string, string> = {
  INTJ: "The Architect", INTP: "The Logician", ENTJ: "The Commander", ENTP: "The Debater",
  INFJ: "The Advocate", INFP: "The Mediator", ENFJ: "The Protagonist", ENFP: "The Campaigner",
  ISTJ: "The Logistician", ISFJ: "The Defender", ESTJ: "The Executive", ESFJ: "The Consul",
  ISTP: "The Virtuoso", ISFP: "The Adventurer", ESTP: "The Entrepreneur", ESFP: "The Entertainer",
};

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

interface Card {
  id: string;
  profile_id: string;
  personality_type: string | null;
  age: number | null;
  qualities: string[];
  interests: string[];
  relations: string[];
  note: string | null;
  created_at: string;
}

export default function MyCardPage() {
  const { profile, loading } = useCurrentUser();
  const [cards, setCards] = useState<Card[]>([]);
  const [cardsLoading, setCardsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    supabase
      .from("cards")
      .select("*")
      .eq("profile_id", profile.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setCards((data as Card[]) ?? []);
        setCardsLoading(false);
      });
  }, [profile]);

  async function deleteCard(cardId: string) {
    setDeletingId(cardId);
    await supabase.from("cards").delete().eq("id", cardId);
    setCards((prev) => prev.filter((c) => c.id !== cardId));
    setDeletingId(null);
  }

  if (loading || cardsLoading) {
    return (
      <div className="flex items-center justify-center py-32 text-white/30">
        <Loader2 size={24} className="animate-spin mr-2" />
        Loading your cards...
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center px-8">
        <p className="text-white/40 text-sm mb-6">Session not found. Please sign up.</p>
        <Link href="/signup" className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-all">
          Sign up
        </Link>
      </div>
    );
  }

  const initials = profile.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
  const eduName = profile.edu_type === "college" ? profile.college_name : profile.school_name;
  const eduSub = profile.edu_type === "college"
    ? `${profile.college_branch} · Sec ${profile.college_section} · ${profile.college_graduation_year}`
    : `Class of ${profile.school_pass_out_year}`;

  return (
    <div className="px-8 py-8 max-w-2xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">My Cards</h1>
          <p className="text-sm text-white/40">Each card shows a different side of you.</p>
        </div>
        <Link
          href="/create-card"
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium transition-all hover:shadow-lg hover:shadow-violet-600/25"
        >
          <PlusCircle size={14} />
          New Card
        </Link>
      </div>

      {cards.length === 0 ? (
        <div className="max-w-md rounded-2xl border border-dashed border-white/15 bg-white/2 p-10 flex flex-col items-center text-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center">
            <PlusCircle size={24} className="text-violet-400" />
          </div>
          <div>
            <p className="text-white/70 font-medium mb-1">No cards yet</p>
            <p className="text-white/30 text-sm">
              Build a personality card so others can discover and connect with you.
            </p>
          </div>
          <Link
            href="/create-card"
            className="mt-2 px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-all hover:shadow-lg hover:shadow-violet-600/25"
          >
            Create my first card
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {cards.map((card) => {
            const mbti = card.personality_type ?? "";
            const mbtiName = MBTI_LABELS[mbti] ?? "";
            return (
              <div key={card.id} className="rounded-2xl border border-white/10 bg-white/3 p-6 space-y-5">

                {/* Avatar + identity */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${getGradient(profile.name)} flex items-center justify-center text-lg font-bold text-white flex-shrink-0`}>
                      {initials}
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white">{profile.name}</h2>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {card.age && <span className="text-xs text-white/40">{card.age} yrs</span>}
                        <span className="text-xs text-white/20">·</span>
                        <span className="text-xs text-white/40 capitalize">{profile.gender}</span>
                        {mbti && mbti !== "UNKNOWN" && (
                          <>
                            <span className="text-xs text-white/20">·</span>
                            <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300">
                              <Brain size={10} />
                              {mbti} — {mbtiName}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteCard(card.id)}
                    disabled={deletingId === card.id}
                    className="flex-shrink-0 p-2 rounded-xl text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-40"
                    title="Delete card"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {/* Education */}
                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-white/4 border border-white/6">
                  {profile.edu_type === "college"
                    ? <GraduationCap size={16} className="text-violet-400 flex-shrink-0 mt-0.5" />
                    : <School size={16} className="text-violet-400 flex-shrink-0 mt-0.5" />
                  }
                  <div>
                    <p className="text-sm font-medium text-white/80">{eduName}</p>
                    <p className="text-xs text-white/35 mt-0.5">{eduSub}</p>
                  </div>
                </div>

                {/* Looking for */}
                {card.relations?.[0] && (
                  <div className="flex items-center gap-2.5">
                    <Target size={14} className="text-pink-400 flex-shrink-0" />
                    <span className="text-sm text-pink-300/80 font-medium">{card.relations[0]}</span>
                  </div>
                )}

                {/* Qualities */}
                {card.qualities && card.qualities.length > 0 && (
                  <div>
                    <p className="text-[10px] text-white/25 uppercase tracking-wider mb-2">Qualities</p>
                    <div className="flex flex-wrap gap-1.5">
                      {card.qualities.map((q: string) => (
                        <span key={q} className="text-xs px-2.5 py-1 rounded-xl bg-white/5 border border-white/8 text-white/50">
                          {q}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Interests */}
                {card.interests && card.interests.length > 0 && (
                  <div>
                    <p className="text-[10px] text-white/25 uppercase tracking-wider mb-2">Interests</p>
                    <div className="flex flex-wrap gap-1.5">
                      {card.interests.map((t: string) => (
                        <span key={t} className="text-xs px-2.5 py-1 rounded-xl bg-violet-600/10 border border-violet-500/15 text-violet-400/80">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Note */}
                {card.note && (
                  <div className="p-4 rounded-xl bg-white/3 border border-white/6">
                    <p className="text-[10px] text-white/25 uppercase tracking-wider mb-2">Note</p>
                    <p className="text-sm text-white/50 leading-relaxed italic">&ldquo;{card.note}&rdquo;</p>
                  </div>
                )}

                <p className="text-[10px] text-white/20">
                  Created {new Date(card.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
