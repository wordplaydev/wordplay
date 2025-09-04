import { EVAL_CLOSE_SYMBOL } from '@parser/Symbols';
import Sym from './Sym';
import Token from './Token';

export default class EvalCloseToken extends Token {
    constructor() {
        super(EVAL_CLOSE_SYMBOL, Sym.EvalClose);
    }
}
