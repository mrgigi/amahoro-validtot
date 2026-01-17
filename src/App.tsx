import { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import CreatePost from "../Pages/CreatePost";
import AdminDashboard from "../Pages/AdminDashboard";
import Profile from "../Pages/Profile";
import Feed from "../Pages/Feed";
import Auth from "../Pages/Auth";
import Onboarding from "../Pages/Onboarding";
import { supabase, ensureUserProfile } from "./supabaseClient";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="h-screen flex items-center justify-center font-black">Loading...</div>;
  
  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

function OnboardingGate({
  children,
  user
}: {
  children: React.ReactNode;
  user: any | null;
}) {
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [checking, setChecking] = useState(true);
  const location = useLocation();

  useEffect(() => {
    let isMounted = true;

    const checkOnboarding = async () => {
      if (!user) {
        if (!isMounted) return;
        setNeedsOnboarding(false);
        setChecking(false);
        return;
      }

      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("onboarding_complete")
          .eq("id", user.id)
          .maybeSingle();

        if (!isMounted) return;

        const needs =
          !profile || !profile.onboarding_complete;

        setNeedsOnboarding(needs);
      } catch (error) {
        console.error("Error checking onboarding status:", error);
        if (!isMounted) return;
        setNeedsOnboarding(false);
      } finally {
        if (isMounted) {
          setChecking(false);
        }
      }
    };

    setChecking(true);
    checkOnboarding();

    return () => {
      isMounted = false;
    };
  }, [user, location.pathname]);

  if (needsOnboarding && location.pathname !== "/onboarding") {
    return <Navigate to="/onboarding" replace />;
  }

  if (checking) {
    return <>{children}</>;
  }

  return <>{children}</>;
}

export default function App() {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [bannedMessage, setBannedMessage] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };
    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const syncProfile = async () => {
      if (!user) {
        return;
      }

      try {
        const profile = await ensureUserProfile(user);

        if (profile?.is_banned) {
          setBannedMessage("Your account has been banned due to policy violations.");
          await supabase.auth.signOut();
          setUser(null);
        } else {
          setBannedMessage(null);
        }
      } catch (error) {
        console.error("Error syncing profile:", error);
      }
    };

    syncProfile();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F5F5]">
        <div className="text-2xl font-black animate-pulse">Loading ValidToT...</div>
      </div>
    );
  }

  if (bannedMessage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50 p-4">
        <div className="max-w-md w-full bg-white border-4 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-center">
          <div className="text-6xl font-black text-red-600 mb-4">BANNED</div>
          <p className="font-bold text-xl mb-6">{bannedMessage}</p>
          <button
            onClick={() => setBannedMessage(null)}
            className="px-6 py-3 bg-black text-white font-black border-2 border-transparent hover:bg-gray-800 transition-colors"
          >
            I Understand
          </button>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <OnboardingGate user={user}>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Feed />} />
          <Route path="/auth" element={<Auth />} />
          
          {/* Protected Routes */}
          <Route path="/create-post" element={
            <ProtectedRoute>
              <CreatePost />
            </ProtectedRoute>
          } />
          
          <Route path="/admin" element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          } />

          <Route path="/profile" element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } />

          <Route path="/onboarding" element={
            <ProtectedRoute>
              <Onboarding />
            </ProtectedRoute>
          } />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </OnboardingGate>
    </Router>
  );
}
