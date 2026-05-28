import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search, LayoutGrid, List, SlidersHorizontal } from "lucide-react";
import { fetchMovies } from "@/lib/api";
import MovieCard from "@/components/MovieCard";
import type { Movie } from "@/lib/api";

interface Props { contentType?: "movie" | "series"; }

const GENRES = ["Action", "Adventure", "Animation", "Comedy", "Crime", "Documentary", "Drama", "Fantasy", "Horror", "Mystery", "Romance", "Sci-Fi", "Thriller"];
const SORT_OPTIONS = [
  { label: "Newest", value: "newest" },
  { label: "Top Rated", value: "rating" },
  { label: "Most Viewed", value: "views" },
  { label: "A–Z", value: "az" },
];

function sortMovies(movies: Movie[], sort: string) {
  return [...movies].sort((a, b) => {
    if (sort === "rating") return (b.imdbRating ?? b.rating ?? 0) - (a.imdbRating ?? a.rating ?? 0);
    if (sort === "views") return (b.views ?? 0) - (a.views ?? 0);
    if (sort === "az") return a.title.localeCompare(b.title);
    return (b.year ?? 0) - (a.year ?? 0);
  });
}

export default function Browse({ contentType }: Props) {
  const [search, setSearch] = useState("");
  const [genre, setGenre] = useState("");
  const [sort, setSort] = useState("newest");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [showFilters, setShowFilters] = useState(false);

  const { data: movies = [], isLoading } = useQuery({
    queryKey: ["movies", contentType, genre],
    queryFn: () => fetchMovies({ ...(contentType ? { type: contentType } : {}), ...(genre ? { genre } : {}) }),
  });

  const filtered = sortMovies(
    movies.filter(m => !search || m.title.toLowerCase().includes(search.toLowerCase())),
    sort
  );

  const title = contentType === "series" ? "TV Series" : "Movies";

  return (
    <div className="min-h-screen bg-black pt-24 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 fade-in">
          <h1 className="font-heading font-black text-4xl text-white mb-1">{title}</h1>
          <p className="text-[#555] text-sm">
            {isLoading ? "Loading…" : `${filtered.length} title${filtered.length !== 1 ? "s" : ""}`}
          </p>
        </div>

        {/* Search + controls */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1 max-w-lg">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#444]" />
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder={`Search ${title.toLowerCase()}…`}
              className="w-full glass border border-white/8 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder:text-[#333] transition-all"
            />
          </div>
          <div className="flex items-center gap-2">
            {/* Sort */}
            <select value={sort} onChange={e => setSort(e.target.value)}
              className="glass border border-white/8 rounded-xl px-3 py-3 text-sm text-[#aaa] bg-transparent cursor-pointer">
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value} className="bg-[#111]">{o.label}</option>)}
            </select>
            {/* Filter toggle */}
            <button onClick={() => setShowFilters(!showFilters)}
              className={`w-11 h-11 flex items-center justify-center rounded-xl border transition-colors ${showFilters ? "bg-[#00ff7f]/10 border-[#00ff7f]/30 text-[#00ff7f]" : "glass border-white/8 text-[#777] hover:text-white"}`}>
              <SlidersHorizontal className="w-4 h-4" />
            </button>
            {/* View toggle */}
            <div className="flex glass border border-white/8 rounded-xl overflow-hidden">
              <button onClick={() => setView("grid")} className={`w-10 h-11 flex items-center justify-center transition-colors ${view === "grid" ? "bg-[#00ff7f]/10 text-[#00ff7f]" : "text-[#555] hover:text-white"}`}>
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button onClick={() => setView("list")} className={`w-10 h-11 flex items-center justify-center transition-colors ${view === "list" ? "bg-[#00ff7f]/10 text-[#00ff7f]" : "text-[#555] hover:text-white"}`}>
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Genre filters */}
        {showFilters && (
          <div className="flex flex-wrap gap-2 mb-6 p-4 glass rounded-2xl animate-in fade-in slide-in-from-top-2 duration-200">
            <button onClick={() => setGenre("")}
              className={`text-xs px-3.5 py-1.5 rounded-full border font-medium transition-all ${!genre ? "bg-[#00ff7f]/15 border-[#00ff7f]/40 text-[#00ff7f]" : "border-white/10 text-[#666] hover:text-white hover:border-white/20"}`}>
              All Genres
            </button>
            {GENRES.map(g => (
              <button key={g} onClick={() => setGenre(genre === g ? "" : g)}
                className={`text-xs px-3.5 py-1.5 rounded-full border font-medium transition-all ${genre === g ? "bg-[#00ff7f]/15 border-[#00ff7f]/40 text-[#00ff7f]" : "border-white/10 text-[#666] hover:text-white hover:border-white/20"}`}>
                {g}
              </button>
            ))}
          </div>
        )}

        {/* Results */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
            {Array.from({ length: 18 }).map((_, i) => (
              <div key={i} className="rounded-xl overflow-hidden" style={{ aspectRatio: "2/3" }}>
                <div className="w-full h-full skeleton rounded-xl" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center fade-in">
            <div className="w-20 h-20 glass rounded-2xl flex items-center justify-center mb-5">
              <Search className="w-8 h-8 text-[#333]" />
            </div>
            <p className="font-heading font-bold text-white text-xl mb-2">No {title.toLowerCase()} found</p>
            <p className="text-[#555] text-sm">Try a different search term or genre</p>
          </div>
        ) : view === "grid" ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5 fade-in">
            {filtered.map(m => (
              <div key={m.id} className="flex justify-center">
                <MovieCard movie={m} size="md" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3 fade-in">
            {filtered.map(m => (
              <div key={m.id} className="glass rounded-xl p-4 flex items-center gap-4 hover:border-[#00ff7f]/20 transition-all border border-transparent">
                <img src={m.posterUrl || "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=100&q=80"} alt={m.title}
                  className="w-12 h-16 object-cover rounded-lg flex-shrink-0"
                  onError={e => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=100&q=80"; }} />
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-semibold truncate">{m.title}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    {m.year && <span className="text-[#555] text-xs">{m.year}</span>}
                    {m.genre && <span className="text-[#555] text-xs">{String(m.genre).split(",")[0]}</span>}
                    {(m.imdbRating ?? m.rating) != null && <span className="text-yellow-400 text-xs">★ {m.imdbRating ?? m.rating}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
