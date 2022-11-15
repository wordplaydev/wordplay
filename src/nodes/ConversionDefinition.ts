import type Node from "./Node";
import Expression from "./Expression";
import Token from "./Token";
import TokenType from "./TokenType";
import type Conflict from "../conflicts/Conflict";
import { MisplacedConversion } from "../conflicts/MisplacedConversion";
import UnknownType from "./UnknownType";
import Unparsable from "./Unparsable";
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
import Replace from "../transforms/Replace";
import TypePlaceholder from "./TypePlaceholder";
import ExpressionPlaceholder from "./ExpressionPlaceholder";
import type Translations from "./Translations";
import { TRANSLATE } from "./Translations"
import Docs from "./Docs";

export default class ConversionDefinition extends Expression {

    readonly docs: Docs;
    readonly arrow: Token;
    readonly input: Type | Unparsable;
    readonly output: Type | Unparsable;
    readonly expression: Expression | Unparsable;

    constructor(docs: Docs | Translations, input: Type | Unparsable | string, output: Type | Unparsable | string, expression: Expression | Unparsable, convert?: Token) {
        super();

        this.docs = docs instanceof Docs ? docs : new Docs(docs);
        this.arrow = convert ?? new Token(CONVERT_SYMBOL, TokenType.CONVERT);
        this.input = typeof input === "string" ? parseType(tokens(input)) : input;
        this.output = typeof output === "string" ? parseType(tokens(output)) : output;
        this.expression = expression;

        this.computeChildren();

    }

    getGrammar() { 
        return [
            { name: "docs", types:[ Docs ] },
            { name: "arrow", types:[ Token ] },
            { name: "input", types:[ Type, Unparsable ] },
            { name: "output", types:[ Type, Unparsable ] },
            { name: "expression", types:[ Expression, Unparsable ] },
        ]; 
    }

    clone(pretty: boolean=false, original?: Node, replacement?: Node) { 
        return new ConversionDefinition(
            this.cloneOrReplaceChild(pretty, "docs", this.docs, original, replacement), 
            this.cloneOrReplaceChild(pretty, "input", this.input, original, replacement), 
            this.cloneOrReplaceChild(pretty, "output", this.output, original, replacement), 
            this.cloneOrReplaceChild(pretty, "expression", this.expression, original, replacement), 
            this.cloneOrReplaceChild(pretty, "arrow", this.arrow, original, replacement)
        ) as this; 
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
    
        // Can only appear in a block.
        const enclosure = this.getBindingEnclosureOf();
        if(!(enclosure instanceof Block))
            conflicts.push(new MisplacedConversion(this));
    
        return conflicts; 
    
    }

    computeType(): Type {
        return this.input instanceof Unparsable ? new UnknownType(this.input) : new ConversionType(this.input, undefined, this.output);
    }

    compile(): Step[] {
        return [ new Finish(this) ];
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
        if(child === this.input || child === this.output) return new Replace(context.source, child, new TypePlaceholder());
        else if(child === this.expression) return new Replace(context.source, child, new ExpressionPlaceholder());
    }

    getDescriptions(): Translations {
        return {
            "😀": TRANSLATE,
            eng: "A value conversion function"
        }
    }

    getStartExplanations(): Translations { return this.getFinishExplanations(); }

    getFinishExplanations(): Translations {
        return {
            "😀": TRANSLATE,
            eng: "Let's define this conversion!"
        }
    }


}