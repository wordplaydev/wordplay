import DefaultLocale from '@locale/DefaultLocale';
import type LocaleText from '@locale/LocaleText';
import { collectingLog } from '@util/verify-locales/Log';
import { expect, test } from 'vitest';
import checkExampleDocs from './checkExampleDocs';

/**
 * An example is localized as a program rather than as markup, so its own `¶…¶`
 * doc can stay English while the names around it are translated — which makes
 * the string differ from en-US and read as translated to every whole-string
 * comparison. Nine landing-page captions sat like that.
 */

/** A locale whose captions are all translated, so a test can put exactly one
 *  of them back. Only the doc is changed; the code around it is left alone,
 *  which is the state that hid — a string that differs from en-US everywhere
 *  except the sentence a reader sees. */
function locale(phrase: string): LocaleText {
    const copy = JSON.parse(JSON.stringify(DefaultLocale)) as LocaleText;
    const captions = copy.ui.page.landing.tour.example as Record<
        string,
        string
    >;
    for (const key of Object.keys(captions))
        captions[key] = captions[key].replace(
            /¶([^¶]+)¶/,
            (_, doc: string) => `¶ø${doc}¶`,
        );
    captions.phrase = phrase;
    return copy;
}

const english = DefaultLocale.ui.page.landing.tour.example.phrase;

test('an example doc still in English is reported', () => {
    const { log, lines } = collectingLog();
    // Names translated, doc not: exactly the state that hid.
    checkExampleDocs(
        log,
        DefaultLocale,
        locale(english.replace('color:', 'couleur:')),
    );
    expect(lines.join(' ')).toContain('example doc');
});

test('a translated doc is left alone', () => {
    const { log, lines } = collectingLog();
    checkExampleDocs(
        log,
        DefaultLocale,
        locale(
            english.replace(/¶[^¶]*¶/, '¶Une phrase apparaît sur la scène.¶'),
        ),
    );
    expect(lines.join(' ')).not.toContain('example doc');
});

test('an unwritten string is not evidence of anything', () => {
    const { log, lines } = collectingLog();
    checkExampleDocs(log, DefaultLocale, locale(`$?${english}`));
    expect(lines.join(' ')).not.toContain('example doc');
});

test('the same caption regressing in any locale is caught', () => {
    // There is no exemption list: the two that needed one turned out to be a
    // concept link the model invented, fixed by putting it in the source.
    const { log, lines } = collectingLog();
    checkExampleDocs(log, DefaultLocale, locale(english));
    expect(lines.join(' ')).toContain('example doc');
});
