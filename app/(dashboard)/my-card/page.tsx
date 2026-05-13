"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Profile } from "@/components/PersonalityCard";
import {
  GraduationCap,
  School,
  Edit3,
  Loader2,
  UserSquare2,
  PlusCircle,
} from "lucide-react";
import Link from "next/link";

const genderColors: Record<string, string> = {
  male: "bg-blue-500/10 text-blue-300 border-blue-500/20",
  female: "bg-pink-500/10 text-pink-300 border-pink-500/20",
  other: "bg-violet-500/10 text-violet-300 border-violet-500/20",
};

const avatarColors = [
  "from-violet-500 to-pink-500",
  "from-blue-500 to-cyan-400",
  "from-emerald-500 to-teal-400",
  "from-orange-500 to-pink-500",
  "from-fuchsia-500 to-violet-500",
];

function getAvatarGradient(name: string) {
  return avatarColors[name.charCodeAt(0) % avatarColors.length];
}

function Row({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between py-3 border-b border-white/5 last:border-0">
      <span className="text-xs text-white/30 w-36 flex-shrink-0">{label}</span>
      <span className="text-sm text-white/80 text-right">{value}</span>
    </div>
  );
}

export default function MyCardPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const id = localStorage.getItem("cultivate_profile_id");
    if (!id) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    supabase
      .from("profiles")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data }) => {
        if (data) setProfile(data as Profile);
        else setNotFound(true);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32 text-white/30">
        <Loader2 size={24} className="animate-spin mr-2" />
        Loading your card...
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center px-8">
        <UserSquare2 size={40} className="text-white/10 mb-4" />
        <p className="text-white/40 text-sm mb-2">No profile found.</p>
        <p className="text-white/20 text-xs mb-6">
          You haven&apos;t built your card yet.
        </p>
        <Link
          href="/signup"
          className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-all"
        >
          Build my card
        </Link>
      </div>
    );
  }

  const initials = profile.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="px-8 py-8 max-w-2xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">My Card</h1>
          <p className="text-sm text-white/40">This is how others see you.</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/8 text-white/60 hover:text-white text-sm font-medium transition-all">
          <Edit3 size={14} />
          Edit
        </button>
      </div>

      {/* Card preview */}
      <div className="rounded-2xl border border-white/10 bg-white/3 p-6 mb-6">
        {/* Avatar + name */}
        <div className="flex items-center gap-4 mb-6">
          <div
            className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${getAvatarGradient(profile.name)} flex items-center justify-center text-xl font-bold text-white`}
          >
            {initials}
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{profile.name}</h2>
            <span
              className={`inline-block mt-1.5 text-xs font-medium px-2.5 py-1 rounded-full border capitalize ${genderColors[profile.gender]}`}
            >
              {profile.gender}
            </span>
          </div>
        </div>

        {/* Education block */}
        <div className="flex items-start gap-3 p-4 rounded-xl bg-white/4 border border-white/6 mb-6">
          {profile.edu_type === "college" ? (
            <GraduationCap size={18} className="text-violet-400 flex-shrink-0 mt-0.5" />
          ) : (
            <School size={18} className="text-violet-400 flex-shrink-0 mt-0.5" />
          )}
          <div>
            <p className="text-sm font-semibold text-white/90">
              {profile.edu_type === "school"
                ? profile.school_name
                : profile.college_name}
            </p>
            <p className="text-xs text-white/35 mt-1">
              {profile.edu_type === "school"
                ? `Class of ${profile.school_pass_out_year} · PIN ${profile.school_pin_code}`
                : `${profile.college_branch} · Section ${profile.college_section} · Graduating ${profile.college_graduation_year}`}
            </p>
          </div>
        </div>

        {/* Details */}
        <div className="rounded-xl bg-white/3 border border-white/5 px-4">
          {profile.edu_type === "school" ? (
            <>
              <Row label="School" value={profile.school_name} />
              <Row label="PIN Code" value={profile.school_pin_code} />
              <Row label="Pass-out Year" value={profile.school_pass_out_year} />
            </>
          ) : (
            <>
              <Row label="College" value={profile.college_name} />
              <Row label="Branch" value={profile.college_branch} />
              <Row label="Section" value={profile.college_section} />
              <Row label="Graduation Year" value={profile.college_graduation_year} />
            </>
          )}
        </div>
      </div>

      {/* Prompt to create card if personality fields are empty */}
      {!profile.personality_type && (
        <div className="rounded-2xl border border-violet-500/15 bg-violet-600/5 p-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-white/70 mb-0.5">Your personality card is empty.</p>
            <p className="text-xs text-white/30">Add your personality, interests, and what you&apos;re looking for so others can find you.</p>
          </div>
          <Link
            href="/create-card"
            className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-all"
          >
            <PlusCircle size={14} />
            Create Card
          </Link>
        </div>
      )}
    </div>
  );
}
