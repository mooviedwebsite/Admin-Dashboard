import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
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

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
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

function Router() {
  return (
    <Switch>
      <Route path="/" component={() => <Redirect to="/admin" />} />
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin" component={() => <ProtectedRoute component={Dashboard} />} />
      <Route path="/admin/movies" component={() => <ProtectedRoute component={MoviesPage} />} />
      <Route path="/admin/movies/new" component={() => <ProtectedRoute component={MoviesPage} />} />
      <Route path="/admin/series" component={() => <ProtectedRoute component={SeriesPageWrapper} />} />
      <Route path="/admin/users" component={() => <ProtectedRoute component={UsersPage} />} />
      <Route path="/admin/reviews" component={() => <ProtectedRoute component={ReviewsPage} />} />
      <Route path="/admin/analytics" component={() => <ProtectedRoute component={AnalyticsPage} />} />
      <Route path="/admin/settings" component={() => <ProtectedRoute component={SettingsPage} />} />
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
