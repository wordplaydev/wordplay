/** l: 0-1, c: 0-infinity, h=0-360 */
export function LCHtoRGB(l: number, c: number, h: number) {
    return `lch(${l * 100}% ${c} ${h}deg)`;
}
