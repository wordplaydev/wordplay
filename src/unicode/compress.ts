// Regenerate static/unicode/codes.txt by fetching the latest Unicode tables
// from unicode.org. Combines UnicodeData.txt (every printable codepoint with
// its General_Category) with emoji-test.txt (emoji groups, subgroups, and
// fully-qualified sequences) into a single semicolon-separated file.
//
// The output omits the human-readable Unicode name. Emoji names come from
// per-locale CLDR data (see scripts/generate-emojis.mjs), so storing the
// English name in codes.txt was redundant.
//
// Output format, one entry per line:
//   <hex>;<category>                          - non-emoji codepoints
//   <hex>;<category>;<group>;<subgroup>       - emojis (single or sequence)
//
// where <hex> is space-separated uppercase codepoints (e.g. "1F600",
// "0023 FE0F 20E3"), <category> is the General_Category from UnicodeData.txt
// (e.g. "Po", "Ll"), and <group>/<subgroup> are the short codes defined in
// emoji.ts.
//
// Run: npm run codes

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { EmojiGroups, EmojiSubgroups } from '@unicode/emoji.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const OUTPUT_PATH = path.join(ROOT, 'static', 'unicode', 'codes.txt');

const UNICODE_DATA_URL =
    'https://www.unicode.org/Public/UCD/latest/ucd/UnicodeData.txt';
const EMOJI_TEST_URL =
    'https://www.unicode.org/Public/emoji/latest/emoji-test.txt';

async function fetchText(url: string): Promise<string> {
    console.log(`Fetching ${url} ...`);
    const res = await fetch(url);
    if (!res.ok)
        throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
    return await res.text();
}

interface EmojiInfo {
    group: string;
    subgroup: string;
    /** Multi-codepoint sequences for this base emoji (skin tones, ZWJ
     * sequences, etc.). Solo single-codepoint emojis have an empty list. */
    variations: { codepoints: string[] }[];
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
    const [unicodeData, emojiText] = await Promise.all([
        fetchText(UNICODE_DATA_URL),
        fetchText(EMOJI_TEST_URL),
    ]);

    const emojis = parseEmojis(emojiText);
    console.log(`Parsed ${emojis.size} base emojis.`);

    let output = '';
    let nonEmojiCount = 0;
    let emojiCount = 0;

    for (const entry of unicodeData.split('\n')) {
        const [hex, , category] = entry.split(';');
        if (!hex || !category) continue;

        // Skip control, separator, and mark codepoints. The picker never
        // surfaces these and they aren't usable as text content.
        const categoryChar = category.charAt(0);
        if (categoryChar === 'C' || categoryChar === 'Z' || categoryChar === 'M')
            continue;

        const emoji = emojis.get(hex);
        if (emoji === undefined) {
            output += `${hex};${category}\n`;
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
            output += `${hex};${category};${group};${subgroup}\n`;
            emojiCount++;
            for (const variation of emoji.variations) {
                output += `${variation.codepoints.join(' ')};${category};${group};${subgroup}\n`;
                emojiCount++;
            }
        }
    }

    fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
    fs.writeFileSync(OUTPUT_PATH, output.trimEnd() + '\n');
    console.log(
        `Wrote ${OUTPUT_PATH} (${nonEmojiCount} codepoints, ${emojiCount} emoji rows, ${(output.length / 1024).toFixed(1)} KB).`,
    );
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
