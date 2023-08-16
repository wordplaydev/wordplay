import { DOCS_SYMBOL } from '@parser/Symbols';
import Token from './Token';
import Sym from './Sym';

export default class DocToken extends Token {
    constructor(docs = '') {
        super(`${DOCS_SYMBOL}${docs}${DOCS_SYMBOL}`, Sym.Doc);
    }
}
