import Language from '../nodes/Language';
import Sym from '../nodes/Sym';
import type Tokens from './Tokens';

/** LANGUAGE :: /NAME */
export default function parseLanguage(tokens: Tokens): Language {
    const slash = tokens.read(Sym.Language);
    const lang =
        tokens.nextIs(Sym.Name) && !tokens.nextHasPrecedingLineBreak()
            ? tokens.read(Sym.Name)
            : undefined;
    const dash =
        tokens.nextIs(Sym.Region) && tokens.nextLacksPrecedingSpace()
            ? tokens.read(Sym.Region)
            : undefined;
    const region =
        dash && tokens.nextIs(Sym.Name) && tokens.nextLacksPrecedingSpace()
            ? tokens.read(Sym.Name)
            : undefined;
    return new Language(slash, lang, dash, region);
}
