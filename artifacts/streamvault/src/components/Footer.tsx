import { Link } from "wouter";
import { Film } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-[#0d0d0d] border-t border-white/5 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col md:flex-row items-start justify-between gap-8">
          <div>
            <Link href="/" className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-[#00ff7f]/10 border border-[#00ff7f]/30 flex items-center justify-center">
                <Film className="w-3.5 h-3.5 text-[#00ff7f]" />
              </div>
              <span className="text-white font-bold">Moovied<span className="text-[#00ff7f]">Web</span></span>
            </Link>
            <p className="text-xs text-[#555] max-w-xs">Stream the latest movies and TV series. Unlimited entertainment at your fingertips.</p>
          </div>
          <div className="flex gap-12">
            <div>
              <p className="text-xs font-semibold text-[#666] uppercase tracking-widest mb-3">Browse</p>
              <div className="flex flex-col gap-2">
                <Link href="/movies" className="text-sm text-[#555] hover:text-white transition-colors">Movies</Link>
                <Link href="/series" className="text-sm text-[#555] hover:text-white transition-colors">TV Series</Link>
                <Link href="/search" className="text-sm text-[#555] hover:text-white transition-colors">Search</Link>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-[#666] uppercase tracking-widest mb-3">Account</p>
              <div className="flex flex-col gap-2">
                <Link href="/login" className="text-sm text-[#555] hover:text-white transition-colors">Sign In</Link>
                <Link href="/register" className="text-sm text-[#555] hover:text-white transition-colors">Register</Link>
                <Link href="/watchlist" className="text-sm text-[#555] hover:text-white transition-colors">Watchlist</Link>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-10 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-[#444]">© {new Date().getFullYear()} MooviedWeb. All rights reserved.</p>
          <p className="text-xs text-[#444]">Stream responsibly.</p>
        </div>
      </div>
    </footer>
  );
}
