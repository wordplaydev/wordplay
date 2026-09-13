import Bind from '@nodes/Bind';
import Docs from '@nodes/Docs';
import DocumentedExpression from '@nodes/DocumentedExpression';
import Source from '@nodes/Source';
import {
    canRepresent,
    getMarkup,
    isWholeMarkup,
    markupToSource,
} from '@edit/markup/markupSource';
import { expect, test } from 'vitest';

/**
 * Where a source's leading docs land (#1374). A doc group touching what follows it
 * documents that, like every other doc; it is the program's own only when nothing
 * adjacent can take it — a blank line, a borrow, or the end of the source.
 */

/** The docs of a source's program, and of each of its root statements. */
function docsIn(code: string): {
    program: string[];
    statements: (string[] | undefined)[];
} {
    const program = new Source('test', code).expression;
    const texts = (docs: Docs | undefined) =>
        docs === undefined || docs.isEmpty()
            ? undefined
            : docs.docs.map((doc) => doc.markup.toText());
    return {
        program: texts(program.docs) ?? [],
        statements: program.expression.statements.map((statement) => {
            const field = statement.getField('docs');
            return texts(field instanceof Docs ? field : undefined);
        }),
    };
}

test.each([
    // A doc touching what follows it documents that, which is what the first
    // definition in a source could never have before.
    ['adjacent', '¶A¶\n↑ a/en: 1', [], [['A']]],
    // A blank line is what makes a doc the source's own.
    ['a blank line', '¶A¶\n\n↑ a/en: 1', ['A'], [undefined]],
    // A borrow carries no docs of its own, so adjacency can't hand it one.
    ['a borrow', '¶A¶\n↓ words\n1', ['A'], [undefined]],
    ['end of the source', '¶A¶', ['A'], []],
    // The unit is the group, since docs separated by at most one newline are locale
    // variants of one doc — splitting them would take a translation from a source.
    ['a locale group', '¶A¶/en\n¶B¶/es\n↑ a: 1', [], [['A', 'B']]],
    ['two groups', '¶A¶\n\n¶B¶\n↑ a: 1', ['A'], [['B']]],
    // A source may open with several separated groups; all but a last adjacent one
    // are its own. PersonalMap.wp is written this way.
    ['three groups', '¶A¶\n\n¶B¶\n\n¶C¶\na: 1', ['A', 'B'], [['C']]],
    [
        'three separated groups',
        '¶A¶\n\n¶B¶\n\n¶C¶\n\na: 1',
        ['A', 'B', 'C'],
        [undefined],
    ],
])('%s', (_, code: string, program: string[], statements: unknown[]) => {
    const found = docsIn(code);
    expect(found.program).toEqual(program);
    expect(found.statements).toEqual(statements);
    // Attachment is a parse decision; it must never change the text.
    expect(new Source('test', code).toWordplay()).toBe(code);
});

test('an adjacent doc leaves the statement a definition of its own', () => {
    // A doc must not wrap a bind in a DocumentedExpression: `Block.getDefinitionsBefore`
    // only counts statements that *are* binds, so the name would leave scope.
    const program = new Source('test', '¶A¶\na: 1\na + 1').expression;
    expect(program.expression.statements[0]).toBeInstanceOf(Bind);
});

test('an adjacent doc on an expression wraps it', () => {
    const program = new Source('test', '¶A¶\n1 + 1').expression;
    expect(program.expression.statements[0]).toBeInstanceOf(
        DocumentedExpression,
    );
});

test('the markup editor still holds a whole string', () => {
    // A wrapped markup string is docs-only, so its wrapper is the program's doc.
    const source = markupToSource('Hello there');
    expect(source.expression.docs.isEmpty()).toBe(false);
    expect(isWholeMarkup(source)).toBe(true);
});

test('a string whose wrapper escapes still finds its doc', () => {
    // `Hello ¶note¶ world` closes the wrapper early, leaving the doc adjacent to code,
    // so the doc is the statement's. The editor still has to see it to decline it.
    const source = markupToSource('Hello ¶note¶ world');
    expect(source.expression.docs.isEmpty()).toBe(true);
    expect(getMarkup(source)).toBeDefined();
    expect(isWholeMarkup(source)).toBe(false);
    expect(canRepresent('Hello ¶note¶ world')).toBe(false);
});
