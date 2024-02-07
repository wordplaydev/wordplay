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
    acts: [
        Act<[Scene, Scene, Scene, Scene, Scene]>,
        Act<[Scene, Scene, Scene, Scene, Scene, Scene, Scene]>,
        Act<[Scene, Scene, Scene, Scene]>,
        Act<[Scene, Scene, Scene]>,
        Act<
            [
                Scene,
                Scene,
                Scene,
                Scene,
                Scene,
                Scene,
                Scene,
                Scene,
                Scene,
                Scene,
                Scene,
                Scene,
            ]
        >,
        Act<[Scene, Scene, Scene, Scene, Scene, Scene, Scene]>,
        Act<[Scene, Scene, Scene, Scene, Scene, Scene]>,
        Act<[Scene]>,
    ];
};

export type Act<Scenes extends Scene[] = Scene[]> = {
    title: string;
    performance: Performance;
    scenes: Scenes;
};

export type Scene = {
    title: string;
    subtitle: string | null;
    concept?: Character;
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

export { type Tutorial as default };
