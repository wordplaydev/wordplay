import { DOCS_SYMBOL } from '@parser/Symbols';
import Sym from './Sym';
import Token from './Token';

export default class DocToken extends Token {
    constructor(docs = '') {
        super(`${DOCS_SYMBOL}${docs}${DOCS_SYMBOL}`, Sym.Doc);
    }
}
