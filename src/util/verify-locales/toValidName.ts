/** Separators a translator may introduce: spaces, `_` (the reserved
 *  placeholder symbol), and hyphens/dashes (U+002D and the U+2010–U+2015
 *  family), which tokenize as operators and split a name into multiple
 *  tokens. */
const Separators = /[ _\-‐-―]/;
const Leading = new RegExp(`^${Separators.source}+|${Separators.source}+$`, 'gu');
const Internal = new RegExp(`${Separators.source}+(.)`, 'gu');

/** Fold separators into camelCase so a machine-translated name stays a single
 *  valid Wordplay identifier: `mi_nombre` / `mi nombre` / `mi-nombre` →
 *  `miNombre`. For caseless scripts `toUpperCase` is a no-op, so glyphs are
 *  simply placed adjacent (those scripts don't use spaces anyway). A name that
 *  is nothing but separators (e.g. a symbolic operator name) is returned
 *  unchanged rather than emptied. */
export default function toValidName(name: string): string {
    const folded = name
        .replace(Leading, '')
        .replace(Internal, (_, c: string) => c.toUpperCase());
    return folded.length === 0 ? name : folded;
}
