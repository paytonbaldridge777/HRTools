// GET /pay-schedule-pdf?url=<TAMU pay schedule PDF link>
// The Payroll Reminders page can't download a PDF from employees.tamu.edu directly
// (the browser blocks cross-site downloads), so this fetches it on the server side.
// Only https PDF links on employees.tamu.edu are allowed, so this can't be used to fetch anything else.

const ALLOWED_HOST = 'employees.tamu.edu';
const MAX_BYTES = 5 * 1024 * 1024;

export async function onRequestGet({ request }) {
  const link = new URL(request.url).searchParams.get('url') || '';

  let target;
  try {
    target = new URL(link);
  } catch {
    return new Response('Missing or invalid url parameter.', { status: 400 });
  }
  if (target.protocol !== 'https:' || target.hostname !== ALLOWED_HOST || !target.pathname.toLowerCase().endsWith('.pdf')) {
    return new Response(`Only https PDF links on ${ALLOWED_HOST} are allowed.`, { status: 400 });
  }

  // employees.tamu.edu answers 404 to requests that don't look like a browser,
  // so send the same headers a browser would. Its CDN can also keep serving a
  // cached 404 for a while, so a unique query string asks for a fresh copy.
  const fresh = new URL(target);
  fresh.searchParams.set('_', Date.now().toString());
  const upstream = await fetch(fresh.toString(), {
    redirect: 'follow',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36',
      'Accept': 'application/pdf,*/*'
    }
  });
  if (new URL(upstream.url).hostname !== ALLOWED_HOST) {
    return new Response(`That link redirects away from ${ALLOWED_HOST}.`, { status: 502 });
  }
  if (!upstream.ok) {
    return new Response(`${ALLOWED_HOST} returned ${upstream.status} for that link. Check that the link still works.`, { status: 502 });
  }
  const body = await upstream.arrayBuffer();
  if (body.byteLength > MAX_BYTES) {
    return new Response('That PDF is larger than expected for a pay schedule.', { status: 502 });
  }

  return new Response(body, {
    headers: { 'Content-Type': 'application/pdf', 'Cache-Control': 'no-store' }
  });
}
