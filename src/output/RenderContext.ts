import type LanguageCode from '@translation/LanguageCode';
import type Phrase from './Phrase';
import type Animation from './Animations';

export type RenderContext = {
    font: string;
    languages: LanguageCode[];
    fonts: Set<string>;
    animations: Map<Phrase, Animation>;
};
