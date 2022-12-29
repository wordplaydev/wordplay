import Node from "./Node";
import Token from "./Token";
import TokenType from "./TokenType";
import { TYPE_CLOSE_SYMBOL, TYPE_OPEN_SYMBOL } from "../parser/Tokenizer";
import type Translations from "./Translations";
import { TRANSLATE } from "./Translations"
import Names from "./Names";
import TypeVariable from "./TypeVariable";
import type Conflict from "../conflicts/Conflict";
import { typeVarsAreUnique } from "./util";

export default class TypeVariables extends Node {

    readonly open: Token;
    readonly variables: TypeVariable[];
    readonly close: Token | undefined;

    constructor(open: Token, names: TypeVariable[], close: Token | undefined) {
        super();

        this.open = open;
        this.variables = names;
        this.close = close;

        this.computeChildren();

    }

    static make(names: Translations[]) {
        return new TypeVariables(
            new Token(TYPE_OPEN_SYMBOL, TokenType.TYPE_OPEN),
            names.map(name => new TypeVariable(Names.make(name))),
            new Token(TYPE_CLOSE_SYMBOL, TokenType.TYPE_CLOSE)
        );
    }

    getGrammar() { 
        return [
            { name: "open", types:[ Token ] },
            { name: "variables", types:[ Names ] },
            { name: "close", types:[ Token ] },
        ];
    }

    clone(original?: Node, replacement?: Node) { 
        return new TypeVariables(
            this.replaceChild("open", this.open, original, replacement),
            this.replaceChild("variables", this.variables, original, replacement), 
            this.replaceChild("close", this.open, original, replacement)
        ) as this; 
    }

    computeConflicts() {

        const conflicts: Conflict[] = [];

        // Type variables must have unique names.
        const duplicateTypeVars = this.variables ? typeVarsAreUnique(this.variables) : undefined;
        if(duplicateTypeVars) conflicts.push(duplicateTypeVars);

        return conflicts;

    }
    
    getDescriptions(): Translations {
        return {
            "😀": TRANSLATE,
            eng: "variable types"
        }
    }

}