import type Conflict from "../parser/Conflict";
import Node, { type ConflictContext } from "./Node";
import Token from "./Token";

export default class Language extends Node {
    
    readonly slash: Token;
    readonly lang: Token | string;

    constructor(lang: Token | string, slash: Token) {
        super();

        this.slash = slash;
        this.lang = lang;
    }

    getChildren() { 
        const children = [];
        children.push(this.slash);
        if(this.lang instanceof Token) children.push(this.lang);
        return children;
    }

    getConflicts(context: ConflictContext): Conflict[] { return []; }

    getLanguage() { return this.lang instanceof Token ? this.lang.text : this.lang; }

    isCompatible(lang: Language) {
        return this.getLanguage() === lang.getLanguage();
    }
}