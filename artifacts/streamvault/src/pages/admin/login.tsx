import { useState, FormEvent } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Film } from "lucide-react";

export default function AdminLogin() {
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="p-2 rounded-xl bg-[#00ff7f]/10 border border-[#00ff7f]/20">
              <Film className="w-7 h-7 text-[#00ff7f]" />
            </div>
            <span className="text-2xl font-bold text-white tracking-tight">MooviedWeb</span>
          </div>
          <p className="text-[#888] text-sm">Admin Panel — Sign in to continue</p>
        </div>

        <div className="bg-[#111] border border-white/[0.06] rounded-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm text-[#888] mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-lg bg-[#161616] border border-white/[0.08] text-white placeholder-[#444] focus:outline-none focus:border-[#00ff7f]/50 focus:ring-1 focus:ring-[#00ff7f]/20 transition-all text-sm"
                placeholder="admin@example.com"
              />
            </div>
            <div>
              <label className="block text-sm text-[#888] mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-lg bg-[#161616] border border-white/[0.08] text-white placeholder-[#444] focus:outline-none focus:border-[#00ff7f]/50 focus:ring-1 focus:ring-[#00ff7f]/20 transition-all text-sm"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-[#00ff7f] text-black font-semibold text-sm hover:bg-[#00e870] active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
