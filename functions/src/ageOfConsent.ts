/**
 * The age at which someone may consent to us holding their email address,
 * by region — and the derivation that turns a birthday into the date they
 * become eligible.
 *
 * This table is law, and law moves: Australia raised its threshold while #628
 * was open, Brazil's Digital ECA became enforceable in March 2026, and GDPR
 * Article 8 lets each member state re-pick anywhere between 13 and 16. A stale
 * row is silent — nobody sees an error, a 14-year-old in a country that moved
 * to 16 is simply offered an account they should not have been. So every row
 * carries the instrument it came from and the date it was last checked, and
 * reviewAgesOfConsent opens an issue once a year listing whatever has aged.
 *
 * NOT legal advice. Each row is a good-faith reading of a secondary source, and
 * several are genuinely contested — see `uncertain`.
 *
 * Mirrored on the client at src/db/creators/ageOfConsent.ts, which carries the
 * ages alone; provenance lives here only. ageOfConsentSync.test.ts fails when
 * the two disagree about any region.
 */

/** The date the whole table was last reviewed end to end. */
export const AgeOfConsentReviewed = '2026-09-04';

/**
 * Where a region isn't listed. 13 is the COPPA threshold and also GDPR
 * Article 8's floor — the age below which no member state may go — so it is the
 * lowest number any of these instruments treats as consent-capable.
 */
export const DefaultAgeOfConsent = 13;

export type Consent = {
    age: number;
    /** The instrument this comes from, short enough to search for. */
    source: string;
    /** ISO date this row was last checked. */
    checked: string;
    /** Present when the reading is contested, saying why. */
    uncertain?: string;
};

/**
 * Only regions that differ from the default. Keyed by ISO 3166 alpha-2 code as
 * a bare string, since `functions/` cannot import src/locale/Regions — the
 * mirror's test asserts every key here is a real one, which is the only guard
 * either side has, because a typo'd code never matches and that country quietly
 * falls back to the default.
 *
 * These EU/EEA states were checked
 * and are 13, matching it: BE, DK, EE, FI, IS, LV, MT, NO, PT, SE, and the UK
 * (UK GDPR / DPA 2018). They are omitted rather than listed so that the table
 * reads as "the exceptions", not "the world".
 */
export const AgesOfConsent: Record<string, Consent> = {
    // ——— GDPR Article 8 national implementations ———
    AT: { age: 14, source: 'DSG §4(4)', checked: '2026-09-04' },
    BG: { age: 14, source: 'GDPR Art. 8 derogation', checked: '2026-09-04' },
    CY: { age: 14, source: 'GDPR Art. 8 derogation', checked: '2026-09-04' },
    CZ: { age: 15, source: 'Act 110/2019 §7', checked: '2026-09-04' },
    DE: { age: 16, source: 'GDPR Art. 8(1) default', checked: '2026-09-04' },
    ES: { age: 14, source: 'LOPDGDD Art. 7', checked: '2026-09-04' },
    FR: {
        age: 15,
        source: 'Loi Informatique et Libertés Art. 45',
        checked: '2026-09-04',
    },
    GR: { age: 15, source: 'Law 4624/2019', checked: '2026-09-04' },
    HR: { age: 16, source: 'GDPR Art. 8(1) default', checked: '2026-09-04' },
    HU: { age: 16, source: 'GDPR Art. 8(1) default', checked: '2026-09-04' },
    IE: {
        age: 16,
        source: 'Data Protection Act 2018 §31',
        checked: '2026-09-04',
    },
    IT: {
        age: 14,
        source: 'D.Lgs. 101/2018 Art. 2-quinquies',
        checked: '2026-09-04',
    },
    LI: {
        age: 16,
        source: 'GDPR Art. 8(1) default (no derogation found)',
        checked: '2026-09-04',
        uncertain:
            'EEA member; no derogation located, so assumed to sit at the Article 8 default.',
    },
    LT: { age: 14, source: 'GDPR Art. 8 derogation', checked: '2026-09-04' },
    LU: { age: 16, source: 'GDPR Art. 8(1) default', checked: '2026-09-04' },
    NL: { age: 16, source: 'UAVG Art. 5', checked: '2026-09-04' },
    PL: { age: 16, source: 'GDPR Art. 8(1) default', checked: '2026-09-04' },
    RO: { age: 16, source: 'GDPR Art. 8(1) default', checked: '2026-09-04' },
    SI: {
        age: 16,
        source: 'GDPR Art. 8(1) default',
        checked: '2026-09-04',
        uncertain: 'A reform proposing 15 was reported pending.',
    },
    SK: { age: 16, source: 'Act 18/2018 §15', checked: '2026-09-04' },

    // ——— Elsewhere ———
    AU: {
        age: 16,
        source: 'Online Safety Amendment (Social Media Minimum Age) Act 2024',
        checked: '2026-09-04',
        uncertain:
            'That Act binds age-restricted social media platforms, which Wordplay is not; the Privacy Act sets no fixed age. 16 is the cautious reading.',
    },
    BR: {
        age: 16,
        source: 'Lei 15.211/2025 (ECA Digital), enforceable March 2026',
        checked: '2026-09-04',
        uncertain:
            'Under-16 accounts must be linked to a guardian; the LGPD separately treats under-12s as children. 18 was proposed in the #628 design, but 16 is what the statute says.',
    },
    CN: { age: 14, source: 'PIPL Art. 31', checked: '2026-09-04' },
    IN: {
        age: 18,
        source: 'DPDP Act 2023 §9',
        checked: '2026-09-04',
        uncertain:
            'Verifiable parental consent for all under-18s — far stricter than anywhere else, and the rules were still settling as of mid-2026.',
    },
    KR: { age: 14, source: 'PIPA Art. 22-2', checked: '2026-09-04' },
};

/** The age of consent where someone lives, defaulting where we have no row. */
export function ageOfConsent(region: string): number {
    return AgesOfConsent[region]?.age ?? DefaultAgeOfConsent;
}

/** A calendar date, or undefined when the text isn't one. Strict rather than
 *  lenient: `Date.parse` accepts '2016-02-31' and silently rolls it forward, so
 *  a typo would become a real birthday a day or two off. */
function parseDate(
    text: string,
): { year: number; month: number; day: number } | undefined {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
    if (match === null) return undefined;
    const [year, month, day] = match.slice(1).map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year &&
        date.getUTCMonth() === month - 1 &&
        date.getUTCDate() === day
        ? { year, month, day }
        : undefined;
}

/**
 * The moment someone born on `birthdate` in `region` may consent to us holding
 * their email address, as epoch milliseconds — the only thing derived from
 * either input that is ever stored. Neither the birthday nor the region is
 * kept, and neither may be logged.
 *
 * Undefined when the date isn't a real one, is in the future, or is
 * implausibly distant, since each of those is a typo rather than a birthday.
 *
 * UTC throughout, so the answer doesn't depend on where the server ran. A
 * February 29th birthday lands on March 1st in a non-leap year, which is the
 * later of the two readings and so the cautious one.
 */
export function emailEligibleOn(
    birthdate: string,
    region: string,
    now: number = Date.now(),
): number | undefined {
    const parsed = parseDate(birthdate);
    if (parsed === undefined) return undefined;
    const born = Date.UTC(parsed.year, parsed.month - 1, parsed.day);
    if (born > now) return undefined;
    if (now - born > 120 * 366 * 24 * 60 * 60 * 1000) return undefined;
    return Date.UTC(
        parsed.year + ageOfConsent(region),
        parsed.month - 1,
        parsed.day,
    );
}
