import type Node from "./Node";
import Expression from "./Expression";
import Token from "./Token";
import TokenType from "./TokenType";
import Documentation from "./Documentation";
import type Conflict from "../conflicts/Conflict";
import { MisplacedConversion } from "../conflicts/MisplacedConversion";
import UnknownType from "./UnknownType";
import Unparsable from "./Unparsable";
import { getDuplicateDocs } from "./util";
import Block from "./Block";
import ConversionType from "./ConversionType";
import Type from "./Type";
import type Evaluator from "../runtime/Evaluator";
import type Step from "../runtime/Step";
import Finish from "../runtime/Finish";
import Conversion from "../runtime/Conversion";
import type Context from "./Context";
import { parseType, tokens } from "../parser/Parser";
import { CONVERT_SYMBOL } from "../parser/Tokenizer";
import type Bind from "./Bind";
import type { TypeSet } from "./UnionType";
import ContextException, { StackSize } from "../runtime/ContextException";
import { getPossibleTypeReplacements } from "../transforms/getPossibleTypes";
import { getExpressionReplacements } from "../transforms/getPossibleExpressions";
import type Transform from "../transforms/Transform"
import Remove from "../transforms/Remove";
import Replace from "../transforms/Replace";
import TypePlaceholder from "./TypePlaceholder";
import ExpressionPlaceholder from "./ExpressionPlaceholder";

export default class ConversionDefinition extends Expression {

    readonly docs: Documentation[];
    readonly convert: Token;
    readonly input: Type | Unparsable;
    readonly output: Type | Unparsable;
    readonly expression: Expression | Unparsable;

    constructor(docs: Documentation[], input: Type | Unparsable | string, output: Type | Unparsable | string, expression: Expression | Unparsable, convert?: Token) {
        super();

        this.docs = docs;
        this.convert = convert ?? new Token(CONVERT_SYMBOL, TokenType.CONVERT);
        this.input = typeof input === "string" ? parseType(tokens(input)) : input;
        this.output = typeof output === "string" ? parseType(tokens(output)) : output;
        this.expression = expression;
    }

    clone(pretty: boolean=false, original?: Node | string, replacement?: Node) { 
        return new ConversionDefinition(
            this.cloneOrReplaceChild(pretty, [ Documentation ], "docs", this.docs, original, replacement), 
            this.cloneOrReplaceChild(pretty, [ Type, Unparsable ], "input", this.input, original, replacement), 
            this.cloneOrReplaceChild(pretty, [ Type, Unparsable ], "output", this.output, original, replacement), 
            this.cloneOrReplaceChild(pretty, [ Expression, Unparsable ], "expression", this.expression, original, replacement), 
            this.cloneOrReplaceChild(pretty, [ Token, undefined ], "convert", this.convert, original, replacement)
        ) as this; 
    }

    computeChildren() {
        let children: Node[] = [];
        children = children.concat(this.docs);
        children.push(this.input);
        if(this.convert) children.push(this.convert);
        children.push(this.output);
        children.push(this.expression);
        return children;
    }

    convertsTypeTo(input: Type, output: Type, context: Context) {
        return  !(this.input instanceof Unparsable) && this.input.accepts(input, context) &&
                !(this.output instanceof Unparsable) && this.output.accepts(output, context);
    }

    convertsType(input: Type, context: Context) {
        return !(this.input instanceof Unparsable) && this.input.accepts(input, context);
    }

    computeConflicts(): Conflict[] { 
        
        const conflicts: Conflict[] = [];
    
        // Docs must be unique.
        const duplicateDocs = getDuplicateDocs(this.docs);
        if(duplicateDocs) conflicts.push(duplicateDocs);

        // Can only appear in a block.
        const enclosure = this.getBindingEnclosureOf();
        if(!(enclosure instanceof Block))
            conflicts.push(new MisplacedConversion(this));
    
        return conflicts; 
    
    }

    computeType(): Type {
        return this.input instanceof Unparsable ? new UnknownType(this) : new ConversionType(this.input, undefined, this.output);
    }

    compile(): Step[] {
        return [ new Finish(this) ];
    }

    getStartExplanations() { return this.getFinishExplanations(); }

    getFinishExplanations() {
        return {
            "eng": "Let's define this conversion!"
        }
    }

    evaluate(evaluator: Evaluator) {

        const context = evaluator.getEvaluationContext();
        if(context === undefined) return new ContextException(evaluator, StackSize.EMPTY);

        context.addConversion(new Conversion(this, context));
        
    }

    evaluateTypeSet(bind: Bind, original: TypeSet, current: TypeSet, context: Context) { 
        if(this.expression instanceof Expression)
            this.expression.evaluateTypeSet(bind, original, current, context);
        return current;
    }
 
    getDescriptions() {
        return {
            eng: "A value conversion function"
        }
    }

    getChildReplacement(child: Node, context: Context): Transform[] | undefined { 
        
        if(child === this.input || child === this.output)
            return getPossibleTypeReplacements(child, context);
        // Expression can be anything
        if(child === this.expression)
            return getExpressionReplacements(context.source, this, this.expression, context);

    }

    getInsertionBefore(): Transform[] | undefined { return undefined; }
    getInsertionAfter(): Transform[] | undefined { return []; }

    getChildRemoval(child: Node, context: Context): Transform | undefined {
        if(this.docs.includes(child as Documentation)) return new Remove(context.source, this, child);
        else if(child === this.input || child === this.output) return new Replace(context.source, child, new TypePlaceholder());
        else if(child === this.expression) return new Replace(context.source, child, new ExpressionPlaceholder());
    }

}