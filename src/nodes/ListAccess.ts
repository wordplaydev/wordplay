import type Conflict from "../conflicts/Conflict";
import { NotAListIndex } from "../conflicts/NotAListIndex";
import Expression from "./Expression";
import ListType from "./ListType";
import MeasurementType from "./MeasurementType";
import type Token from "./Token";
import Type from "./Type";
import UnknownType from "./UnknownType";
import Unparsable from "./Unparsable";
import type Evaluator from "../runtime/Evaluator";
import type Value from "../runtime/Value";
import List from "../runtime/List";
import Exception, { ExceptionKind } from "../runtime/Exception";
import Measurement from "../runtime/Measurement";
import type Step from "../runtime/Step";
import Finish from "../runtime/Finish";
import Action from "../runtime/Start";
import type { ConflictContext } from "./Node";
import NoneType from "./NoneType";
import UnionType from "./UnionType";
import { outOfBoundsAliases } from "../runtime/Constants";

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

    computeChildren() {
        return [ this.list, this.open, this.index, this.close ];
    }

    computeConflicts(context: ConflictContext): Conflict[] { 
    
        if(this.list instanceof Unparsable || this.index instanceof Unparsable) return [];

        const indexType = this.index.getTypeUnlessCycle(context);

        if(!(indexType instanceof MeasurementType) || indexType.unit !== undefined)
            return [ new NotAListIndex(this, indexType) ];

        return []; 
    
    }

    computeType(context: ConflictContext): Type {
        // The type is the list's value type, or unknown otherwise.
        if(this.list instanceof Unparsable) return new UnknownType(this);
        const listType = this.list.getTypeUnlessCycle(context);
        if(listType instanceof ListType && listType.type instanceof Type) return new UnionType(listType.type, new NoneType(outOfBoundsAliases));
        else return new UnknownType(this);
    }

    compile(context: ConflictContext):Step[] {
        return [ new Action(this), ...this.list.compile(context), ...this.index.compile(context), new Finish(this) ];
    }

    evaluate(evaluator: Evaluator): Value {

        const index = evaluator.popValue();
        const list = evaluator.popValue();

        if(!(list instanceof List)) return new Exception(this, ExceptionKind.EXPECTED_TYPE);
        else if(!(index instanceof Measurement) || !index.isInteger()) return new Exception(this, ExceptionKind.EXPECTED_TYPE);
        else return list.get(index);

    }

}