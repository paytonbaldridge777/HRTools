/**
 * FMLA Tracker API
 *
 * Sits behind Cloudflare Access. Verifies the Access JWT on every request,
 * confirms the caller is on the HR staff list, then talks to Supabase with
 * the service_role key. The browser never sees a Supabase credential.
 *
 * Required environment variables (Pages > Settings > Environment variables):
 *   CF_ACCESS_TEAM_DOMAIN      e.g. tamulaw.cloudflareaccess.com
 *   CF_ACCESS_AUD              Application Audience tag from the Access app
 *   SUPABASE_URL               https://cnxdlahqonlewgbcjyla.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY  mark as SECRET, never as plaintext
 *
 * The service_role key bypasses RLS by design. That is why this file is the
 * security boundary: every path out of here must run requireStaff() first.
 */

const SCHEMA = 'fmla';
let jwksCache = { keys: null, fetchedAt: 0 };

/* ---------- Cloudflare Access JWT verification ---------- */

function b64urlToBytes(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function decodeSegment(seg) {
  return JSON.parse(new TextDecoder().decode(b64urlToBytes(seg)));
}

async function getJwks(teamDomain) {
  // Cache for 10 minutes. Cloudflare rotates these keys periodically.
  if (jwksCache.keys && Date.now() - jwksCache.fetchedAt < 600000) return jwksCache.keys;
  const res = await fetch(`https://${teamDomain}/cdn-cgi/access/certs`);
  if (!res.ok) throw new Error('Could not reach the Access certificate endpoint');
  const body = await res.json();
  jwksCache = { keys: body.keys, fetchedAt: Date.now() };
  return body.keys;
}

async function verifyAccessJwt(token, env) {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Malformed Access token');

  const header = decodeSegment(parts[0]);
  const payload = decodeSegment(parts[1]);

  const keys = await getJwks(env.CF_ACCESS_TEAM_DOMAIN);
  const jwk = keys.find(k => k.kid === header.kid);
  if (!jwk) throw new Error('No Access signing key matches this token');

  const key = await crypto.subtle.importKey(
    'jwk', jwk,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false, ['verify']
  );

  const signed = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
  const ok = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5', key, b64urlToBytes(parts[2]), signed
  );
  if (!ok) throw new Error('Access token signature is not valid');

  // Signature alone is not enough. An unchecked aud means a token minted for
  // any other Access application in the account would be accepted here.
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) throw new Error('Access token expired');
  if (payload.nbf && payload.nbf > now) throw new Error('Access token not yet valid');

  const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!aud.includes(env.CF_ACCESS_AUD)) throw new Error('Access token audience mismatch');

  const expectedIss = `https://${env.CF_ACCESS_TEAM_DOMAIN}`;
  if (payload.iss !== expectedIss) throw new Error('Access token issuer mismatch');

  if (!payload.email) throw new Error('Access token carries no email claim');
  return payload;
}

/* ---------- Supabase, service_role ---------- */

async function sb(env, method, path, body, extraHeaders = {}) {
  const isRead = method === 'GET' || method === 'HEAD';
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      [isRead ? 'Accept-Profile' : 'Content-Profile']: SCHEMA,
      ...extraHeaders
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}

async function requireStaff(request, env) {
  const token = request.headers.get('Cf-Access-Jwt-Assertion')
    || (request.headers.get('Cookie') || '')
         .split(';').map(c => c.trim())
         .find(c => c.startsWith('CF_Authorization='))?.slice('CF_Authorization='.length);

  if (!token) throw new Error('No Access token on this request');

  const claims = await verifyAccessJwt(token, env);
  const email = claims.email.toLowerCase();

  const rows = await sb(env, 'GET', `hr_staff?email=eq.${encodeURIComponent(email)}&select=email`);
  if (!rows || rows.length === 0) {
    throw Object.assign(new Error('Not on the HR staff list'), { status: 403 });
  }
  return email;
}

async function audit(env, actor, action, caseId = null) {
  try {
    await sb(env, 'POST', 'access_log', [{ actor, action, case_id: caseId }]);
  } catch {
    // Never let a logging failure block the request the user asked for.
  }
}

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
});

/* ---------- Routes ---------- */

export async function onRequest(context) {
  const { request, env, params } = context;
  const route = (params.route || []).join('/');
  const url = new URL(request.url);

  for (const v of ['CF_ACCESS_TEAM_DOMAIN','CF_ACCESS_AUD','SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY']) {
    if (!env[v]) return json({ error: `Server is missing ${v}` }, 500);
  }

  let actor;
  try {
    actor = await requireStaff(request, env);
  } catch (e) {
    return json({ error: e.message }, e.status || 401);
  }

  try {
    if (route === 'me') {
      return json({ email: actor });
    }

    if (route === 'cases' && request.method === 'GET') {
      const cases = await sb(env, 'GET', 'cases?select=*&order=id.asc');
      const usage = await sb(env, 'GET', 'usage?select=*');
      await audit(env, actor, 'list_cases');
      return json({ cases, usage });
    }

    if (route === 'cases' && request.method === 'POST') {
      const body = await request.json();
      const saved = await sb(env, 'POST', 'cases', [body],
        { Prefer: 'resolution=merge-duplicates,return=representation' });
      await audit(env, actor, body.id ? 'update_case' : 'create_case', saved?.[0]?.id ?? null);
      return json(saved?.[0] ?? null);
    }

    if (route === 'cases' && request.method === 'DELETE') {
      const id = url.searchParams.get('id');
      if (!id) return json({ error: 'An id is required to delete' }, 400);
      await sb(env, 'DELETE', `cases?id=eq.${encodeURIComponent(id)}`);
      await audit(env, actor, 'delete_case', Number(id));
      return json({ deleted: Number(id) });
    }

    if (route === 'usage' && request.method === 'POST') {
      const body = await request.json();
      const saved = await sb(env, 'POST', 'usage', [body], { Prefer: 'return=representation' });
      await audit(env, actor, 'add_usage', body.case_id ?? null);
      return json(saved?.[0] ?? null);
    }

    return json({ error: `No route for ${request.method} /${route}` }, 404);

  } catch (e) {
    // Supabase errors can echo query fragments. Log server side, stay vague client side.
    console.error('fmla api', route, e.message);
    return json({ error: 'The request could not be completed' }, 500);
  }
}
