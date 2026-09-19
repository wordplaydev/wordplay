import UnicodeString from '@unicode/UnicodeString';

/**
 * Characters no file name may contain: the ASCII controls, DEL, and the nine
 * Windows forbids. The separator matters most — a project named `cats/dogs`
 * would otherwise become a folder.
 */
const Forbidden = /[\u0000-\u001f\u007f/\\:*?"<>|]+/g;

/** What Windows refuses at either end of a name, and what hides a file on
 *  every Unix if it leads. */
const Trimmed = /^[.\s-]+|[.\s-]+$/g;

/** Names MS-DOS reserved, which Windows still refuses with or without an
 *  extension. A project called `CON` is unlikely and costs one regex to
 *  survive. */
const Reserved = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;

/** How much of a name a path keeps. Long enough to recognize a project by,
 *  short enough that the id, the extension, and the folders above it stay
 *  inside the path limits every desktop still has. */
const MaxGraphemes = 48;
const MaxBytes = 120;

const encoder = new TextEncoder();

/** As much of a name as a file system will safely carry, or the empty string
 *  when nothing of it survives. */
export default function safeName(name: string): string {
    // Normalize first: a decomposed name and a composed one are the same name,
    // and only one of them is what a file system will show back.
    const cleaned = new UnicodeString(name)
        .getText()
        .replace(Forbidden, '-')
        .replace(Trimmed, '');

    // Truncate by grapheme, never by code unit: a code-unit slice cuts
    // surrogate pairs in half and splits ZWJ sequences into their parts, and
    // Wordplay project names are very often a single emoji.
    let kept = new UnicodeString(cleaned).getGraphemes().slice(0, MaxGraphemes);

    // Then by bytes, because 48 graphemes of emoji is several hundred of them.
    while (kept.length > 0 && encoder.encode(kept.join('')).length > MaxBytes)
        kept = kept.slice(0, -1);

    const trimmed = kept.join('').replace(Trimmed, '');
    return Reserved.test(trimmed) ? `_${trimmed}` : trimmed;
}
