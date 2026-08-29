import DefaultLocale from '@locale/DefaultLocale';
import { findConceptEntry, getConceptNameById } from '@locale/getConceptName';
import type LocaleText from '@locale/LocaleText';
import ConceptLink, { ConceptName } from '@nodes/ConceptLink';
import { ConceptRegExPattern } from '@parser/Tokenizer';
import fs from 'fs';
import { expect, test } from 'vitest';

/**
 * The name a `@Concept` link shows where there is no `ConceptIndex` to resolve
 * against — the landing page and every other page outside the project, guide,
 * tutorial, and gallery how-to. Those pages may not build an index (it needs a
 * `Project` and a `Basis`, which `importGraph.test.ts` forbids page-wide chrome
 * from reaching), so before this the link rendered its raw English id: every
 * `@Volume` on the landing page read "Volume" in all 29 translated locales.
 */

const Marathi = JSON.parse(
    fs.readFileSync('static/locales/mr-IN/mr-IN.json', 'utf8'),
) as LocaleText;

test('a concept resolves in each of the four sections', () => {
    // One per section, so a section dropped from the walk fails here.
    expect(getConceptNameById(Marathi, 'Volume')).toBe('आवाज'); // input
    expect(getConceptNameById(Marathi, 'Phrase')).toBe('वाक्यांश'); // output
    expect(getConceptNameById(Marathi, 'Doc')).toBe('स्पष्टीकरण'); // node
    expect(getConceptNameById(Marathi, 'Boolean')).toBe('बुलियन'); // basis
});

test('the English id is never what a translated locale shows', () => {
    // The bug itself: these are the concepts the landing page links.
    for (const id of [
        'Volume',
        'Pitch',
        'Speech',
        'Chat',
        'Choice',
        'Beat',
        'Group',
        'Pose',
        'Sequence',
        'Say',
        'Music',
    ])
        expect(getConceptNameById(Marathi, id), id).not.toBe(id);
});

test('a name is preferred over a property called "name"', () => {
    // An output concept has both `names` (its own) and a `name` *input*. Reading
    // `name` first would label every output concept "name".
    expect(getConceptNameById(DefaultLocale, 'Phrase')).toBe('Phrase');
});

test('the emoji is not the name', () => {
    // en-US lists a type's emoji first (`["💬", "Phrase"]`), so `names[0]` would
    // hand a reader the glyph. `pickReadableName` is what prevents that.
    expect(getConceptNameById(DefaultLocale, 'Group')).toBe('Group');
});

test('a basis name is a list, and its symbol is not the name', () => {
    // `basis.*.name` is NameText and really can be a list — en-US's Boolean is
    // `["⊤⊥", "Boolean"]`. Reading it as a string finds nothing at all, and
    // reading element 0 labels the concept with its operator.
    expect(getConceptNameById(DefaultLocale, 'Boolean')).toBe('Boolean');
});

test('an unwritten name does not stop the locale chain', () => {
    // `$?` is the English placeholder; a caller walking locales must fall
    // through it, the same way `getNameLocales` filters it out at runtime.
    const unwritten = JSON.parse(JSON.stringify(Marathi)) as LocaleText;
    unwritten.input.Volume.names = ['$?Volume'];
    expect(getConceptNameById(unwritten, 'Volume')).toBeUndefined();
});

test('a property resolves by canonical key', () => {
    expect(getConceptNameById(Marathi, 'Color', 'random')).toBe(
        `${getConceptNameById(Marathi, 'Color')}.${'यादृच्छिक'}`,
    );
});

test('an unresolvable property keeps what was written', () => {
    const name = getConceptNameById(Marathi, 'Color');
    expect(getConceptNameById(Marathi, 'Color', 'nonesuch')).toBe(
        `${name}.nonesuch`,
    );
});

test('a name that is not a concept resolves to nothing', () => {
    // `@wordplay` is a glossary term, rendered by TermView; an unknown id is a
    // custom character reference. Neither may be answered with a concept name.
    expect(getConceptNameById(DefaultLocale, 'wordplay')).toBeUndefined();
    expect(getConceptNameById(DefaultLocale, 'Nonesuch')).toBeUndefined();
    expect(findConceptEntry(DefaultLocale, 'Nonesuch')).toBeUndefined();
});

test('every concept a UI string links can be named without an index', () => {
    // `ui.*` is the text that renders outside the project, guide, and tutorial,
    // so these are exactly the links with no `ConceptIndex` to fall back on. A
    // link whose id this can't resolve renders as the raw English id, which is
    // the bug — so a new one must fail here rather than in 29 locales.
    const pattern = new RegExp(ConceptRegExPattern, 'gu');
    const unresolvable: string[] = [];
    const walk = (value: unknown, path: string) => {
        if (typeof value === 'string') {
            for (const match of value.match(pattern) ?? []) {
                const parsed = ConceptLink.parse(match.slice(1));
                // Only concept references need a name here; a glossary term
                // renders through TermView and a character through CharacterView.
                if (!(parsed instanceof ConceptName)) continue;
                if (
                    getConceptNameById(
                        DefaultLocale,
                        parsed.name,
                        parsed.property,
                    ) === undefined
                )
                    unresolvable.push(`${path}: ${match}`);
            }
        } else if (Array.isArray(value))
            value.forEach((v, i) => walk(v, `${path}.${i}`));
        else if (value !== null && typeof value === 'object')
            for (const [key, v] of Object.entries(value))
                walk(v, `${path}.${key}`);
    };
    walk(DefaultLocale.ui, 'ui');
    expect(unresolvable).toEqual([]);
});
