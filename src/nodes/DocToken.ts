import { DOCS_SYMBOL } from '@parser/Symbols';
import Token from './Token';
import TokenType from './TokenType';

export default class DocToken extends Token {
    constructor(docs: string = '') {
        super(`${DOCS_SYMBOL}${docs}${DOCS_SYMBOL}`, TokenType.Doc);
    }
}
