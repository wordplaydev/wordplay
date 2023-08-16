import { EVAL_CLOSE_SYMBOL } from '@parser/Symbols';
import Token from './Token';
import Sym from './Sym';

export default class EvalCloseToken extends Token {
    constructor() {
        super(EVAL_CLOSE_SYMBOL, Sym.EvalClose);
    }
}
