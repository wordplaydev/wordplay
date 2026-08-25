import {
    adaptColorCSS,
    adaptLightness,
    backgroundInvitesAdaptation,
    lightnessOfCSS,
} from '@output/Color/adapt';

export type PreviewColors = {
    background: string | null;
    foreground: string | null;
    /** The color scheme the tile should declare, or null to follow the app's. */
    scheme: 'light' | 'dark' | null;
};

/**
 * The colors a persisted project preview should paint with.
 *
 * A preview is extracted once and stored on the project document, so the
 * viewer's dark-mode preference has to be applied here rather than in
 * `extractPreview` — baking it in would ship one viewer's setting to everyone.
 * The background decides for both, so a tile stays all-or-nothing the way its
 * stage does.
 */
export function adaptPreviewColors(
    preview: { background: string | null; foreground: string | null } | null,
    viewerAdapting: boolean,
): PreviewColors {
    const background = preview?.background ?? null;
    const foreground = preview?.foreground ?? null;

    // A manual preview carries no creator colors, so it has nothing to adapt
    // and nothing to protect — it follows the app's scheme.
    if (background === null) return { background, foreground, scheme: null };

    const lightness = lightnessOfCSS(background);
    // Not a color: an errored preview stores a custom property. Leave it, and
    // let it follow the app so the error chrome stays legible.
    if (lightness === undefined)
        return { background, foreground, scheme: null };

    const adapting = viewerAdapting && backgroundInvitesAdaptation(lightness);

    return {
        background: adapting ? adaptColorCSS(background) : background,
        foreground:
            adapting && foreground !== null
                ? adaptColorCSS(foreground)
                : foreground,
        // Declared from what is painted, so a project that authors a dark
        // background gets dark-mode tokens even with adaptation off.
        scheme:
            (adapting ? adaptLightness(lightness) : lightness) > 0.5
                ? 'light'
                : 'dark',
    };
}
