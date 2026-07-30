/**
 * Split a camel-cased identifier into words, for descriptions.
 *
 * Wordplay names are single tokens — `eyesOpen`, `mouthOpenAmount` — because
 * they have to be typeable as code. Spoken or read as one run of letters they
 * are hard to parse, so descriptions segment them: "eyes open", "mouth open
 * amount". Only the boundaries are changed; the letters are untouched, so a
 * name that isn't camel-cased comes back exactly as it went in.
 */
export default function segmentName(name: string): string {
    return (
        name
            // A lowercase letter or digit followed by an uppercase one is a
            // word boundary: eyesOpen → eyes Open.
            .replace(/([\p{Ll}\p{N}])(\p{Lu})/gu, '$1 $2')
            // The end of an acronym run followed by a new word is too:
            // HTMLTag → HTML Tag.
            .replace(/(\p{Lu}+)(\p{Lu}\p{Ll})/gu, '$1 $2')
            // An identifier starting lowercase is all one lowercase phrase, so
            // drop the capitals the split exposed. A name that starts
            // uppercase keeps its capitals, since those are deliberate.
            .replace(/^(\p{Ll}.*)$/u, (whole) => whole.toLowerCase())
    );
}
