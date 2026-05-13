"use client";

import { Heart, Bookmark, MessageCircle, GraduationCap, School } from "lucide-react";

export interface Profile {
  id: string;
  name: string;
  gender: "male" | "female" | "other";
  edu_type: "school" | "college";
  school_name?: string;
  school_pin_code?: string;
  school_pass_out_year?: string;
  college_name?: string;
  college_graduation_year?: string;
  college_branch?: string;
  college_section?: string;
  created_at: string;
}

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
  const idx = name.charCodeAt(0) % avatarColors.length;
  return avatarColors[idx];
}

interface PersonalityCardProps {
  profile: Profile;
  onLike?: (id: string) => void;
  onSave?: (id: string) => void;
  onChat?: (id: string) => void;
  liked?: boolean;
  saved?: boolean;
  compact?: boolean;
}

export default function PersonalityCard({
  profile,
  onLike,
  onSave,
  onChat,
  liked = false,
  saved = false,
  compact = false,
}: PersonalityCardProps) {
  const initials = profile.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const eduLabel =
    profile.edu_type === "school"
      ? profile.school_name
      : profile.college_name;

  const eduSub =
    profile.edu_type === "school"
      ? `Class of ${profile.school_pass_out_year}`
      : `${profile.college_branch} · ${profile.college_section} · ${profile.college_graduation_year}`;

  return (
    <div
      className={`group relative rounded-2xl border border-white/8 bg-white/3 hover:bg-white/5 hover:border-white/14 transition-all duration-200 flex flex-col ${
        compact ? "p-4" : "p-5"
      }`}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        {/* Avatar */}
        <div
          className={`flex-shrink-0 rounded-xl bg-gradient-to-br ${getAvatarGradient(profile.name)} flex items-center justify-center font-semibold text-white ${
            compact ? "w-10 h-10 text-sm" : "w-12 h-12 text-base"
          }`}
        >
          {initials}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white text-sm truncate">
            {profile.name}
          </h3>
          <span
            className={`inline-block mt-1 text-[10px] font-medium px-2 py-0.5 rounded-full border capitalize ${
              genderColors[profile.gender]
            }`}
          >
            {profile.gender}
          </span>
        </div>
      </div>

      {/* Education */}
      <div className="flex items-start gap-2.5 mb-4 p-3 rounded-xl bg-white/3 border border-white/5">
        {profile.edu_type === "college" ? (
          <GraduationCap size={15} className="text-violet-400 flex-shrink-0 mt-0.5" />
        ) : (
          <School size={15} className="text-violet-400 flex-shrink-0 mt-0.5" />
        )}
        <div className="min-w-0">
          <p className="text-xs font-medium text-white/80 truncate">{eduLabel}</p>
          <p className="text-[10px] text-white/35 mt-0.5 truncate">{eduSub}</p>
        </div>
      </div>

      {/* Placeholder traits - will be real fields later */}
      {!compact && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {["Looking to connect", profile.edu_type === "college" ? "College student" : "School student"].map(
            (tag) => (
              <span
                key={tag}
                className="text-[10px] px-2 py-1 rounded-lg bg-white/5 border border-white/8 text-white/40"
              >
                {tag}
              </span>
            )
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 mt-auto pt-3 border-t border-white/5">
        <button
          onClick={() => onLike?.(profile.id)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            liked
              ? "bg-pink-500/15 text-pink-300 border border-pink-500/25"
              : "bg-white/5 text-white/40 border border-white/8 hover:text-pink-300 hover:border-pink-500/20 hover:bg-pink-500/10"
          }`}
        >
          <Heart size={12} className={liked ? "fill-pink-300" : ""} />
          Like
        </button>

        <button
          onClick={() => onSave?.(profile.id)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            saved
              ? "bg-violet-500/15 text-violet-300 border border-violet-500/25"
              : "bg-white/5 text-white/40 border border-white/8 hover:text-violet-300 hover:border-violet-500/20 hover:bg-violet-500/10"
          }`}
        >
          <Bookmark size={12} className={saved ? "fill-violet-300" : ""} />
          Save
        </button>

        <button
          onClick={() => onChat?.(profile.id)}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 text-white/40 border border-white/8 hover:text-white hover:border-white/20 hover:bg-white/8 transition-all"
        >
          <MessageCircle size={12} />
          Chat
        </button>
      </div>
    </div>
  );
}
