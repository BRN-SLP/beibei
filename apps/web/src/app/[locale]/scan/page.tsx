import { getTranslations } from "next-intl/server";

import { RecentSubmissions } from "@/components/feed/RecentSubmissions";
import { ScanClient } from "@/components/submit/ScanClient";

/**
 * Submit-a-price page.
 *
 * Lives at `/scan` for backwards compatibility with existing bookmark
 * links from earlier versions of the project. The route name will be
 * aliased to `/submit` in a follow-up middleware pass; the user-facing
 * label in the navbar already says "Submit" since the foundation PR.
 *
 * The legacy camera-based BarcodeScanner is dropped, Mercato uses a
 * canonical product dropdown instead. The scanner component is kept
 * in `components/scanner/` for now in case we want to re-introduce
 * barcode-aided product selection later, but the submit flow no
 * longer depends on it.
 *
 * The page also hosts the network's recent submissions feed below
 * the form so contributors land on a live signal of "people are
 * actually submitting right now", which the marketing landing no
 * longer needs to carry.
 */
export default async function ScanPage() {
  const t = await getTranslations("feed");
  return (
    <main className="container mx-auto max-w-2xl space-y-14 px-4 py-8 md:space-y-16">
      <ScanClient />

      <section aria-labelledby="recent-submissions-heading">
        <header className="mb-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">
            {t("section")}
          </p>
          <h2
            id="recent-submissions-heading"
            className="mt-1 font-serif text-xl font-semibold tracking-tight md:text-2xl"
          >
            {t("title")}
          </h2>
        </header>
        <RecentSubmissions />
      </section>
    </main>
  );
}
