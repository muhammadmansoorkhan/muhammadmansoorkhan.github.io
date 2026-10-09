# Mansoor Khan — Developer Portfolio

Dark, responsive portfolio using Next.js and Tailwind CSS.

## Publish

1. Upload all source files to the `main` branch of `muhammadmansoorkhan/portfolio`. Include `.github/workflows/deploy.yml`.
2. In the repository, open Settings → Pages and choose GitHub Actions as the source.
3. Open Actions and wait for “Deploy portfolio to GitHub Pages” to complete. You can also run it manually.
4. Visit https://muhammadmansoorkhan.github.io/portfolio/ after deployment succeeds.

## Local development

Use Node.js 22 or newer. Run `npm install`, then `npm run dev`. Open http://localhost:3000/portfolio/.

`npm run build` creates the static site in `out/`.

The `/portfolio` path is set in `next.config.ts`, the screenshot URL in `app/page.tsx`, and the favicon URL in `app/layout.tsx`. Update all three if changing the repository name or using a root custom domain.

Contact currently offers a copyable brief and social profiles; it does not send form submissions.
