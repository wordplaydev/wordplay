import type Node from "./Node";
import Bind from "./Bind";
import Expression from "./Expression";
import Token from "./Token";
import TokenType from "./TokenType";
import Type from "./Type";
import TypeVariable from "./TypeVariable";
import Unparsable from "./Unparsable";
import type Conflict from "../conflicts/Conflict";
import { typeVarsAreUnique, getEvaluationInputConflicts } from "./util";
import type Evaluator from "../runtime/Evaluator";
import FunctionValue from "../runtime/FunctionValue";
import type Step from "../runtime/Step";
import Finish from "../runtime/Finish";
import type Context from "./Context";
import type Definition from "./Definition";
import Name from "./Name";
import { BinaryOpRegEx, FUNCTION_SYMBOL, TYPE_SYMBOL } from "../parser/Tokenizer";
import type { TypeSet } from "./UnionType";
import ContextException, { StackSize } from "../runtime/ContextException";
import type Translations from "./Translations";
import { overrideWithDocs, TRANSLATE } from "./Translations"
import { getPossibleTypeReplacements } from "../transforms/getPossibleTypes";
import { getExpressionReplacements } from "../transforms/getPossibleExpressions";
import AnyType from "./AnyType";
import ExpressionPlaceholder from "./ExpressionPlaceholder";
import type Transform from "../transforms/Transform"
import Append from "../transforms/Append";
import EvalCloseToken from "./EvalCloseToken";
import EvalOpenToken from "./EvalOpenToken";
import Remove from "../transforms/Remove";
import Replace from "../transforms/Replace";
import StructureDefinition from "./StructureDefinition";
import Docs from "./Docs";
import Names from "./Names";
import type LanguageCode from "./LanguageCode";
import FunctionDefinitionType from "./FunctionDefinitionType";
import UnknownType from "./UnknownType";

export default class FunctionDefinition extends Expression {

    readonly docs: Docs;
    readonly fun: Token;
    readonly names: Names;
    readonly typeVars: (TypeVariable|Unparsable)[];
    readonly open: Token;
    readonly inputs: (Bind|Unparsable)[];
    readonly close: Token;
    readonly dot?: Token;
    readonly output?: Type | Unparsable;
    readonly expression: Expression | Unparsable | Token;

    constructor(
        docs: Docs | Translations | undefined, 
        names: Names | Translations | undefined, 
        typeVars: (TypeVariable|Unparsable)[], 
        inputs: (Bind|Unparsable)[], 
        expression: Expression | Token | Unparsable, 
        output?: Type | Unparsable, 
        fun?: Token, dot?: Token, open?: Token, close?: Token) {
        super();

        this.docs = docs instanceof Docs ? docs : new Docs(docs);
        this.names = names instanceof Names ? names : new Names(names);
        this.fun = fun ?? new Token(FUNCTION_SYMBOL, TokenType.FUNCTION);
        this.typeVars = typeVars;
        this.open = open ?? new EvalOpenToken();
        this.inputs = inputs;
        this.close = close ?? new EvalCloseToken();
        this.dot = dot ?? (output !== undefined ? new Token(TYPE_SYMBOL, TokenType.TYPE) : undefined);
        this.output = output;
        this.expression = expression;

        this.computeChildren();

    }

    getGrammar() { 
        return [
            { name: "docs", types:[ Docs ] },
            { name: "fun", types:[ Token ] },
            { name: "names", types:[ Names ] },
            { name: "typeVars", types:[[ TypeVariable, Unparsable ]] },
            { name: "open", types:[ Token ] },
            { name: "inputs", types:[[ Bind, Unparsable ]] },
            { name: "close", types:[ Token] },
            { name: "dot", types:[ Token, undefined ] },
            { name: "output", types:[ Type, Unparsable, undefined ] },
            { name: "expression", types:[ Expression, Unparsable, Token ] },
        ];
    }

    clone(pretty: boolean=false, original?: Node, replacement?: Node) { 
        return new FunctionDefinition(
            this.cloneOrReplaceChild(pretty, "docs", this.docs, original, replacement), 
            this.cloneOrReplaceChild<Names>(pretty, "names", this.names, original, replacement),
            this.cloneOrReplaceChild(pretty, "typeVars", this.typeVars, original, replacement), 
            this.cloneOrReplaceChild(pretty, "inputs", this.inputs, original, replacement), 
            this.cloneOrReplaceChild<Expression|Unparsable|Token>(pretty, "expression", this.expression, original, replacement).withPrecedingSpaceIfDesired(pretty), 
            this.cloneOrReplaceChild(pretty, "type", this.output, original, replacement), 
            this.cloneOrReplaceChild(pretty, "fun", this.fun, original, replacement), 
            this.cloneOrReplaceChild(pretty, "dot", this.dot, original, replacement), 
            this.cloneOrReplaceChild(pretty, "open", this.open, original, replacement), 
            this.cloneOrReplaceChild(pretty, "close", this.close, original, replacement)
        ) as this; 
    }

    sharesName(fun: FunctionDefinition) { return this.names.sharesName(fun.names); }

    hasName(name: string) { return this.names.hasName(name); }
    getNames() { return this.names.getNames(); }
    getTranslation(lang: LanguageCode[]) { return this.names.getTranslation(lang); }

    isOperator() { return this.inputs.length === 1 && this.getOperatorName() !== undefined; }
    
    getOperatorName() { 
        return this.names.getNames().find(name => BinaryOpRegEx.test(name));
    }

    /**
     * Name, inputs, and outputs must match.
     */
    accepts(fun: FunctionDefinition, context: Context) {

        if(!this.sharesName(fun)) return false;
        for(let i = 0; i < this.inputs.length; i++) {
            if(i >= fun.inputs.length) return false;
            if(!this.inputs[i].getTypeUnlessCycle(context).accepts(fun.inputs[i].getTypeUnlessCycle(context), context)) return false;
        }
        return this.getOutputType(context).accepts(fun.getOutputType(context), context);

    }

    isBindingEnclosureOfChild(child: Node): boolean { return child === this.expression || child === this.output || this.inputs.includes(child as Bind | Unparsable); }

    computeConflicts(): Conflict[] { 

        let conflicts: Conflict[] = [];
        
        // Type variables must have unique names.
        const duplicateTypeVars = typeVarsAreUnique(this.typeVars);
        if(duplicateTypeVars) conflicts.push(duplicateTypeVars);

        // Make sure the inputs are valid.
        conflicts = conflicts.concat(getEvaluationInputConflicts(this.inputs));

        return conflicts; 
    
    }

    getDefinitions(node: Node): Definition[] {

        // Does an input delare the name that isn't the one asking?
        return [ 
            ... this.inputs.filter(i => i instanceof Bind && i !== node) as Bind[], 
            ... this.typeVars.filter(t => t instanceof TypeVariable) as TypeVariable[]
        ];
        
    }

    computeType(): Type {
        return new FunctionDefinitionType(this);
    }

    getOutputType(context: Context) {
        return this.output instanceof Type ? this.output : 
            !(this.expression instanceof Expression) ? new UnknownType(this.expression instanceof Unparsable ? this.expression : { placeholder: this.expression }) : 
            this.expression.getTypeUnlessCycle(context);
    }

    compile(): Step[] {
        return [ new Finish(this) ];
    }

    getStartExplanations(): Translations { return this.getFinishExplanations(); }

    getFinishExplanations(): Translations {
        return {
            "😀": TRANSLATE,
            eng: "Let's define this function and bind it to this name."
        }
    }

    evaluate(evaluator: Evaluator) {

        // Get the function value.
        const context = evaluator.getEvaluationContext();
        const value = context === undefined ? 
            new ContextException(evaluator, StackSize.EMPTY) : 
            new FunctionValue(this, context);

        // Bind the value and then return it.
        this.names.getNames().forEach(name => evaluator.bind(name, value));

        // Return the value.
        return value;

    }

    isAbstract() { return this.expression instanceof Token && this.expression.is(TokenType.ETC); }

    evaluateTypeSet(bind: Bind, original: TypeSet, current: TypeSet, context: Context) { 
        if(this.expression instanceof Expression) this.expression.evaluateTypeSet(bind, original, current, context);
        return current;
    }

    getStructure() {
        return this._parent instanceof StructureDefinition ? this._parent : undefined;
    }

    getDescriptions(): Translations {
        return overrideWithDocs(
            { 
                "😀": TRANSLATE,
                eng: "A function" 
            }, 
            this.docs
        );
    }

    getChildReplacement(child: Node, context: Context): Transform[] | undefined {

        if(child === this.output)
            return getPossibleTypeReplacements(child, context);
        // Expression must be of output type, or any type if there isn't one.
        else if(child === this.expression && this.expression instanceof Expression)
            return getExpressionReplacements(context.source, this, this.expression, context, this.output === undefined || this.output instanceof Unparsable ? new AnyType() : this.output);

    }

    getInsertionBefore(child: Node, context: Context, position: number): Transform[] | undefined {

        const newBind = new Bind(undefined, new Names([new Name()]));

        if(child === this.close)
            return [ new Append(context.source, position, this, this.inputs, this.close, newBind)]
        else if(this.inputs.includes(child as Bind))
            return [ new Append(context.source, position, this, this.inputs, child, newBind) ];

    }

    getInsertionAfter(): Transform[] | undefined { return []; }

    getChildRemoval(child: Node, context: Context): Transform | undefined {
        if( this.typeVars.includes(child as TypeVariable) || 
            this.inputs.includes(child as Bind | Unparsable))
            return new Remove(context.source, this, child);
        else if(child === this.output && this.dot) return new Remove(context.source, this, this.dot, this.output);
        else if(child === this.expression) return new Replace(context.source, child, new ExpressionPlaceholder());    
    }

}