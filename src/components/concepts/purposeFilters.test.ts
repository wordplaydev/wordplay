import { getPurposeIcons } from '@components/concepts/conceptGroups';
import Purpose from '@concepts/Purpose';
import DefaultLocale from '@locale/DefaultLocale';
import { expect, test } from 'vitest';

/**
 * The guide's purpose filter is aligned **by position**, three ways.
 *
 * `Documentation.svelte` and `Wellspring.svelte` both render one button per
 * `ui.docs.mode.purpose` label and map the pressed index straight back through
 * `Object.values(Purpose)[index]`, with `getPurposeIcons()` supplying the glyph
 * at the same index. Nothing relates the three lists to each other, so inserting
 * a purpose in the middle silently relabels every purpose after it — which is
 * exactly what happened when `Purpose.Kit` was added at index 1 (#8): "output"
 * selected `Purpose.Kit`, every later label was off by one, and "advanced"
 * became unreachable. Every test passed, because no test knew the three lists
 * were supposed to agree.
 */

/**
 * The purposes the filter never offers, which is why the counts below subtract
 * them. They must stay at the **end** of `Purpose`, since the filter indexes
 * `Object.values(Purpose)` from zero: one of these moving into the middle would
 * shift the labels exactly the way a new purpose would.
 */
const Unfiltered = [Purpose.Hidden, Purpose.How, Purpose.GalleryHow];

test('every filterable purpose has a label and an icon', () => {
    const purposes = Object.values(Purpose);
    const filterable = purposes.length - Unfiltered.length;

    expect(DefaultLocale.ui.docs.mode.purpose.labels).toHaveLength(filterable);
    expect(DefaultLocale.ui.docs.mode.purpose.tips).toHaveLength(filterable);
    expect(getPurposeIcons('en')).toHaveLength(filterable);
});

test('the purposes the filter never offers come last', () => {
    const purposes = Object.values(Purpose);
    expect(purposes.slice(purposes.length - Unfiltered.length)).toEqual(
        Unfiltered,
    );
});
