import type Node from "./Node";
import Token from "./Token";
import TokenType from "./TokenType";
import Type from "./Type";
import Unparsable from "./Unparsable";
import type Context from "./Context";
import { FUNCTION_NATIVE_TYPE_NAME } from "../native/NativeConstants";
import { FUNCTION_SYMBOL } from "../parser/Tokenizer";
import Bind from "./Bind";
import { getEvaluationInputConflicts } from "./util";
import EvalCloseToken from "./EvalCloseToken";
import EvalOpenToken from "./EvalOpenToken";
import type Transform from "../transforms/Transform";
import Remove from "../transforms/Remove";
import type Translations from "./Translations";
import { TRANSLATE } from "./Translations"
import FunctionDefinitionType from "./FunctionDefinitionType";

export default class FunctionType extends Type {

    readonly fun: Token;
    readonly open: Token;
    readonly inputs: (Bind|Unparsable)[];
    readonly close: Token;
    readonly output: Type | Unparsable;

    constructor(inputs: (Bind|Unparsable)[], output: Type | Unparsable, fun?: Token, open?: Token, close?: Token) {
        super();

        this.fun = fun ?? new Token(FUNCTION_SYMBOL, TokenType.FUNCTION);
        this.open = open ?? new EvalOpenToken();
        this.inputs = inputs;
        this.close = close ?? new EvalCloseToken();;
        this.output = output;

        this.computeChildren();

    }
    
    getGrammar() { 
        return [
            { name: "fun", types:[ Token ] },
            { name: "open", types:[ Token ] },
            { name: "inputs", types:[[ Bind, Unparsable ]] },
            { name: "close", types:[ Token] },
            { name: "output", types:[ Type, Unparsable ] },
        ]; 
    }

    clone(pretty: boolean=false, original?: Node, replacement?: Node) { 
        return new FunctionType(
            this.cloneOrReplaceChild(pretty, "inputs", this.inputs, original, replacement),
            this.cloneOrReplaceChild(pretty, "output", this.output, original, replacement),
            this.cloneOrReplaceChild(pretty, "fun", this.fun, original, replacement),
            this.cloneOrReplaceChild(pretty, "open", this.open, original, replacement),
            this.cloneOrReplaceChild(pretty, "close", this.close, original, replacement)
        ) as this;
    }

    accepts(type: Type, context: Context): boolean {
        if(!(type instanceof FunctionType || type instanceof FunctionDefinitionType)) return false;
        let inputsToCheck: (Bind|Unparsable)[] = type instanceof FunctionDefinitionType ? type.fun.inputs : type.inputs;
        let outputToCheck = type instanceof FunctionDefinitionType ? type.fun.getOutputType(context) : type.output;

        if(!(this.output instanceof Type)) return false;
        if(!(outputToCheck instanceof Type)) return false;
        if(!this.output.accepts(outputToCheck, context)) return false;
        if(this.inputs.length != inputsToCheck.length) return false;
        for(let i = 0; i < this.inputs.length; i++) {
            const thisBind = this.inputs[i];
            const thatBind = inputsToCheck[i];
            if(thisBind instanceof Unparsable) return false;
            if(thatBind instanceof Unparsable) return false;
            if(thisBind.type instanceof Type && thatBind.type instanceof Type && !thisBind.type.accepts(thatBind.type, context)) return false;
            if(thisBind.isVariableLength() !== thatBind.isVariableLength()) return false;
            if(thisBind.hasDefault() !== thatBind.hasDefault()) return false;
        }
        return true;
    }

    getNativeTypeName(): string { return FUNCTION_NATIVE_TYPE_NAME; }
    
    computeConflicts() {

        // Make sure the inputs are valid.
        return getEvaluationInputConflicts(this.inputs);
        
    }

    getDescriptions(): Translations {
        return {
            "😀": TRANSLATE,
            eng: "A function type."
        }
    }

    getChildReplacement() { return undefined; }
    getInsertionBefore() { return undefined; }
    getInsertionAfter() { return undefined; }

    getChildRemoval(child: Node, context: Context): Transform | undefined {
        if(this.inputs.includes(child as Bind | Unparsable))
            return new Remove(context.source, this, child);
        else if(child === this.output) return new Remove(context.source, this, this.output);
    }
    
}