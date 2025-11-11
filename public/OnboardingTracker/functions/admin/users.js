import { corsHeaders, unauthorizedResponse, requireAdmin, listUsers, putUser } from '../_util_auth.js';

export const onRequestOptions = async ({ request, env }) => new Response(null, { headers: corsHeaders(env.ALLOW_ORIGIN) });

export const onRequestGet = async ({ request, env }) => {
  const gate = await requireAdmin(request, env);
  if (!gate.ok) return unauthorizedResponse(env, corsHeaders(env.ALLOW_ORIGIN));
  const users = await listUsers(env);
  return new Response(JSON.stringify(users), { headers: { 'Content-Type': 'application/json', ...corsHeaders(env.ALLOW_ORIGIN) } });
};

export const onRequestPost = async ({ request, env }) => {
  const gate = await requireAdmin(request, env);
  if (!gate.ok) return unauthorizedResponse(env, corsHeaders(env.ALLOW_ORIGIN));
  let body;
  try { body = await request.json(); } catch { body = {}; }
  const { username, password, role = 'viewer' } = body || {};
  if (!username || !password) {
    return new Response('username and password required', { status: 400, headers: corsHeaders(env.ALLOW_ORIGIN) });
  }
  await putUser(env, username, password, role);
  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json', ...corsHeaders(env.ALLOW_ORIGIN) } });
};
