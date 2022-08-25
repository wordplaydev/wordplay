import type Conflict from "../conflicts/Conflict";
import { IncompatibleKey } from "../conflicts/IncompatibleKey";
import Expression from "./Expression";
import SetOrMapType from "./SetOrMapType";
import type Token from "./Token";
import Type from "./Type";
import UnknownType from "./UnknownType";
import Unparsable from "./Unparsable";
import type Evaluator from "../runtime/Evaluator";
import type Value from "../runtime/Value";
import SetValue from "../runtime/SetValue";
import MapValue from "../runtime/MapValue";
import Exception, { ExceptionKind } from "../runtime/Exception";
import type Step from "../runtime/Step";
import Finish from "../runtime/Finish";
import Action from "../runtime/Start";
import type { ConflictContext } from "./Node";

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

    getConflicts(context: ConflictContext): Conflict[] { 
    
        if(this.setOrMap instanceof Unparsable || this.key instanceof Unparsable) return [];

        const setMapType = this.setOrMap.getTypeUnlessCycle(context);
        const keyType = this.key.getTypeUnlessCycle(context);

        if(setMapType instanceof SetOrMapType && setMapType.key instanceof Type && !setMapType.key.isCompatible(context, keyType))
            return [ new IncompatibleKey(this, setMapType.key, keyType) ];

        return [];
    
    }

    getType(context: ConflictContext): Type {
        // Either a set or map type, and if so, the key or value's type.
        if(this.setOrMap instanceof Unparsable) return new UnknownType(this);
        const setOrMapType = this.setOrMap.getTypeUnlessCycle(context);
        if(!(setOrMapType instanceof SetOrMapType)) return new UnknownType(this);
        if(setOrMapType.value !== undefined && setOrMapType.value instanceof Type) return setOrMapType.value;
        if(setOrMapType.key instanceof Type) return setOrMapType.key;
        return new UnknownType(this);
    }

    compile(context: ConflictContext):Step[] {
        // Evaluate the set expression, then the key expression, then this.
        return [ 
            new Action(this),
            ...this.setOrMap.compile(context),
            ...this.key.compile(context),
            new Finish(this)
        ];
    }

    evaluate(evaluator: Evaluator): Value {
        
        const key = evaluator.popValue();
        const setOrMap = evaluator.popValue();

        if(!(setOrMap instanceof SetValue || setOrMap instanceof MapValue)) return new Exception(this, ExceptionKind.EXPECTED_TYPE);
        else return setOrMap.has(key);
    
    }

}