import type { WritingLayout } from '../../locale/Scripts';
import Setting from './Setting';

export const WritingLayoutSetting = new Setting<WritingLayout>(
    'writingLayout',
    false,
    'horizontal-tb',
    (value) =>
        value === 'horizontal-tb' ||
        value === 'vertical-rl' ||
        value === 'vertical-lr'
            ? value
            : undefined,
    (current, value) => current == value,
);
