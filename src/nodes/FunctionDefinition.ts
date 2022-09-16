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
import { DuplicateLanguages } from "../conflicts/DuplicateLanguages";
import { VariableLengthArgumentMustBeLast } from "../conflicts/VariableLengthArgumentMustBeLast";
import { RequiredAfterOptional } from "../conflicts/RequiredAfterOptional";
import { DuplicateTypeVariables } from "../conflicts/DuplicateTypeVariables";
import { DuplicateInputNames } from "../conflicts/DuplicateInputNames";
import FunctionType from "./FunctionType";
import UnknownType from "./UnknownType";
import { getDuplicateDocs, getDuplicateAliases, requiredBindAfterOptional, typeVarsAreUnique } from "./util";
import type Evaluator from "../runtime/Evaluator";
import Exception, { ExceptionKind } from "../runtime/Exception";
import FunctionValue from "../runtime/FunctionValue";
import type Step from "../runtime/Step";
import Finish from "../runtime/Finish";
import type { ConflictContext } from "./Node";
import type Definition from "./Definition";
import Alias from "./Alias";
import { EVAL_CLOSE_SYMBOL, EVAL_OPEN_SYMBOL, FUNCTION_SYMBOL } from "../parser/Tokenizer";

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

    computeConflicts(context: ConflictContext): Conflict[] { 

        const conflicts: Conflict[] = [];
    
        // Docs must be unique.
        const duplicateDocs = getDuplicateDocs(this.docs);
        if(duplicateDocs.size > 0)
            conflicts.push(new DuplicateLanguages(this.docs, duplicateDocs));
    
        // Inputs must have unique names
        const duplicateInputs = getDuplicateAliases(this.inputs.map(i => i instanceof Bind ? i.names : []).flat());
        if(duplicateInputs.size > 0)
            conflicts.push(new DuplicateInputNames(this, duplicateInputs));

        // Type variables must have unique names.
        const duplicateTypeVars = typeVarsAreUnique(this.typeVars);
        if(duplicateTypeVars.size > 0)
            conflicts.push(new DuplicateTypeVariables(this, duplicateTypeVars));

        // Required inputs can never follow an optional one.
        const binds = this.inputs.filter(i => i instanceof Bind) as Bind[];
        const requiredAfterOptional = requiredBindAfterOptional(binds);
        if(this.inputs.length === binds.length && requiredAfterOptional !== undefined)
            conflicts.push(new RequiredAfterOptional(this, requiredAfterOptional));

        // Rest arguments must be list
        const rest = this.inputs.find(i => i instanceof Bind && i.isVariableLength()) as Bind | undefined;
        if(rest !== undefined && this.inputs.indexOf(rest) !== this.inputs.length - 1)
            conflicts.push(new VariableLengthArgumentMustBeLast(this, rest));

        return conflicts; 
    
    }

    /** Given a program that contains this and a name, returns the bind that declares it, if there is one. */
    getDefinition(context: ConflictContext, node: Node, name: string): Definition {

        // Does an input delare the name?
        const input = this.inputs.find(i => i instanceof Bind && i.hasName(name)) as Bind | undefined;
        if(input !== undefined) return input;

        // Is it a type variable?
        const typeVar = this.typeVars.find(t => t instanceof TypeVariable && t.name.text.toString() === name) as TypeVariable | undefined;
        if(typeVar !== undefined) return typeVar;

        // If not, does the function nearest function or block declare the name?
        return this.getBindingEnclosureOf()?.getDefinition(context, node, name);

    }

    computeType(context: ConflictContext): Type {
        // The type is equivalent to the signature.
        const inputTypes = this.inputs.map(i =>
             i instanceof Bind ?
                {
                    aliases: i.names,
                    type: i.getTypeUnlessCycle(context),
                    required: !(i.hasDefault() || i.isVariableLength()),
                    rest: i.isVariableLength(),
                    default: i.value
                }
                :
                {
                    aliases: [],
                    type: new UnknownType(context.program),
                    required: true,
                    rest: false,
                    default: undefined
                }            
        );
        const outputType = 
            this.type instanceof Type ? this.type : 
            this.expression instanceof Token || this.expression instanceof Unparsable ? new UnknownType(this) : 
            this.expression.getTypeUnlessCycle(context);
        return new FunctionType(inputTypes, outputType);
    }

    hasName(name: string) {
        return !(this.aliases instanceof Token) && this.aliases.find(a => a.getName() === name) !== undefined;
    }

    compile(context: ConflictContext):Step[] {
        return [ new Finish(this) ];
    }

    evaluate(evaluator: Evaluator) {

        // Get the function value.
        const context = evaluator.getEvaluationContext();
        const value = context === undefined ? 
            new Exception(this, ExceptionKind.EXPECTED_CONTEXT) : 
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

}