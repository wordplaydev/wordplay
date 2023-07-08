import type InputTexts from '@locale/InputTexts';
import type OutputTexts from '@locale/OutputTexts';
import type NodeTexts from '@locale/NodeTexts';
import type Emotion from '../lore/Emotion';

export type Tutorial = {
    /** This is here so that when we generate a JSON schema for a tutorial, the VS Code schema property is allowed **/
    $schema: string;
    acts: Act[];
};

export type Act = {
    name: string;
    performance: Performance;
    scenes: Scene[];
};

export type Scene = {
    name: string;
    performance: Performance;
    concept: string | null;
    lines: Line[];
};

export type Line = Dialog | Performance | null;

export type Performance = [PeformanceModeType, ...string[]];

export type Character =
    | keyof NodeTexts
    | keyof InputTexts
    | keyof OutputTexts
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

export default Tutorial;
