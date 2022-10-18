import { EXPONENT_SYMBOL, LANGUAGE_SYMBOL, PRODUCT_SYMBOL } from "../parser/Tokenizer";
import Dimension from "./Dimension";
import Token from "./Token";
import Type from "./Type";
import type Node from "./Node";
import Measurement from "../runtime/Measurement";
import type Context from "./Context";
import { getPossibleDimensions } from "./getPossibleUnits";
import TokenType from "./TokenType";
import type Transform from "./Transform";

export default class Unit extends Type {

    /** In case this was parsed, we keep the original tokens around. */
    readonly numerator: Dimension[];
    readonly slash?: Token;
    readonly denominator: Dimension[];

    /** We store units internally as a map from unit names to a positive or negative non-zero exponent. */
    readonly exponents: Map<string, number>;

    constructor(exponents: (undefined|Map<string, number>)=undefined, numerator?: (Dimension[]|undefined), slash?: Token, denominator?: Dimension[]) {

        super();

        // Did we parse it? Convert to exponents.
        if(numerator !== undefined && denominator !== undefined) {

            this.numerator = numerator;
            this.slash = slash;
            this.denominator =  denominator;

            this.exponents = new Map();
            
            for(const dim of numerator) {
                const name = dim.getName();
                const exp = dim.exponent === undefined ? 1 : new Measurement(dim.exponent.getText()).toNumber();
                const current = this.exponents.get(name);
                this.exponents.set(name, (current ?? 0) + exp);
            }
            for(const dim of denominator) {
                const name = dim.getName();
                const exp = dim.exponent === undefined ? -1 : -(new Measurement(dim.exponent.getText()).toNumber());
                const current = this.exponents.get(name);
                this.exponents.set(name, (current ?? 0) + exp);
            }
        
            // Eliminate any 0 exponent units.
            for(const [ unit, exp ] of this.exponents)
                if(exp === 0)
                    this.exponents.delete(unit);

        }
        else {
            // Set the exponents directly, if given.
            if(exponents !== undefined) {
                // Eliminate any 0 exponent units.
                for(const [ unit, exp ] of exponents)
                    if(exp === 0)
                        exponents.delete(unit);

                this.exponents = new Map(exponents);

            }
            else
                this.exponents = new Map();

            this.numerator = [];
            this.denominator = [];
        }

    }

    static map(numerator: string[], denominator: string[]) {

        const exponents = new Map();
        for(const unit of numerator)
            exponents.set(unit, exponents.has(unit) ? (exponents.get(unit) ?? 0) + 1 : 1);
        for(const unit of denominator)
            exponents.set(unit, exponents.has(unit) ? (exponents.get(unit) ?? 0) - 1 : -1);
        return exponents;

    }

    static unit(numerator: string[], denominator: string[]=[]) {
        return new Unit(Unit.map(numerator, denominator));
    }

    isEmpty() { return this.exponents.size === 0; }

    isEqualTo(unit: Unit) {
        return this.exponents.size === unit.exponents.size && Array.from(this.exponents.keys()).every(key => this.exponents.get(key) === unit.exponents.get(key))
    }

    computeChildren() { 
    
        let children: Node[] = [];
        if(this.numerator !== undefined)
            children = children.concat(this.numerator);
        if(this.slash !== undefined) children.push(this.slash);
        if(this.denominator !== undefined)
            children = children.concat(this.denominator);
    
        return children;
    
    }
    computeConflicts() {}

    accepts(unit: Unit): boolean {
        // Every key in this exists in the given unit and they have the same exponents.
        return this.isEqualTo(unit);
    }

    getNativeTypeName(): string { return "unit"; }

    toString(depth?: number) {

        const units = Array.from(this.exponents.keys()).sort();
        const numerator = units.filter(unit => (this.exponents.get(unit) ?? 0) > 0);
        const denominator = units.filter(unit => (this.exponents.get(unit) ?? 0) < 0);

        return (depth === undefined ? "" : "\t".repeat(depth)) + 
            numerator.map(unit => `${unit}${(this.exponents.get(unit) ?? 0) > 1 ? `${EXPONENT_SYMBOL}${this.exponents.get(unit)}` : ""}`).join(PRODUCT_SYMBOL) +
            (denominator.length > 0 ? LANGUAGE_SYMBOL : "") + 
            denominator.map(unit => `${unit}${(this.exponents.get(unit) ?? 0) < -1 ? `${EXPONENT_SYMBOL}${Math.abs(this.exponents.get(unit) ?? 0)}` : ""}`).join(PRODUCT_SYMBOL);

    }

    clone() { 
        return new Unit(this.exponents) as this;
    }

    sqrt() {

        const newExponents = new Map();

        // Subtract one from every unit's exponent, and if it would be zero, set it to -1.
        for(const [unit, exponent] of this.exponents)
            newExponents.set(unit, exponent === 1 ? -1 : exponent - 1)
        
        return new Unit(newExponents);
    
    }

    product(operand: Unit) {

        const newExponents = new Map(this.exponents);

        // Add the given units' exponents to the existing exponents
        for(const [unit, exponent] of operand.exponents) {
            const currentExponent = newExponents.get(unit);
            newExponents.set(unit, (currentExponent ?? 0) + exponent); 
        }
        
        return new Unit(newExponents);

    }

    quotient(operand: Unit) {
        
        const newExponents = new Map(this.exponents);

        // Subtract the given units' exponents from the existing exponents
        for(const [unit, exponent] of operand.exponents) {
            const currentExponent = newExponents.get(unit)
            newExponents.set(unit, (currentExponent ?? 0) - exponent); 
        }
        
        return new Unit(newExponents);

    }

    power(exponent: number) {
    
        // Multiply the exponents by the given exponent.
        const newExponents = new Map(this.exponents);

        // Subtract the given units' exponents from the existing exponents
        for(const [unit, exp] of this.exponents) {
            newExponents.set(unit, exp * exponent); 
        }

        return new Unit(newExponents);
        
    }

    getDescriptions() {
        return {
            eng: this.exponents.size === 0 ? "A unitless number" : 
                this.numerator.length === 1 && this.denominator.length === 0 ? this.numerator[0].getDescriptions().eng :
                this.toWordplay() === "m/s" ? "velocity" :
                "A number with unit"
        }
    }

    getReplacementChild(child: Node, context: Context): Transform[] | undefined {
    
        const project = context.source.getProject();

        if(child !== this.slash && project !== undefined)
            return getPossibleDimensions(project).map(dim => new Dimension(dim));

    }
    
    getInsertionBefore() { return undefined; }
    
    getInsertionAfter() { 
        
        if(this.slash === undefined)
            return [ new Token(LANGUAGE_SYMBOL, [ TokenType.LANGUAGE ])]

    }

}