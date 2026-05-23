import { withMonoEmoji } from '@unicode/emoji';
import Setting from '@db/settings/Setting';

export const AnimationIcon = withMonoEmoji('🏃');

export const AnimationFactorIcons = [
    '🧘',
    '¼',
    '⅓',
    '½',
    '1x',
    '2x',
    '5x',
    '10x',
    '🖥',
].map((i) => withMonoEmoji(i));

/** `null` means "follow the device's prefers-reduced-motion setting". */
export const AnimationFactors: (number | null)[] = [
    0,
    4,
    3,
    2,
    1,
    0.5,
    0.2,
    0.1,
    null,
];

export const AnimationFactorSetting = new Setting<number | null>(
    'animationFactor',
    false,
    null,
    (value) =>
        value === null
            ? null
            : typeof value === 'number' && value >= 0
              ? value
              : undefined,
    (current, value) => current === value,
);
