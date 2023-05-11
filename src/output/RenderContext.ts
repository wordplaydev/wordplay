import type LanguageCode from '@locale/LanguageCode';

export default class RenderContext {
    readonly font: string;
    readonly size: number;
    readonly languages: LanguageCode[];
    readonly fonts: Set<string>;
    readonly animationFactor: number;

    constructor(
        font: string,
        size: number,
        languages: LanguageCode[],
        fonts: Set<string>,
        animationFactor: number
    ) {
        this.font = font;
        this.size = size;
        this.languages = languages;
        this.fonts = fonts;
        this.animationFactor = animationFactor;
    }

    withFontAndSize(font: string | undefined, size: number | undefined) {
        return new RenderContext(
            font ?? this.font,
            size ?? this.size,
            this.languages,
            this.fonts,
            this.animationFactor
        );
    }
}
