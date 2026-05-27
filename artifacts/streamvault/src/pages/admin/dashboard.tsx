import { useEffect, useState } from "react";
import { Users, Film, Eye, Star, TrendingUp, Download, Activity, Tv } from "lucide-react";
import AdminLayout from "./layout";
import { apiFetch } from "@/lib/api";
import { formatNumber } from "@/lib/utils";

interface Stats {
  totalUsers: number;
  totalMovies: number;
  publishedMovies: number;
  totalReviews: number;
  totalViews: number;
  newUsersThisWeek: number;
  totalDownloadsToday?: number;
  activeStreams?: number;
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  sub?: string;
  color?: string;
}

function StatCard({ label, value, icon, sub, color = "text-[#00ff7f]" }: StatCardProps) {
  return (
    <div className="bg-[#111] border border-white/[0.06] rounded-xl p-5 hover:border-white/[0.1] transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-2 rounded-lg bg-white/[0.04] ${color}`}>{icon}</div>
      </div>
      <p className="text-2xl font-bold text-white mb-1">{typeof value === "number" ? formatNumber(value) : value}</p>
      <p className="text-xs text-[#666]">{label}</p>
      {sub && <p className="text-xs text-[#00ff7f] mt-1">{sub}</p>}
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch<Stats>("/admin/stats")
      .then(setStats)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AdminLayout title="Dashboard">
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-white mb-1">Overview</h2>
          <p className="text-sm text-[#666]">Your platform at a glance</p>
        </div>

        {loading && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-[#111] border border-white/[0.06] rounded-xl p-5 animate-pulse h-32" />
            ))}
          </div>
        )}

        {error && (
          <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            Failed to load stats: {error}
          </div>
        )}

        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Total Users"
              value={stats.totalUsers}
              icon={<Users size={18} />}
              sub={`+${stats.newUsersThisWeek} this week`}
            />
            <StatCard
              label="Total Movies"
              value={stats.totalMovies}
              icon={<Film size={18} />}
              sub={`${stats.publishedMovies} published`}
              color="text-blue-400"
            />
            <StatCard
              label="Total Views"
              value={stats.totalViews}
              icon={<Eye size={18} />}
              color="text-purple-400"
            />
            <StatCard
              label="Reviews"
              value={stats.totalReviews}
              icon={<Star size={18} />}
              color="text-yellow-400"
            />
            <StatCard
              label="New Users (Week)"
              value={stats.newUsersThisWeek}
              icon={<TrendingUp size={18} />}
            />
            <StatCard
              label="Downloads Today"
              value={stats.totalDownloadsToday ?? 0}
              icon={<Download size={18} />}
              color="text-orange-400"
            />
            <StatCard
              label="Active Streams"
              value={stats.activeStreams ?? 0}
              icon={<Activity size={18} />}
              color="text-pink-400"
            />
            <StatCard
              label="Draft Movies"
              value={(stats.totalMovies ?? 0) - (stats.publishedMovies ?? 0)}
              icon={<Tv size={18} />}
              color="text-[#888]"
            />
          </div>
        )}

        {/* Quick links */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
          {[
            { label: "Add New Movie", href: "/admin/movies/new", color: "bg-[#00ff7f]/10 border-[#00ff7f]/20 text-[#00ff7f]" },
            { label: "Manage Users", href: "/admin/users", color: "bg-blue-500/10 border-blue-500/20 text-blue-400" },
            { label: "View Analytics", href: "/admin/analytics", color: "bg-purple-500/10 border-purple-500/20 text-purple-400" },
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={`flex items-center justify-center py-3 rounded-xl border text-sm font-medium hover:opacity-80 transition-opacity ${item.color}`}
            >
              {item.label}
            </a>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
