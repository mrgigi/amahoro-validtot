import React, { useEffect, useState } from "react";
import { supabase, checkAdminRole } from "../src/supabaseClient";
import { ArrowLeft, User, LogOut, Clock, FileText } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { createPageUrl } from "../src/lib/utils";
import { COUNTRY_OPTIONS } from "./Auth";
import LoadingScreen from "../Components/LoadingScreen";

type ProfileRow = {
  id: string;
  username: string;
  created_at: string;
  gender?: string | null;
  country?: string | null;
  cohort?: string | null;
};

export default function Profile() {
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<"posts" | "votes">("posts");
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileGenderInput, setProfileGenderInput] = useState("");
  const [profileCountryInput, setProfileCountryInput] = useState("");
  const [profileCohortInput, setProfileCohortInput] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [adminJobTitle, setAdminJobTitle] = useState<string | null>(null);
  const [adminOrganization, setAdminOrganization] = useState<string | null>(null);
  const [isEditingAdmin, setIsEditingAdmin] = useState(false);
  const [adminJobTitleInput, setAdminJobTitleInput] = useState("");
  const [adminOrganizationInput, setAdminOrganizationInput] = useState("");
  const [savingAdmin, setSavingAdmin] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  useEffect(() => {
    const load = async () => {
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      setEmail(user.email ?? null);

      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, created_at, gender, country, cohort")
        .eq("id", user.id)
        .maybeSingle();

      if (!error && data) {
        setProfile(data as ProfileRow);
      }

      const role = await checkAdminRole(user.id);
      const isAdminUser = !!role;
      setIsAdmin(isAdminUser);

      if (isAdminUser) {
        const { data: adminRow, error: adminError } = await supabase
          .from("admins")
          .select("organization, job_title")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!adminError && adminRow) {
          setAdminJobTitle((adminRow as any).job_title ?? null);
          setAdminOrganization((adminRow as any).organization ?? null);
        } else {
          setAdminJobTitle(null);
          setAdminOrganization(null);
        }
      } else {
        setAdminJobTitle(null);
        setAdminOrganization(null);
      }

      setLoading(false);
    };

    load();
  }, []);

  const { data: votes = [], isLoading: votesLoading } = useQuery({
    queryKey: ["my_votes"],
    queryFn: async () => {
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        return [];
      }

      const { data, error } = await supabase
        .from("votes")
        .select(
          "id, post_id, option_index, created_at, post:posts(id, title, options)"
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) {
        console.error("Error loading vote history:", error);
        throw error;
      }

      return data || [];
    }
  });

  const { data: myPosts = [], isLoading: myPostsLoading } = useQuery({
    queryKey: ["my_posts"],
    queryFn: async () => {
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        return [];
      }

      const { data, error } = await supabase
        .from("posts")
        .select("id, title, created_at, total_votes, comment_count, is_hidden")
        .eq("created_by", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) {
        console.error("Error loading my posts:", error);
        throw error;
      }

      return data || [];
    }
  });

  if (loading) {
    return <LoadingScreen mainText="Loading your profile…" />;
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F5F5]">
        <div className="text-center">
          <div className="text-2xl font-black mb-4">No profile found</div>
          <Link
            to={createPageUrl("Feed")}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#FF006E] text-white border-4 border-black font-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
          >
            Go back
          </Link>
        </div>
      </div>
    );
  }

  const roles: string[] = [];
  if (isAdmin) {
    roles.push("Admin");
  }
  roles.push("Voter");
  const roleLabel = roles.join(", ");

  const formatGender = (value?: string | null) => {
    if (!value) return "Not set";
    const lower = value.toLowerCase();
    if (lower === "male") return "Male";
    if (lower === "female") return "Female";
    return value.charAt(0).toUpperCase() + value.slice(1);
  };

  const handleStartEditProfile = () => {
    setProfileError(null);
    setProfileGenderInput(profile.gender || "");
    setProfileCountryInput(profile.country || "");
    setProfileCohortInput(profile.cohort || "");
    setIsEditingProfile(true);
  };

  const handleCancelEditProfile = () => {
    setIsEditingProfile(false);
    setProfileError(null);
  };

  const handleSaveProfileDetails = async () => {
    setSavingProfile(true);
    setProfileError(null);
    try {
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        setProfileError("You must be signed in to update your profile.");
        setSavingProfile(false);
        return;
      }

      const updates: any = {
        gender: profileGenderInput || null,
        country: profileCountryInput || null,
        cohort: profileCohortInput || null
      };

      const { data, error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", user.id)
        .select("id, username, created_at, gender, country, cohort")
        .maybeSingle();

      if (error) {
        setProfileError(error.message || "Failed to update profile details.");
        setSavingProfile(false);
        return;
      }

      if (data) {
        setProfile(data as ProfileRow);
      } else if (profile) {
        setProfile({
          ...profile,
          gender: updates.gender,
          country: updates.country,
          cohort: updates.cohort
        });
      }

      setIsEditingProfile(false);
    } catch (err: any) {
      setProfileError(err.message || "Failed to update profile details.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleStartEditAdmin = () => {
    setAdminError(null);
    setAdminJobTitleInput(adminJobTitle ?? "");
    setAdminOrganizationInput(adminOrganization ?? "");
    setIsEditingAdmin(true);
  };

  const handleCancelEditAdmin = () => {
    setIsEditingAdmin(false);
    setAdminError(null);
  };

  const handleSaveAdminDetails = async () => {
    setSavingAdmin(true);
    setAdminError(null);
    try {
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        setAdminError("You must be signed in to update admin details.");
        setSavingAdmin(false);
        return;
      }

      const updates: any = {
        user_id: user.id,
        job_title: adminJobTitleInput || null,
        organization: adminOrganizationInput || null,
        role: "admin"
      };

      const { error } = await supabase
        .from("admins")
        .upsert(updates, { onConflict: "user_id" });

      if (error) {
        setAdminError(error.message || "Failed to update admin details.");
        setSavingAdmin(false);
        return;
      }

      setAdminJobTitle(updates.job_title);
      setAdminOrganization(updates.organization);
      setIsEditingAdmin(false);
    } catch (err: any) {
      setAdminError(err.message || "Failed to update admin details.");
    } finally {
      setSavingAdmin(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5] p-4">
      <div className="max-w-xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Link
            to={createPageUrl("Feed")}
            className="p-3 bg-white border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all"
          >
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div className="flex items-center gap-3">
            <User className="w-8 h-8" />
            <h1 className="text-3xl font-black transform -rotate-1">
              Your Profile
            </h1>
          </div>
        </div>

        <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6 space-y-4">
          <div>
            <div className="text-sm font-bold text-gray-600">Username</div>
            <div className="text-2xl font-black">{profile.username}</div>
          </div>
          {email && (
            <div>
              <div className="text-sm font-bold text-gray-600">Email</div>
              <div className="font-bold">{email}</div>
            </div>
          )}
          <div>
            <div className="text-sm font-bold text-gray-600">Roles</div>
            <div className="font-bold">
              {roleLabel}
            </div>
          </div>
          <div>
            <div className="text-sm font-bold text-gray-600">Joined</div>
            <div className="font-bold">
              {new Date(profile.created_at).toLocaleString()}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
            <div className="text-sm font-bold text-gray-600">Gender</div>
            <div className="font-bold">
              {formatGender(profile.gender)}
            </div>
            </div>
            <div>
              <div className="text-sm font-bold text-gray-600">Country</div>
              <div className="font-bold">
                {profile.country || "Not set"}
              </div>
            </div>
            <div>
              <div className="text-sm font-bold text-gray-600">Cohort</div>
              <div className="font-bold">
                {profile.cohort || "Not set"}
              </div>
            </div>
          </div>

          <div className="mt-2 flex justify-end">
            {!isEditingProfile && (
              <button
                type="button"
                onClick={handleStartEditProfile}
                className="px-3 py-1 text-xs font-black border-2 border-black bg-white"
              >
                Edit profile details
              </button>
            )}
          </div>

          {isEditingProfile && (
            <div className="mt-4 border-t-2 border-dashed border-gray-300 pt-4 space-y-3">
              {profileError && (
                <div className="p-2 border-2 border-black bg-red-100 text-xs font-bold">
                  {profileError}
                </div>
              )}
              <div>
                <div className="text-sm font-bold text-gray-600">Gender</div>
                <div className="flex gap-4 mt-1">
                  <label className="flex items-center gap-2 text-sm font-bold">
                    <input
                      type="radio"
                      name="edit-gender"
                      value="male"
                      checked={profileGenderInput === "male"}
                      onChange={() => setProfileGenderInput("male")}
                      className="w-4 h-4"
                    />
                    <span>Male</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm font-bold">
                    <input
                      type="radio"
                      name="edit-gender"
                      value="female"
                      checked={profileGenderInput === "female"}
                      onChange={() => setProfileGenderInput("female")}
                      className="w-4 h-4"
                    />
                    <span>Female</span>
                  </label>
                </div>
              </div>
              <div>
                <div className="text-sm font-bold text-gray-600">Country</div>
                <select
                  value={profileCountryInput}
                  onChange={(e) => setProfileCountryInput(e.target.value)}
                  className="w-full mt-1 p-2 border-2 border-black font-bold bg-[#F5F5F5] focus:outline-none focus:bg-[#FFFF00] transition-colors"
                >
                  <option value="">Select a country</option>
                  {COUNTRY_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div className="text-sm font-bold text-gray-600">Cohort</div>
                <div className="flex gap-4 mt-1">
                  <label className="flex items-center gap-2 text-sm font-bold">
                    <input
                      type="radio"
                      name="edit-cohort"
                      value="1"
                      checked={profileCohortInput === "1"}
                      onChange={() => setProfileCohortInput("1")}
                      className="w-4 h-4"
                    />
                    <span>Cohort 1</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm font-bold">
                    <input
                      type="radio"
                      name="edit-cohort"
                      value="2"
                      checked={profileCohortInput === "2"}
                      onChange={() => setProfileCohortInput("2")}
                      className="w-4 h-4"
                    />
                    <span>Cohort 2</span>
                  </label>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSaveProfileDetails}
                  disabled={savingProfile}
                  className="px-4 py-2 bg-[#00FF00] border-2 border-black font-black text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingProfile ? "Saving..." : "Save changes"}
                </button>
                <button
                  type="button"
                  onClick={handleCancelEditProfile}
                  disabled={savingProfile}
                  className="px-4 py-2 bg-white border-2 border-black font-black text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {isAdmin && (
            <div className="mt-4 border-t-2 border-dashed border-gray-300 pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-bold text-gray-600">Admin details</div>
                {!isEditingAdmin && (
                  <button
                    type="button"
                    onClick={handleStartEditAdmin}
                    className="px-3 py-1 text-xs font-black border-2 border-black bg-[#FFFF00]"
                  >
                    Edit
                  </button>
                )}
              </div>

              {!isEditingAdmin && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-bold text-gray-600">Job title or role</div>
                    <div className="font-bold">
                      {adminJobTitle || "Not set"}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-600">Organization</div>
                    <div className="font-bold">
                      {adminOrganization || "Not set"}
                    </div>
                  </div>
                </div>
              )}

              {isEditingAdmin && (
                <div className="space-y-3">
                  {adminError && (
                    <div className="p-2 border-2 border-black bg-red-100 text-xs font-bold">
                      {adminError}
                    </div>
                  )}
                  <div>
                    <div className="text-sm font-bold text-gray-600">Job title or role</div>
                    <input
                      type="text"
                      value={adminJobTitleInput}
                      onChange={(e) => setAdminJobTitleInput(e.target.value)}
                      className="w-full p-2 border-2 border-black font-bold bg-[#F5F5F5] focus:outline-none focus:bg-[#FFFF00] transition-colors"
                      placeholder="e.g. Campaign manager"
                    />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-600">Organization</div>
                    <input
                      type="text"
                      value={adminOrganizationInput}
                      onChange={(e) => setAdminOrganizationInput(e.target.value)}
                      className="w-full p-2 border-2 border-black font-bold bg-[#F5F5F5] focus:outline-none focus:bg-[#FFFF00] transition-colors"
                      placeholder="e.g. Organization or campaign name"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleSaveAdminDetails}
                      disabled={savingAdmin}
                      className="px-4 py-2 bg-[#00FF00] border-2 border-black font-black text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {savingAdmin ? "Saving..." : "Save changes"}
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelEditAdmin}
                      disabled={savingAdmin}
                      className="px-4 py-2 bg-white border-2 border-black font-black text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-6 flex gap-3 border-b-4 border-black pb-1 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("posts")}
            className={`flex items-center gap-2 px-4 py-2 font-black text-sm md:text-base whitespace-nowrap transition-all ${
              activeTab === "posts"
                ? "bg-black text-white translate-y-[2px]"
                : "bg-transparent text-black hover:bg-gray-200"
            }`}
          >
            <FileText className="w-4 h-4" />
            Your posts
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("votes")}
            className={`flex items-center gap-2 px-4 py-2 font-black text-sm md:text-base whitespace-nowrap transition-all ${
              activeTab === "votes"
                ? "bg-black text-white translate-y-[2px]"
                : "bg-transparent text-black hover:bg-gray-200"
            }`}
          >
            <Clock className="w-4 h-4" />
            Your votes
          </button>
        </div>

        {activeTab === "posts" && (
          <div className="mt-6 bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5" />
              <h2 className="text-xl font-black">Your posts</h2>
            </div>

            {myPostsLoading ? (
              <div className="text-sm font-bold text-gray-500">
                Loading your posts...
              </div>
            ) : myPosts.length === 0 ? (
              <div className="text-sm font-bold text-gray-500">
                You haven&apos;t created any posts yet.
              </div>
            ) : (
              <div className="space-y-3">
                {myPosts.map((post: any) => {
                  const createdAt = post.created_at
                    ? new Date(post.created_at).toLocaleString()
                    : "Unknown time";
                  const votesCount = post.total_votes || 0;
                  const commentsCount = post.comment_count || 0;
                  const isHiddenPost = !!post.is_hidden;

                  return (
                    <Link
                      key={post.id}
                      to={createPageUrl("Post", post.id)}
                      className="block border-2 border-black p-3 hover:bg-gray-50 transition-colors"
                    >
                      <div className="font-black text-sm mb-1">
                        {post.title || "Untitled post"}
                      </div>
                      <div className="text-xs font-bold text-gray-500 mb-1">
                        Created: {createdAt}
                      </div>
                      <div className="text-xs font-bold text-gray-500">
                        {votesCount} vote{votesCount !== 1 ? "s" : ""} •{" "}
                        {commentsCount} comment{commentsCount !== 1 ? "s" : ""}
                        {isHiddenPost && (
                          <span className="ml-2 px-2 py-0.5 text-[10px] uppercase bg-red-600 text-white border border-black font-black">
                            Hidden
                          </span>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === "votes" && (
          <div className="mt-6 bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5" />
              <h2 className="text-xl font-black">Your recent votes</h2>
            </div>

            {votesLoading ? (
              <div className="text-sm font-bold text-gray-500">
                Loading your votes...
              </div>
            ) : votes.length === 0 ? (
              <div className="text-sm font-bold text-gray-500">
                You haven&apos;t voted on any posts yet.
              </div>
            ) : (
              <div className="space-y-3">
                {votes.map((vote: any) => {
                  const post = vote.post;
                  const options = post?.options || [];
                  const index =
                    typeof vote.option_index === "number"
                      ? vote.option_index
                      : 0;
                  const choiceLabel =
                    options[index] !== undefined
                      ? options[index]
                      : `Option #${index + 1}`;
                  const timestamp = vote.created_at
                    ? new Date(vote.created_at).toLocaleString()
                    : "Unknown time";

                  return (
                    <Link
                      key={vote.id}
                      to={createPageUrl("Post", vote.post_id)}
                      className="block border-2 border-black p-3 hover:bg-gray-50 transition-colors"
                    >
                      <div className="font-black text-sm mb-1">
                        {post?.title || "Untitled post"}
                      </div>
                      <div className="text-sm font-bold text-gray-700">
                        You voted for:{" "}
                        <span className="font-black">{choiceLabel}</span>
                      </div>
                      <div className="text-xs font-bold text-gray-500 mt-1">
                        {timestamp}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <button
          onClick={handleLogout}
          className="w-full mt-6 p-4 bg-[#FF0000] text-white border-4 border-black font-black text-lg shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all flex items-center justify-center gap-2"
        >
          <LogOut className="w-6 h-6" />
          LOG OUT
        </button>
      </div>
    </div>
  );
}
