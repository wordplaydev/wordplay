import Language from '@nodes/Language';
import { Sym } from '@nodes/Sym';
import type Token from '@nodes/Token';
import type Tokens from '@parser/Tokens';

/** LANGUAGE :: /NAME(_NAME)*(-NAME(_NAME)*)?
 *
 * Multilingual extension: after the first language name we accept any number
 * of `_<name>` pairs (no spaces) to express mixed languages such as `es_en`
 * (Spanglish) or `es_en_fr_de`. The optional `-REGION` suffix likewise accepts
 * any number of `_<name>` pairs to express multiple regions (e.g. `en-US_CA`),
 * applying tag-wide.
 */
export default function parseLanguage(tokens: Tokens): Language {
    const slash = tokens.read(Sym.Language);
    const lang =
        tokens.nextIs(Sym.Name) && !tokens.nextHasPrecedingLineBreak()
            ? tokens.read(Sym.Name)
            : undefined;

    // Optional extra languages joined by `_`. We collect alternating
    // [underscore, name] tokens; the parser keeps reading as long as the
    // next token is a `_` directly adjacent to the prior token. If a
    // trailing `_` lacks a following name (malformed input), we still
    // capture the `_` so the syntax tree mirrors what the user wrote and
    // downstream conflict reporting can flag it.
    const extras: Token[] = [];
    while (
        lang !== undefined &&
        tokens.nextIs(Sym.LanguageJoin) &&
        tokens.nextLacksPrecedingSpace()
    ) {
        extras.push(tokens.read(Sym.LanguageJoin));
        if (tokens.nextIs(Sym.Name) && tokens.nextLacksPrecedingSpace())
            extras.push(tokens.read(Sym.Name));
        else break;
    }

    const dash =
        tokens.nextIs(Sym.Region) && tokens.nextLacksPrecedingSpace()
            ? tokens.read(Sym.Region)
            : undefined;
    const region =
        dash && tokens.nextIs(Sym.Name) && tokens.nextLacksPrecedingSpace()
            ? tokens.read(Sym.Name)
            : undefined;

    // Optional extra regions joined by `_`, mirroring the language extras loop
    // above: collect alternating [underscore, name] tokens as long as each is
    // directly adjacent to the prior token.
    const regionExtras: Token[] = [];
    while (
        region !== undefined &&
        tokens.nextIs(Sym.LanguageJoin) &&
        tokens.nextLacksPrecedingSpace()
    ) {
        regionExtras.push(tokens.read(Sym.LanguageJoin));
        if (tokens.nextIs(Sym.Name) && tokens.nextLacksPrecedingSpace())
            regionExtras.push(tokens.read(Sym.Name));
        else break;
    }

    return new Language(slash, lang, extras, dash, region, regionExtras);
}
