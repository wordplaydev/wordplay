import Conflict, { UnknownConversion } from "../parser/Conflict";
import Expression from "./Expression";
import type Node from "./Node";
import type Program from "./Program";
import TextType from "./TextType";
import Token from "./Token";
import type Type from "./Type";
import type Evaluator from "../runtime/Evaluator";
import type Value from "../runtime/Value";
import Text from "../runtime/Text";
import Exception, { ExceptionType } from "../runtime/Exception";

export default class Template extends Expression {
    
    readonly parts: (Token|Expression)[];
    readonly format?: Token;
    readonly expressions: Expression [];

    constructor(parts: (Token|Expression)[], format?: Token) {
        super();

        this.parts = parts;
        this.format = format;
        this.expressions = this.parts.filter(p => p instanceof Expression) as Expression[];
    }

    getChildren() { return this.format ? [ ...this.parts, this.format ] : [ ...this.parts ]; }

    getConflicts(program: Program): Conflict[] { 
        
        const conflicts: Conflict[] = [];

        // Expressions must be convertable to text.
        (this.parts.filter(p => p instanceof Expression) as Expression[]).forEach(expr => {
            const type = expr.getType(program);
            if(!(type instanceof TextType) && type.getConversion(program, new TextType()) === undefined)
                conflicts.push(new UnknownConversion(expr, new TextType()));
        });

        return conflicts; 
    
    }

    getType(program: Program): Type {
        return new TextType(undefined, this.format);
    }

    evaluate(evaluator: Evaluator): Value | Node {
        
        if(this.expressions.length === 0) return new Text(this.parts.map(p => (p as Token).text).join(""), this.format?.text);

        const lastPart = evaluator.lastEvaluated();
        const index = lastPart === undefined ? -1 : this.expressions.indexOf(lastPart);
        // First TODO Handle conversions
        if(index < 0) return this.expressions[0];
        // Middle TODO Handle conversions
        else if(index < this.expressions.length - 1) return this.expressions[index + 1];
        // Done
        else {
            // Get the values in order
            const values = [];
            for(let i = 0; i < this.expressions.length; i++)
                values.unshift(evaluator.popValue());
            let text = "";
            for(let i = 0; i < this.parts.length; i++) {
                const p = this.parts[i];
                const part = p instanceof Token ? new Text(p.text.substring(1, p.text.length - 1)) : values.shift();
                if(!(part instanceof Text))
                    return new Exception(ExceptionType.INCOMPATIBLE_TYPE);
                text = text + part.text;
            }
            return new Text(text, this.format?.text);
        }

    }

}