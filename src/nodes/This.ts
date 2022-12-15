import type Conflict from "../conflicts/Conflict";
import type Type from "./Type";
import type Node from "./Node";
import type Value from "../runtime/Value";
import type Step from "../runtime/Step";
import type Bind from "./Bind";
import type Context from "./Context";
import type TypeSet from "./TypeSet";
import type Evaluator from "../runtime/Evaluator";

import Expression from "./Expression";
import Token from "./Token";
import UnknownType from "./UnknownType";
import StructureDefinition from "./StructureDefinition";
import { MisplacedThis } from "../conflicts/MisplacedThis";
import StructureType from "./StructureType";
import NameException from "../runtime/NameException";
import { THIS_SYMBOL } from "../parser/Tokenizer";
import ConversionDefinition from "./ConversionDefinition";
import MeasurementType from "./MeasurementType";
import type Transform from "../transforms/Transform";
import { getPossiblePostfix } from "../transforms/getPossibleExpressions";
import type Translations from "./Translations";
import { TRANSLATE } from "./Translations"
import StartFinish from "../runtime/StartFinish";
import Reaction from "./Reaction";
import ValueException from "../runtime/ValueException";

type ThisStructure = StructureDefinition | ConversionDefinition | Reaction;

export default class This extends Expression {
    
    readonly dis: Token;

    constructor(dis: Token) {
        super();
        this.dis = dis;

        this.computeChildren();

    }

    getGrammar() { 
        return [
            { name: "dis", types:[ Token ] },
        ]; 
    }

    replace(original?: Node, replacement?: Node) { 
        return new This(this.replaceChild("dis", this.dis, original, replacement)) as this; 
    }

    getEnclosingStructure(context: Context): ThisStructure | undefined {

        return context.get(this)?.getAncestors()?.find(a => 
            a instanceof StructureDefinition || 
            a instanceof ConversionDefinition ||
            a instanceof Reaction) as ThisStructure | undefined;

    }

    computeConflicts(context: Context): Conflict[] { 

        // This can only be referenced in the context of a structure or reaction.
        if(this.getEnclosingStructure(context) === undefined)
            return [ new MisplacedThis(this) ];

        return [];
    }

    computeType(context: Context): Type { 
    
        // The type of this is the structure definition in which this is evaluating.
        const structure = this.getEnclosingStructure(context);
        return structure === undefined ? new UnknownType(this) : 
            // Structure definition's have the structure type
            structure instanceof StructureDefinition ? new StructureType(structure, []) :
            // Conversion definitions have the input type
            structure instanceof ConversionDefinition ?  (
                // We strip the unit from this in order to provide a scalar for conversion.
                structure.input instanceof MeasurementType ? MeasurementType.make() :
                structure.input
            ) :
            // Reactions have the reaction's value type
            structure instanceof Reaction ? structure.getTypeUnlessCycle(context) :
            new UnknownType(this);
    
    }

    getDependencies(): Expression[] {
        return [];
    }

    compile(): Step[] {
        // We climb the closure chain finding the first structure.
        return [ new StartFinish(this) ];
    }

    evaluate(evaluator: Evaluator, prior: Value | undefined): Value {
        
        if(prior) return prior;

        // If this is in a reaction, it refers to the latest value of the reaction being evaluated.
        const reaction = evaluator.getCurrentContext().get(this)?.getAncestors().find(n => n instanceof Reaction) as Reaction | undefined;
        if(reaction) {
            const latestValue = evaluator.getReactionStreamLatest(reaction);
            return latestValue ?? new ValueException(evaluator);
        }

        // Otherwise, this means something else.
        return evaluator.getThis(this) ?? new NameException(THIS_SYMBOL, evaluator);
    }

    evaluateTypeSet(bind: Bind, original: TypeSet, current: TypeSet, context: Context) { bind; original; context; return current; }

    getChildReplacement() { return undefined; }
    getInsertionBefore() { return undefined; }
    getInsertionAfter(context: Context): Transform[] | undefined { return getPossiblePostfix(context, this, this.getType(context)); }
    getChildRemoval() { return undefined; }

    getStart() { return this.dis; }
    getFinish() { return this.dis; }

    getStartExplanations(): Translations { 
        return {
            "😀": TRANSLATE,
            eng: "Get the structure evaluating this."
        }
     }

    getFinishExplanations(): Translations {
        return {
            "😀": TRANSLATE,
            eng: "Get the structure evaluating this."
        }
    }

    getDescriptions(): Translations {
        return {
            "😀": TRANSLATE,
            eng: "The value of this"
        }
    }

}