import assert from 'node:assert/strict';
import { test } from 'node:test';
import { handleInquiry } from '../supabase/functions/portfolio-inquiry/index.ts';
import { validateInquiry } from '../supabase/functions/portfolio-inquiry/validation.ts';
const origin = 'https://muhammadmansoorkhan.github.io';
const env = { SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'test-server-only-key' };
const data = { id: crypto.randomUUID(), name: 'Test Visitor', email: 'test@example.com', service: 'Business website', details: 'A new business website project.', website: '' };
function request(body = data, headers = {}, method = 'POST') {
 return new Request('https://example.supabase.co/functions/v1/portfolio-inquiry', { method, headers: { Origin: origin, Authorization: 'Bearer test-public-key', 'Content-Type': 'application/json', ...headers }, ...(method === 'POST' ? { body: JSON.stringify(body) } : {}) });
}
test('validates and normalizes inquiry without accepting missing fields or invalid service', () => {
 assert.equal(validateInquiry({ ...data, email: ' TEST@EXAMPLE.COM ' }).data.email, 'test@example.com');
 for (const change of [{ name: 'a' }, { email: 'bad' }, { service: 'Not a service' }, { details: 'short' }, { id: 'bad' }, { email: null }, { details: 'x'.repeat(5001) }]) {
  assert.ok('error' in validateInquiry({ ...data, ...change }));
 }
});
test('preflight permits the portfolio origin without calling the database', async () => {
 const r = await handleInquiry(request(undefined, {}, 'OPTIONS'), {}, () => { throw new Error('unexpected database call'); });
 assert.equal(r.status, 204); assert.equal(r.headers.get('Access-Control-Allow-Origin'), origin);
});
test('rejects unrelated origins and non-POST methods', async () => {
 assert.equal((await handleInquiry(request(data, { Origin: 'https://other.example' }), env)).status, 403);
 assert.equal((await handleInquiry(request(undefined, {}, 'GET'), env)).status, 405);
});
test('invalid input and oversize bodies never reach database', async () => {
 let calls = 0; const db = async () => { calls++; throw new Error('unexpected'); };
 assert.equal((await handleInquiry(request({ ...data, email: 'bad' }), env, db)).status, 400);
 assert.equal((await handleInquiry(request(data, { 'Content-Length': '30000' }), env, db)).status, 413);
 assert.equal((await handleInquiry(request({ ...data, details: 'x'.repeat(30000) }), env, db)).status, 413);
 assert.equal(calls, 0);
});
test('honeypot reports success without storing a submission', async () => {
 const r = await handleInquiry(request({ ...data, website: 'spam' }), env, () => { throw new Error('unexpected'); });
 assert.equal(r.status, 200);
});
test('valid submission uses server-only credentials, hashed IP, normalized data', async () => {
 let stored;
 const db = async (url, options) => {
  assert.equal(url, 'https://example.supabase.co/rest/v1/rpc/submit_portfolio_inquiry');
  assert.equal(options.headers.apikey, env.SUPABASE_SERVICE_ROLE_KEY);
  stored = JSON.parse(options.body);
  return new Response(JSON.stringify('accepted'), { status: 200 });
 };
 const r = await handleInquiry(request({ ...data, email: ' TEST@EXAMPLE.COM ' }, { 'X-Forwarded-For': '203.0.113.11' }), env, db);
 assert.equal(r.status, 201); assert.equal(stored.p_email, 'test@example.com'); assert.match(stored.p_ip_hash, /^[a-f0-9]{64}$/);
 assert.ok(!JSON.stringify(stored).includes('203.0.113.11'));
 assert.ok(!(await r.text()).includes(env.SUPABASE_SERVICE_ROLE_KEY));
});
test('handles retry, rate limit, and conflict results', async () => {
 for (const [result, status] of [['duplicate', 200], ['rate_limited', 429], ['conflict', 409]]) {
  const r = await handleInquiry(request(), env, async () => new Response(JSON.stringify(result)));
  assert.equal(r.status, status);
  if (status === 429) assert.equal(r.headers.get('Retry-After'), '300');
 }
});
test('database failures stay failures and never expose backend details', async () => {
 const r = await handleInquiry(request(), env, async () => new Response('private-database-error', { status: 500 }));
 assert.equal(r.status, 503); assert.ok(!(await r.text()).includes('private-database-error'));
 assert.equal((await handleInquiry(request(), {})).status, 503);
});
