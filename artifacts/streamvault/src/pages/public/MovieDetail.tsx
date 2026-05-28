import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { useState } from "react";
import {
  Play, Star, Clock, Calendar, ArrowLeft, Bookmark, BookmarkCheck, Heart
} from "lucide-react";
import { fetchMovie, fetchReviews, postReview, addToWatchlist, removeFromWatchlist, fetchWatchlist } from "@/lib/api";
import { useUserAuth } from "@/hooks/useUserAuth";
import MovieCard from "@/components/MovieCard";
import { fetchMovies } from "@/lib/api";

const FALLBACK = "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1200&q=80";

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          onMouseEnter={() => setHovered(s)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(s)}
          className="transition-colors"
        >
          <Star
            className={`w-5 h-5 ${(hovered || value) >= s ? "text-yellow-400 fill-yellow-400" : "text-[#333]"}`}
          />
        </button>
      ))}
    </div>
  );
}

export default function MovieDetail() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const { user } = useUserAuth();
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [watchlisted, setWatchlisted] = useState(false);
  const [showVideo, setShowVideo] = useState(false);

  const { data: movie, isLoading } = useQuery({
    queryKey: ["movie", id],
    queryFn: () => fetchMovie(id),
    enabled: !!id,
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ["reviews", id],
    queryFn: () => fetchReviews(id),
    enabled: !!id,
  });

  const { data: related = [] } = useQuery({
    queryKey: ["movies-related", movie?.genre],
    queryFn: () => fetchMovies(movie?.genre ? { genre: movie.genre } : {}),
    enabled: !!movie,
  });

  useQuery({
    queryKey: ["watchlist-check", id],
    queryFn: async () => {
      const list = await fetchWatchlist();
      setWatchlisted(list.some((m) => m.id === id));
      return list;
    },
    enabled: !!user,
  });

  const handleWatchlist = async () => {
    if (!user) return;
    try {
      if (watchlisted) {
        await removeFromWatchlist(id);
        setWatchlisted(false);
      } else {
        await addToWatchlist(id);
        setWatchlisted(true);
      }
    } catch {}
  };

  const handleReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewRating || !reviewComment.trim() || !user) return;
    setSubmitting(true);
    try {
      await postReview(id, reviewRating, reviewComment);
      setReviewRating(0);
      setReviewComment("");
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-[#00ff7f]/30 border-t-[#00ff7f] animate-spin" />
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center gap-4">
        <p className="text-[#666]">Movie not found.</p>
        <Link href="/" className="text-[#00ff7f] text-sm hover:underline">← Back to home</Link>
      </div>
    );
  }

  const banner = movie.bannerUrl || movie.posterUrl || FALLBACK;

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Banner */}
      <div className="relative h-[70vh] min-h-[420px]">
        <img
          src={banner}
          alt={movie.title}
          className="absolute inset-0 w-full h-full object-cover"
          onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK; }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/50 to-black/30" />
        <div className="absolute top-20 left-0 right-0 px-4 sm:px-8">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-[#999] hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
        </div>

        {/* Play overlay */}
        {showVideo && movie.videoUrl ? (
          <div className="absolute inset-0 bg-black flex items-center justify-center z-20">
            <button
              onClick={() => setShowVideo(false)}
              className="absolute top-4 right-4 text-white/70 hover:text-white"
            >✕</button>
            <video src={movie.videoUrl} controls autoPlay className="w-full h-full object-contain max-h-full" />
          </div>
        ) : (
          <button
            onClick={() => setShowVideo(true)}
            className="absolute inset-0 flex items-center justify-center group"
          >
            <div className="w-16 h-16 rounded-full bg-[#00ff7f]/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg shadow-[#00ff7f]/30">
              <Play className="w-7 h-7 text-black fill-black ml-1" />
            </div>
          </button>
        )}
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-32 relative z-10">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Poster */}
          <div className="flex-shrink-0">
            <img
              src={movie.posterUrl || FALLBACK}
              alt={movie.title}
              className="w-44 rounded-xl shadow-2xl border border-white/10"
              onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK; }}
            />
          </div>

          {/* Info */}
          <div className="flex-1 pt-8">
            <div className="flex flex-wrap gap-2 mb-3">
              {movie.genre && (
                <span className="text-xs border border-white/10 text-[#999] rounded-full px-3 py-1">{movie.genre}</span>
              )}
              {movie.contentType === "series" && (
                <span className="text-xs bg-[#00ff7f]/10 border border-[#00ff7f]/30 text-[#00ff7f] rounded-full px-3 py-1">TV Series</span>
              )}
            </div>

            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">{movie.title}</h1>

            <div className="flex flex-wrap items-center gap-4 mb-5">
              {movie.rating != null && (
                <div className="flex items-center gap-1.5">
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  <span className="text-white font-semibold">{movie.rating.toFixed(1)}</span>
                  <span className="text-[#555] text-sm">/ 10</span>
                </div>
              )}
              {movie.year && (
                <div className="flex items-center gap-1.5 text-[#666] text-sm">
                  <Calendar className="w-3.5 h-3.5" />{movie.year}
                </div>
              )}
              {movie.duration && (
                <div className="flex items-center gap-1.5 text-[#666] text-sm">
                  <Clock className="w-3.5 h-3.5" />{movie.duration} min
                </div>
              )}
            </div>

            {movie.description && (
              <p className="text-[#aaa] leading-relaxed mb-6 max-w-2xl">{movie.description}</p>
            )}

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setShowVideo(true)}
                className="flex items-center gap-2 bg-[#00ff7f] text-black font-bold px-6 py-2.5 rounded-xl hover:bg-[#00e070] transition-colors text-sm"
              >
                <Play className="w-4 h-4 fill-black" /> Watch Now
              </button>
              {user && (
                <button
                  onClick={handleWatchlist}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                    watchlisted
                      ? "bg-[#00ff7f]/10 border-[#00ff7f]/40 text-[#00ff7f]"
                      : "bg-white/5 border-white/10 text-[#999] hover:text-white hover:border-white/20"
                  }`}
                >
                  {watchlisted ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                  {watchlisted ? "Saved" : "Watchlist"}
                </button>
              )}
              {!user && (
                <Link
                  href="/login"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/10 bg-white/5 text-[#999] hover:text-white text-sm font-medium transition-colors"
                >
                  <Heart className="w-4 h-4" /> Save to Watchlist
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Reviews */}
        <div className="mt-16">
          <h2 className="text-xl font-bold text-white mb-6">Reviews</h2>

          {/* Submit review */}
          {user ? (
            <form onSubmit={handleReview} className="bg-white/5 border border-white/10 rounded-xl p-5 mb-8">
              <p className="text-sm font-medium text-white mb-3">Leave a Review</p>
              <div className="mb-3">
                <StarRating value={reviewRating} onChange={setReviewRating} />
              </div>
              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Write your thoughts…"
                rows={3}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#444] focus:outline-none focus:border-[#00ff7f]/40 resize-none transition-colors"
              />
              <button
                type="submit"
                disabled={submitting || !reviewRating || !reviewComment.trim()}
                className="mt-3 text-sm bg-[#00ff7f] text-black font-semibold px-5 py-2 rounded-lg hover:bg-[#00e070] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {submitting ? "Posting…" : "Post Review"}
              </button>
            </form>
          ) : (
            <div className="bg-white/5 border border-white/10 rounded-xl p-5 mb-8 flex items-center justify-between">
              <p className="text-[#666] text-sm">Sign in to leave a review</p>
              <Link href="/login" className="text-sm text-[#00ff7f] hover:underline font-medium">Sign In</Link>
            </div>
          )}

          {/* Review list */}
          {reviews.length === 0 ? (
            <p className="text-[#444] text-sm">No reviews yet. Be the first!</p>
          ) : (
            <div className="space-y-4">
              {reviews.map((r) => (
                <div key={r.id} className="bg-white/5 border border-white/5 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-white">{r.userName || "Anonymous"}</span>
                    <div className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                      <span className="text-xs text-[#999]">{r.rating}/5</span>
                    </div>
                  </div>
                  {r.comment && <p className="text-[#aaa] text-sm leading-relaxed">{r.comment}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Related */}
        {related.filter((m) => m.id !== id).length > 0 && (
          <div className="mt-16 pb-20">
            <h2 className="text-xl font-bold text-white mb-6">More Like This</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {related.filter((m) => m.id !== id).slice(0, 6).map((m) => (
                <MovieCard key={m.id} movie={m} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
