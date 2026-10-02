import getPreferredSpaces from '#parser/getPreferredSpaces.ts';
import TableLiteral from '#nodes/TableLiteral.ts';
import { parseCSV } from '#values/export/csv.ts';

/**
 * Whether pasted text looks enough like CSV to try reading it as a table.
 *
 * The character class is "anything that isn't a separator or a quote" rather
 * than a list of ASCII characters: the list refused every non-Latin cell, so a
 * table of Japanese or emoji — which Wordplay content very often is — pasted
 * back in as plain text rather than as the table it came from.
 */
export function isCSV(text: string): boolean {
    return /^(('|“|"|”)?[^,\n'"“”]*('|"|“|”)?(,|\n|\\Z)\s*){5,}/.test(
        text.trim(),
    );
}

/**
 * The table this text describes, or undefined if it doesn't describe one.
 *
 * Separate from `interpret` because two places ask: the editor, which wants the code to
 * paste, and the add-source dialog, which wants to say how many rows and columns it read
 * before a creator commits to a file of them. One decider either way.
 */
export function toTable(text: string): TableLiteral | undefined {
    if (!isCSV(text)) return undefined;
    const data = parseCSV(text.trim());
    // Only treat this as a table if at least one line actually has commas
    // separating two or more values. Otherwise a column of newline-separated
    // text literals (with no commas) would be misread as CSV.
    if (!data.some((row) => row.length >= 2)) return undefined;
    return TableLiteral.from(data);
}

/** See if this is a kind of text we can convert into something Wordplay formatted. */
export default function interpret(text: string): string {
    // Does it seem like CSV data? Convert it to a table.
    const table = toTable(text);
    return table === undefined
        ? text
        : table.toWordplay(getPreferredSpaces(table));
}
