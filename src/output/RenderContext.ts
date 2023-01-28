import type LanguageCode from '@translation/LanguageCode';
import type Phrase from './Phrase';
import type Animation from './Animations';

export type RenderContext = {
    font: string;
    languages: LanguageCode[];
    fonts: Set<string>;
    width: number;
    height: number;
    animations: Map<Phrase, Animation>;
};
