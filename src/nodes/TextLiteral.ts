import type Conflict from "../parser/Conflict";
import Expression from "./Expression";
import type Program from "./Program";
import TextType from "./TextType";
import type Token from "./Token";
import type Type from "./Type";
import type Evaluator from "../runtime/Evaluator";
import type Value from "../runtime/Value";
import Text from "../runtime/Text";
import type Step from "../runtime/Step";
import Finish from "../runtime/Finish";
import type { ConflictContext } from "./Node";

export default class TextLiteral extends Expression {
    
    readonly text: Token;
    readonly format?: Token;

    constructor(text: Token, format?: Token) {
        super();
        this.text = text;
        this.format = format;
    }

    getChildren() { return this.format !== undefined ? [ this.text, this.format ] : [ this.text ]; }

    getConflicts(context: ConflictContext): Conflict[] { return []; }

    getType(context: ConflictContext): Type {
        return new TextType(undefined, this.format);
    }

    compile(): Step[] {
        return [ new Finish(this) ];
    }
    
    evaluate(evaluator: Evaluator): Value {
        return new Text(this.text.text.substring(1, this.text.text.length - 1), this.format === undefined ? undefined : this.format.text);
    }

}