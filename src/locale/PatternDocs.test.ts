import DefaultLocale from '@locale/DefaultLocale';
import Example from '@nodes/Example';
import UnparsableExpression from '@nodes/UnparsableExpression';
import { toMarkup } from '@parser/toMarkup';
import { describe, expect, test } from 'vitest';

/**
 * Pattern node docs illustrate the pattern sublanguage with `\…\` examples. Each
 * example must be a COMPLETE, valid pattern (wrapped in `⣿…⣿`, or a whole program
 * that uses one): a bare fragment like `⊢ "Hi"` or `>0 #` tokenizes outside a
 * pattern (mis-colored, or an unparsable orange error), and an unclosed bracket
 * would merge with the prose that follows. This guards both.
 */
function examplesOf(doc: string): Example[] {
    const [markup] = toMarkup(doc);
    return markup.nodes().filter((n): n is Example => n instanceof Example);
}

describe('pattern node docs', () => {
    const node = DefaultLocale.node as unknown as Record<
        string,
        { doc?: string | string[] }
    >;
    const keys = Object.keys(node).filter((k) => k.startsWith('Pattern'));

    test('every pattern node has a doc with at least one example', () => {
        expect(keys.length).toBeGreaterThan(15);
        for (const key of keys) {
            const doc = node[key].doc;
            const paragraphs = Array.isArray(doc) ? doc : doc ? [doc] : [];
            const examples = paragraphs.flatMap(examplesOf);
            expect(examples.length).toBeGreaterThan(0);
        }
    });

    test('no example is unparsable or merges into following prose', () => {
        for (const key of keys) {
            const doc = node[key].doc;
            const paragraphs = Array.isArray(doc) ? doc : doc ? [doc] : [];
            for (const paragraph of paragraphs)
                for (const example of examplesOf(paragraph)) {
                    const source = example.program.toWordplay();
                    // A merged example swallows the example boundary and the
                    // doc terminator `¶`.
                    expect(source).not.toContain('¶');
                    // A bare/invalid fragment leaves an unparsable node.
                    const unparsable = example.program
                        .nodes()
                        .filter((n) => n instanceof UnparsableExpression);
                    expect(unparsable).toHaveLength(0);
                }
        }
    });
});
