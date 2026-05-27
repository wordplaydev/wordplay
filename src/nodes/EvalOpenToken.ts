import { EVAL_OPEN_SYMBOL } from '@parser/Symbols';
import { Sym } from '@nodes/Sym';
import Token from '@nodes/Token';

export default class EvalOpenToken extends Token {
    constructor() {
        super(EVAL_OPEN_SYMBOL, Sym.EvalOpen);
    }
}
