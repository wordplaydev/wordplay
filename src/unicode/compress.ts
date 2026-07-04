// Regenerate static/unicode/codes.txt by fetching the latest Unicode tables
// from unicode.org. Combines UnicodeData.txt (every printable codepoint with
// its General_Category), Scripts.txt (per-codepoint ISO 15924 script via
// long-name aliases from PropertyValueAliases.txt), and emoji-test.txt
// (emoji groups, subgroups, and fully-qualified sequences) into a single
// semicolon-separated file.
//
// codes.txt has no names (emoji names come from per-locale CLDR data; see
// src/util/verify-locales/generateEmojis.ts). Names for everything else are
// written to a sibling glyph-names.txt: English Unicode names for
// symbols/letters, and Unihan definitions + pinyin for Han (whose Unicode
// names are just the codepoint). Large blocks that UnicodeData compresses into
// First/Last markers (CJK ideographs, Hangul syllables, …) are expanded here so
// every character is browsable and searchable.
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
import zlib from 'zlib';
import { fileURLToPath } from 'url';

import { EmojiGroups, EmojiSubgroups } from '@unicode/emoji.ts';
import { Scripts } from '@locale/Scripts.ts';
// Only enumerate codepoints some bundled font can actually draw — the glyph
// chooser filters to these anyway, so shipping the ~65k CJK-extension (and
// other) codepoints no font covers is pure weight. This couples codes.txt to
// the bundled fonts: rerun `npm run codes` after adding/removing fonts.
import { isCodepointRenderable } from '@basis/faces/renderable.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const OUTPUT_PATH = path.join(ROOT, 'static', 'unicode', 'codes.txt');
const NAMES_PATH = path.join(ROOT, 'static', 'unicode', 'glyph-names.txt');

const UNICODE_DATA_URL =
    'https://www.unicode.org/Public/UCD/latest/ucd/UnicodeData.txt';
const EMOJI_TEST_URL =
    'https://www.unicode.org/Public/emoji/latest/emoji-test.txt';
const SCRIPTS_URL = 'https://www.unicode.org/Public/UCD/latest/ucd/Scripts.txt';
const PROPERTY_VALUE_ALIASES_URL =
    'https://www.unicode.org/Public/UCD/latest/ucd/PropertyValueAliases.txt';
// Han meaning + pronunciation: UnicodeData names CJK ideographs algorithmically
// (e.g. "CJK UNIFIED IDEOGRAPH-4E2D"), so their real definitions and pinyin come
// from the Unihan database instead. Unihan ships as a zip; we extract just the
// readings file (no external unzip dependency; see extractFromZip).
const UNIHAN_ZIP_URL =
    'https://www.unicode.org/Public/UCD/latest/ucd/Unihan.zip';

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

/** Extract one file from a zip Buffer using the central directory, inflating
 * DEFLATE entries with Node's built-in zlib — a minimal dependency-free reader
 * (Unihan.zip is a standard, non-zip64 archive). */
function extractFromZip(zip: Buffer, filename: string): string {
    const EOCD_SIG = 0x06054b50;
    const CD_SIG = 0x02014b50;
    let eocd = -1;
    for (let i = zip.length - 22; i >= Math.max(0, zip.length - 65557); i--)
        if (zip.readUInt32LE(i) === EOCD_SIG) {
            eocd = i;
            break;
        }
    if (eocd < 0) throw new Error('Zip end-of-central-directory not found');
    const count = zip.readUInt16LE(eocd + 10);
    let p = zip.readUInt32LE(eocd + 16);
    for (let n = 0; n < count; n++) {
        if (zip.readUInt32LE(p) !== CD_SIG)
            throw new Error('Corrupt zip central directory');
        const method = zip.readUInt16LE(p + 10);
        const compSize = zip.readUInt32LE(p + 20);
        const nameLen = zip.readUInt16LE(p + 28);
        const extraLen = zip.readUInt16LE(p + 30);
        const commentLen = zip.readUInt16LE(p + 32);
        const localOffset = zip.readUInt32LE(p + 42);
        const name = zip.toString('utf8', p + 46, p + 46 + nameLen);
        if (name === filename) {
            const lNameLen = zip.readUInt16LE(localOffset + 26);
            const lExtraLen = zip.readUInt16LE(localOffset + 28);
            const start = localOffset + 30 + lNameLen + lExtraLen;
            const data = zip.subarray(start, start + compSize);
            const raw = method === 0 ? data : zlib.inflateRawSync(data);
            return raw.toString('utf8');
        }
        p += 46 + nameLen + extraLen + commentLen;
    }
    throw new Error(`${filename} not found in zip`);
}

async function fetchUnihanReadings(): Promise<string> {
    console.log(`Fetching ${UNIHAN_ZIP_URL} ...`);
    const res = await fetch(UNIHAN_ZIP_URL);
    if (!res.ok)
        throw new Error(`Failed to fetch ${UNIHAN_ZIP_URL}: ${res.status}`);
    const zip = Buffer.from(await res.arrayBuffer());
    return extractFromZip(zip, 'Unihan_Readings.txt');
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

/** Strip pinyin tone marks (and fold ü→u) so a toneless query like "shui"
 * matches "shuǐ" — foldEntry in the search only lowercases, it doesn't remove
 * diacritics. */
function toneless(pinyin: string): string {
    return pinyin.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

interface UnihanEntry {
    definition?: string;
    /** Mandarin readings, toned (e.g. "shuǐ"). */
    pinyin: string[];
}

/** Parse Unihan_Readings.txt: tab-separated `U+<hex>\t<field>\t<value>` lines.
 * We keep kDefinition (English gloss) and kMandarin (space-separated pinyin). */
function parseUnihan(text: string): Map<number, UnihanEntry> {
    const map = new Map<number, UnihanEntry>();
    for (const rawLine of text.split('\n')) {
        if (rawLine.startsWith('#') || rawLine.trim() === '') continue;
        const [codeField, field, value] = rawLine.split('\t');
        if (!codeField?.startsWith('U+') || !field || !value) continue;
        const cp = parseInt(codeField.slice(2), 16);
        if (Number.isNaN(cp)) continue;
        const entry = map.get(cp) ?? { pinyin: [] };
        if (field === 'kDefinition') entry.definition = value.trim();
        else if (field === 'kMandarin')
            entry.pinyin = value.trim().split(/\s+/).filter(Boolean);
        else continue;
        map.set(cp, entry);
    }
    return map;
}

/** Title-case a screaming Unicode name for display: "N-ARY SUMMATION" →
 * "N-Ary Summation". */
function titleCase(name: string): string {
    return name.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Whether a UnicodeData field-1 name is a real, human-meaningful name (not a
 * `<range marker>` or an algorithmic `… IDEOGRAPH-XXXX`). */
function isRealName(name: string): boolean {
    return !name.startsWith('<') && !/IDEOGRAPH-[0-9A-F]+$/.test(name);
}

async function main() {
    const [unicodeData, emojiText, scriptsText, aliasesText, unihanText] =
        await Promise.all([
            fetchText(UNICODE_DATA_URL),
            fetchText(EMOJI_TEST_URL),
            fetchText(SCRIPTS_URL),
            fetchText(PROPERTY_VALUE_ALIASES_URL),
            fetchUnihanReadings(),
        ]);

    const unihan = parseUnihan(unihanText);
    console.log(`Parsed ${unihan.size} Unihan readings.`);

    const emojis = parseEmojis(emojiText);
    console.log(`Parsed ${emojis.size} base emojis.`);

    const longToIso = parseScriptAliases(aliasesText);
    const scriptRanges = parseScripts(scriptsText, longToIso);
    console.log(`Parsed ${scriptRanges.length} script ranges.`);

    let output = '';
    let names = '';
    let nonEmojiCount = 0;
    let emojiCount = 0;
    let nameCount = 0;
    const scriptsSeen = new Set<string>();

    /** Format a codepoint the way codes.txt / codepointKey does: uppercase
     * hex, min 4 digits. */
    const key = (cp: number) => cp.toString(16).toUpperCase().padStart(4, '0');

    /** Emit one non-emoji codepoint's codes.txt row + glyph-names.txt entry.
     * `rawName` is the UnicodeData field-1 name (a real name, or a range
     * marker for range-expanded codepoints). */
    const emit = (cp: number, category: string, rawName: string) => {
        // Skip codepoints no bundled font can render — the chooser hides them
        // anyway. Keeps codes.txt to the browsable universe.
        if (!isCodepointRenderable(cp)) return;
        const hex = key(cp);
        const script = lookupScript(scriptRanges, cp);
        if (script) scriptsSeen.add(script);
        output += `${hex};${category};${script}\n`;
        nonEmojiCount++;

        // Names/keywords for search + tooltips. Emoji get theirs from the
        // per-locale CLDR maps, so they're excluded here.
        const uni = unihan.get(cp);
        if (uni?.definition) {
            // Han: English gloss + toned & toneless pinyin keywords.
            const pinyin = uni.pinyin.flatMap((p) =>
                p === toneless(p) ? [p] : [p, toneless(p)],
            );
            names += [hex, uni.definition, ...pinyin].join('\t') + '\n';
            nameCount++;
        } else if (isRealName(rawName)) {
            names += `${hex}\t${titleCase(rawName)}\n`;
            nameCount++;
        }
    };

    const lines = unicodeData.split('\n');
    for (let i = 0; i < lines.length; i++) {
        const [hex, name, category] = lines[i].split(';');
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

        // UnicodeData compresses large blocks (CJK ideographs, Hangul
        // syllables, …) into a `<…, First>` / `<…, Last>` marker pair. Expand
        // them so every character is browsable and searchable, not just the
        // block endpoints.
        if (name.endsWith(', First>')) {
            const start = parseInt(hex, 16);
            const end = parseInt(lines[++i].split(';')[0], 16);
            for (let cp = start; cp <= end; cp++) emit(cp, category, name);
            continue;
        }

        const emoji = emojis.get(hex);
        if (emoji === undefined) {
            emit(parseInt(hex, 16), category, name);
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
            const script = lookupScript(scriptRanges, parseInt(hex, 16));
            if (script) scriptsSeen.add(script);
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

    fs.writeFileSync(
        NAMES_PATH,
        '# GENERATED by `npm run codes` — English glyph names for search + tooltips.\n' +
            '# <codepointKey>\\t<name>[\\t<keyword>...] — Unicode names for symbols/letters,\n' +
            '# Unihan definitions + pinyin for Han. Emoji names come from the CLDR emoji maps.\n' +
            names.trimEnd() +
            '\n',
    );
    console.log(
        `Wrote ${NAMES_PATH} (${nameCount} named codepoints, ${(names.length / 1024 / 1024).toFixed(1)} MB).`,
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
