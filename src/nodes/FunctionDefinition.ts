import type Node from "./Node";
import Bind from "./Bind";
import Expression from "./Expression";
import Token from "./Token";
import Type from "./Type";
import TypeVariable from "./TypeVariable";
import Unparsable from "./Unparsable";
import type Docs from "./Docs";
import type Program from "./Program";
import Conflict, { DuplicateLanguages, DuplicateInputNames, DuplicateTypeVariables, RequiredAfterOptional } from "../parser/Conflict";
import FunctionType from "./FunctionType";
import UnknownType from "./UnknownType";
import { docsAreUnique, inputsAreUnique, requiredBindAfterOptional, typeVarsAreUnique } from "./util";
import type Evaluator from "../runtime/Evaluator";
import Exception, { ExceptionType } from "../runtime/Exception";
import FunctionValue from "../runtime/FunctionValue";
import type Step from "../runtime/Step";
import Finish from "../runtime/Finish";
import type { ConflictContext, Definition } from "./Node";

export default class FunctionDefinition extends Expression {

    readonly docs: Docs[];
    readonly fun?: Token;
    readonly typeVars: (TypeVariable|Unparsable)[];
    readonly open?: Token;
    readonly inputs: (Bind|Unparsable)[];
    readonly close?: Token;
    readonly dot?: Token;
    readonly type?: Type | Unparsable;
    readonly expression: Expression | Unparsable | Token;

    constructor(
        docs: Docs[], 
        typeVars: (TypeVariable|Unparsable)[], 
        inputs: (Bind|Unparsable)[], 
        expression: Expression | Unparsable | Token, 
        output?: Type | Unparsable, 
        fun?: Token, dot?: Token, open?: Token, close?: Token) {
        super();

        this.docs = docs;
        this.fun = fun;
        this.typeVars = typeVars;
        this.open = open;
        this.inputs = inputs;
        this.close = close;
        this.dot = dot;
        this.type = output;
        this.expression = expression;
    }

    isBindingEnclosureOfChild(child: Node): boolean { return child === this.expression; }

    getChildren() {
        let children: Node[] = [];
        children = children.concat(this.docs);
        if(this.fun) children.push(this.fun);
        if(this.typeVars) children = children.concat(this.typeVars);
        if(this.open) children.push(this.open);
        children = children.concat(this.inputs);
        if(this.close) children.push(this.close);
        if(this.dot) children.push(this.dot);
        if(this.type) children.push(this.type);
        children.push(this.expression);
        return children;
    }

    getConflicts(context: ConflictContext): Conflict[] { 

        const conflicts: Conflict[] = [];
    
        // Docs must be unique.
        if(!docsAreUnique(this.docs))
            conflicts.push(new DuplicateLanguages(this.docs));
    
        // Inputs must have unique names
        if(!inputsAreUnique(this.inputs))
            conflicts.push(new DuplicateInputNames(this));

        // Type variables must have unique names.
        if(!typeVarsAreUnique(this.typeVars))
            conflicts.push(new DuplicateTypeVariables(this));

        // Required inputs can never follow an optional one.
        const binds = this.inputs.filter(i => i instanceof Bind) as Bind[];
        if(this.inputs.length === binds.length && requiredBindAfterOptional(binds) !== undefined)
            conflicts.push(new RequiredAfterOptional(this));

        return conflicts; 
    
    }

    /** Given a program that contains this and a name, returns the bind that declares it, if there is one. */
    getDefinition(context: ConflictContext, node: Node, name: string): Definition {

        // Does an input delare the name?
        const input = this.inputs.find(i => i instanceof Bind && i.names.find(n => n.name.text === name)) as Bind | undefined;
        if(input !== undefined) return input;

        // Is it a type variable?
        const typeVar = this.typeVars.find(t => t instanceof TypeVariable && t.name.text === name) as TypeVariable | undefined;
        if(typeVar !== undefined) return typeVar;

        // If not, does the function nearest function or block declare the name?
        return context.program.getBindingEnclosureOf(this)?.getDefinition(context, node, name);

    }

    getType(context: ConflictContext): Type {
        // The type is equivalent to the signature.
        const inputTypes = this.inputs.map(i => i instanceof Bind ? i.getType(context) : new UnknownType(context.program));
        const outputType = 
            this.type instanceof Type ? this.type : 
            this.expression instanceof Token || this.expression instanceof Unparsable ? new UnknownType(this) : 
            this.expression.getType(context);
        return new FunctionType(inputTypes, outputType);
    }

    compile(): Step[] {
        return [ new Finish(this) ];
    }

    evaluate(evaluator: Evaluator) {
        const context = evaluator.getEvaluationContext();
        return context === undefined ? 
            new Exception(ExceptionType.EXPECTED_CONTEXT) : 
            new FunctionValue(this, context);
    }

}