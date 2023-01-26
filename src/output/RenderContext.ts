import type LanguageCode from '@translation/LanguageCode';
import type Phrase from './Phrase';
import type Place from './Place';
import type Animation from './Animations';

export type RenderContext = {
    /** The default focus of the verse if the verse doesn't provide one */
    focus: Place;
    font: string;
    languages: LanguageCode[];
    fonts: Set<string>;
    animations: Map<Phrase, Animation>;
};
