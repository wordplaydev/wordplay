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
import Unit from "./Unit";
import type Bind from "./Bind";
import type Translations from "./Translations";
import { TRANSLATE } from "./Translations"
import { LIST_CLOSE_SYMBOL, LIST_OPEN_SYMBOL } from "../parser/Tokenizer";
import TokenType from "./TokenType";
import { getExpressionReplacements, getPossiblePostfix } from "../transforms/getPossibleExpressions";
import type Transform from "../transforms/Transform"
import Replace from "../transforms/Replace";
import ExpressionPlaceholder from "./ExpressionPlaceholder";
import { NotAList } from "../conflicts/NotAList";

export default class ListAccess extends Expression {
    readonly list: Expression | Unparsable;
    readonly open: Token;
    readonly index: Expression | Unparsable;
    readonly close: Token;

    constructor(list: Expression | Unparsable, index: Expression | Unparsable, open?: Token, close?: Token) {
        super();

        this.list = list;
        this.open = open === undefined ? new Token(LIST_OPEN_SYMBOL, TokenType.LIST_OPEN) : open.withPrecedingSpace("", true);
        this.index = index;
        this.close = close ?? new Token(LIST_CLOSE_SYMBOL, TokenType.LIST_CLOSE);
    }

    clone(pretty: boolean=false, original?: Node | string, replacement?: Node) { 
        return new ListAccess(
            this.cloneOrReplaceChild(pretty, [ Expression, Unparsable ], "list", this.list, original, replacement), 
            this.cloneOrReplaceChild(pretty, [ Expression, Unparsable ], "index", this.index, original, replacement), 
            this.cloneOrReplaceChild(pretty, [ Token ], "open", this.open, original, replacement), 
            this.cloneOrReplaceChild(pretty, [ Token ], "close", this.close, original, replacement)
        ) as this; 
    }

    computeChildren() {
        return [ this.list, this.open, this.index, this.close ];
    }

    computeConflicts(context: Context): Conflict[] { 
    
        if(this.list instanceof Unparsable || this.index instanceof Unparsable) return [];

        const conflicts = [];

        const listType = this.list.getTypeUnlessCycle(context);
        if(!(listType instanceof ListType))
            conflicts.push(new NotAList(this, listType));

        const indexType = this.index.getTypeUnlessCycle(context);

        if(!(indexType instanceof MeasurementType) || (indexType.unit instanceof Unit && !indexType.unit.isEmpty()))
            conflicts.push(new NotAListIndex(this, indexType));

        return conflicts; 
    
    }

    computeType(context: Context): Type {
        // The type is the list's value type, or unknown otherwise.
        if(this.list instanceof Unparsable) return new UnknownType(this);
        const listType = this.list.getTypeUnlessCycle(context);
        if(listType instanceof ListType && listType.type instanceof Type) 
            return new UnionType(
                listType.type, new 
                NoneType({
                    eng: "indexoutofbounds",
                    "😀": TRANSLATE
                })
            );
        else return new UnknownType(this);
    }

    compile(context: Context):Step[] {
        return [ new Start(this), ...this.list.compile(context), ...this.index.compile(context), new Finish(this) ];
    }

    getStartExplanations(): Translations {
        return {
            "😀": TRANSLATE,
            eng: "Let's get a value from the list!"
        }
    }

    getFinishExplanations(): Translations {
        return {
            "😀": TRANSLATE,
            eng: "Now that we have list and the index, get the value in the list at this index."
        }
    }

    evaluate(evaluator: Evaluator): Value {

        const index = evaluator.popValue(new MeasurementType());
        if(!(index instanceof Measurement) || !index.num.isInteger()) return index;

        const list = evaluator.popValue(new ListType());
        if(!(list instanceof List)) return list;

        return list.get(index);

    }

    evaluateTypeSet(bind: Bind, original: TypeSet, current: TypeSet, context: Context) { 
        if(this.list instanceof Expression) this.list.evaluateTypeSet(bind, original, current, context);
        if(this.index instanceof Expression) this.index.evaluateTypeSet(bind, original, current, context);
        return current;
    }

    getDescriptions(): Translations {
        return {
            "😀": TRANSLATE,
            eng: "Get a value from a list by index"
        }
    }

    getChildReplacement(child: Node, context: Context): Transform[] | undefined { 

        if(child === this.list)
            return getExpressionReplacements(context.source, this, this.list, context, new ListType());
        else if(child === this.index)
            return getExpressionReplacements(context.source, this, this.index, context, new MeasurementType(undefined, new Unit()));

    }
    getInsertionBefore() { return undefined; }

    getInsertionAfter(context: Context): Transform[] | undefined { return getPossiblePostfix(context, this, this.getType(context)); }

    getChildRemoval(child: Node, context: Context): Transform | undefined {
        if(child === this.list || child === this.index) return new Replace(context.source, child, new ExpressionPlaceholder());
    }
    
    getChildPlaceholderLabel(child: Node): Translations | undefined {
        if(child === this.list) return {
            "😀": TRANSLATE,
            eng: "list"
        };
        else if(child === this.index) return {
            "😀": TRANSLATE,
            eng: "index"
        };
    }

}