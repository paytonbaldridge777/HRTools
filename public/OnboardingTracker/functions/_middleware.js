// functions/_middleware.js
//Added support for users stored in KV (key: user:<username> with {username, role, salt, hash}).

export async function onRequest(context) {
  const { request, env, next } = context;

  // --- Path-based protection (unchanged, still optional) ---
  // If you only want to protect certain paths, list them here and uncomment.
  // const protectedPrefixes = ["/", "/index.html"]; // protect everything
  // const url = new URL(request.url);
  // const isProtected = protectedPrefixes.some(p => url.pathname.startsWith(p));
  // if (!isProtected) return next();

  // --- Require Basic Auth for entire site (same as before) ---

  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Basic ")) {
    return unauthorized(env.BASIC_AUTH_REALM);
  }

  // Decode "Basic base64(username:password)"
  const [, b64] = authHeader.split(" ");
  let credentials = "";
  try {
    credentials = atob(b64);
  } catch {
    return unauthorized(env.BASIC_AUTH_REALM);
  }

  const sep = credentials.indexOf(":");
  if (sep < 0) {
    await sleep(300); // tiny delay on bad parse
    return unauthorized(env.BASIC_AUTH_REALM);
  }

  const user = credentials.slice(0, sep);
  const pass = credentials.slice(sep + 1);

  // ---- 1) Existing static users via BASIC_AUTH_USERS (unchanged logic) ----
  const usersSpec = env.BASIC_AUTH_USERS || "";
  const users = parseUsers(usersSpec);

  if (user && pass && users[user] && users[user] === pass) {
    // Auth OK via static list
    return next();
  }

  // ---- 2) NEW: Try KV-backed users (user:<username> with PBKDF2 hash) ----
  try {
    if (env.AUTH_KV) {
      const key = "user:" + user.toLowerCase();
      const recRaw = await env.AUTH_KV.get(key);
      if (recRaw) {
        const rec = JSON.parse(recRaw); // { username, role, salt, hash }
        const ok = await verifyPasswordPBKDF2(pass, rec.salt, rec.hash);
        if (ok) {
          // Auth OK via KV
          return next();
        }
      }
    }
  } catch (e) {
    // If KV is misconfigured, fall through to unauthorized like before
    // (You could log e.message with a Worker log if desired)
  }

  // ---- No match → unauthorized (same as before) ----
  await sleep(300); // small delay to slow brute-force attempts
  return unauthorized(env.BASIC_AUTH_REALM);
}

/* ---------------- Helpers (unchanged + PBKDF2 added) ---------------- */

function parseUsers(spec) {
  return spec.split(",").reduce((acc, pair) => {
    const [u, p] = pair.split(":");
    if (u && p) acc[u.trim()] = p.trim();
    return acc;
  }, {});
}

function unauthorized(realm = "HR Dashboard") {
  return new Response("Authentication required.", {
    status: 401,
    headers: {
      "WWW-Authenticate": `Basic realm="${realm}", charset="UTF-8"`,
      "Cache-Control": "no-store"
    }
  });
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ---- PBKDF2-HMAC-SHA-256 verification to match your _util_auth.js ----
async function verifyPasswordPBKDF2(password, saltB64, hashB64) {
  if (!saltB64 || !hashB64) return false;

  const salt = b64ToBuf(saltB64);
  const expected = new Uint8Array(b64ToBuf(hashB64));
  const actual = new Uint8Array(await derivePBKDF2(password, salt));
  return timingSafeEqual(actual, expected);
}

const ITER = 100_000; // must match what you used when storing hashes
async function derivePBKDF2(password, saltBytes) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );
  return crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: saltBytes, iterations: ITER },
    key,
    256 // bits
  );
}

function b64ToBuf(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}
