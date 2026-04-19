import * as fs from 'fs';

import { EmojiGroups, EmojiSubgroups } from './emoji.ts';

// Shorter versions of categories

function getEmojis(): Map<
    string,
    {
        group: string;
        subgroup: string;
        variations: { codepoints: string[]; name: string }[];
    }
> {
    // This file should come from https://www.unicode.org/Public/17.0.0/emoji/emoji-test.txt.
    // It contains all of the emoji groups, subgroups, and sequences.
    const emojiRows = fs
        .readFileSync('emoji-test.txt')
        .toString('utf8', 0, data.length)
        .split('\n');

    const emojis = new Map();

    const GroupPrefix = '# group: ';
    const SubgroupPrefix = '# subgroup: ';

    // The latest group and subgroup
    let group = '';
    let subgroup = '';

    for (const line of emojiRows) {
        // Is it a comment?
        if (line.startsWith('#')) {
            if (line.startsWith(GroupPrefix)) {
                group = line.substring(GroupPrefix.length);
            } else if (line.startsWith(SubgroupPrefix)) {
                subgroup = line.substring(SubgroupPrefix.length);
            }
            // Otherwise, it's a comment we don't care about.
            else continue;
        } else if (line.trim() === '') {
            // Blank line, ignore.
            continue;
        } else {
            const [codepointString, meta] = line.split(';');
            const codepoints = codepointString.trim().split(' ');

            const status = meta.split('#')[0].trim();
            const description = meta.split('#')[1].trim();
            const version = description.match(/E[0-9.]+/);
            const name = version
                ? description.substring(
                      description.indexOf(version[0]) + version[0].length + 1,
                  )
                : '';

            if (status === 'fully-qualified' && codepoints.at(-1) !== 'FE0F') {
                const base = codepoints[0];
                if (emojis.has(base)) {
                    const emoji = emojis.get(base);
                    if (emoji) emoji.variations.push({ codepoints, name });
                } else {
                    emojis.set(codepoints[0], {
                        group,
                        subgroup,
                        variations:
                            codepoints.length > 1
                                ? [{ codepoints: codepoints, name }]
                                : [],
                    });
                }
            }
        }
    }
    return emojis;
}

// This file should come from https://www.unicode.org/Public/UCD/latest/ucd/UnicodeData.txt.
// The file's format is specified in https://www.unicode.org/L2/L1999/UnicodeData.html.
const data = fs.readFileSync('UnicodeData.txt');
const text = data.toString('ascii', 0, data.length);

const emojis = getEmojis();

let filtered = '';

for (const entry of text.split('\n')) {
    const [hex, name, category] = entry.split(';');
    if (hex !== undefined && name !== undefined && category !== undefined) {
        const categoryChar = category.charAt(0);
        // See if there are emoji variations for this.
        const emoji = emojis.get(hex);

        // Include any codepoint that isn't a control character, separator, or mark.
        if (
            categoryChar !== 'C' &&
            categoryChar !== 'Z' &&
            categoryChar !== 'M'
        ) {
            // No emoji? Add the glyph solo.
            if (emoji === undefined)
                filtered += [hex, name, category].join(';') + '\n';
            if (emoji) {
                const group = EmojiGroups[emoji.group];
                const subgroup = EmojiSubgroups[emoji.subgroup];
                if (!group)
                    throw new Error(`Unknown emoji group: ${emoji.group}`);
                if (!subgroup)
                    throw new Error(
                        `Unknown emoji subgroup: ${emoji.subgroup}`,
                    );
                filtered +=
                    [hex, name, category, group, subgroup].join(';') + '\n';

                for (const variation of emoji.variations) {
                    filtered +=
                        [
                            variation.codepoints.join(' '),
                            variation.name,
                            category,
                            group,
                            subgroup,
                        ].join(';') + '\n';
                }
            }
        }
    }
}

fs.writeFileSync('../static/unicode/codes.txt', filtered.trim());
