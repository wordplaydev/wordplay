import Node from "./Node";
import Block from "./Block";
import type Borrow from "./Borrow";
import type Unparsable from "./Unparsable";
import type Conflict from "./Conflict";
import Function from "./Function";
import CustomType from "./CustomType";
import type Docs from "./Docs";
import Bind from "./Bind";
import TypeVariable from "./TypeVariable";

export default class Program extends Node {
    
    readonly borrows: (Borrow | Unparsable)[];
    readonly block: Block | Unparsable;

    constructor(borrows: (Borrow|Unparsable)[], block: Block | Unparsable) {
        super();
        this.borrows = borrows.slice();
        this.block = block;
    }

    getChildren() { return [ ...this.borrows, this.block ]; }
    getConflicts(program: Program): Conflict[] { return []; }

    getBindingEnclosureOf(node: Node): Block | Function | CustomType | undefined {
        return this.getAncestorsOf(node)?.find(a => a instanceof Block || a instanceof Function || a instanceof CustomType) as Block | Function | CustomType | undefined;
    }

    docsAreUnique(docs: Docs[]): boolean {
        return docs.every(d1 => docs.find(d2 => d1 !== d2 && d1.lang?.text === d2.lang?.text) === undefined);
    }

    inputsAreUnique(inputs: (Bind | Unparsable)[]): boolean {
        // Inputs must have unique names
        const inputNames = inputs.reduce((previous: string[], current) => previous.concat(current instanceof Bind ? current.getNames() : []), []);
        return inputNames.every((d1, i1) => inputNames.find((d2, i2) => i1 !== i2 && d1 === d2) === undefined);
    }

    typeVarsAreUnique(vars: (TypeVariable|Unparsable)[]): boolean {
        const parsedVars = vars.filter(v => v instanceof TypeVariable) as TypeVariable[];
        return parsedVars.every(v1 => parsedVars.find(v2 => v1 !== v2 && v1.name.text === v2.name.text) === undefined);
    }

}