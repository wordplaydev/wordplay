import Expression from "./Expression";
import TextType from "./TextType";
import Token from "./Token";
import type Type from "./Type";
import type Node from "./Node";
import type Evaluator from "../runtime/Evaluator";
import type Value from "../runtime/Value";
import Text from "../runtime/Text";
import Finish from "../runtime/Finish";
import type Step from "../runtime/Step";
import type Context from "./Context";
import Language from "./Language";
import Unparsable from "./Unparsable";
import type Bind from "./Bind";
import type { TypeSet } from "./UnionType";

export default class Template extends Expression {
    
    readonly parts: (Token|Expression|Unparsable)[];
    readonly format?: Language;

    constructor(parts: (Token|Expression|Unparsable)[], format?: Language) {
        super();

        this.parts = parts;
        this.format = format;
    }

    computeChildren() { return this.format ? [ ...this.parts, this.format ] : [ ...this.parts ]; }

    computeConflicts() { return []; }

    computeType(): Type {
        return new TextType(undefined, this.format);
    }

    compile(context: Context):Step[] {
        return [
            ...this.parts.filter(p => p instanceof Expression).reduce(
                (parts: Step[], part) => [...parts, ...(part as Expression).compile(context)], []
            ),
            new Finish(this)
        ];
    }
    
    evaluate(evaluator: Evaluator): Value {
        
        // Build the string in reverse, accounting for the reversed stack of values.
        let text = "";
        for(let i = this.parts.length - 1; i >= 0; i--) {
            const p = this.parts[i];
            const part = p instanceof Token ? new Text(p.text.toString().substring(1, p.text.toString().length - 1)) : evaluator.popValue(new TextType());
            if(!(part instanceof Text)) return part;
            text = part.text + text;
        }
        return new Text(text, this.format?.getLanguage());

    }

    clone(original?: Node, replacement?: Node) { 
        return new Template(
            this.parts.map(p => p.cloneOrReplace([ Token, Expression, Unparsable ], original, replacement)), 
            this.format?.cloneOrReplace([ Language, undefined ], original, replacement)
        ) as this; 
    }

    evaluateTypeSet(bind: Bind, original: TypeSet, current: TypeSet, context: Context) { 
        this.parts.forEach(part => { if(part instanceof Expression) part.evaluateTypeSet(bind, original, current, context); });
        return current;
    }

}