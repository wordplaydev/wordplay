import type Node from "./Node";
import Token from "./Token";
import TokenType from "./TokenType";
import Type from "./Type";

export default class Unit extends Type {

    readonly numeratorTokens: Token[];
    readonly denominatorTokens: Token[];
    readonly numerator: string[];
    readonly denominator: string[];

    constructor(numerator: Token[] | string[] = [], denominator: Token[] | string[] = []) {

        super();

        numerator

        // If we were given tokens, generate the arrays.
        if(numerator.length > 0 && numerator[0] instanceof Token) {
            this.numerator = (numerator as Token[]).filter(n => n.is(TokenType.NAME)).map(n => n.text.toString()).sort();
            this.denominator = (denominator as Token[]).filter(n => n.is(TokenType.NAME)).map(n => n.text.toString()).sort();            
            this.numeratorTokens = numerator as Token[];
            this.denominatorTokens = denominator as Token[];
        }
        // If we were given strings, just assign them.
        else {
            this.numerator = numerator as string[];
            this.denominator = denominator as string[];
            this.numeratorTokens = [];
            this.denominatorTokens = [];
        }

        // Simply the unit for later comparison.
        // While the same string appears in both numerator and denominator, remove from both.
        // The strategy is to identify all of the unique units in the numerator, and for each one, count the
        // number of times it appears in the numerator and denominator. We remove the minimum of the two from both lists.
        const topUnits = [ ...new Set(this.numerator) ];
        topUnits.forEach(top => {
            // How many times does the top appear in both lists?
            const cancelCount = Math.min(this.numerator.filter(n => n === top).length, this.denominator.filter(b => b === top).length);
            for(let i = 0; i < cancelCount; i++) { 
                this.numerator.splice(this.numerator.indexOf(top), 1); 
                this.denominator.splice(this.denominator.indexOf(top), 1); 
            }
        });

    }

    isEmpty() { return this.numerator.length === 0 && this.denominator.length === 0; }

    computeChildren(): Node[] { return this.numeratorTokens.concat(this.denominatorTokens); }

    isCompatible(unit: Unit): boolean {
        return this.numerator.join("·") === unit.numerator.join("·") && 
               this.denominator.join("·") === unit.denominator.join("·");
    }

    getNativeTypeName(): string { return "unit"; }

    toString(depth?: number) {
        return (depth === undefined ? "" : "\t".repeat(depth)) + 
            (this.numerator.length === 0 && this.denominator.length === 0 ? "" :
            (this.numerator.length === 0 ? "1" : this.numerator.join("·")) + 
            (this.denominator.length === 0 ? "" : "/" + this.denominator.join("·")));
    }

    clone(original?: Node, replacement?: Node) { 
        return new Unit(
            this.numerator.length > 0 && this.numeratorTokens.length === 0 ? this.numerator : this.numeratorTokens.map(t => t.cloneOrReplace([ Token ], original, replacement)), 
            this.denominator.length > 0 && this.denominatorTokens.length === 0 ? this.denominator : this.denominatorTokens.map(t => t.cloneOrReplace([ Token ], original, replacement))
        ) as this; 
    }

}