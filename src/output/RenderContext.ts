import type Locale from '../locale/Locale';

export default class RenderContext {
    /** A single typeface name (e.g., Times, Roboto, Noto Sans), with no text delimiters */
    readonly face: string;
    readonly size: number;
    readonly locales: Locale[];
    readonly fonts: Set<string>;
    readonly animationFactor: number;

    constructor(
        face: string,
        size: number,
        locales: Locale[],
        fonts: Set<string>,
        animationFactor: number
    ) {
        this.face = face;
        this.size = size;
        this.locales = locales;
        this.fonts = fonts;
        this.animationFactor = animationFactor;
    }

    withFontAndSize(font: string | undefined, size: number | undefined) {
        return new RenderContext(
            font ?? this.face,
            size ?? this.size,
            this.locales,
            this.fonts,
            this.animationFactor
        );
    }
}
