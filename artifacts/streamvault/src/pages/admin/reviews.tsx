import { useEffect, useState, useCallback } from "react";
import { RefreshCw, Trash2, Star, ChevronLeft, ChevronRight, MessageSquare } from "lucide-react";
import AdminLayout from "./layout";
import { apiFetch } from "@/lib/api";
import { formatDate } from "@/lib/utils";

interface Comment {
  id: number;
  movieId: number;
  userId: number;
  userName?: string | null;
  userEmail?: string | null;
  movieTitle?: string | null;
  rating?: number | null;
  comment?: string | null;
  status: string;
  createdAt: string;
}

interface ListResponse {
  comments: Comment[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function ReviewsPage() {
  const [comments, setComments] = useState<Comment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState<number | null>(null);

  const fetchComments = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      const data = await apiFetch<ListResponse>(`/admin/comments?${params}`);
      setComments(data.comments ?? []);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 1);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchComments(); }, [fetchComments]);

  async function handleDelete(id: number) {
    if (!confirm("Delete this review?")) return;
    setDeleting(id);
    try {
      await apiFetch(`/admin/comments/${id}`, { method: "DELETE" });
      fetchComments();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleting(null);
    }
  }

  function StarRating({ rating }: { rating: number }) {
    return (
      <span className="flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} size={11} className={i < rating ? "text-yellow-400 fill-yellow-400" : "text-[#333]"} />
        ))}
      </span>
    );
  }

  return (
    <AdminLayout title="Reviews">
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">Reviews & Comments</h2>
            <p className="text-sm text-[#666]">{total} total</p>
          </div>
          <div className="sm:ml-auto">
            <button
              onClick={() => fetchComments()}
              className="p-2 rounded-lg bg-[#161616] border border-white/[0.08] text-[#888] hover:text-white transition-colors"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        {error && (
          <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
        )}

        <div className="space-y-3">
          {loading && Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-[#111] border border-white/[0.06] rounded-xl p-4 animate-pulse h-20" />
          ))}
          {!loading && comments.length === 0 && (
            <div className="bg-[#111] border border-white/[0.06] rounded-xl py-16 flex flex-col items-center gap-3 text-[#555]">
              <MessageSquare size={32} />
              <p>No reviews yet</p>
            </div>
          )}
          {!loading && comments.map((c) => (
            <div key={c.id} className="bg-[#111] border border-white/[0.06] rounded-xl p-4 hover:border-white/[0.1] transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center flex-wrap gap-2 mb-2">
                    <span className="text-sm font-medium text-white">{c.userName ?? "Anonymous"}</span>
                    {c.userEmail && <span className="text-xs text-[#555]">{c.userEmail}</span>}
                    <span className="text-xs px-2 py-0.5 rounded-full bg-white/[0.05] text-[#666]">
                      on <span className="text-[#888]">{c.movieTitle ?? `Movie #${c.movieId}`}</span>
                    </span>
                    {c.rating != null && <StarRating rating={c.rating} />}
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      c.status === "approved"
                        ? "bg-[#00ff7f]/10 text-[#00ff7f] border border-[#00ff7f]/20"
                        : "bg-white/[0.04] text-[#666] border border-white/[0.06]"
                    }`}>
                      {c.status}
                    </span>
                  </div>
                  {c.comment && (
                    <p className="text-sm text-[#aaa] line-clamp-3">{c.comment}</p>
                  )}
                  <p className="text-xs text-[#555] mt-2">{formatDate(c.createdAt)}</p>
                </div>
                <button
                  onClick={() => handleDelete(c.id)}
                  disabled={deleting === c.id}
                  className="shrink-0 p-1.5 rounded-lg text-[#666] hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between">
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
    </AdminLayout>
  );
}
