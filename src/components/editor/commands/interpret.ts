import getPreferredSpaces from '@parser/getPreferredSpaces';
import TableLiteral from '@nodes/TableLiteral';

export function isCSV(text: string): boolean {
    return /^(('|“|"|”)?[a-zA-Z0-9.%&-() _]*('|"|“|”)?(,|\n|\\Z)\s*){5,}/g.test(
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

/** Convert a CSV string into a 2D array of strings */
function parseCSV(data: string, fieldSep = ',', newLine = '\n'): string[][] {
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
