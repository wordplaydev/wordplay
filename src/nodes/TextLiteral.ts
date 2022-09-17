import Expression from "./Expression";
import TextType from "./TextType";
import Token from "./Token";
import type Type from "./Type";
import type Node from "./Node";
import type Value from "../runtime/Value";
import Text from "../runtime/Text";
import type Step from "../runtime/Step";
import Finish from "../runtime/Finish";
import Language from "./Language";

export default class TextLiteral extends Expression {
    
    readonly text: Token;
    readonly format?: Language;

    constructor(text: Token, format?: Language) {
        super();
        this.text = text;
        this.format = format;
    }

    computeChildren() { return this.format !== undefined ? [ this.text, this.format ] : [ this.text ]; }
    computeConflicts() {}

    computeType(): Type {
        return new TextType(undefined, this.format);
    }

    compile(): Step[] {
        return [ new Finish(this) ];
    }
    
    evaluate(): Value {
        // Remove the opening and optional closing quote symbols.
        const lastChar = this.text.text.toString().length === 0 ? undefined : this.text.text.toString().charAt(this.text.text.toString().length - 1);
        const lastCharIsQuote = lastChar === undefined ? false : ["』", "」", "»", "›", "'", "’", "”", '"'].includes(lastChar);    
        return new Text(this.text.text.toString().substring(1, this.text.text.toString().length - (lastCharIsQuote ? 1 : 0)), this.format === undefined ? undefined : this.format.getLanguage());
    }

    clone(original?: Node, replacement?: Node) { 
        return new TextLiteral(
            this.text.cloneOrReplace([ Token ], original, replacement), 
            this.format?.cloneOrReplace([ Language, undefined ], original, replacement)
        ) as this; 
    }

}