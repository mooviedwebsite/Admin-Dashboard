import { useEffect, useState, useCallback } from "react";
import { Plus, Search, Pencil, Trash2, RefreshCw, Film, Tv, ChevronLeft, ChevronRight, Star } from "lucide-react";
import AdminLayout from "./layout";
import { apiFetch } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import MovieForm from "./movie-form";

interface Movie {
  id: number;
  title: string;
  type: string;
  year?: number | null;
  status: string;
  featured: boolean;
  views: number;
  downloads: number;
  imdbRating?: number | null;
  posterUrl?: string | null;
  genres?: string[];
  createdAt: string;
}

interface ListResponse {
  movies: Movie[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface Props {
  contentType?: "movie" | "series";
}

export default function MoviesPage({ contentType }: Props) {
  const isSeriesPage = contentType === "series";
  const [movies, setMovies] = useState<Movie[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Movie | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);

  const fetchMovies = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
        ...(search ? { search } : {}),
        ...(isSeriesPage ? { type: "series" } : { type: "movie" }),
      });
      const data = await apiFetch<ListResponse>(`/admin/movies?${params}`);
      setMovies(data.movies);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [page, search, isSeriesPage]);

  useEffect(() => { fetchMovies(); }, [fetchMovies]);

  async function handleDelete(id: number) {
    if (!confirm("Delete this item permanently?")) return;
    setDeleting(id);
    try {
      await apiFetch(`/admin/movies/${id}`, { method: "DELETE" });
      fetchMovies();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleting(null);
    }
  }

  function openNew() {
    setEditTarget(null);
    setShowForm(true);
  }

  function openEdit(m: Movie) {
    setEditTarget(m);
    setShowForm(true);
  }

  function handleSaved() {
    setShowForm(false);
    fetchMovies();
  }

  const pageTitle = isSeriesPage ? "TV Series" : "Movies";

  return (
    <AdminLayout title={pageTitle}>
      {showForm && (
        <MovieForm
          movie={editTarget as Parameters<typeof MovieForm>[0]["movie"]}
          defaultType={isSeriesPage ? "series" : "movie"}
          onSave={handleSaved}
          onCancel={() => setShowForm(false)}
        />
      )}

      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">{pageTitle}</h2>
            <p className="text-sm text-[#666]">{total} total</p>
          </div>
          <div className="sm:ml-auto flex items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" />
              <input
                type="search"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search…"
                className="pl-8 pr-4 py-2 rounded-lg bg-[#161616] border border-white/[0.08] text-sm text-white placeholder-[#444] focus:outline-none focus:border-[#00ff7f]/40 w-48"
              />
            </div>
            <button
              onClick={() => fetchMovies()}
              className="p-2 rounded-lg bg-[#161616] border border-white/[0.08] text-[#888] hover:text-white transition-colors"
            >
              <RefreshCw size={14} />
            </button>
            <button
              onClick={openNew}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#00ff7f] text-black text-sm font-semibold hover:bg-[#00e870] transition-colors"
            >
              <Plus size={14} /> Add {isSeriesPage ? "Series" : "Movie"}
            </button>
          </div>
        </div>

        {error && (
          <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
        )}

        {/* Table */}
        <div className="bg-[#111] border border-white/[0.06] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.05]">
                  <th className="text-left px-4 py-3 text-xs text-[#555] font-medium">Title</th>
                  <th className="text-left px-4 py-3 text-xs text-[#555] font-medium hidden md:table-cell">Type</th>
                  <th className="text-left px-4 py-3 text-xs text-[#555] font-medium hidden sm:table-cell">Year</th>
                  <th className="text-left px-4 py-3 text-xs text-[#555] font-medium hidden lg:table-cell">Rating</th>
                  <th className="text-left px-4 py-3 text-xs text-[#555] font-medium">Status</th>
                  <th className="text-left px-4 py-3 text-xs text-[#555] font-medium hidden xl:table-cell">Views</th>
                  <th className="text-left px-4 py-3 text-xs text-[#555] font-medium hidden xl:table-cell">Added</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {loading && (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-white/[0.03]">
                      {Array.from({ length: 8 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 bg-white/[0.04] rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                )}
                {!loading && movies.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-[#555]">
                      No {pageTitle.toLowerCase()} found
                    </td>
                  </tr>
                )}
                {!loading && movies.map((m) => (
                  <tr key={m.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {m.posterUrl ? (
                          <img src={m.posterUrl} alt="" className="w-8 h-11 rounded object-cover shrink-0 bg-white/[0.05]" />
                        ) : (
                          <div className="w-8 h-11 rounded bg-white/[0.05] flex items-center justify-center shrink-0">
                            {m.type === "series" ? <Tv size={14} className="text-[#444]" /> : <Film size={14} className="text-[#444]" />}
                          </div>
                        )}
                        <div>
                          <p className="text-white font-medium truncate max-w-[180px]">{m.title}</p>
                          {m.genres && m.genres.length > 0 && (
                            <p className="text-[10px] text-[#555] mt-0.5">{m.genres.slice(0, 2).join(", ")}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-white/[0.05] text-[#888]">
                        {m.type === "series" ? "Series" : "Movie"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#888] hidden sm:table-cell">{m.year ?? "—"}</td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {m.imdbRating ? (
                        <span className="flex items-center gap-1 text-yellow-400 text-xs">
                          <Star size={11} fill="currentColor" /> {m.imdbRating.toFixed(1)}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        m.status === "published"
                          ? "bg-[#00ff7f]/10 text-[#00ff7f] border border-[#00ff7f]/20"
                          : "bg-white/[0.04] text-[#666] border border-white/[0.06]"
                      }`}>
                        {m.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#888] text-xs hidden xl:table-cell">{m.views.toLocaleString()}</td>
                    <td className="px-4 py-3 text-[#666] text-xs hidden xl:table-cell">{formatDate(m.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => openEdit(m)}
                          className="p-1.5 rounded-lg text-[#666] hover:text-white hover:bg-white/[0.06] transition-colors"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(m.id)}
                          disabled={deleting === m.id}
                          className="p-1.5 rounded-lg text-[#666] hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40"
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.05]">
              <p className="text-xs text-[#555]">Page {page} of {totalPages}</p>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded text-[#666] hover:text-white disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1.5 rounded text-[#666] hover:text-white disabled:opacity-30 transition-colors"
                >
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
