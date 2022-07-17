import Conflict, { IncompatibleKey } from "../parser/Conflict";
import Expression from "./Expression";
import type Node from "./Node";
import type Program from "./Program";
import SetOrMapType from "./SetOrMapType";
import type Token from "./Token";
import Type from "./Type";
import UnknownType from "./UnknownType";
import Unparsable from "./Unparsable";
import type Evaluator from "../runtime/Evaluator";
import type Value from "../runtime/Value";
import SetValue from "../runtime/SetValue";
import MapValue from "../runtime/MapValue";
import Exception, { ExceptionType } from "../runtime/Exception";
import type Step from "../runtime/Step";
import Finish from "../runtime/Finish";
import Start from "../runtime/Start";

export default class SetOrMapAccess extends Expression {

    readonly setOrMap: Expression | Unparsable;
    readonly open: Token;
    readonly key: Expression | Unparsable;
    readonly close: Token;

    constructor(setOrMap: Expression | Unparsable, open: Token, key: Expression | Unparsable, close: Token) {
        super();

        this.setOrMap = setOrMap;
        this.open = open;
        this.key = key;
        this.close = close;
    }

    getChildren() {
        return [ this.setOrMap, this.open, this.key, this.close ];
    }

    getConflicts(program: Program): Conflict[] { 
    
        if(this.setOrMap instanceof Unparsable || this.key instanceof Unparsable) return [];

        const setMapType = this.setOrMap.getType(program);
        const keyType = this.key.getType(program);

        if(setMapType instanceof SetOrMapType && setMapType.key instanceof Type && !setMapType.key.isCompatible(program, keyType))
            return [ new IncompatibleKey(this) ];

        return [];
    
    }

    getType(program: Program): Type {
        // Either a set or map type, and if so, the key or value's type.
        if(this.setOrMap instanceof Unparsable) return new UnknownType(this);
        const setOrMapType = this.setOrMap.getType(program);
        if(!(setOrMapType instanceof SetOrMapType)) return new UnknownType(this);
        if(setOrMapType.value !== undefined && setOrMapType.value instanceof Type) return setOrMapType.value;
        if(setOrMapType.key instanceof Type) return setOrMapType.key;
        return new UnknownType(this);
    }

    compile(): Step[] {
        // Evaluate the set expression, then the key expression, then this.
        return [ 
            new Start(this),
            ...this.setOrMap.compile(),
            ...this.key.compile(),
            new Finish(this)
        ];
    }

    evaluate(evaluator: Evaluator): Node | Value {
        
        const key = evaluator.popValue();
        const setOrMap = evaluator.popValue();

        if(!(setOrMap instanceof SetValue || setOrMap instanceof MapValue)) return new Exception(ExceptionType.EXPECTED_TYPE);
        else return setOrMap.get(key);
    
    }

}