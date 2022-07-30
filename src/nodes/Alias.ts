import Node, { type ConflictContext } from "./Node";
import Token from "./Token";
import Conflict, { ExpectedLanguage } from "../parser/Conflict";

export default class Alias extends Node {
    
    readonly semicolon?: Token;
    readonly name: Token | string;
    readonly slash?: Token;
    readonly lang?: Token | string;

    constructor(name: Token | string, semicolon?: Token, slash?: Token, lang?: Token | string) {
        super();

        this.semicolon = semicolon;
        this.name = name;
        this.slash = slash;
        this.lang = lang;
    }

    getChildren() { 
        const children = [];
        if(this.semicolon instanceof Token) children.push(this.semicolon);
        if(this.name instanceof Token) children.push(this.name);
        if(this.slash) children.push(this.slash);
        if(this.lang instanceof Token) children.push(this.lang);
        return children;
    }

    getConflicts(context: ConflictContext): Conflict[] { 
        
        if(this.lang !== undefined && !/^[a-z]{3}$/.test(this.lang instanceof Token ? this.lang.text : this.lang))
            return [ new ExpectedLanguage(this) ]
        return []; 
        
    }

    getName() { return this.name instanceof Token ? this.name.text : this.name; }
    getLanguage() { return this.lang === undefined ? undefined : this.lang instanceof Token ? this.lang.text : this.lang; }

    isCompatible(alias: Alias) { 
        return this.getName() === alias.getName() && (
            (this.getLanguage() === undefined && alias.getLanguage() === undefined) ||
            (this.getLanguage() !== undefined && alias.getLanguage() !== undefined && this.getLanguage() === alias.getLanguage())
        );
    }

}