import { useQuery } from "@tanstack/react-query";
import { Link, Redirect } from "wouter";
import { Bookmark } from "lucide-react";
import { fetchWatchlist } from "@/lib/api";
import { useUserAuth } from "@/hooks/useUserAuth";
import MovieCard from "@/components/MovieCard";

export default function Watchlist() {
  const { user, loading } = useUserAuth();
  const { data: movies = [], isLoading } = useQuery({
    queryKey: ["watchlist"],
    queryFn: fetchWatchlist,
    enabled: !!user,
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#00ff7f]/30 border-t-[#00ff7f] animate-spin" />
      </div>
    );
  }

  if (!user) return <Redirect to="/login" />;

  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-24 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Bookmark className="w-7 h-7 text-[#00ff7f]" />
            My Watchlist
          </h1>
          <p className="text-[#555] mt-1">
            {isLoading ? "Loading…" : `${movies.length} saved title${movies.length !== 1 ? "s" : ""}`}
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl bg-white/5 animate-pulse">
                <div className="aspect-[2/3]" />
                <div className="p-3 space-y-2">
                  <div className="h-3 bg-white/5 rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : movies.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
              <Bookmark className="w-6 h-6 text-[#333]" />
            </div>
            <p className="text-white font-medium mb-1">Your watchlist is empty</p>
            <p className="text-[#555] text-sm mb-6">Save movies and series to watch later</p>
            <Link href="/movies" className="bg-[#00ff7f] text-black font-semibold px-6 py-2.5 rounded-xl hover:bg-[#00e070] transition-colors text-sm">
              Browse Movies
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {movies.map((m) => (
              <MovieCard key={m.id} movie={m} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
