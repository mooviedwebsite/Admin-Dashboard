import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { fetchMovies } from "@/lib/api";
import MovieCard from "@/components/MovieCard";

interface Props {
  contentType?: "movie" | "series";
}

const GENRES = ["Action", "Comedy", "Drama", "Horror", "Sci-Fi", "Romance", "Thriller", "Animation", "Documentary"];

export default function Browse({ contentType }: Props) {
  const [search, setSearch] = useState("");
  const [genre, setGenre] = useState("");

  const { data: movies = [], isLoading } = useQuery({
    queryKey: ["movies", contentType, genre],
    queryFn: () => fetchMovies({
      ...(contentType ? { type: contentType } : {}),
      ...(genre ? { genre } : {}),
    }),
  });

  const filtered = movies.filter((m) =>
    !search || m.title.toLowerCase().includes(search.toLowerCase())
  );

  const title = contentType === "series" ? "TV Series" : "Movies";

  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-24 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-1">{title}</h1>
          <p className="text-[#555]">
            {isLoading ? "Loading…" : `${filtered.length} title${filtered.length !== 1 ? "s" : ""} available`}
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555]" />
            <input
              type="text"
              placeholder={`Search ${title.toLowerCase()}…`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-[#444] focus:outline-none focus:border-[#00ff7f]/40 transition-colors"
            />
          </div>

          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-[#555]" />
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setGenre("")}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  !genre
                    ? "bg-[#00ff7f]/20 border-[#00ff7f]/50 text-[#00ff7f]"
                    : "border-white/10 text-[#666] hover:border-white/20 hover:text-white"
                }`}
              >
                All
              </button>
              {GENRES.map((g) => (
                <button
                  key={g}
                  onClick={() => setGenre(genre === g ? "" : g)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    genre === g
                      ? "bg-[#00ff7f]/20 border-[#00ff7f]/50 text-[#00ff7f]"
                      : "border-white/10 text-[#666] hover:border-white/20 hover:text-white"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {Array.from({ length: 18 }).map((_, i) => (
              <div key={i} className="rounded-xl overflow-hidden bg-white/5 animate-pulse">
                <div className="aspect-[2/3] bg-white/5" />
                <div className="p-3 space-y-2">
                  <div className="h-3 bg-white/5 rounded w-3/4" />
                  <div className="h-2 bg-white/5 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
              <Search className="w-6 h-6 text-[#444]" />
            </div>
            <p className="text-white font-medium mb-1">No {title.toLowerCase()} found</p>
            <p className="text-[#555] text-sm">Try a different search or genre filter</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filtered.map((m) => (
              <MovieCard key={m.id} movie={m} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
