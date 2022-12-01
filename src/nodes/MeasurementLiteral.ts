import Measurement from "../runtime/Measurement";
import type Value from "../runtime/Value";
import type Conflict from "../conflicts/Conflict";
import Expression from "./Expression";
import MeasurementType from "./MeasurementType";
import Token from "./Token";
import type Type from "./Type";
import type Node from "./Node";
import Unit from "./Unit";
import type Step from "../runtime/Step";
import Finish from "../runtime/Finish";
import { NotANumber } from "../conflicts/NotANumber";
import type Bind from "./Bind";
import type Context from "./Context";
import type { TypeSet } from "./UnionType";
import { getPossibleUnits } from "../transforms/getPossibleUnits";
import type Transform from "../transforms/Transform";
import Replace from "../transforms/Replace";
import { getPossiblePostfix } from "../transforms/getPossibleExpressions";
import PlaceholderToken from "./PlaceholderToken";
import type Translations from "./Translations";
import { TRANSLATE } from "./Translations"
import TokenType from "./TokenType";
import Start from "../runtime/Start";
import type Evaluator from "../runtime/Evaluator";

export default class MeasurementLiteral extends Expression {
    
    readonly number: Token;
    readonly unit: Unit;

    constructor(number?: Token | number, unit?: Unit) {
        super();
        
        this.number = number === undefined ? new PlaceholderToken() : number instanceof Token ? number : new Token("" + number, TokenType.DECIMAL);
        this.unit = unit === undefined ? new Unit() : unit;

        this.computeChildren();

    }
    
    replace(pretty: boolean=false, original?: Node, replacement?: Node) { 
        return new MeasurementLiteral(
            this.replaceChild(pretty, "number", this.number, original, replacement), 
            this.replaceChild(pretty, "unit", this.unit, original, replacement)
        ) as this;
    }

    getGrammar() { 
        return [
            { name: "number", types:[ Token ] },
            { name: "unit", types:[ Unit ] },
        ];
    }

    isInteger() { return !isNaN(parseInt(this.number.text.toString())); }

    computeConflicts(): Conflict[] { 
    
        if(new Measurement(this, this.number).num.isNaN())
            return [ new NotANumber(this) ];
        else
            return []; 
    
    }

    computeType(): Type {
        return new MeasurementType(this.number, this.unit);
    }

    getDependencies(): Expression[] {
        return [];
    }

    compile(): Step[] {
        return [ new Start(this), new Finish(this) ];
    }

    evaluate(_: Evaluator, prior: Value | undefined): Value | undefined {
        
        if(prior) return prior;

        return new Measurement(this, this.number, this.unit);
    }

    evaluateTypeSet(bind: Bind, original: TypeSet, current: TypeSet, context: Context) { bind; original; context; return current; }

    getChildReplacement(child: Node, context: Context): Transform[] | undefined {

        const project = context.project;
        // Any unit in the project
        if(child === this.unit && project !== undefined)
            return getPossibleUnits(project).map(unit => new Replace(context, child, unit));

    }

    getInsertionBefore() { return undefined; }

    getInsertionAfter(context: Context): Transform[] | undefined { return getPossiblePostfix(context, this, this.getType(context)); }

    getChildRemoval(child: Node, context: Context): Transform | undefined {
        if(child === this.unit) return new Replace(context, child, new Unit());
    }

    getChildPlaceholderLabel(child: Node): Translations | undefined {
        if(child === this.number) return {
            "😀": TRANSLATE,
            eng: "#"
        }
    }

    getDescriptions(): Translations {
        return {
            "😀": TRANSLATE,
            eng: "A number with an optional unit"
        }
    }

    getStart() { return this.number; }

    getStartExplanations(): Translations { 
        return {
            "😀": TRANSLATE,
            eng: "Let's make a number!"
        }
    }

    getFinishExplanations(): Translations {
        return {
            "😀": TRANSLATE,
            eng: "We made a number!"
        }
    }

}