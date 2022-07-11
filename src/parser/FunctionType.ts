import type Node from "./Node";
import type Conflict from "./Conflict";
import type Program from "./Program";
import type { Token } from "./Token";
import Type from "./Type";
import Unparsable from "./Unparsable";

export default class FunctionType extends Type {

    readonly fun?: Token;
    readonly open?: Token;
    readonly inputs: (Type|Unparsable)[];
    readonly close?: Token;
    readonly output: Type | Unparsable;
    
    constructor(inputs: (Type|Unparsable)[], output: Type | Unparsable, fun?: Token, open?: Token, close?: Token) {
        super();

        this.fun = fun;
        this.open = open;
        this.inputs = inputs;
        this.close = close;
        this.output = output;
    }

    getChildren() {
        let children: Node[] = [];
        if(this.fun) children.push(this.fun);
        if(this.open) children.push(this.open);
        children = children.concat(this.inputs);
        if(this.close) children.push(this.close);
        children.push(this.output);
        return children;
    }

    getConflicts(program: Program): Conflict[] { return []; }

    isCompatible(type: Type): boolean {
        if(!(type instanceof FunctionType)) return false;
        if(!(this.output instanceof Type)) return false;
        if(!(type.output instanceof Type)) return false;
        if(!this.output.isCompatible(type.output)) return false;
        if(this.inputs.length != type.inputs.length) return false;
        for(let i = 0; i < this.inputs.length; i++) {
            const thisType = this.inputs[i];
            const thatType = type.inputs[i];
            if( thisType instanceof Unparsable || 
                thatType instanceof Unparsable || 
                !thisType.isCompatible(thatType))
                return false;
        }
        return true;
    }

}