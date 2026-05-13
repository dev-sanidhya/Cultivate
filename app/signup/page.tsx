"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";

// ─── Static option data ───────────────────────────────────────────────────────

const GENDERS = [
  "Male",
  "Female",
  "Non-binary",
  "Genderfluid",
  "Agender",
  "Prefer not to say",
];

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

// ─── Types ────────────────────────────────────────────────────────────────────

type EducationType = "school" | "college" | null;

interface SchoolData {
  name: string;
  pinCode: string;
  passOutYear: string;
}

interface CollegeData {
  name: string;
  graduationYear: string;
  branch: string;
  section: string;
}

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 10 }, (_, i) => String(currentYear - 4 + i));

const TOTAL_STEPS = 5;
const STEP_LABELS = ["Basics", "Location", "Personality", "World", "Note"];

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

// ─── Main component ───────────────────────────────────────────────────────────

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);

  // Step 1
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");

  // Step 2 - Tag Address
  const [eduType, setEduType] = useState<EducationType>(null);
  const [school, setSchool] = useState<SchoolData>({ name: "", pinCode: "", passOutYear: "" });
  const [college, setCollege] = useState<CollegeData>({ name: "", graduationYear: "", branch: "", section: "" });

  // Step 3
  const [personalityType, setPersonalityType] = useState("");
  const [qualities, setQualities] = useState<string[]>([]);

  // Step 4
  const [interests, setInterests] = useState<string[]>([]);
  const [relation, setRelation] = useState<string[]>([]);

  // Step 5
  const [note, setNote] = useState("");

  // Submission
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

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
    if (current.includes(value)) {
      setter(current.filter((v) => v !== value));
    } else if (!max || current.length < max) {
      setter([...current, value]);
    }
  }

  function validateStep(s: number): Record<string, string> {
    const e: Record<string, string> = {};
    if (s === 1) {
      if (!name.trim()) e.name = "Name is required.";
      if (!age.trim()) e.age = "Age is required.";
      else if (isNaN(Number(age)) || Number(age) < 10 || Number(age) > 80)
        e.age = "Enter a valid age.";
      if (!gender) e.gender = "Please select your gender.";
    }
    if (s === 2) {
      if (!eduType) e.edu = "Select school or college.";
      if (eduType === "school") {
        if (!school.name.trim()) e.schoolName = "School name is required.";
        if (!/^\d{6}$/.test(school.pinCode)) e.pinCode = "Enter a valid 6-digit PIN code.";
        if (!school.passOutYear) e.passOutYear = "Select your pass-out year.";
      }
      if (eduType === "college") {
        if (!college.name.trim()) e.collegeName = "College name is required.";
        if (!college.graduationYear) e.gradYear = "Select graduation year.";
        if (!college.branch.trim()) e.branch = "Branch is required.";
        if (!college.section.trim()) e.section = "Section is required.";
      }
    }
    if (s === 3) {
      if (!personalityType) e.mbti = "Select your personality type.";
      if (qualities.length === 0) e.qualities = "Pick at least one quality.";
    }
    if (s === 4) {
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
    setSubmitting(true);
    setSubmitError(null);

    const base = {
      name,
      age: Number(age),
      gender: gender.toLowerCase(),
      edu_type: eduType,
      personality_type: personalityType,
      qualities,
      interests,
      relations: relation,
      note: note.trim() || null,
    };

    const edu =
      eduType === "school"
        ? {
            school_name: school.name,
            school_pin_code: school.pinCode,
            school_pass_out_year: school.passOutYear,
          }
        : {
            college_name: college.name,
            college_graduation_year: college.graduationYear,
            college_branch: college.branch,
            college_section: college.section,
          };

    const { data, error } = await supabase
      .from("profiles")
      .insert([{ ...base, ...edu }])
      .select("id")
      .single();

    setSubmitting(false);

    if (error || !data) {
      setSubmitError("Something went wrong. Please try again.");
      return;
    }

    localStorage.setItem("cultivate_profile_id", data.id);
    router.push("/home");
  }

  const progress = ((step - 1) / (TOTAL_STEPS - 1)) * 100;

  return (
    <main className="min-h-screen flex flex-col bg-[#0a0a0a]">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-white/5">
        <Link href="/" className="text-lg font-semibold tracking-tight text-white">
          cultivate
        </Link>
        <span className="text-xs text-white/25">
          Step {step} of {TOTAL_STEPS}
        </span>
      </nav>

      {/* Progress bar */}
      <div className="h-0.5 bg-white/5">
        <div
          className="h-full bg-violet-500 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex-1 flex items-start justify-center px-6 py-10">
        <div className="w-full max-w-lg">

          {/* Step indicators */}
          <div className="flex items-center justify-between mb-8">
            {STEP_LABELS.map((label, i) => {
              const n = i + 1;
              const done = n < step;
              const active = n === step;
              return (
                <div key={label} className="flex flex-col items-center gap-1.5">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                      done
                        ? "bg-violet-600 text-white"
                        : active
                        ? "bg-violet-600/20 border border-violet-500/60 text-violet-300"
                        : "bg-white/5 border border-white/10 text-white/25"
                    }`}
                  >
                    {done ? <Check size={13} /> : n}
                  </div>
                  <span
                    className={`text-[10px] font-medium ${
                      active ? "text-violet-300" : done ? "text-white/40" : "text-white/20"
                    }`}
                  >
                    {label}
                  </span>
                </div>
              );
            })}
          </div>

          <form onSubmit={handleSubmit}>
            {/* ── Step 1: Basics ─────────────────────────────────────── */}
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">The basics.</h2>
                  <p className="text-sm text-white/35">Who are you, really?</p>
                </div>

                <div>
                  <SectionLabel>Full Name</SectionLabel>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/20 text-sm focus:outline-none focus:border-violet-500/60 transition-all"
                  />
                  <FieldError msg={errors.name} />
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
                  <SectionLabel>Gender</SectionLabel>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-[#111] border border-white/10 text-white text-sm focus:outline-none focus:border-violet-500/60 transition-all appearance-none cursor-pointer"
                  >
                    <option value="">Select gender</option>
                    {GENDERS.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                  <FieldError msg={errors.gender} />
                </div>
              </div>
            )}

            {/* ── Step 2: Tag Address ────────────────────────────────── */}
            {step === 2 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">Your place.</h2>
                  <p className="text-sm text-white/35">Where do you study?</p>
                </div>

                <div>
                  <SectionLabel>Tag Address</SectionLabel>
                  <div className="flex gap-3 mb-3">
                    {(["school", "college"] as const).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setEduType(eduType === type ? null : type)}
                        className={`flex-1 py-2.5 rounded-xl border text-sm font-medium capitalize transition-all ${
                          eduType === type
                            ? "bg-violet-600/20 border-violet-500/60 text-violet-300"
                            : "bg-white/5 border-white/10 text-white/40 hover:text-white/70 hover:border-white/20"
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                  <FieldError msg={!eduType ? errors.edu : undefined} />
                </div>

                {/* School accordion */}
                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    eduType === "school" ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
                  }`}
                >
                  <div className="rounded-2xl border border-violet-500/20 bg-violet-600/5 p-5 space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                      <span className="text-xs font-medium text-violet-400 uppercase tracking-wider">School Details</span>
                    </div>
                    <div>
                      <label className="block text-xs text-white/40 mb-1.5">School Name</label>
                      <input type="text" value={school.name} onChange={(e) => setSchool({ ...school, name: e.target.value })} placeholder="e.g. Delhi Public School" className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/20 text-sm focus:outline-none focus:border-violet-500/50 transition-all" />
                      <FieldError msg={errors.schoolName} />
                    </div>
                    <div>
                      <label className="block text-xs text-white/40 mb-1.5">PIN Code</label>
                      <input type="text" value={school.pinCode} onChange={(e) => setSchool({ ...school, pinCode: e.target.value.replace(/\D/g, "").slice(0, 6) })} placeholder="6-digit PIN code" className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/20 text-sm focus:outline-none focus:border-violet-500/50 transition-all" />
                      <FieldError msg={errors.pinCode} />
                    </div>
                    <div>
                      <label className="block text-xs text-white/40 mb-1.5">Higher Secondary Pass-out Year</label>
                      <select value={school.passOutYear} onChange={(e) => setSchool({ ...school, passOutYear: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-[#111] border border-white/10 text-white text-sm focus:outline-none focus:border-violet-500/50 transition-all appearance-none cursor-pointer">
                        <option value="">Select year</option>
                        {years.map((y) => <option key={y} value={y}>{y}</option>)}
                      </select>
                      <FieldError msg={errors.passOutYear} />
                    </div>
                  </div>
                </div>

                {/* College accordion */}
                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    eduType === "college" ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"
                  }`}
                >
                  <div className="rounded-2xl border border-violet-500/20 bg-violet-600/5 p-5 space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                      <span className="text-xs font-medium text-violet-400 uppercase tracking-wider">College Details</span>
                    </div>
                    <div>
                      <label className="block text-xs text-white/40 mb-1.5">College Name</label>
                      <input type="text" value={college.name} onChange={(e) => setCollege({ ...college, name: e.target.value })} placeholder="e.g. IIT Delhi" className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/20 text-sm focus:outline-none focus:border-violet-500/50 transition-all" />
                      <FieldError msg={errors.collegeName} />
                    </div>
                    <div>
                      <label className="block text-xs text-white/40 mb-1.5">Graduation Year</label>
                      <select value={college.graduationYear} onChange={(e) => setCollege({ ...college, graduationYear: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-[#111] border border-white/10 text-white text-sm focus:outline-none focus:border-violet-500/50 transition-all appearance-none cursor-pointer">
                        <option value="">Select year</option>
                        {years.map((y) => <option key={y} value={y}>{y}</option>)}
                      </select>
                      <FieldError msg={errors.gradYear} />
                    </div>
                    <div>
                      <label className="block text-xs text-white/40 mb-1.5">Branch</label>
                      <input type="text" value={college.branch} onChange={(e) => setCollege({ ...college, branch: e.target.value })} placeholder="e.g. Computer Science, AI & ML" className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/20 text-sm focus:outline-none focus:border-violet-500/50 transition-all" />
                      <FieldError msg={errors.branch} />
                    </div>
                    <div>
                      <label className="block text-xs text-white/40 mb-1.5">Section</label>
                      <input type="text" value={college.section} onChange={(e) => setCollege({ ...college, section: e.target.value })} placeholder="e.g. A, B, C" className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/20 text-sm focus:outline-none focus:border-violet-500/50 transition-all" />
                      <FieldError msg={errors.section} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 3: Personality ────────────────────────────────── */}
            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">Your personality.</h2>
                  <p className="text-sm text-white/35">How do you see yourself?</p>
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

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <SectionLabel>Qualities</SectionLabel>
                    <span className="text-[10px] text-white/25">{qualities.length}/5 selected</span>
                  </div>
                  <p className="text-xs text-white/30 mb-3">Pick up to 5 that describe you best.</p>
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

            {/* ── Step 4: World ──────────────────────────────────────── */}
            {step === 4 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">Your world.</h2>
                  <p className="text-sm text-white/35">What do you love? What are you looking for?</p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <SectionLabel>Interests</SectionLabel>
                    <span className="text-[10px] text-white/25">{interests.length}/8 selected</span>
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

            {/* ── Step 5: Note ───────────────────────────────────────── */}
            {step === 5 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">Your note.</h2>
                  <p className="text-sm text-white/35">
                    Anything else? Expectations, what you&apos;re really about, a message to
                    whoever reads this card.
                  </p>
                </div>

                <div>
                  <SectionLabel>Note & Expectations</SectionLabel>
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

                {submitError && (
                  <p className="text-sm text-red-400 text-center">{submitError}</p>
                )}
              </div>
            )}

            {/* ── Nav buttons ────────────────────────────────────────── */}
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
                  {submitting ? "Building your card..." : "Build my card ✦"}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
