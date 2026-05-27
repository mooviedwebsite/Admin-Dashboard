import { useEffect, useState } from "react";
import { BarChart3, TrendingUp, Users, Eye } from "lucide-react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import type { TooltipProps } from "recharts";
import AdminLayout from "./layout";
import { apiFetch } from "@/lib/api";

interface AnalyticsData {
  signupsTrend?: Array<{ date: string; count: number }>;
  viewsTrend?: Array<{ date: string; count: number }>;
  topMovies?: Array<{ title: string; views: number }>;
}

type Period = "daily" | "weekly" | "monthly";

function CustomTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1a1a1a] border border-white/[0.1] rounded-lg px-3 py-2 text-xs">
      <p className="text-[#888] mb-1">{label}</p>
      <p className="text-[#00ff7f] font-semibold">{payload[0]?.value?.toLocaleString()}</p>
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [period, setPeriod] = useState<Period>("weekly");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    apiFetch<AnalyticsData>(`/admin/analytics?period=${period}`)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [period]);

  const signups = data?.signupsTrend ?? [];
  const views = data?.viewsTrend ?? [];
  const topMovies = data?.topMovies ?? [];

  return (
    <AdminLayout title="Analytics">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">Analytics</h2>
            <p className="text-sm text-[#666]">Platform performance overview</p>
          </div>
          <div className="sm:ml-auto flex gap-1">
            {(["daily", "weekly", "monthly"] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                  period === p
                    ? "bg-[#00ff7f]/10 text-[#00ff7f] border border-[#00ff7f]/20"
                    : "bg-[#161616] text-[#666] border border-white/[0.06] hover:text-white"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
        )}

        {loading && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className={`bg-[#111] border border-white/[0.06] rounded-xl p-5 h-64 animate-pulse ${i === 2 ? "lg:col-span-2" : ""}`} />
            ))}
          </div>
        )}

        {!loading && data && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Signups trend */}
            <div className="bg-[#111] border border-white/[0.06] rounded-xl p-5">
              <div className="flex items-center gap-2 mb-5">
                <Users size={16} className="text-[#00ff7f]" />
                <h3 className="text-sm font-semibold text-white">New Signups</h3>
              </div>
              {signups.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={signups} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                    <defs>
                      <linearGradient id="signupGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00ff7f" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#00ff7f" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="date" tick={{ fill: "#555", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#555", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip content={CustomTooltip} />
                    <Area type="monotone" dataKey="count" stroke="#00ff7f" strokeWidth={2} fill="url(#signupGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-[#555] text-sm">No data</div>
              )}
            </div>

            {/* Views trend */}
            <div className="bg-[#111] border border-white/[0.06] rounded-xl p-5">
              <div className="flex items-center gap-2 mb-5">
                <Eye size={16} className="text-blue-400" />
                <h3 className="text-sm font-semibold text-white">Total Views</h3>
              </div>
              {views.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={views} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                    <defs>
                      <linearGradient id="viewGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="date" tick={{ fill: "#555", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#555", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip content={CustomTooltip} />
                    <Area type="monotone" dataKey="count" stroke="#60a5fa" strokeWidth={2} fill="url(#viewGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-[#555] text-sm">No data</div>
              )}
            </div>

            {/* Top movies */}
            <div className="bg-[#111] border border-white/[0.06] rounded-xl p-5 lg:col-span-2">
              <div className="flex items-center gap-2 mb-5">
                <TrendingUp size={16} className="text-purple-400" />
                <h3 className="text-sm font-semibold text-white">Top Movies by Views</h3>
              </div>
              {topMovies.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={topMovies} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                    <XAxis dataKey="title" tick={{ fill: "#555", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#555", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip content={CustomTooltip} />
                    <Bar dataKey="views" fill="#a78bfa" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[220px] flex flex-col items-center justify-center text-[#555] gap-2">
                  <BarChart3 size={32} />
                  <p className="text-sm">No analytics data yet</p>
                  <p className="text-xs">Data appears after movies are watched</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
