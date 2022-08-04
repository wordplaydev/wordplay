import type Node from "./Node";
import Expression from "./Expression";
import type Token from "./Token";
import type Docs from "./Docs";
import type Conflict from "../conflicts/Conflict";
import { MisplacedConversion } from "../conflicts/MisplacedConversion";
import { DuplicateLanguages } from "../conflicts/DuplicateLanguages";
import UnknownType from "./UnknownType";
import Unparsable from "./Unparsable";
import { docsAreUnique } from "./util";
import StructureDefinition from "./StructureDefinition";
import Block from "./Block";
import ConversionType from "./ConversionType";
import type Type from "./Type";
import type Evaluator from "../runtime/Evaluator";
import Exception, { ExceptionKind } from "../runtime/Exception";
import type Step from "../runtime/Step";
import Finish from "../runtime/Finish";
import ConversionValue from "../runtime/ConversionValue";
import type { ConflictContext } from "./Node";

export default class ConversionDefinition extends Expression {

    readonly docs: Docs[];
    readonly convert: Token;
    readonly output: Type | Unparsable;
    readonly expression: Expression | Unparsable;

    constructor(docs: Docs[], convert: Token, output: Type | Unparsable, expression: Expression | Unparsable) {
        super();

        this.docs = docs;
        this.convert = convert;
        this.output = output;
        this.expression = expression;
    }

    getChildren() {
        let children: Node[] = [];
        children = children.concat(this.docs);
        children.push(this.convert);
        children.push(this.output);
        children.push(this.expression);
        return children;
    }

    getConflicts(context: ConflictContext): Conflict[] { 
        
        const conflicts: Conflict[] = [];
    
        // Docs must be unique.
        if(!docsAreUnique(this.docs))
            conflicts.push(new DuplicateLanguages(this.docs))

        // Can only appear in custom types.
        const enclosure = context.program.getBindingEnclosureOf(this);
        if(!(enclosure instanceof Block) ||  !(context.program.getBindingEnclosureOf(enclosure) instanceof StructureDefinition))
            conflicts.push(new MisplacedConversion(this));
    
        return conflicts; 
    
    }

    getType(context: ConflictContext): Type {
        return this.output instanceof Unparsable ? new UnknownType(this) : new ConversionType(this.output);
    }

    compile(): Step[] {
        return [ new Finish(this) ];
    }

    evaluate(evaluator: Evaluator) {

        const context = evaluator.getEvaluationContext();
        if(context === undefined) return new Exception(this, ExceptionKind.EXPECTED_CONTEXT);

        context.addConversion(new ConversionValue(this, context));
        
    }

}