import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useState, useEffect, useRef } from "react";
import { Play, Download, Info, ChevronLeft, ChevronRight, Star, Flame, Sparkles, TrendingUp, Clapperboard } from "lucide-react";
import { fetchFeatured, fetchTrending, fetchNewReleases, fetchTopRated, fetchMovies } from "@/lib/api";
import MovieCard from "@/components/MovieCard";
import type { Movie } from "@/lib/api";

const FALLBACK_BANNER = "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1400&q=90";

// ── Hero ─────────────────────────────────────────────────────────────────────
function Hero({ movies }: { movies: Movie[] }) {
  const [idx, setIdx] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const movie = movies[idx];

  useEffect(() => {
    if (movies.length <= 1) return;
    timerRef.current = setTimeout(() => setIdx(i => (i + 1) % movies.length), 6000);
    return () => clearTimeout(timerRef.current);
  }, [idx, movies.length]);

  if (!movie) return null;

  const banner = movie.bannerUrl || movie.backdropUrl || movie.posterUrl || FALLBACK_BANNER;
  const href = movie.contentType === "series" ? `/series/${movie.id}` : `/movie/${movie.id}`;
  const genres: string[] = Array.isArray(movie.genre) ? movie.genre : movie.genre ? String(movie.genre).split(",").map(g => g.trim()) : [];

  return (
    <div className="relative h-[100svh] min-h-[600px] max-h-[900px] overflow-hidden">
      {/* Banner image */}
      <div className="absolute inset-0">
        <img
          key={banner}
          src={banner}
          alt={movie.title}
          className="w-full h-full object-cover transition-opacity duration-1000 fade-in"
          onError={e => { (e.target as HTMLImageElement).src = FALLBACK_BANNER; }}
        />
      </div>

      {/* Gradients */}
      <div className="absolute inset-0 bg-gradient-to-r from-black via-black/50 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent" />

      {/* Content */}
      <div className="absolute inset-0 flex items-center">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 w-full pt-16">
          <div className="max-w-xl fade-in">
            {/* Badges */}
            <div className="flex items-center gap-2 mb-5 flex-wrap">
              {movie.featured && (
                <div className="flex items-center gap-1.5 bg-[#00ff7f]/10 border border-[#00ff7f]/30 rounded-full px-3 py-1 backdrop-blur-sm">
                  <Sparkles className="w-3 h-3 text-[#00ff7f]" />
                  <span className="text-[#00ff7f] text-xs font-semibold">Featured</span>
                </div>
              )}
              {genres.slice(0, 2).map(g => (
                <span key={g} className="glass rounded-full px-3 py-1 text-xs text-[#ccc] font-medium">{g}</span>
              ))}
              {movie.imdbRating != null && (
                <div className="flex items-center gap-1 glass rounded-full px-3 py-1">
                  <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                  <span className="text-white text-xs font-bold">{String(movie.imdbRating || movie.rating)}</span>
                  <span className="text-[#666] text-[10px]">IMDB</span>
                </div>
              )}
            </div>

            {/* Title */}
            <h1 className="font-heading font-black text-4xl sm:text-5xl lg:text-6xl text-white leading-[1.05] mb-4 tracking-tight">
              {movie.title}
            </h1>

            {/* Description */}
            {movie.description && (
              <p className="text-[#bbb] text-base leading-relaxed mb-8 line-clamp-3 max-w-md">
                {movie.description}
              </p>
            )}

            {/* Buttons */}
            <div className="flex flex-wrap gap-3">
              <Link href={href} className="flex items-center gap-2.5 bg-[#00ff7f] text-black font-bold px-7 py-3.5 rounded-xl text-sm hover:bg-[#00e070] transition-all active:scale-95"
                style={{ boxShadow: "0 0 20px rgba(0,255,127,0.4)" }}>
                <Play className="w-4 h-4 fill-black" />
                Watch Now
              </Link>
              <Link href={href} className="flex items-center gap-2.5 glass text-white font-semibold px-7 py-3.5 rounded-xl text-sm hover:bg-white/10 transition-all">
                <Download className="w-4 h-4" />
                Download
              </Link>
              <Link href={href} className="flex items-center gap-2 text-[#aaa] hover:text-white px-4 py-3.5 text-sm transition-colors">
                <Info className="w-4 h-4" /> More Info
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Hero dots */}
      {movies.length > 1 && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 flex gap-1.5">
          {movies.map((_, i) => (
            <button key={i} onClick={() => setIdx(i)}
              className={`transition-all rounded-full ${i === idx ? "w-6 h-1.5 bg-[#00ff7f]" : "w-1.5 h-1.5 bg-white/30 hover:bg-white/60"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Horizontal scroll row ─────────────────────────────────────────────────────
function MovieRow({ title, icon, movies, loading }: { title: string; icon: React.ReactNode; movies: Movie[]; loading?: boolean }) {
  const rowRef = useRef<HTMLDivElement>(null);
  const scroll = (dir: number) => rowRef.current?.scrollBy({ left: dir * 700, behavior: "smooth" });

  return (
    <section className="py-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-[#00ff7f]">{icon}</span>
          <h2 className="font-heading font-bold text-white text-xl">{title}</h2>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => scroll(-1)} className="w-8 h-8 flex items-center justify-center glass rounded-lg text-[#777] hover:text-white transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={() => scroll(1)} className="w-8 h-8 flex items-center justify-center glass rounded-lg text-[#777] hover:text-white transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Scroll container */}
      <div ref={rowRef} className="scroll-row px-4 sm:px-6 lg:px-8">
        {loading
          ? Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex-shrink-0 w-40 rounded-xl overflow-hidden" style={{ aspectRatio: "2/3" }}>
                <div className="w-full h-full skeleton rounded-xl" />
              </div>
            ))
          : movies.map(m => <MovieCard key={m.id} movie={m} />)
        }
      </div>
    </section>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Home() {
  const featured = useQuery({ queryKey: ["featured"], queryFn: fetchFeatured });
  const trending = useQuery({ queryKey: ["trending"], queryFn: fetchTrending });
  const newReleases = useQuery({ queryKey: ["new-releases"], queryFn: fetchNewReleases });
  const topRated = useQuery({ queryKey: ["top-rated"], queryFn: fetchTopRated });
  const all = useQuery({ queryKey: ["movies-all"], queryFn: () => fetchMovies() });

  const heroMovies = featured.data?.length ? featured.data : all.data?.slice(0, 5) ?? [];

  return (
    <div className="min-h-screen bg-black">
      {/* Hero */}
      {featured.isLoading && !all.data ? (
        <div className="h-[100svh] min-h-[600px] max-h-[900px] bg-gradient-to-b from-[#0a0a0a] to-black flex items-center justify-center skeleton">
          <div className="w-10 h-10 rounded-full border-2 border-[#00ff7f]/30 border-t-[#00ff7f] animate-spin" />
        </div>
      ) : heroMovies.length > 0 ? (
        <Hero movies={heroMovies} />
      ) : (
        <div className="h-[70svh] min-h-[500px] flex flex-col items-center justify-center bg-gradient-to-b from-[#0a0a0a] to-black">
          <h1 className="font-heading font-black text-5xl text-white mb-4">Moovied<span className="text-[#00ff7f]">Web</span></h1>
          <p className="text-[#666] mb-8">Stream the latest movies &amp; TV series</p>
          <Link href="/movies" className="bg-[#00ff7f] text-black font-bold px-8 py-3.5 rounded-xl hover:bg-[#00e070] transition-all" style={{boxShadow:"0 0 20px rgba(0,255,127,0.3)"}}>Browse Movies</Link>
        </div>
      )}

      {/* Content rows */}
      <div className="mt-0 pb-20">
        <MovieRow title="Trending Now" icon={<Flame className="w-5 h-5" />} movies={trending.data ?? []} loading={trending.isLoading} />
        <MovieRow title="New Releases" icon={<Sparkles className="w-5 h-5" />} movies={newReleases.data ?? []} loading={newReleases.isLoading} />
        <MovieRow title="Top Rated" icon={<Star className="w-5 h-5" />} movies={topRated.data ?? []} loading={topRated.isLoading} />
        {(all.data?.filter(m => m.contentType === "series") ?? []).length > 0 && (
          <MovieRow title="TV Series" icon={<Clapperboard className="w-5 h-5" />} movies={(all.data ?? []).filter(m => m.contentType === "series")} />
        )}
        {(all.data?.filter(m => m.contentType !== "series") ?? []).length > 0 && (
          <MovieRow title="All Movies" icon={<TrendingUp className="w-5 h-5" />} movies={(all.data ?? []).filter(m => m.contentType !== "series")} />
        )}
      </div>

      {/* CTA Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="relative rounded-2xl overflow-hidden p-12 text-center glass"
          style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(0,255,127,0.08) 0%, rgba(0,0,0,0.02) 70%)" }}>
          <div className="absolute inset-0 border border-[#00ff7f]/15 rounded-2xl pointer-events-none" />
          <h2 className="font-heading font-black text-3xl sm:text-4xl text-white mb-3">Start streaming for free</h2>
          <p className="text-[#777] mb-8 text-lg">Create an account and get unlimited access to all movies and series.</p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link href="/register" className="font-bold bg-[#00ff7f] text-black px-8 py-3.5 rounded-xl hover:bg-[#00e070] transition-all text-sm"
              style={{ boxShadow: "0 0 24px rgba(0,255,127,0.35)" }}>
              Create Free Account
            </Link>
            <Link href="/movies" className="font-semibold glass text-white px-8 py-3.5 rounded-xl hover:bg-white/8 transition-all text-sm">
              Browse Movies
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
