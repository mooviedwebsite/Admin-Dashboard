import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Film, Eye, EyeOff, UserPlus, Check } from "lucide-react";
import { useUserAuth } from "@/hooks/useUserAuth";

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  const score = checks.filter(Boolean).length;
  const colors = ["#333", "#ff4d4d", "#ffaa00", "#00C853", "#00ff7f"];
  const labels = ["", "Weak", "Fair", "Good", "Strong"];

  if (!password) return null;

  return (
    <div className="mt-2">
      <div className="flex gap-1 mb-1">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="flex-1 h-1 rounded-full transition-all duration-300"
            style={{ background: i < score ? colors[score] : "#1a1a1a" }} />
        ))}
      </div>
      <p className="text-[10px]" style={{ color: colors[score] }}>{labels[score]}</p>
    </div>
  );
}

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { register } = useUserAuth();
  const [, navigate] = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
    setLoading(true);
    try {
      await register(name, email, password);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const perks = ["Unlimited streaming", "Save to watchlist", "Rate & review", "Continue watching"];

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4 py-12 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full opacity-8"
          style={{ background: "radial-gradient(circle, #00ff7f, transparent 70%)" }} />
      </div>

      <div className="w-full max-w-sm relative fade-in">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-6">
            <div className="w-10 h-10 rounded-xl bg-[#00ff7f]/10 border border-[#00ff7f]/30 flex items-center justify-center glow-sm">
              <Film className="w-5 h-5 text-[#00ff7f]" />
            </div>
            <span className="font-heading font-bold text-xl text-white">Moovied<span className="text-[#00ff7f]">Web</span></span>
          </Link>
          <h1 className="font-heading font-bold text-2xl text-white">Create your account</h1>
          <p className="text-[#666] text-sm mt-1">Free forever. No credit card needed.</p>
        </div>

        {/* Perks */}
        <div className="grid grid-cols-2 gap-2 mb-6">
          {perks.map(p => (
            <div key={p} className="flex items-center gap-1.5 text-[#777] text-xs">
              <Check className="w-3 h-3 text-[#00ff7f] flex-shrink-0" />{p}
            </div>
          ))}
        </div>

        <div className="glass rounded-2xl p-7">
          {error && (
            <div className="mb-5 bg-red-500/8 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">{error}</div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-[#777] font-medium mb-2 uppercase tracking-wide">Full Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="John Doe" required
                className="w-full bg-white/4 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-[#333] transition-all" />
            </div>
            <div>
              <label className="block text-xs text-[#777] font-medium mb-2 uppercase tracking-wide">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required
                className="w-full bg-white/4 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-[#333] transition-all" />
            </div>
            <div>
              <label className="block text-xs text-[#777] font-medium mb-2 uppercase tracking-wide">Password</label>
              <div className="relative">
                <input type={showPass ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Min. 6 characters" required
                  className="w-full bg-white/4 border border-white/10 rounded-xl px-4 py-3 pr-11 text-sm text-white placeholder:text-[#333] transition-all" />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#444] hover:text-[#999] transition-colors">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <PasswordStrength password={password} />
            </div>
            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2.5 font-bold py-3.5 rounded-xl text-black text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              style={{ background: "#00ff7f", boxShadow: loading ? "none" : "0 0 20px rgba(0,255,127,0.35)" }}>
              {loading ? <div className="w-4 h-4 rounded-full border-2 border-black/30 border-t-black animate-spin" /> : <UserPlus className="w-4 h-4" />}
              {loading ? "Creating account…" : "Create Account"}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-[#555] mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-[#00ff7f] hover:underline font-semibold">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
