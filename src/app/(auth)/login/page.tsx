"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Coins, Facebook, Twitter, Youtube, MessageCircle } from "lucide-react";

type ActiveTab = "login" | "register";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const initialTab =
    searchParams.get("tab") === "register" ? "register" : "login";

  const [activeTab, setActiveTab] = useState<ActiveTab>(initialTab);
  // Admin login fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  // Student login fields
  const [studentUsername, setStudentUsername] = useState("");
  const [studentPassword, setStudentPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setStudentUsername("");
    setStudentPassword("");
    setError(null);
  };

  const handleTabChange = (tab: ActiveTab) => {
    setActiveTab(tab);
    resetForm();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // Check role to decide redirect destination
    try {
      const res = await fetch("/api/auth/role");
      const { role } = await res.json();

      if (role === "parent") {
        router.push("/parent");
      } else {
        router.push("/dashboard");
      }
    } catch {
      router.push("/dashboard");
    }

    router.refresh();
  };

  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/student-auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: studentUsername, password: studentPassword }),
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

  const handleSubmit = activeTab === "login" ? handleLogin : handleStudentLogin;

  return (
    <div className="min-h-screen w-full relative bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-800">
      {/* Content layout */}
      <div className="relative z-10 flex items-center justify-center px-4 py-8 lg:min-h-screen">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-8 text-white">
          {/* Left column: marketing copy */}
          <div className="flex flex-col items-center justify-center text-center lg:-translate-y-20 lg:-translate-x-16">
            {/* Logo */}
            <a href="/" className="mb-3 cursor-pointer hover:scale-105 transition-transform">
              <img src="/advaspire-logo.png" alt="Advaspire" className="h-48 w-48 object-contain" />
            </a>

            {/* Welcome text */}
            <p className="text-2xl font-semibold uppercase text-gray-200">
              Welcome to
            </p>

            <h1 className="text-4xl md:text-7xl font-black uppercase tracking-tight">
              Advaspire
            </h1>

            {/* Description - hidden on mobile */}
            <p className="hidden lg:block mt-4 text-sm lg:text-lg text-gray-200 font-semibold leading-relaxed max-w-lg">
              The next generation coin tracking system! Manage your students,
              track attendance, and reward achievements with our gamification
              system!
            </p>

            {/* Toggle buttons */}
            <div className="mt-8 inline-flex items-stretch rounded-lg border border-white overflow-hidden">
              <button
                type="button"
                onClick={() => handleTabChange("login")}
                className={`px-10 md:px-20 py-4 text-base font-bold transition ${
                  activeTab === "login"
                    ? "bg-white text-black"
                    : "bg-transparent text-white hover:bg-white/10"
                }`}
              >
                Admin & Parents
              </button>

              <button
                type="button"
                onClick={() => handleTabChange("register")}
                className={`px-10 md:px-20 py-4 text-base font-bold transition ${
                  activeTab === "register"
                    ? "bg-white text-black"
                    : "bg-transparent text-white hover:bg-white/10"
                }`}
              >
                Student
              </button>
            </div>
          </div>

          {/* Right column: form card */}
          <div className="flex justify-center lg:justify-end lg:translate-x-24">
            <div className="relative w-full max-w-md">
              {/* Decorative element - hidden on mobile */}
              <div className="hidden lg:block absolute left-[-80px] top-[-60px] z-20">
                <div className="h-32 w-32 rounded-full bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center">
                  <Coins className="h-16 w-16 text-white" />
                </div>
              </div>

              {/* Form card */}
              <div className="bg-white/95 backdrop-blur rounded-2xl py-6 shadow-xl text-gray-900">
                <h2 className="mt-4 text-2xl font-bold text-[#513C3C] text-center">
                  {activeTab === "login"
                    ? "Admin & Parent Login"
                    : "Student Login"}
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4 px-8 mt-6">
                  {error && (
                    <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md">
                      {error}
                    </div>
                  )}

                  {activeTab === "login" ? (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-gray-700">
                          Email Address
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="Enter your email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          className="h-12 rounded-lg border-gray-200"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="password" className="text-gray-700">
                          Password
                        </Label>
                        <Input
                          id="password"
                          type="password"
                          placeholder="Enter your password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          minLength={6}
                          className="h-12 rounded-lg border-gray-200"
                        />
                      </div>

                      {/* Remember me / Forgot password */}
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="rememberMe"
                            checked={rememberMe}
                            onCheckedChange={(checked) =>
                              setRememberMe(checked === true)
                            }
                            className="data-[state=checked]:bg-[#23D2E2] data-[state=checked]:border-[#23D2E2]"
                          />
                          <Label
                            htmlFor="rememberMe"
                            className="text-gray-600 font-semibold cursor-pointer"
                          >
                            Remember Me
                          </Label>
                        </div>

                        <button
                          type="button"
                          className="font-semibold text-gray-400 hover:text-gray-600 hover:underline"
                        >
                          Forgot password?
                        </button>
                      </div>

                      {/* Submit button */}
                      <Button
                        type="submit"
                        disabled={loading}
                        className="w-full h-12 rounded-lg bg-[#615DFA] hover:bg-[#4b48d4] text-sm font-bold"
                      >
                        {loading ? "Signing in..." : "Login to your account!"}
                      </Button>

                      {/* Divider */}
                      <div className="flex items-center gap-3 pt-4">
                        <div className="h-px flex-1 bg-gray-200" />
                        <span className="text-sm font-semibold text-gray-900 whitespace-nowrap">
                          Login with your social account
                        </span>
                        <div className="h-px flex-1 bg-gray-200" />
                      </div>

                      {/* Social buttons */}
                      <div className="flex items-center justify-center gap-4 pb-4">
                        <SocialButton icon={Facebook} label="Facebook" />
                        <SocialButton icon={Twitter} label="Twitter" />
                        <SocialButton icon={Youtube} label="YouTube" />
                        <SocialButton icon={MessageCircle} label="Chat" />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="studentUsername" className="text-gray-700">
                          Username
                        </Label>
                        <Input
                          id="studentUsername"
                          type="text"
                          placeholder="Enter your username"
                          value={studentUsername}
                          onChange={(e) => setStudentUsername(e.target.value)}
                          required
                          className="h-12 rounded-lg border-gray-200"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="studentPassword" className="text-gray-700">
                          Password
                        </Label>
                        <Input
                          id="studentPassword"
                          type="password"
                          placeholder="Enter your password"
                          value={studentPassword}
                          onChange={(e) => setStudentPassword(e.target.value)}
                          required
                          className="h-12 rounded-lg border-gray-200"
                        />
                      </div>

                      {/* Submit button */}
                      <Button
                        type="submit"
                        disabled={loading}
                        className="w-full h-12 rounded-lg bg-[#23D2E2] hover:bg-[#1bb8c7] text-sm font-bold"
                      >
                        {loading ? "Entering..." : "Enter Student Portal"}
                      </Button>

                      {/* Info text */}
                      <p className="text-sm text-gray-500 leading-relaxed pb-4">
                        Use the username and password provided by your teacher to access the student portal.
                      </p>
                    </>
                  )}
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SocialButton({
  icon: Icon,
  label,
}: {
  icon: React.ElementType;
  label: string;
}) {
  return (
    <button
      type="button"
      className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-50 shadow-sm transition"
      aria-label={label}
    >
      <Icon className="h-5 w-5 text-gray-600" />
    </button>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen w-full bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-800 flex items-center justify-center">
          <div className="h-12 w-12 rounded-full border-4 border-white/30 border-t-white animate-spin" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
