import { SupportedFaces } from '#basis/faces/Fonts.ts';
import Setting from '#db/settings/Setting.ts';

export const FaceSetting = new Setting<string | null>(
    'face',
    false,
    null,
    (value) =>
        typeof value === 'string' &&
        (value === null || SupportedFaces.includes(value))
            ? value
            : null,
    (current, value) => current == value,
);
