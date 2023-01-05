import { EVAL_OPEN_SYMBOL } from '../parser/Symbols';
import Token from './Token';
import TokenType from './TokenType';

export default class EvalOpenToken extends Token {
    constructor() {
        super(EVAL_OPEN_SYMBOL, TokenType.EVAL_OPEN);
    }
}
