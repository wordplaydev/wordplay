import { withMonoEmoji } from '../../unicode/emoji';
import Setting from './Setting';

export const AnimationFactorIcons = [
    '🧘',
    '¼',
    '⅓',
    '½',
    '🏃',
    '2x',
    '5x',
    '10x',
].map((i) => withMonoEmoji(i));

export const AnimationFactors = [0, 4, 3, 2, 1, 0.5, 0.2, 0.1];

export const AnimationFactorSetting = new Setting<number>(
    'animationFactor',
    false,
    1,
    (value) => (typeof value === 'number' && value >= 0 ? value : undefined),
    (current, value) => current === value,
);
