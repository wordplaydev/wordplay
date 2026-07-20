import { Unwritten } from '@locale/Annotations';
import DefaultLocale from '@locale/DefaultLocale';
import type Locale from '@locale/Locale';
import type LocaleText from '@locale/LocaleText';
import Log from '@util/verify-locales/Log';
import type Translator from '@util/verify-locales/Translator';
import { expect, test } from 'vitest';
import LocalePath from './LocalePath';
import { addMissingKeys, removeExtraKeys, translateLocale } from './verifyLocale';

// Fixtures mirror real locale paths so the tag-based classifier resolves them:
// node.Paragraph.doc is [formatted], basis.*.function.*.names is [name], and
// ui.howto.editor.notification.labels is a positional [plain] tuple.

test('removeExtraKeys keeps longer markup and name arrays', () => {
    const source = {
        node: { Paragraph: { doc: ['a', 'b'] } },
        basis: { Number: { function: { add: { names: ['+', 'add'] } } } },
        input: { Key: { keys: { Alt: ['Alt'] } } },
    };
    const target = {
        node: { Paragraph: { doc: ['x', 'y', 'z'] } },
        basis: { Number: { function: { add: { names: ['p', 'q', 'r'] } } } },
        input: { Key: { keys: { Alt: ['Alt', 'Option'] } } },
    };
    removeExtraKeys(new Log(false), source, target);
    expect(target.node.Paragraph.doc).toEqual(['x', 'y', 'z']);
    expect(target.basis.Number.function.add.names).toEqual(['p', 'q', 'r']);
    expect(target.input.Key.keys.Alt).toEqual(['Alt', 'Option']);
});

test('removeExtraKeys truncates longer positional arrays', () => {
    const source = {
        ui: { howto: { editor: { notification: { labels: ['a', 'b'] } } } },
    };
    const target = {
        ui: {
            howto: { editor: { notification: { labels: ['x', 'y', 'z'] } } },
        },
    };
    removeExtraKeys(new Log(false), source, target);
    expect(target.ui.howto.editor.notification.labels).toEqual(['x', 'y']);
});

test('addMissingKeys pads short positional arrays but not markup or name arrays', () => {
    const source = {
        ui: { howto: { editor: { notification: { labels: ['a', 'b'] } } } },
        node: { Paragraph: { doc: ['a', 'b', 'c'] } },
        basis: { Number: { function: { add: { names: ['+', 'add'] } } } },
        input: { Key: { keys: { Alt: ['Alt', 'Option'] } } },
    };
    const target = {
        ui: { howto: { editor: { notification: { labels: ['x'] } } } },
        node: { Paragraph: { doc: ['x'] } },
        basis: { Number: { function: { add: { names: ['p'] } } } },
        input: { Key: { keys: { Alt: ['Alt'] } } },
    };
    addMissingKeys(new Log(false), source, target);
    expect(target.ui.howto.editor.notification.labels).toEqual([
        'x',
        Unwritten,
    ]);
    expect(target.node.Paragraph.doc).toEqual(['x']);
    expect(target.basis.Number.function.add.names).toEqual(['p']);
    expect(target.input.Key.keys.Alt).toEqual(['Alt']);
});

// Regression guard for the phase-ordering bug: construct names (NameText) must be
// translated and written into the locale BEFORE the docs whose `\code\` examples
// reference them, so the example localizer retargets library references to the
// freshly-chosen localized names instead of soon-nonexistent placeholders.
test('translateLocale translates construct names before example-bearing docs', async () => {
    // Clone the real default locale so the fixture is a valid LocaleText, then
    // seed a construct name and a doc containing a `\code\` example that uses it.
    const source = JSON.parse(JSON.stringify(DefaultLocale)) as LocaleText;
    source.output.Phrase.names = 'Phrase';
    source.output.Phrase.doc = 'Make one with \\Phrase("hi")\\.';
    const target = JSON.parse(JSON.stringify(source)) as LocaleText;

    const namePath = new LocalePath(['output', 'Phrase'], 'names', 'Phrase');
    const docPath = new LocalePath(
        ['output', 'Phrase'],
        'doc',
        source.output.Phrase.doc,
    );

    // Record the strings passed to each translate() call so we can assert the
    // name is dispatched in an earlier call than the example-bearing doc.
    const calls: string[][] = [];
    const stub: Translator = {
        id: 'stub',
        async translate(_log, text) {
            calls.push([...text]); // copy: apply drains the returned array via shift()
            return [...text]; // echo: a valid same-length result so apply proceeds
        },
        getTargetLocale: (language, regions) =>
            Promise.resolve(
                regions.length > 0 ? `${language}-${regions[0]}` : language,
            ),
        getSupportedLocales: () => Promise.resolve([] as Locale[]),
    };

    await translateLocale(
        new Log(false),
        source,
        target,
        [namePath, docPath],
        new Set<string>(),
        stub,
    );

    const nameCall = calls.findIndex((c) => c.some((s) => s.includes('Phrase')));
    const docCall = calls.findIndex((c) =>
        c.some((s) => s.includes('\\Phrase("hi")\\')),
    );
    expect(nameCall).toBeGreaterThanOrEqual(0);
    expect(docCall).toBeGreaterThanOrEqual(0);
    // Separate, name-first calls — merging the phases would make these equal.
    expect(nameCall).toBeLessThan(docCall);
});
