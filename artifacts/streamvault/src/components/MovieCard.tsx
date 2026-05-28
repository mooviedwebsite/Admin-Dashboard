import { Link } from "wouter";
import { Star, Play, Clock, Plus } from "lucide-react";
import type { Movie } from "@/lib/api";

interface Props {
  movie: Movie;
  size?: "sm" | "md" | "lg";
}

const FALLBACK = "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400&q=80";

export default function MovieCard({ movie, size = "md" }: Props) {
  const poster = movie.posterUrl || FALLBACK;
  const href = movie.contentType === "series" ? `/series/${movie.id}` : `/movie/${movie.id}`;

  return (
    <Link href={href} className="group block relative flex-shrink-0" style={{ width: size === "lg" ? 200 : size === "sm" ? 130 : 160 }}>
      {/* Poster */}
      <div className="relative overflow-hidden rounded-xl border border-[#00ff7f]/8 transition-all duration-300 group-hover:border-[#00ff7f]/30 group-hover:-translate-y-1"
        style={{ aspectRatio: "2/3", boxShadow: "0 4px 24px rgba(0,0,0,0.6)" }}>
        <img
          src={poster}
          alt={movie.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
          onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK; }}
        />

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-between p-3">
          {/* Top badges */}
          <div className="flex justify-between items-start">
            {movie.rating != null && (
              <div className="flex items-center gap-1 bg-black/70 backdrop-blur-sm rounded-full px-2 py-0.5">
                <Star className="w-2.5 h-2.5 text-yellow-400 fill-yellow-400" />
                <span className="text-white text-[10px] font-semibold">{movie.rating.toFixed(1)}</span>
              </div>
            )}
            <button className="w-6 h-6 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center hover:bg-[#00ff7f]/20 hover:border-[#00ff7f]/40 transition-colors ml-auto">
              <Plus className="w-3 h-3 text-white" />
            </button>
          </div>

          {/* Play button */}
          <div className="flex justify-center">
            <div className="w-11 h-11 rounded-full flex items-center justify-center transition-transform group-hover:scale-110"
              style={{ background: "#00ff7f", boxShadow: "0 0 20px rgba(0,255,127,0.5)" }}>
              <Play className="w-4 h-4 text-black fill-black ml-0.5" />
            </div>
          </div>

          {/* Bottom info */}
          <div>
            <p className="text-white text-xs font-semibold line-clamp-2 leading-tight mb-1">{movie.title}</p>
            <div className="flex items-center gap-1.5 flex-wrap">
              {movie.year && <span className="text-[#aaa] text-[10px]">{movie.year}</span>}
              {movie.duration && (
                <>
                  <span className="text-[#444] text-[10px]">·</span>
                  <span className="text-[#aaa] text-[10px] flex items-center gap-0.5">
                    <Clock className="w-2.5 h-2.5" />{movie.duration}m
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Type badge */}
        {movie.contentType === "series" && (
          <div className="absolute top-2 left-2 bg-[#00ff7f]/20 backdrop-blur-sm border border-[#00ff7f]/40 text-[#00ff7f] text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide opacity-0 group-hover:opacity-0">
            Series
          </div>
        )}
        <div className="absolute top-2 left-2 glass rounded-md px-1.5 py-0.5 text-[9px] font-bold text-[#00ff7f] uppercase tracking-wide transition-opacity group-hover:opacity-0"
          style={{ opacity: movie.contentType === "series" ? 1 : 0, visibility: movie.contentType === "series" ? "visible" : "hidden" }}>
          Series
        </div>
      </div>

      {/* Title below card */}
      <div className="mt-2 px-0.5">
        <p className="text-white text-xs font-medium truncate group-hover:text-[#00ff7f] transition-colors">{movie.title}</p>
        <div className="flex items-center gap-1 mt-0.5">
          {movie.year && <span className="text-[#555] text-[10px]">{movie.year}</span>}
          {movie.genre && (
            <>
              <span className="text-[#333] text-[10px]">·</span>
              <span className="text-[#555] text-[10px] truncate">{String(movie.genre).split(",")[0]}</span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}
