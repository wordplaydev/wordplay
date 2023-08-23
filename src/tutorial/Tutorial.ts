import type InputTexts from '@locale/InputTexts';
import type OutputTexts from '@locale/OutputTexts';
import type NodeTexts from '@locale/NodeTexts';
import type Emotion from '../lore/Emotion';
import type BasisTexts from '../locale/BasisTexts';
import type { RegionCode } from '../locale/Regions';
import type LanguageCode from '../locale/LanguageCode';

export type Tutorial = {
    /** This is here so that when we generate a JSON schema for a tutorial, the VS Code schema property is allowed **/
    $schema: string;
    language: LanguageCode;
    region: RegionCode;
    acts: Act[];
};

export type Act = {
    title: string;
    performance: Performance;
    scenes: Scene[];
};

export type Scene = {
    title: string;
    subtitle: string | null;
    performance: Performance;
    lines: Line[];
};

export type Line = Dialog | Performance | null;

export type Performance = [PeformanceModeType, ...string[]];

export type Character =
    | keyof NodeTexts
    | keyof InputTexts
    | keyof OutputTexts
    | keyof BasisTexts
    | '⊤'
    | '⊥';

export type Dialog = [Character, `${Emotion}`, ...string[]];

export const PerformanceMode = [
    'fit',
    'fix',
    'edit',
    'conflict',
    'use',
] as const;

export type PeformanceModeType = (typeof PerformanceMode)[number];

export async function loadTutorial(localeString: string) {
    try {
        // Load the locale's tutorial, if it exists.
        const response = await fetch(
            `/locales/${localeString}/${localeString}-tutorial.json`
        );
        return await response.json();
    } catch (err) {
        // Couldn't load it? Show an error.
        return null;
    }
}

export default Tutorial;
