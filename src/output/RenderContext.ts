import type LanguageCode from '@translation/LanguageCode';

export default class RenderContext {
    readonly font: string;
    readonly size: number;
    readonly languages: LanguageCode[];
    readonly fonts: Set<string>;

    constructor(
        font: string,
        size: number,
        languages: LanguageCode[],
        fonts: Set<string>
    ) {
        this.font = font;
        this.size = size;
        this.languages = languages;
        this.fonts = fonts;
    }

    withFontAndSize(font: string | undefined, size: number | undefined) {
        return new RenderContext(
            font ?? this.font,
            size ?? this.size,
            this.languages,
            this.fonts
        );
    }
}
