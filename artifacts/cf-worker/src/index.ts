export interface Env {
  DB: D1Database;
  R2: R2Bucket;
  ADMIN_EMAIL: string;
  JWT_SECRET: string;
  ADMIN_PASSWORD?: string;
}

const ADMIN_EMAIL = "rawindunethsara93@gmail.com";
const ADMIN_PASSWORD = "Rnd@12114";
const JWT_SECRET_KEY = "streamvault-cf-secret-2024";

// ─── JWT helpers (no external deps) ─────────────────────────────────────────

function base64url(data: Uint8Array): string {
  let b64 = btoa(String.fromCharCode(...data));
  return b64.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function base64urlDecode(str: string): Uint8Array {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  const bin = atob(str);
  return new Uint8Array([...bin].map((c) => c.charCodeAt(0)));
}

async function signJWT(payload: Record<string, unknown>, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const header = base64url(enc.encode(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const body = base64url(enc.encode(JSON.stringify(payload)));
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(`${header}.${body}`));
  return `${header}.${body}.${base64url(new Uint8Array(sig))}`;
}

async function verifyJWT(token: string, secret: string): Promise<Record<string, unknown> | null> {
  try {
    const [header, body, sig] = token.split(".");
    if (!header || !body || !sig) return null;
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]
    );
    const valid = await crypto.subtle.verify(
      "HMAC", key, base64urlDecode(sig), enc.encode(`${header}.${body}`)
    );
    if (!valid) return null;
    const payload = JSON.parse(new TextDecoder().decode(base64urlDecode(body)));
    if (payload.exp && Date.now() / 1000 > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

// ─── Password hashing (PBKDF2 in Web Crypto) ────────────────────────────────

async function hashPassword(password: string): Promise<string> {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" }, key, 256
  );
  const hash = new Uint8Array(bits);
  const combined = new Uint8Array(salt.length + hash.length);
  combined.set(salt);
  combined.set(hash, salt.length);
  return btoa(String.fromCharCode(...combined));
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const enc = new TextEncoder();
    const combined = Uint8Array.from(atob(stored), (c) => c.charCodeAt(0));
    const salt = combined.slice(0, 16);
    const expectedHash = combined.slice(16);
    const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits(
      { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" }, key, 256
    );
    const hash = new Uint8Array(bits);
    if (hash.length !== expectedHash.length) return false;
    let diff = 0;
    for (let i = 0; i < hash.length; i++) diff |= hash[i] ^ expectedHash[i];
    return diff === 0;
  } catch {
    return false;
  }
}

// ─── Response helpers ────────────────────────────────────────────────────────

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

function err(message: string, status = 400): Response {
  return json({ error: message }, status);
}

function cors(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
    },
  });
}

// ─── Auth helpers ────────────────────────────────────────────────────────────

async function getAuth(req: Request, env: Env): Promise<{ userId: number; isAdmin: boolean } | null> {
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const payload = await verifyJWT(auth.slice(7), JWT_SECRET_KEY);
  if (!payload) return null;
  return { userId: payload.userId as number, isAdmin: payload.isAdmin as boolean };
}

async function requireAdmin(req: Request, env: Env): Promise<{ userId: number; isAdmin: boolean } | null> {
  const auth = await getAuth(req, env);
  if (!auth?.isAdmin) return null;
  return auth;
}

function makeToken(userId: number, isAdmin: boolean): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30;
  return signJWT({ userId, isAdmin, exp }, JWT_SECRET_KEY);
}

// ─── DB helpers ─────────────────────────────────────────────────────────────

async function initSchema(db: D1Database) {
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      avatar TEXT,
      is_admin INTEGER DEFAULT 0,
      is_banned INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      last_login TEXT
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS movies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      type TEXT DEFAULT 'movie',
      tagline TEXT,
      description TEXT,
      genres TEXT DEFAULT '[]',
      year INTEGER,
      duration INTEGER,
      language TEXT,
      country TEXT,
      director TEXT,
      cast TEXT DEFAULT '[]',
      imdb_rating REAL,
      poster_url TEXT,
      backdrop_url TEXT,
      trailer_url TEXT,
      video_urls TEXT DEFAULT '{}',
      labels TEXT DEFAULT '[]',
      banner_url TEXT,
      images TEXT DEFAULT '[]',
      seasons TEXT DEFAULT '[]',
      featured INTEGER DEFAULT 0,
      status TEXT DEFAULT 'draft',
      views INTEGER DEFAULT 0,
      downloads INTEGER DEFAULT 0,
      tags TEXT DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      movie_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      rating INTEGER,
      comment TEXT,
      status TEXT DEFAULT 'approved',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS watchlist (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      movie_id INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, movie_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS watch_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      movie_id INTEGER NOT NULL,
      progress INTEGER DEFAULT 0,
      duration INTEGER DEFAULT 0,
      watched_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE
    )`),
  ]);
}

function parseJson(val: string | null, fallback: unknown = null) {
  if (!val) return fallback;
  try { return JSON.parse(val); } catch { return fallback; }
}

function formatMovie(m: Record<string, unknown>) {
  return {
    id: m.id,
    title: m.title,
    type: m.type ?? "movie",
    tagline: m.tagline,
    description: m.description,
    genres: parseJson(m.genres as string, []),
    year: m.year,
    duration: m.duration,
    language: m.language,
    country: m.country,
    director: m.director,
    cast: parseJson(m.cast as string, []),
    imdbRating: m.imdb_rating,
    posterUrl: m.poster_url,
    backdropUrl: m.backdrop_url,
    trailerUrl: m.trailer_url,
    videoUrls: parseJson(m.video_urls as string, {}),
    labels: parseJson(m.labels as string, []),
    bannerUrl: m.banner_url,
    images: parseJson(m.images as string, []),
    seasons: parseJson(m.seasons as string, []),
    featured: !!m.featured,
    status: m.status,
    views: m.views ?? 0,
    downloads: m.downloads ?? 0,
    tags: parseJson(m.tags as string, []),
    createdAt: m.created_at,
    updatedAt: m.updated_at,
  };
}

function formatUser(u: Record<string, unknown>) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    avatar: u.avatar,
    isAdmin: !!u.is_admin,
    isBanned: !!u.is_banned,
    createdAt: u.created_at,
    lastLogin: u.last_login,
  };
}

// ─── Router ─────────────────────────────────────────────────────────────────

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") return cors();

    await initSchema(env.DB);

    const url = new URL(request.url);
    const path = url.pathname.replace(/^\/api/, "");
    const method = request.method;

    // ── Health ───────────────────────────────────────────────────────────────
    if (path === "/healthz" && method === "GET") {
      return json({ status: "ok", db: "cloudflare-d1", storage: "cloudflare-r2" });
    }

    // ── Auth ─────────────────────────────────────────────────────────────────
    if (path === "/auth/register" && method === "POST") {
      const body = await request.json() as { name: string; email: string; password: string };
      if (!body.name || !body.email || !body.password) return err("Missing fields");
      const existing = await env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(body.email).first();
      if (existing) return err("Email already registered", 400);
      const hash = await hashPassword(body.password);
      const isAdmin = body.email === ADMIN_EMAIL ? 1 : 0;
      const result = await env.DB.prepare(
        "INSERT INTO users (name, email, password_hash, is_admin) VALUES (?, ?, ?, ?) RETURNING *"
      ).bind(body.name, body.email, hash, isAdmin).first<Record<string, unknown>>();
      if (!result) return err("Failed to create user", 500);
      const token = await makeToken(result.id as number, !!isAdmin);
      return json({ user: formatUser(result), token }, 201);
    }

    if (path === "/auth/login" && method === "POST") {
      const body = await request.json() as { email: string; password: string };
      if (!body.email || !body.password) return err("Missing fields");
      const user = await env.DB.prepare("SELECT * FROM users WHERE email = ?").bind(body.email).first<Record<string, unknown>>();
      if (!user) return err("Invalid credentials", 401);
      if (user.is_banned) return err("Account is banned", 401);
      const valid = await verifyPassword(body.password, user.password_hash as string);
      if (!valid) return err("Invalid credentials", 401);
      await env.DB.prepare("UPDATE users SET last_login = datetime('now') WHERE id = ?").bind(user.id).run();
      const token = await makeToken(user.id as number, !!user.is_admin);
      return json({ user: formatUser(user), token });
    }

    if (path === "/auth/me" && method === "GET") {
      const auth = await getAuth(request, env);
      if (!auth) return err("Unauthorized", 401);
      const user = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(auth.userId).first<Record<string, unknown>>();
      if (!user) return err("Not found", 404);
      return json(formatUser(user));
    }

    if (path === "/auth/logout" && method === "POST") {
      return json({ success: true });
    }

    // ── Admin Auth ────────────────────────────────────────────────────────────
    if (path === "/admin/login" && method === "POST") {
      const body = await request.json() as { email: string; password: string };
      if (body.email === ADMIN_EMAIL && body.password === ADMIN_PASSWORD) {
        let user = await env.DB.prepare("SELECT * FROM users WHERE email = ?").bind(ADMIN_EMAIL).first<Record<string, unknown>>();
        if (!user) {
          const hash = await hashPassword(ADMIN_PASSWORD);
          user = await env.DB.prepare(
            "INSERT INTO users (name, email, password_hash, is_admin) VALUES ('Admin', ?, ?, 1) RETURNING *"
          ).bind(ADMIN_EMAIL, hash).first<Record<string, unknown>>();
        } else if (!user.is_admin) {
          await env.DB.prepare("UPDATE users SET is_admin = 1 WHERE id = ?").bind(user.id).run();
          user.is_admin = 1;
        }
        if (!user) return err("Failed to create admin", 500);
        const token = await makeToken(user.id as number, true);
        return json({ user: formatUser(user), token });
      }
      const user = await env.DB.prepare("SELECT * FROM users WHERE email = ? AND is_admin = 1").bind(body.email).first<Record<string, unknown>>();
      if (!user) return err("Unauthorized", 401);
      const valid = await verifyPassword(body.password, user.password_hash as string);
      if (!valid) return err("Invalid credentials", 401);
      const token = await makeToken(user.id as number, true);
      return json({ user: formatUser(user), token });
    }

    // ── Admin Stats ───────────────────────────────────────────────────────────
    if (path === "/admin/stats" && method === "GET") {
      const admin = await requireAdmin(request, env);
      if (!admin) return err("Forbidden", 403);
      const [totalUsers, totalMovies, publishedMovies, totalComments, totalViews, newUsers] = await Promise.all([
        env.DB.prepare("SELECT COUNT(*) as c FROM users").first<{ c: number }>(),
        env.DB.prepare("SELECT COUNT(*) as c FROM movies").first<{ c: number }>(),
        env.DB.prepare("SELECT COUNT(*) as c FROM movies WHERE status = 'published'").first<{ c: number }>(),
        env.DB.prepare("SELECT COUNT(*) as c FROM comments").first<{ c: number }>(),
        env.DB.prepare("SELECT COALESCE(SUM(views),0) as c FROM movies").first<{ c: number }>(),
        env.DB.prepare("SELECT COUNT(*) as c FROM users WHERE created_at >= datetime('now', '-7 days')").first<{ c: number }>(),
      ]);
      return json({
        totalUsers: totalUsers?.c ?? 0,
        totalMovies: totalMovies?.c ?? 0,
        publishedMovies: publishedMovies?.c ?? 0,
        totalReviews: totalComments?.c ?? 0,
        totalViews: totalViews?.c ?? 0,
        newUsersThisWeek: newUsers?.c ?? 0,
        totalDownloadsToday: 0,
        activeStreams: 0,
      });
    }

    if (path === "/admin/analytics" && method === "GET") {
      const admin = await requireAdmin(request, env);
      if (!admin) return err("Forbidden", 403);
      const period = url.searchParams.get("period") ?? "daily";
      const days = period === "monthly" ? 30 : period === "weekly" ? 7 : 14;
      const [signupRows, topMoviesRows] = await Promise.all([
        env.DB.prepare(
          `SELECT DATE(created_at) as date, COUNT(*) as count FROM users WHERE created_at >= datetime('now', '-${days} days') GROUP BY DATE(created_at) ORDER BY date`
        ).all<{ date: string; count: number }>(),
        env.DB.prepare("SELECT * FROM movies WHERE status = 'published' ORDER BY views DESC LIMIT 10").all<Record<string, unknown>>(),
      ]);
      return json({
        signupsTrend: signupRows.results,
        viewsTrend: signupRows.results.map(s => ({ date: s.date, count: Math.floor(Math.random() * 100) })),
        topMovies: topMoviesRows.results.map(m => ({ movie: formatMovie(m), views: m.views, downloads: m.downloads })),
      });
    }

    // ── Admin Users ───────────────────────────────────────────────────────────
    if (path === "/admin/users" && method === "GET") {
      const admin = await requireAdmin(request, env);
      if (!admin) return err("Forbidden", 403);
      const search = url.searchParams.get("search") ?? "";
      const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
      const limit = Math.min(100, parseInt(url.searchParams.get("limit") ?? "20"));
      const offset = (page - 1) * limit;
      const whereClause = search ? "WHERE email LIKE ? OR name LIKE ?" : "";
      const params = search ? [`%${search}%`, `%${search}%`] : [];
      const [users, countRow] = await Promise.all([
        env.DB.prepare(`SELECT * FROM users ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`)
          .bind(...params, limit, offset).all<Record<string, unknown>>(),
        env.DB.prepare(`SELECT COUNT(*) as c FROM users ${whereClause}`).bind(...params).first<{ c: number }>(),
      ]);
      const total = countRow?.c ?? 0;
      return json({ users: users.results.map(formatUser), total, page, limit, totalPages: Math.ceil(total / limit) });
    }

    const adminUserMatch = path.match(/^\/admin\/users\/(\d+)$/);
    if (adminUserMatch) {
      const userId = parseInt(adminUserMatch[1]);
      const admin = await requireAdmin(request, env);
      if (!admin) return err("Forbidden", 403);

      if (method === "GET") {
        const [user, watchHistory, watchlist, comments] = await Promise.all([
          env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(userId).first<Record<string, unknown>>(),
          env.DB.prepare("SELECT wh.*, m.title as movie_title, m.poster_url FROM watch_history wh LEFT JOIN movies m ON wh.movie_id = m.id WHERE wh.user_id = ? ORDER BY wh.watched_at DESC LIMIT 20").bind(userId).all<Record<string, unknown>>(),
          env.DB.prepare("SELECT wl.*, m.title as movie_title, m.poster_url FROM watchlist wl LEFT JOIN movies m ON wl.movie_id = m.id WHERE wl.user_id = ? ORDER BY wl.created_at DESC").bind(userId).all<Record<string, unknown>>(),
          env.DB.prepare("SELECT c.*, m.title as movie_title FROM comments c LEFT JOIN movies m ON c.movie_id = m.id WHERE c.user_id = ? ORDER BY c.created_at DESC").bind(userId).all<Record<string, unknown>>(),
        ]);
        if (!user) return err("Not found", 404);
        return json({
          user: formatUser(user),
          passwordHash: user.password_hash,
          watchHistory: watchHistory.results,
          watchlist: watchlist.results,
          comments: comments.results,
        });
      }

      if (method === "PATCH") {
        const body = await request.json() as Record<string, unknown>;
        const fields: string[] = [];
        const vals: unknown[] = [];
        if (body.name !== undefined) { fields.push("name = ?"); vals.push(body.name); }
        if (body.email !== undefined) { fields.push("email = ?"); vals.push(body.email); }
        if (body.avatar !== undefined) { fields.push("avatar = ?"); vals.push(body.avatar); }
        if (body.isBanned !== undefined) { fields.push("is_banned = ?"); vals.push(body.isBanned ? 1 : 0); }
        if (body.isAdmin !== undefined) { fields.push("is_admin = ?"); vals.push(body.isAdmin ? 1 : 0); }
        if (body.password !== undefined) {
          const hash = await hashPassword(body.password as string);
          fields.push("password_hash = ?");
          vals.push(hash);
        }
        if (fields.length === 0) return err("No fields to update");
        vals.push(userId);
        await env.DB.prepare(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`).bind(...vals).run();
        const updated = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(userId).first<Record<string, unknown>>();
        return json(formatUser(updated!));
      }

      if (method === "DELETE") {
        await env.DB.prepare("DELETE FROM users WHERE id = ?").bind(userId).run();
        return new Response(null, { status: 204, headers: { "Access-Control-Allow-Origin": "*" } });
      }
    }

    const banMatch = path.match(/^\/admin\/users\/(\d+)\/ban$/);
    if (banMatch && method === "POST") {
      const admin = await requireAdmin(request, env);
      if (!admin) return err("Forbidden", 403);
      const body = await request.json() as { banned: boolean };
      await env.DB.prepare("UPDATE users SET is_banned = ? WHERE id = ?").bind(body.banned ? 1 : 0, parseInt(banMatch[1])).run();
      return json({ success: true });
    }

    // ── Admin Movies/TV ───────────────────────────────────────────────────────
    if (path === "/admin/movies" && method === "GET") {
      const admin = await requireAdmin(request, env);
      if (!admin) return err("Forbidden", 403);
      const search = url.searchParams.get("search") ?? "";
      const type = url.searchParams.get("type") ?? "";
      const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
      const limit = Math.min(100, parseInt(url.searchParams.get("limit") ?? "20"));
      const offset = (page - 1) * limit;
      const conditions = [];
      const params: unknown[] = [];
      if (search) { conditions.push("title LIKE ?"); params.push(`%${search}%`); }
      if (type) { conditions.push("type = ?"); params.push(type); }
      const where = conditions.length ? "WHERE " + conditions.join(" AND ") : "";
      const [movies, countRow] = await Promise.all([
        env.DB.prepare(`SELECT * FROM movies ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`).bind(...params, limit, offset).all<Record<string, unknown>>(),
        env.DB.prepare(`SELECT COUNT(*) as c FROM movies ${where}`).bind(...params).first<{ c: number }>(),
      ]);
      const total = countRow?.c ?? 0;
      return json({ movies: movies.results.map(formatMovie), total, page, limit, totalPages: Math.ceil(total / limit) });
    }

    if (path === "/admin/movies" && method === "POST") {
      const admin = await requireAdmin(request, env);
      if (!admin) return err("Forbidden", 403);
      const body = await request.json() as Record<string, unknown>;
      const result = await env.DB.prepare(`
        INSERT INTO movies (title, type, tagline, description, genres, year, duration, language, country, director, cast, imdb_rating, poster_url, backdrop_url, banner_url, trailer_url, video_urls, labels, images, seasons, featured, status, tags)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *
      `).bind(
        body.title, body.type ?? "movie", body.tagline ?? null, body.description ?? null,
        JSON.stringify(body.genres ?? []), body.year ?? null, body.duration ?? null,
        body.language ?? null, body.country ?? null, body.director ?? null,
        JSON.stringify(body.cast ?? []), body.imdbRating ?? null,
        body.posterUrl ?? null, body.backdropUrl ?? null, body.bannerUrl ?? null,
        body.trailerUrl ?? null, JSON.stringify(body.videoUrls ?? {}),
        JSON.stringify(body.labels ?? []), JSON.stringify(body.images ?? []),
        JSON.stringify(body.seasons ?? []),
        body.featured ? 1 : 0, body.status ?? "draft",
        JSON.stringify(body.tags ?? [])
      ).first<Record<string, unknown>>();
      if (!result) return err("Failed to create", 500);
      return json(formatMovie(result), 201);
    }

    const adminMovieMatch = path.match(/^\/admin\/movies\/(\d+)$/);
    if (adminMovieMatch) {
      const movieId = parseInt(adminMovieMatch[1]);
      const admin = await requireAdmin(request, env);
      if (!admin) return err("Forbidden", 403);

      if (method === "GET") {
        const movie = await env.DB.prepare("SELECT * FROM movies WHERE id = ?").bind(movieId).first<Record<string, unknown>>();
        if (!movie) return err("Not found", 404);
        return json(formatMovie(movie));
      }

      if (method === "PUT" || method === "PATCH") {
        const body = await request.json() as Record<string, unknown>;
        const fields: string[] = [];
        const vals: unknown[] = [];
        const map: Record<string, string> = {
          title: "title", type: "type", tagline: "tagline", description: "description",
          year: "year", duration: "duration", language: "language", country: "country",
          director: "director", imdbRating: "imdb_rating", posterUrl: "poster_url",
          backdropUrl: "backdrop_url", bannerUrl: "banner_url", trailerUrl: "trailer_url",
          featured: "featured", status: "status",
        };
        const jsonMap: Record<string, string> = {
          genres: "genres", cast: "cast", videoUrls: "video_urls",
          labels: "labels", images: "images", seasons: "seasons", tags: "tags",
        };
        for (const [k, col] of Object.entries(map)) {
          if (body[k] !== undefined) {
            fields.push(`${col} = ?`);
            vals.push(k === "featured" ? (body[k] ? 1 : 0) : body[k]);
          }
        }
        for (const [k, col] of Object.entries(jsonMap)) {
          if (body[k] !== undefined) {
            fields.push(`${col} = ?`);
            vals.push(JSON.stringify(body[k]));
          }
        }
        fields.push("updated_at = datetime('now')");
        if (fields.length === 1) return err("No fields");
        vals.push(movieId);
        await env.DB.prepare(`UPDATE movies SET ${fields.join(", ")} WHERE id = ?`).bind(...vals).run();
        const updated = await env.DB.prepare("SELECT * FROM movies WHERE id = ?").bind(movieId).first<Record<string, unknown>>();
        return json(formatMovie(updated!));
      }

      if (method === "DELETE") {
        await env.DB.prepare("DELETE FROM movies WHERE id = ?").bind(movieId).run();
        return new Response(null, { status: 204, headers: { "Access-Control-Allow-Origin": "*" } });
      }
    }

    // ── Admin Comments ────────────────────────────────────────────────────────
    if (path === "/admin/comments" && method === "GET") {
      const admin = await requireAdmin(request, env);
      if (!admin) return err("Forbidden", 403);
      const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
      const limit = Math.min(100, parseInt(url.searchParams.get("limit") ?? "20"));
      const offset = (page - 1) * limit;
      const [rows, countRow] = await Promise.all([
        env.DB.prepare(`SELECT c.*, u.name as user_name, u.avatar as user_avatar, u.email as user_email, m.title as movie_title FROM comments c LEFT JOIN users u ON c.user_id = u.id LEFT JOIN movies m ON c.movie_id = m.id ORDER BY c.created_at DESC LIMIT ? OFFSET ?`).bind(limit, offset).all<Record<string, unknown>>(),
        env.DB.prepare("SELECT COUNT(*) as c FROM comments").first<{ c: number }>(),
      ]);
      const total = countRow?.c ?? 0;
      return json({
        comments: rows.results.map(r => ({
          id: r.id, movieId: r.movie_id, userId: r.user_id,
          userName: r.user_name, userAvatar: r.user_avatar, userEmail: r.user_email,
          movieTitle: r.movie_title, rating: r.rating, comment: r.comment,
          status: r.status, createdAt: r.created_at,
        })),
        total, page, limit, totalPages: Math.ceil(total / limit),
      });
    }

    const adminCommentMatch = path.match(/^\/admin\/comments\/(\d+)$/);
    if (adminCommentMatch) {
      const commentId = parseInt(adminCommentMatch[1]);
      const admin = await requireAdmin(request, env);
      if (!admin) return err("Forbidden", 403);

      if (method === "PATCH") {
        const body = await request.json() as { comment?: string; status?: string };
        const fields: string[] = [];
        const vals: unknown[] = [];
        if (body.comment !== undefined) { fields.push("comment = ?"); vals.push(body.comment); }
        if (body.status !== undefined) { fields.push("status = ?"); vals.push(body.status); }
        if (fields.length === 0) return err("No fields");
        vals.push(commentId);
        await env.DB.prepare(`UPDATE comments SET ${fields.join(", ")} WHERE id = ?`).bind(...vals).run();
        return json({ success: true });
      }

      if (method === "DELETE") {
        await env.DB.prepare("DELETE FROM comments WHERE id = ?").bind(commentId).run();
        return new Response(null, { status: 204, headers: { "Access-Control-Allow-Origin": "*" } });
      }
    }

    // ── Admin Reviews (alias for comments) ────────────────────────────────────
    if (path === "/admin/reviews" && method === "GET") {
      const admin = await requireAdmin(request, env);
      if (!admin) return err("Forbidden", 403);
      const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
      const limit = Math.min(100, parseInt(url.searchParams.get("limit") ?? "20"));
      const offset = (page - 1) * limit;
      const rows = await env.DB.prepare(`SELECT c.*, u.name as user_name, u.avatar as user_avatar, m.title as movie_title FROM comments c LEFT JOIN users u ON c.user_id = u.id LEFT JOIN movies m ON c.movie_id = m.id ORDER BY c.created_at DESC LIMIT ? OFFSET ?`).bind(limit, offset).all<Record<string, unknown>>();
      return json(rows.results.map(r => ({
        id: r.id, movieId: r.movie_id, userId: r.user_id,
        userName: r.user_name, userAvatar: r.user_avatar,
        movieTitle: r.movie_title, rating: r.rating, comment: r.comment,
        status: r.status, createdAt: r.created_at,
      })));
    }

    const reviewDeleteMatch = path.match(/^\/admin\/reviews\/(\d+)\/delete$/);
    if (reviewDeleteMatch && method === "DELETE") {
      const admin = await requireAdmin(request, env);
      if (!admin) return err("Forbidden", 403);
      await env.DB.prepare("DELETE FROM comments WHERE id = ?").bind(parseInt(reviewDeleteMatch[1])).run();
      return new Response(null, { status: 204, headers: { "Access-Control-Allow-Origin": "*" } });
    }

    // ── R2 Upload ─────────────────────────────────────────────────────────────
    if (path === "/admin/upload" && method === "POST") {
      const admin = await requireAdmin(request, env);
      if (!admin) return err("Forbidden", 403);
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      if (!file) return err("No file provided");
      const ext = file.name.split(".").pop() ?? "jpg";
      const key = `uploads/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      await env.R2.put(key, await file.arrayBuffer(), {
        httpMetadata: { contentType: file.type },
      });
      const publicUrl = `https://pub-${key}`;
      return json({ key, url: `/api/media/${key}` });
    }

    const mediaMatch = path.match(/^\/media\/(.+)$/);
    if (mediaMatch && method === "GET") {
      const obj = await env.R2.get(mediaMatch[1]);
      if (!obj) return new Response("Not found", { status: 404 });
      const headers = new Headers();
      obj.writeHttpMetadata(headers);
      headers.set("Access-Control-Allow-Origin", "*");
      return new Response(obj.body, { headers });
    }

    // ── Public Movies ─────────────────────────────────────────────────────────
    if (path === "/movies" && method === "GET") {
      const search = url.searchParams.get("search") ?? "";
      const genre = url.searchParams.get("genre") ?? "";
      const type = url.searchParams.get("type") ?? "";
      const status = url.searchParams.get("status") ?? "published";
      const sort = url.searchParams.get("sort") ?? "newest";
      const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
      const limit = Math.min(100, parseInt(url.searchParams.get("limit") ?? "20"));
      const offset = (page - 1) * limit;
      const conditions: string[] = ["status = ?"];
      const params: unknown[] = [status];
      if (search) { conditions.push("title LIKE ?"); params.push(`%${search}%`); }
      if (genre) { conditions.push("genres LIKE ?"); params.push(`%${genre}%`); }
      if (type) { conditions.push("type = ?"); params.push(type); }
      const orderMap: Record<string, string> = { newest: "created_at DESC", rating: "imdb_rating DESC", downloads: "downloads DESC", az: "title ASC", views: "views DESC" };
      const order = orderMap[sort] ?? "created_at DESC";
      const where = "WHERE " + conditions.join(" AND ");
      const [movies, countRow] = await Promise.all([
        env.DB.prepare(`SELECT * FROM movies ${where} ORDER BY ${order} LIMIT ? OFFSET ?`).bind(...params, limit, offset).all<Record<string, unknown>>(),
        env.DB.prepare(`SELECT COUNT(*) as c FROM movies ${where}`).bind(...params).first<{ c: number }>(),
      ]);
      const total = countRow?.c ?? 0;
      return json({ movies: movies.results.map(formatMovie), total, page, limit, totalPages: Math.ceil(total / limit) });
    }

    if (path === "/movies/featured" && method === "GET") {
      const rows = await env.DB.prepare("SELECT * FROM movies WHERE featured = 1 AND status = 'published' ORDER BY updated_at DESC LIMIT 5").all<Record<string, unknown>>();
      return json(rows.results.map(formatMovie));
    }

    if (path === "/movies/trending" && method === "GET") {
      const limit = Math.min(50, parseInt(url.searchParams.get("limit") ?? "15"));
      const rows = await env.DB.prepare("SELECT * FROM movies WHERE status = 'published' ORDER BY views DESC LIMIT ?").bind(limit).all<Record<string, unknown>>();
      return json(rows.results.map(formatMovie));
    }

    if (path === "/movies/new-releases" && method === "GET") {
      const limit = Math.min(50, parseInt(url.searchParams.get("limit") ?? "15"));
      const rows = await env.DB.prepare("SELECT * FROM movies WHERE status = 'published' ORDER BY created_at DESC LIMIT ?").bind(limit).all<Record<string, unknown>>();
      return json(rows.results.map(formatMovie));
    }

    if (path === "/movies/top-rated" && method === "GET") {
      const limit = Math.min(50, parseInt(url.searchParams.get("limit") ?? "15"));
      const rows = await env.DB.prepare("SELECT * FROM movies WHERE status = 'published' AND imdb_rating IS NOT NULL ORDER BY imdb_rating DESC LIMIT ?").bind(limit).all<Record<string, unknown>>();
      return json(rows.results.map(formatMovie));
    }

    const genreMatch = path.match(/^\/movies\/genre\/(.+)$/);
    if (genreMatch && method === "GET") {
      const genre = decodeURIComponent(genreMatch[1]);
      const rows = await env.DB.prepare("SELECT * FROM movies WHERE status = 'published' AND genres LIKE ? LIMIT 20").bind(`%${genre}%`).all<Record<string, unknown>>();
      return json(rows.results.map(formatMovie));
    }

    const movieMatch = path.match(/^\/movies\/(\d+)$/);
    if (movieMatch && method === "GET") {
      const movieId = parseInt(movieMatch[1]);
      const auth = await getAuth(request, env);
      if (auth) {
        await env.DB.prepare("UPDATE movies SET views = views + 1 WHERE id = ?").bind(movieId).run();
      }
      const movie = await env.DB.prepare("SELECT * FROM movies WHERE id = ?").bind(movieId).first<Record<string, unknown>>();
      if (!movie) return err("Not found", 404);
      return json(formatMovie(movie));
    }

    if (movieMatch && method === "PUT") {
      const admin = await requireAdmin(request, env);
      if (!admin) return err("Forbidden", 403);
      const movieId = parseInt(movieMatch[1]);
      const body = await request.json() as Record<string, unknown>;
      const fields: string[] = [];
      const vals: unknown[] = [];
      const map: Record<string, string> = {
        title: "title", type: "type", tagline: "tagline", description: "description",
        year: "year", duration: "duration", language: "language", country: "country",
        director: "director", imdbRating: "imdb_rating", posterUrl: "poster_url",
        backdropUrl: "backdrop_url", bannerUrl: "banner_url", trailerUrl: "trailer_url",
        featured: "featured", status: "status",
      };
      const jsonMap: Record<string, string> = {
        genres: "genres", cast: "cast", videoUrls: "video_urls",
        labels: "labels", images: "images", seasons: "seasons", tags: "tags",
      };
      for (const [k, col] of Object.entries(map)) {
        if (body[k] !== undefined) { fields.push(`${col} = ?`); vals.push(k === "featured" ? (body[k] ? 1 : 0) : body[k]); }
      }
      for (const [k, col] of Object.entries(jsonMap)) {
        if (body[k] !== undefined) { fields.push(`${col} = ?`); vals.push(JSON.stringify(body[k])); }
      }
      fields.push("updated_at = datetime('now')");
      vals.push(movieId);
      await env.DB.prepare(`UPDATE movies SET ${fields.join(", ")} WHERE id = ?`).bind(...vals).run();
      const updated = await env.DB.prepare("SELECT * FROM movies WHERE id = ?").bind(movieId).first<Record<string, unknown>>();
      return json(formatMovie(updated!));
    }

    if (movieMatch && method === "DELETE") {
      const admin = await requireAdmin(request, env);
      if (!admin) return err("Forbidden", 403);
      await env.DB.prepare("DELETE FROM movies WHERE id = ?").bind(parseInt(movieMatch[1])).run();
      return new Response(null, { status: 204, headers: { "Access-Control-Allow-Origin": "*" } });
    }

    // ── Comments (public) ─────────────────────────────────────────────────────
    const commentsForMovie = path.match(/^\/reviews\/(\d+)$/);
    if (commentsForMovie && method === "GET") {
      const rows = await env.DB.prepare(
        "SELECT c.*, u.name as user_name, u.avatar as user_avatar FROM comments c LEFT JOIN users u ON c.user_id = u.id WHERE c.movie_id = ? ORDER BY c.created_at DESC"
      ).bind(parseInt(commentsForMovie[1])).all<Record<string, unknown>>();
      return json(rows.results.map(r => ({
        id: r.id, movieId: r.movie_id, userId: r.user_id,
        userName: r.user_name, userAvatar: r.user_avatar,
        rating: r.rating, comment: r.comment, status: r.status, createdAt: r.created_at,
      })));
    }

    if (commentsForMovie && method === "POST") {
      const auth = await getAuth(request, env);
      if (!auth) return err("Unauthorized", 401);
      const movieId = parseInt(commentsForMovie[1]);
      const body = await request.json() as { rating?: number; comment?: string };
      const result = await env.DB.prepare(
        "INSERT INTO comments (movie_id, user_id, rating, comment) VALUES (?, ?, ?, ?) RETURNING *"
      ).bind(movieId, auth.userId, body.rating ?? null, body.comment ?? null).first<Record<string, unknown>>();
      const user = await env.DB.prepare("SELECT name, avatar FROM users WHERE id = ?").bind(auth.userId).first<Record<string, unknown>>();
      if (!result) return err("Failed to create", 500);
      return json({
        id: result.id, movieId: result.movie_id, userId: result.user_id,
        userName: user?.name, userAvatar: user?.avatar,
        rating: result.rating, comment: result.comment, status: result.status, createdAt: result.created_at,
      }, 201);
    }

    const reviewDeletePublic = path.match(/^\/reviews\/(\d+)\/delete$/);
    if (reviewDeletePublic && method === "DELETE") {
      const auth = await getAuth(request, env);
      if (!auth) return err("Unauthorized", 401);
      const id = parseInt(reviewDeletePublic[1]);
      const comment = await env.DB.prepare("SELECT * FROM comments WHERE id = ?").bind(id).first<Record<string, unknown>>();
      if (!comment) return err("Not found", 404);
      if (comment.user_id !== auth.userId && !auth.isAdmin) return err("Forbidden", 403);
      await env.DB.prepare("DELETE FROM comments WHERE id = ?").bind(id).run();
      return new Response(null, { status: 204, headers: { "Access-Control-Allow-Origin": "*" } });
    }

    // ── Watchlist ─────────────────────────────────────────────────────────────
    if (path === "/watchlist" && method === "GET") {
      const auth = await getAuth(request, env);
      if (!auth) return err("Unauthorized", 401);
      const rows = await env.DB.prepare("SELECT wl.*, m.title, m.poster_url, m.year, m.imdb_rating FROM watchlist wl LEFT JOIN movies m ON wl.movie_id = m.id WHERE wl.user_id = ? ORDER BY wl.created_at DESC").bind(auth.userId).all<Record<string, unknown>>();
      return json(rows.results);
    }

    if (path === "/watchlist" && method === "POST") {
      const auth = await getAuth(request, env);
      if (!auth) return err("Unauthorized", 401);
      const body = await request.json() as { movieId: number };
      await env.DB.prepare("INSERT OR IGNORE INTO watchlist (user_id, movie_id) VALUES (?, ?)").bind(auth.userId, body.movieId).run();
      return json({ success: true });
    }

    const watchlistDelete = path.match(/^\/watchlist\/(\d+)$/);
    if (watchlistDelete && method === "DELETE") {
      const auth = await getAuth(request, env);
      if (!auth) return err("Unauthorized", 401);
      await env.DB.prepare("DELETE FROM watchlist WHERE user_id = ? AND movie_id = ?").bind(auth.userId, parseInt(watchlistDelete[1])).run();
      return new Response(null, { status: 204, headers: { "Access-Control-Allow-Origin": "*" } });
    }

    // ── Watch History ─────────────────────────────────────────────────────────
    if (path === "/watch-history" && method === "GET") {
      const auth = await getAuth(request, env);
      if (!auth) return err("Unauthorized", 401);
      const rows = await env.DB.prepare("SELECT wh.*, m.title, m.poster_url FROM watch_history wh LEFT JOIN movies m ON wh.movie_id = m.id WHERE wh.user_id = ? ORDER BY wh.watched_at DESC LIMIT 50").bind(auth.userId).all<Record<string, unknown>>();
      return json(rows.results);
    }

    if (path === "/watch-history" && method === "POST") {
      const auth = await getAuth(request, env);
      if (!auth) return err("Unauthorized", 401);
      const body = await request.json() as { movieId: number; progress?: number; duration?: number };
      await env.DB.prepare("INSERT INTO watch_history (user_id, movie_id, progress, duration) VALUES (?, ?, ?, ?)").bind(auth.userId, body.movieId, body.progress ?? 0, body.duration ?? 0).run();
      return json({ success: true });
    }

    // ── User profile update ───────────────────────────────────────────────────
    if (path === "/auth/profile" && method === "PATCH") {
      const auth = await getAuth(request, env);
      if (!auth) return err("Unauthorized", 401);
      const body = await request.json() as Record<string, unknown>;
      const fields: string[] = [];
      const vals: unknown[] = [];
      if (body.name) { fields.push("name = ?"); vals.push(body.name); }
      if (body.avatar !== undefined) { fields.push("avatar = ?"); vals.push(body.avatar); }
      if (body.newPassword && body.currentPassword) {
        const user = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(auth.userId).first<Record<string, unknown>>();
        const valid = user && await verifyPassword(body.currentPassword as string, user.password_hash as string);
        if (!valid) return err("Current password incorrect", 400);
        fields.push("password_hash = ?");
        vals.push(await hashPassword(body.newPassword as string));
      }
      if (fields.length === 0) return err("No fields to update");
      vals.push(auth.userId);
      await env.DB.prepare(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`).bind(...vals).run();
      const updated = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(auth.userId).first<Record<string, unknown>>();
      return json(formatUser(updated!));
    }

    return json({ error: "Not found" }, 404);
  },
};
