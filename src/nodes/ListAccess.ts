import Conflict, { NotAListIndex } from "../parser/Conflict";
import Expression from "./Expression";
import ListType from "./ListType";
import MeasurementType from "./MeasurementType";
import type Node from "./Node";
import type Program from "./Program";
import type Token from "./Token";
import Type from "./Type";
import UnknownType from "./UnknownType";
import Unparsable from "./Unparsable";
import type Evaluator from "../runtime/Evaluator";
import type Value from "../runtime/Value";
import List from "../runtime/List";
import Exception, { ExceptionType } from "../runtime/Exception";
import Measurement from "../runtime/Measurement";
import type Step from "../runtime/Step";
import Finish from "../runtime/Finish";
import Start from "../runtime/Start";

export default class ListAccess extends Expression {

    readonly list: Expression | Unparsable;
    readonly open: Token;
    readonly index: Expression | Unparsable;
    readonly close: Token;

    constructor(list: Expression | Unparsable, open: Token, index: Expression | Unparsable, close: Token) {
        super();

        this.list = list;
        this.open = open;
        this.index = index;
        this.close = close;
    }

    getChildren() {
        return [ this.list, this.open, this.index, this.close ];
    }

    getConflicts(program: Program): Conflict[] { 
    
        if(this.list instanceof Unparsable || this.index instanceof Unparsable) return [];

        const indexType = this.index.getType(program);

        if(!(indexType instanceof MeasurementType) || indexType.unit !== undefined)
            return [ new NotAListIndex(this) ];

        return []; 
    
    }

    getType(program: Program): Type {
        // The type is the list's value type, or unknown otherwise.
        if(this.list instanceof Unparsable) return new UnknownType(this);
        const listType = this.list.getType(program);
        if(listType instanceof ListType && listType.type instanceof Type) return listType.type;
        else return new UnknownType(this);
    }

    compile(): Step[] {
        return [ new Start(this), ...this.list.compile(), ...this.index.compile(), new Finish(this) ];
    }

    evaluate(evaluator: Evaluator): Value {

        const index = evaluator.popValue();
        const list = evaluator.popValue();

        if(!(list instanceof List)) return new Exception(ExceptionType.EXPECTED_TYPE);
        else if(!(index instanceof Measurement) || !index.isInteger()) return new Exception(ExceptionType.EXPECTED_TYPE);
        else return list.get(index);

    }

}