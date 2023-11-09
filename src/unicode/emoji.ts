/** Adds emoji color variation descriptor to any emojis missing them. Ensures fonts are selected correctly in Safari. */
export function withVariationSelector(text: string) {
    return text.replaceAll(
        /(\p{Extended_Pictographic}(?!\uFE0F))/gu,
        '$1\uFE0F'
    );
}
