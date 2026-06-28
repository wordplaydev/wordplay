import DefaultLocale from '@locale/DefaultLocale';
import { stringToLocale } from '@locale/Locale';
import Source from '@nodes/Source';
import { expect, test } from 'vitest';
import Project from '@db/projects/Project';
import translateProjectContent, {
    type RawTranslator,
} from './translateProjectContent';

const en = stringToLocale('en-US');
const es = stringToLocale('es-ES');

/** A fake translator with a fixed source→target dictionary, echoing anything
 *  unknown so the test is deterministic and needs no network. */
function fakeTranslator(dictionary: Record<string, string>): RawTranslator {
    return async (texts) => texts.map((t) => dictionary[t] ?? t);
}

test('replace mode rewrites names, their references, and text into the target language', async () => {
    if (en === undefined || es === undefined) throw new Error('bad locale');

    // A bind, a text literal, and a reference to the bind.
    const source = new Source('start', 'cat: "meow"\ncat');
    const project = Project.make(null, 'test', source, [], DefaultLocale);

    const result = await translateProjectContent(
        project,
        en,
        es,
        fakeTranslator({ cat: 'gato', meow: 'miau' }),
        undefined,
        true,
    );

    expect(result).not.toBeNull();
    const out = result?.getSources()[0].toWordplay() ?? '';

    // The name and its reference are replaced (not added alongside the source).
    expect(out).toContain('gato');
    expect(out).not.toContain('cat');
    // The text literal is replaced in place.
    expect(out).toContain('miau');
    expect(out).not.toContain('meow');
});

test('add mode keeps the source name and adds the target as another option', async () => {
    if (en === undefined || es === undefined) throw new Error('bad locale');

    // A language-tagged source name, so adding the target keeps both.
    const source = new Source('start', 'cat/en: "meow"\ncat');
    const project = Project.make(null, 'test', source, [], DefaultLocale);

    const result = await translateProjectContent(
        project,
        en,
        es,
        fakeTranslator({ cat: 'gato', meow: 'miau' }),
        undefined,
        // replace defaults to false
    );

    expect(result).not.toBeNull();
    const out = result?.getSources()[0].toWordplay() ?? '';

    // Both the source and target names are present (multilingual).
    expect(out).toContain('cat');
    expect(out).toContain('gato');
});
