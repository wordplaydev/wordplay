import type { SupportedFace } from '../basis/Fonts';
import type Locale from '../locale/Locale';

export default class RenderContext {
    /** A single typeface name with no text delimiters */
    readonly face: SupportedFace;
    readonly size: number;
    readonly locales: Locale[];
    readonly fonts: Set<SupportedFace>;
    readonly animationFactor: number;

    constructor(
        face: SupportedFace,
        size: number,
        locales: Locale[],
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
