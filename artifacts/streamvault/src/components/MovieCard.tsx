import { Link } from "wouter";
import { Star, Play, Clock } from "lucide-react";
import type { Movie } from "@/lib/api";

interface Props {
  movie: Movie;
}

const FALLBACK =
  "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400&q=80";

export default function MovieCard({ movie }: Props) {
  const poster = movie.posterUrl || FALLBACK;
  const href = movie.contentType === "series" ? `/series/${movie.id}` : `/movie/${movie.id}`;

  return (
    <Link href={href} className="group block relative rounded-xl overflow-hidden bg-[#111] border border-white/5 hover:border-[#00ff7f]/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-[#00ff7f]/5">
      {/* Poster */}
      <div className="relative aspect-[2/3] overflow-hidden">
        <img
          src={poster}
          alt={movie.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK; }}
        />
        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-[#00ff7f] flex items-center justify-center">
            <Play className="w-5 h-5 text-black fill-black ml-0.5" />
          </div>
        </div>
        {/* Badge */}
        {movie.contentType === "series" && (
          <div className="absolute top-2 left-2 bg-[#00ff7f]/20 border border-[#00ff7f]/40 text-[#00ff7f] text-[10px] font-semibold px-2 py-0.5 rounded-full">
            SERIES
          </div>
        )}
        {movie.featured && (
          <div className="absolute top-2 right-2 bg-yellow-500/20 border border-yellow-500/40 text-yellow-400 text-[10px] font-semibold px-2 py-0.5 rounded-full">
            FEATURED
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="text-white text-sm font-medium truncate group-hover:text-[#00ff7f] transition-colors">
          {movie.title}
        </h3>
        <div className="flex items-center justify-between mt-1.5">
          <div className="flex items-center gap-1">
            {movie.year && <span className="text-[#555] text-xs">{movie.year}</span>}
            {movie.genre && (
              <>
                <span className="text-[#333] text-xs">·</span>
                <span className="text-[#555] text-xs truncate max-w-[80px]">{movie.genre}</span>
              </>
            )}
          </div>
          {movie.rating != null && (
            <div className="flex items-center gap-1">
              <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
              <span className="text-[#999] text-xs">{movie.rating.toFixed(1)}</span>
            </div>
          )}
        </div>
        {movie.duration != null && (
          <div className="flex items-center gap-1 mt-1">
            <Clock className="w-3 h-3 text-[#444]" />
            <span className="text-[#444] text-xs">{movie.duration} min</span>
          </div>
        )}
      </div>
    </Link>
  );
}
