import React, { useState } from "react";
import { supabase, ensureUserProfile } from "../src/supabaseClient";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";

export const COUNTRY_OPTIONS = [
  "Afghanistan",
  "Albania",
  "Algeria",
  "Andorra",
  "Angola",
  "Antigua and Barbuda",
  "Argentina",
  "Armenia",
  "Australia",
  "Austria",
  "Azerbaijan",
  "Bahamas",
  "Bahrain",
  "Bangladesh",
  "Barbados",
  "Belarus",
  "Belgium",
  "Belize",
  "Benin",
  "Bhutan",
  "Bolivia",
  "Bosnia and Herzegovina",
  "Botswana",
  "Brazil",
  "Brunei",
  "Bulgaria",
  "Burkina Faso",
  "Burundi",
  "Cabo Verde",
  "Cambodia",
  "Cameroon",
  "Canada",
  "Central African Republic",
  "Chad",
  "Chile",
  "China",
  "Colombia",
  "Comoros",
  "Congo",
  "Costa Rica",
  "Croatia",
  "Cuba",
  "Cyprus",
  "Czech Republic",
  "Democratic Republic of the Congo",
  "Denmark",
  "Djibouti",
  "Dominica",
  "Dominican Republic",
  "Ecuador",
  "Egypt",
  "El Salvador",
  "Equatorial Guinea",
  "Eritrea",
  "Estonia",
  "Eswatini",
  "Ethiopia",
  "Fiji",
  "Finland",
  "France",
  "Gabon",
  "Gambia",
  "Georgia",
  "Germany",
  "Ghana",
  "Greece",
  "Grenada",
  "Guatemala",
  "Guinea",
  "Guinea-Bissau",
  "Guyana",
  "Haiti",
  "Honduras",
  "Hungary",
  "Iceland",
  "India",
  "Indonesia",
  "Iran",
  "Iraq",
  "Ireland",
  "Israel",
  "Italy",
  "Jamaica",
  "Japan",
  "Jordan",
  "Kazakhstan",
  "Kenya",
  "Kiribati",
  "Kuwait",
  "Kyrgyzstan",
  "Laos",
  "Latvia",
  "Lebanon",
  "Lesotho",
  "Liberia",
  "Libya",
  "Liechtenstein",
  "Lithuania",
  "Luxembourg",
  "Madagascar",
  "Malawi",
  "Malaysia",
  "Maldives",
  "Mali",
  "Malta",
  "Marshall Islands",
  "Mauritania",
  "Mauritius",
  "Mexico",
  "Micronesia",
  "Moldova",
  "Monaco",
  "Mongolia",
  "Montenegro",
  "Morocco",
  "Mozambique",
  "Myanmar",
  "Namibia",
  "Nauru",
  "Nepal",
  "Netherlands",
  "New Zealand",
  "Nicaragua",
  "Niger",
  "Nigeria",
  "North Korea",
  "North Macedonia",
  "Norway",
  "Oman",
  "Pakistan",
  "Palau",
  "Panama",
  "Papua New Guinea",
  "Paraguay",
  "Peru",
  "Philippines",
  "Poland",
  "Portugal",
  "Qatar",
  "Romania",
  "Russia",
  "Rwanda",
  "Saint Kitts and Nevis",
  "Saint Lucia",
  "Saint Vincent and the Grenadines",
  "Samoa",
  "San Marino",
  "Sao Tome and Principe",
  "Saudi Arabia",
  "Senegal",
  "Serbia",
  "Seychelles",
  "Sierra Leone",
  "Singapore",
  "Slovakia",
  "Slovenia",
  "Solomon Islands",
  "Somalia",
  "South Africa",
  "South Korea",
  "South Sudan",
  "Spain",
  "Sri Lanka",
  "Sudan",
  "Suriname",
  "Sweden",
  "Switzerland",
  "Syria",
  "Taiwan",
  "Tajikistan",
  "Tanzania",
  "Thailand",
  "Timor-Leste",
  "Togo",
  "Tonga",
  "Trinidad and Tobago",
  "Tunisia",
  "Turkey",
  "Turkmenistan",
  "Tuvalu",
  "Uganda",
  "Ukraine",
  "United Arab Emirates",
  "United Kingdom",
  "United States",
  "Uruguay",
  "Uzbekistan",
  "Vanuatu",
  "Venezuela",
  "Vietnam",
  "Yemen",
  "Zambia",
  "Zimbabwe",
  "Other"
];

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<"signup" | "signin">("signin");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const fromState = location.state as { from?: { pathname?: string }; reason?: string } | null;
  const fromPath = fromState?.from?.pathname;
  const authReason = fromState?.reason;
  const allowedReturnPaths = ["/create-post", "/admin"];
  const defaultAfterLogin = "/";

  const authContextMessage =
    authReason === "vote"
      ? null
      : authReason === "comment"
      ? "Sign in to add a comment."
      : authReason === "report_post"
      ? "Sign in to report posts and keep ValidToT safe."
      : authReason === "report_comment"
      ? "Sign in to report comments and keep ValidToT safe."
      : authReason
      ? "Sign in to continue."
      : null;

  const passwordIsStrongEnough = (value: string) => {
    if (value.length < 8) return false;
    const hasLetter = /[A-Za-z]/.test(value);
    const hasNumber = /[0-9]/.test(value);
    return hasLetter && hasNumber;
  };

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
        if (!passwordIsStrongEnough(password)) {
          throw new Error("Password must be at least 8 characters and include a letter and a number.");
        }

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
        const { data: emailExists, error: rpcError } = await supabase.rpc("email_exists", {
          email_arg: email,
        });

        if (!rpcError && !emailExists) {
          throw new Error("No account found with this email. Please sign up instead.");
        }

        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          const message = error.message || "";
          if (
            message.toLowerCase().includes("invalid login credentials") ||
            message.toLowerCase().includes("invalid login") ||
            message.toLowerCase().includes("invalid email or password")
          ) {
            throw new Error("Incorrect email or password. Please try again.");
          }
          throw error;
        }

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          await ensureUserProfile(user);

          const { data: profile } = await supabase
            .from("profiles")
            .select("gender, country")
            .eq("id", user.id)
            .maybeSingle();

          const needsOnboarding =
            !profile || !profile.gender || !profile.country;

          if (needsOnboarding) {
            navigate("/onboarding", { replace: true });
            return;
          }
        }

        navigate(defaultAfterLogin, { replace: true });
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setError(null);
    setMessage(null);
    if (!email) {
      setError("Enter your email to reset your password.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) {
        throw error;
      }
      setMessage("If an account exists for that email, we sent a reset link.");
    } catch (err: any) {
      setError(err.message || "Failed to send password reset email.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F5F5] p-4">
      <div className="w-full max-w-md bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6">
        <div className="mb-4 flex justify-center">
          <Link
            to="/"
            className="px-4 py-2 bg-[#F5F5F5] border-4 border-black font-black text-xs shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
          >
            Go home
          </Link>
        </div>
        <div className="text-center mb-6">
          <div className="text-4xl font-black mb-2 transform -rotate-2">
            ValidToT
          </div>
          <div className="font-bold">
            {mode === "signup"
              ? "Sign up to join campaigns and vote on ValidToT"
              : "Sign in to see campaigns and vote"}
          </div>
        </div>

        {authContextMessage && !error && !message && (
          <div className="mb-4 p-3 border-4 border-black bg-[#FFFF00] font-bold text-xs">
            {authContextMessage}
          </div>
        )}

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
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 pr-12 border-4 border-black font-bold bg-[#F5F5F5] focus:outline-none focus:bg-[#FFFF00] transition-colors"
                placeholder={
                  mode === "signup"
                    ? "At least 8 characters, include a letter and a number"
                    : "Your password"
                }
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute inset-y-0 right-0 px-3 flex items-center justify-center text-gray-700"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
            {mode === "signin" && (
              <button
                type="button"
                onClick={handleResetPassword}
                disabled={loading}
                className="mt-2 text-xs font-bold underline"
              >
                Forgot your password?
              </button>
            )}
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
