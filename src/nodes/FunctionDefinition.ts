import type Node from "./Node";
import Bind from "./Bind";
import Expression from "./Expression";
import Token from "./Token";
import TokenType from "./TokenType";
import Type from "./Type";
import TypeVariable from "./TypeVariable";
import Unparsable from "./Unparsable";
import Documentation from "./Documentation";
import type Conflict from "../conflicts/Conflict";
import FunctionType from "./FunctionType";
import UnknownType from "./UnknownType";
import { getDuplicateDocs, getDuplicateAliases, typeVarsAreUnique, getEvaluationInputConflicts } from "./util";
import type Evaluator from "../runtime/Evaluator";
import FunctionValue from "../runtime/FunctionValue";
import type Step from "../runtime/Step";
import Finish from "../runtime/Finish";
import type Context from "./Context";
import type Definition from "./Definition";
import Alias from "./Alias";
import { EVAL_CLOSE_SYMBOL, EVAL_OPEN_SYMBOL, FUNCTION_SYMBOL } from "../parser/Tokenizer";
import type { TypeSet } from "./UnionType";
import ContextException, { StackSize } from "../runtime/ContextException";
import type Translations from "./Translations";

export default class FunctionDefinition extends Expression {

    readonly docs: Documentation[];
    readonly fun: Token;
    readonly aliases: Alias[];
    readonly typeVars: (TypeVariable|Unparsable)[];
    readonly open: Token;
    readonly inputs: (Bind|Unparsable)[];
    readonly close: Token;
    readonly dot?: Token;
    readonly type?: Type | Unparsable;
    readonly expression: Expression | Unparsable | Token;

    constructor(
        docs: Documentation[], 
        aliases: Alias[], 
        typeVars: (TypeVariable|Unparsable)[], 
        inputs: (Bind|Unparsable)[], 
        expression: Expression | Unparsable | Token, 
        type?: Type | Unparsable, 
        fun?: Token, dot?: Token, open?: Token, close?: Token) {
        super();

        this.docs = docs;
        this.fun = fun ?? new Token(FUNCTION_SYMBOL, [ TokenType.FUNCTION ]);
        this.aliases = aliases;
        this.typeVars = typeVars;
        this.open = open ?? new Token(EVAL_OPEN_SYMBOL, [ TokenType.EVAL_OPEN ]);
        this.inputs = inputs;
        this.close = close ?? new Token(EVAL_CLOSE_SYMBOL, [ TokenType.EVAL_CLOSE ]);
        this.dot = dot;
        this.type = type;
        this.expression = expression;
    }

    getNames() { return this.aliases.map(a => a.getName()); }

    sharesName(fun: FunctionDefinition) {
        const funNames = fun.getNames();
        return this.getNames().find(n => funNames.includes(n)) !== undefined;
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
        children = children.concat(this.aliases);
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
    
        // Docs must be unique.
        const duplicateDocs = getDuplicateDocs(this.docs);
        if(duplicateDocs) conflicts.push(duplicateDocs);
    
        // Function names must be unique
        const duplicateNames = getDuplicateAliases(this.aliases);
        if(duplicateNames) conflicts.push(duplicateNames);

        // Type variables must have unique names.
        const duplicateTypeVars = typeVarsAreUnique(this.typeVars);
        if(duplicateTypeVars) conflicts.push(duplicateTypeVars);

        // Make sure the inputs are valid.
        conflicts = conflicts.concat(getEvaluationInputConflicts(this.inputs));

        return conflicts; 
    
    }

    /** Given a program that contains this and a name, returns the bind that declares it, if there is one. */
    getDefinitionOfName(name: string, context: Context, node: Node): Definition {

        // Does an input delare the name that isn't the one asking?
        const input = this.inputs.find(i => i instanceof Bind && i.hasName(name) && i !== node) as Bind | undefined;
        if(input !== undefined) return input;

        // Is it a type variable?
        const typeVar = this.typeVars.find(t => t instanceof TypeVariable && t.name.text.toString() === name) as TypeVariable | undefined;
        if(typeVar !== undefined) return typeVar;

        // If not, does the function nearest function or block declare the name?
        return this.getBindingEnclosureOf()?.getDefinitionOfName(name, context, node);

    }

    getAllDefinitions(context: Context, node: Node): Definition[] {

        // Does an input delare the name that isn't the one asking?
        return [ 
            ... this.inputs.filter(i => i instanceof Bind && i !== node) as Bind[], 
            ... this.typeVars.filter(t => t instanceof TypeVariable) as TypeVariable[],
            ... this.getBindingEnclosureOf()?.getAllDefinitions(context, node) ?? []
        ];
        
    }

    computeType(context: Context): Type {
        // The type is equivalent to the signature.
        const outputType = 
            this.type instanceof Type ? this.type : 
            this.expression instanceof Token || this.expression instanceof Unparsable ? new UnknownType(this) : 
            this.expression.getTypeUnlessCycle(context);
        return new FunctionType(this.inputs, outputType);
    }

    hasName(name: string) {
        return !(this.aliases instanceof Token) && this.aliases.find(a => a.getName() === name) !== undefined;
    }

    compile(): Step[] {
        return [ new Finish(this) ];
    }

    getStartExplanations(): Translations { return this.getFinishExplanations(); }

    getFinishExplanations(): Translations {
        return {
            "eng": "Let's define this function and bind it to this name."
        }
    }

    evaluate(evaluator: Evaluator) {

        // Get the function value.
        const context = evaluator.getEvaluationContext();
        const value = context === undefined ? 
            new ContextException(evaluator, StackSize.EMPTY) : 
            new FunctionValue(this, context);

        // Bind the value and then return it.
        this.aliases.forEach(a => {
            const name = a.getName();
            if(name !== undefined)
                evaluator.bind(name, value);
        });

        // Return the value.
        return value;

    }

    isAbstract() { return this.expression instanceof Token && this.expression.is(TokenType.ETC); }

    clone(original?: Node, replacement?: Node) { 
        return new FunctionDefinition(
            this.docs.map(d => d.cloneOrReplace([ Documentation ], original, replacement)), 
            this.aliases.map(a => a.cloneOrReplace([ Alias ], original, replacement)), 
            this.typeVars.map(t => t.cloneOrReplace([ TypeVariable, Unparsable ], original, replacement)), 
            this.inputs.map(i => i.cloneOrReplace([ Bind, Unparsable ], original, replacement)), 
            this.expression.cloneOrReplace([ Expression, Unparsable, Token ], original, replacement), 
            this.type?.cloneOrReplace([ Unparsable, Type, undefined ], original, replacement), 
            this.fun.cloneOrReplace([ Token ], original, replacement), 
            this.open.cloneOrReplace([ Token ], original, replacement), 
            this.close.cloneOrReplace([ Token ], original, replacement)
             ) as this; 
    }

    evaluateTypeSet(bind: Bind, original: TypeSet, current: TypeSet, context: Context) { 
        if(this.expression instanceof Expression) this.expression.evaluateTypeSet(bind, original, current, context);
        return current;
    }

    getDescriptions() {
        return {
            eng: "A function definition."
        }
    }

}