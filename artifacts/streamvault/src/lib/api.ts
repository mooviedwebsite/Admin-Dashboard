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
  const res = await apiFetch<Movie[]>("/movies/featured");
  return Array.isArray(res) ? res : (res as unknown as MoviesResponse).movies || [];
}

export async function fetchTrending(): Promise<Movie[]> {
  const res = await apiFetch<Movie[]>("/movies/trending");
  return Array.isArray(res) ? res : (res as unknown as MoviesResponse).movies || [];
}

export async function fetchNewReleases(): Promise<Movie[]> {
  const res = await apiFetch<Movie[]>("/movies/new-releases");
  return Array.isArray(res) ? res : (res as unknown as MoviesResponse).movies || [];
}

export async function fetchTopRated(): Promise<Movie[]> {
  const res = await apiFetch<Movie[]>("/movies/top-rated");
  return Array.isArray(res) ? res : (res as unknown as MoviesResponse).movies || [];
}

export async function fetchMovie(id: number): Promise<Movie> {
  const res = await apiFetch<Movie | MovieResponse>(`/movies/${id}`);
  // Worker returns the movie object directly
  if ((res as MovieResponse).movie) return (res as MovieResponse).movie;
  return res as Movie;
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
  const res = await apiFetch<Review[] | { reviews: Review[] }>(`/reviews/${movieId}`);
  if (Array.isArray(res)) return res;
  return (res as { reviews: Review[] }).reviews || [];
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
  // Worker returns flat rows: [{id, user_id, movie_id, title, poster_url, year, imdb_rating, ...}]
  const res = await apiFetch<Array<Record<string, unknown>>>("/watchlist", {}, true);
  const rows = Array.isArray(res) ? res : (res as unknown as { watchlist: Array<Record<string, unknown>> }).watchlist || [];
  return rows.map((w) => {
    // If nested {movie:{}} shape, unwrap it
    if (w.movie) return w.movie as unknown as Movie;
    // Flat row from Worker
    return {
      id: w.movie_id as number,
      title: w.title as string,
      posterUrl: w.poster_url as string | undefined,
      year: w.year as number | undefined,
      rating: w.imdb_rating as number | undefined,
    } as Movie;
  });
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
