"use client";

import { Heart, Bookmark, MessageCircle, GraduationCap, School, Brain, Target } from "lucide-react";

export interface Profile {
  id: string;
  name: string;
  age?: number;
  gender: string;
  edu_type: "school" | "college";
  school_name?: string;
  school_pin_code?: string;
  school_pass_out_year?: string;
  college_name?: string;
  college_graduation_year?: string;
  college_branch?: string;
  college_section?: string;
  personality_type?: string;
  qualities?: string[];
  interests?: string[];
  relations?: string[];
  note?: string;
  created_at: string;
}

const MBTI_LABELS: Record<string, string> = {
  INTJ: "The Architect", INTP: "The Logician", ENTJ: "The Commander", ENTP: "The Debater",
  INFJ: "The Advocate", INFP: "The Mediator", ENFJ: "The Protagonist", ENFP: "The Campaigner",
  ISTJ: "The Logistician", ISFJ: "The Defender", ESTJ: "The Executive", ESFJ: "The Consul",
  ISTP: "The Virtuoso", ISFP: "The Adventurer", ESTP: "The Entrepreneur", ESFP: "The Entertainer",
  UNKNOWN: "Type unknown",
};

const genderColors: Record<string, string> = {
  male: "bg-blue-500/10 text-blue-300 border-blue-500/20",
  female: "bg-pink-500/10 text-pink-300 border-pink-500/20",
};

function getGenderColor(gender: string) {
  return genderColors[gender.toLowerCase()] ?? "bg-violet-500/10 text-violet-300 border-violet-500/20";
}

const avatarGradients = [
  "from-violet-500 to-pink-500",
  "from-blue-500 to-cyan-400",
  "from-emerald-500 to-teal-400",
  "from-orange-500 to-pink-500",
  "from-fuchsia-500 to-violet-500",
];

function getAvatarGradient(name: string) {
  return avatarGradients[name.charCodeAt(0) % avatarGradients.length];
}

interface PersonalityCardProps {
  profile: Profile;
  onLike?: (id: string) => void;
  onSave?: (id: string) => void;
  onChat?: (id: string) => void;
  liked?: boolean;
  saved?: boolean;
}

export default function PersonalityCard({
  profile,
  onLike,
  onSave,
  onChat,
  liked = false,
  saved = false,
}: PersonalityCardProps) {
  const initials = profile.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const eduName = profile.edu_type === "school" ? profile.school_name : profile.college_name;
  const eduSub =
    profile.edu_type === "school"
      ? `Class of ${profile.school_pass_out_year}`
      : `${profile.college_branch} · Sec ${profile.college_section} · ${profile.college_graduation_year}`;

  const mbtiLabel = profile.personality_type
    ? profile.personality_type === "UNKNOWN"
      ? "Type unknown"
      : `${profile.personality_type} — ${MBTI_LABELS[profile.personality_type] ?? ""}`
    : null;

  const relation = profile.relations?.[0];

  return (
    <div className="group relative rounded-2xl border border-white/8 bg-white/3 hover:bg-white/5 hover:border-white/14 transition-all duration-200 flex flex-col p-5">

      {/* Header row */}
      <div className="flex items-start gap-3 mb-4">
        <div
          className={`flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br ${getAvatarGradient(profile.name)} flex items-center justify-center font-bold text-white text-base`}
        >
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-white text-sm">{profile.name}</h3>
            {profile.age && (
              <span className="text-xs text-white/30">{profile.age}</span>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <span className={`inline-block text-[10px] font-medium px-2 py-0.5 rounded-full border capitalize ${getGenderColor(profile.gender)}`}>
              {profile.gender}
            </span>
            {mbtiLabel && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border bg-amber-500/10 text-amber-300 border-amber-500/20">
                <Brain size={9} />
                {profile.personality_type}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Education */}
      <div className="flex items-start gap-2.5 mb-3 p-3 rounded-xl bg-white/3 border border-white/5">
        {profile.edu_type === "college"
          ? <GraduationCap size={14} className="text-violet-400 flex-shrink-0 mt-0.5" />
          : <School size={14} className="text-violet-400 flex-shrink-0 mt-0.5" />
        }
        <div className="min-w-0">
          <p className="text-xs font-medium text-white/75 truncate">{eduName}</p>
          <p className="text-[10px] text-white/30 mt-0.5 truncate">{eduSub}</p>
        </div>
      </div>

      {/* Looking for */}
      {relation && (
        <div className="flex items-center gap-2 mb-3">
          <Target size={12} className="text-pink-400 flex-shrink-0" />
          <span className="text-[11px] text-pink-300/80 font-medium">{relation}</span>
        </div>
      )}

      {/* Qualities */}
      {profile.qualities && profile.qualities.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {profile.qualities.slice(0, 4).map((q) => (
            <span key={q} className="text-[10px] px-2 py-0.5 rounded-lg bg-white/5 border border-white/8 text-white/40">
              {q}
            </span>
          ))}
          {profile.qualities.length > 4 && (
            <span className="text-[10px] px-2 py-0.5 rounded-lg bg-white/5 border border-white/8 text-white/25">
              +{profile.qualities.length - 4}
            </span>
          )}
        </div>
      )}

      {/* Interests */}
      {profile.interests && profile.interests.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {profile.interests.slice(0, 3).map((t) => (
            <span key={t} className="text-[10px] px-2 py-0.5 rounded-lg bg-violet-600/10 border border-violet-500/15 text-violet-400/70">
              {t}
            </span>
          ))}
          {profile.interests.length > 3 && (
            <span className="text-[10px] px-2 py-0.5 rounded-lg bg-violet-600/10 border border-violet-500/15 text-violet-400/40">
              +{profile.interests.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Note preview */}
      {profile.note && (
        <p className="text-[11px] text-white/30 leading-relaxed mb-3 line-clamp-2 italic">
          &ldquo;{profile.note}&rdquo;
        </p>
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
