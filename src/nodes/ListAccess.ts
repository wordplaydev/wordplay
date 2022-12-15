import type Conflict from "../conflicts/Conflict";
import { NotAListIndex } from "../conflicts/NotAListIndex";
import Expression from "./Expression";
import ListType from "./ListType";
import MeasurementType from "./MeasurementType";
import Token from "./Token";
import Type from "./Type";
import UnknownType from "./UnknownType";
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
import UnionType from "./UnionType";
import type TypeSet from "./TypeSet";
import Unit from "./Unit";
import type Bind from "./Bind";
import type Translations from "./Translations";
import { TRANSLATE } from "./Translations"
import { getExpressionReplacements, getPossiblePostfix } from "../transforms/getPossibleExpressions";
import type Transform from "../transforms/Transform"
import Replace from "../transforms/Replace";
import ExpressionPlaceholder from "./ExpressionPlaceholder";
import { NotAList } from "../conflicts/NotAList";
import UnclosedDelimiter from "../conflicts/UnclosedDelimiter";
import ListOpenToken from "./ListOpenToken";
import ListCloseToken from "./ListCloseToken";
import MeasurementLiteral from "./MeasurementLiteral";

export default class ListAccess extends Expression {
    
    readonly list: Expression;
    readonly open: Token;
    readonly index: Expression;
    readonly close?: Token;

    constructor(open: Token, list: Expression, index: Expression, close?: Token) {
        super();

        this.list = list;
        this.open = open;
        this.index = index;
        this.close = close;

        this.computeChildren();

    }

    static make(list: Expression, index: Expression) {
        return new ListAccess(
            new ListOpenToken(),
            list,
            index,
            new ListCloseToken()
        );
    }

    getGrammar() { 
        return [
            { name: "list", types:[ Expression ] },
            { name: "open", types:[ Token ] },
            { name: "index", types:[ Expression ] },
            { name: "close", types:[ Token, undefined ] },
        ];
    }

    replace(original?: Node, replacement?: Node) { 
        return new ListAccess(
            this.replaceChild("list", this.list, original, replacement), 
            this.replaceChild("index", this.index, original, replacement), 
            this.replaceChild("open", this.open, original, replacement), 
            this.replaceChild("close", this.close, original, replacement)
        ) as this; 
    }

    computeConflicts(context: Context): Conflict[] { 

        const conflicts = [];

        if(this.close === undefined)
            conflicts.push(new UnclosedDelimiter(this, this.open, new ListCloseToken()));

        const listType = this.list.getTypeUnlessCycle(context);
        if(!(listType instanceof ListType))
            conflicts.push(new NotAList(this, listType));

        const indexType = this.index.getTypeUnlessCycle(context);

        if(!(indexType instanceof MeasurementType) || (indexType.unit instanceof Unit && !indexType.unit.isUnitless()))
            conflicts.push(new NotAListIndex(this, indexType));

        return conflicts; 
    
    }

    computeType(context: Context): Type {
        // The type is the list's value type, or unknown otherwise.
        const listType = this.list.getTypeUnlessCycle(context);
        if(listType instanceof ListType && listType.type instanceof Type) {
            if(listType.length !== undefined && this.index instanceof MeasurementLiteral && this.index.toValue().num.greaterThanOrEqualTo(1) && this.index.toValue().num.lessThanOrEqualTo(listType.length))
                return listType.type;
            else
                return UnionType.getPossibleUnion(context, [ listType.type, NoneType.make() ]);
        }
        else return new UnknownType(this);
    }

    getDependencies(): Expression[] {
        return [ this.list, this.index ];
    }

    compile(context: Context):Step[] {
        return [ new Start(this), ...this.list.compile(context), ...this.index.compile(context), new Finish(this) ];
    }

    getStart() { return this.open; }
    getFinish() { return this.close ?? this.index; }

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

    evaluate(evaluator: Evaluator, prior: Value | undefined): Value {
        
        if(prior) return prior;

        const index = evaluator.popValue(MeasurementType.make());
        if(!(index instanceof Measurement) || !index.num.isInteger()) return index;

        const list = evaluator.popValue(ListType.make());
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
            return getExpressionReplacements(this, this.list, context, ListType.make());
        else if(child === this.index)
            return getExpressionReplacements(this, this.index, context, MeasurementType.make());

    }
    getInsertionBefore() { return undefined; }

    getInsertionAfter(context: Context): Transform[] | undefined { return getPossiblePostfix(context, this, this.getType(context)); }

    getChildRemoval(child: Node, context: Context): Transform | undefined {
        if(child === this.list || child === this.index) return new Replace(context, child, new ExpressionPlaceholder());
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