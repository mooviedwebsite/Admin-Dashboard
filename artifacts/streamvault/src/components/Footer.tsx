import { Link } from "wouter";
import { Film, Twitter, Github, Instagram } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-black border-t border-white/5 mt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link href="/" className="inline-flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-[#00ff7f]/10 border border-[#00ff7f]/25 flex items-center justify-center" style={{ boxShadow: "0 0 12px rgba(0,255,127,0.15)" }}>
                <Film className="w-4 h-4 text-[#00ff7f]" />
              </div>
              <span className="font-heading font-bold text-white">Moovied<span className="text-[#00ff7f]">Web</span></span>
            </Link>
            <p className="text-[#444] text-sm leading-relaxed max-w-xs">
              Your ultimate destination to stream the latest movies and TV series. Unlimited entertainment, zero cost.
            </p>
            <div className="flex gap-3 mt-5">
              {[Twitter, Github, Instagram].map((Icon, i) => (
                <button key={i} className="w-8 h-8 glass rounded-lg flex items-center justify-center text-[#444] hover:text-[#00ff7f] hover:border-[#00ff7f]/20 transition-colors">
                  <Icon className="w-3.5 h-3.5" />
                </button>
              ))}
            </div>
          </div>

          {/* Browse */}
          <div>
            <p className="text-xs font-bold text-[#444] uppercase tracking-widest mb-4">Browse</p>
            <div className="space-y-2.5">
              {[["Movies", "/movies"], ["TV Series", "/series"], ["Search", "/search"], ["New Releases", "/movies"]].map(([label, href]) => (
                <Link key={label} href={href} className="block text-sm text-[#555] hover:text-white transition-colors">{label}</Link>
              ))}
            </div>
          </div>

          {/* Account */}
          <div>
            <p className="text-xs font-bold text-[#444] uppercase tracking-widest mb-4">Account</p>
            <div className="space-y-2.5">
              {[["Sign In", "/login"], ["Register", "/register"], ["Watchlist", "/watchlist"]].map(([label, href]) => (
                <Link key={label} href={href} className="block text-sm text-[#555] hover:text-white transition-colors">{label}</Link>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-14 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-[#333]">© {new Date().getFullYear()} MooviedWeb. All rights reserved.</p>
          <p className="text-xs text-[#333]">Stream responsibly.</p>
        </div>
      </div>
    </footer>
  );
}
