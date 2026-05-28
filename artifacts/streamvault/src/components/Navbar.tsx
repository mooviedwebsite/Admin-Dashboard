import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Search, Menu, X, Film, User, LogOut, Bookmark, ChevronDown } from "lucide-react";
import { useUserAuth } from "@/hooks/useUserAuth";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchVal, setSearchVal] = useState("");
  const [location, navigate] = useLocation();
  const { user, logout } = useUserAuth();

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const handleLogout = () => { logout(); navigate("/"); };
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchVal.trim()) { navigate(`/search?q=${encodeURIComponent(searchVal.trim())}`); setSearchOpen(false); }
  };

  const isActive = (path: string) => location === path;

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "bg-black/95 backdrop-blur-xl border-b border-[#00ff7f]/10" : "bg-gradient-to-b from-black/80 to-transparent"}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-8 h-8 rounded-lg bg-[#00ff7f]/10 border border-[#00ff7f]/30 flex items-center justify-center glow-sm">
              <Film className="w-4 h-4 text-[#00ff7f]" />
            </div>
            <span className="font-heading font-bold text-lg text-white tracking-tight">
              Moovied<span className="text-[#00ff7f] text-glow">Web</span>
            </span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-1">
            {[
              { href: "/", label: "Home" },
              { href: "/movies", label: "Movies" },
              { href: "/series", label: "TV Series" },
            ].map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`relative px-4 py-2 text-sm font-medium transition-colors ${isActive(href) ? "text-[#00ff7f]" : "text-[#aaa] hover:text-white"}`}
              >
                {label}
                {isActive(href) && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-[#00ff7f] rounded-full" style={{ boxShadow: "0 0 8px rgba(0,255,127,0.8)" }} />
                )}
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Search */}
            {searchOpen ? (
              <form onSubmit={handleSearch} className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4 duration-200">
                <input
                  autoFocus
                  value={searchVal}
                  onChange={e => setSearchVal(e.target.value)}
                  placeholder="Search movies, series…"
                  className="bg-white/8 border border-[#00ff7f]/20 rounded-lg px-3 py-1.5 text-sm text-white placeholder:text-[#444] w-48 transition-all"
                />
                <button type="button" onClick={() => setSearchOpen(false)} className="text-[#666] hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </form>
            ) : (
              <button onClick={() => setSearchOpen(true)} className="hidden md:flex w-8 h-8 items-center justify-center text-[#777] hover:text-[#00ff7f] transition-colors rounded-lg hover:bg-[#00ff7f]/5">
                <Search className="w-4 h-4" />
              </button>
            )}

            {/* Auth */}
            <div className="hidden md:flex items-center gap-2">
              {user ? (
                <>
                  <Link href="/watchlist" className="w-8 h-8 flex items-center justify-center text-[#777] hover:text-[#00ff7f] transition-colors rounded-lg hover:bg-[#00ff7f]/5">
                    <Bookmark className="w-4 h-4" />
                  </Link>
                  <div className="flex items-center gap-2 glass rounded-xl px-3 py-1.5 cursor-pointer group relative">
                    <div className="w-6 h-6 rounded-full bg-[#00ff7f]/20 border border-[#00ff7f]/40 flex items-center justify-center">
                      <User className="w-3 h-3 text-[#00ff7f]" />
                    </div>
                    <span className="text-sm text-white font-medium">{user.name.split(" ")[0]}</span>
                    <ChevronDown className="w-3 h-3 text-[#555]" />
                    <div className="absolute top-full right-0 mt-2 w-44 glass-dark rounded-xl border border-white/8 overflow-hidden opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all shadow-2xl">
                      <Link href="/watchlist" className="flex items-center gap-2.5 px-4 py-3 text-sm text-[#aaa] hover:text-white hover:bg-white/5 transition-colors">
                        <Bookmark className="w-3.5 h-3.5" /> Watchlist
                      </Link>
                      <button onClick={handleLogout} className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-[#aaa] hover:text-white hover:bg-white/5 transition-colors">
                        <LogOut className="w-3.5 h-3.5" /> Sign Out
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <Link href="/login" className="text-sm text-[#aaa] hover:text-white px-3 py-1.5 transition-colors">Sign In</Link>
                  <Link href="/register" className="text-sm font-semibold bg-[#00ff7f] text-black px-4 py-1.5 rounded-lg hover:bg-[#00e070] transition-colors glow-sm">
                    Get Started
                  </Link>
                </>
              )}
            </div>

            {/* Mobile toggle */}
            <button className="md:hidden w-9 h-9 flex items-center justify-center text-[#aaa] rounded-lg border border-white/8" onClick={() => setOpen(!open)}>
              {open ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden glass-dark border-t border-white/5 animate-in slide-in-from-top-2 duration-200">
          <div className="px-4 py-5 space-y-1">
            {[{href:"/",label:"Home"},{href:"/movies",label:"Movies"},{href:"/series",label:"TV Series"},{href:"/search",label:"Search"}].map(({href,label})=>(
              <Link key={href} href={href} className={`block px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${isActive(href)?"text-[#00ff7f] bg-[#00ff7f]/8":"text-[#aaa] hover:text-white hover:bg-white/5"}`} onClick={()=>setOpen(false)}>{label}</Link>
            ))}
            <div className="pt-3 border-t border-white/5 mt-3 space-y-1">
              {user ? (
                <>
                  <Link href="/watchlist" className="block px-4 py-2.5 text-sm text-[#aaa] hover:text-white rounded-xl hover:bg-white/5" onClick={()=>setOpen(false)}>Watchlist</Link>
                  <button onClick={()=>{handleLogout();setOpen(false);}} className="block w-full text-left px-4 py-2.5 text-sm text-[#aaa] hover:text-white rounded-xl hover:bg-white/5">Sign Out</button>
                </>
              ) : (
                <>
                  <Link href="/login" className="block px-4 py-2.5 text-sm text-[#aaa] hover:text-white rounded-xl hover:bg-white/5" onClick={()=>setOpen(false)}>Sign In</Link>
                  <Link href="/register" className="block px-4 py-2.5 text-sm font-semibold text-[#00ff7f]" onClick={()=>setOpen(false)}>Get Started →</Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
