import type Node from "./Node";
import Bind from "../nodes/Bind";
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
import type Value from "../runtime/Value";

export default class Function extends Expression {

    readonly docs: Docs[];
    readonly fun: Token;
    readonly typeVars: (TypeVariable|Unparsable)[];
    readonly open: Token;
    readonly inputs: (Bind|Unparsable)[];
    readonly close: Token;
    readonly dot?: Token;
    readonly output?: Type | Unparsable;
    readonly expression: Expression | Unparsable | Token;

    constructor(docs: Docs[], fun: Token, open: Token, inputs: (Bind|Unparsable)[], close: Token, expression: Expression | Unparsable | Token, typeVars: (TypeVariable|Unparsable)[], dot?: Token, output?: Type | Unparsable) {
        super();

        this.docs = docs;
        this.fun = fun;
        this.typeVars = typeVars;
        this.open = open;
        this.inputs = inputs;
        this.close = close;
        this.dot = dot;
        this.output = output;
        this.expression = expression;
    }

    isBindingEnclosureOfChild(child: Node): boolean { return child === this.expression; }

    getChildren() {
        let children: Node[] = [];
        children = children.concat(this.docs);
        children.push(this.fun);
        if(this.typeVars) children = children.concat(this.typeVars);
        children.push(this.open);
        children = children.concat(this.inputs);
        children.push(this.close);
        if(this.dot) children.push(this.dot);
        if(this.output) children.push(this.output);
        children.push(this.expression);
        return children;
    }

    getConflicts(program: Program): Conflict[] { 

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
    getDefinition(program: Program, node: Node, name: string): Bind | TypeVariable | Expression | undefined {

        // Does an input delare the name?
        const input = this.inputs.find(i => i instanceof Bind && i.names.find(n => n.name.text === name)) as Bind | undefined;
        if(input !== undefined) return input;

        // Is it a type variable?
        const typeVar = this.typeVars.find(t => t instanceof TypeVariable && t.name.text === name) as TypeVariable | undefined;
        if(typeVar !== undefined) return typeVar;

        // If not, does the function nearest function or block declare the name?
        return program.getBindingEnclosureOf(this)?.getDefinition(program, node, name);

    }

    getType(program: Program): Type {
        // The type is equivalent to the signature.
        const inputTypes = this.inputs.map(i => i instanceof Bind ? i.getType(program) : new UnknownType(program));
        const outputType = 
            this.output instanceof Type ? this.output : 
            this.expression instanceof Token || this.expression instanceof Unparsable ? new UnknownType(this) : 
            this.expression.getType(program);
        return new FunctionType(inputTypes, outputType);
    }

    evaluate(evaluator: Evaluator): Value | Node {
        return new Exception(ExceptionType.NOT_IMPLEMENTED);
    }

}