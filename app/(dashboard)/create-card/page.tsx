"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";

// ─── Option data ──────────────────────────────────────────────────────────────

const MBTI_TYPES = [
  { code: "INTJ", name: "The Architect" },
  { code: "INTP", name: "The Logician" },
  { code: "ENTJ", name: "The Commander" },
  { code: "ENTP", name: "The Debater" },
  { code: "INFJ", name: "The Advocate" },
  { code: "INFP", name: "The Mediator" },
  { code: "ENFJ", name: "The Protagonist" },
  { code: "ENFP", name: "The Campaigner" },
  { code: "ISTJ", name: "The Logistician" },
  { code: "ISFJ", name: "The Defender" },
  { code: "ESTJ", name: "The Executive" },
  { code: "ESFJ", name: "The Consul" },
  { code: "ISTP", name: "The Virtuoso" },
  { code: "ISFP", name: "The Adventurer" },
  { code: "ESTP", name: "The Entrepreneur" },
  { code: "ESFP", name: "The Entertainer" },
  { code: "UNKNOWN", name: "I don't know my type" },
];

const QUALITIES = [
  "Ambitious", "Adventurous", "Analytical", "Artistic", "Authentic",
  "Calm", "Caring", "Charismatic", "Confident", "Creative",
  "Curious", "Dependable", "Disciplined", "Empathetic", "Energetic",
  "Funny", "Hardworking", "Honest", "Humble", "Idealistic",
  "Independent", "Intellectual", "Intuitive", "Kind", "Logical",
  "Loyal", "Mature", "Methodical", "Motivating", "Open-minded",
  "Optimistic", "Organized", "Outgoing", "Patient", "Passionate",
  "Perceptive", "Playful", "Practical", "Protective", "Quiet",
  "Realistic", "Reflective", "Reliable", "Reserved", "Resilient",
  "Sensitive", "Sincere", "Spontaneous", "Strategic", "Supportive",
  "Thoughtful", "Visionary", "Warm", "Witty",
];

const INTERESTS = [
  "Technology & Coding", "AI & Machine Learning", "Startups & Entrepreneurship",
  "Music", "Art & Design", "Writing & Poetry", "Reading & Literature",
  "Gaming", "Sports", "Fitness & Gym", "Dance", "Photography",
  "Filmmaking", "Travel", "Cooking & Food", "Fashion & Style",
  "Science & Research", "Philosophy", "Psychology", "History",
  "Politics & Society", "Finance & Investing", "Spirituality & Mindfulness",
  "Anime & Manga", "Movies & Web Series", "Podcasts", "Content Creation",
  "Stand-up Comedy", "Environment & Sustainability", "Volunteering",
  "Math & Logic", "Chess & Strategy", "Cars & Bikes", "Astrology",
  "Architecture & Design",
];

const RELATIONS = [
  "Genuine Friendship",
  "Study Partner",
  "Creative Collaborator",
  "Intellectual Discussions",
  "Looking for a Mentor",
  "Open to Mentoring",
  "Romantic Connection",
  "Accountability Partner",
  "Co-founder / Build Together",
  "Professional Networking",
  "Casual Hangout",
  "Travel Companion",
  "Gaming Partner",
  "Workout Buddy",
  "Music Collaborator",
  "Someone to Vent To",
  "Long-term Bond",
  "Just Exploring",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-medium text-white/50 uppercase tracking-wider mb-2">
      {children}
    </label>
  );
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="mt-1.5 text-xs text-red-400">{msg}</p>;
}

function ChipGrid({
  options,
  selected,
  onToggle,
  max,
  single,
}: {
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
  max?: number;
  single?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = single ? selected[0] === opt : selected.includes(opt);
        const disabled = !active && !!max && selected.length >= max;
        return (
          <button
            key={opt}
            type="button"
            disabled={disabled}
            onClick={() => onToggle(opt)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
              active
                ? "bg-violet-600/20 border-violet-500/50 text-violet-300"
                : disabled
                ? "bg-white/2 border-white/5 text-white/20 cursor-not-allowed"
                : "bg-white/4 border-white/10 text-white/50 hover:text-white/80 hover:border-white/20 hover:bg-white/7"
            }`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

const TOTAL_STEPS = 4;
const STEP_LABELS = ["Personality", "Qualities", "World", "Note"];

export default function CreateCardPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);

  const [personalityType, setPersonalityType] = useState("");
  const [age, setAge] = useState("");
  const [qualities, setQualities] = useState<string[]>([]);
  const [interests, setInterests] = useState<string[]>([]);
  const [relation, setRelation] = useState<string[]>([]);
  const [note, setNote] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function toggleChip(
    value: string,
    current: string[],
    setter: (v: string[]) => void,
    max?: number,
    single?: boolean
  ) {
    if (single) {
      setter(current[0] === value ? [] : [value]);
      return;
    }
    if (current.includes(value)) setter(current.filter((v) => v !== value));
    else if (!max || current.length < max) setter([...current, value]);
  }

  function validateStep(s: number): Record<string, string> {
    const e: Record<string, string> = {};
    if (s === 1) {
      if (!personalityType) e.mbti = "Select your personality type.";
      if (!age.trim()) e.age = "Age is required.";
      else if (isNaN(Number(age)) || Number(age) < 10 || Number(age) > 80)
        e.age = "Enter a valid age.";
    }
    if (s === 2) {
      if (qualities.length === 0) e.qualities = "Pick at least one quality.";
    }
    if (s === 3) {
      if (interests.length === 0) e.interests = "Pick at least one interest.";
      if (relation.length === 0) e.relation = "Select what you're looking for.";
    }
    return e;
  }

  function next() {
    const e = validateStep(step);
    setErrors(e);
    if (Object.keys(e).length === 0) setStep((s) => s + 1);
  }

  function back() {
    setErrors({});
    setStep((s) => s - 1);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const profileId = localStorage.getItem("cultivate_profile_id");
    if (!profileId) {
      setSubmitError("Session not found. Please sign in again.");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    const { error } = await supabase
      .from("cards")
      .insert([{
        profile_id: profileId,
        age: Number(age),
        personality_type: personalityType,
        qualities,
        interests,
        relations: relation,
        note: note.trim() || null,
      }]);

    setSubmitting(false);

    if (error) {
      setSubmitError("Something went wrong. Please try again.");
      return;
    }

    router.push("/my-card");
  }

  const progress = ((step - 1) / (TOTAL_STEPS - 1)) * 100;

  return (
    <div className="px-8 py-8 min-h-screen">
      {/* Progress bar */}
      <div className="h-0.5 bg-white/5 rounded-full mb-8 -mx-8">
        <div
          className="h-full bg-violet-500 rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Step indicators */}
      <div className="flex items-center justify-between mb-10 max-w-lg">
        {STEP_LABELS.map((label, i) => {
          const n = i + 1;
          const done = n < step;
          const active = n === step;
          return (
            <div key={label} className="flex flex-col items-center gap-1.5">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                done ? "bg-violet-600 text-white" : active ? "bg-violet-600/20 border border-violet-500/60 text-violet-300" : "bg-white/5 border border-white/10 text-white/25"
              }`}>
                {done ? <Check size={13} /> : n}
              </div>
              <span className={`text-[10px] font-medium ${active ? "text-violet-300" : done ? "text-white/40" : "text-white/20"}`}>
                {label}
              </span>
            </div>
          );
        })}
      </div>

      <form onSubmit={handleSubmit} className="max-w-lg">

        {/* ── Step 1: Personality type + age ─── */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">Your personality.</h2>
              <p className="text-sm text-white/35">How do you see yourself?</p>
            </div>

            <div>
              <SectionLabel>Age</SectionLabel>
              <input
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="Your age"
                min={10}
                max={80}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/20 text-sm focus:outline-none focus:border-violet-500/60 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <FieldError msg={errors.age} />
            </div>

            <div>
              <SectionLabel>Personality Type</SectionLabel>
              <select
                value={personalityType}
                onChange={(e) => setPersonalityType(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[#111] border border-white/10 text-white text-sm focus:outline-none focus:border-violet-500/60 transition-all appearance-none cursor-pointer"
              >
                <option value="">Select your type</option>
                {MBTI_TYPES.map(({ code, name }) => (
                  <option key={code} value={code}>
                    {code === "UNKNOWN" ? name : `${code} — ${name}`}
                  </option>
                ))}
              </select>
              <FieldError msg={errors.mbti} />
            </div>
          </div>
        )}

        {/* ── Step 2: Qualities ─────────────── */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">Your qualities.</h2>
              <p className="text-sm text-white/35">Pick up to 5 that describe you best.</p>
            </div>
            <div>
              <div className="flex items-center justify-between mb-3">
                <SectionLabel>Qualities</SectionLabel>
                <span className="text-[10px] text-white/25">{qualities.length}/5</span>
              </div>
              <ChipGrid
                options={QUALITIES}
                selected={qualities}
                onToggle={(v) => toggleChip(v, qualities, setQualities, 5)}
                max={5}
              />
              <FieldError msg={errors.qualities} />
            </div>
          </div>
        )}

        {/* ── Step 3: Interests + Relation ─── */}
        {step === 3 && (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">Your world.</h2>
              <p className="text-sm text-white/35">What you love and what you&apos;re looking for.</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <SectionLabel>Interests</SectionLabel>
                <span className="text-[10px] text-white/25">{interests.length}/8</span>
              </div>
              <p className="text-xs text-white/30 mb-3">Pick up to 8.</p>
              <ChipGrid
                options={INTERESTS}
                selected={interests}
                onToggle={(v) => toggleChip(v, interests, setInterests, 8)}
                max={8}
              />
              <FieldError msg={errors.interests} />
            </div>

            <div>
              <SectionLabel>Looking For</SectionLabel>
              <p className="text-xs text-white/30 mb-3">Pick one - what kind of connection are you after?</p>
              <ChipGrid
                options={RELATIONS}
                selected={relation}
                onToggle={(v) => toggleChip(v, relation, setRelation, 1, true)}
                single
              />
              <FieldError msg={errors.relation} />
            </div>
          </div>
        )}

        {/* ── Step 4: Note ─────────────────── */}
        {step === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">Your note.</h2>
              <p className="text-sm text-white/35">
                Expectations, what you&apos;re really about, a message to whoever reads your card.
              </p>
            </div>
            <div>
              <SectionLabel>Note &amp; Expectations</SectionLabel>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Write anything you want people to know before they reach out. Be real."
                rows={6}
                maxLength={500}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/20 text-sm focus:outline-none focus:border-violet-500/60 transition-all resize-none"
              />
              <div className="flex justify-between mt-1.5">
                <span className="text-xs text-white/20">Optional but recommended</span>
                <span className="text-xs text-white/20">{note.length}/500</span>
              </div>
            </div>
            {submitError && <p className="text-sm text-red-400 text-center">{submitError}</p>}
          </div>
        )}

        {/* Nav buttons */}
        <div className="flex gap-3 mt-8">
          {step > 1 && (
            <button
              type="button"
              onClick={back}
              className="flex items-center gap-2 px-5 py-3 rounded-xl border border-white/10 bg-white/5 text-white/60 hover:text-white hover:border-white/20 text-sm font-medium transition-all"
            >
              <ChevronLeft size={16} />
              Back
            </button>
          )}

          {step < TOTAL_STEPS ? (
            <button
              type="button"
              onClick={next}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-medium text-sm transition-all hover:shadow-lg hover:shadow-violet-600/25 active:scale-[0.98]"
            >
              Continue
              <ChevronRight size={16} />
            </button>
          ) : (
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm transition-all hover:shadow-lg hover:shadow-violet-600/25 active:scale-[0.98]"
            >
              {submitting ? "Publishing card..." : "Publish my card ✦"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
