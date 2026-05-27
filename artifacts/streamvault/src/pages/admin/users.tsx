import { useEffect, useState, useCallback } from "react";
import { Search, RefreshCw, Shield, Ban, Trash2, ChevronLeft, ChevronRight, UserX, Eye } from "lucide-react";
import AdminLayout from "./layout";
import { apiFetch } from "@/lib/api";
import { formatDate } from "@/lib/utils";

interface User {
  id: number;
  name: string;
  email: string;
  avatar?: string | null;
  isAdmin: boolean;
  isBanned: boolean;
  createdAt: string;
  lastLogin?: string | null;
}

interface ListResponse {
  users: User[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface UserDetailData {
  user: User;
  watchHistory: unknown[];
  watchlist: unknown[];
  comments: unknown[];
}

function UserDetailModal({ id, onClose }: { id: number; onClose: () => void }) {
  const [data, setData] = useState<UserDetailData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<UserDetailData>(`/admin/users/${id}`)
      .then(setData)
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-[#111] border border-white/[0.08] rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <h3 className="font-semibold text-white">User Detail</h3>
          <button onClick={onClose} className="text-[#666] hover:text-white transition-colors text-xl leading-none">&times;</button>
        </div>
        <div className="p-5 space-y-4">
          {loading && <div className="text-center text-[#555] py-8">Loading…</div>}
          {data && (
            <>
              <div className="flex items-center gap-4">
                {data.user.avatar ? (
                  <img src={data.user.avatar} className="w-14 h-14 rounded-full object-cover border border-white/[0.1]" alt="" />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-[#00ff7f]/10 border border-[#00ff7f]/20 flex items-center justify-center text-[#00ff7f] text-xl font-bold">
                    {data.user.name.charAt(0)}
                  </div>
                )}
                <div>
                  <p className="font-semibold text-white">{data.user.name}</p>
                  <p className="text-sm text-[#666]">{data.user.email}</p>
                  <div className="flex gap-2 mt-1">
                    {data.user.isAdmin && <span className="text-xs px-2 py-0.5 rounded-full bg-[#00ff7f]/10 text-[#00ff7f] border border-[#00ff7f]/20">Admin</span>}
                    {data.user.isBanned && <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">Banned</span>}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Watch History", value: data.watchHistory.length },
                  { label: "Watchlist", value: data.watchlist.length },
                  { label: "Reviews", value: data.comments.length },
                ].map((s) => (
                  <div key={s.label} className="bg-[#161616] rounded-xl p-3 text-center border border-white/[0.05]">
                    <p className="text-xl font-bold text-white">{s.value}</p>
                    <p className="text-xs text-[#555] mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between py-2 border-b border-white/[0.04]">
                  <span className="text-[#666]">Joined</span>
                  <span className="text-white">{formatDate(data.user.createdAt)}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-[#666]">Last login</span>
                  <span className="text-white">{formatDate(data.user.lastLogin)}</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [detailId, setDetailId] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20", ...(search ? { search } : {}) });
      const data = await apiFetch<ListResponse>(`/admin/users?${params}`);
      setUsers(data.users);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  async function toggleBan(user: User) {
    if (!confirm(`${user.isBanned ? "Unban" : "Ban"} ${user.name}?`)) return;
    setActionLoading(user.id);
    try {
      await apiFetch(`/admin/users/${user.id}/ban`, {
        method: "POST",
        body: JSON.stringify({ banned: !user.isBanned }),
      });
      fetchUsers();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Action failed");
    } finally {
      setActionLoading(null);
    }
  }

  async function deleteUser(user: User) {
    if (!confirm(`Permanently delete ${user.name}? This cannot be undone.`)) return;
    setActionLoading(user.id);
    try {
      await apiFetch(`/admin/users/${user.id}`, { method: "DELETE" });
      fetchUsers();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <AdminLayout title="Users">
      {detailId && <UserDetailModal id={detailId} onClose={() => setDetailId(null)} />}

      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">Users</h2>
            <p className="text-sm text-[#666]">{total} total</p>
          </div>
          <div className="sm:ml-auto flex items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" />
              <input
                type="search"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search users…"
                className="pl-8 pr-4 py-2 rounded-lg bg-[#161616] border border-white/[0.08] text-sm text-white placeholder-[#444] focus:outline-none focus:border-[#00ff7f]/40 w-48"
              />
            </div>
            <button
              onClick={() => fetchUsers()}
              className="p-2 rounded-lg bg-[#161616] border border-white/[0.08] text-[#888] hover:text-white transition-colors"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        {error && (
          <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
        )}

        <div className="bg-[#111] border border-white/[0.06] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.05]">
                  <th className="text-left px-4 py-3 text-xs text-[#555] font-medium">User</th>
                  <th className="text-left px-4 py-3 text-xs text-[#555] font-medium hidden md:table-cell">Role</th>
                  <th className="text-left px-4 py-3 text-xs text-[#555] font-medium hidden lg:table-cell">Joined</th>
                  <th className="text-left px-4 py-3 text-xs text-[#555] font-medium hidden xl:table-cell">Last Login</th>
                  <th className="text-left px-4 py-3 text-xs text-[#555] font-medium">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {loading && Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-white/[0.03]">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-white/[0.04] rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))}
                {!loading && users.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-12 text-[#555]">No users found</td></tr>
                )}
                {!loading && users.map((u) => (
                  <tr key={u.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {u.avatar ? (
                          <img src={u.avatar} className="w-8 h-8 rounded-full object-cover shrink-0" alt="" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-[#00ff7f]/10 flex items-center justify-center text-[#00ff7f] text-xs font-bold shrink-0">
                            {u.name.charAt(0)}
                          </div>
                        )}
                        <div>
                          <p className="text-white font-medium">{u.name}</p>
                          <p className="text-xs text-[#555]">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {u.isAdmin ? (
                        <span className="flex items-center gap-1 text-xs text-[#00ff7f]"><Shield size={12} /> Admin</span>
                      ) : (
                        <span className="text-xs text-[#666]">User</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-[#666] hidden lg:table-cell">{formatDate(u.createdAt)}</td>
                    <td className="px-4 py-3 text-xs text-[#666] hidden xl:table-cell">{formatDate(u.lastLogin)}</td>
                    <td className="px-4 py-3">
                      {u.isBanned ? (
                        <span className="flex items-center gap-1 text-xs text-red-400"><UserX size={11} /> Banned</span>
                      ) : (
                        <span className="text-xs text-[#00ff7f]">Active</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => setDetailId(u.id)}
                          className="p-1.5 rounded-lg text-[#666] hover:text-white hover:bg-white/[0.06] transition-colors"
                          title="View detail"
                        >
                          <Eye size={13} />
                        </button>
                        <button
                          onClick={() => toggleBan(u)}
                          disabled={actionLoading === u.id}
                          className={`p-1.5 rounded-lg transition-colors disabled:opacity-40 ${u.isBanned ? "text-[#00ff7f] hover:bg-[#00ff7f]/10" : "text-yellow-500 hover:bg-yellow-500/10"}`}
                          title={u.isBanned ? "Unban" : "Ban"}
                        >
                          <Ban size={13} />
                        </button>
                        <button
                          onClick={() => deleteUser(u)}
                          disabled={actionLoading === u.id}
                          className="p-1.5 rounded-lg text-[#666] hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40"
                          title="Delete"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.05]">
              <p className="text-xs text-[#555]">Page {page} of {totalPages}</p>
              <div className="flex gap-1">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded text-[#666] hover:text-white disabled:opacity-30">
                  <ChevronLeft size={14} />
                </button>
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 rounded text-[#666] hover:text-white disabled:opacity-30">
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
