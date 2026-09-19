/**
 * Reading and writing CSV text, and nothing about Wordplay values.
 *
 * The reader was already here — pasting CSV into the editor becomes a
 * `TableLiteral` (`interpret.ts`) — and the writer is its inverse, so the two
 * live together and are tested against each other rather than separately. That
 * pairing is the point: a table exported to CSV and pasted back should be the
 * same table.
 *
 * Deliberately free of `Value` imports. `interpret.ts` sits on the editor's
 * paste path, and mapping values to cells (which needs the whole value graph
 * and a locale) belongs a layer up, in `grid.ts`.
 */

/** What RFC 4180 requires quoting: the delimiter, the quote itself, and either
 *  line ending character. */
const NeedsQuoting = /[",\r\n]/;

/** One field, quoted only when it has to be. Quoting everything would round-trip
 *  equally well but makes the file unreadable to the person opening it, which is
 *  most of why anyone exports a CSV. */
export function escapeCSVField(text: string): string {
    return NeedsQuoting.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

/**
 * Rows of already-stringified cells as CSV text.
 *
 * CRLF endings, as RFC 4180 specifies and as Excel expects; `parseCSV` strips
 * the CR, so this still round-trips.
 */
export function writeCSVRows(rows: readonly (readonly string[])[]): string {
    return rows.map((row) => row.map(escapeCSVField).join(',')).join('\r\n');
}

/**
 * The bytes to save as a `.csv`, which are not simply the text.
 *
 * A byte order mark leads: Excel on Windows reads an unmarked UTF-8 file in its
 * legacy code page, and Wordplay content — a creator's table, a teacher's roster
 * — is very often not Latin. Anything put on the *clipboard* must use the text
 * instead: a mark pasted back into the editor lands inside the first header
 * cell.
 */
export function csvFileBytes(text: string): Uint8Array {
    return new TextEncoder().encode(`\uFEFF${text}`);
}

/** Convert a CSV string into a 2D array of strings */
export function parseCSV(
    data: string,
    fieldSep = ',',
    newLine = '\n',
): string[][] {
    const nSep = '\x1D';
    const nSepRe = new RegExp(nSep, 'g');
    const qSep = '\x1E';
    const qSepRe = new RegExp(qSep, 'g');
    const cSep = '\x1F';
    const cSepRe = new RegExp(cSep, 'g');
    const fieldRe = new RegExp(
        '(^|[' +
            fieldSep +
            '\\n])"([^"]*(?:""[^"]*)*)"(?=($|[' +
            fieldSep +
            '\\n]))',
        'g',
    );
    return data
        .replace(/\r/g, '')
        .replace(/\n+$/, '')
        .replace(fieldRe, (match, p1, p2) => {
            return (
                p1 +
                p2.replace(/\n/g, nSep).replace(/""/g, qSep).replace(/,/g, cSep)
            );
        })
        .split(/\n/)
        .map((line) => {
            return line
                .split(fieldSep)
                .map((cell) =>
                    cell
                        .replace(nSepRe, newLine)
                        .replace(qSepRe, '"')
                        .replace(cSepRe, ','),
                );
        });
}
