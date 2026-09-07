import DefaultLocale from '@locale/DefaultLocale';
import type LocaleText from '@locale/LocaleText';
import { collectingLog } from '@util/verify-locales/Log';
import { expect, test } from 'vitest';
import checkReducedTemplates from './checkReducedTemplates';

/**
 * The fixtures start from en-US and change one template, so every other string is its own
 * source and nothing else can fire.
 */
function copyLocale(): LocaleText {
    return JSON.parse(JSON.stringify(DefaultLocale)) as LocaleText;
}

test('a template reduced to only its input is reported', () => {
    const { log, lines } = collectingLog();
    const target = copyLocale();
    target.ui.source.fold.collapse = '$name';
    checkReducedTemplates(log, DefaultLocale, target, false);
    expect(lines.join(' ')).toContain('ui.source.fold.collapse');
});

test('a translation that keeps a word of its own is not reported', () => {
    const { log, lines } = collectingLog();
    const target = copyLocale();
    target.ui.source.fold.collapse = '$nameを折りたたむ';
    checkReducedTemplates(log, DefaultLocale, target, false);
    expect(lines.join(' ')).not.toContain('ui.source.fold.collapse');
});

test('punctuation around the input is not a word of its own', () => {
    // `$name。` is what ja-JP's gallery notifications had: a period is not a translation.
    const { log, lines } = collectingLog();
    const target = copyLocale();
    target.moderation.gallery.notification.approved = '$name。';
    checkReducedTemplates(log, DefaultLocale, target, false);
    expect(lines.join(' ')).toContain(
        'moderation.gallery.notification.approved',
    );
});

test('en-US carrying only function words around its input exempts the path', () => {
    // "They $description." loses only a subject pronoun, which every pro-drop language drops.
    const { log, lines } = collectingLog();
    const target = copyLocale();
    target.ui.annotations.nodeDescription = '$description.';
    checkReducedTemplates(log, DefaultLocale, target, false);
    expect(lines.join(' ')).not.toContain('ui.annotations.nodeDescription');
});

test('a conjunction is a function word too', () => {
    // "$first and $second" becoming "$first、$second" is correct Japanese.
    const { log, lines } = collectingLog();
    const target = copyLocale();
    target.ui.font.description.and = '$first、$second';
    checkReducedTemplates(log, DefaultLocale, target, false);
    expect(lines.join(' ')).not.toContain('ui.font.description.and');
});

test('a queued string is skipped', () => {
    // `$?` and `$!` both say a run is already coming for it; saying so again adds nothing.
    for (const marker of ['$?', '$!']) {
        const { log, lines } = collectingLog();
        const target = copyLocale();
        target.ui.source.fold.collapse = `${marker}$name`;
        checkReducedTemplates(log, DefaultLocale, target, false);
        expect(lines.join(' ')).not.toContain('ui.source.fold.collapse');
    }
});

test('a translation that lost the input too is left to checkTemplateInputs', () => {
    const { log, lines } = collectingLog();
    const target = copyLocale();
    target.ui.source.fold.collapse = '、';
    checkReducedTemplates(log, DefaultLocale, target, false);
    expect(lines.join(' ')).not.toContain('ui.source.fold.collapse');
});

test('fix queues the string with $!, replacing rather than stacking on $~', () => {
    const { log } = collectingLog();
    const target = copyLocale();
    target.ui.source.fold.collapse = '$~$name';
    const fixed = checkReducedTemplates(log, DefaultLocale, target, true);
    expect(fixed.ui.source.fold.collapse).toBe('$!$name');
});

test('verification does not mutate the locale', () => {
    const { log } = collectingLog();
    const target = copyLocale();
    target.ui.source.fold.collapse = '$~$name';
    const before = JSON.stringify(target);
    checkReducedTemplates(log, DefaultLocale, target, false);
    expect(JSON.stringify(target)).toBe(before);
});

test('en-US itself has nothing to report', () => {
    // Every en-US string is its own source, so a finding here would be a bug in the rule.
    const { log, lines } = collectingLog();
    checkReducedTemplates(log, DefaultLocale, copyLocale(), false);
    expect(lines.join(' ')).toBe('');
});
