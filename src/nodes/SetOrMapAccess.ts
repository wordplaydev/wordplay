import type Conflict from "../conflicts/Conflict";
import { IncompatibleKey } from "../conflicts/IncompatibleKey";
import Expression from "./Expression";
import Token from "./Token";
import Type from "./Type";
import type Node from "./Node";
import UnknownType from "./UnknownType";
import Unparsable from "./Unparsable";
import type Evaluator from "../runtime/Evaluator";
import type Value from "../runtime/Value";
import Set from "../runtime/Set";
import Map from "../runtime/Map";
import type Step from "../runtime/Step";
import Finish from "../runtime/Finish";
import Start from "../runtime/Start";
import type Context from "./Context";
import MapType from "./MapType";
import SetType from "./SetType";
import BooleanType from "./BooleanType";
import type Bind from "./Bind";
import type { TypeSet } from "./UnionType";
import TypeException from "../runtime/TypeException";
import UnionType from "./UnionType";
import { getExpressionReplacements } from "../transforms/getPossibleExpressions";
import AnyType from "./AnyType";
import type Transform from "../transforms/Transform"
import withPrecedingSpace from "../transforms/withPrecedingSpace";

export default class SetOrMapAccess extends Expression {

    readonly setOrMap: Expression | Unparsable;
    readonly open: Token;
    readonly key: Expression | Unparsable;
    readonly close: Token;

    constructor(setOrMap: Expression | Unparsable, open: Token, key: Expression | Unparsable, close: Token) {
        super();

        this.setOrMap = setOrMap;
        this.open = withPrecedingSpace(open);
        this.key = key;
        this.close = close;
    }

    clone(pretty: boolean=false, original?: Node | string, replacement?: Node) { 
        return new SetOrMapAccess(
            this.cloneOrReplaceChild(pretty, [ Expression, Unparsable ], "setOrMap", this.setOrMap, original, replacement), 
            this.cloneOrReplaceChild(pretty, [ Token ], "open", this.open, original, replacement), 
            this.cloneOrReplaceChild(pretty, [ Expression, Unparsable ], "key", this.key, original, replacement), 
            this.cloneOrReplaceChild(pretty, [ Token ], "close", this.close, original, replacement)
        ) as this; 
    }

    computeChildren() {
        return [ this.setOrMap, this.open, this.key, this.close ];
    }

    computeConflicts(context: Context): Conflict[] { 
    
        if(this.setOrMap instanceof Unparsable || this.key instanceof Unparsable) return [];

        const setMapType = this.setOrMap.getTypeUnlessCycle(context);
        const keyType = this.key.getTypeUnlessCycle(context);

        if((setMapType instanceof SetType || setMapType instanceof MapType) && setMapType.key instanceof Type && !setMapType.key.accepts(keyType, context))
            return [ new IncompatibleKey(this, setMapType.key, keyType) ];

        return [];
    
    }

    computeType(context: Context): Type {
        // Either a set or map type, and if so, the key or value's type.
        if(this.setOrMap instanceof Unparsable) return new UnknownType(this);
        const setOrMapType = this.setOrMap.getTypeUnlessCycle(context);
        if(!(setOrMapType instanceof SetType || setOrMapType instanceof MapType)) return new UnknownType(this);
        if(setOrMapType instanceof MapType && setOrMapType.value instanceof Type) return setOrMapType.value;
        if(setOrMapType instanceof SetType) return new BooleanType();
        return new UnknownType(this);
    }

    compile(context: Context):Step[] {
        // Evaluate the set expression, then the key expression, then this.
        return [ 
            new Start(this),
            ...this.setOrMap.compile(context),
            ...this.key.compile(context),
            new Finish(this)
        ];
    }

    evaluate(evaluator: Evaluator): Value {
        
        const key = evaluator.popValue(undefined);
        const setOrMap = evaluator.popValue(undefined);

        if(!(setOrMap instanceof Set || setOrMap instanceof Map)) 
            return new TypeException(evaluator, new UnionType(new SetType(), new MapType()), setOrMap);
        else return setOrMap.has(key);
    
    }

    getStartExplanations() { 
        return {
            "eng": "First evaluate the set/map, then the key."
        }
     }

    getFinishExplanations() {
        return {
            "eng": "Then find the matching key in the set/map."
        }
    }

    evaluateTypeSet(bind: Bind, original: TypeSet, current: TypeSet, context: Context) { 
        if(this.setOrMap instanceof Expression) this.setOrMap.evaluateTypeSet(bind, original, current, context);
        if(this.key instanceof Expression) this.key.evaluateTypeSet(bind, original, current, context);
        return current;
    }

    getDescriptions() {
        return {
            eng: "Get a value in a set or a map"
        }
    }

    getReplacementChild(child: Node, context: Context): Transform[] | undefined  {

        if(child === this.setOrMap) {
            return getExpressionReplacements(context.source, this, this.setOrMap, context, new UnionType(new SetType(new AnyType()), new MapType(new AnyType(), new AnyType())));
        }
        else if(child === this.key) {
            const setMapType = this.setOrMap.getTypeUnlessCycle(context);
            return getExpressionReplacements(context.source, this, this.key, context, 
                (setMapType instanceof SetType || setMapType instanceof MapType) && setMapType.key instanceof Type ? setMapType.key :
                new AnyType()
            )
        }

    }

    getInsertionBefore() { return undefined; }
    getInsertionAfter() { return undefined; }

}