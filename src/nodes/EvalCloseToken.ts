import { EVAL_CLOSE_SYMBOL } from '@parser/Symbols';
import Token from './Token';
import TokenType from './TokenType';

export default class EvalCloseToken extends Token {
    constructor() {
        super(EVAL_CLOSE_SYMBOL, TokenType.EVAL_CLOSE);
    }
}
