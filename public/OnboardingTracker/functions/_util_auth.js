// Shared helpers for Basic Auth + KV users
const REALM_VAR = 'BASIC_AUTH_REALM'; // already in your Secrets
const USERS_VAR = 'BASIC_AUTH_USERS'; // already in your Secrets
const REALM_DEFAULT = 'hrdashboard';
const ITER = 100_000; // PBKDF2 iterations

export function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  };
}

export function unauthorizedResponse(env, extra = {}) {
  const realm = env[REALM_VAR] || REALM_DEFAULT;
  return new Response('Unauthorized', {
    status: 401,
    headers: { 'WWW-Authenticate': `Basic realm="${realm}"`, ...extra }
  });
}

/**
 * Parse BASIC_AUTH_USERS secret.
 * Expected format (simple): comma-separated pairs "user:pass", e.g.
 *   admin:AdminPass!,payton:PaytonPass!
 * If your format differs, tweak this parser accordingly.
 */
function parseStaticUsers(secret) {
  if (!secret) return {};
  const map = {};
  for (const pair of secret.split(',').map(s => s.trim()).filter(Boolean)) {
    const i = pair.indexOf(':');
    if (i <= 0) continue;
    const u = pair.slice(0, i).toLowerCase();
    const p = pair.slice(i + 1);
    // Static users are treated as admins so you can bootstrap KV
    map[u] = { username: u, role: 'admin', password: p };
  }
  return map;
}

function b64ToBuf(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}
function bufToB64(buf) {
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

async function derive(password, saltBytes) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveBits']);
  return crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: saltBytes, iterations: ITER },
    key,
    256
  );
}
function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(password, salt);
  return { salt: bufToB64(salt), hash: bufToB64(hash) };
}
export async function verifyPassword(password, saltB64, hashB64) {
  const salt = b64ToBuf(saltB64);
  const expected = new Uint8Array(b64ToBuf(hashB64));
  const actual = new Uint8Array(await derive(password, salt));
  return timingSafeEqual(actual, expected);
}

function parseBasicHeader(hdr) {
  if (!hdr || !hdr.startsWith('Basic ')) return null;
  const [, b64] = hdr.split(' ');
  let decoded = '';
  try { decoded = atob(b64); } catch { return null; }
  const idx = decoded.indexOf(':');
  if (idx < 0) return null;
  return { username: decoded.slice(0, idx), password: decoded.slice(idx + 1) };
}

/**
 * Auth gate for admin endpoints.
 * 1) Check BASIC_AUTH header.
 * 2) If matches a BASIC_AUTH_USERS entry → treat as admin (bootstrap path).
 * 3) Else, look up user in KV (user:<username>) and verify PBKDF2 hash; require role === 'admin'.
 */
export async function requireAdmin(request, env) {
  const creds = parseBasicHeader(request.headers.get('Authorization'));
  if (!creds) return { ok: false };

  const u = creds.username.toLowerCase();
  const p = creds.password;

  // 1) Static secrets path (bootstrap)
  const staticUsers = parseStaticUsers(env[USERS_VAR]);
  if (staticUsers[u] && staticUsers[u].password === p) {
    return { ok: true, user: { username: u, role: 'admin', source: 'static' } };
  }

  // 2) KV path
  const recRaw = await env.AUTH_KV.get(`user:${u}`);
  if (!recRaw) return { ok: false };
  const rec = JSON.parse(recRaw); // { username, role, salt, hash }
  const ok = await verifyPassword(p, rec.salt, rec.hash);
  if (!ok || rec.role !== 'admin') return { ok: false };
  return { ok: true, user: { username: rec.username, role: rec.role, source: 'kv' } };
}

/** For non-admin protected areas (if you want): require valid KV or static user of any role */
export async function requireUser(request, env) {
  const creds = parseBasicHeader(request.headers.get('Authorization'));
  if (!creds) return { ok: false };

  const u = creds.username.toLowerCase();
  const p = creds.password;

  const staticUsers = parseStaticUsers(env[USERS_VAR]);
  if (staticUsers[u] && staticUsers[u].password === p) {
    return { ok: true, user: { username: u, role: staticUsers[u].role, source: 'static' } };
  }
  const recRaw = await env.AUTH_KV.get(`user:${u}`);
  if (!recRaw) return { ok: false };
  const rec = JSON.parse(recRaw);
  const ok = await verifyPassword(p, rec.salt, rec.hash);
  if (!ok) return { ok: false };
  return { ok: true, user: { username: rec.username, role: rec.role, source: 'kv' } };
}

/** List users (KV only) */
export async function listUsers(env) {
  const out = [];
  let cursor;
  do {
    const { keys, list_complete, cursor: next } = await env.AUTH_KV.list({ prefix: 'user:', cursor });
    for (const k of keys) {
      const v = await env.AUTH_KV.get(k.name);
      if (v) {
        const { username, role } = JSON.parse(v);
        out.push({ username, role });
      }
    }
    cursor = next;
    if (list_complete) break;
  } while (true);
  return out;
}

export async function putUser(env, username, password, role = 'viewer') {
  const { salt, hash } = await hashPassword(password);
  const value = { username: username.toLowerCase(), role, salt, hash };
  await env.AUTH_KV.put(`user:${value.username}`, JSON.stringify(value));
}

export async function deleteUser(env, username) {
  await env.AUTH_KV.delete(`user:${username.toLowerCase()}`);
}
