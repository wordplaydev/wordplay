import type Node from "./Node";
import Bind from "./Bind";
import Expression from "./Expression";
import type { Token } from "./Token";
import type Type from "./Type";
import type TypeVariable from "./TypeVariable";
import type Unparsable from "./Unparsable";
import type Docs from "./Docs";
import type Program from "./Program";
import type Conflict from "./Conflict";
import Block from "./Block";
import CustomType from "./CustomType";

export default class Function extends Expression {

    readonly docs: Docs[];
    readonly fun: Token;
    readonly typeVars: (TypeVariable|Unparsable)[];
    readonly open: Token;
    readonly inputs: (Bind|Unparsable)[];
    readonly close: Token;
    readonly dot?: Token;
    readonly output?: Type;
    readonly expression: Expression | Token;

    constructor(docs: Docs[], fun: Token, open: Token, inputs: (Bind|Unparsable)[], close: Token, expression: Expression | Token, typeVars: (TypeVariable|Unparsable)[], dot?: Token, output?: Type) {
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

    getConflicts(program: Program): Conflict[] { return []; }

    /** Given a program that contains this and a name, returns the bind that declares it, if there is one. */
    getDefinition(program: Program, name: string): Bind | undefined {

        // Does an input delare the name?
        const input = this.inputs.find(i => i instanceof Bind && i.names.find(n => n.name.text === name)) as Bind | undefined;
        if(input !== undefined) return input;

        // If not, does the function nearest function or block declare the name?
        const enclosure = program.getBindingEnclosureOf(this);
        if(enclosure instanceof Function) 
            return enclosure.getDefinition(program, name);
        else if(enclosure instanceof Block)
            return enclosure.getDefinition(program, enclosure.statements.length, name);
        else if(enclosure instanceof CustomType)
            return enclosure.getDefinition(program, name);

    }

}