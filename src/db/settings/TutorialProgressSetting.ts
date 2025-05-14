import type LanguageCode from '../../locale/LanguageCode';
import type { RegionCode } from '../../locale/Regions';
import Setting from './Setting';

export type TutorialProgress = {
    language: LanguageCode;
    region: RegionCode[] | null;
    act: number;
    scene: number;
    line: number;
};

export const TutorialProgressSetting = new Setting<TutorialProgress>(
    'tutorial',
    false,
    { language: 'en', region: ['US'], act: 1, scene: 1, line: 1 },
    (value) => {
        if (
            value != null &&
            typeof value === 'object' &&
            'language' in value &&
            'act' in value &&
            'scene' in value &&
            'region' in value &&
            'line' in value
        ) {
            if (Array.isArray(value.region)) return value as TutorialProgress;
            else {
                value.region = [value.region];
                return value as TutorialProgress;
            }
        } else return undefined;
    },
    (current, value) =>
        current.language === value.language &&
        current.region === value.region &&
        current.act === value.act &&
        current.scene === value.scene &&
        current.line === value.line,
);
