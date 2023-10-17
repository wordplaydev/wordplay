import type { SupportedFace } from '../basis/Fonts';
import type Locales from '../locale/Locales';

export default class RenderContext {
    /** A single typeface name with no text delimiters */
    readonly face: SupportedFace;
    readonly size: number;
    readonly locales: Locales;
    readonly fonts: Set<SupportedFace>;
    readonly animationFactor: number;

    constructor(
        face: SupportedFace,
        size: number,
        locales: Locales,
        fonts: Set<SupportedFace>,
        animationFactor: number
    ) {
        this.face = face;
        this.size = size;
        this.locales = locales;
        this.fonts = fonts;
        this.animationFactor = animationFactor;
    }

    withFontAndSize(font: SupportedFace | undefined, size: number | undefined) {
        return new RenderContext(
            font ?? this.face,
            size ?? this.size,
            this.locales,
            this.fonts,
            this.animationFactor
        );
    }
}
