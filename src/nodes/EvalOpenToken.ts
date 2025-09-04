import { EVAL_OPEN_SYMBOL } from '@parser/Symbols';
import Sym from './Sym';
import Token from './Token';

export default class EvalOpenToken extends Token {
    constructor() {
        super(EVAL_OPEN_SYMBOL, Sym.EvalOpen);
    }
}
