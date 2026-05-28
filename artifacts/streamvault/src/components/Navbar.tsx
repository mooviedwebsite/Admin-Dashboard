import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Search, Menu, X, Film, User, LogOut, Bookmark } from "lucide-react";
import { useUserAuth } from "@/hooks/useUserAuth";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [, navigate] = useLocation();
  const { user, logout } = useUserAuth();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a]/90 backdrop-blur-md border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-[#00ff7f]/10 border border-[#00ff7f]/30 flex items-center justify-center group-hover:bg-[#00ff7f]/20 transition-colors">
              <Film className="w-4 h-4 text-[#00ff7f]" />
            </div>
            <span className="text-white font-bold text-lg tracking-tight">
              Moovied<span className="text-[#00ff7f]">Web</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            <Link href="/movies" className="text-sm text-[#999] hover:text-white transition-colors">Movies</Link>
            <Link href="/series" className="text-sm text-[#999] hover:text-white transition-colors">TV Series</Link>
            <Link href="/search" className="text-[#999] hover:text-white transition-colors">
              <Search className="w-4 h-4" />
            </Link>
          </div>

          {/* Auth */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <>
                <Link href="/watchlist" className="text-[#999] hover:text-[#00ff7f] transition-colors">
                  <Bookmark className="w-4 h-4" />
                </Link>
                <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-1.5 border border-white/10">
                  <User className="w-3.5 h-3.5 text-[#00ff7f]" />
                  <span className="text-sm text-white">{user.name}</span>
                </div>
                <button onClick={handleLogout} className="text-[#999] hover:text-red-400 transition-colors">
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="text-sm text-[#999] hover:text-white transition-colors">Sign In</Link>
                <Link href="/register" className="text-sm bg-[#00ff7f] text-black font-semibold px-4 py-1.5 rounded-lg hover:bg-[#00e070] transition-colors">
                  Get Started
                </Link>
              </>
            )}
          </div>

          {/* Mobile toggle */}
          <button className="md:hidden text-[#999]" onClick={() => setOpen(!open)}>
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-white/5 bg-[#0d0d0d]">
          <div className="px-4 py-4 flex flex-col gap-4">
            <Link href="/movies" className="text-sm text-[#999] hover:text-white" onClick={() => setOpen(false)}>Movies</Link>
            <Link href="/series" className="text-sm text-[#999] hover:text-white" onClick={() => setOpen(false)}>TV Series</Link>
            <Link href="/search" className="text-sm text-[#999] hover:text-white" onClick={() => setOpen(false)}>Search</Link>
            {user ? (
              <>
                <Link href="/watchlist" className="text-sm text-[#999] hover:text-white" onClick={() => setOpen(false)}>Watchlist</Link>
                <button onClick={() => { handleLogout(); setOpen(false); }} className="text-sm text-red-400 text-left">Sign Out</button>
              </>
            ) : (
              <>
                <Link href="/login" className="text-sm text-[#999] hover:text-white" onClick={() => setOpen(false)}>Sign In</Link>
                <Link href="/register" className="text-sm text-[#00ff7f] font-semibold" onClick={() => setOpen(false)}>Get Started</Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
