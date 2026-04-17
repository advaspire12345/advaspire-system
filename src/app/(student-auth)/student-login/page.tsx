"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function StudentLoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/student-auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }

      router.push("/student-portal");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm">
      {/* Game-themed header */}
      <div className="text-center mb-8">
        <div className="text-6xl mb-3">🎮</div>
        <h1 className="text-3xl font-bold text-white tracking-tight">
          Student Portal
        </h1>
        <p className="text-emerald-200 mt-1 text-sm">
          Enter your credentials to start your adventure
        </p>
      </div>

      {/* Login card */}
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 shadow-2xl">
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-emerald-100 mb-1.5">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
              placeholder="Enter your username"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-emerald-100 mb-1.5">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
              placeholder="Enter your password"
              required
            />
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-400/30 rounded-lg px-4 py-2.5 text-red-200 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-700 text-white font-bold rounded-lg transition-colors text-lg shadow-lg shadow-emerald-500/30"
          >
            {loading ? "Entering..." : "🕹️ Enter Game"}
          </button>
        </form>
      </div>
    </div>
  );
}
