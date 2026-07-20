import type { SupportedFace } from '@basis/faces/Fonts';
import type Locales from '@locale/Locales';
import type { WritingLayout } from '@locale/Scripts';

export default class RenderContext {
    /** A single typeface name with no text delimiters */
    readonly face: SupportedFace;
    readonly size: number;
    readonly locales: Locales;
    readonly fonts: Set<SupportedFace>;
    readonly animationFactor: number;
    /** The effective writing layout for output whose Phrases don't specify one
     *  (the resolved writingLayout setting: explicit, or the locale's in 'auto'). */
    readonly layout: WritingLayout;

    constructor(
        face: SupportedFace,
        size: number,
        locales: Locales,
        fonts: Set<SupportedFace>,
        animationFactor: number,
        layout: WritingLayout,
    ) {
        this.face = face;
        this.size = size;
        this.locales = locales;
        this.fonts = fonts;
        this.animationFactor = animationFactor;
        this.layout = layout;
    }

    withFontAndSize(font: SupportedFace | undefined, size: number | undefined) {
        return new RenderContext(
            font ?? this.face,
            size ?? this.size,
            this.locales,
            this.fonts,
            this.animationFactor,
            this.layout,
        );
    }
}
