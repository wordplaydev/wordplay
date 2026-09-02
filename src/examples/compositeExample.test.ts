import { parseAsMultilingualName } from '@db/projects/getLocalizedProjectName';
import Project from '@db/projects/Project';
import DefaultLocale from '@locale/DefaultLocale';
import Source from '@nodes/Source';
import { expect, test } from 'vitest';
import { compositeExample } from './compositeExample';
import { parseSerializedProject } from './examples';

/**
 * Compositing merges per-locale rewrites of one master into one multilingual
 * project (#1310). These fixtures are shaped exactly the way the pipeline
 * writes files: node-isomorphic to each other, untagged in their own language,
 * tagged content preserved.
 */

function input(locale: string, text: string) {
    return {
        locale,
        project: parseSerializedProject(
            text,
            'example-Test',
            locale === 'en-US' ? undefined : [locale],
        ),
    };
}

const Spanish = `Y\nAventura\n=== start\n¶historia¶\npalabra: 'hola'\nPhrase(palabra)`;
const Japanese = `Y\n冒険\n=== start\n¶ものがたり¶\nことば: 'こんにちは'\nPhrase(ことば)`;

test('two locales composite into one tagged multilingual program', () => {
    const composite = compositeExample(
        'example-Test',
        input('es-MX', Spanish),
        [input('ja-JP', Japanese)],
    );

    expect(composite.locales).toEqual(['es-MX', 'ja-JP']);
    expect(composite.name).toBe(`"Aventura"/es-MX"冒険"/ja-JP`);
    expect(parseAsMultilingualName(composite.name)).toBeDefined();

    // The base's untagged content is tagged with its locale — getPreferred
    // never matches an untagged option, so an untagged base would lose to the
    // secondary — and the secondary's options ride behind it.
    expect(composite.sources[0].code).toBe(
        `¶historia¶/es-MX\n¶ものがたり¶/ja-JP\npalabra/es-MX,ことば/ja-JP: 'hola'/es-MX'こんにちは'/ja-JP\nPhrase(palabra)`,
    );

    // The merged program parses and analyzes without conflicts.
    const project = Project.make(
        null,
        'test',
        new Source(composite.sources[0].names, composite.sources[0].code),
        [],
        DefaultLocale,
    );
    expect(
        Array.from(project.analyze().conflictedNodes.values()).flat(),
    ).toHaveLength(0);
});

test('the en-US master composites as a secondary, its tagged content untouched', () => {
    const master = `Y\n"Adventure"/en"冒险"/zh-CN\n=== start\nword: 'hello''bonjour'/fr\nPhrase(word)`;
    const spanish = `Y\nAventura\n=== start\npalabra: 'hola''bonjour'/fr\nPhrase(palabra)`;
    const composite = compositeExample(
        'example-Test',
        input('es-MX', spanish),
        [input('en-US', master)],
    );

    expect(composite.locales).toEqual(['es-MX', 'en-US']);
    // The master's own-language name comes from its multilingual line.
    expect(composite.name).toBe(`"Aventura"/es-MX"Adventure"/en-US`);
    // The preserved `/fr` option is byte-identical on both sides, so it is
    // neither tagged nor duplicated; the English rides after the literal.
    expect(composite.sources[0].code).toBe(
        `palabra/es-MX,word/en-US: 'hola'/es-MX'bonjour'/fr'hello'/en-US\nPhrase(palabra)`,
    );
});

test('an identical option is neither tagged nor appended', () => {
    // A symbolic name and an untranslatable string read the same in both
    // languages; tagging them would just be noise.
    const a = `Y\nTest\n=== start\n🐈: 'abc'\nPhrase(🐈)`;
    const b = `Y\nTest\n=== start\n🐈: 'abc'\nPhrase(🐈)`;
    const composite = compositeExample('example-Test', input('es-MX', a), [
        input('ja-JP', b),
    ]);
    expect(composite.sources[0].code).toBe(`🐈: 'abc'\nPhrase(🐈)`);
    expect(composite.locales).toEqual(['es-MX', 'ja-JP']);
});

test('a misaligned secondary is dropped whole, never partially merged', () => {
    // The secondary came from an older master with a different shape.
    const stale = `Y\n冒険\n=== start\nことば: 'こんにちは'`;
    const composite = compositeExample(
        'example-Test',
        input('es-MX', Spanish),
        [input('ja-JP', stale)],
    );
    expect(composite.sources[0].code).toBe(
        `¶historia¶\npalabra: 'hola'\nPhrase(palabra)`,
    );
    expect(composite.locales).toEqual(['es-MX']);
    expect(composite.name).toBe(`"Aventura"/es-MX`);
});

test('a secondary with a different source count is dropped', () => {
    const twoSources = `Y\n冒険\n=== start\nことば: 'こんにちは'\n=== extra\n1`;
    const composite = compositeExample(
        'example-Test',
        input('es-MX', Spanish),
        [input('ja-JP', twoSources)],
    );
    expect(composite.locales).toEqual(['es-MX']);
});

// The end-to-end reason key-name literals are mapped per locale (#1310): the
// Key stream reports the primary locale's display name, so WhatWord's
// `key = "Space"` had to become `"Espacio"` in the es-MX file — and the
// composite of that file with the master must still start when space is
// pressed, whichever option the evaluator resolves.
test('the composited WhatWord starts on a space press', async () => {
    const { DB } = await import('@db/Database');
    const { default: Evaluator, Mode } = await import('@runtime/Evaluator');
    const { default: Key } = await import('@input/Key/Key');
    const { readFileSync } = await import('node:fs');
    const { default: Source } = await import('@nodes/Source');
    const { default: Project } = await import('@db/projects/Project');

    const esText = JSON.parse(
        readFileSync('static/locales/es-MX/es-MX.json', 'utf8'),
    );
    const master = parseSerializedProject(
        readFileSync('static/examples/WhatWord.wp', 'utf8'),
        'example-WhatWord',
    );
    const es = parseSerializedProject(
        readFileSync('static/examples/es-MX/WhatWord.wp', 'utf8'),
        'example-WhatWord',
        ['es-MX'],
    );
    const composite = compositeExample(
        'example-WhatWord',
        { locale: 'es-MX', project: es },
        [{ locale: 'en-US', project: master }],
    );
    for (const [label, serialized] of [
        ['es alone', es],
        ['composite', composite],
    ] as const) {
        const [main, ...rest] = serialized.sources.map(
            (source) => new Source(source.names, source.code),
        );
        const project = Project.make(null, label, main, rest, esText);
        const evaluator = new Evaluator(
            project,
            DB,
            project.getLocales().getLocales(),
            true,
        );
        evaluator.getInitialValue();
        evaluator.setMode(Mode.Play);
        evaluator.singletonReact(Key, (stream) =>
            stream.react({ key: ' ', down: true }),
        );
        const stage =
            evaluator.getLatestSourceValue(project.getMain())?.toWordplay() ??
            '';
        evaluator.stop();
        expect(
            stage.includes('Escribe') || stage.includes('Type a letter'),
            `${label} did not start on space`,
        ).toBe(true);
    }
});
