export type FontWeight = 100|200|300|400|500|600|700|800|900;
export type FontWeightRange = { min: FontWeight, max: FontWeight };

/** Each font has data necessary for loading it from Google Fonts. */
export type FontFamily = {
    name: string, // The name of the font
    weights: FontWeight[] | FontWeightRange, // Weights supported on the font
    italic: boolean // True if italics is supported on the weights above,
    languages?: string[] // A list of 3-letter ISO language codes supported
}

export type Font = {
    name: string,
    weight: FontWeight,
    italic: boolean
}

/**
 * A data structure that represents fonts that creators can use to style phrases.
 */
const SupportedFontFamilies: FontFamily[] = [
    {
        name: "Roboto",
        weights: [ 100, 300, 400, 500, 700, 900 ],
        italic: true,
        languages: [ "eng" ] // Update with languages at https://fonts.google.com/specimen/Roboto/glyphs
    },
    {
        name: "Noto Sans",
        weights: [ 100, 200, 300, 400, 500, 600, 700, 800, 900 ],
        italic: true,
        languages: [ "eng" ] // Update with languages at https://fonts.google.com/noto/specimen/Noto+Sans/about?query=noto+sans
    },
    {
        name: "Noto Emoji",
        weights: { min: 300, max: 700 },
        italic: false
    },
    {
        name: "Noto Mono",
        weights: { min: 100, max: 900 },
        italic: false
    },
    {
        name: "Poor Story",
        weights: [ 400 ],
        italic: false
    }
];
export { SupportedFontFamilies as SupportedFonts };

/** 
 * This data structure managers the fonts that have been loaded,
 * responds to requests to load more fonts, and provides notificiations of when they are loaded
 * */
export class FontManager {

    // Default fonts to load from Google Fonts.
    readonly fonts: Font[] = [
        { name: "Noto Sans", weight: 400, italic: false },
        { name: "Noto Sans", weight: 700, italic: false },
        { name: "Noto Sans", weight: 400, italic: true },
        { name: "Noto Sans", weight: 700, italic: true },
        { name: "Noto Emoji", weight: 400, italic: false },
        { name: "Noto Mono", weight: 400, italic: false }
    ];

    loadedFamilies: string[] = [];

    constructor() {
        this.fonts.forEach(font => this.load(font));
    }

    /** Returns true if the given font spec appears in SupportedFonts */
    getSupportedFont(font: Font) {
        return SupportedFontFamilies.find(
            candidate => 
                // The name matches
                candidate.name === font.name && 
                // All of the requested weights are supported
                (Array.isArray(candidate.weights) ? candidate.weights.includes(font.weight) : (font.weight >= candidate.weights.min && font.weight <= candidate.weights.max)) &&
                // If italics are requested, they are available
                (font.italic === false || candidate.italic)
        );
    }

    loadFamily(name: string) {

        if(this.loadedFamilies.includes(name)) return;
        this.loadedFamilies.push(name);

        const family = SupportedFontFamilies.find(font => font.name === name);
        if(family) {
            // Load all fonts in the family
            if(Array.isArray(family.weights)) {
                for(const weight of family.weights)
                    this.load({
                        name: name,
                        weight: weight,
                        italic: false
                    });
                if(family.italic)
                    for(const weight of family.weights)
                    this.load({
                        name: name,
                        weight: weight,
                        italic: true
                    });
            }
            else this.load({
                name: name,
                weight: 300, // this is ignored
                italic: false, // this is ignored
            })
        }

    }

    load(font: Font) {

        // Don't try to add if not in a browser yet.
        if(typeof document === "undefined" || typeof FontFace === "undefined")
            return false;
        
        // See if we support this font
        const supportedFont = this.getSupportedFont(font);

        // If the requested font isn't supported, don't load it.
        if(supportedFont === undefined) {
            console.error(`${font.name} not supported`);
            return false;
        }

        // Otherwise, try loading it.
        const spacelessFontName = font.name.replaceAll(" ", "");
        const fontFace = new FontFace(font.name, 
            `url(/fonts/${spacelessFontName}/${spacelessFontName}-${Array.isArray(supportedFont.weights) ? font.weight : "all"}${font.italic && Array.isArray(supportedFont.weights) ? "-italic" : ""}.ttf`,
            {
                style: font.italic ? "italic" : "normal",
                weight: Array.isArray(supportedFont.weights) ? font.weight.toString() : `${supportedFont.weights.min} ${supportedFont.weights.max}`
            });
        document.fonts.add(fontFace);
        fontFace.load();

    }

}

const Fonts = new FontManager();
export { Fonts };

export const SupportedFontsType = SupportedFontFamilies.map(font => `•"${font.name}"`).join("");