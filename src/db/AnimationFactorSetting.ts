import Setting from './Setting';

export const AnimationFactorIcons = ['🧘🏽‍♀️', '🏃‍♀️', '½', '⅓', '¼'];

export const AnimationFactorSetting = new Setting<number>(
    'animationFactor',
    false,
    1,
    (value) => (typeof value === 'number' && value >= 1 ? value : undefined),
    (current, value) => current === value,
);
