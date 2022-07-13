import Conflict, { NotAListIndex } from "../parser/Conflict";
import Expression from "./Expression";
import ListType from "./ListType";
import MeasurementType from "./MeasurementType";
import type Program from "./Program";
import type Token from "./Token";
import Type from "./Type";
import UnknownType from "./UnknownType";
import Unparsable from "./Unparsable";

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

}