import type LanguageCode from '@translation/LanguageCode';

export default class RenderContext {
    readonly font: string;
    readonly size: number;
    readonly languages: LanguageCode[];
    readonly fonts: Set<string>;
    readonly animated: boolean;

    constructor(
        font: string,
        size: number,
        languages: LanguageCode[],
        fonts: Set<string>,
        animated: boolean
    ) {
        this.font = font;
        this.size = size;
        this.languages = languages;
        this.fonts = fonts;
        this.animated = animated;
    }

    withFontAndSize(font: string | undefined, size: number | undefined) {
        return new RenderContext(
            font ?? this.font,
            size ?? this.size,
            this.languages,
            this.fonts,
            this.animated
        );
    }
}
