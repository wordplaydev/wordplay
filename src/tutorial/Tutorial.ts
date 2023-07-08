import type { InputTexts, NodeTexts, OutputTexts } from '../locale/Locale';
import type Emotion from '../lore/Emotion';

type Tutorial = Act[];

export type Act = {
    name: string;
    program: Performance;
    scenes: Scene[];
};

export type Scene = {
    name: string;
    program: Performance;
    concept: string | undefined;
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
