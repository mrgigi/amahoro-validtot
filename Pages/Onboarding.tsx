import React, { useEffect, useState } from "react";
import { supabase, ensureUserProfile } from "../src/supabaseClient";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Info } from "lucide-react";
import { COUNTRY_OPTIONS } from "./Auth";
import { createPageUrl } from "../src/lib/utils";

type GenderValue = "male" | "female" | "";
type AgeRangeValue =
  | ""
  | "18-24"
  | "25-34"
  | "35-44"
  | "45-54"
  | "55+"
  | "Prefer not to say";

export default function Onboarding() {
  const [gender, setGender] = useState<GenderValue>("");
  const [ageRange, setAgeRange] = useState<AgeRangeValue>("");
  const [country, setCountry] = useState("");
  const [publisher, setPublisher] = useState(false);
  const [jobTitle, setJobTitle] = useState("");
  const [organization, setOrganization] = useState("");
  const [showPublisherInfo, setShowPublisherInfo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        const {
          data: { user }
        } = await supabase.auth.getUser();

        if (!user) {
          navigate("/auth", { replace: true });
          return;
        }

        await ensureUserProfile(user);

        const { data: profile } = await supabase
          .from("profiles")
          .select("gender, country, age_range")
          .eq("id", user.id)
          .maybeSingle();

        if (profile) {
          if (profile.gender) {
            const value = String(profile.gender).toLowerCase();
            if (value === "male" || value === "female") {
              setGender(value as GenderValue);
            }
          }
          if (profile.country) {
            setCountry(profile.country);
          }
          if (profile.age_range) {
            setAgeRange(profile.age_range as AgeRangeValue);
          }
        }
      } catch (err) {
        setError("Failed to load your profile. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (step === 1) {
      if (!gender) {
        setError("Please select your gender.");
        return;
      }

      setStep(2);
      return;
    }

    if (step === 2) {
      if (!ageRange) {
        setError("Please select your age range.");
        return;
      }

      setStep(3);
      return;
    }

    if (step === 3) {
      if (!country) {
        setError("Please select your country.");
        return;
      }

      setStep(4);
      return;
    }

    if (publisher) {
      if (!jobTitle.trim()) {
        setError("Please enter your job title or role.");
        return;
      }
      if (!organization.trim()) {
        setError("Please enter your organization.");
        return;
      }
    }

    setSaving(true);

    try {
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        setError("You need to be signed in to continue.");
        setSaving(false);
        return;
      }

      await ensureUserProfile(user);

      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          gender,
          country,
          age_range: ageRange || null,
          onboarding_complete: true
        })
        .eq("id", user.id);

      if (profileError) {
        throw profileError;
      }

      const metadata: Record<string, any> = {
        intended_publisher: publisher
      };

      if (publisher) {
        metadata.publisher_job_title = jobTitle.trim();
        metadata.publisher_organization = organization.trim();
      }

      const { error: authError } = await supabase.auth.updateUser({
        data: metadata
      });

      if (authError) {
        throw authError;
      }

      navigate(createPageUrl("Feed"), { replace: true });
    } catch (err: any) {
      setError(err.message || "Failed to save your details. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F5F5]">
        <div className="text-2xl font-black animate-pulse">
          Preparing your onboarding...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F5F5] p-4">
      <div className="w-full max-w-xl bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6">
        <div className="flex items-center justify-between mb-6">
          <Link
            to={createPageUrl("Feed")}
            className="px-3 py-2 bg-[#F5F5F5] border-4 border-black font-black text-xs shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
          >
            <ArrowLeft className="w-4 h-4 inline-block mr-1" />
            Home
          </Link>
          <div className="text-right">
            <div className="text-xs font-bold text-gray-500">
              Step {step} of 4
            </div>
            <div className="text-xl font-black">
              Tell us about you
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {step === 1 && (
            <div>
              <div className="text-sm font-bold mb-1">Your gender</div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm font-bold">
                  <input
                    type="radio"
                    name="gender"
                    value="male"
                    checked={gender === "male"}
                    onChange={() => setGender("male")}
                    className="w-4 h-4"
                  />
                  <span>Male</span>
                </label>
                <label className="flex items-center gap-2 text-sm font-bold">
                  <input
                    type="radio"
                    name="gender"
                    value="female"
                    checked={gender === "female"}
                    onChange={() => setGender("female")}
                    className="w-4 h-4"
                  />
                  <span>Female</span>
                </label>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <div className="text-sm font-bold mb-1">Your age range</div>
              <select
                value={ageRange}
                onChange={(e) => setAgeRange(e.target.value as AgeRangeValue)}
                className="w-full p-3 border-4 border-black font-bold bg-[#F5F5F5] focus:outline-none focus:bg-[#FFFF00] transition-colors"
              >
                <option value="">Select an age range</option>
                <option value="18-24">18–24</option>
                <option value="25-34">25–34</option>
                <option value="35-44">35–44</option>
                <option value="45-54">45–54</option>
                <option value="55+">55+</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
            </div>
          )}

          {step === 3 && (
            <div>
              <div className="text-sm font-bold mb-1">Your country</div>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full p-3 border-4 border-black font-bold bg-[#F5F5F5] focus:outline-none focus:bg-[#FFFF00] transition-colors"
              >
                <option value="">Select a country</option>
                {COUNTRY_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          )}

          {step === 4 && (
            <div className="border-2 border-black p-4 bg-[#F9F9F9]">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-bold">
                  How will you use ValidToT?
                </div>
                <button
                  type="button"
                  onClick={() => setShowPublisherInfo((prev) => !prev)}
                  className="flex items-center gap-1 text-xs font-bold"
                >
                  <Info className="w-4 h-4" />
                  <span>About roles</span>
                </button>
              </div>

              {showPublisherInfo && (
                <div className="mb-3 p-3 border-2 border-black bg-[#FFFF00] text-xs font-bold">
                  On ValidToT, one account lets you vote and create campaigns.
                  Admin access is only needed for advanced analytics, and you can
                  upgrade anytime.
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked
                    disabled
                    className="w-4 h-4"
                  />
                  <div className="text-sm font-bold">
                    Voter
                    <span className="ml-1 text-xs font-bold text-gray-500">
                      (always enabled)
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={publisher}
                    onChange={(e) => setPublisher(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <div className="text-sm font-bold">
                    Publisher
                    <span className="ml-1 text-xs font-bold text-gray-500">
                      (create campaigns, request deeper analytics)
                    </span>
                  </div>
                </div>
              </div>

              {publisher && (
                <div className="mt-3 space-y-3">
                  <div>
                    <div className="text-sm font-bold mb-1">
                      Your organization
                    </div>
                    <input
                      type="text"
                      value={organization}
                      onChange={(e) => setOrganization(e.target.value)}
                      className="w-full p-2 border-2 border-black font-bold bg-[#F5F5F5] focus:outline-none focus:bg-[#FFFF00] transition-colors"
                      placeholder="e.g. Campaign or organization name"
                    />
                  </div>
                  <div>
                    <div className="text-sm font-bold mb-1">
                      Job title or role
                    </div>
                    <input
                      type="text"
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      className="w-full p-2 border-2 border-black font-bold bg-[#F5F5F5] focus:outline-none focus:bg-[#FFFF00] transition-colors"
                      placeholder="e.g. Campaign manager"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="p-3 border-4 border-black bg-red-100 font-bold text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full p-3 bg-[#FF006E] text-white border-4 border-black font-black text-lg shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving
              ? "Saving..."
              : step === 4
              ? "Continue to home feed"
              : "Continue"}
          </button>
        </form>
      </div>
    </div>
  );
}
