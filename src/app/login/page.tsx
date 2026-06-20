"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { signUp, signIn, getSession } from "@/lib/auth";
import { useRouter } from "next/navigation";
import GlassBackground from "@/components/ui/GlassBackground";
import { Heart, Loader2, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    const session = getSession();
    if (session) {
      router.push("/");
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!username.trim() || !password.trim()) {
      setError("Please fill in all fields");
      return;
    }

    if (username.length < 3) {
      setError("Username must be at least 3 characters");
      return;
    }

    if (password.length < 4) {
      setError("Password must be at least 4 characters");
      return;
    }

    if (isSignUp && password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsLoading(true);

    try {
      if (isSignUp) {
        const result = await signUp(username.trim(), password);
        if (result.success) {
          window.location.href = "/";
        } else {
          setError(result.error || "Failed to create account");
        }
      } else {
        const result = await signIn(username.trim(), password);
        if (result.success) {
          window.location.href = "/";
        } else {
          setError(result.error || "Failed to sign in");
        }
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <GlassBackground>
      <div className="min-h-screen flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          {/* Logo */}
          <div className="text-center mb-8">
            <motion.div
              className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-gradient-to-br from-purple-500 to-pink-500 mb-4"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
            >
              <Heart className="w-8 h-8 text-white" />
            </motion.div>
            <h1 className="text-3xl font-bold text-white mb-2">MoodFlow</h1>
            <p className="text-white/60">
              {isSignUp ? "Create your account" : "Welcome back"}
            </p>
          </div>

          {/* Form */}
          <motion.div
            className="backdrop-blur-xl bg-white/10 rounded-3xl p-6 border border-white/20 shadow-2xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Username */}
              <div>
                <label className="block text-sm text-white/60 mb-2">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ""))}
                  placeholder="Choose a username"
                  className="w-full px-4 py-3 bg-white/10 rounded-xl border border-white/20 text-white placeholder-white/40 outline-none focus:border-white/40 focus:ring-2 focus:ring-white/20 transition-all"
                  autoComplete="username"
                  maxLength={20}
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm text-white/60 mb-2">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full px-4 py-3 bg-white/10 rounded-xl border border-white/20 text-white placeholder-white/40 outline-none focus:border-white/40 focus:ring-2 focus:ring-white/20 transition-all pr-10"
                    autoComplete={isSignUp ? "new-password" : "current-password"}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password (Sign Up only) */}
              {isSignUp && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                >
                  <label className="block text-sm text-white/60 mb-2">Confirm Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm password"
                    className="w-full px-4 py-3 bg-white/10 rounded-xl border border-white/20 text-white placeholder-white/40 outline-none focus:border-white/40 focus:ring-2 focus:ring-white/20 transition-all"
                    autoComplete="new-password"
                  />
                </motion.div>
              )}

              {/* Error */}
              {error && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-300 text-sm"
                >
                  {error}
                </motion.div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  isSignUp ? "Create Account" : "Sign In"
                )}
              </button>
            </form>

            {/* Toggle */}
            <div className="mt-6 text-center">
              <button
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError("");
                }}
                className="text-white/60 hover:text-white transition-colors text-sm"
              >
                {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
              </button>
            </div>
          </motion.div>

          {/* Info */}
          <p className="text-center text-white/40 text-xs mt-6">
            Your data syncs across all your devices
          </p>
        </motion.div>
      </div>
    </GlassBackground>
  );
}
