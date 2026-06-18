import { Scripts } from '@locale/Scripts';

/**
 * The Unicode property registry for pattern classes (LANGUAGE.md). Resolves a
 * property name to a grapheme predicate. A name may be a curated registry name
 * (`letter`, `emoji`, `linebreak`, …), a CLDR script (`greek`, `han`, …), or a
 * canonical Unicode id (`Lu`, `Emoji`, `Nd`, `Script=Greek`). Unknown names
 * resolve to `undefined` (the parser flags them as a conflict; the matcher
 * fails). All tests use the grapheme cluster's BASE (first) scalar.
 *
 * Registry names are matched case-insensitively in English; scripts resolve
 * through their English CLDR names in {@link Scripts}.
 */

export type GraphemePredicate = (grapheme: string) => boolean;

function baseTest(re: RegExp): GraphemePredicate {
    return (g) => {
        const cp = g.codePointAt(0);
        return cp !== undefined && re.test(String.fromCodePoint(cp));
    };
}

// Composed predicates with no single \p{} escape.
const LINEBREAK = /^[\n\r\x85\v\f\u2028\u2029]$/u;
const HORIZONTAL_SPACE = /^[\t\p{Zs}]$/u;

/** Curated category / binary names → predicate. */
const Registry: Record<string, GraphemePredicate> = {
    letter: baseTest(/\p{Alphabetic}/u),
    digit: baseTest(/\p{Nd}/u),
    mark: baseTest(/\p{M}/u),
    number: baseTest(/\p{N}/u),
    punctuation: baseTest(/\p{P}/u),
    symbol: baseTest(/\p{S}/u),
    currency: baseTest(/\p{Sc}/u),
    math: baseTest(/\p{Sm}/u),
    space: baseTest(HORIZONTAL_SPACE),
    linebreak: baseTest(LINEBREAK),
    control: baseTest(/\p{Cc}/u),
    format: baseTest(/\p{Cf}/u),
    uppercase: baseTest(/\p{Lu}/u),
    lowercase: baseTest(/\p{Ll}/u),
    // `\p{Emoji}` would also match plain digits, `#`, and `*` (keycap bases);
    // `Emoji_Presentation` is the intuitive "renders as an emoji" set. The
    // broader pictographic set (☺, ‼, …) is available as `pictographic`.
    emoji: baseTest(/\p{Emoji_Presentation}/u),
    pictographic: baseTest(/\p{Extended_Pictographic}/u),
    hex: baseTest(/\p{Hex_Digit}/u),
    dash: baseTest(/\p{Dash}/u),
    quote: baseTest(/\p{Quotation_Mark}/u),
    ideographic: baseTest(/\p{Ideographic}/u),
    diacritic: baseTest(/\p{Diacritic}/u),
};

/** CLDR script English names (e.g. "greek" → "Greek") from Scripts.ts. */
const ScriptByName = new Map<string, string>(
    Object.values(Scripts).map((s) => [s.en.toLowerCase(), s.en]),
);

function tryRegExp(source: string): RegExp | undefined {
    try {
        return new RegExp(source, 'u');
    } catch {
        return undefined;
    }
}

/**
 * Resolved predicates, keyed by `name\x00value`, so the matcher (which calls
 * {@link resolveProperty} per grapheme inside quantifier loops) and the
 * conflict checker don't recompile a `RegExp` on every probe. `undefined`
 * results are cached too, so repeated unknown-property checks stay cheap.
 */
const resolveCache = new Map<string, GraphemePredicate | undefined>();

/**
 * Resolve a property to a grapheme predicate, or undefined if unrecognized.
 * `value` is set for the canonical `Property=Value` form (e.g. Script=Greek).
 */
export function resolveProperty(
    name: string,
    value?: string,
): GraphemePredicate | undefined {
    const key = `${name}\x00${value ?? ''}`;
    const cached = resolveCache.get(key);
    if (cached !== undefined || resolveCache.has(key)) return cached;
    const result = computeProperty(name, value);
    resolveCache.set(key, result);
    return result;
}

function computeProperty(
    name: string,
    value?: string,
): GraphemePredicate | undefined {
    if (value !== undefined) {
        const re = tryRegExp(`\\p{${name}=${value}}`);
        return re ? baseTest(re) : undefined;
    }
    const lower = name.toLowerCase();
    if (lower in Registry) return Registry[lower];
    // A CLDR script name (Emoji is the binary property, handled above).
    const en = ScriptByName.get(lower);
    if (en !== undefined && en !== 'Emoji') {
        const re = tryRegExp(`\\p{Script=${en}}`);
        if (re) return baseTest(re);
    }
    // A canonical Unicode id (general category / binary property).
    const re = tryRegExp(`\\p{${name}}`);
    return re ? baseTest(re) : undefined;
}

export function isKnownProperty(name: string, value?: string): boolean {
    return resolveProperty(name, value) !== undefined;
}

/**
 * The human-facing property vocabulary — curated registry names plus CLDR
 * script names, all lowercase. Used to suggest the nearest correction for an
 * unrecognized `/property` (canonical Unicode ids are too numerous to enumerate
 * and aren't what learners type). See {@link UnrecognizedPatternProperty}.
 */
export const KnownPropertyNames: string[] = [
    ...Object.keys(Registry),
    ...ScriptByName.keys(),
];
