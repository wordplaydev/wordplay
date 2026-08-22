import concretize from '@locale/concretize';
import DefaultLocale from '@locale/DefaultLocale';
import Locales from '@locale/Locales';
import { expect, test } from 'vitest';

/**
 * A live region only speaks when its text changes, so a recurring announcement
 * whose wording is constant is heard once and then sounds broken. Every one of
 * these fires repeatedly — an arrow key repeats, an undo is held down, a point is
 * dragged — so each has to say something different every time. Asserting one
 * message's content would pass happily while the editor was inaudible, so these
 * assert that consecutive messages differ.
 */
const locales = new Locales(concretize, [DefaultLocale], DefaultLocale);

test('a point being nudged reads differently at each position', () => {
    const spoken = [
        locales
            .concretize((l) => l.ui.page.character.announce.point, {
                index: 1,
                x: 4,
                y: 4,
            })
            .toText(),
        locales
            .concretize((l) => l.ui.page.character.announce.point, {
                index: 1,
                x: 5,
                y: 4,
            })
            .toText(),
        locales
            .concretize((l) => l.ui.page.character.announce.point, {
                index: 1,
                x: 5,
                y: 3,
            })
            .toText(),
    ];
    expect(new Set(spoken).size).toBe(spoken.length);
});

test('a point and its curve handle are not read as the same thing', () => {
    const inputs = { index: 2, x: 6, y: 7 };
    expect(
        locales
            .concretize((l) => l.ui.page.character.announce.control, inputs)
            .toText(),
    ).not.toBe(
        locales
            .concretize((l) => l.ui.page.character.announce.point, inputs)
            .toText(),
    );
});

test('moving the selection names where it landed, not just that it moved', () => {
    const first = locales
        .concretize((l) => l.ui.page.character.announce.moved, { x: 3, y: 9 })
        .toText();
    const second = locales
        .concretize((l) => l.ui.page.character.announce.moved, { x: 4, y: 9 })
        .toText();
    expect(first).not.toBe(second);
    // The destination is in the text, which is the whole reason it varies.
    expect(second).toContain('4');
});

test('a held undo reads differently at each step, even over identical edits', () => {
    // Two undos can leave the same shapes — a color change, say — so the step
    // is what has to carry the difference.
    const spoken = [
        locales
            .concretize((l) => l.ui.page.character.announce.undone, {
                step: 3,
                total: 8,
            })
            .toText(),
        locales
            .concretize((l) => l.ui.page.character.announce.undone, {
                step: 2,
                total: 8,
            })
            .toText(),
        locales
            .concretize((l) => l.ui.page.character.announce.redone, {
                step: 3,
                total: 8,
            })
            .toText(),
    ];
    expect(new Set(spoken).size).toBe(spoken.length);
});

test('drawing and erasing across a stroke read differently at each pixel', () => {
    const spoken = [
        locales
            .concretize((l) => l.ui.page.character.announce.drew, {
                x: 1,
                y: 1,
            })
            .toText(),
        locales
            .concretize((l) => l.ui.page.character.announce.drew, {
                x: 2,
                y: 1,
            })
            .toText(),
        locales
            .concretize((l) => l.ui.page.character.announce.erased, {
                x: 2,
                y: 1,
            })
            .toText(),
    ];
    expect(new Set(spoken).size).toBe(spoken.length);
});

test('deleting twice reads differently, because what is left changes', () => {
    const spoken = [2, 1, 0].map((count) =>
        locales
            .concretize((l) => l.ui.page.character.announce.deleted, { count })
            .toText(),
    );
    expect(new Set(spoken).size).toBe(spoken.length);
});

test('adding and removing points read differently from each other and by position', () => {
    const spoken = [
        locales
            .concretize((l) => l.ui.page.character.announce.pointAdded, {
                index: 2,
                x: 4,
                y: 4,
            })
            .toText(),
        locales
            .concretize((l) => l.ui.page.character.announce.pointAdded, {
                index: 3,
                x: 6,
                y: 4,
            })
            .toText(),
        locales
            .concretize((l) => l.ui.page.character.announce.pointRemoved, {
                index: 3,
                count: 3,
            })
            .toText(),
        locales
            .concretize((l) => l.ui.page.character.announce.pointRemoved, {
                index: 2,
                count: 2,
            })
            .toText(),
    ];
    expect(new Set(spoken).size).toBe(spoken.length);
});

test('curving and straightening a segment are not read as the same thing', () => {
    expect(
        locales
            .concretize((l) => l.ui.page.character.announce.curved, {
                index: 2,
            })
            .toText(),
    ).not.toBe(
        locales
            .concretize((l) => l.ui.page.character.announce.straightened, {
                index: 2,
            })
            .toText(),
    );
});

test('entering and leaving point editing read differently', () => {
    expect(
        locales
            .concretize((l) => l.ui.page.character.announce.editing, {
                count: 4,
            })
            .toText(),
    ).not.toBe(
        locales.getPrimaryPlainText(
            (l) => l.ui.page.character.announce.editingDone,
        ),
    );
});

test('a count of one reads as one, not as "1 points"', () => {
    // The plural arms are the reason this input is declared '#count'.
    expect(
        locales
            .concretize((l) => l.ui.page.character.announce.editing, {
                count: 1,
            })
            .toText(),
    ).toBe('editing one point');
    expect(
        locales
            .concretize((l) => l.ui.page.character.announce.editing, {
                count: 3,
            })
            .toText(),
    ).toBe('editing 3 points');
});

test('reordering names the layer, which is what changes as it repeats', () => {
    const spoken = [2, 3].map((index) =>
        locales
            .concretize((l) => l.ui.page.character.announce.arranged, {
                index,
                total: 4,
            })
            .toText(),
    );
    expect(new Set(spoken).size).toBe(spoken.length);
});
