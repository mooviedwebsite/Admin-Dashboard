// ============================================================
//  StreamVault / MooviedWeb – Cloudflare Worker API
//  Worker name : admin-moovieds-server
//  Bindings    : DB (D1 → movies-db), R2 (→ movies-storage)
//  Vars        : ADMIN_EMAIL, ADMIN_PASSWORD, JWT_SECRET
// ============================================================

export interface Env {
  DB: D1Database;
  R2: R2Bucket;
  ADMIN_EMAIL: string;
  ADMIN_PASSWORD: string;
  JWT_SECRET: string;
}

// ── CORS ─────────────────────────────────────────────────────────────────────

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

function corsResponse(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

function errResponse(message: string, status = 400): Response {
  return jsonResponse({ error: message }, status);
}

// ── JWT (pure Web Crypto, no external deps) ───────────────────────────────────

function b64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function b64urlDecode(s: string): Uint8Array {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  return Uint8Array.from(atob(s), c => c.charCodeAt(0));
}

async function signJWT(payload: Record<string, unknown>, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const header = b64url(enc.encode(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const body   = b64url(enc.encode(JSON.stringify(payload)));
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(`${header}.${body}`)));
  return `${header}.${body}.${b64url(sig)}`;
}

async function verifyJWT(token: string, secret: string): Promise<Record<string, unknown> | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [header, body, sig] = parts;
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]
    );
    const valid = await crypto.subtle.verify(
      "HMAC", key, b64urlDecode(sig), enc.encode(`${header}.${body}`)
    );
    if (!valid) return null;
    const payload = JSON.parse(new TextDecoder().decode(b64urlDecode(body)));
    if (payload.exp && Date.now() / 1000 > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

async function createToken(userId: number, isAdmin: boolean, secret: string): Promise<string> {
  return signJWT(
    { userId, isAdmin, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30 },
    secret
  );
}

// ── Password (PBKDF2 Web Crypto) ──────────────────────────────────────────────

async function hashPassword(password: string): Promise<string> {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key  = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 100_000, hash: "SHA-256" }, key, 256
  );
  const combined = new Uint8Array(16 + 32);
  combined.set(salt);
  combined.set(new Uint8Array(bits), 16);
  return btoa(String.fromCharCode(...combined));
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const enc      = new TextEncoder();
    const combined = Uint8Array.from(atob(stored), c => c.charCodeAt(0));
    const salt     = combined.slice(0, 16);
    const expected = combined.slice(16);
    const key      = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
    const bits     = await crypto.subtle.deriveBits(
      { name: "PBKDF2", salt, iterations: 100_000, hash: "SHA-256" }, key, 256
    );
    const actual = new Uint8Array(bits);
    if (actual.length !== expected.length) return false;
    let diff = 0;
    for (let i = 0; i < actual.length; i++) diff |= actual[i] ^ expected[i];
    return diff === 0;
  } catch {
    return false;
  }
}

// ── DB schema (runs once per worker instance) ─────────────────────────────────

let schemaReady = false;

async function ensureSchema(db: D1Database): Promise<void> {
  if (schemaReady) return;
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      name          TEXT    NOT NULL,
      email         TEXT    UNIQUE NOT NULL,
      password_hash TEXT    NOT NULL,
      avatar        TEXT,
      is_admin      INTEGER DEFAULT 0,
      is_banned     INTEGER DEFAULT 0,
      created_at    TEXT    DEFAULT (datetime('now')),
      last_login    TEXT
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS movies (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      title        TEXT    NOT NULL,
      type         TEXT    DEFAULT 'movie',
      tagline      TEXT,
      description  TEXT,
      genres       TEXT    DEFAULT '[]',
      year         INTEGER,
      duration     INTEGER,
      language     TEXT,
      country      TEXT,
      director     TEXT,
      cast         TEXT    DEFAULT '[]',
      imdb_rating  REAL,
      poster_url   TEXT,
      backdrop_url TEXT,
      trailer_url  TEXT,
      video_urls   TEXT    DEFAULT '{}',
      labels       TEXT    DEFAULT '[]',
      banner_url   TEXT,
      images       TEXT    DEFAULT '[]',
      seasons      TEXT    DEFAULT '[]',
      featured     INTEGER DEFAULT 0,
      status       TEXT    DEFAULT 'draft',
      views        INTEGER DEFAULT 0,
      downloads    INTEGER DEFAULT 0,
      tags         TEXT    DEFAULT '[]',
      created_at   TEXT    DEFAULT (datetime('now')),
      updated_at   TEXT    DEFAULT (datetime('now'))
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS comments (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      movie_id   INTEGER NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
      user_id    INTEGER NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
      rating     INTEGER,
      comment    TEXT,
      status     TEXT    DEFAULT 'approved',
      created_at TEXT    DEFAULT (datetime('now'))
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS watchlist (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
      movie_id   INTEGER NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
      created_at TEXT    DEFAULT (datetime('now')),
      UNIQUE(user_id, movie_id)
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS watch_history (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
      movie_id   INTEGER NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
      progress   INTEGER DEFAULT 0,
      duration   INTEGER DEFAULT 0,
      watched_at TEXT    DEFAULT (datetime('now'))
    )`),
  ]);
  schemaReady = true;
}

// ── Formatters ────────────────────────────────────────────────────────────────

type Row = Record<string, unknown>;

function parseJ(val: unknown, fallback: unknown = null) {
  if (!val || typeof val !== "string") return fallback;
  try { return JSON.parse(val); } catch { return fallback; }
}

function fmtUser(u: Row) {
  return {
    id:        u.id,
    name:      u.name,
    email:     u.email,
    avatar:    u.avatar ?? null,
    isAdmin:   u.is_admin === 1,
    isBanned:  u.is_banned === 1,
    createdAt: u.created_at,
    lastLogin: u.last_login ?? null,
  };
}

function fmtMovie(m: Row) {
  return {
    id:          m.id,
    title:       m.title,
    type:        m.type ?? "movie",
    tagline:     m.tagline ?? null,
    description: m.description ?? null,
    genres:      parseJ(m.genres, []),
    year:        m.year ?? null,
    duration:    m.duration ?? null,
    language:    m.language ?? null,
    country:     m.country ?? null,
    director:    m.director ?? null,
    cast:        parseJ(m.cast, []),
    imdbRating:  m.imdb_rating ?? null,
    posterUrl:   m.poster_url ?? null,
    backdropUrl: m.backdrop_url ?? null,
    trailerUrl:  m.trailer_url ?? null,
    videoUrls:   parseJ(m.video_urls, {}),
    labels:      parseJ(m.labels, []),
    bannerUrl:   m.banner_url ?? null,
    images:      parseJ(m.images, []),
    seasons:     parseJ(m.seasons, []),
    featured:    m.featured === 1,
    status:      m.status ?? "draft",
    views:       m.views ?? 0,
    downloads:   m.downloads ?? 0,
    tags:        parseJ(m.tags, []),
    createdAt:   m.created_at,
    updatedAt:   m.updated_at,
  };
}

// ── Auth helpers ──────────────────────────────────────────────────────────────

async function getAuthUser(req: Request, env: Env): Promise<{ userId: number; isAdmin: boolean } | null> {
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7).trim();
  if (!token) return null;
  const payload = await verifyJWT(token, env.JWT_SECRET);
  if (!payload) return null;
  return {
    userId:  payload.userId  as number,
    isAdmin: payload.isAdmin as boolean,
  };
}

async function requireAdminAuth(req: Request, env: Env): Promise<{ userId: number; isAdmin: boolean } | null> {
  const auth = await getAuthUser(req, env);
  if (!auth || !auth.isAdmin) return null;
  return auth;
}

// ── Main fetch handler ────────────────────────────────────────────────────────

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {

    // ── Preflight ─────────────────────────────────────────────────────────────
    if (request.method === "OPTIONS") return corsResponse();

    // ── Schema init ───────────────────────────────────────────────────────────
    try {
      await ensureSchema(env.DB);
    } catch (e) {
      return errResponse(`DB init failed: ${(e as Error).message}`, 500);
    }

    const url    = new URL(request.url);
    // Strip leading /api prefix if present, normalise trailing slash
    const path   = url.pathname.replace(/^\/api/, "").replace(/\/+$/, "") || "/";
    const method = request.method.toUpperCase();

    // ── Health check ──────────────────────────────────────────────────────────
    if (path === "/healthz" && method === "GET") {
      return jsonResponse({ status: "ok", db: "d1", storage: "r2", ts: new Date().toISOString() });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  AUTH  – /auth/*
    // ═══════════════════════════════════════════════════════════════════════════

    // POST /auth/register
    if (path === "/auth/register" && method === "POST") {
      let body: { name?: string; email?: string; password?: string };
      try { body = await request.json(); } catch { return errResponse("Invalid JSON"); }

      const { name, email, password } = body;
      if (!name || !email || !password) return errResponse("name, email and password are required");
      if (password.length < 6) return errResponse("Password must be at least 6 characters");

      // Check duplicate
      const existing = await env.DB.prepare("SELECT id FROM users WHERE email = ?")
        .bind(email.toLowerCase().trim()).first<Row>();
      if (existing) return errResponse("Email already registered", 409);

      const hash    = await hashPassword(password);
      const isAdmin = email.toLowerCase().trim() === env.ADMIN_EMAIL.toLowerCase().trim() ? 1 : 0;

      const user = await env.DB
        .prepare("INSERT INTO users (name, email, password_hash, is_admin) VALUES (?, ?, ?, ?) RETURNING *")
        .bind(name.trim(), email.toLowerCase().trim(), hash, isAdmin)
        .first<Row>();

      if (!user) return errResponse("Failed to create account", 500);

      const token = await createToken(user.id as number, isAdmin === 1, env.JWT_SECRET);
      return jsonResponse({ user: fmtUser(user), token }, 201);
    }

    // POST /auth/login  (regular user login)
    if (path === "/auth/login" && method === "POST") {
      let body: { email?: string; password?: string };
      try { body = await request.json(); } catch { return errResponse("Invalid JSON"); }

      const { email, password } = body;
      if (!email || !password) return errResponse("email and password are required");

      const user = await env.DB
        .prepare("SELECT * FROM users WHERE email = ?")
        .bind(email.toLowerCase().trim())
        .first<Row>();

      if (!user) return errResponse("Invalid email or password", 401);
      if (user.is_banned === 1) return errResponse("This account has been banned", 403);

      const valid = await verifyPassword(password, user.password_hash as string);
      if (!valid) return errResponse("Invalid email or password", 401);

      await env.DB.prepare("UPDATE users SET last_login = datetime('now') WHERE id = ?")
        .bind(user.id).run();

      const token = await createToken(user.id as number, user.is_admin === 1, env.JWT_SECRET);
      return jsonResponse({ user: fmtUser(user), token });
    }

    // GET /auth/me
    if (path === "/auth/me" && method === "GET") {
      const auth = await getAuthUser(request, env);
      if (!auth) return errResponse("Unauthorized", 401);

      const user = await env.DB.prepare("SELECT * FROM users WHERE id = ?")
        .bind(auth.userId).first<Row>();
      if (!user) return errResponse("User not found", 404);
      return jsonResponse(fmtUser(user));
    }

    // POST /auth/logout
    if (path === "/auth/logout" && method === "POST") {
      return jsonResponse({ success: true });
    }

    // PATCH /auth/profile
    if (path === "/auth/profile" && method === "PATCH") {
      const auth = await getAuthUser(request, env);
      if (!auth) return errResponse("Unauthorized", 401);

      let body: Record<string, unknown>;
      try { body = await request.json(); } catch { return errResponse("Invalid JSON"); }

      const fields: string[] = [];
      const vals:   unknown[] = [];

      if (body.name)   { fields.push("name = ?");   vals.push((body.name as string).trim()); }
      if (body.avatar !== undefined) { fields.push("avatar = ?"); vals.push(body.avatar); }

      if (body.newPassword && body.currentPassword) {
        const u = await env.DB.prepare("SELECT * FROM users WHERE id = ?")
          .bind(auth.userId).first<Row>();
        const ok = u && await verifyPassword(body.currentPassword as string, u.password_hash as string);
        if (!ok) return errResponse("Current password is incorrect", 400);
        fields.push("password_hash = ?");
        vals.push(await hashPassword(body.newPassword as string));
      }

      if (fields.length === 0) return errResponse("No fields to update");
      vals.push(auth.userId);

      await env.DB.prepare(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`).bind(...vals).run();
      const updated = await env.DB.prepare("SELECT * FROM users WHERE id = ?")
        .bind(auth.userId).first<Row>();
      return jsonResponse(fmtUser(updated!));
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  ADMIN AUTH  – /admin/login
    // ═══════════════════════════════════════════════════════════════════════════

    if (path === "/admin/login" && method === "POST") {
      let body: { email?: string; password?: string };
      try { body = await request.json(); } catch { return errResponse("Invalid JSON"); }

      const { email, password } = body;
      if (!email || !password) return errResponse("email and password are required");

      const normalEmail = email.toLowerCase().trim();
      const adminEmail  = env.ADMIN_EMAIL.toLowerCase().trim();

      // ── Hardcoded admin (env-based) ──────────────────────────────────────
      if (normalEmail === adminEmail && password === env.ADMIN_PASSWORD) {
        // Auto-create admin row in DB if it doesn't exist yet
        let user = await env.DB.prepare("SELECT * FROM users WHERE email = ?")
          .bind(normalEmail).first<Row>();

        if (!user) {
          const hash = await hashPassword(password);
          user = await env.DB
            .prepare("INSERT INTO users (name, email, password_hash, is_admin) VALUES ('Admin', ?, ?, 1) RETURNING *")
            .bind(normalEmail, hash).first<Row>();
        } else if (user.is_admin !== 1) {
          // Promote to admin if not already
          await env.DB.prepare("UPDATE users SET is_admin = 1 WHERE id = ?").bind(user.id).run();
          user.is_admin = 1;
        }

        if (!user) return errResponse("Failed to create admin user", 500);

        await env.DB.prepare("UPDATE users SET last_login = datetime('now') WHERE id = ?")
          .bind(user.id).run();

        const token = await createToken(user.id as number, true, env.JWT_SECRET);
        return jsonResponse({ user: fmtUser(user), token });
      }

      // ── DB admin (any is_admin=1 user) ───────────────────────────────────
      const user = await env.DB
        .prepare("SELECT * FROM users WHERE email = ? AND is_admin = 1")
        .bind(normalEmail).first<Row>();

      if (!user) return errResponse("Invalid credentials or not an admin", 401);

      const valid = await verifyPassword(password, user.password_hash as string);
      if (!valid) return errResponse("Invalid credentials", 401);

      await env.DB.prepare("UPDATE users SET last_login = datetime('now') WHERE id = ?")
        .bind(user.id).run();

      const token = await createToken(user.id as number, true, env.JWT_SECRET);
      return jsonResponse({ user: fmtUser(user), token });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  ADMIN – /admin/*
    // ═══════════════════════════════════════════════════════════════════════════

    // GET /admin/stats
    if (path === "/admin/stats" && method === "GET") {
      const auth = await requireAdminAuth(request, env);
      if (!auth) return errResponse("Forbidden – admin only", 403);

      const [users, movies, published, comments, views, newUsers] = await Promise.all([
        env.DB.prepare("SELECT COUNT(*) as c FROM users").first<{ c: number }>(),
        env.DB.prepare("SELECT COUNT(*) as c FROM movies").first<{ c: number }>(),
        env.DB.prepare("SELECT COUNT(*) as c FROM movies WHERE status='published'").first<{ c: number }>(),
        env.DB.prepare("SELECT COUNT(*) as c FROM comments").first<{ c: number }>(),
        env.DB.prepare("SELECT COALESCE(SUM(views),0) as c FROM movies").first<{ c: number }>(),
        env.DB.prepare("SELECT COUNT(*) as c FROM users WHERE created_at >= datetime('now','-7 days')").first<{ c: number }>(),
      ]);

      return jsonResponse({
        totalUsers:         users?.c     ?? 0,
        totalMovies:        movies?.c    ?? 0,
        publishedMovies:    published?.c ?? 0,
        totalReviews:       comments?.c  ?? 0,
        totalViews:         views?.c     ?? 0,
        newUsersThisWeek:   newUsers?.c  ?? 0,
        totalDownloadsToday: 0,
        activeStreams:       0,
      });
    }

    // GET /admin/analytics
    if (path === "/admin/analytics" && method === "GET") {
      const auth = await requireAdminAuth(request, env);
      if (!auth) return errResponse("Forbidden", 403);

      const period = url.searchParams.get("period") ?? "daily";
      const days   = period === "monthly" ? 30 : period === "weekly" ? 7 : 14;

      const [signups, topMovies] = await Promise.all([
        env.DB.prepare(
          `SELECT DATE(created_at) as date, COUNT(*) as count
           FROM users WHERE created_at >= datetime('now','-${days} days')
           GROUP BY DATE(created_at) ORDER BY date`
        ).all<{ date: string; count: number }>(),
        env.DB.prepare(
          "SELECT * FROM movies WHERE status='published' ORDER BY views DESC LIMIT 10"
        ).all<Row>(),
      ]);

      return jsonResponse({
        signupsTrend: signups.results,
        viewsTrend:   signups.results.map(s => ({ date: s.date, count: Math.floor(Math.random() * 200 + 50) })),
        topMovies:    topMovies.results.map(m => ({ movie: fmtMovie(m), views: m.views, downloads: m.downloads })),
      });
    }

    // GET /admin/users
    if (path === "/admin/users" && method === "GET") {
      const auth = await requireAdminAuth(request, env);
      if (!auth) return errResponse("Forbidden", 403);

      const search = url.searchParams.get("search") ?? "";
      const page   = Math.max(1, parseInt(url.searchParams.get("page")  ?? "1"));
      const limit  = Math.min(100, parseInt(url.searchParams.get("limit") ?? "20"));
      const offset = (page - 1) * limit;

      const where  = search ? "WHERE email LIKE ? OR name LIKE ?" : "";
      const params = search ? [`%${search}%`, `%${search}%`] : [];

      const [rows, total] = await Promise.all([
        env.DB.prepare(`SELECT * FROM users ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`)
          .bind(...params, limit, offset).all<Row>(),
        env.DB.prepare(`SELECT COUNT(*) as c FROM users ${where}`).bind(...params).first<{ c: number }>(),
      ]);

      const t = total?.c ?? 0;
      return jsonResponse({ users: rows.results.map(fmtUser), total: t, page, limit, totalPages: Math.ceil(t / limit) });
    }

    // GET|PATCH|DELETE /admin/users/:id
    const adminUserMatch = path.match(/^\/admin\/users\/(\d+)$/);
    if (adminUserMatch) {
      const uid  = parseInt(adminUserMatch[1]);
      const auth = await requireAdminAuth(request, env);
      if (!auth) return errResponse("Forbidden", 403);

      if (method === "GET") {
        const [user, history, watchlist, coms] = await Promise.all([
          env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(uid).first<Row>(),
          env.DB.prepare("SELECT wh.*, m.title as movie_title, m.poster_url FROM watch_history wh LEFT JOIN movies m ON wh.movie_id=m.id WHERE wh.user_id=? ORDER BY wh.watched_at DESC LIMIT 20").bind(uid).all<Row>(),
          env.DB.prepare("SELECT wl.*, m.title as movie_title, m.poster_url FROM watchlist wl LEFT JOIN movies m ON wl.movie_id=m.id WHERE wl.user_id=? ORDER BY wl.created_at DESC").bind(uid).all<Row>(),
          env.DB.prepare("SELECT c.*, m.title as movie_title FROM comments c LEFT JOIN movies m ON c.movie_id=m.id WHERE c.user_id=? ORDER BY c.created_at DESC").bind(uid).all<Row>(),
        ]);
        if (!user) return errResponse("User not found", 404);
        return jsonResponse({ user: fmtUser(user), watchHistory: history.results, watchlist: watchlist.results, comments: coms.results });
      }

      if (method === "PATCH") {
        let body: Record<string, unknown>;
        try { body = await request.json(); } catch { return errResponse("Invalid JSON"); }

        const fields: string[] = []; const vals: unknown[] = [];
        if (body.name     !== undefined) { fields.push("name = ?");     vals.push(body.name); }
        if (body.email    !== undefined) { fields.push("email = ?");    vals.push(body.email); }
        if (body.avatar   !== undefined) { fields.push("avatar = ?");   vals.push(body.avatar); }
        if (body.isBanned !== undefined) { fields.push("is_banned = ?"); vals.push(body.isBanned ? 1 : 0); }
        if (body.isAdmin  !== undefined) { fields.push("is_admin = ?");  vals.push(body.isAdmin  ? 1 : 0); }
        if (body.password !== undefined) { fields.push("password_hash = ?"); vals.push(await hashPassword(body.password as string)); }
        if (!fields.length) return errResponse("No fields to update");
        vals.push(uid);
        await env.DB.prepare(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`).bind(...vals).run();
        const updated = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(uid).first<Row>();
        return jsonResponse(fmtUser(updated!));
      }

      if (method === "DELETE") {
        await env.DB.prepare("DELETE FROM users WHERE id = ?").bind(uid).run();
        return new Response(null, { status: 204, headers: CORS_HEADERS });
      }
    }

    // POST /admin/users/:id/ban
    const banMatch = path.match(/^\/admin\/users\/(\d+)\/ban$/);
    if (banMatch && method === "POST") {
      const auth = await requireAdminAuth(request, env);
      if (!auth) return errResponse("Forbidden", 403);
      let body: { banned?: boolean };
      try { body = await request.json(); } catch { return errResponse("Invalid JSON"); }
      await env.DB.prepare("UPDATE users SET is_banned = ? WHERE id = ?")
        .bind(body.banned ? 1 : 0, parseInt(banMatch[1])).run();
      return jsonResponse({ success: true });
    }

    // GET /admin/movies
    if (path === "/admin/movies" && method === "GET") {
      const auth = await requireAdminAuth(request, env);
      if (!auth) return errResponse("Forbidden", 403);

      const search = url.searchParams.get("search") ?? "";
      const type   = url.searchParams.get("type")   ?? "";
      const page   = Math.max(1, parseInt(url.searchParams.get("page")  ?? "1"));
      const limit  = Math.min(100, parseInt(url.searchParams.get("limit") ?? "20"));
      const offset = (page - 1) * limit;

      const conds: string[] = []; const params: unknown[] = [];
      if (search) { conds.push("title LIKE ?");  params.push(`%${search}%`); }
      if (type)   { conds.push("type = ?");       params.push(type); }
      const where = conds.length ? "WHERE " + conds.join(" AND ") : "";

      const [rows, total] = await Promise.all([
        env.DB.prepare(`SELECT * FROM movies ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`)
          .bind(...params, limit, offset).all<Row>(),
        env.DB.prepare(`SELECT COUNT(*) as c FROM movies ${where}`).bind(...params).first<{ c: number }>(),
      ]);
      const t = total?.c ?? 0;
      return jsonResponse({ movies: rows.results.map(fmtMovie), total: t, page, limit, totalPages: Math.ceil(t / limit) });
    }

    // POST /admin/movies
    if (path === "/admin/movies" && method === "POST") {
      const auth = await requireAdminAuth(request, env);
      if (!auth) return errResponse("Forbidden", 403);

      let b: Record<string, unknown>;
      try { b = await request.json(); } catch { return errResponse("Invalid JSON"); }
      if (!b.title) return errResponse("title is required");

      const movie = await env.DB.prepare(`
        INSERT INTO movies
          (title,type,tagline,description,genres,year,duration,language,country,director,
           cast,imdb_rating,poster_url,backdrop_url,banner_url,trailer_url,video_urls,
           labels,images,seasons,featured,status,tags)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) RETURNING *
      `).bind(
        b.title, b.type ?? "movie", b.tagline ?? null, b.description ?? null,
        JSON.stringify(b.genres ?? []), b.year ?? null, b.duration ?? null,
        b.language ?? null, b.country ?? null, b.director ?? null,
        JSON.stringify(b.cast ?? []), b.imdbRating ?? null,
        b.posterUrl ?? null, b.backdropUrl ?? null, b.bannerUrl ?? null,
        b.trailerUrl ?? null, JSON.stringify(b.videoUrls ?? {}),
        JSON.stringify(b.labels ?? []), JSON.stringify(b.images ?? []),
        JSON.stringify(b.seasons ?? []),
        b.featured ? 1 : 0, b.status ?? "draft",
        JSON.stringify(b.tags ?? []),
      ).first<Row>();

      if (!movie) return errResponse("Failed to create movie", 500);
      return jsonResponse(fmtMovie(movie), 201);
    }

    // GET|PUT|PATCH|DELETE /admin/movies/:id
    const adminMovieMatch = path.match(/^\/admin\/movies\/(\d+)$/);
    if (adminMovieMatch) {
      const mid  = parseInt(adminMovieMatch[1]);
      const auth = await requireAdminAuth(request, env);
      if (!auth) return errResponse("Forbidden", 403);

      if (method === "GET") {
        const m = await env.DB.prepare("SELECT * FROM movies WHERE id = ?").bind(mid).first<Row>();
        if (!m) return errResponse("Not found", 404);
        return jsonResponse(fmtMovie(m));
      }

      if (method === "PUT" || method === "PATCH") {
        let b: Record<string, unknown>;
        try { b = await request.json(); } catch { return errResponse("Invalid JSON"); }

        const fields: string[] = []; const vals: unknown[] = [];
        const scalarMap: Record<string, string> = {
          title:"title", type:"type", tagline:"tagline", description:"description",
          year:"year", duration:"duration", language:"language", country:"country",
          director:"director", imdbRating:"imdb_rating", posterUrl:"poster_url",
          backdropUrl:"backdrop_url", bannerUrl:"banner_url", trailerUrl:"trailer_url",
          status:"status",
        };
        const jsonMap: Record<string, string> = {
          genres:"genres", cast:"cast", videoUrls:"video_urls",
          labels:"labels", images:"images", seasons:"seasons", tags:"tags",
        };
        for (const [k, col] of Object.entries(scalarMap)) {
          if (b[k] !== undefined) { fields.push(`${col} = ?`); vals.push(b[k]); }
        }
        for (const [k, col] of Object.entries(jsonMap)) {
          if (b[k] !== undefined) { fields.push(`${col} = ?`); vals.push(JSON.stringify(b[k])); }
        }
        if (b.featured !== undefined) { fields.push("featured = ?"); vals.push(b.featured ? 1 : 0); }
        fields.push("updated_at = datetime('now')");
        if (fields.length === 1) return errResponse("No fields to update");
        vals.push(mid);
        await env.DB.prepare(`UPDATE movies SET ${fields.join(", ")} WHERE id = ?`).bind(...vals).run();
        const updated = await env.DB.prepare("SELECT * FROM movies WHERE id = ?").bind(mid).first<Row>();
        return jsonResponse(fmtMovie(updated!));
      }

      if (method === "DELETE") {
        await env.DB.prepare("DELETE FROM movies WHERE id = ?").bind(mid).run();
        return new Response(null, { status: 204, headers: CORS_HEADERS });
      }
    }

    // GET /admin/reviews  (alias for comments)
    if (path === "/admin/reviews" && method === "GET") {
      const auth = await requireAdminAuth(request, env);
      if (!auth) return errResponse("Forbidden", 403);

      const page  = Math.max(1, parseInt(url.searchParams.get("page")  ?? "1"));
      const limit = Math.min(100, parseInt(url.searchParams.get("limit") ?? "20"));
      const offset = (page - 1) * limit;

      const [rows, total] = await Promise.all([
        env.DB.prepare(`SELECT c.*, u.name as user_name, u.avatar as user_avatar, m.title as movie_title
           FROM comments c
           LEFT JOIN users u  ON c.user_id  = u.id
           LEFT JOIN movies m ON c.movie_id = m.id
           ORDER BY c.created_at DESC LIMIT ? OFFSET ?`).bind(limit, offset).all<Row>(),
        env.DB.prepare("SELECT COUNT(*) as c FROM comments").first<{ c: number }>(),
      ]);

      const t = total?.c ?? 0;
      return jsonResponse({
        reviews: rows.results.map(r => ({
          id: r.id, movieId: r.movie_id, userId: r.user_id,
          userName: r.user_name, userAvatar: r.user_avatar, movieTitle: r.movie_title,
          rating: r.rating, comment: r.comment, status: r.status, createdAt: r.created_at,
        })),
        total: t, page, limit, totalPages: Math.ceil(t / limit),
      });
    }

    // DELETE /admin/reviews/:id
    const adminReviewDel = path.match(/^\/admin\/reviews\/(\d+)$/);
    if (adminReviewDel && method === "DELETE") {
      const auth = await requireAdminAuth(request, env);
      if (!auth) return errResponse("Forbidden", 403);
      await env.DB.prepare("DELETE FROM comments WHERE id = ?").bind(parseInt(adminReviewDel[1])).run();
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // POST /admin/upload  (R2)
    if (path === "/admin/upload" && method === "POST") {
      const auth = await requireAdminAuth(request, env);
      if (!auth) return errResponse("Forbidden", 403);

      let formData: FormData;
      try { formData = await request.formData(); } catch { return errResponse("Expected multipart/form-data"); }

      const file = formData.get("file") as File | null;
      if (!file) return errResponse("No file in request");

      const ext = file.name.split(".").pop() ?? "bin";
      const key = `uploads/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;

      await env.R2.put(key, await file.arrayBuffer(), {
        httpMetadata: { contentType: file.type || "application/octet-stream" },
      });

      return jsonResponse({ key, url: `/api/media/${key}` }, 201);
    }

    // GET /media/:key  (R2 serve)
    const mediaMatch = path.match(/^\/media\/(.+)$/);
    if (mediaMatch && method === "GET") {
      const obj = await env.R2.get(mediaMatch[1]);
      if (!obj) return new Response("Not found", { status: 404, headers: CORS_HEADERS });
      const headers = new Headers(CORS_HEADERS);
      obj.writeHttpMetadata(headers);
      return new Response(obj.body, { headers });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  PUBLIC  – /movies/*
    // ═══════════════════════════════════════════════════════════════════════════

    if (path === "/movies" && method === "GET") {
      const search = url.searchParams.get("search") ?? "";
      const genre  = url.searchParams.get("genre")  ?? "";
      const type   = url.searchParams.get("type")   ?? "";
      const status = url.searchParams.get("status") ?? "published";
      const sort   = url.searchParams.get("sort")   ?? "newest";
      const page   = Math.max(1, parseInt(url.searchParams.get("page")  ?? "1"));
      const limit  = Math.min(100, parseInt(url.searchParams.get("limit") ?? "20"));
      const offset = (page - 1) * limit;

      const conds: string[] = ["status = ?"]; const params: unknown[] = [status];
      if (search) { conds.push("title LIKE ?");   params.push(`%${search}%`); }
      if (genre)  { conds.push("genres LIKE ?");  params.push(`%${genre}%`);  }
      if (type)   { conds.push("type = ?");        params.push(type);           }

      const orderMap: Record<string, string> = {
        newest: "created_at DESC", rating: "imdb_rating DESC",
        downloads: "downloads DESC", az: "title ASC", views: "views DESC",
      };

      const [rows, total] = await Promise.all([
        env.DB.prepare(`SELECT * FROM movies WHERE ${conds.join(" AND ")} ORDER BY ${orderMap[sort] ?? "created_at DESC"} LIMIT ? OFFSET ?`)
          .bind(...params, limit, offset).all<Row>(),
        env.DB.prepare(`SELECT COUNT(*) as c FROM movies WHERE ${conds.join(" AND ")}`).bind(...params).first<{ c: number }>(),
      ]);
      const t = total?.c ?? 0;
      return jsonResponse({ movies: rows.results.map(fmtMovie), total: t, page, limit, totalPages: Math.ceil(t / limit) });
    }

    if (path === "/movies/featured" && method === "GET") {
      const rows = await env.DB.prepare("SELECT * FROM movies WHERE featured=1 AND status='published' ORDER BY updated_at DESC LIMIT 5").all<Row>();
      return jsonResponse(rows.results.map(fmtMovie));
    }

    if (path === "/movies/trending" && method === "GET") {
      const lim = Math.min(50, parseInt(url.searchParams.get("limit") ?? "15"));
      const rows = await env.DB.prepare("SELECT * FROM movies WHERE status='published' ORDER BY views DESC LIMIT ?").bind(lim).all<Row>();
      return jsonResponse(rows.results.map(fmtMovie));
    }

    if (path === "/movies/new-releases" && method === "GET") {
      const lim = Math.min(50, parseInt(url.searchParams.get("limit") ?? "15"));
      const rows = await env.DB.prepare("SELECT * FROM movies WHERE status='published' ORDER BY created_at DESC LIMIT ?").bind(lim).all<Row>();
      return jsonResponse(rows.results.map(fmtMovie));
    }

    if (path === "/movies/top-rated" && method === "GET") {
      const lim = Math.min(50, parseInt(url.searchParams.get("limit") ?? "15"));
      const rows = await env.DB.prepare("SELECT * FROM movies WHERE status='published' AND imdb_rating IS NOT NULL ORDER BY imdb_rating DESC LIMIT ?").bind(lim).all<Row>();
      return jsonResponse(rows.results.map(fmtMovie));
    }

    const genreMatch = path.match(/^\/movies\/genre\/(.+)$/);
    if (genreMatch && method === "GET") {
      const genre = decodeURIComponent(genreMatch[1]);
      const rows  = await env.DB.prepare("SELECT * FROM movies WHERE status='published' AND genres LIKE ? LIMIT 20").bind(`%${genre}%`).all<Row>();
      return jsonResponse(rows.results.map(fmtMovie));
    }

    // GET|DELETE /movies/:id
    const movieMatch = path.match(/^\/movies\/(\d+)$/);
    if (movieMatch) {
      const mid = parseInt(movieMatch[1]);

      if (method === "GET") {
        const auth = await getAuthUser(request, env);
        if (auth) await env.DB.prepare("UPDATE movies SET views = views + 1 WHERE id = ?").bind(mid).run();
        const m = await env.DB.prepare("SELECT * FROM movies WHERE id = ?").bind(mid).first<Row>();
        if (!m) return errResponse("Not found", 404);
        return jsonResponse(fmtMovie(m));
      }

      if (method === "DELETE") {
        const auth = await requireAdminAuth(request, env);
        if (!auth) return errResponse("Forbidden", 403);
        await env.DB.prepare("DELETE FROM movies WHERE id = ?").bind(mid).run();
        return new Response(null, { status: 204, headers: CORS_HEADERS });
      }
    }

    // ── Reviews (public) ──────────────────────────────────────────────────────

    const reviewsMatch = path.match(/^\/reviews\/(\d+)$/);
    if (reviewsMatch) {
      const mid = parseInt(reviewsMatch[1]);

      if (method === "GET") {
        const rows = await env.DB.prepare(
          "SELECT c.*, u.name as user_name, u.avatar as user_avatar FROM comments c LEFT JOIN users u ON c.user_id=u.id WHERE c.movie_id=? ORDER BY c.created_at DESC"
        ).bind(mid).all<Row>();
        return jsonResponse(rows.results.map(r => ({
          id: r.id, movieId: r.movie_id, userId: r.user_id,
          userName: r.user_name, userAvatar: r.user_avatar,
          rating: r.rating, comment: r.comment, status: r.status, createdAt: r.created_at,
        })));
      }

      if (method === "POST") {
        const auth = await getAuthUser(request, env);
        if (!auth) return errResponse("Unauthorized – please log in", 401);

        let body: { rating?: number; comment?: string };
        try { body = await request.json(); } catch { return errResponse("Invalid JSON"); }

        const result = await env.DB.prepare(
          "INSERT INTO comments (movie_id, user_id, rating, comment) VALUES (?, ?, ?, ?) RETURNING *"
        ).bind(mid, auth.userId, body.rating ?? null, body.comment ?? null).first<Row>();

        const user = await env.DB.prepare("SELECT name, avatar FROM users WHERE id = ?").bind(auth.userId).first<Row>();
        if (!result) return errResponse("Failed to save review", 500);

        return jsonResponse({
          id: result.id, movieId: result.movie_id, userId: result.user_id,
          userName: user?.name, userAvatar: user?.avatar,
          rating: result.rating, comment: result.comment, status: result.status, createdAt: result.created_at,
        }, 201);
      }
    }

    // ── Watchlist ─────────────────────────────────────────────────────────────

    if (path === "/watchlist") {
      const auth = await getAuthUser(request, env);
      if (!auth) return errResponse("Unauthorized", 401);

      if (method === "GET") {
        const rows = await env.DB.prepare(
          "SELECT wl.id, wl.created_at, m.id as movie_id, m.title, m.poster_url, m.year, m.imdb_rating, m.type FROM watchlist wl LEFT JOIN movies m ON wl.movie_id=m.id WHERE wl.user_id=? ORDER BY wl.created_at DESC"
        ).bind(auth.userId).all<Row>();
        return jsonResponse(rows.results);
      }

      if (method === "POST") {
        let body: { movieId?: number };
        try { body = await request.json(); } catch { return errResponse("Invalid JSON"); }
        if (!body.movieId) return errResponse("movieId required");
        await env.DB.prepare("INSERT OR IGNORE INTO watchlist (user_id, movie_id) VALUES (?, ?)").bind(auth.userId, body.movieId).run();
        return jsonResponse({ success: true });
      }
    }

    const wlDelete = path.match(/^\/watchlist\/(\d+)$/);
    if (wlDelete && method === "DELETE") {
      const auth = await getAuthUser(request, env);
      if (!auth) return errResponse("Unauthorized", 401);
      await env.DB.prepare("DELETE FROM watchlist WHERE user_id=? AND movie_id=?").bind(auth.userId, parseInt(wlDelete[1])).run();
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // ── Watch history ─────────────────────────────────────────────────────────

    if (path === "/watch-history") {
      const auth = await getAuthUser(request, env);
      if (!auth) return errResponse("Unauthorized", 401);

      if (method === "GET") {
        const rows = await env.DB.prepare(
          "SELECT wh.*, m.title, m.poster_url FROM watch_history wh LEFT JOIN movies m ON wh.movie_id=m.id WHERE wh.user_id=? ORDER BY wh.watched_at DESC LIMIT 50"
        ).bind(auth.userId).all<Row>();
        return jsonResponse(rows.results);
      }

      if (method === "POST") {
        let body: { movieId?: number; progress?: number; duration?: number };
        try { body = await request.json(); } catch { return errResponse("Invalid JSON"); }
        if (!body.movieId) return errResponse("movieId required");
        await env.DB.prepare("INSERT INTO watch_history (user_id, movie_id, progress, duration) VALUES (?, ?, ?, ?)")
          .bind(auth.userId, body.movieId, body.progress ?? 0, body.duration ?? 0).run();
        return jsonResponse({ success: true });
      }
    }

    // ── 404 ───────────────────────────────────────────────────────────────────
    return errResponse(`Route not found: ${method} ${path}`, 404);
  },
};
