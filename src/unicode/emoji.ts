/** Adds emoji color variation descriptor to any missing them. Ensures fonts are selected correctly in Safari. */
export function withVariationSelector(text: string) {
    return text.replaceAll(/(\p{Emoji}(?!\uFE0F))/gu, '$1\uFE0F');
}
