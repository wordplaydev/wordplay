import { DOCS_SYMBOL } from '@parser/Symbols';
import { Sym } from '@nodes/Sym';
import Token from '@nodes/Token';

export default class DocToken extends Token {
    constructor(docs = '') {
        super(`${DOCS_SYMBOL}${docs}${DOCS_SYMBOL}`, Sym.Doc);
    }
}
