import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Play, ChevronRight, Flame, Star, Sparkles, TrendingUp } from "lucide-react";
import { fetchFeatured, fetchTrending, fetchNewReleases, fetchTopRated } from "@/lib/api";
import MovieCard from "@/components/MovieCard";
import type { Movie } from "@/lib/api";

const FALLBACK_BANNER =
  "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1200&q=80";

function HeroSection({ movie }: { movie: Movie }) {
  const banner = movie.bannerUrl || movie.posterUrl || FALLBACK_BANNER;
  const href = movie.contentType === "series" ? `/series/${movie.id}` : `/movie/${movie.id}`;
  return (
    <div className="relative h-[90vh] min-h-[560px] flex items-end overflow-hidden">
      <img
        src={banner}
        alt={movie.title}
        className="absolute inset-0 w-full h-full object-cover"
        onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_BANNER; }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/60 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a]/80 to-transparent" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 w-full">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center gap-1.5 bg-[#00ff7f]/10 border border-[#00ff7f]/30 rounded-full px-3 py-1">
              <Sparkles className="w-3.5 h-3.5 text-[#00ff7f]" />
              <span className="text-[#00ff7f] text-xs font-semibold">Featured</span>
            </div>
            {movie.genre && (
              <span className="text-[#999] text-xs border border-white/10 rounded-full px-3 py-1">{movie.genre}</span>
            )}
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight">
            {movie.title}
          </h1>
          {movie.description && (
            <p className="text-[#aaa] text-base sm:text-lg mb-8 line-clamp-3 leading-relaxed">
              {movie.description}
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            <Link
              href={href}
              className="flex items-center gap-2 bg-[#00ff7f] text-black font-bold px-6 py-3 rounded-xl hover:bg-[#00e070] transition-colors text-sm"
            >
              <Play className="w-4 h-4 fill-black" />
              Watch Now
            </Link>
            <Link
              href={href}
              className="flex items-center gap-2 bg-white/10 text-white font-semibold px-6 py-3 rounded-xl hover:bg-white/20 transition-colors text-sm border border-white/10"
            >
              More Info
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  icon,
  movies,
  linkHref,
}: {
  title: string;
  icon: React.ReactNode;
  movies: Movie[];
  linkHref: string;
}) {
  if (!movies.length) return null;
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="text-[#00ff7f]">{icon}</div>
          <h2 className="text-white text-xl font-bold">{title}</h2>
        </div>
        <Link
          href={linkHref}
          className="flex items-center gap-1 text-sm text-[#00ff7f] hover:text-[#00e070] font-medium transition-colors"
        >
          View all <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {movies.slice(0, 12).map((m) => (
          <MovieCard key={m.id} movie={m} />
        ))}
      </div>
    </section>
  );
}

function SkeletonRow() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-xl overflow-hidden bg-white/5 animate-pulse">
          <div className="aspect-[2/3] bg-white/5" />
          <div className="p-3 space-y-2">
            <div className="h-3 bg-white/5 rounded w-3/4" />
            <div className="h-2 bg-white/5 rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Home() {
  const featured = useQuery({ queryKey: ["featured"], queryFn: fetchFeatured });
  const trending = useQuery({ queryKey: ["trending"], queryFn: fetchTrending });
  const newReleases = useQuery({ queryKey: ["new-releases"], queryFn: fetchNewReleases });
  const topRated = useQuery({ queryKey: ["top-rated"], queryFn: fetchTopRated });

  const heroMovie = featured.data?.[0];

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Hero */}
      {heroMovie ? (
        <HeroSection movie={heroMovie} />
      ) : featured.isLoading ? (
        <div className="h-[90vh] min-h-[560px] bg-gradient-to-b from-[#111] to-[#0a0a0a] animate-pulse flex items-center justify-center">
          <div className="w-10 h-10 rounded-full border-2 border-[#00ff7f]/30 border-t-[#00ff7f] animate-spin" />
        </div>
      ) : (
        <div className="h-[50vh] min-h-[360px] flex items-center justify-center bg-gradient-to-b from-[#111] to-[#0a0a0a]">
          <div className="text-center">
            <h1 className="text-5xl font-bold text-white mb-4">
              Moovied<span className="text-[#00ff7f]">Web</span>
            </h1>
            <p className="text-[#666] text-lg mb-8">Stream the latest movies &amp; TV series</p>
            <Link href="/movies" className="bg-[#00ff7f] text-black font-bold px-8 py-3 rounded-xl hover:bg-[#00e070] transition-colors">
              Browse Movies
            </Link>
          </div>
        </div>
      )}

      {/* Sections */}
      <div className="mt-4 space-y-2">
        {trending.isLoading ? (
          <div className="max-w-7xl mx-auto px-4 py-10"><SkeletonRow /></div>
        ) : (
          <Section
            title="Trending Now"
            icon={<Flame className="w-5 h-5" />}
            movies={trending.data || []}
            linkHref="/movies"
          />
        )}

        {newReleases.isLoading ? (
          <div className="max-w-7xl mx-auto px-4 py-10"><SkeletonRow /></div>
        ) : (
          <Section
            title="New Releases"
            icon={<Sparkles className="w-5 h-5" />}
            movies={newReleases.data || []}
            linkHref="/movies"
          />
        )}

        {topRated.isLoading ? (
          <div className="max-w-7xl mx-auto px-4 py-10"><SkeletonRow /></div>
        ) : (
          <Section
            title="Top Rated"
            icon={<Star className="w-5 h-5" />}
            movies={topRated.data || []}
            linkHref="/movies"
          />
        )}

        {featured.data && featured.data.length > 1 && (
          <Section
            title="Featured"
            icon={<TrendingUp className="w-5 h-5" />}
            movies={featured.data.slice(1)}
            linkHref="/movies"
          />
        )}
      </div>

      {/* CTA */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 mt-10">
        <div className="relative rounded-2xl overflow-hidden border border-[#00ff7f]/20 bg-gradient-to-r from-[#00ff7f]/5 to-transparent p-10 text-center">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,#00ff7f08,transparent_70%)]" />
          <h2 className="relative text-3xl font-bold text-white mb-3">
            Ready to start watching?
          </h2>
          <p className="relative text-[#666] mb-8">
            Create a free account and start streaming today.
          </p>
          <Link
            href="/register"
            className="relative inline-flex items-center gap-2 bg-[#00ff7f] text-black font-bold px-8 py-3 rounded-xl hover:bg-[#00e070] transition-colors"
          >
            Create Free Account
          </Link>
        </div>
      </div>
    </div>
  );
}
