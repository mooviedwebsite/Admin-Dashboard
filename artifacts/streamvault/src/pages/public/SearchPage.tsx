import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { fetchMovies } from "@/lib/api";
import MovieCard from "@/components/MovieCard";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");

  const { data: results = [], isLoading } = useQuery({
    queryKey: ["search", submitted],
    queryFn: () => fetchMovies(submitted ? { q: submitted } : {}),
    enabled: submitted.length > 0,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(query.trim());
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-24 pb-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-white mb-8">Search</h1>

        <form onSubmit={handleSearch} className="relative mb-10">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#555]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search movies, TV series, genres…"
            className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-32 py-4 text-white placeholder:text-[#444] focus:outline-none focus:border-[#00ff7f]/40 transition-colors text-base"
          />
          <button
            type="submit"
            className="absolute right-3 top-1/2 -translate-y-1/2 bg-[#00ff7f] text-black font-semibold text-sm px-5 py-2 rounded-xl hover:bg-[#00e070] transition-colors"
          >
            Search
          </button>
        </form>

        {!submitted && (
          <div className="text-center py-20 text-[#333]">
            <Search className="w-12 h-12 mx-auto mb-4 opacity-40" />
            <p className="text-lg">Search for movies and TV series</p>
          </div>
        )}

        {submitted && isLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-xl bg-white/5 animate-pulse">
                <div className="aspect-[2/3]" />
                <div className="p-3 space-y-2">
                  <div className="h-3 bg-white/5 rounded w-3/4" />
                  <div className="h-2 bg-white/5 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {submitted && !isLoading && results.length === 0 && (
          <div className="text-center py-20">
            <p className="text-white font-medium mb-1">No results for &ldquo;{submitted}&rdquo;</p>
            <p className="text-[#555] text-sm">Try different keywords</p>
          </div>
        )}

        {submitted && !isLoading && results.length > 0 && (
          <>
            <p className="text-[#555] text-sm mb-5">
              {results.length} result{results.length !== 1 ? "s" : ""} for &ldquo;{submitted}&rdquo;
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {results.map((m) => (
                <MovieCard key={m.id} movie={m} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
