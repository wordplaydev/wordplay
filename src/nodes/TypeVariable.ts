import Node from "./Node";
import Token from "./Token";
import TokenType from "./TokenType";
import { TYPE_VAR_SYMBOL } from "../parser/Tokenizer";

export default class TypeVariable extends Node {

    readonly type: Token;
    readonly name: Token;

    constructor(name: Token | string, type?: Token) {
        super();

        this.type = type ?? new Token(TYPE_VAR_SYMBOL, TokenType.TYPE_VAR);
        this.name = name instanceof Token ? name : new Token(name, TokenType.NAME);
    }

    clone(original?: Node | string, replacement?: Node) { 
        return new TypeVariable(
            this.cloneOrReplaceChild([ Token ], "name", this.name, original, replacement), 
            this.cloneOrReplaceChild([ Token ], "type", this.type, original, replacement)
        ) as this; 
    }

    getName() { return this.name.getText(); }
    getNames() { return [ this.name.getText() ]; }
    hasName(name: string) { return this.getName() === name; }
    getNameInLanguage() { return this.name.getText(); }

    computeConflicts() {}

    computeChildren() {
        return [ this.type, this.name ];
    }

    getDescriptions() {
        return {
            eng: "A variable type"
        }
    }

    getReplacementChild() { return undefined; }
    getInsertionBefore() { return undefined; }
    getInsertionAfter() { return undefined; }

}