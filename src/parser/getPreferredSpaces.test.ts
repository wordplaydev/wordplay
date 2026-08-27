import DefaultLocale from '@locale/DefaultLocale';
import { parseLocaleDoc, toDocString } from '@locale/LocaleText';
import Project from '@db/projects/Project';
import Docs from '@nodes/Docs';
import Evaluate from '@nodes/Evaluate';
import Reference from '@nodes/Reference';
import TextLiteral from '@nodes/TextLiteral';
import Example from '@nodes/Example';
import Source from '@nodes/Source';
import getPreferredSpaces from '@parser/getPreferredSpaces';
import { describe, expect, test } from 'vitest';

/** Format `code` the way the tidy command does. */
function format(code: string): string {
    const source = new Source('test', code);
    return source
        .withSpaces(getPreferredSpaces(source.root, source.spaces))
        .getCode()
        .toString();
}

describe('short code stays on one line', () => {
    test('a short evaluate', () => {
        expect(format("Phrase('hi')")).toBe("Phrase('hi')");
    });

    test('a short list, set, and map', () => {
        expect(format('[1 2 3]')).toBe('[1 2 3]');
        expect(format('{1 2 3}')).toBe('{1 2 3}');
        expect(format("{'a': 1 'b': 2}")).toBe("{'a': 1 'b': 2}");
    });

    test('an empty list keeps its delimiters together', () => {
        expect(format('[]')).toBe('[]');
    });
});

describe('long code wraps onto one line per item', () => {
    test('an evaluate with many inputs', () => {
        // Previously impossible: Evaluate had no newline rule at all, so this
        // ran off the right edge no matter how long it got.
        expect(
            format(
                "Phrase('hello' size: 2m color: Color(50% 100 180°) place: Place(1m 2m 3m))",
            ),
        ).toBe(
            `Phrase(
\t'hello'
\tsize: 2m
\tcolor: Color(50% 100 180°)
\tplace: Place(1m 2m 3m)
)`,
        );
    });

    test('a long list', () => {
        expect(
            format(
                '[100 200 300 400 500 600 700 800 900 1000 1100 1200 1300 1400]',
            ),
        ).toBe(
            `[
\t100
\t200
\t300
\t400
\t500
\t600
\t700
\t800
\t900
\t1000
\t1100
\t1200
\t1300
\t1400
]`,
        );
    });

    test('a nested literal only breaks the container that does not fit', () => {
        // The outer evaluate exceeds the budget; the inner list still fits on its
        // own line once indented, so it stays whole.
        expect(
            format(
                "Phrase('a long enough phrase' place: Place(1m 2m) rest: [1 2 3])",
            ),
        ).toBe(
            `Phrase(
\t'a long enough phrase'
\tplace: Place(1m 2m)
\trest: [1 2 3]
)`,
        );
    });
});

describe('formatting is stable', () => {
    const samples = [
        "Phrase('hello' size: 2m color: Color(50% 100 180°) place: Place(1m 2m 3m))",
        '[100 200 300 400 500 600 700 800 900 1000 1100 1200 1300 1400]',
        "Phrase('hi')",
        'x: 1\nx + 2',
        "Phrase('a long enough phrase' place: Place(1m 2m) rest: [1 2 3])",
        '[[1 2 3] [4 5 6] [7 8 9] [10 11 12] [13 14 15] [16 17 18] [19 20]]',
    ];

    test('formatting twice changes nothing the second time', () => {
        // Wrapping decisions are made from the flat width, so a wrapped node must
        // not re-measure itself as "too long" and grow more breaks each pass.
        for (const sample of samples) {
            const once = format(sample);
            expect(format(once)).toBe(once);
        }
    });
});

describe('creator line breaks survive', () => {
    test('a hand-broken short list stays broken', () => {
        // Formatting only ever adds newlines; it never takes away a break the
        // creator typed, even when the content would fit on one line.
        expect(format('[1\n2]')).toBe('[\n\t1\n\t2\n]');
    });

    test('a break inside a nested call opens its containers', () => {
        // The inner call can't be on one line, so neither can the outer one.
        const result = format("Phrase('a'\nsize: 1m)");
        expect(result).toContain('\n');
        expect(format(result)).toBe(result);
    });
});

describe("a root block's first statement gets no leading space", () => {
    test('leading blank lines before the program are removed', () => {
        expect(format("\n\nPhrase('hi')")).toBe("Phrase('hi')");
        expect(format("Phrase('hi')")).toBe("Phrase('hi')");
    });

    test('a program opening with docs keeps the newline after them', () => {
        // The first statement is only "at the document start" when nothing
        // precedes it. Pulling it up onto the doc's last line both mangles the
        // starter project and, since that line is already long, wraps the call.
        const starter = "¶A comment.\nA second line of it.¶\nPhrase('hi')";
        expect(format(starter)).toBe(starter);
    });

    test('a program opening with a borrow keeps the newline after it', () => {
        expect(format('↓ x\nx: 1\nx + 2')).toBe('↓ x\nx: 1\nx + 2');
    });
});

describe("a doc's inline example is not broken open", () => {
    // An Example holds its own Program, so its first statement is a root block's
    // first statement too — but it is never the first leaf of the doc being
    // formatted. Testing that positionally put a newline after every inline
    // example's opening `\`, which rendered as a line break inside the example's
    // box in the guide (the code started on the line below its own background).
    test('an inline example stays on the line it was written on', () => {
        const doc = '¶See \\1 + 2\\ for more.¶\nƒ f() 1';
        expect(format(doc)).toBe(doc);
    });

    test('a multi-line example keeps only the breaks it was written with', () => {
        const doc = '¶Two lines: \\a: 1\nb: 2\\ done.¶\nƒ g() 2';
        expect(format(doc)).toBe(doc);
    });

    test('no locale doc gains a break after an example opens', () => {
        // The check that would have caught this: every example in every en-US doc,
        // formatted the way getBind serializes docs into a structure's source.
        let examples = 0;
        for (const text of docTexts(DefaultLocale)) {
            const doc = parseLocaleDoc(toDocString(text));
            const docs = new Docs([doc]);
            const spaces = getPreferredSpaces(docs);
            for (const example of docs.nodes(
                (node): node is Example => node instanceof Example,
            )) {
                const first = example.program.getFirstLeaf();
                if (first === undefined) continue;
                examples++;
                const before = doc.markup.spaces?.getSpace(first) ?? '';
                if (!before.includes('\n'))
                    expect(spaces.getSpace(first)).not.toContain('\n');
            }
        }
        // Guard the guard: a walk that finds nothing would pass silently.
        expect(examples).toBeGreaterThan(100);
    });
});

/** Every `doc` string (or paragraph list) anywhere in a locale. */
function* docTexts(value: unknown): Generator<string | string[]> {
    if (value === null || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
        if (
            key === 'doc' &&
            (typeof child === 'string' ||
                (Array.isArray(child) &&
                    child.every((item) => typeof item === 'string')))
        )
            yield child;
        else yield* docTexts(child);
    }
}

describe('spacing a root block on its own', () => {
    /**
     * Every revision that replaces a program's whole block — adding a statement
     * from the palette's toolbar, say — re-spaces that block rooted at the block
     * itself. A program's docs live on the Program, not the Block, so from there
     * it cannot be known whether anything precedes the first statement. Guessing
     * "nothing does" stripped its newline and pulled the doc down onto the first
     * line of code.
     */
    function replacedBlock(code: string) {
        const project = Project.make(
            null,
            'test',
            new Source('test', code),
            [],
            DefaultLocale,
        );
        const block = project.getMain().expression.expression;
        return project
            .withRevisedNodes([
                [block, block.replace(block.statements, [...block.statements])],
            ])
            .getMain()
            .toWordplay();
    }

    test.each([
        [`¶a doc¶\nPhrase('hi')`],
        [`Phrase('hi')`],
        [`¶a doc¶\nx: 1\nPhrase('hi')`],
        [`x: 1\nPhrase('hi')`],
    ])(
        'replacing a block with an identical one changes nothing: %s',
        (code) => {
            expect(replacedBlock(code)).toBe(code);
        },
    );

    test('a statement appended to a documented program keeps the doc on its own line', () => {
        const code = `¶a doc¶\nPhrase('hi')`;
        const project = Project.make(
            null,
            'test',
            new Source('test', code),
            [],
            DefaultLocale,
        );
        const block = project.getMain().expression.expression;
        const added = block.withStatement(
            Evaluate.make(Reference.make('💬'), [TextLiteral.make('hello')]),
        );
        expect(
            project
                .withRevisedNodes([[block, added]])
                .getMain()
                .toWordplay(),
        ).toBe(`¶a doc¶\nPhrase('hi')\n💬('hello')`);
    });
});
