import { writable } from 'svelte/store';
import { OR_SYMBOL } from '@parser/Symbols';
import { Latin, LatinCyrillicGreek, type Script } from '../locale/Scripts';
import type Locale from '../locale/Locale';

export type FontWeight = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;
export type FontWeightRange = { min: FontWeight; max: FontWeight };

/** Each font has data necessary for loading it from Google Fonts. */
export type Face = {
    readonly weights: FontWeight[] | FontWeightRange; // Weights supported on the font
    readonly italic: boolean; // True if italics is supported on the weights above,
    readonly scripts: Readonly<Script[]>; // A list of ISO 15924 scripts supported,
    readonly otf?: boolean; // True if the file is OTF format. Default is TTF.
    readonly preloaded?: boolean; // True if the font is preloaded in app.html, and shouldn't be reloaded.
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
const Faces: Record<string, Face> = {
    'Noto Sans': {
        weights: [100, 200, 300, 400, 500, 600, 700, 800, 900],
        italic: true,
        scripts: LatinCyrillicGreek,
        preloaded: true,
    },
    'Noto Sans Japanese': {
        weights: { min: 100, max: 900 },
        italic: false,
        scripts: ['Jpan'],
    },
    'Noto Emoji': {
        weights: { min: 100, max: 900 },
        italic: false,
        scripts: ['Emoj'],
        preloaded: true,
    },
    'Noto Color Emoji': {
        weights: { min: 300, max: 700 },
        italic: false,
        scripts: ['Emoj'],
        preloaded: true,
    },
    'Noto Sans Simplified Chinese': {
        weights: [100, 300, 400, 500, 700, 900],
        italic: false,
        scripts: ['Hani'],
        otf: true,
    },
    'Noto Mono': {
        weights: { min: 100, max: 900 },
        italic: false,
        scripts: LatinCyrillicGreek,
        preloaded: true,
    },
    'Poor Story': {
        weights: [400],
        italic: false,
        scripts: ['Kore', 'Latn'],
    },
    'Permanent Marker': {
        weights: [400],
        italic: false,
        scripts: ['Latn'],
    },
    Borel: {
        weights: [400],
        italic: false,
        scripts: Latin,
    },
    Roboto: {
        weights: [100, 300, 400, 500, 700, 900],
        italic: true,
        scripts: LatinCyrillicGreek,
    },
    Phudu: {
        weights: { min: 300, max: 900 },
        italic: false,
        scripts: ['Latn'],
    },
    Ubuntu: {
        weights: [300, 400, 500, 700],
        italic: true,
        scripts: LatinCyrillicGreek,
    },
    Quicksand: {
        weights: { min: 300, max: 700 },
        italic: false,
        scripts: Latin,
    },
    Pacifico: {
        weights: [400],
        italic: false,
        scripts: ['Latn', 'Cyrl'],
    },
    Caveat: {
        weights: { min: 400, max: 700 },
        italic: false,
        scripts: ['Latn', 'Cyrl'],
    },
    Arvo: {
        weights: [400, 700],
        italic: true,
        scripts: Latin,
    },
    'Shadows Into Light': {
        weights: [400],
        italic: false,
        scripts: Latin,
    },
    Play: {
        weights: [400, 700],
        italic: false,
        scripts: LatinCyrillicGreek,
    },
    'Passion One': {
        weights: [400, 700, 900],
        italic: false,
        scripts: Latin,
    },
    'Titan One': {
        weights: [400],
        italic: false,
        scripts: Latin,
    },
    'Luckiest Guy': {
        weights: [400],
        italic: false,
        scripts: Latin,
    },
    Creepster: {
        weights: [400],
        italic: false,
        scripts: Latin,
    },
    'Special Elite': {
        weights: [400],
        italic: false,
        scripts: Latin,
    },
    Tangerine: {
        weights: [400, 700],
        italic: false,
        scripts: Latin,
    },
    'Carter One': {
        weights: [400],
        italic: false,
        scripts: Latin,
    },
    Monoton: {
        weights: [400],
        italic: false,
        scripts: Latin,
    },
    Aclonica: {
        weights: [400],
        italic: false,
        scripts: Latin,
    },
    'Berkshire Swash': {
        weights: [400],
        italic: false,
        scripts: Latin,
    },
    'Cabin Sketch': {
        weights: [400, 700],
        italic: false,
        scripts: Latin,
    },
    'Short Stack': {
        weights: [400],
        italic: false,
        scripts: Latin,
    },
    Graduate: {
        weights: [400],
        italic: false,
        scripts: Latin,
    },
    Silkscreen: {
        weights: [400, 700],
        italic: false,
        scripts: Latin,
    },
    'Mouse Memoirs': {
        weights: [400],
        italic: false,
        scripts: Latin,
    },
    Megrim: {
        weights: [400],
        italic: false,
        scripts: Latin,
    },
    Modak: {
        weights: [400],
        italic: false,
        scripts: ['Latn', 'Deva'],
    },
    'Sue Ellen Francisco': {
        weights: [400],
        italic: false,
        scripts: Latin,
    },
    'Rampart One': {
        weights: [400],
        italic: false,
        scripts: ['Latn', 'Jpan'],
    },
    Codystar: {
        weights: [300, 400],
        italic: false,
        scripts: Latin,
    },
    'Crafty Girls': {
        weights: [400],
        italic: false,
        scripts: Latin,
    },
    Gorditas: {
        weights: [400, 700],
        italic: false,
        scripts: Latin,
    },
    'Ribeye Marrow': {
        weights: [400],
        italic: false,
        scripts: Latin,
    },
    'Bungee Outline': {
        weights: [400],
        italic: false,
        scripts: Latin,
    },
};

/** The font face names supported. To add one, carefully add metadata to Faces and files to /static/fonts/. */
export type SupportedFace = keyof typeof Faces;

/** A sorted list of font face names, used to generate drop downs for font choosers and union type definitions for font face inputs. */
export const SupportedFaces = Object.keys(Faces).sort();

/**
 * This data structure managers the fonts that have been loaded,
 * responds to requests to load more fonts, and provides notificiations of when they are loaded
 * */
export class FontManager {
    // Default fonts to load. (All defaults are preloaded in app.html.)
    readonly fonts: Font[] = [
        // { name: 'Noto Sans', weight: 300, italic: false },
        // { name: 'Noto Sans', weight: 300, italic: true },
        // { name: 'Noto Sans', weight: 400, italic: false },
        // { name: 'Noto Sans', weight: 400, italic: true },
        // { name: 'Noto Sans', weight: 700, italic: false },
        // { name: 'Noto Sans', weight: 700, italic: true },
        // { name: 'Noto Mono', weight: 400, italic: false },
        // { name: 'Noto Emoji', weight: 400, italic: false },
    ];

    facesLoaded = new Map<SupportedFace, 'requested' | 'loaded' | 'failed'>();

    constructor() {
        this.fonts.forEach((font) => this.load(font));
    }

    /** Returns true if the given font spec appears in SupportedFonts */
    getSupportedFont(font: Font) {
        const candidate = Faces[font.name];
        return (
            // All of the requested weights are supported
            (Array.isArray(candidate.weights)
                ? candidate.weights.includes(font.weight)
                : font.weight >= candidate.weights.min &&
                  font.weight <= candidate.weights.max) &&
                // If italics are requested, they are available
                (font.italic === false || candidate.italic)
                ? candidate
                : undefined
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
        const face = Faces[name];

        // If preloaded, don't load it.
        if (face.preloaded === true) return;

        if (this.facesLoaded.get(name) === 'loaded') return;

        // Mark the face requested.
        this.facesLoaded.set(name, 'requested');

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
                        weight: face.weights.min,
                        italic: face.italic,
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
            }.${supportedFont.otf ? 'otf' : 'ttf'}`,
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
    (font) => `"${font}"`
).join(OR_SYMBOL);
