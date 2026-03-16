type D1StatementLike = {
  bind: (...values: unknown[]) => D1StatementLike;
  first: <T>() => Promise<T | null>;
  run: () => Promise<unknown>;
};

type D1Result<T> = {
  results?: T[];
};

type D1Database = {
  batch: <T>(statements: D1StatementLike[]) => Promise<D1Result<T>[]>;
  prepare: (query: string) => D1StatementLike;
};

type R2ObjectLike = {
  body: ReadableStream | null;
  httpEtag: string;
  writeHttpMetadata: (headers: Headers) => void;
};

type R2Bucket = {
  get: (key: string) => Promise<R2ObjectLike | null>;
};

type AssetsBinding = {
  fetch: (request: Request) => Promise<Response>;
};

type Env = {
  APK_BUCKET?: R2Bucket;
  ASSETS?: AssetsBinding;
  DB: D1Database;
};

type Session = {
  email: string;
  userId: string;
};

const DEFAULT_SETTINGS = {
  currency: "BRL",
  theme: "system"
} as const;

const PASSWORD_HASH_ITERATIONS = 10_000;
const encoder = new TextEncoder();

function jsonResponse(status: number, payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: corsHeaders({
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8"
    })
  });
}

function emptyResponse(status: number) {
  return new Response(null, {
    status,
    headers: corsHeaders({
      "Cache-Control": "no-store"
    })
  });
}

function corsHeaders(headers?: HeadersInit) {
  return {
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, PUT, DELETE, OPTIONS, HEAD",
    "Access-Control-Allow-Origin": "*",
    ...headers
  };
}

function buildAuthError(status: number, error: string) {
  return jsonResponse(status, { error });
}

function normalizeEmail(email: unknown) {
  return String(email ?? "").trim().toLowerCase();
}

function isValidEmail(email: string) {
  return /\S+@\S+\.\S+/.test(email);
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(hex: string) {
  const bytes = new Uint8Array(hex.length / 2);

  for (let index = 0; index < hex.length; index += 2) {
    bytes[index / 2] = Number.parseInt(hex.slice(index, index + 2), 16);
  }

  return bytes;
}

function createRandomHex(size: number) {
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}

async function derivePasswordHash(password: string, saltHex: string) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: hexToBytes(saltHex),
      iterations: PASSWORD_HASH_ITERATIONS,
      hash: "SHA-256"
    },
    key,
    256
  );

  return bytesToHex(new Uint8Array(bits));
}

function timingSafeEqual(left: string, right: string) {
  if (left.length !== right.length) {
    return false;
  }

  let mismatch = 0;

  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return mismatch === 0;
}

async function parseJsonBody(request: Request) {
  const raw = await request.text();

  if (!raw) {
    return {};
  }

  return JSON.parse(raw) as Record<string, unknown>;
}

function getBearerToken(request: Request) {
  const authorization = request.headers.get("Authorization");

  if (!authorization || !authorization.startsWith("Bearer ")) {
    return null;
  }

  const token = authorization.slice("Bearer ".length).trim();
  return token || null;
}

async function requireSession(request: Request, env: Env) {
  const token = getBearerToken(request);

  if (!token) {
    return null;
  }

  const row = await env.DB.prepare("SELECT user_id, email FROM sessions WHERE token = ?").bind(token).first<{ user_id: string; email: string }>();

  if (!row) {
    return null;
  }

  return {
    email: row.email,
    token,
    userId: row.user_id
  };
}

function sanitizeUser(session: Session) {
  return {
    email: session.email,
    uid: session.userId
  };
}

async function buildBootstrap(env: Env, session: Session) {
  const [transactionsResult, categoriesResult, goalsResult, settingsRow] = (await env.DB.batch([
    env.DB.prepare("SELECT payload FROM transactions WHERE user_id = ? ORDER BY updated_at DESC").bind(session.userId),
    env.DB.prepare("SELECT payload FROM categories WHERE user_id = ? ORDER BY updated_at DESC").bind(session.userId),
    env.DB.prepare("SELECT payload FROM goals WHERE user_id = ? ORDER BY updated_at DESC").bind(session.userId),
    env.DB.prepare("SELECT payload FROM settings WHERE user_id = ?").bind(session.userId)
  ])) as [D1Result<{ payload: string }>, D1Result<{ payload: string }>, D1Result<{ payload: string }>, D1Result<{ payload: string }>];

  const parseCollection = (result: D1Result<{ payload: string }>) =>
    (result.results ?? []).map((entry: { payload: string }) => JSON.parse(entry.payload) as Record<string, unknown>);

  const settingsPayload = settingsRow.results?.[0]?.payload
    ? JSON.parse(settingsRow.results[0].payload)
    : {
        ...DEFAULT_SETTINGS,
        email: session.email
      };

  return {
    transactions: parseCollection(transactionsResult),
    categories: parseCollection(categoriesResult),
    goals: parseCollection(goalsResult),
    settings: settingsPayload
  };
}

function buildUpsertStatement(tableName: "categories" | "goals" | "transactions", item: Record<string, unknown>, now: string, env: Env) {
  const updatedAt = typeof item.updatedAt === "string" ? item.updatedAt : now;
  return env.DB.prepare(
    `INSERT INTO ${tableName} (id, user_id, payload, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET user_id = excluded.user_id, payload = excluded.payload, updated_at = excluded.updated_at`
  ).bind(String(item.id), String(item.userId), JSON.stringify(item), updatedAt);
}

async function handleBulkUpsert(request: Request, env: Env, session: Session, tableName: "categories" | "goals" | "transactions") {
  const body = await parseJsonBody(request);
  const items = (Array.isArray(body.items) ? body.items : []) as Record<string, unknown>[];
  const now = new Date().toISOString();

  for (const item of items) {
    if (!item || typeof item !== "object" || !("id" in item) || !("userId" in item)) {
      return buildAuthError(400, "invalid-payload");
    }

    if (String(item.userId) !== session.userId) {
      return buildAuthError(403, "forbidden");
    }
  }

  if (!items.length) {
    return emptyResponse(204);
  }

  await env.DB.batch(items.map((item) => buildUpsertStatement(tableName, item, now, env)));
  return emptyResponse(204);
}

async function patchJsonRecord(
  env: Env,
  tableName: "goals" | "transactions",
  id: string,
  session: Session,
  patch: Record<string, unknown>
) {
  const row = await env.DB.prepare(`SELECT payload FROM ${tableName} WHERE id = ? AND user_id = ?`).bind(id, session.userId).first<{ payload: string }>();

  if (!row?.payload) {
    return buildAuthError(404, "not-found");
  }

  const current = JSON.parse(row.payload) as Record<string, unknown>;
  const next = {
    ...current,
    ...patch,
    id,
    userId: session.userId
  } as Record<string, unknown>;
  const nextUpdatedAt = typeof next.updatedAt === "string" ? next.updatedAt : new Date().toISOString();

  await env.DB.prepare(`UPDATE ${tableName} SET payload = ?, updated_at = ? WHERE id = ? AND user_id = ?`)
    .bind(JSON.stringify(next), nextUpdatedAt, id, session.userId)
    .run();

  return emptyResponse(204);
}

async function handleRegister(request: Request, env: Env) {
  const body = await parseJsonBody(request);
  const email = normalizeEmail(body.email);
  const password = String(body.password ?? "");

  if (!email || !password.trim()) {
    return buildAuthError(400, "missing-credentials");
  }

  if (!isValidEmail(email)) {
    return buildAuthError(400, "invalid-email");
  }

  if (password.length < 6) {
    return buildAuthError(400, "weak-password");
  }

  const existing = await env.DB.prepare("SELECT uid FROM accounts WHERE email = ?").bind(email).first();

  if (existing) {
    return buildAuthError(409, "email-already-in-use");
  }

  const userId = `cf-${crypto.randomUUID()}`;
  const salt = createRandomHex(16);
  const passwordHash = await derivePasswordHash(password, salt);
  const createdAt = new Date().toISOString();
  const token = createRandomHex(32);

  await env.DB.batch([
    env.DB.prepare("INSERT INTO accounts (uid, email, password_salt, password_hash, created_at) VALUES (?, ?, ?, ?, ?)")
      .bind(userId, email, salt, passwordHash, createdAt),
    env.DB.prepare("INSERT INTO sessions (token, user_id, email, created_at) VALUES (?, ?, ?, ?)")
      .bind(token, userId, email, createdAt),
    env.DB.prepare("INSERT INTO settings (user_id, payload, updated_at) VALUES (?, ?, ?)")
      .bind(userId, JSON.stringify({ ...DEFAULT_SETTINGS, email }), createdAt)
  ]);

  return jsonResponse(201, {
    token,
    user: {
      email,
      uid: userId
    }
  });
}

async function handleLogin(request: Request, env: Env) {
  const body = await parseJsonBody(request);
  const email = normalizeEmail(body.email);
  const password = String(body.password ?? "");

  if (!email || !password.trim()) {
    return buildAuthError(400, "missing-credentials");
  }

  if (!isValidEmail(email)) {
    return buildAuthError(400, "invalid-email");
  }

  const account = await env.DB.prepare("SELECT uid, email, password_salt, password_hash FROM accounts WHERE email = ?")
    .bind(email)
    .first<{ email: string; password_hash: string; password_salt: string; uid: string }>();

  if (!account) {
    return buildAuthError(401, "invalid-credential");
  }

  const passwordHash = await derivePasswordHash(password, account.password_salt);

  if (!timingSafeEqual(passwordHash, account.password_hash)) {
    return buildAuthError(401, "invalid-credential");
  }

  const token = createRandomHex(32);
  const createdAt = new Date().toISOString();
  await env.DB.prepare("INSERT INTO sessions (token, user_id, email, created_at) VALUES (?, ?, ?, ?)")
    .bind(token, account.uid, account.email, createdAt)
    .run();

  return jsonResponse(200, {
    token,
    user: {
      email: account.email,
      uid: account.uid
    }
  });
}

async function serveApk(request: Request, env: Env) {
  if (!env.APK_BUCKET) {
    return request.method === "HEAD"
      ? new Response(null, { status: 404, headers: corsHeaders({ "Cache-Control": "no-store" }) })
      : jsonResponse(200, {
          apk: "not-configured",
          status: "backend-online"
        });
  }

  const object = await env.APK_BUCKET.get("app-release.apk");

  if (!object) {
    return buildAuthError(404, "apk-not-found");
  }

  const headers = new Headers(
    corsHeaders({
      "Cache-Control": "no-store",
      "Content-Disposition": 'attachment; filename="app-release.apk"'
    })
  );

  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);

  return new Response(request.method === "HEAD" ? null : object.body, {
    status: 200,
    headers
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      const url = new URL(request.url);

      if (request.method === "OPTIONS") {
        return emptyResponse(204);
      }

      if (!url.pathname.startsWith("/api") && url.pathname !== "/app-release.apk") {
        if (env.ASSETS) {
          return env.ASSETS.fetch(request);
        }

        return buildAuthError(404, "not-found");
      }

      if (url.pathname === "/app-release.apk") {
        if (!["GET", "HEAD"].includes(request.method)) {
          return buildAuthError(405, "method-not-allowed");
        }

        return serveApk(request, env);
      }

      if (url.pathname === "/api/health") {
        return jsonResponse(200, { status: "ok" });
      }

      if (url.pathname === "/api/auth/register" && request.method === "POST") {
        return handleRegister(request, env);
      }

      if (url.pathname === "/api/auth/login" && request.method === "POST") {
        return handleLogin(request, env);
      }

      const session = await requireSession(request, env);

      if (!session) {
        return buildAuthError(401, "session-expired");
      }

      if (url.pathname === "/api/auth/session" && request.method === "GET") {
        return jsonResponse(200, {
          user: sanitizeUser(session)
        });
      }

      if (url.pathname === "/api/auth/logout" && request.method === "POST") {
        const token = getBearerToken(request)!;
        await env.DB.prepare("DELETE FROM sessions WHERE token = ?").bind(token).run();
        return emptyResponse(204);
      }

      if (url.pathname === "/api/bootstrap" && request.method === "GET") {
        return jsonResponse(200, await buildBootstrap(env, session));
      }

      if (url.pathname === "/api/transactions/bulk-upsert" && request.method === "POST") {
        return handleBulkUpsert(request, env, session, "transactions");
      }

      if (url.pathname === "/api/categories/bulk-upsert" && request.method === "POST") {
        return handleBulkUpsert(request, env, session, "categories");
      }

      if (url.pathname === "/api/goals/bulk-upsert" && request.method === "POST") {
        return handleBulkUpsert(request, env, session, "goals");
      }

      if (url.pathname === "/api/settings" && request.method === "PUT") {
        const body = await parseJsonBody(request);
        const payload = {
          ...DEFAULT_SETTINGS,
          ...body,
          email: session.email
        };

        await env.DB.prepare(
          "INSERT INTO settings (user_id, payload, updated_at) VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at"
        )
          .bind(session.userId, JSON.stringify(payload), new Date().toISOString())
          .run();

        return emptyResponse(204);
      }

      if (url.pathname.startsWith("/api/transactions/") && request.method === "PATCH") {
        const id = url.pathname.split("/").pop();

        if (!id) {
          return buildAuthError(400, "invalid-payload");
        }

        return patchJsonRecord(env, "transactions", id, session, await parseJsonBody(request));
      }

      if (url.pathname.startsWith("/api/transactions/") && request.method === "DELETE") {
        const id = url.pathname.split("/").pop();

        if (!id) {
          return buildAuthError(400, "invalid-payload");
        }

        await env.DB.prepare("DELETE FROM transactions WHERE id = ? AND user_id = ?").bind(id, session.userId).run();
        return emptyResponse(204);
      }

      if (url.pathname.startsWith("/api/goals/") && request.method === "PATCH") {
        const id = url.pathname.split("/").pop();

        if (!id) {
          return buildAuthError(400, "invalid-payload");
        }

        return patchJsonRecord(env, "goals", id, session, await parseJsonBody(request));
      }

      return buildAuthError(404, "not-found");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(message);
      return jsonResponse(500, {
        error: "internal-error"
      });
    }
  }
};
