import * as fs from 'fs';

// This file should come from https://www.unicode.org/Public/UCD/latest/ucd/UnicodeData.txt.
// The file's format is specified in https://www.unicode.org/L2/L1999/UnicodeData.html.
const data = fs.readFileSync('UnicodeData.txt');
const text = data.toString('ascii', 0, data.length);

let filtered = '';

for (const entry of text.split('\n')) {
    const [hex, name, category] = entry.split(';');
    if (hex !== undefined && name !== undefined && category !== undefined) {
        const categoryChar = category.charAt(0);
        if (
            categoryChar !== 'C' &&
            categoryChar !== 'Z' &&
            categoryChar !== 'M'
        )
            filtered += `${hex};${name};${category}\n`;
    }
}

fs.writeFileSync('codes.txt', filtered.trim());
