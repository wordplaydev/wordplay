import {
    ColorSpace,
    HSL,
    HWB,
    Lab,
    LCH,
    OKLab,
    OKLCH,
    parse,
    serialize,
    sRGB,
    to as convert,
    display,
} from 'colorjs.io/fn';

// Register the color spaces we parse, convert, and serialize. sRGB covers hex,
// rgb()/rgba(), and named colors. OKLab/OKLCH are required by the CSS
// gamut-mapping algorithm that convert(..., { inGamut: true }) invokes when a
// wide-gamut LCH color is mapped into a narrower space (e.g. sRGB hex);
// without them that conversion throws.
[sRGB, HSL, HWB, Lab, LCH, OKLab, OKLCH].forEach((space) =>
    ColorSpace.register(space),
);

export function RGBtoLCH(r: number, b: number, g: number) {
    return convert({ space: sRGB, coords: [r, b, g] }, LCH, { inGamut: true });
}

export function LCHtoCSS(l: number, c: number, h: number) {
    return display({ space: LCH, coords: [l, c, h] });
}

/** The color in the chooser's LCH space, plus the web format it was parsed from. */
export type ParsedColor = {
    /** 0-1 */
    lightness: number;
    /** 0-∞ */
    chroma: number;
    /** 0-360 */
    hue: number;
    /** colorjs.io format id, e.g. 'hex' | 'rgb' | 'rgba' | 'keyword' | 'hsl' |
     *  'lch' | 'oklch' | 'lab' | 'oklab' | 'hwb' */
    format: string;
};

/** Map a colorjs.io format id to the target color space for serialization. */
function spaceForFormat(format: string): ColorSpace {
    switch (format) {
        case 'hsl':
            return HSL;
        case 'hwb':
            return HWB;
        case 'lab':
            return Lab;
        case 'lch':
            return LCH;
        case 'oklab':
            return OKLab;
        case 'oklch':
            return OKLCH;
        // 'hex', 'rgb', 'rgba', and 'keyword' all live in sRGB.
        default:
            return sRGB;
    }
}

/**
 * Parse any common web color string (hex, rgb()/rgba(), hsl()/hsla(), named
 * colors, lch()/oklch()/lab()/oklab()/hwb()) into the chooser's LCH space,
 * returning the inferred format. Returns undefined when the string isn't a
 * recognized color.
 */
export function parseColor(text: string): ParsedColor | undefined {
    const trimmed = text.trim();
    if (trimmed.length === 0) return undefined;

    const meta: { formatId?: string } = {};
    let parsed;
    try {
        parsed = parse(trimmed, { meta });
    } catch {
        return undefined;
    }

    // Convert into LCH. Mirrors the eyedropper path in ColorChooser, which
    // reads coords[0] as 0-100 lightness and divides by 100.
    const lch = convert(parsed, LCH, { inGamut: true });
    return {
        lightness: (lch.coords[0] ?? 0) / 100,
        chroma: lch.coords[1] ?? 0,
        hue: lch.coords[2] ?? 0,
        format: meta.formatId ?? 'hex',
    };
}

/**
 * Serialize an LCH color (lightness 0-1, chroma, hue) back into the given web
 * format, gamut-mapping into narrower spaces as needed. Named colors
 * ('keyword') can't be reverse-named, so they fall back to hex. Returns the
 * serialized text and the format actually used (which differs from the request
 * only in the keyword→hex fallback case).
 */
export function serializeColor(
    lightness: number,
    chroma: number,
    hue: number,
    format: string,
): { text: string; format: string } {
    // No reliable LCH→name mapping; fall back to hex.
    const actual = format === 'keyword' ? 'hex' : format;
    const space = spaceForFormat(actual);
    const converted = convert(
        { space: LCH, coords: [lightness * 100, chroma, hue] },
        space,
        { inGamut: true },
    );
    return { text: serialize(converted, { format: actual }), format: actual };
}
