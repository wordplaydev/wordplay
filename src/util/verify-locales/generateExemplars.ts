// Generate Wordplay's per-language character data: for every language a text
// value can be tagged with, the letters and digits used to write it, in lower
// and upper case. The app reads the artifact through src/unicode/Exemplars.ts;
// the Phrase "random" text effect is the current consumer, and language
// "alphabet" APIs are the anticipated ones.
//
// The source is CLDR "exemplar characters": for each locale, CLDR curates an
// explicit list of the orthographic units used to write the language (usually
// single letters, sometimes digraphs like Slovak `ch`). We take the *main*
// set (the characters the standard orthography requires — not the auxiliary
// set, which includes loanword characters like English é) plus the digits of
// the *numbers* set, drop members that are standalone combining marks, and
// expand each member with its locale-aware uppercase counterpart, since main
// sets are lowercase-only for bicameral scripts.
//
// Like generateDateTimes.ts, everything is extracted from the pinned CLDR
// release (cldr.ts) so re-runs are byte-identical — with one caveat: the
// uppercase expansion uses the generating machine's toLocaleUpperCase. That's
// acceptable because Unicode case mappings are stability-guaranteed and the
// locale-sensitive cases (Turkish/Azeri dotted i, Lithuanian) are frozen.
//
// Run with `npm run exemplars`. The artifact is static/unicode/exemplars.json,
// fetched lazily by the app the first time something needs it.
import { readFileSync } from 'fs';
import path from 'path';
import {
    Languages,
    PossibleLanguages,
    type LanguageMetadata,
} from '@locale/LanguageCode';
import {
    CLDR_VERSION,
    fetchCLDR,
    isRecord,
} from '@util/verify-locales/cldr';
import writeFormatted from '@util/verify-locales/writeFormatted';

/**
 * Parse a CLDR exemplar UnicodeSet like "[aá ä b {ch} x-z ́]" into its
 * member strings. Supports the subset exemplar sets use — whitespace
 * separators, juxtaposed codepoints, {multi-codepoint} strings,
 * single-codepoint ranges, and \uXXXX or \<literal> escapes — and throws on
 * nested sets, property classes, and set operations so new CLDR syntax fails
 * generation loudly instead of silently corrupting the pool.
 */
export function parseUnicodeSet(set: string): string[] {
    const trimmed = set.trim();
    if (!trimmed.startsWith('[') || !trimmed.endsWith(']'))
        throw new Error(`Not a UnicodeSet: ${set}`);
    const body = trimmed.slice(1, -1);
    if (body.includes('[')) throw new Error(`Unsupported nested set: ${set}`);

    const members: string[] = [];
    let index = 0;

    /** Read one codepoint (or escape) at the current index. */
    const readOne = (): string => {
        if (body[index] === '\\') {
            const next = body[index + 1];
            if (next === 'u') {
                const hex = body.slice(index + 2, index + 6);
                if (!/^[0-9a-fA-F]{4}$/.test(hex))
                    throw new Error(`Malformed \\u escape in ${set}`);
                index += 6;
                return String.fromCharCode(parseInt(hex, 16));
            }
            if (next === undefined)
                throw new Error(`Dangling escape in ${set}`);
            index += 2;
            return next;
        }
        const codepoint = body.codePointAt(index);
        if (codepoint === undefined)
            throw new Error(`Unexpected end of set: ${set}`);
        const character = String.fromCodePoint(codepoint);
        index += character.length;
        return character;
    };

    while (index < body.length) {
        const character = body[index];
        if (/\s/.test(character)) {
            index++;
            continue;
        }
        if (character === '{') {
            const close = body.indexOf('}', index);
            if (close < 0) throw new Error(`Unclosed brace in ${set}`);
            members.push(body.slice(index + 1, close));
            index = close + 1;
            continue;
        }
        const first = readOne();
        // A range like a-e, but not a trailing hyphen member or separator.
        if (
            body[index] === '-' &&
            body[index + 1] !== undefined &&
            !/\s/.test(body[index + 1])
        ) {
            index++;
            const last = readOne();
            const from = first.codePointAt(0);
            const to = last.codePointAt(0);
            if (
                from === undefined ||
                to === undefined ||
                [...first].length > 1 ||
                [...last].length > 1 ||
                to < from
            )
                throw new Error(`Malformed range ${first}-${last} in ${set}`);
            for (let codepoint = from; codepoint <= to; codepoint++)
                members.push(String.fromCodePoint(codepoint));
            continue;
        }
        members.push(first);
    }

    return members;
}

/** The same categories the script pools cycle: letters and decimal digits. */
const PoolCategories = new Set(['Ll', 'Lu', 'Lt', 'Lo', 'Nd']);

/** Codepoint → Unicode general category, from the committed codepoint db. */
function getCategories(): Map<number, string> {
    const categories = new Map<number, string>();
    const codes = readFileSync(
        path.join(process.cwd(), 'static', 'unicode', 'codes.txt'),
        'utf-8',
    );
    for (const line of codes.split('\n')) {
        const [hex, category] = line.split(';');
        if (!hex || !category || hex.includes(' ')) continue;
        categories.set(parseInt(hex, 16), category);
    }
    return categories;
}

/** Every CLDR locale id we want exemplars for: each language's base id plus
 *  any region-specific overrides (e.g. zh_Hant for Chinese in TW/HK/MO). */
function getCLDRIds(): string[] {
    const ids = new Set<string>();
    for (const language of PossibleLanguages) {
        const meta: LanguageMetadata = Languages[language];
        ids.add(meta.cldr ?? language);
        for (const id of Object.values(meta.cldrByRegion ?? {}))
            if (id !== undefined) ids.add(id);
    }
    return [...ids].sort();
}

/** Build the pool for one CLDR locale id, or undefined if CLDR lacks it. */
async function generatePool(
    id: string,
    categories: Map<number, string>,
): Promise<string[] | undefined> {
    const directory = id.replaceAll('_', '-');
    const json = await fetchCLDR(
        `cldr-misc-full/main/${directory}/characters.json`,
    );
    if (json === null) return undefined;
    const characters = isRecord(json)
        ? (() => {
              const main = isRecord(json.main) ? json.main[directory] : undefined;
              return isRecord(main) && isRecord(main.characters)
                  ? main.characters
                  : undefined;
          })()
        : undefined;
    if (characters === undefined) return undefined;

    const mainSet = characters['exemplarCharacters'];
    if (typeof mainSet !== 'string') return undefined;
    const numbersSet = characters['numbers'];

    // Keep members whose first codepoint is a letter or digit; this drops
    // standalone combining marks (some Indic main sets list matras as
    // members), which would glue onto neighboring characters mid-cycle.
    const isPoolable = (member: string): boolean => {
        const codepoint = member.codePointAt(0);
        if (codepoint === undefined) return false;
        const category = categories.get(codepoint);
        return category !== undefined && PoolCategories.has(category);
    };

    const members = parseUnicodeSet(mainSet).filter(isPoolable);

    // The language's digits, from the numbers set (main sets have none).
    if (typeof numbersSet === 'string')
        members.push(
            ...parseUnicodeSet(numbersSet).filter((member) =>
                [...member].every(
                    (character) =>
                        categories.get(character.codePointAt(0) ?? -1) === 'Nd',
                ),
            ),
        );

    // Main sets are lowercase-only for bicameral scripts; add each member's
    // locale-aware uppercase so all-caps text has same-case characters to
    // cycle. Identity for caseless scripts.
    const locale = directory;
    const withUpper = [...members];
    for (const member of members) {
        const upper = member.toLocaleUpperCase(locale);
        if (upper !== member) withUpper.push(upper);
    }

    // Dedupe, preserving order (lower, digits, upper).
    return [...new Set(withUpper)];
}

export async function generateExemplars(): Promise<void> {
    const categories = getCategories();
    const locales: Record<string, string> = {};

    for (const id of getCLDRIds()) {
        const pool = await generatePool(id, categories);
        if (pool === undefined || pool.length === 0) {
            console.log(`No exemplars for ${id}; skipping.`);
            continue;
        }
        // Members never contain a space (the UnicodeSet separator), so a
        // space-joined string is a safe compact encoding.
        locales[id] = pool.join(' ');
    }

    if (!('en' in locales) || !locales['en'].includes('a'))
        throw new Error('English exemplars missing; refusing to write.');

    const file = path.join(
        process.cwd(),
        'static',
        'unicode',
        'exemplars.json',
    );
    const wrote = await writeFormatted(
        file,
        JSON.stringify({ cldr: CLDR_VERSION, locales }),
    );
    console.log(
        `${wrote ? 'Wrote' : 'No changes to'} ${file} (${Object.keys(locales).length} locales).`,
    );
}

// Only run when executed directly, so tests can import the parser.
if (process.argv[1]?.endsWith('generateExemplars.ts')) generateExemplars();
