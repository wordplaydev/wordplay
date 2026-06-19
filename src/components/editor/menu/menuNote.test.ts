import { describe, expect, test } from 'vitest';
import Project from '@db/projects/Project';
import concretize from '@locale/concretize';
import DefaultLocale from '@locale/DefaultLocale';
import { docToMarkup } from '@locale/LocaleText';
import Locales from '@locale/Locales';
import firstSentence from '@locale/firstSentence';
import BinaryEvaluate from '@nodes/BinaryEvaluate';
import Evaluate from '@nodes/Evaluate';
import type Node from '@nodes/Node';
import Source from '@nodes/Source';
import getMenuNoteMarkup from './menuNote';

function setup(code: string) {
    const source = new Source('test', code);
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    return {
        source,
        context: project.getContext(source),
        locales: new Locales(concretize, [DefaultLocale], DefaultLocale),
    };
}

/** The first sentence of a node's own (generic) doc — the helper's fallback. */
function ownDocSentence(node: Node, locales: Locales) {
    const doc = docToMarkup(node.getDoc(locales));
    return firstSentence(
        (doc.concretize(locales, {}) ?? doc).toText(),
        locales.getLocaleString(),
    );
}

describe('getMenuNoteMarkup', () => {
    test('describes the called function, not the Evaluate wrapper', () => {
        const { source, context, locales } = setup('1 + 1');
        const node = source
            .nodes()
            .find((n): n is BinaryEvaluate => n instanceof BinaryEvaluate);
        const fun = node?.getFunction(context);
        expect(fun).toBeDefined();
        const expected = firstSentence(
            fun?.docs.getMarkup(locales)[0]?.toText() ?? '',
            locales.getLocaleString(),
        );
        const note = getMenuNoteMarkup(node!, context, locales).toText();
        expect(note).toBe(expected);
        // …and not the generic BinaryEvaluate node doc.
        expect(note).not.toBe(ownDocSentence(node!, locales));
    });

    test('two different operators yield different notes', () => {
        const noteFor = (code: string) => {
            const s = setup(code);
            const node = s.source
                .nodes()
                .find((n): n is BinaryEvaluate => n instanceof BinaryEvaluate);
            return getMenuNoteMarkup(node!, s.context, s.locales).toText();
        };
        expect(noteFor('1 + 1')).not.toBe(noteFor('1 - 1'));
    });

    test('a stream completion describes the stream', () => {
        const { source, context, locales } = setup('Time()');
        const node = source
            .nodes()
            .find((n): n is Evaluate => n instanceof Evaluate);
        const fun = node?.getFunction(context);
        expect(fun).toBeDefined();
        const expected = firstSentence(
            fun?.docs.getMarkup(locales)[0]?.toText() ?? '',
            locales.getLocaleString(),
        );
        expect(getMenuNoteMarkup(node!, context, locales).toText()).toBe(
            expected,
        );
    });

    test('a non-call node falls back to its own doc', () => {
        const { source, context, locales } = setup('5');
        const number = source
            .nodes()
            .find((n) => n.getDescriptor() === 'NumberLiteral');
        expect(number).toBeDefined();
        expect(getMenuNoteMarkup(number!, context, locales).toText()).toBe(
            ownDocSentence(number!, locales),
        );
    });
});
