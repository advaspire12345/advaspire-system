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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [receiveNews, setReceiveNews] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setFullName("");
    setError(null);
    setSuccess(false);
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

    router.push("/dashboard");
    router.refresh();
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          receive_news: receiveNews,
        },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  };

  const handleSubmit = activeTab === "login" ? handleLogin : handleRegister;

  return (
    <div className="min-h-screen w-full relative bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-800">
      {/* Content layout */}
      <div className="relative z-10 flex items-center justify-center px-4 py-8 lg:min-h-screen">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-8 text-white">
          {/* Left column: marketing copy */}
          <div className="flex flex-col items-center justify-center text-center lg:-translate-y-20 lg:-translate-x-16">
            {/* Logo */}
            <div className="h-24 w-24 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center mb-3">
              <Coins className="h-12 w-12 text-white" />
            </div>

            {/* Welcome text */}
            <p className="text-2xl font-semibold uppercase text-gray-200">
              Welcome to
            </p>

            <h1 className="text-4xl md:text-7xl font-black uppercase tracking-tight">
              AdCoin
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
                Login
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
                Register
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
                    ? "Account Login"
                    : "Create your account!"}
                </h2>

                {success && activeTab === "register" ? (
                  <div className="px-8 py-6">
                    <div className="text-center">
                      <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                        <Coins className="h-8 w-8 text-green-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Check your email
                      </h3>
                      <p className="mt-2 text-sm text-gray-500">
                        We&apos;ve sent you a confirmation link to verify your
                        email address.
                      </p>
                      <Button
                        onClick={() => handleTabChange("login")}
                        className="mt-6 w-full bg-[#615DFA] hover:bg-[#4b48d4]"
                      >
                        Back to login
                      </Button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4 px-8 mt-6">
                    {error && (
                      <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md">
                        {error}
                      </div>
                    )}

                    {activeTab === "register" && (
                      <div className="space-y-2">
                        <Label htmlFor="fullName" className="text-gray-700">
                          Full Name
                        </Label>
                        <Input
                          id="fullName"
                          type="text"
                          placeholder="Enter your full name"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          required
                          className="h-12 rounded-lg border-gray-200"
                        />
                      </div>
                    )}

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
                        placeholder={
                          activeTab === "login"
                            ? "Enter your password"
                            : "Create a password"
                        }
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                        className="h-12 rounded-lg border-gray-200"
                      />
                    </div>

                    {activeTab === "login" ? (
                      <>
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
                        {/* News opt-in */}
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="receiveNews"
                            checked={receiveNews}
                            onCheckedChange={(checked) =>
                              setReceiveNews(checked === true)
                            }
                            className="data-[state=checked]:bg-[#23D2E2] data-[state=checked]:border-[#23D2E2]"
                          />
                          <Label
                            htmlFor="receiveNews"
                            className="text-gray-600 font-semibold cursor-pointer"
                          >
                            Send me news and updates via email
                          </Label>
                        </div>

                        {/* Register button */}
                        <Button
                          type="submit"
                          disabled={loading}
                          className="w-full h-12 rounded-lg bg-[#23D2E2] hover:bg-[#1bb8c7] text-sm font-bold"
                        >
                          {loading ? "Creating account..." : "Register now!"}
                        </Button>

                        {/* Info text */}
                        <p className="text-sm text-gray-500 leading-relaxed pb-4">
                          You&apos;ll receive a confirmation email in your inbox
                          with a link to activate your account. If you have any
                          problems,{" "}
                          <a
                            href="mailto:support@example.com"
                            className="font-semibold text-[#23D2E2] hover:underline"
                          >
                            contact us
                          </a>
                          !
                        </p>
                      </>
                    )}
                  </form>
                )}
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
