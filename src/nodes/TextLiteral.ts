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
import type Bind from "./Bind";
import type Context from "./Context";
import type { TypeSet } from "./UnionType";
import TokenType from "./TokenType";
import { getPossibleLanguages } from "../transforms/getPossibleLanguages";
import Add from "../transforms/Add";
import Replace from "../transforms/Replace";

export default class TextLiteral extends Expression {
    
    readonly text: Token;
    readonly format?: Language;

    constructor(text?: Token, format?: Language) {
        super();
        this.text = text ?? new Token('""', [ TokenType.TEXT ]);
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

    getStartExplanations() { return this.getFinishExplanations(); }

    getFinishExplanations() {
        return {
            "eng": "Evaluate to this text!"
        }
    }

    clone(original?: Node | string, replacement?: Node) { 
        return new TextLiteral(
            this.cloneOrReplaceChild([ Token ], "text", this.text, original, replacement), 
            this.cloneOrReplaceChild([ Language, undefined ], "format", this.format, original, replacement)
        ) as this; 
    }

    evaluateTypeSet(bind: Bind, original: TypeSet, current: TypeSet, context: Context) { bind; original; context; return current; }

    getDescriptions() {
        return {
            eng: "Text"
        }
    }

    getReplacementChild(child: Node, context: Context) {
    
        const project = context.source.getProject();
        // Formats can be any Language tags that are used in the project.
        if(project !== undefined && child === this.format)
            return getPossibleLanguages(project).map(lang => new Replace(context.source, child, new Language(lang)));

    }
    
    getInsertionBefore() { return undefined; }
    
    getInsertionAfter(context: Context, position: number): Add<Language>[] | undefined { 
        
        const project = context.source.getProject();
        // Formats can be any Language tags that are used in the project.
        if(project !== undefined && this.format === undefined)
            return getPossibleLanguages(project).map(lang => new Add(context.source, position, this, "format", new Language(lang)));

    }

}