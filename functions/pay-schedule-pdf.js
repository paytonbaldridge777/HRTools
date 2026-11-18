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

  const upstream = await fetch(target.toString(), { redirect: 'follow' });
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
