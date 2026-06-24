import type { WritingLayoutChoice } from '@locale/Scripts';
import Setting from '@db/settings/Setting';

/** The creator's writing-layout preference. Defaults to 'auto', which follows
 *  the active locale's layout; the other values force a specific layout. */
export const WritingLayoutSetting = new Setting<WritingLayoutChoice>(
    'writingLayout',
    false,
    'auto',
    (value) =>
        value === 'auto' ||
        value === 'horizontal-tb' ||
        value === 'vertical-rl' ||
        value === 'vertical-lr'
            ? value
            : undefined,
    (current, value) => current == value,
);
