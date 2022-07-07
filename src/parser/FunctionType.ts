import type { Token } from "./Token";
import Type from "./Type";
import type Unparsable from "./Unparsable";

export default class Function extends Type {

    readonly fun: Token;
    readonly open: Token;
    readonly inputs: (Type|Unparsable)[];
    readonly close: Token;
    readonly dot: Token;
    readonly output: Type;
    
    constructor(fun: Token, open: Token, inputs: (Type|Unparsable)[], close: Token, dot: Token, output: Type) {
        super();

        this.fun = fun;
        this.open = open;
        this.inputs = inputs;
        this.close = close;
        this.dot = dot;
        this.output = output;
    }

    getChildren() {
        return [ this.fun, this.open, ...this.inputs, this.close, this.dot, this.output ];
    }

}