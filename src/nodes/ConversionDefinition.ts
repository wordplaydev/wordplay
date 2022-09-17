import type Node from "./Node";
import Expression from "./Expression";
import Token from "./Token";
import TokenType from "./TokenType";
import Documentation from "./Documentation";
import type Conflict from "../conflicts/Conflict";
import { MisplacedConversion } from "../conflicts/MisplacedConversion";
import { DuplicateLanguages } from "../conflicts/DuplicateLanguages";
import UnknownType from "./UnknownType";
import Unparsable from "./Unparsable";
import { getDuplicateDocs } from "./util";
import StructureDefinition from "./StructureDefinition";
import Block from "./Block";
import ConversionType from "./ConversionType";
import Type from "./Type";
import type Evaluator from "../runtime/Evaluator";
import Exception, { ExceptionKind } from "../runtime/Exception";
import type Step from "../runtime/Step";
import Finish from "../runtime/Finish";
import ConversionValue from "../runtime/ConversionValue";
import type { ConflictContext } from "./Node";
import { parseType, tokens } from "../parser/Parser";
import { CONVERT_SYMBOL } from "../parser/Tokenizer";

export default class ConversionDefinition extends Expression {

    readonly docs: Documentation[];
    readonly convert: Token;
    readonly output: Type | Unparsable;
    readonly expression: Expression | Unparsable;

    constructor(docs: Documentation[], output: Type | Unparsable | string, expression: Expression | Unparsable, convert?: Token) {
        super();

        this.docs = docs;
        this.convert = convert ?? new Token(CONVERT_SYMBOL, [ TokenType.CONVERT ]);
        this.output = typeof output === "string" ? parseType(tokens(output)) : output;
        this.expression = expression;
    }

    computeChildren() {
        let children: Node[] = [];
        children = children.concat(this.docs);
        if(this.convert) children.push(this.convert);
        children.push(this.output);
        children.push(this.expression);
        return children;
    }

    convertsType(type: Type, context: ConflictContext) {
        return this.output instanceof Type && this.output.isCompatible(type, context);
    }

    computeConflicts(): Conflict[] { 
        
        const conflicts: Conflict[] = [];
    
        // Docs must be unique.
        const duplicateDocs = getDuplicateDocs(this.docs);
        if(duplicateDocs.size > 0)
            conflicts.push(new DuplicateLanguages(this.docs, duplicateDocs));

        // Can only appear in custom types.
        const enclosure = this.getBindingEnclosureOf();
        if(!(enclosure instanceof Block) ||  !(enclosure.getBindingEnclosureOf() instanceof StructureDefinition))
            conflicts.push(new MisplacedConversion(this));
    
        return conflicts; 
    
    }

    computeType(): Type {
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

    clone(original?: Node, replacement?: Node) { 
        return new ConversionDefinition(
            this.docs.map(d => d.cloneOrReplace([ Documentation ], original, replacement)), 
            this.output.cloneOrReplace([ Type, Unparsable ], original, replacement), 
            this.expression.cloneOrReplace([ Expression, Unparsable ], original, replacement), 
            this.convert.cloneOrReplace([ Token ], original, replacement)
        ) as this; 
    }

}