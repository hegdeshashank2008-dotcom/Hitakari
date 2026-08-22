import React, { useState, useEffect } from "react";
import Navbar from "./components/Navbar";
import Home from "./components/Home";
import Login from "./components/Login";
import Personalization from "./components/Personalization";
import Dashboard from "./components/Dashboard";
import { api } from "./utils/api";
import { User } from "./types";
import { Loader2 } from "lucide-react";

export default function App() {
  const [currentView, setCurrentView] = useState<string>("home");
  const [user, setUser] = useState<User | null>(null);
  const [authChecking, setAuthChecking] = useState<boolean>(true);

  // Background particles
  const [particles, setParticles] = useState<Array<{ id: number; left: string; duration: string; delay: string; size: string }>>([]);

  // Check persistent session on load
  useEffect(() => {
    async function checkAuth() {
      const token = localStorage.getItem("hitkari_token");
      if (token) {
        try {
          const fetchedUser = await api.getMe();
          setUser(fetchedUser);
          setCurrentView("dashboard");
        } catch (err) {
          console.warn("Expired persistent token, logging out.", err);
          api.logout();
        }
      }
      setAuthChecking(false);
    }
    checkAuth();
  }, []);

  // Generate background stars/particles once
  useEffect(() => {
    const generated = Array.from({ length: 25 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      duration: `${Math.random() * 8 + 4}s`,
      delay: `${Math.random() * 4}s`,
      size: `${Math.random() * 3 + 1}px`
    }));
    setParticles(generated);
  }, []);

  const handleAuthSuccess = (authenticatedUser: User, token: string) => {
    localStorage.setItem("hitkari_token", token);
    setUser(authenticatedUser);
    setCurrentView("dashboard");
  };

  const handleLogout = () => {
    api.logout();
    setUser(null);
    setCurrentView("home");
  };

  if (authChecking) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
          <p className="text-sm text-slate-400">Authenticating Hitkari session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 font-sans relative select-none selection:bg-indigo-500/30 overflow-x-hidden">
      {/* ---------------------------------------------------------------------
          AMBIENT RETRO COSMIC BACKDROP
         --------------------------------------------------------------------- */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        {/* Dynamic slow scrolling gradient */}
        <div className="absolute inset-0 bg-gradient-to-tr from-slate-950 via-slate-900 to-indigo-950 opacity-90" />
        
        {/* Colored cosmic fog */}
        <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-indigo-500/5 rounded-full filter blur-[120px] mix-blend-screen animate-pulse duration-[10s]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-amber-500/5 rounded-full filter blur-[140px] mix-blend-screen animate-pulse duration-[15s]" />

        {/* Scrolling float particles */}
        {particles.map((p) => (
          <div
            key={p.id}
            className="absolute rounded-full bg-white/20 animate-float"
            style={{
              left: p.left,
              width: p.size,
              height: p.size,
              animationDuration: p.duration,
              animationDelay: p.delay,
              top: "100%",
            }}
          />
        ))}
      </div>

      {/* ---------------------------------------------------------------------
          APPLICATION NAVIGATION
         --------------------------------------------------------------------- */}
      <Navbar 
        currentView={currentView} 
        onNavigate={setCurrentView} 
        user={user} 
        onLogout={handleLogout} 
      />

      {/* ---------------------------------------------------------------------
          ACTIVE SCREEN RENDERING
         --------------------------------------------------------------------- */}
      <main className="relative z-10 w-full min-h-screen">
        {currentView === "home" && (
          <Home 
            onStartPressed={() => setCurrentView(user ? "dashboard" : "login")} 
            isAuthenticated={!!user}
          />
        )}

        {currentView === "login" && (
          <Login 
            onAuthSuccess={handleAuthSuccess} 
            onBackToHome={() => setCurrentView("home")} 
          />
        )}

        {currentView === "personalize" && user && (
          <Personalization 
            onSaveSuccess={() => setCurrentView("dashboard")} 
          />
        )}

        {currentView === "dashboard" && user && (
          <Dashboard userId={user.id} />
        )}
      </main>

      {/* Add Floating Animation CSS directly to document head */}
      <style>{`
        @keyframes float {
          0% {
            transform: translateY(0) translateX(0);
            opacity: 0;
          }
          10% {
            opacity: 0.8;
          }
          90% {
            opacity: 0.8;
          }
          100% {
            transform: translateY(-110vh) translateX(50px);
            opacity: 0;
          }
        }
        .animate-float {
          animation-name: float;
          animation-iteration-count: infinite;
          animation-timing-function: linear;
        }
      `}</style>
    </div>
  );
}
