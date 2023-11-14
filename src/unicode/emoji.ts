/** Adds emoji text variation descriptor to any noto emoji missing them. Ensures fonts are rendered consistently across Chrome, Safari, and Firefox. */
export function withVariationSelector(text: string, color = false) {
    return color
        ? text.replaceAll(/(\p{Extended_Pictographic}(?!\uFE0F))/gu, '$1\uFE0F')
        : text.replaceAll(
              /(\p{Extended_Pictographic}(?!\uFE0E))/gu,
              '$1\uFE0E'
          );
}
