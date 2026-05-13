"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

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

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "other" | "">("");
  const [eduType, setEduType] = useState<EducationType>(null);

  const [school, setSchool] = useState<SchoolData>({ name: "", pinCode: "", passOutYear: "" });
  const [college, setCollege] = useState<CollegeData>({ name: "", graduationYear: "", branch: "", section: "" });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function validate() {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Name is required.";
    if (!gender) e.gender = "Please select your gender.";
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
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setSubmitError(null);

    const payload =
      eduType === "school"
        ? { name, gender, edu_type: "school", school_name: school.name, school_pin_code: school.pinCode, school_pass_out_year: school.passOutYear }
        : { name, gender, edu_type: "college", college_name: college.name, college_graduation_year: college.graduationYear, college_branch: college.branch, college_section: college.section };

    const { data, error } = await supabase.from("profiles").insert([payload]).select("id").single();

    setSubmitting(false);

    if (error || !data) {
      setSubmitError("Something went wrong. Please try again.");
      return;
    }

    localStorage.setItem("cultivate_profile_id", data.id);
    router.push("/home");
  }

  return (
    <main className="min-h-screen flex flex-col relative">
      <nav className="flex items-center justify-between px-8 py-5 border-b border-white/5">
        <Link href="/" className="text-lg font-semibold tracking-tight text-white">
          cultivate
        </Link>
        <span className="text-xs text-white/30">Create your account</span>
      </nav>

      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-violet-600/6 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 flex-1 flex items-start justify-center px-6 py-12">
        <div className="w-full max-w-lg">
          <div className="mb-10">
            <h1 className="text-3xl font-bold text-white mb-2">Sign up.</h1>
            <p className="text-white/40 text-sm">
              Create your account. You&apos;ll build your personality card after.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name */}
            <div>
              <label className="block text-xs font-medium text-white/50 uppercase tracking-wider mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/20 text-sm focus:outline-none focus:border-violet-500/60 focus:bg-white/8 transition-all"
              />
              {errors.name && <p className="mt-1.5 text-xs text-red-400">{errors.name}</p>}
            </div>

            {/* Gender */}
            <div>
              <label className="block text-xs font-medium text-white/50 uppercase tracking-wider mb-2">
                Gender
              </label>
              <div className="flex gap-3">
                {(["male", "female", "other"] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGender(g)}
                    className={`flex-1 py-2.5 rounded-xl border text-sm font-medium capitalize transition-all ${
                      gender === g
                        ? "bg-violet-600/20 border-violet-500/60 text-violet-300"
                        : "bg-white/5 border-white/10 text-white/40 hover:text-white/70 hover:border-white/20"
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
              {errors.gender && <p className="mt-1.5 text-xs text-red-400">{errors.gender}</p>}
            </div>

            {/* School / College */}
            <div>
              <label className="block text-xs font-medium text-white/50 uppercase tracking-wider mb-2">
                Education
              </label>
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
              {errors.edu && !eduType && <p className="mb-2 text-xs text-red-400">{errors.edu}</p>}

              {/* School accordion */}
              <div className={`overflow-hidden transition-all duration-300 ease-in-out ${eduType === "school" ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"}`}>
                <div className="rounded-2xl border border-violet-500/20 bg-violet-600/5 p-5 space-y-4">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                    <span className="text-xs font-medium text-violet-400 uppercase tracking-wider">School Details</span>
                  </div>
                  <div>
                    <label className="block text-xs text-white/40 mb-1.5">School Name</label>
                    <input type="text" value={school.name} onChange={(e) => setSchool({ ...school, name: e.target.value })} placeholder="e.g. Delhi Public School" className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/20 text-sm focus:outline-none focus:border-violet-500/50 transition-all" />
                    {errors.schoolName && <p className="mt-1 text-xs text-red-400">{errors.schoolName}</p>}
                  </div>
                  <div>
                    <label className="block text-xs text-white/40 mb-1.5">PIN Code</label>
                    <input type="text" value={school.pinCode} onChange={(e) => setSchool({ ...school, pinCode: e.target.value.replace(/\D/g, "").slice(0, 6) })} placeholder="6-digit PIN code" className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/20 text-sm focus:outline-none focus:border-violet-500/50 transition-all" />
                    {errors.pinCode && <p className="mt-1 text-xs text-red-400">{errors.pinCode}</p>}
                  </div>
                  <div>
                    <label className="block text-xs text-white/40 mb-1.5">Higher Secondary Pass-out Year</label>
                    <select value={school.passOutYear} onChange={(e) => setSchool({ ...school, passOutYear: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-[#111] border border-white/10 text-white text-sm focus:outline-none focus:border-violet-500/50 transition-all appearance-none cursor-pointer">
                      <option value="">Select year</option>
                      {years.map((y) => <option key={y} value={y}>{y}</option>)}
                    </select>
                    {errors.passOutYear && <p className="mt-1 text-xs text-red-400">{errors.passOutYear}</p>}
                  </div>
                </div>
              </div>

              {/* College accordion */}
              <div className={`overflow-hidden transition-all duration-300 ease-in-out ${eduType === "college" ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"}`}>
                <div className="rounded-2xl border border-violet-500/20 bg-violet-600/5 p-5 space-y-4">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                    <span className="text-xs font-medium text-violet-400 uppercase tracking-wider">College Details</span>
                  </div>
                  <div>
                    <label className="block text-xs text-white/40 mb-1.5">College Name</label>
                    <input type="text" value={college.name} onChange={(e) => setCollege({ ...college, name: e.target.value })} placeholder="e.g. IIT Delhi" className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/20 text-sm focus:outline-none focus:border-violet-500/50 transition-all" />
                    {errors.collegeName && <p className="mt-1 text-xs text-red-400">{errors.collegeName}</p>}
                  </div>
                  <div>
                    <label className="block text-xs text-white/40 mb-1.5">Graduation Year</label>
                    <select value={college.graduationYear} onChange={(e) => setCollege({ ...college, graduationYear: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-[#111] border border-white/10 text-white text-sm focus:outline-none focus:border-violet-500/50 transition-all appearance-none cursor-pointer">
                      <option value="">Select year</option>
                      {years.map((y) => <option key={y} value={y}>{y}</option>)}
                    </select>
                    {errors.gradYear && <p className="mt-1 text-xs text-red-400">{errors.gradYear}</p>}
                  </div>
                  <div>
                    <label className="block text-xs text-white/40 mb-1.5">Branch</label>
                    <input type="text" value={college.branch} onChange={(e) => setCollege({ ...college, branch: e.target.value })} placeholder="e.g. Computer Science, AI & ML" className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/20 text-sm focus:outline-none focus:border-violet-500/50 transition-all" />
                    {errors.branch && <p className="mt-1 text-xs text-red-400">{errors.branch}</p>}
                  </div>
                  <div>
                    <label className="block text-xs text-white/40 mb-1.5">Section</label>
                    <input type="text" value={college.section} onChange={(e) => setCollege({ ...college, section: e.target.value })} placeholder="e.g. A, B, C" className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/20 text-sm focus:outline-none focus:border-violet-500/50 transition-all" />
                    {errors.section && <p className="mt-1 text-xs text-red-400">{errors.section}</p>}
                  </div>
                </div>
              </div>
            </div>

            {submitError && <p className="text-sm text-red-400 text-center">{submitError}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm transition-all hover:shadow-lg hover:shadow-violet-600/25 active:scale-[0.98] mt-2"
            >
              {submitting ? "Creating account..." : "Create account"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
