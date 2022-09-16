import type Node from "./Node";
import Token from "./Token";
import TokenType from "./TokenType";
import Type from "./Type";
import Unparsable from "./Unparsable";
import type { ConflictContext } from "./Node";
import Alias from "./Alias";
import Expression from "./Expression";
import AnyType from "./AnyType";
import { FUNCTION_NATIVE_TYPE_NAME } from "../native/NativeConstants";

export type Input = {
    aliases: Alias[],
    type: Type | Unparsable,
    required: boolean,
    rest: boolean | Token,
    default: Unparsable | Expression | undefined
}

export default class FunctionType extends Type {

    readonly fun: Token;
    readonly open: Token;
    readonly inputs: Input[];
    readonly close: Token;
    readonly output: Type | Unparsable;
    
    constructor(inputs: Input[], output: Type | Unparsable, fun?: Token, open?: Token, close?: Token) {
        super();

        this.fun = fun ?? new Token("ƒ", [ TokenType.FUNCTION ]);
        this.open = open ?? new Token("(", [ TokenType.EVAL_OPEN ]);
        this.inputs = inputs;
        this.close = close ?? new Token(")", [ TokenType.EVAL_CLOSE ]);;
        this.output = output;
    }

    computeChildren() {
        let children: Node[] = [ this.fun, this.open ];
        this.inputs.forEach(i => {
            if(i.rest instanceof Token) children.push(i.rest);
            children.push(i.type);
        })
        children.push(this.close);
        children.push(this.output);
        return children;
    }

    isCompatible(context: ConflictContext, type: Type): boolean {
        if(type instanceof AnyType) return true;
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

    getNativeTypeName(): string { return FUNCTION_NATIVE_TYPE_NAME; }
    
    clone(original?: Node, replacement?: Node) { 
        return new FunctionType(
            this.inputs.map(i => { 
                return {
                    aliases: i.aliases.map(a => a.cloneOrReplace([ Alias ], original, replacement)),
                    type: i.type.cloneOrReplace([ Type, Unparsable ], original, replacement),
                    required: i.required,
                    rest: typeof i.rest === "boolean" ? i.rest : i.rest.cloneOrReplace([ Token ], original, replacement),
                    default: i.default?.cloneOrReplace([ Unparsable, Expression ], original, replacement)
                }
            }), 
            this.output.cloneOrReplace([ Type, Unparsable ], original, replacement)
        ) as this; 
    }

}