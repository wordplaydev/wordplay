import type Conflict from "../conflicts/Conflict";
import { UnknownConversion } from "../conflicts/UnknownConversion";
import Expression from "./Expression";
import TextType from "./TextType";
import Token from "./Token";
import type Type from "./Type";
import type Evaluator from "../runtime/Evaluator";
import type Value from "../runtime/Value";
import Text from "../runtime/Text";
import Exception, { ExceptionKind } from "../runtime/Exception";
import Finish from "../runtime/Finish";
import type Step from "../runtime/Step";
import type { ConflictContext } from "./Node";
import type Language from "./Language";

export default class Template extends Expression {
    
    readonly parts: (Token|Expression)[];
    readonly format?: Language;

    constructor(parts: (Token|Expression)[], format?: Language) {
        super();

        this.parts = parts;
        this.format = format;
    }

    getChildren() { return this.format ? [ ...this.parts, this.format ] : [ ...this.parts ]; }

    getConflicts(context: ConflictContext): Conflict[] { 
        
        const conflicts: Conflict[] = [];

        // Expressions must be convertable to text.
        (this.parts.filter(p => p instanceof Expression) as Expression[]).forEach(expr => {
            const type = expr.getType(context);
            if(!(type instanceof TextType) && type.getConversion(context, new TextType()) === undefined)
                conflicts.push(new UnknownConversion(expr, new TextType()));
        });

        return conflicts; 
    
    }

    getType(context: ConflictContext): Type {
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
    
    evaluate(evaluator: Evaluator): Value {
        
        // Build the string in reverse, accounting for the reversed stack of values.
        let text = "";
        for(let i = this.parts.length - 1; i >= 0; i--) {
            const p = this.parts[i];
            const part = p instanceof Token ? new Text(p.text.substring(1, p.text.length - 1)) : evaluator.popValue();
            if(!(part instanceof Text))
                return new Exception(this, ExceptionKind.EXPECTED_TYPE);
            text = part.text + text;
        }
        return new Text(text, this.format?.getLanguage());

    }

}