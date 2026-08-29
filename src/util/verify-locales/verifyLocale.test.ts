import { MachineTranslated, Unwritten } from '@locale/Annotations';
import DefaultLocale from '@locale/DefaultLocale';
import type Locale from '@locale/Locale';
import type LocaleText from '@locale/LocaleText';
import { collectingLog } from '@util/verify-locales/Log';
import type Translator from '@util/verify-locales/Translator';
import { expect, test } from 'vitest';
import LocalePath from './LocalePath';
import { isNameTextPath } from './classifyLocalePath';
import {
    addMissingKeys,
    CHECKPOINT_PATHS,
    getCheckableLocalePairs,
    removeExtraKeys,
    shouldStringBeMachineTranslated,
    translateLocale,
    verifyLocale,
} from './verifyLocale';

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
    removeExtraKeys(collectingLog().log, source, target);
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
    removeExtraKeys(collectingLog().log, source, target);
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
    addMissingKeys(collectingLog().log, source, target);
    expect(target.ui.howto.editor.notification.labels).toEqual([
        'x',
        Unwritten,
    ]);
    expect(target.node.Paragraph.doc).toEqual(['x']);
    expect(target.basis.Number.function.add.names).toEqual(['p']);
    expect(target.input.Key.keys.Alt).toEqual(['Alt']);
});

// Glossary forms are content each locale writes for itself, so the tooling must
// neither add en-US's to a locale that has none nor delete a locale's own where
// en-US has none — and must never count them toward what's left to translate.
test('glossary forms are left alone by the key repairs', () => {
    // en-US has forms for `parameter` but none for `value`; the locale has the
    // reverse, which is the whole point of the field.
    const source = {
        glossary: {
            parameter: { word: 'parameter', forms: ['parameters'] },
            value: { word: 'value' },
        },
    };
    const target: {
        glossary: {
            parameter: { word: string; forms?: string[] };
            value?: { word: string; forms?: string[] };
        };
    } = {
        glossary: {
            parameter: { word: 'parámetro' },
            value: { word: 'valor', forms: ['valores'] },
        },
    };
    addMissingKeys(collectingLog().log, source, target);
    expect(target.glossary.parameter.forms).toBeUndefined();
    removeExtraKeys(collectingLog().log, source, target);
    expect(target.glossary.value?.forms).toEqual(['valores']);
});

test('getCheckableLocalePairs skips glossary forms', () => {
    const paths = getCheckableLocalePairs(DefaultLocale).map((p) =>
        p.toString(),
    );
    expect(paths.some((p) => p.includes('glossary.parameter.word'))).toBe(true);
    expect(paths.some((p) => p.includes('glossary.parameter.forms'))).toBe(
        false,
    );
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
        collectingLog().log,
        source,
        target,
        [namePath, docPath],
        new Set<string>(),
        stub,
    );

    const nameCall = calls.findIndex((c) =>
        c.some((s) => s.includes('Phrase')),
    );
    const docCall = calls.findIndex((c) =>
        c.some((s) => s.includes('\\Phrase("hi")\\')),
    );
    expect(nameCall).toBeGreaterThanOrEqual(0);
    expect(docCall).toBeGreaterThanOrEqual(0);
    // Separate, name-first calls — merging the phases would make these equal.
    expect(nameCall).toBeLessThan(docCall);
});

// A locale's `terms` word list is expanded before the string is parsed as
// markup, and it belongs to the locale being checked — not en-US, whose terms
// can't resolve it. Checking against en-US made every $term reference look like
// an unresolvable mention, so the whole string reported as unparsable (#1284).
// The flip side is checked in the same pass: expanding terms must not blanket-
// accept every $name, or a translator's typo becomes literal text in the UI.
// Verifying a whole locale is slow enough to need more than the default timeout.
test('a $term reference resolves against this locale, but an unknown $name still fails', async () => {
    const locale = JSON.parse(JSON.stringify(DefaultLocale)) as LocaleText;
    locale.terms = { errorTerm: 'त्रुटि', inputTerm: 'इनपुट' };
    // A [formatted] field and a [plain] field, the two shapes the issue reports.
    locale.glossary.value.definition = 'A $errorTerm is a thing.';
    locale.node.Evaluate.conflict.IncompatibleInput.name = 'bad $inputTerm';
    // And one typo alongside a valid term, which must still be reported.
    locale.glossary.type.definition = 'A $errorTerm and a $typo.';

    const { log, lines } = collectingLog();
    await verifyLocale(
        log,
        'hi-IN',
        locale,
        false,
        false,
        false,
        [],
        new Map(),
    );

    // The typo'd string is the only template complaint: the two strings that use
    // nothing but terms are silent (before the fix, all three failed). Filtered
    // rather than counted, because this fixture is a copy of en-US and so trips
    // checkUntranslated on every string in it.
    const templates = lines.filter((line) =>
        line.includes('unparsable template string'),
    );
    expect(templates).toHaveLength(1);
    expect(templates[0]).toContain('glossary.type.definition');
}, 30000);

// A path is selected for translation when ANY element needs it, but the other
// elements may hold good translations — re-sending them re-bills the API and
// replaces them with fresh machine output for nothing. The predicate narrows a
// non-markup array to just the elements that need work; the rest stay verbatim.
test('translateLocale sends only the array elements that need translation', async () => {
    const source = JSON.parse(JSON.stringify(DefaultLocale)) as LocaleText;
    source.ui.howto.editor.notification.labels = ['alpha', 'beta'];
    const target = JSON.parse(JSON.stringify(source)) as LocaleText;
    // Element 0 already has a reviewed translation; element 1 is unwritten.
    target.ui.howto.editor.notification.labels = ['uno', '$?beta'];

    const path = new LocalePath(
        ['ui', 'howto', 'editor', 'notification'],
        'labels',
        source.ui.howto.editor.notification.labels,
    );

    const sent: string[] = [];
    const stub: Translator = {
        id: 'stub',
        async translate(_log, text) {
            sent.push(...text);
            return text.map((t) => `X${t}`);
        },
        getTargetLocale: (language) => Promise.resolve(language),
        getSupportedLocales: () => Promise.resolve([] as Locale[]),
    };

    const revised = await translateLocale(
        collectingLog().log,
        source,
        target,
        [path],
        new Set<string>(),
        stub,
        (_path, existing) =>
            existing === undefined || existing.startsWith(Unwritten),
    );

    // Only the unwritten element was sent…
    expect(sent).toEqual(['beta']);
    // …the translated element replaced it, and the good one was kept verbatim.
    expect(revised.ui.howto.editor.notification.labels).toEqual([
        'uno',
        '$~Xbeta',
    ]);
});

// Identifier phases carry `options.names` so a backend can route them to a
// stronger model — names are a sliver of a run's tokens, and a bad one is a
// cross-locale collision rather than an awkward sentence.
test('translateLocale marks glossary and construct-name phases as names', async () => {
    const source = JSON.parse(JSON.stringify(DefaultLocale)) as LocaleText;
    source.output.Phrase.names = 'Phrase';
    source.glossary.value.word = 'value';
    source.ui.howto.editor.notification.labels = ['alpha', 'beta'];
    const target = JSON.parse(JSON.stringify(source)) as LocaleText;

    const calls: { texts: string[]; names: boolean }[] = [];
    const stub: Translator = {
        id: 'stub',
        async translate(_log, text, _from, _to, _target, options) {
            calls.push({ texts: [...text], names: options?.names === true });
            return [...text];
        },
        getTargetLocale: (language) => Promise.resolve(language),
        getSupportedLocales: () => Promise.resolve([] as Locale[]),
    };

    await translateLocale(
        collectingLog().log,
        source,
        target,
        [
            new LocalePath(['glossary', 'value'], 'word', 'value'),
            new LocalePath(['output', 'Phrase'], 'names', 'Phrase'),
            new LocalePath(
                ['ui', 'howto', 'editor', 'notification'],
                'labels',
                source.ui.howto.editor.notification.labels,
            ),
        ],
        new Set<string>(),
        stub,
    );

    const named = calls.filter((call) => call.names);
    const prose = calls.filter((call) => !call.names);
    // The glossary word and the construct name each rode a names call…
    expect(named.flatMap((call) => call.texts)).toEqual(
        expect.arrayContaining(['value', 'Phrase']),
    );
    // …and the plain labels did not.
    expect(prose.flatMap((call) => call.texts)).toEqual(
        expect.arrayContaining(['alpha', 'beta']),
    );
    expect(named.flatMap((call) => call.texts)).not.toEqual(
        expect.arrayContaining(['alpha']),
    );
});

// --- Checkpointing ---------------------------------------------------------
//
// The bulk translation phase is the long pole of a locale run, and it used to
// reach disk only when it finished — so a process killed partway lost every
// string it had paid for. It is now sliced, saving as it goes.

/** Real scalar paths that land in the bulk phase: not glossary words (phase 1)
 *  and not NameText (phase 2a). Real paths rather than synthetic keys so the
 *  slicing is exercised against the shapes the locale actually has. */
function bulkPaths(count: number): LocalePath[] {
    return getCheckableLocalePairs(DefaultLocale)
        .filter((path) => typeof path.value === 'string')
        .filter((path) => !(path.path[0] === 'glossary' && path.key === 'word'))
        .filter((path) => !isNameTextPath([...path.path, path.key]))
        .slice(0, count);
}

/** Echoes each string with an `X` prefix, recording every string it was asked
 *  for in order, so the write-back can be checked against what was sent. */
function echoingTranslator(sent: string[]): Translator {
    return {
        id: 'stub',
        async translate(_log, text) {
            sent.push(...text);
            return text.map((t) => `X${t}`);
        },
        getTargetLocale: (language, regions) =>
            Promise.resolve(
                regions.length > 0 ? `${language}-${regions[0]}` : language,
            ),
        getSupportedLocales: () => Promise.resolve([] as Locale[]),
    };
}

test('translateLocale checkpoints once per slice of the bulk phase', async () => {
    const source = JSON.parse(JSON.stringify(DefaultLocale)) as LocaleText;
    const target = JSON.parse(JSON.stringify(DefaultLocale)) as LocaleText;
    const paths = bulkPaths(CHECKPOINT_PATHS * 2 + 1);

    const saved: LocaleText[] = [];
    await translateLocale(
        collectingLog().log,
        source,
        target,
        paths,
        new Set<string>(),
        echoingTranslator([]),
        undefined,
        async (partial) => {
            // Copy: `revised` keeps being mutated after the checkpoint returns,
            // so holding the reference would assert against the final state.
            saved.push(JSON.parse(JSON.stringify(partial)) as LocaleText);
        },
    );

    // Two full slices plus a remainder of one.
    expect(saved.length).toBe(3);

    // Each payload is a whole locale rather than a fragment — that is what makes
    // it safe to write over the real file.
    for (const partial of saved) expect(partial.output.Phrase).toBeDefined();

    // And progress is monotonic: each save holds strictly more than the last.
    const done = saved.map(
        (partial) =>
            paths.filter((path) => {
                const value = path.resolve(partial);
                return (
                    typeof value === 'string' &&
                    value.startsWith(MachineTranslated)
                );
            }).length,
    );
    expect(done[0]).toBeGreaterThan(0);
    expect(done[1]).toBeGreaterThan(done[0]);
    expect(done[2]).toBeGreaterThan(done[1]);
});

// The write-back drains the translation array with shift(), in lockstep with the
// strings that were sent. Slicing rebuilds both per call, so a boundary that
// shifted one against the other would mis-assign translations to paths rather
// than fail loudly.
test('slicing the bulk phase keeps every path aligned with its translation', async () => {
    const count = CHECKPOINT_PATHS * 2 + 37;
    const source = JSON.parse(JSON.stringify(DefaultLocale)) as LocaleText;
    const target = JSON.parse(JSON.stringify(DefaultLocale)) as LocaleText;
    const paths = bulkPaths(count);
    const sent: string[] = [];

    const revised = await translateLocale(
        collectingLog().log,
        source,
        target,
        paths,
        new Set<string>(),
        echoingTranslator(sent),
    );

    expect(sent.length).toBe(count);
    for (let index = 0; index < count; index++)
        expect(paths[index].resolve(revised)).toBe(
            `${MachineTranslated}X${sent[index]}`,
        );
});

test('a phase with no paths does not checkpoint', async () => {
    const source = JSON.parse(JSON.stringify(DefaultLocale)) as LocaleText;
    const target = JSON.parse(JSON.stringify(DefaultLocale)) as LocaleText;
    let saves = 0;
    await translateLocale(
        collectingLog().log,
        source,
        target,
        bulkPaths(1),
        new Set<string>(),
        echoingTranslator([]),
        undefined,
        async () => {
            saves++;
        },
    );
    // Only the one bulk slice ran; the glossary-word and construct-name phases
    // had nothing to do, and re-serializing an unchanged locale through Prettier
    // twice per locale across a full run is real time for no gain.
    expect(saves).toBe(1);
});

// What makes a checkpoint durable rather than merely written: a saved string
// carries $~, which is skipped on the next run, so resuming pays only for what
// is still $?.
test('a machine-translated string is not re-translated, but an unwritten one is', () => {
    expect(shouldStringBeMachineTranslated(`${Unwritten}hello`, false)).toBe(
        true,
    );
    expect(
        shouldStringBeMachineTranslated(`${MachineTranslated}hola`, false),
    ).toBe(false);
    // …unless the run is explicitly overriding machine translations.
    expect(
        shouldStringBeMachineTranslated(`${MachineTranslated}hola`, true),
    ).toBe(true);
});
