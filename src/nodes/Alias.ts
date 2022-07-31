import Node, { type ConflictContext } from "./Node";
import Token from "./Token";
import type Conflict from "../parser/Conflict";
import Language from "./Language";

export default class Alias extends Node {
    
    readonly semicolon?: Token;
    readonly name: Token | string;
    readonly lang?: Language;

    constructor(name: Token | string, lang?: Language, semicolon?: Token) {
        super();

        this.semicolon = semicolon;
        this.name = name;
        this.lang = lang;
    }

    getChildren() { 
        const children = [];
        if(this.semicolon instanceof Token) children.push(this.semicolon);
        if(this.name instanceof Token) children.push(this.name);
        if(this.lang instanceof Language) children.push(this.lang);
        return children;
    }

    getConflicts(context: ConflictContext): Conflict[] { return []; }

    getName() { return this.name instanceof Token ? this.name.text : this.name; }
    getLanguage() { return this.lang === undefined ? undefined : this.lang.getLanguage(); }

    isCompatible(alias: Alias) { 
        return this.getName() === alias.getName() && (
            (this.getLanguage() === undefined && alias.getLanguage() === undefined) ||
            (this.getLanguage() !== undefined && alias.getLanguage() !== undefined && this.getLanguage() === alias.getLanguage())
        );
    }

}