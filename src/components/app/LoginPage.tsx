"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/providers";
import { Sparkles, Mail, Lock, ArrowLeft, Check, Loader2, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import GlassBackground from "@/components/ui/GlassBackground";

type AuthMode = "login" | "signup";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [mode, setMode] = useState<AuthMode>("login");
  const [error, setError] = useState<string | null>(null);
  const { signInWithPassword, signUpWithPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address");
      setIsLoading(false);
      return;
    }

    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters");
      setIsLoading(false);
      return;
    }

    if (mode === "signup") {
      const { error } = await signUpWithPassword(email, password);
      if (error) {
        setError(error.message);
        setIsLoading(false);
      } else {
        setIsSuccess(true);
        setIsLoading(false);
      }
    } else {
      const { error } = await signInWithPassword(email, password);
      if (error) {
        setError(error.message);
        setIsLoading(false);
      } else {
        window.location.href = "/";
      }
    }
  };

  if (isSuccess) {
    return (
      <GlassBackground>
        <div className="min-h-screen flex items-center justify-center px-6">
          <motion.div
            className="max-w-md w-full text-center"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <motion.div
              className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500/20 flex items-center justify-center"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.2 }}
            >
              <Check className="w-10 h-10 text-green-400" />
            </motion.div>
            <h1 className="text-3xl font-bold text-white mb-4">
              Account created!
            </h1>
            <p className="text-white/60 mb-8">
              Your account has been created successfully.
              <br />
              You can now sign in.
            </p>
            <button
              onClick={() => {
                setIsSuccess(false);
                setMode("login");
                setEmail("");
                setPassword("");
              }}
              className="text-purple-400 hover:text-purple-300 transition-colors"
            >
              Go to Sign In
            </button>
          </motion.div>
        </div>
      </GlassBackground>
    );
  }

  return (
    <GlassBackground>
      <div className="min-h-screen flex items-center justify-center px-6">
        <motion.div
          className="max-w-md w-full"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Back link */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-white/60 hover:text-white mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>

          {/* Logo */}
          <div className="text-center mb-8">
            <motion.div
              className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/30 to-pink-500/30 mb-6"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
            >
              <Sparkles className="w-8 h-8 text-purple-300" />
            </motion.div>
            <h1 className="text-3xl font-bold text-white mb-2">Welcome to MoodFlow</h1>
            <p className="text-white/60">
              {mode === "login" ? "Sign in to continue" : "Create your account"}
            </p>
          </div>

          {/* Form */}
          <motion.div
            className="backdrop-blur-xl bg-white/10 rounded-3xl p-8 border border-white/20 shadow-2xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full pl-12 pr-4 py-4 bg-white/10 rounded-xl border border-white/20 text-white placeholder-white/40 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full pl-12 pr-12 py-4 bg-white/10 rounded-xl border border-white/20 text-white placeholder-white/40 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {error && (
                <motion.div
                  className="p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-400 text-sm"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {error}
                </motion.div>
              )}

              <motion.button
                type="submit"
                className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isLoading || !email || !password}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {mode === "login" ? "Signing in..." : "Creating account..."}
                  </span>
                ) : (
                  mode === "login" ? "Sign In" : "Create Account"
                )}
              </motion.button>
            </form>

            <div className="mt-6 text-center">
              <button
                onClick={() => {
                  setMode(mode === "login" ? "signup" : "login");
                  setError(null);
                }}
                className="text-purple-400 hover:text-purple-300 transition-colors text-sm"
              >
                {mode === "login" ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
              </button>
            </div>
          </motion.div>

          {/* Features */}
          <motion.div
            className="mt-8 grid grid-cols-3 gap-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {[
              { icon: "🔒", text: "Secure" },
              { icon: "⚡", text: "Instant" },
              { icon: "📱", text: "Cross-device" },
            ].map((feature) => (
              <div
                key={feature.text}
                className="text-center p-4 backdrop-blur-sm bg-white/5 rounded-2xl border border-white/10"
              >
                <span className="text-2xl mb-2 block">{feature.icon}</span>
                <span className="text-sm text-white/60">{feature.text}</span>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </GlassBackground>
  );
}
