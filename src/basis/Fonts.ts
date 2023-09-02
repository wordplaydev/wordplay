import { writable } from 'svelte/store';
import { OR_SYMBOL } from '@parser/Symbols';
import { Latin, LatinCyrillicGreek, type Script } from '../locale/Scripts';
import type Locale from '../locale/Locale';

export const SupportedFaces = [
    'Noto Sans',
    'Noto Sans Japanese',
    'Noto Emoji',
    'Noto Color Emoji',
    'Noto Sans Simplified Chinese',
    'Noto Mono',
    'Poor Story',
    'Permanent Marker',
    'Borel',
    'Roboto',
] as const;

export type SupportedFace = (typeof SupportedFaces)[number];

export type FontWeight = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;
export type FontWeightRange = { min: FontWeight; max: FontWeight };

/** Each font has data necessary for loading it from Google Fonts. */
export type Face = {
    readonly name: string; // The name of the font
    readonly weights: FontWeight[] | FontWeightRange; // Weights supported on the font
    readonly italic: boolean; // True if italics is supported on the weights above,
    readonly scripts: Readonly<Script[]>; // A list of ISO 15924 scripts supported
};

export type Font = {
    readonly name: SupportedFace;
    readonly weight: FontWeight;
    readonly italic: boolean;
};

export const loadedFonts = writable<Set<SupportedFace>>(new Set());

/**
 * A data structure that represents fonts that creators can use to style phrases.
 */
const Faces: Face[] = [
    {
        name: 'Noto Sans',
        weights: [100, 200, 300, 400, 500, 600, 700, 800, 900],
        italic: true,
        scripts: LatinCyrillicGreek,
    },
    {
        name: 'Noto Sans Japanese',
        weights: { min: 100, max: 900 },
        italic: false,
        scripts: ['Jpan'],
    },
    {
        name: 'Noto Emoji',
        weights: { min: 300, max: 700 },
        italic: false,
        scripts: ['Emoj'],
    },
    {
        name: 'Noto Color Emoji',
        weights: { min: 300, max: 700 },
        italic: false,
        scripts: ['Emoj'],
    },
    {
        name: 'Noto Sans Simplified Chinese',
        weights: [100, 300, 400, 500, 700, 900],
        italic: false,
        scripts: ['Hani'],
    },
    {
        name: 'Noto Mono',
        weights: { min: 100, max: 900 },
        italic: false,
        scripts: LatinCyrillicGreek,
    },
    {
        name: 'Poor Story',
        weights: [400],
        italic: false,
        scripts: ['Kore', 'Latn'],
    },
    {
        name: 'Permanent Marker',
        weights: [400],
        italic: false,
        scripts: ['Latn'],
    },
    {
        name: 'Borel',
        weights: [400],
        italic: false,
        scripts: Latin,
    },
    {
        name: 'Roboto',
        weights: [100, 300, 400, 500, 700, 900],
        italic: true,
        scripts: LatinCyrillicGreek,
    },
    {
        name: 'Phudu',
        weights: { min: 300, max: 900 },
        italic: false,
        scripts: ['Latn'],
    },
    {
        name: 'Ubuntu',
        weights: [300, 400, 500, 700],
        italic: true,
        scripts: LatinCyrillicGreek,
    },
    {
        name: 'Quicksand',
        weights: { min: 300, max: 700 },
        italic: false,
        scripts: Latin,
    },
];

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
        { name: 'Noto Emoji', weight: 400, italic: false },
        { name: 'Noto Color Emoji', weight: 400, italic: false },
    ];

    facesLoaded = new Map<SupportedFace, 'requested' | 'loaded' | 'failed'>();

    constructor() {
        this.fonts.forEach((font) => this.load(font));
    }

    /** Returns true if the given font spec appears in SupportedFonts */
    getSupportedFont(font: Font) {
        return Faces.find(
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

    isFaceRequested(face: SupportedFace) {
        return this.facesLoaded.has(face);
    }

    isFaceLoaded(face: SupportedFace) {
        return this.facesLoaded.get(face) === 'loaded';
    }

    loadLocales(locales: Locale[]) {
        for (const locale of locales) {
            this.loadFace(locale.ui.font.app);
            this.loadFace(locale.ui.font.code);
        }
    }

    async loadFace(name: SupportedFace) {
        if (this.facesLoaded.get(name) === 'loaded') return;

        // Mark the face requested.
        this.facesLoaded.set(name, 'requested');

        const face = Faces.find((font) => font.name === name);

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

export const SupportedFontsFamiliesType = Faces.map(
    (font) => `"${font.name}"`
).join(OR_SYMBOL);
