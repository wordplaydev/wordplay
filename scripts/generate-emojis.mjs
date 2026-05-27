// Generate per-locale emoji translation files from Unicode CLDR annotations.
//
// For each supported locale, downloads the CLDR annotation XML files (base +
// derived) for the closest matching CLDR locale, and emits
// static/locales/{locale}/{locale}-emojis.json. Each entry is keyed by the
// codepoint sequence used in codes.txt and contains an array whose first
// element is the display ("tts") name and remaining elements are searchable
// keywords:
//
//   { "1F600": ["grinning face", "face", "grin", "smile"] }
//
// Emojis with no CLDR coverage in the target locale fall back to the English
// CLDR entry, then to the name in static/unicode/codes.txt. Files are pretty-
// printed with 4-space indent so human translators can edit them directly.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// Map each supported locale to its CLDR annotation locale code(s). The list is
// consulted in order; the first one that exists is used. CLDR uses
// underscores while we use hyphens.
const LocaleToCLDR = {
    'en-US': ['en'],
    'es-MX': ['es_MX', 'es'],
    'zh-CN': ['zh'],
    'ko-KR': ['ko'],
    'zh-TW': ['zh_Hant'],
    'fr-FR': ['fr'],
    'ja-JP': ['ja'],
    'de-DE': ['de'],
    'hi-IN': ['hi'],
    'pa-IN': ['pa'],
    'ta-IN-LK-SG': ['ta'],
    'sv-FI': ['sv_FI', 'sv'],
    'sr-RS': ['sr'],
    'mr-IN': ['mr'],
    'pl-PL': ['pl'],
    'gu-IN': ['gu'],
    'tr-TR': ['tr'],
    'ar-SA': ['ar_SA', 'ar'],
    'el-GR': ['el'],
    'kn-IN': ['kn'],
    'te-IN': ['te'],
    'as-IN': ['as'],
    'he-IL': ['he'],
    'vi-VN': ['vi'],
    'tl-PH': ['fil'], // CLDR uses Filipino code for Tagalog.
};

const CLDR_BASE = 'https://raw.githubusercontent.com/unicode-org/cldr/main';

/** Read SupportedLocales from the TS source so we don't hard-code the list. */
function readSupportedLocales() {
    const tsPath = path.join(ROOT, 'src', 'locale', 'SupportedLocales.ts');
    const src = readFileSync(tsPath, 'utf8');
    // Strip everything outside the two array literals and pull out the
    // quoted strings. The file is small and follows a fixed shape.
    const matches = src.matchAll(/'([a-z]{2,3}(?:-[A-Z]{2}(?:-[A-Z]{2})*)?)'/g);
    return Array.from(new Set(Array.from(matches, (m) => m[1])));
}

/** Read codes.txt and return entries that should get emoji translations.
 * We translate every entry that has a subgroup code (column 4+), matching the
 * subset GlyphChooser shows in the emoji picker. */
function readEmojiCodes() {
    const codesPath = path.join(ROOT, 'static', 'unicode', 'codes.txt');
    const lines = readFileSync(codesPath, 'utf8').split('\n');
    const entries = [];
    for (const line of lines) {
        if (!line) continue;
        const cols = line.split(';');
        // cols: [hex sequence, name, category, group?, subgroup?]
        // Only translate entries with a group/subgroup (the picker's set).
        if (cols.length < 4 || !cols[3]) continue;
        const hex = cols[0].trim();
        const name = cols[1].trim();
        entries.push({ key: hex, name });
    }
    return entries;
}

/** Convert a "1F600" or "0023 FE0F 20E3" hex string into the actual emoji
 * character it represents. */
function hexToEmoji(hex) {
    return String.fromCodePoint(...hex.split(' ').map((h) => parseInt(h, 16)));
}

/** CLDR strips U+FE0F (variation selector-16) from the cp attribute on
 * annotations. Strip it from a string so we can match codes.txt entries
 * against CLDR keys consistently. */
function stripVariationSelectors(s) {
    return s.replace(/[︎️]/g, '');
}

/** Fetch a CLDR annotation file. Returns the body or null if 404. */
async function fetchCLDR(filename, kind) {
    const url = `${CLDR_BASE}/common/${kind}/${filename}`;
    const res = await fetch(url);
    if (res.status === 404) return null;
    if (!res.ok)
        throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
    return await res.text();
}

/** Decode common XML entities. CLDR uses these in keyword text. */
function decodeXMLEntities(s) {
    return s
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'");
}

/** Parse a CLDR annotation XML body into a Map<emoji, {tts?, keywords?}>.
 * Annotations may carry extra attributes (draft, references) in any order
 * between the tag name and `>`, so we match the start tag loosely and pull
 * `cp` and `type` out separately. */
function parseAnnotations(xml) {
    const map = new Map();
    if (!xml) return map;
    const re = /<annotation\b([^>]*)>([\s\S]*?)<\/annotation>/g;
    const cpRe = /\bcp="([^"]+)"/;
    const typeRe = /\btype="([^"]+)"/;
    let m;
    while ((m = re.exec(xml)) !== null) {
        const attrs = m[1];
        const cpMatch = cpRe.exec(attrs);
        if (!cpMatch) continue;
        const cp = stripVariationSelectors(decodeXMLEntities(cpMatch[1]));
        const typeMatch = typeRe.exec(attrs);
        const isTTS = typeMatch?.[1] === 'tts';
        const value = decodeXMLEntities(m[2]).trim();
        let entry = map.get(cp);
        if (!entry) {
            entry = {};
            map.set(cp, entry);
        }
        if (isTTS) entry.tts = value;
        else
            entry.keywords = value
                .split('|')
                .map((s) => s.trim())
                .filter(Boolean);
    }
    return map;
}

/** Load CLDR annotations (base + derived) for a CLDR locale code. Tries each
 * candidate code until one returns data. Returns the merged map. */
async function loadCLDRForCandidate(candidate, cache) {
    if (cache.has(candidate)) return cache.get(candidate);
    const baseXML = await fetchCLDR(`${candidate}.xml`, 'annotations');
    const derivedXML = await fetchCLDR(`${candidate}.xml`, 'annotationsDerived');
    if (!baseXML && !derivedXML) {
        cache.set(candidate, null);
        return null;
    }
    const merged = parseAnnotations(baseXML);
    // Merge derived (skin tone variants, ZWJ sequences) on top.
    const derived = parseAnnotations(derivedXML);
    for (const [cp, entry] of derived) {
        const existing = merged.get(cp);
        if (existing)
            merged.set(cp, {
                tts: existing.tts ?? entry.tts,
                keywords: existing.keywords ?? entry.keywords,
            });
        else merged.set(cp, entry);
    }
    cache.set(candidate, merged);
    return merged;
}

/** Resolve the merged CLDR map for a supported locale, walking the candidate
 * list. Region-specific CLDR files (e.g. sv_FI, ar_SA, es_MX) only contain
 * entries that differ from the language base, so we layer the language map
 * underneath the region overrides. Returns { used, map } where `used` lists
 * the candidates that contributed entries. */
async function loadCLDRForLocale(locale, cache) {
    const candidates = LocaleToCLDR[locale];
    if (!candidates) return { used: [], map: null };
    const merged = new Map();
    const used = [];
    // Iterate in priority order; first occurrence wins per emoji.
    for (const candidate of candidates) {
        const map = await loadCLDRForCandidate(candidate, cache);
        if (!map || map.size === 0) continue;
        used.push(candidate);
        for (const [cp, entry] of map) {
            const existing = merged.get(cp);
            if (existing) {
                merged.set(cp, {
                    tts: existing.tts ?? entry.tts,
                    keywords: existing.keywords ?? entry.keywords,
                });
            } else {
                merged.set(cp, entry);
            }
        }
    }
    return { used, map: merged.size > 0 ? merged : null };
}

/** Build the per-locale emoji array for a single emoji entry. Falls back
 * through the locale's CLDR data, then English CLDR, then codes.txt. */
function buildEntry(entry, cldrMap, englishMap) {
    const emoji = stripVariationSelectors(hexToEmoji(entry.key));
    const cldr = cldrMap?.get(emoji);
    const english = englishMap?.get(emoji);
    const tts = cldr?.tts ?? english?.tts ?? entry.name.toLowerCase() ?? '';
    const keywords =
        cldr?.keywords && cldr.keywords.length > 0
            ? cldr.keywords
            : english?.keywords ?? [];
    // Deduplicate while preserving order, and drop the tts from the keyword
    // list to avoid redundancy. The first array element is always the tts.
    const seen = new Set([tts.toLowerCase()]);
    const dedupedKeywords = [];
    for (const k of keywords) {
        const lower = k.toLowerCase();
        if (seen.has(lower)) continue;
        seen.add(lower);
        dedupedKeywords.push(k);
    }
    return [tts, ...dedupedKeywords];
}

async function main() {
    const supported = readSupportedLocales();
    const emojiCodes = readEmojiCodes();
    console.log(
        `Generating emoji translations for ${supported.length} locales (${emojiCodes.length} emoji entries each)`,
    );

    const cldrCache = new Map();
    // Load English CLDR first so it can serve as fallback for everything else.
    const englishResult = await loadCLDRForCandidate('en', cldrCache);
    if (!englishResult)
        throw new Error('Could not fetch English CLDR annotations.');

    for (const locale of supported) {
        const { used, map } = await loadCLDRForLocale(locale, cldrCache);
        const cldrMap = map ?? englishResult;
        const cldrEntries = map ? map.size : 0;
        const obj = {};
        let cldrCovered = 0;
        for (const entry of emojiCodes) {
            const emojiChar = stripVariationSelectors(hexToEmoji(entry.key));
            if (cldrMap.has(emojiChar)) cldrCovered++;
            obj[entry.key] = buildEntry(entry, cldrMap, englishResult);
        }
        const dir = path.join(ROOT, 'static', 'locales', locale);
        if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
        const file = path.join(dir, `${locale}-emojis.json`);
        writeFileSync(file, JSON.stringify(obj, null, 4) + '\n');
        const usedLabel = used.length > 0 ? used.join('+') : 'en (fallback)';
        console.log(
            `  ${locale.padEnd(12)} ← CLDR ${usedLabel.padEnd(12)} (${cldrEntries} entries, ${cldrCovered}/${emojiCodes.length} matched) → ${file}`,
        );
    }
    console.log('Done.');
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
