/**
 * Where text, documentation and formatted text end when a delimiter is missing.
 *
 * `'`, `¶` and `` ` `` open and close with the same character, so the tokenizer can only
 * take turns: the first opens, the next closes. Delete one and every later one swaps roles,
 * to the end of the line for text and of the program for the others, which turns a
 * program's prose into code and its code into prose. But which role a delimiter was written
 * to play shows in what is around it: an opening one has space before it and words after,
 * a closing one the reverse. So the first delimiter whose turn contradicts how it is written
 * is where something is missing, and that is repaired by ending or starting the text where
 * layout says it was meant to, or by letting a delimiter with no partner be neither.
 *
 * None of this is consulted unless the tokenizer was left with something open, so it never
 * changes how a program with all of its delimiters is read.
 */

/** One delimiter of a kind that opens and closes with the same character. */
export type Toggle = {
    kind: 'doc' | 'formatted' | 'text' | 'pattern';
    /** Where the delimiter is, and how long. An opening with no delimiter has no length. */
    offset: number;
    length: number;
    /** What the tokenizer took it to be, by taking turns. */
    role: 'open' | 'close';
    /** For a close, the position in the list of the delimiter it closed. */
    opener: number | undefined;
    /** For one that opened, whether it did so in an example or interpolation inside
     *  something of its own kind: a `¶` in an example in documentation, a quote in an
     *  interpolation in text. */
    inExample: boolean;
    /** For text that opened, the delimiter that would close it. */
    closer: string | undefined;
    /** For an open: its line ended before it was closed, or the program did. */
    endedByLine: boolean;
    unclosed: boolean;
};

/** What to do differently on the next reading, by where in the source. */
export type Repairs = {
    /** Where to end the innermost text, documentation, formatted text or example. */
    closes: Map<number, Toggle['kind'] | 'code'>;
    /** Where documentation or text begins without a delimiter, and for text, what closes it. */
    opens: Map<number, { kind: 'doc' } | { kind: 'text'; close: string }>;
    /** Delimiters that neither open nor close. */
    inert: Set<number>;
};

export function noRepairs(): Repairs {
    return { closes: new Map(), opens: new Map(), inert: new Set() };
}

/** How many times to reread before settling for what there is. */
export const MaxRepairs = 8;

// What can come before an opening delimiter: space, or what a value follows.
const BeforeOpen = /[\s([{:•,⎡]/u;
// What can come after a closing one: space, a close, or what goes on from a value.
const AfterClose = /[\s)\]}⎦/.,]/u;
const Space = /\s/u;
// A line that begins with three plain words in a row is prose, which code almost never is:
// it names things one at a time, with delimiters and operators between them.
const Prose = /^\s*(?:[\p{L}\p{M}][\p{L}\p{M}'’-]*[,;:.!?]?\s+){3}/u;

/**
 * Find the first delimiter that contradicts how it is written, or that nothing closed, and
 * add its repair. False if there is nothing more to repair.
 */
export function repair(
    source: string,
    toggles: readonly Toggle[],
    repairs: Repairs,
): boolean {
    const before = (offset: number) => source[offset - 1] ?? '\n';
    const after = (toggle: Toggle) =>
        source[toggle.offset + toggle.length] ?? '\n';
    const lineStart = (offset: number) =>
        source.lastIndexOf('\n', offset - 1) + 1;
    const lineEnd = (offset: number) => {
        const end = source.indexOf('\n', offset);
        return end < 0 ? source.length : end;
    };
    const contentStart = (offset: number) => {
        let start = lineStart(offset);
        while (start < offset && Space.test(source[start] ?? '')) start++;
        return start;
    };
    /** Where the delimiters and space that end a line begin, since those are code's: the
     *  `)` of what text was given to, or the `[` of a list that follows it. */
    const trailStart = (from: number) => {
        let start = lineEnd(from);
        while (start > from && /[\s()[\]{}]/u.test(source[start - 1] ?? ''))
            start--;
        return start;
    };
    const opens = (toggle: Toggle) => {
        const written =
            BeforeOpen.test(before(toggle.offset)) &&
            !Space.test(after(toggle));
        // Documentation is also written on lines of its own, which says as much.
        return toggle.kind === 'doc'
            ? written ||
                  (contentStart(toggle.offset) === toggle.offset &&
                      trailStart(toggle.offset + toggle.length) >
                          toggle.offset + toggle.length)
            : written;
    };
    const closes = (toggle: Toggle) => {
        const written =
            !Space.test(before(toggle.offset)) &&
            AfterClose.test(after(toggle));
        return toggle.kind === 'doc'
            ? written ||
                  (contentStart(toggle.offset) < toggle.offset &&
                      /^[ \t]*$/u.test(
                          source.substring(
                              toggle.offset + toggle.length,
                              lineEnd(toggle.offset),
                          ),
                      ))
            : written;
    };

    /** Add a repair, unless it has been made already, which would be making no progress. */
    const close = (offset: number, kind: Toggle['kind'] | 'code') => {
        if (repairs.closes.has(offset)) return false;
        repairs.closes.set(offset, kind);
        return true;
    };
    const makeInert = (toggle: Toggle) => {
        if (repairs.inert.has(toggle.offset)) return false;
        repairs.inert.add(toggle.offset);
        return true;
    };
    /** True if the line at an offset reads as a line of documentation's prose. */
    const isProse = (start: number) => {
        const line = source.substring(start, lineEnd(start));
        return Prose.test(line) && !line.includes('¶');
    };
    const isBlank = (start: number) =>
        /^\s*$/u.test(source.substring(start, lineEnd(start)));
    /** The end of the last line of prose after a line, across blank lines between paragraphs. */
    const proseEnd = (from: number) => {
        let end = lineEnd(from);
        for (
            let next = end + 1;
            next <= source.length && (isBlank(next) || isProse(next));
            next = lineEnd(next) + 1
        )
            if (isProse(next)) end = lineEnd(next);
        return end;
    };
    /** The start of the first line of prose before a line, likewise. */
    const proseStart = (from: number) => {
        let start = lineStart(from);
        for (
            let previous = lineStart(start - 1);
            start > 0 && (isBlank(previous) || isProse(previous));
            previous = lineStart(previous - 1)
        ) {
            if (isProse(previous)) start = previous;
            if (previous === 0) break;
        }
        return contentStart(start + (source[start] === '\n' ? 1 : 0));
    };
    /** True if an offset is between the `(` and `)` of a definition that begins its line. */
    const inDefinitionInputs = (offset: number) => {
        const before = source.substring(lineStart(offset), offset);
        const header = /^\s*(?:↑\s*)?[•ƒ]\s*[^\s(•:]+[^(\n]*\(/u.exec(before);
        if (header === null) return false;
        let depth = 1;
        for (const character of before.substring(header[0].length))
            if (character === '(') depth++;
            else if (character === ')') depth--;
        return depth > 0;
    };
    /** Where something unclosed is taken to have ended. */
    const endOf = (open: Toggle) => {
        const end = open.offset + open.length;
        // Documentation is prose, for as many lines and paragraphs as read like it.
        if (open.kind === 'doc') return proseEnd(end);
        // A pattern's own delimiters end it, so it runs to the end of its line. Text and
        // formatted text sit inside code, whose closing delimiters end the line.
        return open.kind === 'pattern' ? lineEnd(end) : trailStart(end);
    };

    for (const toggle of toggles) {
        const opening = opens(toggle);
        const closing = closes(toggle);

        // A line with an even number of quotes has nothing missing, however its quotes
        // are spaced: `'hello '` closes after a space, as an opening would be written,
        // and is not one. Only a line with one too many, or too few, is repaired.
        // Unless it is inside an interpolation, where what is missing is a `\`.
        if (
            toggle.kind === 'text' &&
            !toggle.inExample &&
            toggles.filter(
                (other) =>
                    other.kind === 'text' &&
                    other.length > 0 &&
                    lineStart(other.offset) === lineStart(toggle.offset),
            ).length %
                2 ===
                0
        )
            continue;

        // In the inputs of a definition, text can only be a type or a default, each
        // complete on its line. So a quote there that would otherwise be repaired, by
        // ending its text somewhere or beginning it somewhere, is one quote too many
        // or too few, and is left to be neither: repairing it would make text of the
        // inputs around it, and those are what everything else in a program refers to.
        const extra =
            toggle.role === 'close' && opening && !closing
                ? toggles[toggle.opener ?? -1]
                : toggle.role === 'open' &&
                    ((closing && !opening) ||
                        toggle.unclosed ||
                        toggle.endedByLine)
                  ? toggle
                  : undefined;
        if (extra?.kind === 'text' && inDefinitionInputs(extra.offset)) {
            if (makeInert(extra)) return true;
            continue;
        }

        if (toggle.role === 'close' && opening && !closing) {
            // This is written as an opening, so what it closed was never closed.
            const open =
                toggle.opener === undefined
                    ? undefined
                    : toggles[toggle.opener];
            if (open === undefined) continue;
            let end = endOf(open);
            // Text on the same line ends just before this, less the space between them.
            if (open.kind === 'text') {
                end = toggle.offset;
                while (
                    end > open.offset + open.length &&
                    Space.test(source[end - 1] ?? '')
                )
                    end--;
            }
            if (close(end, open.kind)) return true;
        } else if (
            toggle.role === 'open' &&
            closing &&
            !opening &&
            // Not a quote that ends its line after something text is given to, which is
            // written like a close only because its text is on the next line.
            !(
                toggle.kind === 'text' &&
                toggle.endedByLine &&
                after(toggle) === '\n' &&
                BeforeOpen.test(before(toggle.offset))
            )
        ) {
            // This is written as a close, so what it closes was never opened. Inside an
            // example in documentation, or an interpolation in text, it closes that, and
            // it is the example that wasn't closed.
            if (toggle.inExample) {
                if (close(toggle.offset, 'code')) return true;
            }
            // Documentation with something before it on its line began where the line did.
            else if (
                toggle.kind === 'doc' &&
                contentStart(toggle.offset) < toggle.offset &&
                !toggles.some(
                    (other) =>
                        other !== toggle &&
                        other.offset >= lineStart(toggle.offset) &&
                        other.offset < toggle.offset,
                )
            ) {
                // And with the lines of prose above it, where that began.
                const start = Math.min(
                    contentStart(toggle.offset),
                    proseStart(toggle.offset),
                );
                if (!repairs.opens.has(start)) {
                    repairs.opens.set(start, { kind: 'doc' });
                    return true;
                }
            }
            // Text began after whatever came before it on its line: other text, or the
            // delimiter of what it was given to.
            else if (toggle.kind === 'text') {
                const earlier = toggles.findLast(
                    (other) =>
                        other.role === 'close' &&
                        other.offset >= lineStart(toggle.offset) &&
                        other.offset < toggle.offset,
                );
                // With neither on its line, there is no saying where it began.
                let start = earlier
                    ? earlier.offset + earlier.length
                    : toggle.offset;
                if (earlier === undefined) {
                    // The nearest delimiter still open, passing over the ones that close.
                    let depth = 0;
                    for (
                        let at = toggle.offset - 1;
                        at >= lineStart(toggle.offset);
                        at--
                    ) {
                        const character = source[at] ?? '';
                        if (/[)\]}]/u.test(character)) depth++;
                        else if (/[([{]/u.test(character) && depth > 0) depth--;
                        else if (/[([{:]/u.test(character) && depth === 0) {
                            start = at + 1;
                            break;
                        }
                    }
                }
                while (start < toggle.offset && Space.test(source[start] ?? ''))
                    start++;
                if (
                    start < toggle.offset &&
                    !repairs.opens.has(start) &&
                    !toggles.some((other) => other.offset === start)
                ) {
                    repairs.opens.set(start, {
                        kind: 'text',
                        close: source.substring(
                            toggle.offset,
                            toggle.offset + toggle.length,
                        ),
                    });
                    return true;
                }
                if (makeInert(toggle)) return true;
            } else if (makeInert(toggle)) return true;
        } else if (
            toggle.role === 'open' &&
            (toggle.unclosed || toggle.endedByLine)
        ) {
            // Nothing contradicts it, but nothing closed it either. Text whose close is on
            // the next line, before any other text there opens, was broken in two by a
            // line break, and the rest of it begins where that line does.
            if (toggle.kind === 'text' && toggle.closer !== undefined) {
                const next = lineEnd(toggle.offset) + 1;
                const rest = source.substring(next, lineEnd(next));
                const at = rest.indexOf(toggle.closer);
                const start = contentStart(next + Math.max(at, 0));
                if (
                    next <= source.length &&
                    at >= 0 &&
                    start < next + at &&
                    !Space.test(rest[at - 1] ?? ' ') &&
                    AfterClose.test(rest[at + toggle.closer.length] ?? '\n') &&
                    !repairs.opens.has(start)
                ) {
                    repairs.opens.set(start, {
                        kind: 'text',
                        close: toggle.closer,
                    });
                    return true;
                }
            }
            const end = endOf(toggle);
            if (
                (toggle.kind !== 'text' ||
                    (end > toggle.offset + toggle.length &&
                        end < lineEnd(toggle.offset))) &&
                close(end, toggle.kind)
            )
                return true;
        }
    }
    return false;
}
