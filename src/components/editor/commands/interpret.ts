import getPreferredSpaces from '@parser/getPreferredSpaces';
import TableLiteral from '@nodes/TableLiteral';
import { parseCSV } from '@values/export/csv';

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

/** See if this is a kind of text we can convert into something Wordplay formatted. */
export default function interpret(text: string): string {
    // Does it seem like CSV data? Convert it to a table.
    if (isCSV(text)) {
        const data = parseCSV(text.trim());

        // Only treat this as a table if at least one line actually has commas
        // separating two or more values. Otherwise a column of newline-separated
        // text literals (with no commas) would be misread as CSV.
        if (data.some((row) => row.length >= 2)) {
            const table = TableLiteral.from(data);
            if (table) return table.toWordplay(getPreferredSpaces(table));
        }
    }

    return text;
}
