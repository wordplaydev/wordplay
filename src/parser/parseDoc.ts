import Doc from '#nodes/Doc.ts';
import { Sym } from '#nodes/Sym.ts';
import type Tokens from '#parser/Tokens.ts';
import parseLanguage from '#parser/parseLanguage.ts';
import parseMarkup from '#parser/parseMarkup.ts';

export default function parseDoc(tokens: Tokens): Doc {
    const open = tokens.read(Sym.Doc);
    const content = parseMarkup(tokens);
    const close = tokens.readIf(Sym.Doc);
    const lang = tokens.nextIs(Sym.Language)
        ? parseLanguage(tokens)
        : undefined;
    const separator = tokens.nextIs(Sym.Separator)
        ? tokens.read(Sym.Separator)
        : undefined;
    return new Doc(open, content, close, lang, separator);
}
