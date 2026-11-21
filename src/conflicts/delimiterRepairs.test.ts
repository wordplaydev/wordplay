import { groupByCause } from '#conflicts/causes.ts';
import { StrayDelimiter } from '#conflicts/UnparsableConflict.ts';
import Project from '#db/projects/Project.ts';
import DefaultLocale from '#locale/DefaultLocale.ts';
import DefaultLocales from '#locale/DefaultLocales.ts';
import Source from '#nodes/Source.ts';
import { expect, test } from 'vitest';

/**
 * Every slip that recovery contains can also be undone from its conflict.
 *
 * A conflict that names a mistake and offers nothing leaves a creator to find the fix
 * themselves, which for a missing delimiter is the hard part. Each case below makes one
 * edit, takes the repair the first conflict offers, and expects the program it started
 * with: the same code, and no conflicts.
 */
const Program = `¶A page of a story, and the choices on it.¶
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
]

chosen: 'start'
here: pages.filter(ƒ(page•Page) page.name = chosen)[1]

Phrase(here.story)`;

function analyze(code: string) {
    const source = new Source('test', code);
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    project.analyze();
    return {
        source,
        project,
        causes: groupByCause(project.getConflicts() ?? [], (node) =>
            source.has(node),
        ),
    };
}

/** Code compared without its spacing, which a repair is free to choose. */
const unspaced = (code: string) => code.replace(/\s+/gu, '');

test('the program starts with no conflicts', () => {
    expect(analyze(Program).causes).toEqual([]);
});

test.each([
    ['a closing parenthesis', "'yard')", "'yard'", 'UnclosedDelimiter'],
    ['an opening bracket', 'pages: [', 'pages: ', 'UnopenedDelimiter'],
    [
        "a definition's opening parenthesis",
        '•Pick(words',
        '•Pickwords',
        'UnopenedDelimiter',
    ],
    [
        "a definition's closing parenthesis",
        "goto•'')",
        "goto•''",
        'UnclosedDelimiter',
    ],
    ['a closing ¶', 'on it.¶', 'on it.', 'UnclosedDelimiter'],
    ['an opening ¶', '¶A page', 'A page', 'UnopenedDelimiter'],
    ['a closing quote', '"I wake up."', '"I wake up.', 'UnclosedDelimiter'],
    ['an opening quote', "'Go out'", "Go out'", 'UnopenedDelimiter'],
    ['an extra quote', '•Page(name', "•Page('name", 'StrayDelimiter'],
    [
        'an extra parenthesis',
        "chosen: 'start'",
        "chosen: 'start')",
        'StrayDelimiter',
    ],
])(
    'losing or gaining %s is one conflict, and its repair undoes it',
    (_, from, to, expected) => {
        const edited = Program.replace(from, to);
        expect(edited).not.toBe(Program);
        const { project, source, causes } = analyze(edited);
        expect(causes.map((cause) => cause.conflict.constructor.name)).toEqual([
            expected,
        ]);
        const conflict = causes[0]!.conflict;
        const context = project.getContext(source);
        const repair = conflict
            .getResolutions(context, [])
            .find((resolution) => resolution.kind === 'repair');
        expect(repair, 'the conflict offers a repair').toBeDefined();
        if (repair === undefined) return;
        // What it says it will do names the delimiter.
        expect(
            repair.description(DefaultLocales, context).toText().length,
        ).toBeGreaterThan(0);
        const { newProject } = repair.mediator(context, DefaultLocales);
        const repaired = newProject.getSources()[0]!.getCode().toString();
        expect(unspaced(repaired)).toBe(unspaced(Program));
        expect(analyze(repaired).causes).toEqual([]);
    },
);

test('a stray delimiter says which one it is', () => {
    const { project, source, causes } = analyze(
        Program.replace("chosen: 'start'", "chosen: 'start')"),
    );
    const conflict = causes[0]!.conflict;
    expect(conflict).toBeInstanceOf(StrayDelimiter);
    // Still unparsable code, as far as what may be edited in blocks is concerned.
    expect(conflict.isBlocking()).toBe(true);
    expect(
        conflict
            .getMessage(project.getContext(source), [])
            .explanation(DefaultLocales, project.getContext(source))
            .toText(),
    ).toContain(')');
});
