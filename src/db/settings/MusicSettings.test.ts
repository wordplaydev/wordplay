import {
    MusicVisualizationFloor,
    MusicVisualizationIcons,
    MusicVisualizations,
    musicFloorHeight,
} from '@db/settings/MusicSettings';
import DefaultLocale from '@locale/DefaultLocale';
import { describe, expect, test } from 'vitest';

describe('the chooser and the floor rule agree', () => {
    test('every rendering the chooser offers has a floor rule', () => {
        // The Record type forces totality against the union; this catches the
        // drift it can't see — a rendering in the union and the record but
        // missing from the chooser array, or the reverse.
        expect(Object.keys(MusicVisualizationFloor).sort()).toEqual(
            [...MusicVisualizations].sort(),
        );
    });

    test('the chooser, its icons, and its locale tuples are the same length', () => {
        const mode = DefaultLocale.ui.dialog.settings.mode.musicVisualization;
        expect(MusicVisualizationIcons).toHaveLength(
            MusicVisualizations.length,
        );
        expect(mode.labels).toHaveLength(MusicVisualizations.length);
        expect(mode.tips).toHaveLength(MusicVisualizations.length);
    });

    test('a rendering that must not be overlapped names a height token', () => {
        for (const rule of Object.values(MusicVisualizationFloor))
            if (rule.overlap === 'forbidden')
                expect(rule.height).toMatch(/^var\(--music-[a-z]+-height\)$/);
    });
});

describe('musicFloorHeight', () => {
    const playing = { musics: 1, tracks: 3 };

    test('holds a floor for the renderings that carry readable marks', () => {
        expect(musicFloorHeight('orchestra', playing)).toBe(
            'var(--music-orchestra-height)',
        );
        expect(musicFloorHeight('sheet', playing)).toBe(
            'var(--music-sheet-height)',
        );
    });

    test('holds no floor for the ambient renderings', () => {
        // The mood cloud is the tallest of them all and the safest to cover:
        // blurred, and already masked to transparent on its upper half.
        expect(musicFloorHeight('mood', playing)).toBe('0%');
        expect(musicFloorHeight('lightshow', playing)).toBe('0%');
        expect(musicFloorHeight('off', playing)).toBe('0%');
    });

    test('holds no floor when there is no music at all', () => {
        const silent = { musics: 0, tracks: 0 };
        for (const visualization of MusicVisualizations)
            expect(musicFloorHeight(visualization, silent)).toBe('0%');
    });

    test('respects each rendering&apos;s own gate, which differ', () => {
        // The orchestra draws one bar per track and renders nothing without
        // them, so a trackless Music must not hold its floor — that bug floated
        // the caption 15% above an empty stage. The sheet draws its staff for
        // any Music at all, so the same input must still hold its floor.
        const trackless = { musics: 1, tracks: 0 };
        expect(musicFloorHeight('orchestra', trackless)).toBe('0%');
        expect(musicFloorHeight('sheet', trackless)).toBe(
            'var(--music-sheet-height)',
        );
    });
});
