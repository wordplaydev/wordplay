// Import Database first: it eagerly constructs the DB singleton, which must finish before
// ConceptIndex pulls in HowToDatabase (otherwise a circular import leaves it half-defined).
import '#db/Database.ts';
import ConceptIndex from '#concepts/ConceptIndex.ts';
import { kitURL } from '#concepts/ConceptParams.ts';
import Purpose from '#concepts/Purpose.ts';
import Project from '#db/projects/Project.ts';
import DefaultLocales from '#locale/DefaultLocales.ts';
import Source from '#nodes/Source.ts';
import { expect, test } from 'vitest';
import {
    guideConceptURL,
    landingOf,
    locationOf,
    type GuidePlace,
} from './GuideHistory';
import {
    conceptFromTokens,
    guideSegments,
    parseGuidePath,
    placePath,
} from './guidePath';

/**
 * The guide's chooser and breadcrumb describe where a location is filed, not how the
 * reader reached it. A concept opened from a search used to keep whatever section had
 * been browsed before, because both read the bottom of the history.
 */

const project = Project.make(
    null,
    'guide',
    Source.make(''),
    [],
    DefaultLocales.getLocales(),
);
const index = ConceptIndex.make(project, DefaultLocales, [], []);
const ownerOf = (concept: Parameters<typeof index.getConceptOwner>[0]) =>
    index.getConceptOwner(concept);

const phrase = index.getConceptByName('Phrase')!;
const size = [...phrase.getSubConcepts()][0]!;

test('a concept is filed under its own purpose in the code section', () => {
    expect(locationOf({ kind: 'concept', concept: phrase }, ownerOf)).toEqual({
        mode: 'language',
        purpose: phrase.getPurpose(),
        owner: undefined,
    });
    expect(phrase.getPurpose()).toBe(Purpose.Outputs);
});

test("a sub-concept is filed under its owner's purpose, with its owner", () => {
    const location = locationOf({ kind: 'concept', concept: size }, ownerOf);
    expect(location?.mode).toBe('language');
    expect(location?.purpose).toBe(Purpose.Outputs);
    expect(location?.owner).toBe(phrase);
});

test('a section is its own location, and a search has none', () => {
    expect(
        locationOf(
            { kind: 'section', mode: 'howto', purpose: Purpose.Outputs },
            ownerOf,
        ),
    ).toEqual({ mode: 'howto', purpose: undefined, owner: undefined });
    expect(locationOf({ kind: 'search', query: 'Phrase' }, ownerOf)).toBe(
        undefined,
    );
});

test("a concept's landing is its section, a search's is the fallback", () => {
    const fallback: GuidePlace & { kind: 'section' } = {
        kind: 'section',
        mode: 'glossary',
        purpose: Purpose.Outputs,
    };
    expect(
        landingOf({ kind: 'concept', concept: size }, ownerOf, fallback),
    ).toEqual({ kind: 'section', mode: 'language', purpose: Purpose.Outputs });
    expect(landingOf({ kind: 'search', query: 'x' }, ownerOf, fallback)).toBe(
        fallback,
    );
});

/** What a path names, resolved: the place, or a kit's name. */
function resolve(path: string) {
    const parsed = parseGuidePath(guideSegments(path));
    return parsed.kind === 'concept'
        ? conceptFromTokens(index, parsed.tokens)
        : parsed;
}

test.each([
    ['a concept', phrase],
    ['a sub-concept', size],
])("%s's link is a path that resolves back to it", (_, concept) => {
    const url = guideConceptURL(concept, index);
    expect(url.startsWith('/guide/code/outputs/')).toBe(true);
    expect(resolve(url)).toBe(concept);
    // The locale prefix is not part of the location.
    expect(resolve(`/es-MX${url}`)).toBe(concept);
});

test.each<[string, GuidePlace, string]>([
    [
        'the default landing',
        { kind: 'section', mode: 'language', purpose: Purpose.Outputs },
        '/guide',
    ],
    [
        'a code subsection',
        { kind: 'section', mode: 'language', purpose: Purpose.Inputs },
        '/guide/code/inputs',
    ],
    [
        'another section',
        { kind: 'section', mode: 'glossary', purpose: Purpose.Outputs },
        '/guide/glossary',
    ],
    ['a search', { kind: 'search', query: 'Phrase' }, '/guide/search'],
])('%s round-trips through its path', (_, place, path) => {
    expect(placePath(place, index)).toBe(path);
    const back = resolve(path);
    if (place.kind === 'section') expect(back).toEqual(place);
    else expect(back).toEqual({ kind: 'search' });
});

test('a concept filed under the wrong subsection still resolves', () => {
    // The guide then replaces the path with the concept's own.
    expect(resolve('/guide/code/inputs/Phrase')).toBe(phrase);
    expect(resolve('/guide/code/Phrase')).toBe(phrase);
});

test('a kit is its name, as two segments', () => {
    expect(kitURL('amy/colors', 3)).toBe('/guide/kits/amy/colors?version=3');
    expect(resolve('/guide/kits/amy/colors')).toEqual({
        kind: 'kit',
        name: 'amy/colors',
    });
});

test('an unknown path names the default landing', () => {
    expect(resolve('/guide/nowhere')).toEqual({
        kind: 'section',
        mode: 'language',
        purpose: Purpose.Outputs,
    });
});
