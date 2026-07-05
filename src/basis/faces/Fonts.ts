import type LocaleText from '@locale/LocaleText';
import { Scripts, type Script } from '@locale/Scripts';
import { OR_SYMBOL } from '@parser/Symbols';
import { writable } from 'svelte/store';
import type { Font as FontkitFont } from 'fontkit';
// The creator face registry is GENERATED from fonts.manifest.ts +
// fonts.lock.json by `npm run fonts-fix`. This module owns the
// loading/measurement logic; the data lives in faces.generated.ts. (The
// structured fallback table is test-only — see faces.fallback.generated.ts.)
import { Faces } from './faces.generated';
export { Faces };

export type FontWeight = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;
export type FontWeightRange = { min: FontWeight; max: FontWeight };

export type FontFormat = 'ttf' | 'otf' | 'woff2';

/** The data necessary for constructing @font-face load calls to load the font on demand. */
export type Face = {
    readonly weights: FontWeight[] | FontWeightRange; // Weights supported on the font
    readonly italic: boolean; // True if italics is supported on the weights above,
    readonly scripts: Readonly<Script[]>; // A list of ISO 15924 scripts supported,
    readonly format: FontFormat;
    readonly preloaded?: boolean; // True if the font is declared in CSS (app.html, fonts.css, or fonts-fallback.css), and shouldn't be reloaded.
    readonly ranges?: string | readonly string[]; // CSS unicode-range strings. Each index corrresponds to a different numbered file.
};

export type Font = {
    readonly name: SupportedFace;
    readonly weight: FontWeight;
    readonly italic: boolean;
    readonly format: FontFormat;
    /** CSS unicode-range string */
    readonly range: string | undefined;
};

export const loadedFonts = writable<Set<SupportedFace>>(new Set());


/** True if the face's metadata declares support for the given weight. */
export function faceSupportsWeight(face: Face, weight: FontWeight): boolean {
    return Array.isArray(face.weights)
        ? face.weights.includes(weight)
        : weight >= face.weights.min && weight <= face.weights.max;
}

/** The font face names supported. To add one, carefully add metadata to Faces and files to /static/fonts/. */
export type SupportedFace = keyof typeof Faces;

/** A sorted list of font face names, used to generate drop downs for font choosers and union type definitions for font face inputs. */
export const SupportedFaces = Object.keys(Faces).sort();

/**
 * This data structure managers the fonts that have been loaded,
 * responds to requests to load more fonts, and provides notificiations of when they are loaded
 * */
export class FontManager {
    // All default fonts are loaded in app.html. We mark them as loaded below.
    readonly defaultFaces: SupportedFace[] = [
        'Noto Sans',
        'Noto Sans Mono',
        'Noto Emoji',
        'Noto Color Emoji',
    ];

    facesLoaded = new Map<SupportedFace, 'requested' | 'loaded' | 'failed'>();

    /** A cache of font strings for which FontFaceSet.check() returned true */
    facesChecked = new Set<string>();

    /** Faces for which a lightweight single-file preview FontFace has been
     * registered with document.fonts. Tracked separately from facesLoaded so
     * that a later loadFace() call still performs the full multi-weight load. */
    previewedFaces = new Set<SupportedFace>();

    /** Incremented every time the browser finishes loading fonts, including
     * CSS-declared faces the browser fetched lazily via unicode-range. Caches
     * of font-dependent measurements should be keyed on this so they recompute
     * once the fonts they measured with actually arrive. */
    private loadGeneration = 0;

    constructor() {
        // Mark these as loaded so we don't redundantly load them.
        for (const face of this.defaultFaces)
            this.facesLoaded.set(face, 'loaded');
        // Faces declared in CSS load lazily per unicode-range in the browser;
        // mark them so loadFace() doesn't redundantly re-register them.
        for (const [name, face] of Object.entries(Faces))
            if (face.preloaded === true) this.facesLoaded.set(name, 'loaded');
        // Track font load completion to invalidate measurement caches.
        if (
            typeof document !== 'undefined' &&
            typeof document.fonts?.addEventListener === 'function'
        )
            document.fonts.addEventListener('loadingdone', () => {
                this.loadGeneration++;
            });
    }

    getLoadGeneration(): number {
        return this.loadGeneration;
    }

    /** Returns true if the given font spec appears in SupportedFonts */
    getSupportedFace(font: Font) {
        const candidate = Faces[font.name];
        return faceSupportsWeight(candidate, font.weight) &&
            (font.italic === false || candidate.italic)
            ? candidate
            : undefined;
    }

    isFaceRequested(face: SupportedFace) {
        return this.facesLoaded.has(face);
    }

    isFaceLoaded(face: SupportedFace) {
        const faceString = `12px "${face}"`;
        const checked = this.facesChecked.has(faceString);

        if (checked) return true;
        if (!this.isFaceRequested(face)) return false;
        const check = document.fonts.check(faceString);
        if (check) {
            this.facesChecked.add(faceString);
            return true;
        } else return false;
    }

    loadLocales(locales: LocaleText[]) {
        for (const locale of locales) {
            this.loadFace(locale.ui.font.app);
            this.loadFace(locale.ui.font.code);
        }
    }

    async loadFace(name: SupportedFace) {
        const face = Faces[name];

        // If preloaded, don't load it.
        if (face !== undefined && face.preloaded === true) return;

        if (this.facesLoaded.get(name) === 'loaded') return;

        // Mark the face requested.
        this.facesLoaded.set(name, 'requested');

        let promises: Promise<boolean>[] = [];
        if (face) {
            // Find the unicode ranges, if there are any.
            const ranges =
                face.ranges === undefined
                    ? undefined
                    : Array.isArray(face.ranges)
                      ? face.ranges
                      : [face.ranges];

            // If the face has specific weights, load all of the individual ways, split by the ranges specified.
            if (Array.isArray(face.weights)) {
                promises = [
                    ...promises,
                    ...this.loadWeights(
                        name,
                        face.weights,
                        false,
                        ranges,
                        face.format,
                    ),
                ];
                if (face.italic)
                    promises = [
                        ...promises,
                        ...this.loadWeights(
                            name,
                            face.weights,
                            true,
                            ranges,
                            face.format,
                        ),
                    ];
            }
            // If it's a variable weight font, load the range file(s) — and the
            // italic range file(s) too if the face supports italics.
            else {
                const italicVariants = face.italic ? [false, true] : [false];
                for (const ital of italicVariants) {
                    if (ranges === undefined)
                        promises.push(
                            this.loadFont({
                                name: name,
                                weight: face.weights.min,
                                italic: ital,
                                format: face.format,
                                range: undefined,
                            }),
                        );
                    else {
                        for (const range of ranges)
                            promises.push(
                                this.loadFont({
                                    name: name,
                                    weight: face.weights.min,
                                    italic: ital,
                                    format: face.format,
                                    range: range,
                                }),
                            );
                    }
                }
            }
        } else {
            this.facesLoaded.set(name, 'failed');
            return;
        }

        const loads = await Promise.all(promises);

        this.facesLoaded.set(
            name,
            loads.every((loaded) => loaded) ? 'loaded' : 'failed',
        );
    }

    loadWeights(
        name: string,
        weights: FontWeight[],
        ital: boolean,
        ranges: readonly string[] | undefined,
        format: FontFormat,
    ): Promise<boolean>[] {
        const promises: Promise<boolean>[] = [];
        for (const weight of weights) {
            if (ranges === undefined)
                promises.push(
                    this.loadFont({
                        name: name,
                        weight: weight,
                        italic: ital,
                        format: format,
                        range: undefined,
                    }),
                );
            else {
                for (const range of ranges) {
                    promises.push(
                        this.loadFont({
                            name: name,
                            weight: weight,
                            italic: ital,
                            format: format,
                            range: range,
                        }),
                    );
                }
            }
        }
        return promises;
    }

    /** Build and register a single FontFace from a Font descriptor.
     * Returns the FontFace (whose .load() the caller may await/observe) or
     * null if not in a browser, or the descriptor isn't supported. */
    private registerFontFace(font: Font): FontFace | null {
        // Don't try to add if not in a browser yet.
        if (typeof document === 'undefined' || typeof FontFace === 'undefined')
            return null;

        // See if we support this font
        const supportedFace = this.getSupportedFace(font);

        // If the requested font isn't supported, don't load it.
        if (supportedFace === undefined) {
            console.error(`${font.name} not supported`);
            return null;
        }

        // Build the static file URL for this specific weight/italic/range.
        const fontFace = new FontFace(
            font.name,
            `url(${getFontFileURL(font) ?? ''}`,
            {
                ...{
                    style: font.italic ? 'italic' : 'normal',
                    weight: Array.isArray(supportedFace.weights)
                        ? font.weight.toString()
                        : `${supportedFace.weights.min} ${supportedFace.weights.max}`,
                },
                ...(font.range ? { unicodeRange: font.range } : {}),
            },
        );
        document.fonts.add(fontFace);
        return fontFace;
    }

    async loadFont(font: Font): Promise<boolean> {
        const fontFace = this.registerFontFace(font);
        if (fontFace === null) return false;
        // Load the font face and update the loaded set when done.
        // This ensures we update any font dependent measurements that depend on this store.
        fontFace.load().then(() => {
            this.facesLoaded.set(font.name, 'loaded');
            loadedFonts.set(new Set(this.facesLoaded.keys()));
        });

        return true;
    }

    /** Load a single lightweight file for the face so choosers
     * can show its name in its own glyphs without triggering a full
     * multi-weight load. Picks weight 400 (or the closest supported), no
     * italics, and the Latin unicode range when the face is range-subset.
     * No-ops if the face is already fully loaded, already preview-loaded,
     * or has no Latin range available. */
    loadFaceForPreview(name: SupportedFace): void {
        // Already fully loaded or previewed? Nothing to do.
        if (this.facesLoaded.get(name) === 'loaded') return;
        if (this.previewedFaces.has(name)) return;

        const face = Faces[name];
        if (face === undefined) return;
        if (face.preloaded === true) return;

        // Pick the lightest weight the face supports — prefer 400.
        const weight: FontWeight = Array.isArray(face.weights)
            ? face.weights.includes(400)
                ? 400
                : face.weights[0]
            : face.weights.min <= 400 && 400 <= face.weights.max
              ? 400
              : face.weights.min;

        // For multi-range subset fonts, find the Latin range — the face name
        // is in Latin glyphs, so any other range wouldn't render it.
        let range: string | undefined;
        if (typeof face.ranges === 'string' || face.ranges === undefined) {
            range = face.ranges;
        } else {
            const latinRange = face.ranges.find((r) =>
                r.includes('U+0000-00FF'),
            );
            // No Latin range means we can't render the name in this face's
            // own glyphs anyway — skip the preview load entirely.
            if (latinRange === undefined) return;
            range = latinRange;
        }

        // Mark as previewed up front so concurrent visibility callbacks
        // don't double-register the same FontFace.
        this.previewedFaces.add(name);

        this.registerFontFace({
            name,
            weight,
            italic: false,
            format: face.format,
            range,
        });
    }
}

const Fonts = new FontManager();
export default Fonts;

/** The Wordplay text union type representing all valid font face names. */
export const SupportedFontsFamiliesType = SupportedFaces.map(
    (font) => `"${font}"`,
).join(OR_SYMBOL);

export function getFaceDescription(name: string, face: Face) {
    return `${name} [${face.scripts.map((s) => Scripts[s]?.name ?? '?').join(' ')}]`;
}

/** Build the static file URL for a specific font file (weight/italic/range), or
 * undefined if the face isn't supported. Mirrors the path scheme used by
 * FontManager.registerFontFace. */
export function getFontFileURL(font: Font): string | undefined {
    const face = Faces[font.name];
    if (face === undefined) return undefined;
    const rangeIndex =
        font.range && Array.isArray(face.ranges)
            ? face.ranges.indexOf(font.range)
            : undefined;
    const spaceless = font.name.replaceAll(' ', '');
    return `/fonts/${spaceless}/${spaceless}-${
        Array.isArray(face.weights) ? font.weight : 'all'
    }${font.italic ? '-italic' : ''}${
        rangeIndex !== undefined ? `-${rangeIndex}` : ''
    }.${face.format}`;
}

/** True if the given CSS unicode-range string (e.g. "U+0000-00FF, U+0131")
 * contains the given codepoint. */
export function rangeContains(rangeString: string, codepoint: number): boolean {
    for (const part of rangeString.split(',')) {
        const match = part
            .trim()
            .match(/^U\+([0-9A-Fa-f]+)(?:-([0-9A-Fa-f]+))?$/);
        if (match) {
            const start = parseInt(match[1], 16);
            const end = match[2] !== undefined ? parseInt(match[2], 16) : start;
            if (codepoint >= start && codepoint <= end) return true;
        }
    }
    return false;
}

/**
 * A cache of fonts parsed by fontkit for contour extraction, keyed by
 * face + weight + italic + range index. This is separate from the FontManager's
 * FontFace registry because the browser FontFace API does not expose the raw
 * font bytes that fontkit needs. fontkit decodes WOFF2 (and WOFF/TTF/OTF) itself.
 */
const contourFonts = new Map<string, FontkitFont>();

/** Why a contour font failed to load, for reporting back to the creator:
 * - `connection`: the font file couldn't be reached (network/offline).
 * - `unavailable`: the server responded, but the font file wasn't found.
 * - `unreadable`: the file downloaded, but couldn't be read as a font. */
export type ContourFontError = 'connection' | 'unavailable' | 'unreadable';

/** In-flight loads, so concurrent requests for the same file share one fetch. */
const contourFontLoads = new Map<
    string,
    Promise<FontkitFont | ContourFontError>
>();

function contourFontKey(
    face: SupportedFace,
    weight: FontWeight,
    italic: boolean,
    range: string | undefined,
): string {
    return `${face}-${weight}-${italic ? 'i' : 'n'}-${range ?? 'all'}`;
}

/**
 * Fetch and parse a single font file for contour extraction, caching the parsed
 * fontkit Font. fontkit decodes WOFF2 internally, so no separate decompression
 * step is needed. Returns a parsed Font on success, a ContourFontError describing
 * the failure (so the caller can report it), or undefined when there's nothing to
 * do (no browser, or an unsupported face/weight).
 */
export async function getContourFont(
    face: SupportedFace,
    weight: FontWeight,
    italic: boolean,
    range: string | undefined,
): Promise<FontkitFont | ContourFontError | undefined> {
    // No DOM/fetch available (SSR, tests): nothing to load.
    if (typeof window === 'undefined') return undefined;

    const key = contourFontKey(face, weight, italic, range);

    const cached = contourFonts.get(key);
    if (cached) return cached;

    const inFlight = contourFontLoads.get(key);
    if (inFlight) return inFlight;

    const faceData = Faces[face];
    if (faceData === undefined) return undefined;

    const url = getFontFileURL({
        name: face,
        weight,
        italic,
        format: faceData.format,
        range,
    });
    if (url === undefined) return undefined;

    const load = (async (): Promise<FontkitFont | ContourFontError> => {
        try {
            let response: Response;
            try {
                response = await fetch(url);
            } catch {
                // Couldn't reach the network at all.
                return 'connection';
            }
            // The server responded, but the font file isn't there.
            if (!response.ok) return 'unavailable';

            const buffer = await response.arrayBuffer();
            const fontkit = await import('fontkit');
            const created = fontkit.create(new Uint8Array(buffer));
            // Font files are single fonts, but create() may return a collection.
            const font = 'fonts' in created ? created.fonts[0] : created;
            if (font === undefined) return 'unreadable';
            contourFonts.set(key, font);
            return font;
        } catch {
            // Downloaded, but fontkit couldn't read it as a font.
            return 'unreadable';
        } finally {
            contourFontLoads.delete(key);
        }
    })();

    contourFontLoads.set(key, load);
    return load;
}
