import { writable } from 'svelte/store';
import { OR_SYMBOL } from '@parser/Symbols';

export type FontWeight = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;
export type FontWeightRange = { min: FontWeight; max: FontWeight };

/** Each font has data necessary for loading it from Google Fonts. */
export type Face = {
    name: string; // The name of the font
    weights: FontWeight[] | FontWeightRange; // Weights supported on the font
    italic: boolean; // True if italics is supported on the weights above,
    languages?: string[]; // A list of 3-letter ISO language codes supported
};

export type Font = {
    name: string;
    weight: FontWeight;
    italic: boolean;
};

export const loadedFonts = writable<Set<string>>(new Set());

/**
 * A data structure that represents fonts that creators can use to style phrases.
 */
const SupportedFaces: Face[] = [
    {
        name: 'Roboto',
        weights: [100, 300, 400, 500, 700, 900],
        italic: true,
        languages: ['eng'], // Update with languages at https://fonts.google.com/specimen/Roboto/glyphs
    },
    {
        name: 'Noto Sans',
        weights: [100, 200, 300, 400, 500, 600, 700, 800, 900],
        italic: true,
        languages: ['eng'], // Update with languages at https://fonts.google.com/noto/specimen/Noto+Sans/about?query=noto+sans
    },
    {
        name: 'Noto Emoji',
        weights: { min: 300, max: 700 },
        italic: false,
    },
    {
        name: 'Noto Color Emoji',
        weights: { min: 300, max: 700 },
        italic: false,
    },
    {
        name: 'Noto Mono',
        weights: { min: 100, max: 900 },
        italic: false,
    },
    {
        name: 'Poor Story',
        weights: [400],
        italic: false,
    },
    {
        name: 'Permanent Marker',
        weights: [400],
        italic: false,
    },
];
export { SupportedFaces as SupportedFonts };

/**
 * This data structure managers the fonts that have been loaded,
 * responds to requests to load more fonts, and provides notificiations of when they are loaded
 * */
export class FontManager {
    // Default fonts to load.
    readonly fonts: Font[] = [
        { name: 'Noto Sans', weight: 300, italic: false },
        { name: 'Noto Sans', weight: 300, italic: true },
        { name: 'Noto Sans', weight: 400, italic: false },
        { name: 'Noto Sans', weight: 400, italic: true },
        { name: 'Noto Sans', weight: 700, italic: false },
        { name: 'Noto Sans', weight: 700, italic: true },
        { name: 'Noto Mono', weight: 400, italic: false },
        { name: 'Noto Color Emoji', weight: 400, italic: false },
    ];

    facesLoaded = new Map<string, 'requested' | 'loaded' | 'failed'>();

    constructor() {
        this.fonts.forEach((font) => this.load(font));
    }

    /** Returns true if the given font spec appears in SupportedFonts */
    getSupportedFont(font: Font) {
        return SupportedFaces.find(
            (candidate) =>
                // The name matches
                candidate.name === font.name &&
                // All of the requested weights are supported
                (Array.isArray(candidate.weights)
                    ? candidate.weights.includes(font.weight)
                    : font.weight >= candidate.weights.min &&
                      font.weight <= candidate.weights.max) &&
                // If italics are requested, they are available
                (font.italic === false || candidate.italic)
        );
    }

    isFaceRequested(face: string) {
        return this.facesLoaded.has(face);
    }

    isFaceLoaded(face: string) {
        return this.facesLoaded.get(face) === 'loaded';
    }

    async loadFace(name: string) {
        if (this.facesLoaded.get(name) === 'loaded') return;

        // Mark the face requested.
        this.facesLoaded.set(name, 'requested');

        const face = SupportedFaces.find((font) => font.name === name);

        const promises: Promise<boolean>[] = [];
        if (face) {
            // Load all fonts in the face
            if (Array.isArray(face.weights)) {
                for (const weight of face.weights)
                    promises.push(
                        this.load({
                            name: name,
                            weight: weight,
                            italic: false,
                        })
                    );
                if (face.italic)
                    for (const weight of face.weights)
                        promises.push(
                            this.load({
                                name: name,
                                weight: weight,
                                italic: true,
                            })
                        );
            } else
                promises.push(
                    this.load({
                        name: name,
                        weight: 300, // this is ignored
                        italic: false, // this is ignored
                    })
                );
        } else {
            this.facesLoaded.set(name, 'failed');
            return;
        }

        const loads = await Promise.all(promises);

        this.facesLoaded.set(
            name,
            loads.every((loaded) => loaded) ? 'loaded' : 'failed'
        );
    }

    async load(font: Font): Promise<boolean> {
        // Don't try to add if not in a browser yet.
        if (typeof document === 'undefined' || typeof FontFace === 'undefined')
            return false;

        // See if we support this font
        const supportedFont = this.getSupportedFont(font);

        // If the requested font isn't supported, don't load it.
        if (supportedFont === undefined) {
            console.error(`${font.name} not supported`);
            return false;
        }

        // Otherwise, try loading it. Remove spaces.
        const spacelessFontName = font.name.replaceAll(' ', '');
        const fontFace = new FontFace(
            font.name,
            `url(/fonts/${spacelessFontName}/${spacelessFontName}-${
                Array.isArray(supportedFont.weights) ? font.weight : 'all'
            }${
                font.italic && Array.isArray(supportedFont.weights)
                    ? '-italic'
                    : ''
            }.ttf`,
            {
                style: font.italic ? 'italic' : 'normal',
                weight: Array.isArray(supportedFont.weights)
                    ? font.weight.toString()
                    : `${supportedFont.weights.min} ${supportedFont.weights.max}`,
            }
        );
        document.fonts.add(fontFace);

        // Load the font, and when it's done, mark it as loaded and notify any listeners.
        await fontFace.load();

        this.facesLoaded.set(font.name, 'loaded');
        loadedFonts.set(new Set(this.facesLoaded.keys()));

        return true;
    }
}

const Fonts = new FontManager();
export default Fonts;

export const SupportedFontsFamiliesType = SupportedFaces.map(
    (font) => `"${font.name}"`
).join(OR_SYMBOL);
