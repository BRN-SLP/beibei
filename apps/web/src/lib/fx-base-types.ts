/**
 * FX base toggle, shared types and constants.
 *
 * Lives in its own file with no `server-only` marker so both the
 * server-only helper (`lib/fx-base.ts`) and the client toggle
 * component (`components/fx-base-toggle.tsx`) can import the type
 * and cookie name without crossing the server/client boundary.
 */

export type FxBase = "local" | "USD" | "EUR";

export const FX_BASE_COOKIE = "mercato-fx-base";
