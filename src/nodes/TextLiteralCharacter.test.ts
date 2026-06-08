import Project from '@db/projects/Project';
import concretize from '@locale/concretize';
import DefaultLocale from '@locale/DefaultLocale';
import Locales from '@locale/Locales';
import ConceptLink from '@nodes/ConceptLink';
import Source from '@nodes/Source';
import TextLiteral from '@nodes/TextLiteral';
import { toExpression } from '@parser/parseExpression';
import evaluateCode from '@runtime/evaluate';
import { getCodepointFromString } from '@unicode/getCodepoint';
import { expect, test } from 'vitest';

const loc = new Locales(concretize, [DefaultLocale], DefaultLocale);

// A throwaway context for getDescription (ConceptLink.getDescription ignores it).
const source = new Source('untitled', '');
const context = Project.make(
    null,
    'untitled',
    source,
    [],
    DefaultLocale,
).getContext(source);

function conceptLinks(code: string): ConceptLink[] {
    const expression = toExpression(code);
    expect(expression).toBeInstanceOf(TextLiteral);
    if (!(expression instanceof TextLiteral)) return [];
    return expression.texts
        .flatMap((t) => t.segments)
        .filter((s): s is ConceptLink => s instanceof ConceptLink);
}

test('a custom-character reference in plain text parses to a ConceptLink', () => {
    const links = conceptLinks('"hi @amy/cat"');
    expect(links).toHaveLength(1);
    expect(links[0].getName()).toBe('amy/cat');
});

test('an email is not split into a reference (email-prefix rule)', () => {
    // The @ directly follows an email-local-part character, so it stays literal
    // text rather than becoming a ConceptLink — keeping emails intact for PII
    // detection (which scans the words token).
    expect(conceptLinks('"jdoe@example.com"')).toHaveLength(0);
});

test('a username/character reference works mid-word in Latin text', () => {
    // No space and an ASCII letter before the @, but the `/` separator makes it
    // unambiguously a reference (an email domain never contains a `/`).
    const links = conceptLinks('"hi@amy/cat"');
    expect(links).toHaveLength(1);
    expect(links[0].getName()).toBe('amy/cat');
});

test('a reference can directly follow non-ASCII text (any script)', () => {
    // No space precedes the @, but the preceding character is not an ASCII
    // email-local-part character, so the reference is still recognized — this is
    // what makes the rule work for scripts that do not use inter-word spaces.
    const links = conceptLinks('"こんにちは@amy/cat"');
    expect(links).toHaveLength(1);
    expect(links[0].getName()).toBe('amy/cat');
});

test('a custom-character reference survives in the evaluated text', () => {
    // The value stays a plain string containing the reference; the view renders
    // it as a glyph.
    expect(evaluateCode('"hi @amy/cat"', [], loc)?.toWordplay(loc)).toBe(
        '"hi @amy/cat"',
    );
});

test.each([
    // A reference of each kind, with text that must appear in its description.
    ['"@Color"', ['concept', 'Color']],
    ['"@1F600"', ['Unicode', getCodepointFromString('1F600') ?? '']],
    ['"@UI/toolbar"', ['interface element', 'toolbar']],
    ['"@How/sharing"', ['how-to', 'sharing']],
    ['"@amy/cat"', ['custom character', 'amy/cat']],
])(
    'ConceptLink.getDescription describes %s by its kind',
    (code: string, expected: string[]) => {
        const link = conceptLinks(code)[0];
        const description = link.getDescription(loc, context).toText();
        // Never the concretize failure fallback.
        expect(description).not.toContain('Unparsable');
        for (const fragment of expected)
            expect(description).toContain(fragment);
    },
);

test('a codepoint reference still resolves to its character', () => {
    const smile = getCodepointFromString('1F600');
    expect(evaluateCode('"@1F600"', [], loc)?.toWordplay(loc)).toBe(
        `"${smile}"`,
    );
});
