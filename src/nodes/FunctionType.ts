import type Node from "./Node";
import type Conflict from "../conflicts/Conflict";
import type Token from "./Token";
import Type from "./Type";
import Unparsable from "./Unparsable";
import type { ConflictContext } from "./Node";
import type Alias from "./Alias";
import type Expression from "./Expression";

export type Input = {
    aliases: Alias[],
    type: Type | Unparsable,
    required: boolean,
    rest: boolean,
    default: Unparsable | Expression | undefined
}

export default class FunctionType extends Type {

    readonly fun?: Token;
    readonly open?: Token;
    readonly inputs: Input[];
    readonly close?: Token;
    readonly output: Type | Unparsable;
    
    constructor(inputs: Input[], output: Type | Unparsable, fun?: Token, open?: Token, close?: Token) {
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
        children = children.concat(this.inputs.map(i => i.type));
        if(this.close) children.push(this.close);
        children.push(this.output);
        return children;
    }

    getConflicts(context: ConflictContext): Conflict[] { return []; }

    isCompatible(context: ConflictContext, type: Type): boolean {
        if(!(type instanceof FunctionType)) return false;
        if(!(this.output instanceof Type)) return false;
        if(!(type.output instanceof Type)) return false;
        if(!this.output.isCompatible(context, type.output)) return false;
        if(this.inputs.length != type.inputs.length) return false;
        for(let i = 0; i < this.inputs.length; i++) {
            const thisType = this.inputs[i];
            const thatType = type.inputs[i];
            if( thisType.type instanceof Unparsable || 
                thatType.type instanceof Unparsable || 
                !thisType.type.isCompatible(context, thatType.type))
                return false;
        }
        return true;
    }

    getNativeTypeName(): string { return "function"; }
    
}