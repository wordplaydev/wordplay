import type Conflict from "../parser/Conflict";
import type ConversionDefinition from "./ConversionDefinition";
import type Program from "./Program";
import type Token from "./Token";
import Type from "./Type";

export default class TextType extends Type {

    readonly quote?: Token;
    readonly format?: Token;

    constructor(quote?: Token, format?: Token) {
        super();

        this.quote = quote;
        this.format = format;
    }

    getChildren() {
        const children = [];
        if(this.quote) children.push(this.quote);
        if(this.format) children.push(this.format);
        return children;
    }

    getConflicts(program: Program): Conflict[] { return []; }

    isCompatible(program: Program, type: Type): boolean { 
        return  type instanceof TextType && 
                ((this.format === undefined && type.format === undefined) || 
                 (this.format !== undefined && type.format !== undefined && this.format.text === type.format.text)); 
    }

    getConversion(program: Program, type: Type): ConversionDefinition | undefined {
        // TODO Define conversions from booleans to other types
        // TODO Look for custom conversions that extend the Boolean type
        return undefined;
    }

}