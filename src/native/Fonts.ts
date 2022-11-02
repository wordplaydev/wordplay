export type Font = {
    name: string, // The name of the font
    weights: (100|200|300|400|500|600|700|800|900)[], // Weights supported on the font
    italic: boolean // True if italics is supported on the weights above,
    languages: string[] // A list of 3-letter ISO language codes supported
}

/**
 * A data structure that represents fonts that creators can use to style phrases.
 */
const Fonts = [
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
    }
];
export default Fonts;