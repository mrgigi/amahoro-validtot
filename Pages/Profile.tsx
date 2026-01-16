import React, { useEffect, useState } from "react";
import { supabase } from "../src/supabaseClient";
import { ArrowLeft, User, LogOut, Clock } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { createPageUrl } from "../src/lib/utils";

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F5F5]">
        <div className="text-center">
          <div className="text-2xl font-black">Loading profile...</div>
        </div>
      </div>
    );
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
            <div className="text-sm font-bold text-gray-600">Joined</div>
            <div className="font-bold">
              {new Date(profile.created_at).toLocaleString()}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <div className="text-sm font-bold text-gray-600">Gender</div>
              <div className="font-bold">
                {profile.gender || "Not set"}
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
        </div>

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

        <button
          onClick={handleLogout}
          className="w-full mt-6 p-4 bg-[#FF0000] text-white border-4 border-black font-black text-xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all flex items-center justify-center gap-2"
        >
          <LogOut className="w-6 h-6" />
          LOG OUT
        </button>
      </div>
    </div>
  );
}
