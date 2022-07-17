import type Node from "./Node";
import Expression from "./Expression";
import type Token from "./Token";
import type Docs from "./Docs";
import type Program from "./Program";
import Conflict, { DuplicateLanguages, MisplacedConversion } from "../parser/Conflict";
import UnknownType from "./UnknownType";
import Unparsable from "./Unparsable";
import { docsAreUnique } from "./util";
import CustomType from "./CustomType";
import Block from "../nodes/Block";
import ConversionType from "./ConversionType";
import type Type from "./Type";
import type Evaluator from "../runtime/Evaluator";
import Exception, { ExceptionType } from "../runtime/Exception";
import type Value from "../runtime/Value";
import type Step from "../runtime/Step";
import Finish from "../runtime/Finish";

export default class Conversion extends Expression {

    readonly docs: Docs[];
    readonly convert: Token;
    readonly output: Type | Unparsable;
    readonly expression: Expression | Unparsable;

    constructor(docs: Docs[], convert: Token, output: Type | Unparsable, expression: Expression | Unparsable) {
        super();

        this.docs = docs;
        this.convert = convert;
        this.output = output;
        this.expression = expression;
    }

    getChildren() {
        let children: Node[] = [];
        children = children.concat(this.docs);
        children.push(this.convert);
        children.push(this.output);
        children.push(this.expression);
        return children;
    }

    getConflicts(program: Program): Conflict[] { 
        
        const conflicts: Conflict[] = [];
    
        // Docs must be unique.
        if(!docsAreUnique(this.docs))
            conflicts.push(new DuplicateLanguages(this.docs))

        // Can only appear in custom types.
        const enclosure = program.getBindingEnclosureOf(this);
        if(!(enclosure instanceof Block) ||  !(program.getBindingEnclosureOf(enclosure) instanceof CustomType))
            conflicts.push(new MisplacedConversion(this));
    
        return conflicts; 
    
    }

    getType(program: Program): Type {
        return this.output instanceof Unparsable ? new UnknownType(this) : new ConversionType(this.output);
    }

    compile(): Step[] {
        return [ new Finish(this) ];
    }

    evaluate(evaluator: Evaluator): Value | Node {
        return new Exception(ExceptionType.NOT_IMPLEMENTED);
    }

}