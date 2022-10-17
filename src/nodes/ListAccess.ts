import type Conflict from "../conflicts/Conflict";
import { NotAListIndex } from "../conflicts/NotAListIndex";
import Expression from "./Expression";
import ListType from "./ListType";
import MeasurementType from "./MeasurementType";
import Token from "./Token";
import Type from "./Type";
import UnknownType from "./UnknownType";
import Unparsable from "./Unparsable";
import type Evaluator from "../runtime/Evaluator";
import type Value from "../runtime/Value";
import List from "../runtime/List";
import Measurement from "../runtime/Measurement";
import type Step from "../runtime/Step";
import Finish from "../runtime/Finish";
import Start from "../runtime/Start";
import type Context from "./Context";
import type Node from "./Node";
import NoneType from "./NoneType";
import UnionType, { TypeSet } from "./UnionType";
import { outOfBoundsAliases } from "../runtime/Constants";
import Unit from "./Unit";
import type Bind from "./Bind";
import type Translations from "./Translations";
import { LIST_CLOSE_SYMBOL, LIST_OPEN_SYMBOL } from "../parser/Tokenizer";
import TokenType from "./TokenType";
import getPossibleExpressions from "./getPossibleExpressions";
import { Position } from "./Node";
import type Transform from "./Replacement"

export default class ListAccess extends Expression {
    readonly list: Expression | Unparsable;
    readonly open: Token;
    readonly index: Expression | Unparsable;
    readonly close: Token;

    constructor(list: Expression | Unparsable, index: Expression | Unparsable, open?: Token, close?: Token) {
        super();

        this.list = list;
        this.open = open ?? new Token(LIST_OPEN_SYMBOL, [ TokenType.LIST_OPEN ]);
        this.index = index;
        this.close = close ?? new Token(LIST_CLOSE_SYMBOL, [ TokenType.LIST_CLOSE ]);
    }

    computeChildren() {
        return [ this.list, this.open, this.index, this.close ];
    }

    computeConflicts(context: Context): Conflict[] { 
    
        if(this.list instanceof Unparsable || this.index instanceof Unparsable) return [];

        const indexType = this.index.getTypeUnlessCycle(context);

        if(!(indexType instanceof MeasurementType) || (indexType.unit instanceof Unit && !indexType.unit.isEmpty()))
            return [ new NotAListIndex(this, indexType) ];

        return []; 
    
    }

    computeType(context: Context): Type {
        // The type is the list's value type, or unknown otherwise.
        if(this.list instanceof Unparsable) return new UnknownType(this);
        const listType = this.list.getTypeUnlessCycle(context);
        if(listType instanceof ListType && listType.type instanceof Type) return new UnionType(listType.type, new NoneType(outOfBoundsAliases));
        else return new UnknownType(this);
    }

    compile(context: Context):Step[] {
        return [ new Start(this), ...this.list.compile(context), ...this.index.compile(context), new Finish(this) ];
    }

    getStartExplanations(): Translations {
        return {
            "eng": "Let's get a value from the list!"
        }
    }

    getFinishExplanations(): Translations {
        return {
            "eng": "Now that we have list and the index, get the value in the list at this index."
        }
    }

    evaluate(evaluator: Evaluator): Value {

        const index = evaluator.popValue(new MeasurementType());
        if(!(index instanceof Measurement) || !index.isInteger()) return index;

        const list = evaluator.popValue(new ListType());
        if(!(list instanceof List)) return list;

        return list.get(index);

    }

    clone(original?: Node, replacement?: Node) { 
        return new ListAccess(
            this.list.cloneOrReplace([ Expression, Unparsable ], original, replacement), 
            this.index.cloneOrReplace([ Expression, Unparsable ], original, replacement), 
            this.open.cloneOrReplace([ Token ], original, replacement), 
            this.close.cloneOrReplace([ Token ], original, replacement)
        ) as this; 
    }

    evaluateTypeSet(bind: Bind, original: TypeSet, current: TypeSet, context: Context) { 
        if(this.list instanceof Expression) this.list.evaluateTypeSet(bind, original, current, context);
        if(this.index instanceof Expression) this.index.evaluateTypeSet(bind, original, current, context);
        return current;
    }

    getDescriptions() {
        return {
            eng: "Get a value from a list by index"
        }
    }

    getChildReplacements(child: Node, context: Context, position: Position): Transform[] {

        if(position === Position.ON) {
            if(child === this.list)
                return getPossibleExpressions(this, this.list, context, new ListType());
            else if(child === this.index)
                return getPossibleExpressions(this, this.index, context, new MeasurementType(undefined, new Unit()));
        }
        
        return [];

    }

}