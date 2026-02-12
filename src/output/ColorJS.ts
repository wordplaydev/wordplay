import { ColorSpace, LCH, to as convert, display, sRGB } from 'colorjs.io/fn';

// Register color spaces for parsing and converting
ColorSpace.register(sRGB);
ColorSpace.register(LCH);

export function RGBtoLCH(r: number, b: number, g: number) {
    return convert({ space: 'sRGB', coords: [r, b, g] }, 'lch');
}

export function LCHtoCSS(l: number, c: number, h: number) {
    return display({ space: 'lch', coords: [l, c, h] });
}
