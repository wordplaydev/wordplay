// Generated by unicode/compress.js. Run with Node.
import UnicodeDataTxt from './codes.txt?raw';

type Codepoint = {
    hex: number;
    name: string;
    category: string;
    emoji: { group: string; subgroup: string } | undefined;
};

const codepoints: Codepoint[] = [];

for (const entry of UnicodeDataTxt.split('\n')) {
    const [code, name, category, group, subgroup] = entry.split(';');
    codepoints.push({
        hex: parseInt(code, 16),
        name: name.toLowerCase(),
        category,
        emoji: group && subgroup ? { group, subgroup } : undefined,
    });
}

export function getUnicodeNamed(name: string) {
    name = name.toLowerCase();
    return codepoints.filter((point) => point.name.includes(name));
}

export function getEmoji() {
    return codepoints.filter((point) => point.emoji !== undefined);
}
