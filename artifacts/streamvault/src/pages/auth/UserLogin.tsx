import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Film, Eye, EyeOff, LogIn } from "lucide-react";
import { useUserAuth } from "@/hooks/useUserAuth";

export default function UserLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useUserAuth();
  const [, navigate] = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #00ff7f, transparent 70%)" }} />
      </div>

      <div className="w-full max-w-sm relative fade-in">
        {/* Logo */}
        <div className="text-center mb-10">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-6">
            <div className="w-10 h-10 rounded-xl bg-[#00ff7f]/10 border border-[#00ff7f]/30 flex items-center justify-center glow-sm">
              <Film className="w-5 h-5 text-[#00ff7f]" />
            </div>
            <span className="font-heading font-bold text-xl text-white">Moovied<span className="text-[#00ff7f]">Web</span></span>
          </Link>
          <h1 className="font-heading font-bold text-2xl text-white">Welcome back</h1>
          <p className="text-[#666] text-sm mt-1">Sign in to continue watching</p>
        </div>

        {/* Card */}
        <div className="glass rounded-2xl p-7">
          {error && (
            <div className="mb-5 bg-red-500/8 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs text-[#777] font-medium mb-2 uppercase tracking-wide">Email</label>
              <input
                type="email" value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com" required
                className="w-full bg-white/4 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-[#333] transition-all"
              />
            </div>
            <div>
              <label className="block text-xs text-[#777] font-medium mb-2 uppercase tracking-wide">Password</label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"} value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" required
                  className="w-full bg-white/4 border border-white/10 rounded-xl px-4 py-3 pr-11 text-sm text-white placeholder:text-[#333] transition-all"
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#444] hover:text-[#999] transition-colors">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2.5 font-bold py-3.5 rounded-xl text-black text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              style={{ background: "#00ff7f", boxShadow: loading ? "none" : "0 0 20px rgba(0,255,127,0.35)" }}>
              {loading
                ? <div className="w-4 h-4 rounded-full border-2 border-black/30 border-t-black animate-spin" />
                : <LogIn className="w-4 h-4" />}
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-[#555] mt-6">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-[#00ff7f] hover:underline font-semibold">Create one free</Link>
        </p>

        <p className="text-center text-xs text-[#333] mt-4">
          Admin?{" "}
          <Link href="/admin/login" className="text-[#555] hover:text-[#777] transition-colors">Sign in to admin panel →</Link>
        </p>
      </div>
    </div>
  );
}
