import { useState, FormEvent } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Film, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { Link } from "wouter";

export default function AdminLogin() {
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("rawindunethsara93@gmail.com");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      setLocation("/admin");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Login failed";
      if (msg.toLowerCase().includes("not found") || msg.toLowerCase().includes("404")) {
        setError("Admin API is not yet deployed to Cloudflare. Please deploy the Worker first.");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-5"
          style={{ background: "radial-gradient(circle, #00ff7f, transparent 70%)" }} />
      </div>

      <div className="w-full max-w-md relative fade-in">
        {/* Header */}
        <div className="text-center mb-10">
          <Link href="/">
            <div className="inline-flex items-center gap-3 mb-5">
              <div className="p-2.5 rounded-xl bg-[#00ff7f]/10 border border-[#00ff7f]/25" style={{ boxShadow: "0 0 20px rgba(0,255,127,0.15)" }}>
                <Film className="w-6 h-6 text-[#00ff7f]" />
              </div>
              <span className="font-heading text-2xl font-bold text-white tracking-tight">MooviedWeb</span>
            </div>
          </Link>
          <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 mb-3">
            <ShieldCheck className="w-3.5 h-3.5 text-[#00ff7f]" />
            <span className="text-[#00ff7f] text-xs font-semibold tracking-wide">ADMIN PANEL</span>
          </div>
          <p className="text-[#555] text-sm">Restricted access — administrators only</p>
        </div>

        {/* Form card */}
        <div className="glass rounded-2xl p-8">
          {error && (
            <div className="mb-5 bg-amber-500/8 border border-amber-500/25 rounded-xl px-4 py-3 text-sm text-amber-400 leading-relaxed">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs text-[#666] font-semibold mb-2 uppercase tracking-widest">Email</label>
              <input
                type="email" value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl bg-white/4 border border-white/10 text-white placeholder:text-[#333] text-sm transition-all"
              />
            </div>

            <div>
              <label className="block text-xs text-[#666] font-semibold mb-2 uppercase tracking-widest">Password</label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"} value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" required
                  className="w-full px-4 py-3 pr-11 rounded-xl bg-white/4 border border-white/10 text-white placeholder:text-[#333] text-sm transition-all"
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#444] hover:text-[#888] transition-colors">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3.5 rounded-xl font-bold text-sm text-black transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
              style={{ background: "#00ff7f", boxShadow: loading ? "none" : "0 0 24px rgba(0,255,127,0.4)" }}>
              {loading && <div className="w-4 h-4 rounded-full border-2 border-black/30 border-t-black animate-spin" />}
              {loading ? "Signing in…" : "Sign In to Admin Panel"}
            </button>
          </form>
        </div>

        <p className="text-center mt-5">
          <Link href="/" className="text-xs text-[#444] hover:text-[#666] transition-colors">← Back to website</Link>
        </p>
      </div>
    </div>
  );
}
