// Generate per-locale emoji translation files from Unicode CLDR annotations.
//
// For each locale, downloads the CLDR annotation XML files (base + derived) for
// the closest matching CLDR locale (see `getCLDRCandidates` in LanguageCode.ts,
// which derives them from the canonical language metadata) and emits
// static/locales/{locale}/{locale}-emojis.json. Each entry is keyed by the
// codepoint sequence used in codes.txt and contains an array whose first element
// is the display ("tts") name and the rest are searchable keywords:
//
//   { "1F600": ["grinning face", "face", "grin", "smile"] }
//
// Emojis with no CLDR coverage in the target locale fall back to the English
// CLDR entry, then to the English name in en-US-emojis.json (the canonical name
// source for characters CLDR doesn't annotate — e.g. ASCII digits/punctuation —
// since codes.txt carries only Unicode metadata, no names). Files are written
// Prettier-formatted (via writeFormatted) so they match the committed files and
// re-runs produce clean diffs.
//
// Run all supported locales (`npm run locales-emojis`) or one (`… <locale>`).
// `generateEmojisForLocale` is also called in-process by the translation pipeline
// (start.ts) so a translate/override run produces a locale's emojis too.
import { existsSync, mkdirSync, readFileSync } from 'fs';
import path from 'path';
import { getCLDRCandidates } from '@locale/LanguageCode';
import { getLocaleLanguage, getLocaleRegions } from '@locale/LocaleText';
import { SupportedLocales } from '@locale/SupportedLocales';
import writeFormatted from '@util/verify-locales/writeFormatted';

type CLDREntry = { tts?: string; keywords?: string[] };
type CLDRMap = Map<string, CLDREntry>;
type EmojiCode = { key: string; name: string };

const CLDR_BASE = 'https://raw.githubusercontent.com/unicode-org/cldr/main';

// Per-process caches: CLDR candidate maps (incl. null for "doesn't exist"),
// the parsed codes.txt, and English (the universal fallback).
const cldrCache = new Map<string, CLDRMap | null>();
let emojiCodesCache: EmojiCode[] | undefined;
let englishCache: CLDRMap | undefined;
let englishNamesCache: Record<string, string[]> | undefined;

/** Read codes.txt and return entries that should get emoji translations: every
 *  entry with a subgroup code (column 4+), matching the GlyphChooser picker. */
function readEmojiCodes(): EmojiCode[] {
    if (emojiCodesCache) return emojiCodesCache;
    const lines = readFileSync(
        path.join('static', 'unicode', 'codes.txt'),
        'utf8',
    ).split('\n');
    const entries: EmojiCode[] = [];
    for (const line of lines) {
        if (!line) continue;
        // cols: [hex sequence, general category, script, group?, subgroup?].
        // There is no character name here; `category` is only a last-resort
        // label (real names come from CLDR or en-US-emojis.json).
        const cols = line.split(';');
        if (cols.length < 4 || !cols[3]) continue;
        entries.push({ key: cols[0].trim(), name: cols[1].trim() });
    }
    emojiCodesCache = entries;
    return entries;
}

/** Convert a "1F600" or "0023 FE0F 20E3" hex string into the emoji character. */
function hexToEmoji(hex: string): string {
    return String.fromCodePoint(...hex.split(' ').map((h) => parseInt(h, 16)));
}

/** CLDR strips U+FE0E/FE0F (variation selectors) from the `cp` attribute, so
 *  strip them here too to match codes.txt entries against CLDR keys. */
function stripVariationSelectors(s: string): string {
    return s.replace(/[︎️]/g, '');
}

/** Fetch a CLDR annotation file. Returns the body, or null on 404. */
async function fetchCLDR(
    filename: string,
    kind: string,
): Promise<string | null> {
    const url = `${CLDR_BASE}/common/${kind}/${filename}`;
    const res = await fetch(url);
    if (res.status === 404) return null;
    if (!res.ok)
        throw new Error(
            `Failed to fetch ${url}: ${res.status} ${res.statusText}`,
        );
    return await res.text();
}

/** Decode the XML entities CLDR uses in keyword text. */
function decodeXMLEntities(s: string): string {
    return s
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'");
}

/** Parse a CLDR annotation XML body into a map of emoji → {tts?, keywords?}.
 *  Attributes can appear in any order, so `cp` and `type` are pulled separately. */
function parseAnnotations(xml: string | null): CLDRMap {
    const map: CLDRMap = new Map();
    if (!xml) return map;
    const re = /<annotation\b([^>]*)>([\s\S]*?)<\/annotation>/g;
    const cpRe = /\bcp="([^"]+)"/;
    const typeRe = /\btype="([^"]+)"/;
    let m: RegExpExecArray | null;
    while ((m = re.exec(xml)) !== null) {
        const cpMatch = cpRe.exec(m[1]);
        if (!cpMatch) continue;
        const cp = stripVariationSelectors(decodeXMLEntities(cpMatch[1]));
        const isTTS = typeRe.exec(m[1])?.[1] === 'tts';
        const value = decodeXMLEntities(m[2]).trim();
        const entry = map.get(cp) ?? {};
        if (isTTS) entry.tts = value;
        else
            entry.keywords = value
                .split('|')
                .map((s) => s.trim())
                .filter(Boolean);
        map.set(cp, entry);
    }
    return map;
}

/** Merge a CLDR entry into a map, keeping existing fields (priority order).
 *  Builds a fresh object with only defined fields (exactOptionalPropertyTypes)
 *  and copies the source so cached candidate maps are never aliased/mutated. */
function mergeInto(merged: CLDRMap, cp: string, entry: CLDREntry): void {
    const existing = merged.get(cp);
    if (!existing) {
        merged.set(cp, { ...entry });
        return;
    }
    const combined: CLDREntry = {};
    const tts = existing.tts ?? entry.tts;
    const keywords = existing.keywords ?? entry.keywords;
    if (tts !== undefined) combined.tts = tts;
    if (keywords !== undefined) combined.keywords = keywords;
    merged.set(cp, combined);
}

/** Load CLDR annotations (base + derived) for a CLDR locale code, cached. */
async function loadCLDRForCandidate(
    candidate: string,
): Promise<CLDRMap | null> {
    const cached = cldrCache.get(candidate);
    if (cached !== undefined) return cached;
    const baseXML = await fetchCLDR(`${candidate}.xml`, 'annotations');
    const derivedXML = await fetchCLDR(
        `${candidate}.xml`,
        'annotationsDerived',
    );
    if (!baseXML && !derivedXML) {
        cldrCache.set(candidate, null);
        return null;
    }
    const merged = parseAnnotations(baseXML);
    // Merge derived (skin-tone variants, ZWJ sequences) on top.
    for (const [cp, entry] of parseAnnotations(derivedXML))
        mergeInto(merged, cp, entry);
    cldrCache.set(candidate, merged);
    return merged;
}

/** Resolve the merged CLDR map for a locale, walking its candidate codes (from
 *  the canonical language metadata) in priority order. */
async function loadCLDRForLocale(
    locale: string,
): Promise<{ used: string[]; map: CLDRMap | null }> {
    const language = getLocaleLanguage(locale);
    if (language === undefined) return { used: [], map: null };
    const region = getLocaleRegions(locale)[0];
    const merged: CLDRMap = new Map();
    const used: string[] = [];
    for (const candidate of getCLDRCandidates(language, region)) {
        const map = await loadCLDRForCandidate(candidate);
        if (!map || map.size === 0) continue;
        used.push(candidate);
        for (const [cp, entry] of map) mergeInto(merged, cp, entry);
    }
    return { used, map: merged.size > 0 ? merged : null };
}

/** Build the per-locale emoji array for one entry: locale CLDR, then English
 *  CLDR, then the English name from en-US-emojis.json (for characters CLDR
 *  doesn't annotate), then the category code as a last resort; the tts is first,
 *  keywords deduped after. */
function buildEntry(
    entry: EmojiCode,
    cldrMap: CLDRMap,
    englishMap: CLDRMap,
    englishNames: Record<string, string[]>,
): string[] {
    const emoji = stripVariationSelectors(hexToEmoji(entry.key));
    const cldr = cldrMap.get(emoji);
    const english = englishMap.get(emoji);
    const tts =
        cldr?.tts ??
        english?.tts ??
        englishNames[entry.key]?.[0] ??
        entry.name.toLowerCase();
    const keywords =
        cldr?.keywords && cldr.keywords.length > 0
            ? cldr.keywords
            : (english?.keywords ?? []);
    const seen = new Set([tts.toLowerCase()]);
    const dedupedKeywords: string[] = [];
    for (const k of keywords) {
        const lower = k.toLowerCase();
        if (seen.has(lower)) continue;
        seen.add(lower);
        dedupedKeywords.push(k);
    }
    return [tts, ...dedupedKeywords];
}

/** Load English CLDR once (the universal fallback). */
async function loadEnglish(): Promise<CLDRMap> {
    if (englishCache) return englishCache;
    const en = await loadCLDRForCandidate('en');
    if (!en) throw new Error('Could not fetch English CLDR annotations.');
    englishCache = en;
    return en;
}

/** Load the committed en-US emoji names once — the canonical name source for
 *  characters CLDR doesn't annotate (ASCII digits, punctuation, etc.). Empty
 *  if the file is missing (e.g. a first-ever en-US generation). */
function loadEnglishNames(): Record<string, string[]> {
    if (englishNamesCache) return englishNamesCache;
    const file = path.join('static', 'locales', 'en-US', 'en-US-emojis.json');
    englishNamesCache = existsSync(file)
        ? (JSON.parse(readFileSync(file, 'utf8')) as Record<string, string[]>)
        : {};
    return englishNamesCache;
}

/** Generate and write `{locale}-emojis.json` for one locale. Returns coverage
 *  stats for logging. Throws on a fatal fetch failure (callers may catch). */
export default async function generateEmojisForLocale(
    locale: string,
): Promise<{ used: string[]; matched: number; total: number }> {
    const english = await loadEnglish();
    const englishNames = loadEnglishNames();
    const emojiCodes = readEmojiCodes();
    const { used, map } = await loadCLDRForLocale(locale);
    const cldrMap = map ?? english;
    const obj: Record<string, string[]> = {};
    let matched = 0;
    for (const entry of emojiCodes) {
        if (cldrMap.has(stripVariationSelectors(hexToEmoji(entry.key))))
            matched++;
        obj[entry.key] = buildEntry(entry, cldrMap, english, englishNames);
    }
    const dir = path.join('static', 'locales', locale);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    // Prettier-format (and write-if-changed) so output matches the committed
    // emoji files (short arrays inlined) and re-runs produce clean diffs.
    await writeFormatted(
        path.join(dir, `${locale}-emojis.json`),
        JSON.stringify(obj, null, 4),
    );
    return { used, matched, total: emojiCodes.length };
}

async function main(): Promise<void> {
    const only = process.argv[2];
    const locales = only ? [only] : SupportedLocales;
    console.log(
        `Generating emoji translations for ${locales.length} locale(s)…`,
    );
    for (const locale of locales) {
        const { used, matched, total } = await generateEmojisForLocale(locale);
        const usedLabel = used.length > 0 ? used.join('+') : 'en (fallback)';
        console.log(
            `  ${locale.padEnd(12)} ← CLDR ${usedLabel.padEnd(12)} (${matched}/${total} matched)`,
        );
    }
    console.log('Done.');
}

// Run only when invoked directly, so importing generateEmojisForLocale (e.g. in
// start.ts) never kicks off a full run.
if (process.argv[1]?.endsWith('generateEmojis.ts'))
    main().catch((error) => {
        console.error(error);
        process.exit(1);
    });
