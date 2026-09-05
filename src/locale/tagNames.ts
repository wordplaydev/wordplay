/**
 * Resolving what a locale tag names. A tag may be written as an ISO code
 * (`/es`, `/es-MX`) or as the language's or region's own name, in that language
 * or in English (`/Español`, `/Spanish`, `/es-México`) — see #1220, and
 * LANGUAGE.md's Text section for the authoring rules.
 *
 * Two rules make this safe. **A code always wins**: three language names fold
 * onto a different language's code (Sichuan Yi's name onto `yi` Yiddish, Ho's
 * onto `ho` Hiri Motu, Lü's onto `lu` Luba-Katanga), and a code is the older,
 * unambiguous spelling. And **folding is locale-independent** — plain
 * `toLowerCase`, never `toLocaleLowerCase(reader)` — for the same reason
 * casing.ts gives: a program must mean the same thing to everyone who reads it,
 * and a Turkish-locale machine folds `I` differently.
 */
import type LanguageCode from '@locale/LanguageCode';
import {
    isLanguageCode,
    Languages,
    PossibleLanguages,
} from '@locale/LanguageCode';
import { RegionNames } from '@locale/regionNames.generated';
import {
    isRegionCode,
    RegionCodes,
    Regions,
    type RegionCode,
} from '@locale/Regions';
import { NameRegExPattern } from '@parser/Tokenizer';

/**
 * The key a written name is matched by: case, accents, spaces, and punctuation
 * removed. Keeping only letters and digits makes the fold *almost* closed over
 * the token grammar — nearly everything a `Sym.Name` token cannot contain is
 * what gets dropped, so a name is typable in the form the fold recognizes
 * (`BahasaIndonesia`, `CotedIvoire`). Recomposing at the end keeps Hangul and
 * other precomposed scripts as they are written.
 *
 * The exception is that `ø` and `ƒ` are reserved symbols but also letters, so
 * they survive the fold and still cannot appear in a name token — see
 * `isTypableTagName` below, which is what keeps an untypable spelling out of
 * the menu.
 */
export function foldTagName(text: string): string {
    return text
        .normalize('NFD')
        .replace(/\p{M}/gu, '')
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]/gu, '')
        .normalize('NFC');
}

/** Some names carry two scripts joined by a slash (`bosanski/босански`,
 *  `Tiếng Việt/㗂越`). Each side is a name someone might write, so they index
 *  separately; folding them together would give one key nobody can type. */
function aliasesOf(...names: (string | undefined)[]): string[] {
    return names
        .filter((name): name is string => name !== undefined)
        .flatMap((name) => name.split('/'))
        .map(foldTagName)
        .filter((key) => key.length > 0);
}

/** Add each alias to the index unless a code already claims that key, so a
 *  name can never shadow a different entry's code. */
function index<Code extends string>(
    map: Map<string, Code>,
    code: Code,
    aliases: string[],
    claimedByACode: (key: string) => boolean,
): void {
    for (const key of aliases)
        if (!map.has(key) && !claimedByACode(key)) map.set(key, code);
}

let languageNames: Map<string, LanguageCode> | undefined = undefined;
let regionNames: Map<string, RegionCode> | undefined = undefined;

/** Folded name → language code. Exported so the ambiguity test can inspect it. */
export function getLanguageNameIndex(): ReadonlyMap<string, LanguageCode> {
    if (languageNames !== undefined) return languageNames;
    const map = new Map<string, LanguageCode>();
    for (const code of PossibleLanguages) {
        const metadata = Languages[code];
        index(
            map,
            code,
            aliasesOf(metadata.name, metadata.en),
            (key) => key !== code && isLanguageCode(key),
        );
    }
    languageNames = map;
    return map;
}

/** Folded name → region code. Exported so the ambiguity test can inspect it. */
export function getRegionNameIndex(): ReadonlyMap<string, RegionCode> {
    if (regionNames !== undefined) return regionNames;
    const map = new Map<string, RegionCode>();
    for (const code of RegionCodes) {
        const names = RegionNames[code];
        index(
            map,
            code,
            aliasesOf(
                Regions[code].en,
                names.name,
                names.en,
                ...(names.alt ?? []),
            ),
            (key) =>
                key.toUpperCase() !== code && isRegionCode(key.toUpperCase()),
        );
    }
    regionNames = map;
    return map;
}

/** The language a tag token names, by code or by name, or undefined for
 *  neither. Codes are matched first and case-insensitively, so `/EN` resolves
 *  and no name can take a code's spelling. */
export function resolveLanguageCode(text: string): LanguageCode | undefined {
    if (isLanguageCode(text)) return text;
    const lower = text.toLowerCase();
    if (isLanguageCode(lower)) return lower;
    const key = foldTagName(text);
    return key.length === 0 ? undefined : getLanguageNameIndex().get(key);
}

/** The region a tag token names, by code or by name, or undefined for neither.
 *  Region codes are upper case, and BCP-47 treats them case-insensitively, so
 *  `/en-us` resolves too. */
export function resolveRegionCode(text: string): RegionCode | undefined {
    if (isRegionCode(text)) return text;
    const upper = text.toUpperCase();
    if (isRegionCode(upper)) return upper;
    const key = foldTagName(text);
    return key.length === 0 ? undefined : getRegionNameIndex().get(key);
}

/** A region's name in its own language, e.g. `MX` → "México". Falls back to the
 *  English name for the two regions CLDR names in no local language. */
export function getRegionName(code: RegionCode): string {
    return RegionNames[code].name;
}

/** A completion for a partly-typed tag: the spelling to write, and what it
 *  means. Callers need the code to skip parts a tag already names and to label
 *  the suggestion. */
export type TagCompletion<Code extends string> = {
    /** The spelling to write — the code or the name, whichever matched. */
    text: string;
    /** What that spelling resolves to. */
    code: Code;
};

/** How many completions a partly-typed tag offers. A menu is a list someone
 *  reads, and `Menu.test.ts` already holds every suggestion set under 40. */
export const MaxTagCompletions = 25;

/** A name as it would be written inside a tag: everything that is not a letter
 *  or digit removed, case and accents kept. `Côte d'Ivoire` → `CôtedIvoire`. */
function spellTagName(name: string): string {
    return name.normalize('NFC').replace(/[^\p{L}\p{N}]/gu, '');
}

/** Whether a spelling is a single name token, and so writable in a tag.
 *  `ø` (NONE_SYMBOL) and `ƒ` (FUNCTION_SYMBOL) are reserved symbols that are
 *  also letters, so they survive `spellTagName` but split the token: Faroese
 *  `føroyskt` and the regions `Bouvetøya` and `Føroyar` are the three names in
 *  the whole catalogue this excludes, and each is still reachable by its
 *  English name. */
function isTypableTagName(text: string): boolean {
    return TypableName.test(text);
}

const TypableName = new RegExp(`^${NameRegExPattern}$`, 'u');

/** One candidate to rank: its code, the two names it may be found by, and how
 *  many people speak it (regions have no count and tie alphabetically). */
type TagEntry<Code extends string> = {
    code: Code;
    /** The name in the entry's own language, when it has one. */
    name: string | undefined;
    /** The English name. */
    en: string;
    reach: number;
};

/**
 * The entries whose code or name starts with `prefix`, best first, each paired
 * with the spelling that matched — which is what makes a completion continue
 * what was being typed rather than replace it with something else.
 *
 * The ladder mirrors `rank()` in LocaleSearch.svelte, and the duplication is
 * deliberate: that one folds with `toLocaleLowerCase(readerLanguages)` so a
 * Turkish reader's search behaves the way they expect, while a tag must mean
 * the same thing to every reader, so this one folds locale-independently.
 */
function rankTagMatches<Code extends string>(
    prefix: string,
    entries: TagEntry<Code>[],
    resolve: (text: string) => Code | undefined,
    limit: number,
): TagCompletion<Code>[] {
    const folded = foldTagName(prefix);
    if (folded.length === 0) return [];
    const lower = prefix.toLowerCase();

    const matches: (TagCompletion<Code> & { rank: number; reach: number })[] =
        [];
    for (const { code, name, en, reach } of entries) {
        const names = [en, ...(name === undefined ? [] : [name])].flatMap((n) =>
            n.split('/'),
        );
        // Lower rank is better. A code beats a name, and the English name beats
        // the entry's own, because the query is typed on whatever keyboard the
        // reader has — someone hunting Japanese types "japan" far more often
        // than "日本語".
        let best: { rank: number; text: string } | undefined;
        const consider = (rank: number, text: string) => {
            if (best === undefined || rank < best.rank) best = { rank, text };
        };
        const codeLower = code.toLowerCase();
        if (codeLower === lower) consider(0, code);
        else if (codeLower.startsWith(lower)) consider(1, code);
        for (const [offset, candidate] of names.entries()) {
            const spelled = spellTagName(candidate);
            if (spelled.length === 0) continue;
            if (spelled.toLowerCase().startsWith(lower))
                consider(2 + offset, spelled);
            else if (foldTagName(spelled).startsWith(folded))
                consider(4 + offset, spelled);
        }
        if (best === undefined) continue;
        // Two guards, both load-bearing. A spelling that is not one name token
        // cannot be written in a tag at all. And a name whose folded key is
        // claimed by a *different* entry's code is deliberately unindexed, so
        // offering it would insert a spelling that means something else — the
        // menu would say "Sichuan Yi" and the program would say Yiddish.
        if (!isTypableTagName(best.text)) continue;
        if (resolve(best.text) !== code) continue;
        matches.push({ text: best.text, code, rank: best.rank, reach });
    }

    return matches
        .sort(
            (a, b) =>
                a.rank - b.rank ||
                b.reach - a.reach ||
                a.text.localeCompare(b.text),
        )
        .slice(0, limit)
        .map(({ text, code }) => ({ text, code }));
}

/** The languages whose code or name starts with `prefix`, best first, each with
 *  the spelling that matched. Empty for an empty prefix — a caller with nothing
 *  typed wants the shipped locales, not all 262. */
export function completeLanguageTag(
    prefix: string,
    limit: number = MaxTagCompletions,
): TagCompletion<LanguageCode>[] {
    const entries: TagEntry<LanguageCode>[] = PossibleLanguages.map((code) => {
        const metadata = Languages[code];
        return {
            code,
            name: metadata.name,
            en: metadata.en,
            reach: metadata.speakers ?? -1,
        };
    });
    return rankTagMatches(prefix, entries, resolveLanguageCode, limit);
}

/** The regions whose code or name starts with `prefix`, best first. */
export function completeRegionTag(
    prefix: string,
    limit: number = MaxTagCompletions,
): TagCompletion<RegionCode>[] {
    return rankTagMatches(
        prefix,
        RegionCodes.map((code) => ({
            code,
            name: RegionNames[code].name,
            en: RegionNames[code].en,
            reach: -1,
        })),
        resolveRegionCode,
        limit,
    );
}
