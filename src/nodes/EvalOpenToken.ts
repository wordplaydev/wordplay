import { EVAL_OPEN_SYMBOL } from '@parser/Symbols';
import Token from './Token';
import Sym from './Symbol';

export default class EvalOpenToken extends Token {
    constructor() {
        super(EVAL_OPEN_SYMBOL, Sym.EvalOpen);
    }
}
