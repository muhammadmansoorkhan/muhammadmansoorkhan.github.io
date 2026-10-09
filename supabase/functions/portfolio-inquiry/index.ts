import { validateInquiry } from './validation.ts';

const allowedOrigins = new Set(['https://muhammadmansoorkhan.github.io', 'http://localhost:3000', 'http://127.0.0.1:3000']);
const maxBytes = 24_000;
export async function handleInquiry(req: Request, env: Record<string, string>, dbFetch: typeof fetch = fetch): Promise<Response> {
  const origin = req.headers.get('origin');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Vary': 'Origin',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  };
  if (origin && allowedOrigins.has(origin)) headers['Access-Control-Allow-Origin'] = origin;
  const reply = (status: number, message: string) => new Response(JSON.stringify({ message }), { status, headers });
  if (origin && !allowedOrigins.has(origin)) return reply(403, 'This website is not allowed to submit inquiries.');
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (req.method !== 'POST') return reply(405, 'Use the contact form to send an inquiry.');
  if (!req.headers.get('authorization')?.startsWith('Bearer ')) return reply(401, 'Please refresh the page and try again.');
  if (!req.headers.get('content-type')?.toLowerCase().includes('application/json')) return reply(415, 'Send a JSON request.');
  if (Number(req.headers.get('content-length') || 0) > maxBytes) return reply(413, 'Your project description is too long.');
  const reader = req.body?.getReader();
  if (!reader) return reply(400, 'Please complete the form.');
  let raw = '';
  try {
    const decoder = new TextDecoder(); let bytes = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maxBytes) { await reader.cancel(); return reply(413, 'Your project description is too long.'); }
      raw += decoder.decode(value, { stream: true });
    }
    raw += decoder.decode();
  } catch { return reply(400, 'Unable to read your inquiry. Please try again.'); }
  let value: unknown;
  try { value = JSON.parse(raw); } catch { return reply(400, 'Please complete the form.'); }
  const result = validateInquiry(value);
  if ('error' in result) return reply(400, result.error);
  const data = result.data;
  if (data.website) return reply(200, 'Thank you. Your inquiry has been received.');
  const url = env.SUPABASE_URL;
  const secret = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !secret) return reply(503, 'The contact form is temporarily unavailable. Please use one of my social links.');
  try {
    // Hash the network address with a server-only key. Never store raw IP addresses.
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const digest = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(ip));
    const ipHash = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
    const response = await dbFetch(`${url}/rest/v1/rpc/submit_portfolio_inquiry`, {
      method: 'POST', headers: { apikey: secret, Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_id: data.id, p_name: data.name, p_email: data.email, p_service: data.service, p_details: data.details, p_ip_hash: ipHash }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return reply(503, 'Unable to send right now. Please try again or use one of my social links.');
    const status = await response.json();
    if (status === 'rate_limited') { headers['Retry-After'] = '300'; return reply(429, 'Too many inquiries. Please wait a while before trying again.'); }
    if (status === 'conflict') return reply(409, 'Please edit your message and try again.');
    if (status !== 'accepted' && status !== 'duplicate') return reply(503, 'Unable to confirm your inquiry. Please try again.');
    return reply(status === 'accepted' ? 201 : 200, 'Thank you! Your inquiry has been received. I’ll reply to your email.');
  } catch { return reply(503, 'Unable to send right now. Please try again or use one of my social links.'); }
}

declare const Deno: { env: { get(name: string): string | undefined }; serve(handler: (req: Request) => Promise<Response>): void };
if (typeof Deno !== 'undefined') {
  Deno.serve(req => handleInquiry(req, {
    SUPABASE_URL: Deno.env.get('SUPABASE_URL') || '',
    SUPABASE_SERVICE_ROLE_KEY: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
  }));
}
