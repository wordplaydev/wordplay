import { DOCS_SYMBOL } from '@parser/Symbols';
import Token from './Token';
import Sym from './Symbol';

export default class DocToken extends Token {
    constructor(docs = '') {
        super(`${DOCS_SYMBOL}${docs}${DOCS_SYMBOL}`, Sym.Doc);
    }
}
