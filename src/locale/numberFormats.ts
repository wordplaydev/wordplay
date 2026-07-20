import type Locale from '@locale/Locale';
import type LanguageCode from '@locale/LanguageCode';
import { Languages } from '@locale/LanguageCode';
import type { Script } from '@locale/Scripts';
import {
    bengaliDigits,
    devanagariDigits,
    gujaratiDigits,
    gurmukhiDigits,
    kannadaDigits,
    tamilDigits,
    teluguDigits,
    thaiDigits,
} from '@values/NumberValue';

/**
 * Deterministic, in-repo number formatting for output (#1196). We deliberately
 * do NOT use Intl.NumberFormat: it reads the JS engine's bundled ICU/CLDR data,
 * which varies across browsers, OS versions, and Node builds, so the same
 * Wordplay program could render numbers differently on different machines.
 * Everything here is committed data + pure string math, so output is identical
 * everywhere and preserves full Decimal precision (no float round-trip).
 */

/** Positional scripts we render native digits for — the reverse of the digit
 *  maps the tokenizer already uses on input. Any other script (Latin, Arabic,
 *  CJK, …) renders Latin digits, matching current numeral *input* support.
 *  Resolved via a switch (not a prebuilt object) so the imported forward maps
 *  are read at call time: numberFormats and NumberValue import each other, and
 *  a prebuilt object would capture the maps before NumberValue finishes
 *  initializing them. */
function forwardDigitsFor(script: Script): Record<string, string> | undefined {
    switch (script) {
        case 'Deva':
            return devanagariDigits;
        case 'Beng':
            return bengaliDigits;
        case 'Guru':
            return gurmukhiDigits;
        case 'Gujr':
            return gujaratiDigits;
        case 'Knda':
            return kannadaDigits;
        case 'Taml':
            return tamilDigits;
        case 'Telu':
            return teluguDigits;
        case 'Thai':
            return thaiDigits;
        default:
            return undefined;
    }
}

/** Reverse maps ('0'–'9' → script digit), built lazily and cached once per
 *  script. Inverting the single forward map keeps the two directions from ever
 *  drifting apart. */
const reverseDigitCache = new Map<Script, Record<string, string>>();
function reverseDigitsFor(
    script: Script | undefined,
): Record<string, string> | undefined {
    if (script === undefined) return undefined;
    const forward = forwardDigitsFor(script);
    if (forward === undefined) return undefined;
    let reverse = reverseDigitCache.get(script);
    if (reverse === undefined) {
        reverse = {};
        for (const [scriptDigit, arabic] of Object.entries(forward))
            reverse[arabic] = scriptDigit;
        reverseDigitCache.set(script, reverse);
    }
    return reverse;
}

/** Integer grouping style: Western groups the integer part in 3s; Indian
 *  (South Asian) groups the last 3 then repeating 2s (1000000 → 10,00,000). */
type Grouping = 'western' | 'indian';
type NumberFormat = { group: string; decimal: string; style: Grouping };

const Western: NumberFormat = { group: ',', decimal: '.', style: 'western' };

/**
 * Per-language grouping and separator conventions, seeded from CLDR and frozen.
 * Anything not listed uses {@link Western}. Digit *script* is chosen separately
 * (by the language's dominant script), so the South-Asian entries here only set
 * their Indian grouping/separators; their native digits come from the script.
 */
const formatsByLanguage: Partial<Record<LanguageCode, NumberFormat>> = {
    // Decimal comma, dot grouping.
    de: { group: '.', decimal: ',', style: 'western' },
    sr: { group: '.', decimal: ',', style: 'western' },
    tr: { group: '.', decimal: ',', style: 'western' },
    el: { group: '.', decimal: ',', style: 'western' },
    vi: { group: '.', decimal: ',', style: 'western' },
    id: { group: '.', decimal: ',', style: 'western' },
    ro: { group: '.', decimal: ',', style: 'western' },
    pt: { group: '.', decimal: ',', style: 'western' },
    // Decimal comma, space grouping. CLDR uses a narrow/non-breaking space
    // here; we use a plain space for legibility and determinism.
    fr: { group: ' ', decimal: ',', style: 'western' },
    sv: { group: ' ', decimal: ',', style: 'western' },
    pl: { group: ' ', decimal: ',', style: 'western' },
    // South Asian: Indian grouping, comma group + dot decimal.
    hi: { group: ',', decimal: '.', style: 'indian' },
    mr: { group: ',', decimal: '.', style: 'indian' },
    ne: { group: ',', decimal: '.', style: 'indian' },
    bn: { group: ',', decimal: '.', style: 'indian' },
    as: { group: ',', decimal: '.', style: 'indian' },
    pa: { group: ',', decimal: '.', style: 'indian' },
    gu: { group: ',', decimal: '.', style: 'indian' },
    kn: { group: ',', decimal: '.', style: 'indian' },
    ta: { group: ',', decimal: '.', style: 'indian' },
    te: { group: ',', decimal: '.', style: 'indian' },
};

function formatFor(locale: Locale): NumberFormat {
    return formatsByLanguage[locale.language] ?? Western;
}

function scriptFor(locale: Locale): Script | undefined {
    return Languages[locale.language]?.scripts[0];
}

/** Group an already-sign-stripped integer digit string per the given style,
 *  inserting `separator`. Grouping is applied from the right. */
function group(integer: string, separator: string, style: Grouping): string {
    if (integer.length <= 3) return integer;
    if (style === 'western') {
        // Insert a separator before every group of 3 from the right.
        return integer.replace(/\B(?=(\d{3})+(?!\d))/g, separator);
    }
    // Indian: last 3 digits form one group, then groups of 2 to the left.
    const last3 = integer.slice(-3);
    const rest = integer.slice(0, -3);
    const groupedRest = rest.replace(/\B(?=(\d{2})+(?!\d))/g, separator);
    return groupedRest + separator + last3;
}

/** Replace any '0'–'9' in the text with the locale's native digits, if its
 *  script has them. Used for numbers here and for date/time fields (which are
 *  never grouped) in dateTimeFormats.ts. */
export function substituteDigitsForLocale(text: string, locale: Locale): string {
    const reverse = reverseDigitsFor(scriptFor(locale));
    return reverse === undefined
        ? text
        : text.replace(/[0-9]/g, (d) => reverse[d] ?? d);
}

/**
 * Format an Arabic-digit numeric string (as produced by Decimal.toFixed) for the
 * given output locale: apply grouping + decimal separator, then substitute the
 * locale's native digits. `numeric` must be a plain, non-exponential decimal
 * string with an optional leading '-' and optional single '.' — exactly what
 * Decimal.toFixed(dp) yields. The unit is appended by the caller.
 */
export function formatNumberForLocale(numeric: string, locale: Locale): string {
    const negative = numeric.startsWith('-');
    const magnitude = negative ? numeric.slice(1) : numeric;
    const [integer, fraction] = magnitude.split('.');

    const format = formatFor(locale);
    const groupedInteger = group(integer, format.group, format.style);

    // Fraction digits are never grouped.
    const assembled = substituteDigitsForLocale(
        fraction !== undefined
            ? `${groupedInteger}${format.decimal}${fraction}`
            : groupedInteger,
        locale,
    );

    return negative ? `-${assembled}` : assembled;
}
