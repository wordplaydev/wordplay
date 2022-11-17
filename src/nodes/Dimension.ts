import { EXPONENT_SYMBOL } from "../parser/Tokenizer";
import Add from "../transforms/Add";
import Replace from "../transforms/Replace";
import type Transform from "../transforms/Transform";
import type Context from "./Context";
import { getPossibleDimensions } from "../transforms/getPossibleUnits";
import Node from "./Node";
import Token from "./Token";
import TokenType from "./TokenType";
import NameToken from "./NameToken";
import Remove from "../transforms/Remove";
import type Translations from "./Translations";
import { TRANSLATE } from "./Translations"

export default class Dimension extends Node {

    readonly name: Token;
    readonly caret?: Token;
    readonly exponent?: Token;

    constructor(name: Token | string, caret?: Token, exponent?: Token) {
        super();

        this.name = typeof name === "string" ? new NameToken(name) : name;
        this.caret = caret === undefined ? undefined : caret.withPrecedingSpace("", true);
        this.exponent = exponent === undefined ? undefined : exponent.withPrecedingSpace("", true);

        this.computeChildren();

    }

    getGrammar() { 
        return [
            { name: "name", types:[ Token ] },
            { name: "caret", types:[ Token, undefined ] },
            { name: "exponent", types:[ Token, undefined ] },
        ]; 
    }

    clone(pretty: boolean=false, original?: Node, replacement?: Node) { 
        return new Dimension(
            this.cloneOrReplaceChild(pretty, "name", this.name, original, replacement), 
            this.cloneOrReplaceChild(pretty, "caret", this.caret, original, replacement),
            this.cloneOrReplaceChild(pretty, "exponent", this.exponent, original, replacement)
        ).label(this._label) as this; 
    }

    getName() { return this.name.getText(); }

    computeConflicts() {}

    getDescriptions(): Translations {
        const dim = this.getName();
        return {
            "😀": TRANSLATE,
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

    getChildReplacement(child: Node, context: Context) {

        const project = context.source.getProject();
        // Dimension names can be any of the possible dimensions in the project.
        if(child === this.name && project !== undefined)
            return getPossibleDimensions(project)
                .map(dimension => new Replace(context.source, child, new NameToken(dimension)));

    }

    getInsertionBefore() { return undefined; }

    getInsertionAfter(context: Context, position: number): Transform[] | undefined { 

        if(this.caret === undefined)
            return [ new Add(context.source, position, this, "exponent", new Token(EXPONENT_SYMBOL, TokenType.UNARY_OP)) ];
    }

    getChildRemoval(child: Node, context: Context): Transform | undefined {
        if(child === this.exponent && this.caret) return new Remove(context.source, this, this.caret, child);
    }

}