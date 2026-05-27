import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Film,
  Tv,
  Users,
  MessageSquare,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const NAV: NavItem[] = [
  { label: "Dashboard", href: "/admin", icon: <LayoutDashboard size={18} /> },
  { label: "Movies", href: "/admin/movies", icon: <Film size={18} /> },
  { label: "TV Series", href: "/admin/series", icon: <Tv size={18} /> },
  { label: "Users", href: "/admin/users", icon: <Users size={18} /> },
  { label: "Reviews", href: "/admin/reviews", icon: <MessageSquare size={18} /> },
  { label: "Analytics", href: "/admin/analytics", icon: <BarChart3 size={18} /> },
  { label: "Settings", href: "/admin/settings", icon: <Settings size={18} /> },
];

interface Props {
  children: React.ReactNode;
  title?: string;
}

export default function AdminLayout({ children, title }: Props) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-50 w-60 bg-[#0d0d0d] border-r border-white/[0.05] flex flex-col transition-transform duration-200",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-white/[0.05]">
          <div className="p-1.5 rounded-lg bg-[#00ff7f]/10 border border-[#00ff7f]/20">
            <Film size={16} className="text-[#00ff7f]" />
          </div>
          <span className="font-bold text-white text-sm tracking-tight">MooviedWeb</span>
          <button
            className="ml-auto lg:hidden text-[#666] hover:text-white"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={16} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV.map((item) => {
            const active =
              item.href === "/admin"
                ? location === "/admin" || location === "/admin/"
                : location.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href}>
                <a
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group",
                    active
                      ? "bg-[#00ff7f]/10 text-[#00ff7f] border border-[#00ff7f]/15"
                      : "text-[#888] hover:text-white hover:bg-white/[0.04]"
                  )}
                  onClick={() => setSidebarOpen(false)}
                >
                  <span className={active ? "text-[#00ff7f]" : "text-[#555] group-hover:text-[#888]"}>
                    {item.icon}
                  </span>
                  {item.label}
                  {active && <ChevronRight size={14} className="ml-auto text-[#00ff7f]/60" />}
                </a>
              </Link>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="px-3 py-4 border-t border-white/[0.05]">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/[0.03] border border-white/[0.05]">
            <div className="w-7 h-7 rounded-full bg-[#00ff7f]/20 flex items-center justify-center text-[#00ff7f] text-xs font-bold shrink-0">
              {user?.name?.charAt(0).toUpperCase() ?? "A"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white truncate">{user?.name ?? "Admin"}</p>
              <p className="text-[10px] text-[#555] truncate">{user?.email}</p>
            </div>
            <button
              onClick={logout}
              title="Logout"
              className="shrink-0 text-[#555] hover:text-red-400 transition-colors"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-14 border-b border-white/[0.05] flex items-center px-4 lg:px-6 gap-4 bg-[#0a0a0a]/80 backdrop-blur-sm sticky top-0 z-30">
          <button
            className="lg:hidden text-[#666] hover:text-white"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={20} />
          </button>
          <h1 className="text-sm font-semibold text-white">{title ?? "Admin"}</h1>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden sm:block text-xs text-[#555] px-2 py-1 rounded bg-[#111] border border-white/[0.05]">
              Admin
            </span>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
