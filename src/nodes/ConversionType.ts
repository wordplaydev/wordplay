import { CONVERSION_NATIVE_TYPE_NAME } from "../native/NativeConstants";
import { CONVERT_SYMBOL } from "../parser/Tokenizer";
import type Context from "./Context";
import type Node from "./Node";
import Token from "./Token";
import TokenType from "./TokenType";
import type Transform from "../transforms/Transform";
import Type from "./Type";
import TypePlaceholder from "./TypePlaceholder";
import Replace from "../transforms/Replace";
import type Translations from "./Translations";
import { TRANSLATE } from "./Translations"

export default class ConversionType extends Type {

    readonly input: Type;
    readonly convert: Token;
    readonly output: Type;
    
    constructor(input: Type, convert: Token | undefined, output: Type) {
        super();
        
        this.input = input;
        this.convert = convert ?? new Token(CONVERT_SYMBOL, TokenType.CONVERT);
        this.output = output;

        this.computeChildren();

    }
    getGrammar() { 
        return [
            { name: "input", types:[ Type ] },
            { name: "convert", types:[ Token ] },
            { name: "output", types:[ Type ] },
        ]; 
    }

    computeConflicts() {}

    accepts(type: Type, context: Context): boolean {
        return type instanceof ConversionType && this.input.accepts(type.input, context) && this.output instanceof Type && type.output instanceof Type && this.output.accepts(type.output, context);
    }

    getNativeTypeName(): string { return CONVERSION_NATIVE_TYPE_NAME; }

    replace(pretty: boolean=false, original?: Node, replacement?: Node) { 
        return new ConversionType(
            this.replaceChild(pretty, "input", this.input, original, replacement), 
            this.replaceChild(pretty, "convert", this.convert, original, replacement),
            this.replaceChild(pretty, "output", this.output, original, replacement)
        ) as this; 
    }

    getDescriptions(): Translations {
        return {
            "😀": TRANSLATE,
            eng: "A conversion function type"
        }
    }

    getChildReplacement(): Transform[] | undefined { return undefined; }
    getInsertionBefore(): Transform[] | undefined { return undefined; }
    getInsertionAfter(): Transform[] | undefined { return undefined; }
    getChildRemoval(child: Node, context: Context): Transform | undefined {
        if(child === this.input || child === this.output) return new Replace(context.source, child, new TypePlaceholder());
    }

}