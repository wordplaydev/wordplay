/** Fold separators a translator may introduce (spaces, and `_` — the reserved
 *  placeholder symbol, never a valid name character) into camelCase so a
 *  machine-translated name stays a single valid Wordplay identifier:
 *  `mi_nombre` / `mi nombre` → `miNombre`. For caseless scripts `toUpperCase`
 *  is a no-op, so glyphs are simply placed adjacent (those scripts don't use
 *  spaces anyway). */
export default function toValidName(name: string): string {
    return name
        .replace(/^[ _]+|[ _]+$/gu, '')
        .replace(/[ _]+(.)/gu, (_, c: string) => c.toUpperCase());
}
