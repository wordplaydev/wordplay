import Setting from './Setting';

export type TutorialProgress = {
    act: number;
    scene: number;
    line: number;
};

export const TutorialProgressSetting = new Setting<TutorialProgress>(
    'tutorial',
    false,
    { act: 1, scene: 1, line: 1 },
    (value) =>
        value != null &&
        typeof value === 'object' &&
        'act' in value &&
        'scene' in value &&
        'line' in value
            ? (value as TutorialProgress)
            : undefined,
    (current, value) =>
        current.act === value.act &&
        current.scene === value.scene &&
        current.line === value.line
);
