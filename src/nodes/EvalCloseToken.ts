import { EVAL_CLOSE_SYMBOL } from '@parser/Symbols';
import Token from './Token';
import Sym from './Symbol';

export default class EvalCloseToken extends Token {
    constructor() {
        super(EVAL_CLOSE_SYMBOL, Sym.EvalClose);
    }
}
