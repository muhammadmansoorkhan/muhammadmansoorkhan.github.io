# Mansoor Khan — Developer Portfolio

Dark, responsive Next.js + Tailwind CSS portfolio at https://muhammadmansoorkhan.github.io/.

## Develop and deploy

Use Node.js 22 or newer. Run `npm ci`, then `npm run dev`. `npm run build` exports the static website to `out/`. Push to `main` to trigger the included GitHub Pages deployment. Repository Settings → Pages must use GitHub Actions.

## Contact inquiries

The form submits name, email, selected service, and project details to the `portfolio-inquiry` Supabase Edge Function in the existing Brace And Beauty project (`ulxhcyetqbkpalvuxbza`). Read inquiries in Supabase Table Editor → `public.portfolio_inquiries`; mark their status `new`, `contacted`, or `closed` there. This integration stores inquiries; it does not send email notifications.

- `app/contact-form.tsx`: accessible form, validation, loading and result states, retry IDs.
- `app/inquiry-config.ts`: public function URL and anon JWT. This function keeps gateway JWT verification enabled, so its browser client uses the supported legacy anon JWT. Never put a secret/service-role key in frontend code.
- `supabase/functions/portfolio-inquiry/`: deployed function source and shared validation. Server-only credentials come from Supabase runtime environment variables.
- `supabase/portfolio-inquiries.sql`: record of the already-applied database setup. Do not reapply to the existing project without a migration.

Inquiry data has RLS enabled and no grants or policies allowing public reads/writes. Only the server-side service role can execute the submission RPC. The function limits payload size, validates fields and service values, ignores honeypot submissions, and allows browser CORS from the production portfolio or localhost port 3000. SQL enforces five accepted submissions per network address per hour and two per email in five minutes. Retry IDs prevent duplicate submissions. Network addresses are HMAC-hashed using a server-only key; raw addresses are not stored. CORS, the public anon key, and the honeypot are not bot authentication; the database rate limits provide basic abuse protection. Stronger CAPTCHA protection can be added later.

## Verify

`node --experimental-strip-types --test tests/portfolio-inquiry.test.mjs` (Node.js 22.6+). Tests cover validation, CORS, oversized requests, honeypot handling, private server credentials, duplicates, limits, and backend failures.

If changing the site origin, update the Edge Function CORS allowlist and redeploy it. The repository is a user Pages site and must not set `/portfolio` as `basePath`.
