/**
 * The lightness a color renders at on an adapted (dark) canvas.
 *
 * Inverting about the midpoint preserves every pair's |ΔL*| exactly, so any two
 * adapted colors sit as far apart in perceptual lightness as the creator put
 * them — which is why adaptation has to be all-or-nothing per stage. Measured
 * over a dense sweep of foreground pairs on a stage bright enough to adapt (see
 * `AdaptationLightnessThreshold`), WCAG AA survives all but ~0.1% of pairs and
 * those land no lower than 4.07. Dimming was measured too and loses AA on 20%
 * of pairs, so it isn't offered.
 *
 * Clamped because one internal default carries a lightness of 100 rather than 1.
 */
export function adaptLightness(lightness: number): number {
    return Math.min(1, Math.max(0, 1 - lightness));
}

/**
 * How bright a stage has to be before its colors are adapted.
 *
 * Not 0.5. Inverting about the midpoint preserves perceptual lightness
 * differences exactly, but WCAG's contrast ratio is not symmetric about mid
 * lightness — its flare term makes dark-on-mid beat light-on-mid — so a
 * mid-toned stage loses measurably more than a bright one. Measured over 1764
 * foreground/background pairs per background lightness, the worst ratio a
 * passing pair falls to is 3.24 at L=0.6 and 3.60 at L=0.75, but 4.25 at L=0.8
 * and 4.49 at L=1, while the number of pairs that *gain* AA climbs from 7 to
 * 53. 0.8 is where that turns over, and it is also the right product answer:
 * the stage that blinds a reader in a dark room is a white one, not a
 * mid-toned one.
 *
 * It costs almost nothing in practice: measured against the 64 shipped examples
 * whose stage background could be read, 44 adapt at 0.8 where 48 would at 0.5.
 * The four in between (FootBall 62, RainingLetters 63, BuildingBlocks 78,
 * Size 80) are mid-toned stages, not glaring ones. Nearly every example that
 * matters is at 100 — the default white stage a program gets when it sets no
 * background at all, which is the case #65 is really about.
 */
export const AdaptationLightnessThreshold = 0.8;

/**
 * The stage's half of the adapt decision. A stage dimmer than the threshold is
 * left exactly as authored — an already-dark project would otherwise be made
 * bright, which is the opposite of the point, and a mid-toned one has more
 * contrast to lose than glare to save.
 */
export function backgroundInvitesAdaptation(
    backgroundLightness: number,
): boolean {
    return backgroundLightness > AdaptationLightnessThreshold;
}

/** The notation `Color.toCSS` emits, which is the only one persisted previews
 *  ever hold. Matched with a regex rather than parsed with colorjs.io, which
 *  would pull a color-science library into every route that shows a project
 *  tile. */
const LCHPattern = /^lch\(\s*(-?[\d.]+)%\s+(-?[\d.]+)\s+(-?[\d.]+)deg\s*\)$/;

/**
 * Adapt a CSS color *string*. Persisted project previews store strings rather
 * than colors, and some of them aren't colors at all (an errored preview stores
 * a custom property), so anything that isn't a recognized color comes back
 * untouched.
 */
export function adaptColorCSS(text: string): string {
    const lightness = lightnessOfCSS(text);
    if (lightness === undefined) return text;
    const match = LCHPattern.exec(text.trim());
    if (match === null) return text;
    // Rounded because the float subtraction turns 90% into 9.999999999999998%,
    // which is both noise in the DOM and not round-trippable.
    const adapted = Number((adaptLightness(lightness) * 100).toFixed(6));
    return `lch(${adapted}% ${match[2]} ${match[3]}deg)`;
}

/** The lightness of a CSS color string on the 0–1 scale `Color` uses, or
 *  undefined if it isn't one this can read. */
export function lightnessOfCSS(text: string): number | undefined {
    const match = LCHPattern.exec(text.trim());
    return match === null ? undefined : Number(match[1]) / 100;
}
