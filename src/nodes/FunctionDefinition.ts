import type Node from "./Node";
import Bind from "./Bind";
import Expression from "./Expression";
import Token from "./Token";
import TokenType from "./TokenType";
import Type from "./Type";
import TypeVariable from "./TypeVariable";
import Unparsable from "./Unparsable";
import type Conflict from "../conflicts/Conflict";
import FunctionType from "./FunctionType";
import UnknownType from "./UnknownType";
import { typeVarsAreUnique, getEvaluationInputConflicts } from "./util";
import type Evaluator from "../runtime/Evaluator";
import FunctionValue from "../runtime/FunctionValue";
import type Step from "../runtime/Step";
import Finish from "../runtime/Finish";
import type Context from "./Context";
import type Definition from "./Definition";
import Name from "./Name";
import { BinaryOpRegEx, FUNCTION_SYMBOL } from "../parser/Tokenizer";
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

export default class FunctionDefinition extends Expression {

    readonly docs: Docs;
    readonly fun: Token;
    readonly names: Names;
    readonly typeVars: (TypeVariable|Unparsable)[];
    readonly open: Token;
    readonly inputs: (Bind|Unparsable)[];
    readonly close: Token;
    readonly dot?: Token;
    readonly type?: Type | Unparsable;
    readonly expression: Expression | Unparsable | Token;

    constructor(
        docs: Docs | Translations | undefined, 
        names: Names | Translations | undefined, 
        typeVars: (TypeVariable|Unparsable)[], 
        inputs: (Bind|Unparsable)[], 
        expression: Expression | Token | Unparsable, 
        type?: Type | Unparsable, 
        fun?: Token, dot?: Token, open?: Token, close?: Token) {
        super();

        this.docs = docs instanceof Docs ? docs : new Docs(docs);
        this.names = names instanceof Names ? names : new Names(names);
        this.fun = fun ?? new Token(FUNCTION_SYMBOL, TokenType.FUNCTION);
        this.typeVars = typeVars;
        this.open = open ?? new EvalOpenToken();
        this.inputs = inputs;
        this.close = close ?? new EvalCloseToken();
        this.dot = dot;
        this.type = type;
        this.expression = expression;
    }

    clone(pretty: boolean=false, original?: Node | string, replacement?: Node) { 
        return new FunctionDefinition(
            this.cloneOrReplaceChild(pretty, [ Docs ], "docs", this.docs, original, replacement), 
            this.cloneOrReplaceChild<Names>(pretty, [ Names ], "names", this.names, original, replacement),
            this.cloneOrReplaceChild(pretty, [ TypeVariable, Unparsable ], "typeVars", this.typeVars, original, replacement), 
            this.cloneOrReplaceChild(pretty, [ Bind, Unparsable ], "inputs", this.inputs, original, replacement), 
            this.cloneOrReplaceChild<Expression|Unparsable|Token>(pretty, [ Expression, Unparsable, Token ], "expression", this.expression, original, replacement).withPrecedingSpaceIfDesired(pretty), 
            this.cloneOrReplaceChild(pretty, [ Unparsable, Type, undefined ], "type", this.type, original, replacement), 
            this.cloneOrReplaceChild(pretty, [ Token ], "fun", this.fun, original, replacement), 
            this.cloneOrReplaceChild(pretty, [ Token, undefined ], "dot", this.dot, original, replacement), 
            this.cloneOrReplaceChild(pretty, [ Token ], "open", this.open, original, replacement), 
            this.cloneOrReplaceChild(pretty, [ Token ], "close", this.close, original, replacement)
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
    matches(fun: FunctionDefinition, context: Context) {

        if(!this.sharesName(fun)) return false;
        for(let i = 0; i < this.inputs.length; i++) {
            if(i >= fun.inputs.length) return false;
            if(!this.inputs[i].getTypeUnlessCycle(context).accepts(fun.inputs[i].getTypeUnlessCycle(context), context)) return false;
        }
        return this.getTypeUnlessCycle(context).accepts(fun.getTypeUnlessCycle(context), context);

    }

    isBindingEnclosureOfChild(child: Node): boolean { return child === this.expression || child === this.type || this.inputs.includes(child as Bind | Unparsable); }

    computeChildren() {
        let children: Node[] = [];
        children = children.concat(this.docs);
        children.push(this.fun);
        children = children.concat(this.names);
        if(this.typeVars) children = children.concat(this.typeVars);
        children.push(this.open);
        children = children.concat(this.inputs);
        children.push(this.close);
        if(this.dot) children.push(this.dot);
        if(this.type) children.push(this.type);
        children.push(this.expression);
        return children;
    }

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

    computeType(context: Context): Type {
        // The type is equivalent to the signature.
        const outputType = 
            this.type instanceof Type ? this.type : 
            !(this.expression instanceof Expression) ? new UnknownType(this) : 
            this.expression.getTypeUnlessCycle(context);
        return new FunctionType(this.inputs, outputType);
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

        if(child === this.type)
            return getPossibleTypeReplacements(child, context);
        // Expression must be of output type, or any type if there isn't one.
        else if(child === this.expression && this.expression instanceof Expression)
            return getExpressionReplacements(context.source, this, this.expression, context, this.type === undefined || this.type instanceof Unparsable ? new AnyType() : this.type);

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
        else if(child === this.type && this.dot) return new Remove(context.source, this, this.dot, this.type);
        else if(child === this.expression) return new Replace(context.source, child, new ExpressionPlaceholder());    
    }

}