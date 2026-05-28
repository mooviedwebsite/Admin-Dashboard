import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

// Public pages
import Home from "@/pages/public/Home";
import Browse from "@/pages/public/Browse";
import MovieDetail from "@/pages/public/MovieDetail";
import SearchPage from "@/pages/public/SearchPage";

// Auth pages
import UserLogin from "@/pages/auth/UserLogin";
import Register from "@/pages/auth/Register";

// User pages
import Watchlist from "@/pages/user/Watchlist";

// Admin pages
import AdminLogin from "@/pages/admin/login";
import Dashboard from "@/pages/admin/dashboard";
import MoviesPage from "@/pages/admin/movies";
import UsersPage from "@/pages/admin/users";
import ReviewsPage from "@/pages/admin/reviews";
import AnalyticsPage from "@/pages/admin/analytics";
import SettingsPage from "@/pages/admin/settings";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function ProtectedAdminRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-[#00ff7f]/30 border-t-[#00ff7f] animate-spin" />
          <p className="text-sm text-[#555]">Loading…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/admin/login" />;
  }

  return <Component />;
}

function SeriesPageWrapper() {
  return <MoviesPage contentType="series" />;
}

function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      {children}
      <Footer />
    </>
  );
}

function Router() {
  return (
    <Switch>
      {/* Public website */}
      <Route path="/" component={() => <PublicLayout><Home /></PublicLayout>} />
      <Route path="/movies" component={() => <PublicLayout><Browse contentType="movie" /></PublicLayout>} />
      <Route path="/series" component={() => <PublicLayout><Browse contentType="series" /></PublicLayout>} />
      <Route path="/movie/:id" component={() => <PublicLayout><MovieDetail /></PublicLayout>} />
      <Route path="/series/:id" component={() => <PublicLayout><MovieDetail /></PublicLayout>} />
      <Route path="/search" component={() => <PublicLayout><SearchPage /></PublicLayout>} />

      {/* User auth */}
      <Route path="/login" component={UserLogin} />
      <Route path="/register" component={Register} />

      {/* User protected */}
      <Route path="/watchlist" component={() => <PublicLayout><Watchlist /></PublicLayout>} />

      {/* Admin */}
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin" component={() => <ProtectedAdminRoute component={Dashboard} />} />
      <Route path="/admin/movies" component={() => <ProtectedAdminRoute component={MoviesPage} />} />
      <Route path="/admin/movies/new" component={() => <ProtectedAdminRoute component={MoviesPage} />} />
      <Route path="/admin/series" component={() => <ProtectedAdminRoute component={SeriesPageWrapper} />} />
      <Route path="/admin/users" component={() => <ProtectedAdminRoute component={UsersPage} />} />
      <Route path="/admin/reviews" component={() => <ProtectedAdminRoute component={ReviewsPage} />} />
      <Route path="/admin/analytics" component={() => <ProtectedAdminRoute component={AnalyticsPage} />} />
      <Route path="/admin/settings" component={() => <ProtectedAdminRoute component={SettingsPage} />} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
