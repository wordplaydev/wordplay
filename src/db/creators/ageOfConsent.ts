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
 * Keyed by RegionCode to say what these strings are, though that type is
 * currently only documentation: Regions is annotated `Record<string, …>`, so
 * `keyof typeof Regions` widens to `string` and a typo'd code would compile (#1335).
 * ageOfConsent.test.ts is the real guard — it asserts every key here is a key
 * of Regions, which matters because a typo is silent: the row never matches and
 * that country quietly falls back to the default.
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

/** The age of consent where someone lives, defaulting where we have no row. */
export function ageOfConsent(region: string): number {
    return AgesOfConsent[region] ?? DefaultAgeOfConsent;
}
