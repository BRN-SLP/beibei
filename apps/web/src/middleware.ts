import createMiddleware from "next-intl/middleware";

import { routing } from "./i18n/routing";

/**
 * Locale-routing middleware.
 *
 *   - Detects locale from URL prefix (`/uk/...` → uk, `/...` → en).
 *   - Falls back to Accept-Language header if no prefix is present
 *     and `localePrefix: 'as-needed'` doesn't have an explicit match.
 *   - Sets a cookie so the user's preference persists across visits.
 */
export default createMiddleware(routing);

export const config = {
  /**
   * Match every path except:
   *   - /api/*           — JSON endpoints, no locale prefix
   *   - /_next/*         — Next.js internals
   *   - /_vercel/*       — Vercel internals
   *   - static files (anything with a file extension like .png, .ico)
   */
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
