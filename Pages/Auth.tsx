import React, { useState } from "react";
import { supabase } from "../src/supabaseClient";
import { useNavigate, useLocation } from "react-router-dom";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signup" | "signin">("signin");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || "/";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (!email || !password) {
        throw new Error("Please enter an email and password.");
      }

      if (mode === "signup") {
        // Check if user exists via RPC to bypass security obfuscation (if function exists)
        const { data: emailExists, error: rpcError } = await supabase.rpc("email_exists", {
          email_arg: email,
        });

        if (!rpcError && emailExists) {
          throw new Error(
            "An account already exists with this email. Please sign in instead."
          );
        }

        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) {
          const message = error.message || "";
          if (
            message.toLowerCase().includes("already registered") ||
            message.toLowerCase().includes("already exists")
          ) {
            throw new Error(
              "An account already exists with this email. Please sign in instead."
            );
          }
          throw error;
        }
        setMessage("Check your email to confirm your account, then sign in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        // Redirect back to where they came from
        navigate(from, { replace: true });
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F5F5] p-4">
      <div className="w-full max-w-md bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6">
        <div className="text-center mb-6">
          <div className="text-4xl font-black mb-2 transform -rotate-2">
            ValidToT
          </div>
          <div className="font-bold">
            {mode === "signup"
              ? "Create an account to start posting"
              : "Sign in to continue"}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 border-4 border-black font-bold bg-[#F5F5F5] focus:outline-none focus:bg-[#FFFF00] transition-colors"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-bold mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border-4 border-black font-bold bg-[#F5F5F5] focus:outline-none focus:bg-[#FFFF00] transition-colors"
              placeholder="At least 6 characters"
            />
          </div>

          {error && (
            <div className="p-3 border-4 border-black bg-red-100 font-bold text-sm">
              {error}
            </div>
          )}
          {message && (
            <div className="p-3 border-4 border-black bg-[#FFFF00] font-bold text-sm">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full p-3 bg-[#FF006E] text-white border-4 border-black font-black text-lg shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading
              ? mode === "signup"
                ? "Creating account..."
                : "Signing in..."
              : mode === "signup"
              ? "Sign up"
              : "Sign in"}
          </button>
        </form>

        <div className="mt-4 text-center text-sm font-bold">
          {mode === "signup" ? (
            <>
              Already have an account?{" "}
              <button
                className="underline"
                onClick={() => {
                  setMode("signin");
                  setError(null);
                  setMessage(null);
                }}
              >
                Sign in
              </button>
            </>
          ) : (
            <>
              New here?{" "}
              <button
                className="underline"
                onClick={() => {
                  setMode("signup");
                  setError(null);
                  setMessage(null);
                }}
              >
                Create an account
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
