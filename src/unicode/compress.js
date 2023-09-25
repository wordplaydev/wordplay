import * as fs from 'fs';

function getEmojis() {
    // We also have an emoji file with categories.
    // We include this in the data we generate.
    const emojiText = fs
        .readFileSync('emojis.csv')
        .toString('utf8', 0, data.length);
    // Get the roes
    const emojiLines = emojiText.split('\n').slice(1);

    const emojis = new Map();

    for (const line of emojiLines) {
        const columns = line.split(',');
        const group = columns[0];
        const subgroup = columns[1];
        const codepoint = columns[2];

        emojis.set(codepoint, { group, subgroup });
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
        const emoji = emojis.get(hex);
        if (
            categoryChar !== 'C' &&
            categoryChar !== 'Z' &&
            categoryChar !== 'M'
        )
            filtered += `${hex};${name};${category};${
                emoji ? emoji.group : ''
            };${emoji ? emoji.subgroup : ''}\n`;
    }
}

fs.writeFileSync('codes.txt', filtered.trim());
