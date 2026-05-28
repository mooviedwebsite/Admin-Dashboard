const CF_WORKER_URL = import.meta.env.VITE_CF_WORKER_URL || "";

// ── Admin token ────────────────────────────────────────────────────
export function getAdminToken(): string | null {
  return localStorage.getItem("admin_token");
}
export function setToken(token: string) {
  localStorage.setItem("admin_token", token);
}
export function clearToken() {
  localStorage.removeItem("admin_token");
}

// ── User token ─────────────────────────────────────────────────────
export function getUserToken(): string | null {
  return localStorage.getItem("user_token");
}
export function setUserToken(token: string) {
  localStorage.setItem("user_token", token);
}
export function clearUserToken() {
  localStorage.removeItem("user_token");
}

// ── Core fetch ─────────────────────────────────────────────────────
export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  useUserAuth = false
): Promise<T> {
  const token = useUserAuth ? getUserToken() : getAdminToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const url = `${CF_WORKER_URL}/api${path}`;
  const res = await fetch(url, { ...options, headers });

  if (!res.ok) {
    let message = res.statusText;
    try {
      const data = await res.json();
      message = (data as { error?: string }).error || message;
    } catch {}
    throw new Error(message);
  }

  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}

// ── Public movie API ───────────────────────────────────────────────
export interface Movie {
  id: number;
  title: string;
  description?: string;
  posterUrl?: string;
  bannerUrl?: string;
  trailerUrl?: string;
  videoUrl?: string;
  genre?: string;
  year?: number;
  rating?: number;
  duration?: number;
  contentType?: "movie" | "series";
  featured?: boolean;
  views?: number;
}

export interface MoviesResponse {
  success: boolean;
  movies: Movie[];
}

export interface MovieResponse {
  success: boolean;
  movie: Movie;
}

export async function fetchMovies(params?: Record<string, string>): Promise<Movie[]> {
  const qs = params ? "?" + new URLSearchParams(params).toString() : "";
  const res = await apiFetch<MoviesResponse>(`/movies${qs}`);
  return res.movies || [];
}

export async function fetchFeatured(): Promise<Movie[]> {
  const res = await apiFetch<MoviesResponse>("/movies/featured");
  return res.movies || [];
}

export async function fetchTrending(): Promise<Movie[]> {
  const res = await apiFetch<MoviesResponse>("/movies/trending");
  return res.movies || [];
}

export async function fetchNewReleases(): Promise<Movie[]> {
  const res = await apiFetch<MoviesResponse>("/movies/new-releases");
  return res.movies || [];
}

export async function fetchTopRated(): Promise<Movie[]> {
  const res = await apiFetch<MoviesResponse>("/movies/top-rated");
  return res.movies || [];
}

export async function fetchMovie(id: number): Promise<Movie> {
  const res = await apiFetch<MovieResponse>(`/movies/${id}`);
  return res.movie;
}

// ── Reviews ────────────────────────────────────────────────────────
export interface Review {
  id: number;
  movieId: number;
  userId?: number;
  userName?: string;
  rating: number;
  comment?: string;
  createdAt?: string;
}

export async function fetchReviews(movieId: number): Promise<Review[]> {
  const res = await apiFetch<{ success: boolean; reviews: Review[] }>(`/reviews/${movieId}`);
  return res.reviews || [];
}

export async function postReview(
  movieId: number,
  rating: number,
  comment: string
): Promise<void> {
  await apiFetch(`/reviews/${movieId}`, {
    method: "POST",
    body: JSON.stringify({ rating, comment }),
  }, true);
}

// ── Watchlist ──────────────────────────────────────────────────────
export async function fetchWatchlist(): Promise<Movie[]> {
  const res = await apiFetch<{ success: boolean; watchlist: { movie: Movie }[] }>("/watchlist", {}, true);
  return (res.watchlist || []).map((w) => w.movie);
}

export async function addToWatchlist(movieId: number): Promise<void> {
  await apiFetch("/watchlist", {
    method: "POST",
    body: JSON.stringify({ movieId }),
  }, true);
}

export async function removeFromWatchlist(movieId: number): Promise<void> {
  await apiFetch(`/watchlist/${movieId}`, { method: "DELETE" }, true);
}
