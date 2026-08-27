import { describe, expect, test } from 'vitest';
import Project from '@db/projects/Project';
import Caret from '@edit/caret/Caret';
import { getEditsAt } from '@edit/menu/PossibleEdits';
import concretize from '@locale/concretize';
import DefaultLocale from '@locale/DefaultLocale';
import { docToMarkup } from '@locale/LocaleText';
import Locales from '@locale/Locales';
import firstSentence from '@locale/firstSentence';
import BinaryEvaluate from '@nodes/BinaryEvaluate';
import type Context from '@nodes/Context';
import Dimension from '@nodes/Dimension';
import Evaluate from '@nodes/Evaluate';
import type Node from '@nodes/Node';
import PropertyReference from '@nodes/PropertyReference';
import Reference from '@nodes/Reference';
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

    /** The first sentence of a definition's authored docs — what a suggestion
     *  naming that definition should say. */
    function definitionDocSentence(
        source: Source,
        context: Context,
        locales: Locales,
        name: string,
    ) {
        const reference = source
            .nodes()
            .find(
                (n): n is PropertyReference =>
                    n instanceof PropertyReference &&
                    n.name?.getName() === name,
            );
        const bind = reference?.resolve(context);
        expect(bind).toBeDefined();
        expect(bind && 'docs' in bind).toBe(true);
        return firstSentence(
            bind && 'docs' in bind
                ? (bind.docs.getMarkup(locales)[0]?.toText() ?? '')
                : '',
            locales.getLocaleString(),
        );
    }

    test('an in-tree property reference describes the bind, not the Reference node', () => {
        const { source, context, locales } = setup('Music.major');
        const node = source
            .nodes()
            .find(
                (n): n is PropertyReference => n instanceof PropertyReference,
            );
        expect(node).toBeDefined();
        const note = getMenuNoteMarkup(node!, context, locales).toText();
        expect(note).toBe(
            definitionDocSentence(source, context, locales, 'major'),
        );
        // …and not the generic PropertyReference node doc.
        expect(note).not.toBe(ownDocSentence(node!, locales));
    });

    test('a detached reference describes the definition it is given', () => {
        const { source, context, locales } = setup('Music.major');
        const bind = source
            .nodes()
            .find((n): n is PropertyReference => n instanceof PropertyReference)
            ?.resolve(context);
        expect(bind).toBeDefined();

        // A menu preview node: named but never attached to the source tree.
        const detached = Reference.make('major');
        expect(
            getMenuNoteMarkup(detached, context, locales, bind).toText(),
        ).toBe(definitionDocSentence(source, context, locales, 'major'));

        // Without the definition it can't resolve through scope, so it reports
        // the generic Reference doc. This is why the parameter exists — a
        // node-only implementation would leave the reported bug in place.
        expect(getMenuNoteMarkup(detached, context, locales).toText()).toBe(
            ownDocSentence(detached, locales),
        );
    });

    test('two scales yield different notes', () => {
        const noteFor = (code: string) => {
            const s = setup(code);
            const node = s.source
                .nodes()
                .find(
                    (n): n is PropertyReference =>
                        n instanceof PropertyReference,
                );
            return getMenuNoteMarkup(node!, s.context, s.locales).toText();
        };
        expect(noteFor('Music.major')).not.toBe(noteFor('Music.minor'));
    });

    test('the menu gives each scale suggestion a distinct note', () => {
        // The reported bug, through the real menu path: with the caret after
        // `Music.`, every row read as the generic Reference doc.
        const code = 'Music.';
        const source = new Source('test', code);
        const project = Project.make(null, 'test', source, [], DefaultLocale);
        const locales = new Locales(concretize, [DefaultLocale], DefaultLocale);
        const caret = new Caret(source, code.length, undefined, undefined);
        const revisions = getEditsAt(project, caret, undefined, locales);

        const notes = new Map<string, string>();
        for (const revision of revisions) {
            const [node] = revision.getEditedNode(locales);
            const name = node.toWordplay().trim();
            if (!['major', 'minor', 'chromatic'].includes(name)) continue;
            notes.set(
                name,
                getMenuNoteMarkup(
                    node,
                    revision.context,
                    locales,
                    revision.getReferredDefinition(),
                ).toText(),
            );
        }

        expect([...notes.keys()].sort()).toEqual([
            'chromatic',
            'major',
            'minor',
        ]);
        // Distinct, and none of them the generic Reference doc.
        expect(new Set(notes.values()).size).toBe(3);
        for (const [name, note] of notes)
            expect(note, name).not.toBe(
                ownDocSentence(Reference.make(name), locales),
            );
    });

    test('a unit is named, not given the generic unit doc', () => {
        const { context, locales } = setup('1m');
        const meters = Dimension.make(false, 'm', 1);
        const seconds = Dimension.make(false, 's', 1);
        const meterNote = getMenuNoteMarkup(meters, context, locales).toText();
        const secondNote = getMenuNoteMarkup(
            seconds,
            context,
            locales,
        ).toText();
        // Every unit shares one doc ("I am a unit of measurement!"), so the note has to
        // come from the unit's name instead or the whole list reads identically (#890).
        expect(meterNote).toBe('meters');
        expect(meterNote).not.toBe(ownDocSentence(meters, locales));
        expect(meterNote).not.toBe(secondNote);
    });

    test("a creator's own unit keeps the generic unit doc", () => {
        const { context, locales } = setup('1cat');
        const cats = Dimension.make(false, 'cat', 1);
        expect(getMenuNoteMarkup(cats, context, locales).toText()).toBe(
            ownDocSentence(cats, locales),
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
