import DefaultLocale from '@locale/DefaultLocale';
import type LocaleText from '@locale/LocaleText';
import { collectingLog } from '@util/verify-locales/Log';
import { expect, test } from 'vitest';
import checkOppositeStrings, {
    getOppositeStrings,
} from './checkOppositeStrings';

function copyLocale(): LocaleText {
    return JSON.parse(JSON.stringify(DefaultLocale)) as LocaleText;
}

test('the conventions find the pairs en-US actually spells', () => {
    // A spot check of all four spellings: whole key, camelCase suffix, and both sides of a
    // convention that only exists as a suffix.
    const found = new Set(
        getOppositeStrings().map(
            ({ first, second }) =>
                `${first.toString()} / ${String(second.key)}`,
        ),
    );
    expect(found).toContain('ui.source.fold.collapse / expand');
    expect(found).toContain('ui.source.fold.collapsed / expanded');
    expect(found).toContain('ui.markup.feedback.formatOn / formatOff');
    expect(found).toContain('ui.output.point.added / removed');
    expect(found).toContain(
        'moderation.gallery.notification.approved / denied',
    );
    expect(found.size).toBeGreaterThan(50);
});

test('two opposites translated identically are reported', () => {
    const { log, lines } = collectingLog();
    const target = copyLocale();
    target.ui.output.point.added = '点$number';
    target.ui.output.point.removed = '点$number';
    checkOppositeStrings(log, target, false);
    expect(lines.join(' ')).toContain('ui.output.point.added / removed');
});

test('a pair en-US does not distinguish is never a pair', () => {
    // The rule is "en-US distinguishes them and the translation doesn't", so a pair whose two
    // en-US values already match has no distinction to lose and is dropped from the index.
    for (const { first, second } of getOppositeStrings())
        expect(first.resolve(DefaultLocale)).not.toBe(
            second.resolve(DefaultLocale),
        );
});

test('opposites that differ are not reported', () => {
    const { log, lines } = collectingLog();
    const target = copyLocale();
    target.ui.output.point.added = '点$numberを追加';
    target.ui.output.point.removed = '点$numberを削除';
    checkOppositeStrings(log, target, false);
    expect(lines.join(' ')).not.toContain('ui.output.point.added');
});

test('a queued member skips the pair', () => {
    const { log, lines } = collectingLog();
    const target = copyLocale();
    target.ui.output.point.added = '$?点$number';
    target.ui.output.point.removed = '点$number';
    checkOppositeStrings(log, target, false);
    expect(lines.join(' ')).not.toContain('ui.output.point.added');
});

test('a write status does not hide a collision', () => {
    // Both strings are machine translated, which is exactly how this defect arrives.
    const { log, lines } = collectingLog();
    const target = copyLocale();
    target.ui.output.point.added = '$~点$number';
    target.ui.output.point.removed = '$~点$number';
    checkOppositeStrings(log, target, false);
    expect(lines.join(' ')).toContain('ui.output.point.added / removed');
});

test('fix queues both members with $!, replacing rather than stacking on $~', () => {
    const { log } = collectingLog();
    const target = copyLocale();
    target.ui.output.point.added = '$~点$number';
    target.ui.output.point.removed = '$~点$number';
    const fixed = checkOppositeStrings(log, target, true);
    expect(fixed.ui.output.point.added).toBe('$!点$number');
    expect(fixed.ui.output.point.removed).toBe('$!点$number');
});

test('verification does not mutate the locale', () => {
    const { log } = collectingLog();
    const target = copyLocale();
    target.ui.output.point.added = '$~点$number';
    target.ui.output.point.removed = '$~点$number';
    const before = JSON.stringify(target);
    checkOppositeStrings(log, target, false);
    expect(JSON.stringify(target)).toBe(before);
});

test('en-US itself has nothing to report', () => {
    const { log, lines } = collectingLog();
    checkOppositeStrings(log, copyLocale(), false);
    expect(lines.join(' ')).toBe('');
});
