import { corsHeaders, unauthorizedResponse, requireAdmin, deleteUser } from '../../_util_auth.js';

export const onRequestOptions = async ({ request, env }) => new Response(null, { headers: corsHeaders(env.ALLOW_ORIGIN) });

export const onRequestDelete = async ({ request, env, params }) => {
  const gate = await requireAdmin(request, env);
  if (!gate.ok) return unauthorizedResponse(env, corsHeaders(env.ALLOW_ORIGIN));
  const username = (params?.username || '').trim();
  if (!username) return new Response('username required', { status: 400, headers: corsHeaders(env.ALLOW_ORIGIN) });
  await deleteUser(env, username);
  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json', ...corsHeaders(env.ALLOW_ORIGIN) } });
};
