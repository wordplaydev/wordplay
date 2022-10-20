import type Conflict from "../conflicts/Conflict";
import Expression from "./Expression";
import Token from "./Token";
import Type from "./Type";
import type Node from "./Node";
import UnknownType from "./UnknownType";
import type Value from "../runtime/Value";
import type Step from "../runtime/Step";
import type Bind from "./Bind";
import type Context from "./Context";
import type { TypeSet } from "./UnionType";
import type Evaluator from "../runtime/Evaluator";
import StructureDefinition from "./StructureDefinition";
import { MisplacedThis } from "../conflicts/MisplacedThis";
import StructureType from "./StructureType";
import Finish from "../runtime/Finish";
import NameException from "../runtime/NameException";
import { THIS_SYMBOL } from "../parser/Tokenizer";
import ConversionDefinition from "./ConversionDefinition";
import MeasurementType from "./MeasurementType";

type ThisStructure = StructureDefinition | ConversionDefinition;

export default class This extends Expression {
    
    readonly dis: Token;

    constructor(dis: Token) {
        super();
        this.dis = dis;
    }

    clone(pretty: boolean=false, original?: Node | string, replacement?: Node) { 
        return new This(this.cloneOrReplaceChild(pretty, [ Token ], "dis", this.dis, original, replacement)) as this; 
    }

    computeChildren() { return [ this.dis ]; }

    getEnclosingStructure(): ThisStructure | undefined {

        return this.getAncestors()?.find(a => 
            a instanceof StructureDefinition || 
            a instanceof ConversionDefinition) as ThisStructure | undefined;

    }

    computeConflicts(): Conflict[] { 

        // This can only be referenced in the context of a structure or reaction.
        if(this.getEnclosingStructure() === undefined)
            return [ new MisplacedThis(this) ];

        return [];
    }

    computeType(): Type { 
    
        // The type of this is the structure definition in which this is evaluating.
        const structure = this.getEnclosingStructure();
        return structure === undefined ? new UnknownType(this) : 
            structure instanceof StructureDefinition ? new StructureType(structure) :
            // We strip the unit from this in order to provide a scalar for conversion.
            structure.input instanceof MeasurementType ? new MeasurementType() :
            structure.input instanceof Type ? structure.input :
            new UnknownType(this);
    
    }

    compile(): Step[] {
        // We climb the closure chain finding the first structure.
        return [ new Finish(this) ];
    }

    getStartExplanations() { 
        return {
            "eng": "Get the structure evaluating this."
        }
     }

    getFinishExplanations() {
        return {
            "eng": "Get the structure evaluating this."
        }
    }

    evaluate(evaluator: Evaluator): Value {        
        return evaluator.getThis() ?? new NameException(evaluator, THIS_SYMBOL);
    }

    evaluateTypeSet(bind: Bind, original: TypeSet, current: TypeSet, context: Context) { bind; original; context; return current; }

    getDescriptions() {
        return {
            eng: "The value of this"
        }
    }

    getReplacementChild() { return undefined; }
    getInsertionBefore() { return undefined; }
    getInsertionAfter() { return undefined; }

}