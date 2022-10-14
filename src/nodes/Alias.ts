import Node from "./Node";
import Token from "./Token";
import TokenType from "./TokenType";
import type Conflict from "../conflicts/Conflict";
import Language from "./Language";
import UnnamedAlias from "../conflicts/UnnamedAlias";
import type Context from "./Context";
import { getPossibleLanguages } from "./getPossibleLanguages";

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

    computeConflicts(): Conflict[] { 
    
        if(this.name === undefined) return [ new UnnamedAlias(this) ];

        return []; 
    
    }

    getName(): string | undefined { return this.name instanceof Token ? this.name.text.toString() : this.name; }
    getLanguage() { return this.lang === undefined ? undefined : this.lang.getLanguage(); }

    equals(alias: Alias) { 

        const thisLang = this.lang;
        const thatLang = alias.lang;

        return this.getName() === alias.getName() && (
            (thisLang === undefined && thatLang === undefined) ||
            (thisLang !== undefined && thatLang !== undefined && thisLang.equals(thatLang))
        );
    }

    clone(original?: Node, replacement?: Node) { 
        return new Alias(
            this.name?.cloneOrReplace([ Token, undefined], original, replacement), 
            this.lang?.cloneOrReplace([ Language, undefined], original, replacement),
            this.semicolon?.cloneOrReplace([ Token, undefined], original, replacement)
        ) as this; 
    }

    getDescriptions() {
        return {
            eng: "A name"
        }
    }

    getChildReplacements(child: Node, context: Context) {

        const project = context.source.getProject();
        // Formats can be any Language tags that are used in the project.
        if(child === this.lang && project !== undefined)
            return getPossibleLanguages(project).map(l => new Language(l))
        else return [];

    }

}