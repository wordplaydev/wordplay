import type Bind from "./Bind";
import type Conflict from "./Conflict";
import CustomType from "./CustomType";
import CustomTypeType from "./CustomTypeType";
import Expression from "./Expression";
import FunctionType from "./FunctionType";
import type Program from "./Program";
import type { Token } from "./Token";
import Type from "./Type";
import type TypeVariable from "./TypeVariable";
import UnknownType from "./UnknownType";
import Unparsable from "./Unparsable";

export default class Evaluate extends Expression {

    readonly typeVars: (TypeVariable|Unparsable)[];
    readonly open: Token;
    readonly func: Expression | Unparsable;
    readonly inputs: (Unparsable|Bind|Expression)[];
    readonly close: Token;

    constructor(typeVars: (TypeVariable|Unparsable)[], open: Token, subject: Expression | Unparsable, values: (Unparsable|Bind|Expression)[], close: Token) {
        super();

        this.typeVars = typeVars;
        this.open = open;
        this.func = subject;
        this.inputs = values.slice();
        this.close = close;
    }

    getChildren() {
        return [ ...this.typeVars, this.func, this.open, ...this.inputs, this.close ];
    }

    getConflicts(program: Program): Conflict[] { return []; }

    getType(program: Program): Type {
        if(this.func instanceof Unparsable) return new UnknownType(this);
        const funcType = this.func.getType(program);
        if(funcType instanceof FunctionType && funcType.output instanceof Type) return funcType.output;
        if(funcType instanceof CustomTypeType) return funcType.type;
        if(funcType instanceof CustomType) return funcType;
        else return new UnknownType(this);
    }

}