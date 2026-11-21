import Source from '#nodes/Source.ts';
import {
    census,
    conflictsIn,
    EditKinds,
    editsOf,
    type EditKind,
} from '#parser/editCensus.ts';
import { describe, expect, test } from 'vitest';

/**
 * One slip is a handful of conflicts, not a cascade.
 *
 * Each program below is edited in every small way a creator might by accident: one
 * character deleted, one that doesn't belong typed, a space or a line break added or
 * removed (see editCensus.ts). The ceilings are what each kind of edit costs at worst and
 * on average, in conflicts counted by cause, as a creator sees them counted. They only go
 * down: a change that raises one has made some single slip louder, and the fix is to find
 * out which, not to raise the number.
 *
 * Before the parser recovered from any of this, the worst edit to a program of this size
 * cost between thirty and three hundred conflicts.
 */
const Programs: Record<string, string> = {
    /** Definitions, a list of nested evaluations over several lines, and binds that depend on all of it. */
    structures: `¶A page of a story, and the choices on it.¶
•Pick(words•'' goto•'')

•Page(name•'' story•'' picks•[Pick]: [])

pages: [
	Page('start' "I wake up." [
		Pick('Go out' 'yard')
		Pick('Stay' 'start')
	])
	Page('yard' "The yard is big." [
		Pick('Go home' 'start')
	])
	Page('end' 'The end.')
]

chosen: 'start'
here: pages.filter(ƒ(page•Page) page.name = chosen)[1]
picks: here.picks.translate(ƒ(pick•Pick) pick.words)

picks.length() > 0 ? Phrase(here.story) Phrase('The end.')`,
    /** A structure with functions, functions with typed inputs, and conditionals. */
    functions: `•State(row•# column•# steps•#)
(
	ƒ down() State(row + 1 column steps + 1)
	ƒ up() State(row - 1 column steps + 1)
)

ƒ far(state•State limit•#) state.steps > limit

¶Where things begin.¶
start: State(1 1 0)
next: far(start 3) ? start.up() start.down()
next.row + next.column`,
    /** Documentation, formatted text, interpolation, a set and a map. */
    text: `¶A greeting, with a name in it.¶
name: 'kitty'
sizes: {1 2 3}
moods: {'happy': 1 'sleepy': 2}

¶The words to show.¶
greeting: 'hello \\name\\!'
Stage([
	Phrase(\`a *bold* \\name\\ here\`)
	Phrase(greeting size: 2m)
	Phrase('there are \\sizes.size()\\ sizes and \\moods.size()\\ moods')
])`,
};

/** The most any one edit of each kind may cost, and the most they may cost on average. */
const Ceilings: Record<EditKind, { max: number; mean: number }> = {
    deleteToken: { max: 8, mean: 2.5 },
    deleteSpace: { max: 8, mean: 0.8 },
    insertSpace: { max: 6, mean: 0.8 },
    insertLine: { max: 8, mean: 2 },
    insertStray: { max: 12, mean: 3.2 },
    deleteLetter: { max: 4, mean: 2 },
};

describe.each(Object.keys(Programs))('one edit to %s', (name) => {
    const code = Programs[name] ?? '';

    test('starts with no conflicts', () => {
        expect(conflictsIn(code)).toBe(0);
    });

    const result = census(code, 3);
    test.each(EditKinds)('%s is contained', (kind) => {
        const tally = result[kind];
        const worst = tally.worst;
        const where = worst
            ? `line ${worst.line}, ${JSON.stringify(worst.what)}: ${JSON.stringify(worst.code.split('\n')[worst.line - 1])}`
            : '';
        // The parser never throws, whatever it is given.
        expect(tally.threw, `${kind} threw`).toBe(0);
        expect(
            tally.max,
            `the worst ${kind} is at ${where}`,
        ).toBeLessThanOrEqual(Ceilings[kind].max);
        expect(tally.mean).toBeLessThanOrEqual(Ceilings[kind].mean);
    });
});

test(
    'an edited program is read the same whether it is reparsed or read anew',
    {
        timeout: 30_000,
    },
    () => {
        // Recovery depends on a program's layout and on what the tokenizer learned of it, and
        // a reparse reuses what it can of the last parse. Both must come to the same tree.
        for (const code of Object.values(Programs))
            for (const edit of editsOf(code, 5).filter((_, i) => i % 5 === 0)) {
                const damaged = new Source('test', edit.code);
                expect(damaged.getCode().toString()).toBe(edit.code);
                const length = damaged.code.getLength();
                for (let at = 0; at <= length; at += Math.ceil(length / 6)) {
                    const text = damaged.code
                        .withGraphemesAt('x', at)
                        ?.toString();
                    if (text === undefined) continue;
                    const reparsed = damaged.withGraphemesAt('x', at);
                    const anew = new Source('test', text);
                    expect(reparsed?.getCode().toString()).toBe(text);
                    expect(reparsed?.expression.toWordplay()).toBe(
                        anew.expression.toWordplay(),
                    );
                    expect(reparsed?.expression.nodes().length).toBe(
                        anew.expression.nodes().length,
                    );
                }
            }
    },
);
