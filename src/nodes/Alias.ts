import Node, { type ConflictContext } from "./Node";
import Token from "./Token";
import TokenType from "./TokenType";
import type Conflict from "../conflicts/Conflict";
import Language from "./Language";
import UnnamedAlias from "../conflicts/UnnamedAlias";

export default class Alias extends Node {
    
    readonly semicolon?: Token;
    readonly name?: Token;
    readonly lang?: Language;

    constructor(name: Token | string | undefined, lang?: Language | string, semicolon?: Token) {
        super();

        this.semicolon = semicolon;
        this.name = typeof name === "string" ? new Token(name, [ TokenType.NAME ]) : name;
        this.lang = typeof lang === "string" ? new Language(lang) : lang;
    }

    computeChildren() { 
        const children = [];
        if(this.semicolon instanceof Token) children.push(this.semicolon);
        if(this.name instanceof Token) children.push(this.name);
        if(this.lang instanceof Language) children.push(this.lang);
        return children;
    }

    computeConflicts(context: ConflictContext): Conflict[] { 
    
        if(this.name === undefined) return [ new UnnamedAlias(this) ];

        return []; 
    
    }

    getName(): string | undefined { return this.name instanceof Token ? this.name.text.toString() : this.name; }
    getLanguage() { return this.lang === undefined ? undefined : this.lang.getLanguage(); }

    isCompatible(alias: Alias) { 
        return this.getName() === alias.getName() && (
            (this.getLanguage() === undefined && alias.getLanguage() === undefined) ||
            (this.getLanguage() !== undefined && alias.getLanguage() !== undefined && this.getLanguage() === alias.getLanguage())
        );
    }

}