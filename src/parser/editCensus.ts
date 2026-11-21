import { groupByCause } from '#conflicts/causes.ts';
import Project from '#db/projects/Project.ts';
import DefaultLocale from '#locale/DefaultLocale.ts';
import Source from '#nodes/Source.ts';
import { Sym } from '#nodes/Sym.ts';

/**
 * Every small edit a creator might make to a program by accident, and what each one costs
 * in conflicts. This is how the parser's recovery is measured: one slip should be a handful
 * of conflicts where it happened, never one on every line after it.
 *
 * A test helper, imported by no part of the app.
 */
export const EditKinds = [
    /** Delete a token that is one character long: a delimiter, an operator, a quote. */
    'deleteToken',
    /** Delete one character of space, joining two tokens or two lines. */
    'deleteSpace',
    /** Put a space between two tokens that had none. */
    'insertSpace',
    /** Break a line before a token in the middle of one. */
    'insertLine',
    /** Type one character that doesn't belong, before a token. */
    'insertStray',
    /** Delete a letter from the middle of a name. */
    'deleteLetter',
] as const;
export type EditKind = (typeof EditKinds)[number];

export type Edit = {
    kind: EditKind;
    /** The line the edit is on, counting from one, and what was deleted or inserted. */
    line: number;
    what: string;
    /** The program after the edit. */
    code: string;
};

/** The characters a stray insertion tries. */
export const Strays = ['(', ')', '[', ']', "'", ':', '•', '.', ',', 'x'];

/**
 * All of a program's single edits. `every` takes each nth candidate of the two largest
 * kinds, the line breaks and the strays, which is how a long program stays affordable.
 */
export function editsOf(code: string, every = 1): Edit[] {
    const source = new Source('census', code);
    const text = source.code;
    const edits: Edit[] = [];

    const lineOf = (position: number) =>
        text.substring(0, position).toString().split('\n').length;
    const without = (kind: EditKind, position: number, what: string) => {
        const edited = text.withoutGraphemeAt(position);
        if (edited)
            edits.push({
                kind,
                line: lineOf(position),
                what,
                code: edited.toString(),
            });
    };
    const withText = (kind: EditKind, position: number, what: string) => {
        const edited = text.withGraphemesAt(what, position);
        if (edited)
            edits.push({
                kind,
                line: lineOf(position),
                what,
                code: edited.toString(),
            });
    };

    let boundary = 0;
    for (const token of source.getTokens()) {
        const start = source.getTokenTextPosition(token);
        if (start === undefined || token.isSymbol(Sym.End)) continue;
        const length = token.getTextLength();
        const space = source.spaces.getSpace(token);
        const spaceLength = [...space].length;

        if (length === 1) without('deleteToken', start, token.getText());
        else if (token.isSymbol(Sym.Name) && length > 2)
            without(
                'deleteLetter',
                start + Math.floor(length / 2),
                token.getText(),
            );

        for (let offset = 0; offset < spaceLength; offset++)
            without(
                'deleteSpace',
                start - spaceLength + offset,
                space[offset] === '\n' ? '↵' : '␣',
            );

        // The first token has nothing before it to be separated from.
        if (start === 0) continue;
        if (spaceLength === 0) withText('insertSpace', start, ' ');
        boundary++;
        if (boundary % every !== 0) continue;
        if (!space.includes('\n')) withText('insertLine', start, '\n');
        for (const stray of Strays) withText('insertStray', start, stray);
    }

    return edits;
}

/** How many conflicts a program has, as a creator would see them counted, or that reading it threw. */
export function conflictsIn(code: string): number | 'threw' {
    try {
        const source = new Source('census', code);
        const project = Project.make(null, 'census', source, [], DefaultLocale);
        project.analyze();
        return groupByCause(project.getConflicts() ?? [], (node) =>
            source.has(node),
        ).length;
    } catch {
        return 'threw';
    }
}

export type Tally = {
    edits: number;
    mean: number;
    max: number;
    threw: number;
    /** The edit that cost the most. */
    worst: Edit | undefined;
};

const tally = (): Tally => ({
    edits: 0,
    mean: 0,
    max: 0,
    threw: 0,
    worst: undefined,
});

/** What each kind of edit costs across a program. */
export function census(code: string, every = 1): Record<EditKind, Tally> {
    const tallies: Record<EditKind, Tally> = {
        deleteToken: tally(),
        deleteSpace: tally(),
        insertSpace: tally(),
        insertLine: tally(),
        insertStray: tally(),
        deleteLetter: tally(),
    };
    for (const edit of editsOf(code, every)) {
        const kind = tallies[edit.kind];
        const count = conflictsIn(edit.code);
        kind.edits++;
        if (count === 'threw') {
            kind.threw++;
            continue;
        }
        // A running total until the end, when it becomes the mean.
        kind.mean += count;
        if (count > kind.max) {
            kind.max = count;
            kind.worst = edit;
        }
    }
    for (const kind of EditKinds) {
        const counted = tallies[kind].edits - tallies[kind].threw;
        if (counted > 0) tallies[kind].mean /= counted;
    }
    return tallies;
}
