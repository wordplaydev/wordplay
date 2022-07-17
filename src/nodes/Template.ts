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
import Finish from "../runtime/Finish";
import type Step from "../runtime/Step";

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
            if(!(type instanceof TextType) && type.getConversion(program, new TextType()) === undefined)
                conflicts.push(new UnknownConversion(expr, new TextType()));
        });

        return conflicts; 
    
    }

    getType(program: Program): Type {
        return new TextType(undefined, this.format);
    }

    compile(): Step[] {
        return [
            ...this.parts.filter(p => p instanceof Expression).reduce(
                (parts: Step[], part) => [...parts, ...(part as Expression).compile()], []
            ),
            new Finish(this)
        ];
    }
    
    evaluate(evaluator: Evaluator): Value | Node {
        
        // Build the string in reverse, accounting for the reversed stack of values.
        let text = "";
        for(let i = this.parts.length - 1; i >= 0; i--) {
            const p = this.parts[i];
            const part = p instanceof Token ? new Text(p.text.substring(1, p.text.length - 1)) : evaluator.popValue();
            if(!(part instanceof Text))
                return new Exception(ExceptionType.EXPECTED_TYPE);
            text = part.text + text;
        }
        return new Text(text, this.format?.text);

    }

}