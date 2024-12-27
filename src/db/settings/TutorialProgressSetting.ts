import type LanguageCode from '../../locale/LanguageCode';
import type { RegionCode } from '../../locale/Regions';
import Setting from './Setting';

export type TutorialProgress = {
    language: LanguageCode;
    region: RegionCode | null;
    act: number;
    scene: number;
    line: number;
};

export const TutorialProgressSetting = new Setting<TutorialProgress>(
    'tutorial',
    false,
    {
        language: 'en',
        region: 'US',
        act: 1,
        scene: 1,
        line: 1,
    },
    (value) =>
        value != null &&
        typeof value === 'object' &&
        'language' in value &&
        'region' in value &&
        'act' in value &&
        'scene' in value &&
        'line' in value
            ? (value as TutorialProgress)
            : undefined,
    (current, value) =>
        current.language === value.language &&
        current.region === value.region &&
        current.act === value.act &&
        current.scene === value.scene &&
        current.line === value.line,
);
