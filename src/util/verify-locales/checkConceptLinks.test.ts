import DefaultLocale from '@locale/DefaultLocale';
import { parseLocaleDoc } from '@locale/LocaleText';
import ConceptLink from '@nodes/ConceptLink';
import checkDocContent from '@util/verify-locales/checkDocContent';
import isUnresolvableConceptLink from '@util/verify-locales/checkConceptLinks';
import { describe, expect, test } from 'vitest';

/** The links in a doc, in order. */
function links(doc: string): ConceptLink[] {
    return parseLocaleDoc(doc)
        .nodes()
        .filter((node): node is ConceptLink => node instanceof ConceptLink);
}

function unresolvable(doc: string): string[] {
    return links(doc)
        .filter((link) => isUnresolvableConceptLink(link, DefaultLocale))
        .map((link) => link.toWordplay());
}

describe('isUnresolvableConceptLink', () => {
    test('flags a node key with no template', () => {
        // `node.Token` has locale text but no entry in `Templates`, so nothing in the
        // app builds a concept for it — exactly the shape of the `@Markup` bug.
        expect(unresolvable('I am made of @Token.')).toEqual(['@Token']);
    });

    test('accepts a construct that is browsable', () => {
        expect(unresolvable('I go before any @Bind or @Program.')).toEqual([]);
    });

    test('accepts a name that resolves as output or a value type', () => {
        // `@Row` is a node key too, but it resolves as the output arrangement.
        expect(unresolvable('Put it in a @Row on the @Stage.')).toEqual([]);
        expect(unresolvable('I add a @Number to myself.')).toEqual([]);
    });

    test('leaves lowercase glossary references alone', () => {
        expect(unresolvable('I use @markup and @value.')).toEqual([]);
    });

    test('leaves characters and codepoints to isBroken', () => {
        expect(unresolvable('See @amyjko/friend and @U/1F600.')).toEqual([]);
    });

    test('ignores the property, checking only the concept', () => {
        expect(unresolvable('Set its @Phrase.name.')).toEqual([]);
    });
});

describe('checkDocContent reports them', () => {
    test('an unresolvable construct is a reference problem', () => {
        const problems = checkDocContent('I am made of @Token.', DefaultLocale);
        expect(problems.map((p) => p.kind)).toEqual(['references']);
    });

    test('@Markup resolves now that it is a concept', () => {
        // The reported bug: this is the sentence from `node.Doc.doc`.
        expect(
            checkDocContent(
                'I richly format things with @Markup, like explanations of some of your @Program.',
                DefaultLocale,
            ),
        ).toEqual([]);
    });

    test('@TypeVariable resolves too', () => {
        expect(
            checkDocContent('I am a list of @TypeVariable.', DefaultLocale),
        ).toEqual([]);
    });
});
