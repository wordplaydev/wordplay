import DefaultLocale from '@locale/DefaultLocale';
import { expect, test } from 'vitest';
import placeLabel from './placeLabel';
import { DefaultMode, ModeIcons, Modes } from './GuideHistory';
import DefaultLocales from '@locale/DefaultLocales';
import Purpose from '@concepts/Purpose';

/**
 * The guide's sections are aligned by position, three ways.
 *
 * `Documentation.svelte` renders one tab per `ui.docs.mode.browse` label, takes its glyph
 * from `ModeIcons` at the same index, and maps the pressed index straight back through
 * `Modes`. Nothing relates the three lists, so reordering or inserting a section silently
 * relabels every one after it — which is what happened to the purpose filter when
 * `Purpose.Kit` was added, and is the reason `purposeFilters.test.ts` exists.
 */

test('every section has a label, a tip, and an icon', () => {
    expect(DefaultLocale.ui.docs.mode.browse.labels).toHaveLength(Modes.length);
    expect(DefaultLocale.ui.docs.mode.browse.tips).toHaveLength(Modes.length);
    expect(ModeIcons).toHaveLength(Modes.length);
});

test('the section the guide opens on is one of its sections', () => {
    expect(Modes).toContain(DefaultMode);
});

test('every section names itself in a breadcrumb', () => {
    // `kits` fell through to a *purpose* header for a while, because `placeLabel`
    // branched on two modes by name and let everything else reach the fallback.
    const labels = DefaultLocale.ui.docs.mode.browse.labels;
    for (const mode of Modes) {
        if (mode === 'language') continue;
        expect(
            placeLabel(
                { kind: 'section', mode, purpose: Purpose.Outputs },
                DefaultLocales,
            ),
        ).toBe(labels[Modes.indexOf(mode)]);
    }
});
