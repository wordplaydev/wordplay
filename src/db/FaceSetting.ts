import { SupportedFaces } from '@basis/Fonts';
import Setting from './Setting';

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
