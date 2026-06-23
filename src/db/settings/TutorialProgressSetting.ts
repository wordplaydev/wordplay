import type LanguageCode from '@locale/LanguageCode';
import type { RegionCode } from '@locale/Regions';
import Setting from '@db/settings/Setting';
import {
    parseTutorialMode,
    type TutorialMode,
} from '../../tutorial/TutorialMode';

/** A learner's position within a single tutorial. */
export type TutorialProgress = {
    language: LanguageCode;
    region: RegionCode[] | null;
    act: number;
    scene: number;
    line: number;
};

/** All tutorial state, under one cloud-synced key. `mode` is the chosen tutorial (null until the
 * creator picks one), and `progress` remembers each tutorial's place independently — keyed by
 * tutorial id so adding a new tutorial requires no new setting. */
export type TutorialState = {
    mode: TutorialMode | null;
    progress: Partial<Record<TutorialMode, TutorialProgress>>;
};

export const DefaultProgress: TutorialProgress = {
    language: 'en',
    region: ['US'],
    // Start at the Act 1 title screen (scene 0 / line 0) so a fresh learner sees the act and scene
    // framing before the first dialog, rather than dropping straight into scene 1's first line.
    act: 1,
    scene: 0,
    line: 0,
};

const DefaultState: TutorialState = { mode: null, progress: {} };

function validateProgress(value: unknown): TutorialProgress | undefined {
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
}

function validateState(value: unknown): TutorialState | undefined {
    if (value == null || typeof value !== 'object') return undefined;

    // New shape: { mode, progress: { [id]: progress } }.
    if (
        'progress' in value &&
        value.progress != null &&
        typeof value.progress === 'object'
    ) {
        const modeRaw =
            'mode' in value ? (value as { mode: unknown }).mode : null;
        const mode = modeRaw == null ? null : (parseTutorialMode(modeRaw) ?? null);
        const progress: Partial<Record<TutorialMode, TutorialProgress>> = {};
        for (const [key, entry] of Object.entries(value.progress)) {
            const id = parseTutorialMode(key);
            const valid = validateProgress(entry);
            if (id !== undefined && valid !== undefined) progress[id] = valid;
        }
        return { mode, progress };
    }

    // Old flat shape ({ language, act, scene, line }) → wrap into the complete tutorial's
    // progress and default the mode to complete, so a device with existing progress resumes the
    // full tutorial rather than being prompted to choose.
    const flat = validateProgress(value);
    if (flat !== undefined)
        return { mode: 'complete', progress: { complete: flat } };

    return undefined;
}

/** All tutorial state (chosen mode + per-tutorial progress). Cloud-synced (part of
 * SettingsSchema). */
export const TutorialSetting = new Setting<TutorialState>(
    'tutorial',
    false,
    DefaultState,
    validateState,
    (current, value) => JSON.stringify(current) === JSON.stringify(value),
);
