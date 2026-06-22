/**
 * Shared cookie options for all Supabase SSR clients (server, browser, middleware).
 *
 * When `NEXT_PUBLIC_COOKIE_DOMAIN` is set (e.g. `.advaspire.io` in production), the
 * auth session cookie is scoped to that registrable parent domain so it is shared
 * across subdomains — `app.advaspire.io` (LMS) ↔ `learn.advaspire.io` (Hub) — which
 * is what enables single sign-on (see UNIFICATION-PLAN Part F).
 *
 * When unset (local dev on `localhost`, or `*.vercel.app` previews), we return
 * `undefined` so the cookie stays host-only. A domain-scoped cookie for
 * `.advaspire.io` would be rejected by the browser on `localhost`, breaking local
 * login — so the domain must stay opt-in via env.
 *
 * Must be `NEXT_PUBLIC_`-prefixed: the browser client reads it at runtime, and the
 * server/browser cookie domains MUST match or two competing cookies are written
 * (→ logout loops).
 *
 * Only `domain` is set here; `@supabase/ssr` merges it over `DEFAULT_COOKIE_OPTIONS`
 * (`path:"/"`, `sameSite:"lax"`, `maxAge`), so those defaults are preserved.
 */
export function getSupabaseCookieOptions(): { domain: string } | undefined {
  const domain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN?.trim();
  return domain ? { domain } : undefined;
}
