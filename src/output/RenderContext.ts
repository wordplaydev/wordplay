import type Locale from '../locale/Locale';

export default class RenderContext {
    readonly font: string;
    readonly size: number;
    readonly locales: Locale[];
    readonly fonts: Set<string>;
    readonly animationFactor: number;

    constructor(
        font: string,
        size: number,
        locales: Locale[],
        fonts: Set<string>,
        animationFactor: number
    ) {
        this.font = font;
        this.size = size;
        this.locales = locales;
        this.fonts = fonts;
        this.animationFactor = animationFactor;
    }

    withFontAndSize(font: string | undefined, size: number | undefined) {
        return new RenderContext(
            font ?? this.font,
            size ?? this.size,
            this.locales,
            this.fonts,
            this.animationFactor
        );
    }
}
