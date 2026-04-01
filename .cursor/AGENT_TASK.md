# Agent note: API layout and Vercel debugging

## Current architecture (do not remove)

Serverless handlers under `api/` **intentionally** import shared code from [`api/_lib/`](../api/_lib/) (e.g. config, Printful helpers, Gemini prompts). This is the supported layout; the bundler includes those files in each function bundle.

**Do not** inline all `_lib` code into every handler or delete `api/_lib` unless you have **production logs** proving an unresolved `ERR_MODULE_NOT_FOUND` and no other fix works.

## If API routes return 500 on Vercel

1. Open the Vercel project → **Deployments** → failed or latest → **Functions** / **Logs** for the specific route.
2. Confirm environment variables are set for **Production** (Gemini, Supabase service role, Stripe, Printful, etc.).
3. Reproduce locally with `vercel dev` or `npm run build` + preview when possible.

## Repository and deploy

- **GitHub:** [GooseyPrime/goldengoosetees-studio](https://github.com/GooseyPrime/goldengoosetees-studio)
- **Vercel:** Team **intellme**, project `goldengoosetees-studio`; **production branch:** `main`; pushes trigger builds.

For human-facing setup steps, see [README.md](../README.md) and [docs/PRODUCTION_CHECKLIST.md](../docs/PRODUCTION_CHECKLIST.md).
