import type LanguageCode from '@translation/LanguageCode';

export type RenderContext = {
    font: string;
    languages: LanguageCode[];
    fonts: Set<string>;
};
