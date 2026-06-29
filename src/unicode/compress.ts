// Regenerate static/unicode/codes.txt by fetching the latest Unicode tables
// from unicode.org. Combines UnicodeData.txt (every printable codepoint with
// its General_Category), Scripts.txt (per-codepoint ISO 15924 script via
// long-name aliases from PropertyValueAliases.txt), and emoji-test.txt
// (emoji groups, subgroups, and fully-qualified sequences) into a single
// semicolon-separated file.
//
// The output omits the human-readable Unicode name. Emoji names come from
// per-locale CLDR data (see src/util/verify-locales/generateEmojis.ts), so storing the
// English name in codes.txt was redundant.
//
// Output format, one entry per line:
//   <hex>;<category>;<script>                          - non-emoji codepoints
//   <hex>;<category>;<script>;<group>;<subgroup>       - emojis (single or sequence)
//
// where <hex> is space-separated uppercase codepoints (e.g. "1F600",
// "0023 FE0F 20E3"), <category> is the General_Category from UnicodeData.txt
// (e.g. "Po", "Ll"), <script> is the ISO 15924 4-letter code (e.g. "Latn",
// "Cyrl") and is empty for Common / Inherited / Unknown, and
// <group>/<subgroup> are the short codes defined in emoji.ts.
//
// Script display labels (English names, native names, writing direction) for
// every ISO 15924 code live in src/locale/Scripts.ts. When `scriptsSeen`
// below contains a code missing from that map, this script logs a warning so
// it can be added before the next release — the codes.txt entry will
// otherwise render with its raw ISO code in the glyph picker.
//
// Run: npm run codes

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { EmojiGroups, EmojiSubgroups } from '@unicode/emoji.ts';
import { Scripts } from '@locale/Scripts.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const OUTPUT_PATH = path.join(ROOT, 'static', 'unicode', 'codes.txt');

const UNICODE_DATA_URL =
    'https://www.unicode.org/Public/UCD/latest/ucd/UnicodeData.txt';
const EMOJI_TEST_URL =
    'https://www.unicode.org/Public/emoji/latest/emoji-test.txt';
const SCRIPTS_URL = 'https://www.unicode.org/Public/UCD/latest/ucd/Scripts.txt';
const PROPERTY_VALUE_ALIASES_URL =
    'https://www.unicode.org/Public/UCD/latest/ucd/PropertyValueAliases.txt';

/** Scripts to drop from the codes.txt script column. Common, Inherited, and
 * Unknown aren't real "user-pickable" scripts — they cover punctuation,
 * combining marks, and unassigned codepoints respectively. */
const EXCLUDED_SCRIPTS = new Set(['Zyyy', 'Zinh', 'Zzzz']);

async function fetchText(url: string): Promise<string> {
    console.log(`Fetching ${url} ...`);
    const res = await fetch(url);
    if (!res.ok)
        throw new Error(
            `Failed to fetch ${url}: ${res.status} ${res.statusText}`,
        );
    return await res.text();
}

interface EmojiInfo {
    group: string;
    subgroup: string;
    /** Multi-codepoint sequences for this base emoji (skin tones, ZWJ
     * sequences, etc.). Solo single-codepoint emojis have an empty list. */
    variations: { codepoints: string[] }[];
}

/** Parse PropertyValueAliases.txt to build a map from a script's long English
 * name (e.g. "Latin", "Greek_And_Coptic") to its ISO 15924 4-letter code
 * (e.g. "Latn"). Aliases come in lines like:
 *   sc ; Adlm ; Adlam
 *   sc ; Latn ; Latin
 * with optional extra aliases after the long name. We index by every alias
 * (with both '_' and ' ' separators) since Scripts.txt uses underscored long
 * names while later UCD versions occasionally drift. */
function parseScriptAliases(text: string): Map<string, string> {
    const longToIso = new Map<string, string>();
    for (const rawLine of text.split('\n')) {
        const line = rawLine.split('#')[0].trim();
        if (!line) continue;
        const parts = line.split(';').map((p) => p.trim());
        if (parts[0] !== 'sc') continue;
        const iso = parts[1];
        if (!iso) continue;
        for (const alias of parts.slice(2)) {
            if (!alias) continue;
            longToIso.set(alias, iso);
            longToIso.set(alias.replace(/_/g, ' '), iso);
        }
    }
    return longToIso;
}

interface ScriptRange {
    start: number;
    end: number;
    script: string;
}

/** Parse Scripts.txt into a sorted array of (start, end, iso) ranges. Lines
 * look like "0041..005A    ; Latin # L&  [26] LATIN CAPITAL LETTER A..." or
 * "00AA          ; Latin # Lo       FEMININE ORDINAL INDICATOR". Unknown
 * long-names (shouldn't happen, but UCD can add scripts) fall back to using
 * the long name itself, which downstream code will treat as an unknown
 * script and exclude from the picker. */
function parseScripts(
    text: string,
    longToIso: Map<string, string>,
): ScriptRange[] {
    const ranges: ScriptRange[] = [];
    for (const rawLine of text.split('\n')) {
        const line = rawLine.split('#')[0].trim();
        if (!line) continue;
        const [rangePart, longName] = line.split(';').map((p) => p.trim());
        if (!rangePart || !longName) continue;
        const iso = longToIso.get(longName) ?? longName;
        const [startHex, endHex] = rangePart.split('..');
        const start = parseInt(startHex, 16);
        const end = endHex !== undefined ? parseInt(endHex, 16) : start;
        if (Number.isNaN(start) || Number.isNaN(end)) continue;
        ranges.push({ start, end, script: iso });
    }
    ranges.sort((a, b) => a.start - b.start);
    return ranges;
}

/** Binary search the script ranges for a single codepoint. Returns the ISO
 * code or an empty string for "no script" (the codepoint falls in
 * Common/Inherited/Unknown or no Scripts.txt range matched it at all). */
function lookupScript(ranges: ScriptRange[], cp: number): string {
    let lo = 0;
    let hi = ranges.length - 1;
    while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        const r = ranges[mid];
        if (cp < r.start) hi = mid - 1;
        else if (cp > r.end) lo = mid + 1;
        else return EXCLUDED_SCRIPTS.has(r.script) ? '' : r.script;
    }
    return '';
}

/** Parse emoji-test.txt into a map keyed by base codepoint hex. We only keep
 * fully-qualified sequences whose final codepoint isn't FE0F (the variation
 * selector), to mirror the convention codes.txt has historically used. */
function parseEmojis(text: string): Map<string, EmojiInfo> {
    const emojis = new Map<string, EmojiInfo>();
    const GroupPrefix = '# group: ';
    const SubgroupPrefix = '# subgroup: ';
    let group = '';
    let subgroup = '';

    for (const line of text.split('\n')) {
        if (line.startsWith('#')) {
            if (line.startsWith(GroupPrefix))
                group = line.substring(GroupPrefix.length).trim();
            else if (line.startsWith(SubgroupPrefix))
                subgroup = line.substring(SubgroupPrefix.length).trim();
            continue;
        }
        if (line.trim() === '') continue;

        const [codepointString, meta] = line.split(';');
        if (!codepointString || !meta) continue;
        const codepoints = codepointString.trim().split(' ');
        const status = meta.split('#')[0].trim();
        if (status !== 'fully-qualified') continue;
        if (codepoints.at(-1) === 'FE0F') continue;

        const base = codepoints[0];
        const existing = emojis.get(base);
        if (existing) {
            existing.variations.push({ codepoints });
        } else {
            emojis.set(base, {
                group,
                subgroup,
                variations: codepoints.length > 1 ? [{ codepoints }] : [],
            });
        }
    }

    return emojis;
}

async function main() {
    const [unicodeData, emojiText, scriptsText, aliasesText] =
        await Promise.all([
            fetchText(UNICODE_DATA_URL),
            fetchText(EMOJI_TEST_URL),
            fetchText(SCRIPTS_URL),
            fetchText(PROPERTY_VALUE_ALIASES_URL),
        ]);

    const emojis = parseEmojis(emojiText);
    console.log(`Parsed ${emojis.size} base emojis.`);

    const longToIso = parseScriptAliases(aliasesText);
    const scriptRanges = parseScripts(scriptsText, longToIso);
    console.log(`Parsed ${scriptRanges.length} script ranges.`);

    let output = '';
    let nonEmojiCount = 0;
    let emojiCount = 0;
    const scriptsSeen = new Set<string>();

    for (const entry of unicodeData.split('\n')) {
        const [hex, , category] = entry.split(';');
        if (!hex || !category) continue;

        // Skip control, separator, and mark codepoints. The picker never
        // surfaces these and they aren't usable as text content.
        const categoryChar = category.charAt(0);
        if (
            categoryChar === 'C' ||
            categoryChar === 'Z' ||
            categoryChar === 'M'
        )
            continue;

        const script = lookupScript(scriptRanges, parseInt(hex, 16));
        if (script) scriptsSeen.add(script);

        const emoji = emojis.get(hex);
        if (emoji === undefined) {
            output += `${hex};${category};${script}\n`;
            nonEmojiCount++;
        } else {
            const group = EmojiGroups[emoji.group];
            const subgroup = EmojiSubgroups[emoji.subgroup];
            if (!group)
                throw new Error(
                    `Unknown emoji group "${emoji.group}". Add it to EmojiGroups in src/unicode/emoji.ts.`,
                );
            if (!subgroup)
                throw new Error(
                    `Unknown emoji subgroup "${emoji.subgroup}". Add it to EmojiSubgroups in src/unicode/emoji.ts.`,
                );
            output += `${hex};${category};${script};${group};${subgroup}\n`;
            emojiCount++;
            for (const variation of emoji.variations) {
                output += `${variation.codepoints.join(' ')};${category};${script};${group};${subgroup}\n`;
                emojiCount++;
            }
        }
    }

    fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
    fs.writeFileSync(OUTPUT_PATH, output.trimEnd() + '\n');
    console.log(
        `Wrote ${OUTPUT_PATH} (${nonEmojiCount} codepoints, ${emojiCount} emoji rows, ${(output.length / 1024).toFixed(1)} KB).`,
    );

    // Warn about any scripts that codes.txt references but Scripts.ts
    // doesn't catalogue. The picker will fall back to displaying these as
    // raw ISO codes; add entries to src/locale/Scripts.ts to fix.
    const missing = Array.from(scriptsSeen)
        .filter((iso) => !Object.hasOwn(Scripts, iso))
        .sort();
    if (missing.length > 0) {
        console.warn(
            `WARNING: ${missing.length} script(s) in codes.txt are missing from src/locale/Scripts.ts: ${missing.join(', ')}`,
        );
    } else {
        console.log(
            `All ${scriptsSeen.size} scripts referenced in codes.txt are catalogued in src/locale/Scripts.ts.`,
        );
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
