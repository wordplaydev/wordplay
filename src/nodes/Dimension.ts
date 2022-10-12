import type Context from "./Context";
import { getPossibleDimensions } from "./getPossibleUnits";
import Node from "./Node";
import Token from "./Token";
import TokenType from "./TokenType";

export default class Dimension extends Node {

    readonly name: Token;
    readonly caret?: Token;
    readonly exponent?: Token;

    constructor(name: Token | string, caret?: Token, exponent?: Token) {
        super();

        this.name = typeof name === "string" ? new Token(name, [ TokenType.NAME ]) : name;
        this.caret = caret;
        this.exponent = exponent;

    }

    getName() { return this.name.getText(); }

    computeChildren() {
        const children = [ this.name ];
        if(this.caret) children.push(this.caret);
        if(this.exponent) children.push(this.exponent);
        return children;
    }

    computeConflicts() {}

    clone(original?: Node, replacement?: Node) { 
        return new Dimension(
            this.name.cloneOrReplace([ Token ], original, replacement), 
            this.caret?.cloneOrReplace([ Token ], original, replacement),
            this.exponent?.cloneOrReplace([ Token ], original, replacement)
        ) as this; 
    }

    getDescriptions() {
        const dim = this.getName();
        return {
            eng: 
                dim === "pm" ? "picometers" :
                dim === "nm" ? "nanometers" :
                dim === "µm" ? "micrometers" :
                dim === "mm" ? "millimeters" :
                dim === "m" ? "centimeters" :
                dim === "cm" ? "centimeters" :
                dim === "dm" ? "decimeters" :
                dim === "m" ? "meters" :
                dim === "km" ? "kilometers" :
                dim === "Mm" ? "megameters" :
                dim === "Gm" ? "gigameters" :
                dim === "Tm" ? "terameters" :
                dim === "mi" ? "miles" :
                dim === "in" ? "inches" :
                dim === "ft" ? "feet" :
                dim === "ms" ? "milliseconds" :
                dim === "s" ? "seconds" :
                dim === "min" ? "minutes" :
                dim === "hr" ? "hours" :
                dim === "day" ? "days" :
                dim === "wk" ? "weeks" :
                dim === "yr" ? "years" :
                dim === "g" ? "grams" :
                dim === "mg" ? "milligrams" :
                dim === "kg" ? "kilograms" :
                dim === "oz" ? "ounces" :
                dim === "lb" ? "pounds" :
                dim === "pt" ? "font size" :
                "A dimension"
            }
    }

    getChildReplacements(child: Node, context: Context): Node[] {

        const project = context.source.getProject();
        // Dimension names can be any of the possible dimensions in the project.
        if(child === this.name && project !== undefined)
            return getPossibleDimensions(project).map(l => new Token(l, [ TokenType.NAME ]))
        else return [];

    }

}