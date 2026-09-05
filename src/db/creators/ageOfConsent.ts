/**
 * The age at which someone may consent to us holding their email address, by
 * region, so the join form can branch as the birthday is entered.
 *
 * The ages alone. functions/src/ageOfConsent.ts is the authority and carries
 * the instrument each one came from and when it was last checked; provenance
 * lives in one place so a row can't be updated here and left stale there.
 * ageOfConsentSync.test.ts fails when the two disagree about any region.
 *
 * This copy decides what the form offers. It does not decide what is allowed —
 * joinAccount re-derives eligibility server-side, because a form is only a
 * suggestion to anyone willing to skip it.
 */

import type { RegionCode } from '@locale/Regions';

/** Where a region isn't listed: the COPPA threshold, and GDPR Article 8's floor. */
export const DefaultAgeOfConsent = 13;

/**
 * Only the regions that differ from the default.
 *
 * A typo here is now a compile error, since `RegionCode` is a real union (#1335)
 * — which matters because a typo is otherwise silent: the row never matches and
 * that country quietly falls back to the default. The server copy still needs
 * ageOfConsent.test.ts for that, because `functions/` cannot import `Regions`.
 */
export const AgesOfConsent: Partial<Record<RegionCode, number>> = {
    AT: 14,
    BG: 14,
    CY: 14,
    CZ: 15,
    DE: 16,
    ES: 14,
    FR: 15,
    GR: 15,
    HR: 16,
    HU: 16,
    IE: 16,
    IT: 14,
    LI: 16,
    LT: 14,
    LU: 16,
    NL: 16,
    PL: 16,
    RO: 16,
    SI: 16,
    SK: 16,
    AU: 16,
    BR: 16,
    CN: 14,
    IN: 18,
    KR: 14,
};

/** The age of consent where someone lives, defaulting where we have no row —
 *  including for a reader who has named no region yet. */
export function ageOfConsent(region: RegionCode | undefined): number {
    return (region ? AgesOfConsent[region] : undefined) ?? DefaultAgeOfConsent;
}
