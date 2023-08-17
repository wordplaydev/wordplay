import Doc from '../nodes/Doc';
import Sym from '../nodes/Sym';
import type Tokens from './Tokens';
import parseLanguage from './parseLanguage';
import parseMarkup from './parseMarkup';

export default function parseDoc(tokens: Tokens): Doc {
    const open = tokens.read(Sym.Doc);
    const content = parseMarkup(tokens);
    const close = tokens.readIf(Sym.Doc);
    const lang = tokens.nextIs(Sym.Language)
        ? parseLanguage(tokens)
        : undefined;
    return new Doc(open, content, close, lang);
}
