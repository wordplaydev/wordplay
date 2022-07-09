import type Conflict from "./Conflict";
import type Program from "./Program";
import type { Token } from "./Token";
import Type from "./Type";
import type Unparsable from "./Unparsable";

export default class FunctionType extends Type {

    readonly fun: Token;
    readonly open: Token;
    readonly inputs: (Type|Unparsable)[];
    readonly close: Token;
    readonly output: Type;
    
    constructor(fun: Token, open: Token, inputs: (Type|Unparsable)[], close: Token, output: Type) {
        super();

        this.fun = fun;
        this.open = open;
        this.inputs = inputs;
        this.close = close;
        this.output = output;
    }

    getChildren() {
        return [ this.fun, this.open, ...this.inputs, this.close, this.output ];
    }

    getConflicts(program: Program): Conflict[] { return []; }

}