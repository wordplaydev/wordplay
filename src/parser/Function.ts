import type Node from "./Node";
import Bind from "./Bind";
import Expression from "./Expression";
import { Token, TokenType } from "./Token";
import Type from "./Type";
import type TypeVariable from "./TypeVariable";
import Unparsable from "./Unparsable";
import type Docs from "./Docs";
import type Program from "./Program";
import Conflict from "./Conflict";
import Block from "./Block";
import CustomType from "./CustomType";
import { SemanticConflict } from "./SemanticConflict";
import FunctionType from "./FunctionType";
import UnknownType from "./UnknownType";

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
        if(!program.docsAreUnique(this.docs))
            conflicts.push(new Conflict(this, SemanticConflict.DOC_LANGUAGES_ARENT_UNIQUE))
    
        // Inputs must have unique names
        if(!program.inputsAreUnique(this.inputs))
            conflicts.push(new Conflict(this, SemanticConflict.FUNCTION_INPUT_NAMES_MUST_BE_UNIQUE))

        // Type variables must have unique names.
        if(!program.typeVarsAreUnique(this.typeVars))
            conflicts.push(new Conflict(this, SemanticConflict.TYPE_VARS_ARENT_UNIQUE))

        return conflicts; 
    
    }

    /** Given a program that contains this and a name, returns the bind that declares it, if there is one. */
    getDefinition(program: Program, node: Node, name: string): Bind | undefined {

        // Does an input delare the name?
        const input = this.inputs.find(i => i instanceof Bind && i.names.find(n => n.name.text === name)) as Bind | undefined;
        if(input !== undefined) return input;

        // If not, does the function nearest function or block declare the name?
        return program.getBindingEnclosureOf(this)?.getDefinition(program, node, name);

    }

    getType(program: Program): Type {
        // The type is equivalent to the signature.
        const inputTypes = this.inputs.map(i => i instanceof Bind ? i.getType(program) : new UnknownType(program));
        if(inputTypes.find(t => t instanceof UnknownType)) return new UnknownType(this);
        const outputType = 
            this.output instanceof Type ? this.output : 
            this.expression instanceof Token || this.expression instanceof Unparsable ? new UnknownType(this) : 
            this.expression.getType(program);
        if(outputType instanceof UnknownType) return new UnknownType(this);
        return new FunctionType(inputTypes, outputType);
    }

}