import DefaultLocale from '@locale/DefaultLocale';
import type LocaleText from '@locale/LocaleText';
import { collectingLog } from '@util/verify-locales/Log';
import { expect, test } from 'vitest';
import checkUntranslated from './checkUntranslated';

function copyLocale(): LocaleText {
    return JSON.parse(JSON.stringify(DefaultLocale)) as LocaleText;
}

/** A locale in which nothing is the English, so each test can introduce exactly
 *  one thing that is. Every string is prefixed rather than replaced, since the
 *  check only ever compares a value to its en-US source. */
function translatedLocale(): LocaleText {
    return translate(copyLocale()) as LocaleText;
}

function translate(value: unknown): unknown {
    if (typeof value === 'string') return `ø${value}`;
    if (Array.isArray(value)) return value.map(translate);
    if (value !== null && typeof value === 'object')
        return Object.fromEntries(
            Object.entries(value).map(([key, v]) => [key, translate(v)]),
        );
    return value;
}

test('a prose string identical to en-US with no status is reported and queued', () => {
    const { log, lines } = collectingLog();
    const target = translatedLocale();
    target.ui.widget.color.pick.tip = DefaultLocale.ui.widget.color.pick.tip;
    const fixed = checkUntranslated(log, DefaultLocale, target, true);
    expect(lines.join(' ')).toContain('ui.widget.color.pick.tip');
    expect(fixed.ui.widget.color.pick.tip).toBe(
        `$?${DefaultLocale.ui.widget.color.pick.tip}`,
    );
});

test('a string that claims a write status is left alone', () => {
    // `$~` and `$?` are claims other tooling already acts on — an unclaimed
    // string is the only thing nothing else can see.
    const { log, lines } = collectingLog();
    const target = translatedLocale();
    target.ui.widget.color.pick.tip = `$~${DefaultLocale.ui.widget.color.pick.tip}`;
    checkUntranslated(log, DefaultLocale, target, true);
    expect(lines.join(' ')).not.toContain('ui.widget.color.pick.tip');
});

test('a template identical to en-US is not evidence of anything', () => {
    // `$from → $to` is the same in every locale by construction.
    const { log, lines } = collectingLog();
    const target = translatedLocale();
    target.basis.Number.conversion.unit =
        DefaultLocale.basis.Number.conversion.unit;
    checkUntranslated(log, DefaultLocale, target, false);
    expect(lines.join(' ')).not.toContain('basis.Number.conversion.unit');
});

test('a one-word label identical to en-US is not evidence of anything', () => {
    const { log, lines } = collectingLog();
    const target = translatedLocale();
    target.ui.howto.viewer.view.tip = 'Wordplay';
    checkUntranslated(log, DefaultLocale, target, false);
    expect(lines.join(' ')).not.toContain('ui.howto.viewer.view.tip');
});

test('a name shared with en-US belongs to checkRedundantNames', () => {
    // A locale legitimately repeats an operator or an emoji; removing those is
    // a different check's job, with different rules about when it is safe.
    const { log, lines } = collectingLog();
    const target = translatedLocale();
    target.input.Key.names = [...DefaultLocale.input.Key.names];
    checkUntranslated(log, DefaultLocale, target, false);
    expect(lines.join(' ')).not.toContain('input.Key.names');
});

test('a font family name is exempt', () => {
    // "Noto Sans" is what the face is called everywhere; translating it would
    // name a font that is not loaded.
    const { log, lines } = collectingLog();
    const target = translatedLocale();
    target.ui.font.app = DefaultLocale.ui.font.app;
    checkUntranslated(log, DefaultLocale, target, false);
    expect(lines.join(' ')).not.toContain('ui.font.app');
});

test('a markup array still in English is queued on its first element only', () => {
    const { log } = collectingLog();
    const target = translatedLocale();
    target.node.Paragraph.doc = [...DefaultLocale.node.Paragraph.doc];
    const fixed = checkUntranslated(log, DefaultLocale, target, true);
    expect(fixed.node.Paragraph.doc[0]).toBe(
        `$?${DefaultLocale.node.Paragraph.doc[0]}`,
    );
    expect(fixed.node.Paragraph.doc.slice(1)).toEqual(
        DefaultLocale.node.Paragraph.doc.slice(1),
    );
});

test('verification does not mutate the locale', () => {
    const target = translatedLocale();
    target.ui.widget.color.pick.tip = DefaultLocale.ui.widget.color.pick.tip;
    const before = JSON.stringify(target);
    checkUntranslated(collectingLog().log, DefaultLocale, target, false);
    expect(JSON.stringify(target)).toBe(before);
});

test('a "$!" string that is still the English is stuck, not merely stale', () => {
    // The blind spot this closes: `$!` means "there is a translation and it has
    // gone stale", so nothing treated it as an error — but a `$!` whose value
    // is still the English is queued and not draining. Two had been round that
    // loop for releases, each run failing on them and re-queuing them.
    const { log, lines } = collectingLog();
    const target = translatedLocale();
    target.ui.widget.color.pick.tip = `$!${DefaultLocale.ui.widget.color.pick.tip}`;
    checkUntranslated(log, DefaultLocale, target, false);
    const said = lines.join(' ');
    expect(said).toContain('ui.widget.color.pick.tip');
    expect(said).toContain('still the English');
});

test('a "$!" string with a real translation is left alone', () => {
    // The ordinary case the marker is for: translated once, since reworded.
    const { log, lines } = collectingLog();
    const target = translatedLocale();
    target.ui.widget.color.pick.tip = `$!ø${DefaultLocale.ui.widget.color.pick.tip}`;
    checkUntranslated(log, DefaultLocale, target, false);
    expect(lines.join(' ')).not.toContain('ui.widget.color.pick.tip');
});

test('a "$!" string with nothing translatable in it warns instead', () => {
    // Prose inside a `\…\` example is classified as code, so no run can ever
    // offer it and the marker can never clear. That is a person's job, not a
    // red build — see the module comment.
    const { log, lines } = collectingLog();
    const target = translatedLocale();
    const example = "\\¶Phrases appear on stage in any color.¶\nPhrase('hi')\\";
    const source = copyLocale();
    source.ui.widget.color.pick.tip = example;
    target.ui.widget.color.pick.tip = `$!${example}`;
    checkUntranslated(log, source, target, false);
    const said = lines.join(' ');
    expect(said).toContain('ui.widget.color.pick.tip');
    expect(said).toContain('a translator can be given');
});
