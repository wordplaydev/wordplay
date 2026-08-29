import { accessorToLocalePath } from '@components/localization/accessorToLocalePath';
import Project from '@db/projects/Project';
import { getDocLocales } from '@locale/getDocLocales';
import Source from '@nodes/Source';
import DefaultLocale from '@locale/DefaultLocale';
import DefaultLocales from '@locale/DefaultLocales';
import { firstSentenceOf } from '@locale/firstSentence';
import Markup from '@nodes/Markup';
import { parseFormattedLiteral } from '@parser/parseExpression';
import { toTokens } from '@parser/toTokens';
import { describe, expect, test } from 'vitest';

const pathOf = (markup: Markup | undefined) =>
    markup?.source === undefined
        ? undefined
        : accessorToLocalePath(markup.source.accessor)?.toString();

describe('a markup concretized from an accessor reports its template', () => {
    test('the path names the string that was concretized', () => {
        expect(
            pathOf(DefaultLocales.concretize((l) => l.node.Evaluate.start)),
        ).toBe('node.Evaluate.start');
    });

    test('the inputs it was concretized with ride along', () => {
        const markup = DefaultLocales.concretize(
            (l) => l.node.Evaluate.finish,
            { value: 'five' },
        );
        expect(markup.source?.inputs).toEqual({ value: 'five' });
    });

    test('two concretizations of one accessor keep their own inputs', () => {
        const one = DefaultLocales.concretize((l) => l.node.Evaluate.finish, {
            value: 'one',
        });
        const two = DefaultLocales.concretize((l) => l.node.Evaluate.finish, {
            value: 'two',
        });
        expect(one.source?.inputs).toEqual({ value: 'one' });
        expect(two.source?.inputs).toEqual({ value: 'two' });
    });

    test('an unwritten string still reports the template it stands in for', () => {
        // The placeholder a locale shows for an unwritten string names the string it stands
        // in for, which is the one a translator most needs to reach. `guidance` is the field
        // that is legitimately empty in most locales.
        expect(pathOf(DefaultLocales.concretize((l) => l.guidance))).toBe(
            '.guidance',
        );
        // An accessor that names no place in the tree carries a source with no usable path,
        // so the editor declines it just as it declines a computed accessor.
        expect(pathOf(DefaultLocales.concretize(() => ''))).toBeUndefined();
    });
});

describe('everything else reports nothing, so it can never be edited as locale text', () => {
    test('the raw-string form, which resolved its own template', () => {
        expect(
            DefaultLocales.concretize('Hello, my name is $name.', {
                name: 'Amy',
            }).source,
        ).toBeUndefined();
    });

    test('the shared template cache is never stamped', () => {
        // The cache holds the pre-concretize markup keyed by template text, so a source on it
        // would attach one path to every string that happens to read the same in en-US.
        const template = DefaultLocale.node.Evaluate.start;
        DefaultLocales.concretize((l) => l.node.Evaluate.start);
        expect(DefaultLocales.concretize(template).source).toBeUndefined();
    });

    test('markup built from words, and a clone of a stamped one', () => {
        expect(Markup.words('hello').source).toBeUndefined();
        const stamped = DefaultLocales.concretize((l) => l.node.Evaluate.start);
        expect(stamped.source).toBeDefined();
        expect(stamped.clone().source).toBeUndefined();
    });

    test("creator content: a program's own formatted literal", () => {
        const literal = parseFormattedLiteral(toTokens('`hello *there*`'));
        expect(literal.texts[0].markup.source).toBeUndefined();
    });
});

describe('a fragment of a template never claims to be the template', () => {
    // Saving an edit made against a first sentence would overwrite the whole doc with it, so
    // ConceptPreview's hint must not become editable even though the doc it came from is.
    const stamped = () =>
        DefaultLocales.concretize((l) => l.node.Evaluate.start);

    test('asFirstParagraph', () => {
        expect(stamped().asFirstParagraph().source).toBeUndefined();
    });

    test('asLine', () => {
        expect(stamped().asLine().source).toBeUndefined();
    });

    test('firstSentenceOf', () => {
        expect(firstSentenceOf(stamped(), 'en-US').source).toBeUndefined();
    });
});

describe('callers that resolve their own template hand the accessor over', () => {
    test("a node's description names the string it rendered", () => {
        const source = new Source('main', '1 + 2');
        const project = Project.make(null, 'test', source, [], DefaultLocale);
        const context = project.getContext(source);
        expect(
            pathOf(source.expression.getDescription(DefaultLocales, context)),
        ).toBe('node.Program.description');
    });

    test("a built-in's docs name theirs, and keep it through Docs.getMarkup", () => {
        const docs = getDocLocales(DefaultLocales, (l) => l.basis.Number.doc);
        expect(pathOf(docs.docs[0].markup)).toBe('basis.Number.doc');
        // getMarkup re-concretizes each doc with no inputs on the way out, which is the step
        // that would drop the origin if concretize didn't carry it.
        expect(pathOf(docs.getMarkup(DefaultLocales)[0])).toBe(
            'basis.Number.doc',
        );
    });
});
