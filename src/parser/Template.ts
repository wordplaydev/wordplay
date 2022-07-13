import Conflict, { UnknownConversion } from "./Conflict";
import Expression from "./Expression";
import type Program from "./Program";
import TextType from "./TextType";
import type Token from "./Token";
import type Type from "./Type";

export default class Template extends Expression {
    
    readonly parts: (Token|Expression)[];
    readonly format?: Token;

    constructor(parts: (Token|Expression)[], format?: Token) {
        super();

        this.parts = parts;
        this.format = format;
    }

    getChildren() { return this.format ? [ ...this.parts, this.format ] : [ ...this.parts ]; }

    getConflicts(program: Program): Conflict[] { 
        
        const conflicts: Conflict[] = [];

        // Expressions must be convertable to text.
        (this.parts.filter(p => p instanceof Expression) as Expression[]).forEach(expr => {
            const type = expr.getType(program);
            if(type.getConversion(program, new TextType()) === undefined)
                conflicts.push(new UnknownConversion(expr, new TextType()));
        });

        return conflicts; 
    
    }

    getType(program: Program): Type {
        return new TextType(undefined, this.format);
    }

}