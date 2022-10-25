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
import Start from "../runtime/Start";
import TokenType from "./TokenType";
import ExpressionPlaceholder from "./ExpressionPlaceholder";
import { getExpressionReplacements, getPossiblePostfix } from "../transforms/getPossibleExpressions";
import type Transform from "../transforms/Transform"
import { getPossibleLanguages } from "../transforms/getPossibleLanguages";
import Replace from "../transforms/Replace";
import Add from "../transforms/Add";
import Remove from "../transforms/Remove";
import type Translations from "./Translations";
import { TRANSLATE } from "./Translations"

type Part = Token | Expression | Unparsable;

export default class Template extends Expression {
    
    readonly parts: Part[];
    readonly format?: Language;

    constructor(parts?: Part[], format?: Language) {
        super();

        this.parts = parts ?? [ new Token("'\\", TokenType.TEXT_OPEN), new ExpressionPlaceholder(), new Token("\\'", TokenType.TEXT_CLOSE )];
        this.format = format;
    }

    clone(pretty: boolean=false, original?: Node | string, replacement?: Node) { 
        return new Template(
            this.cloneOrReplaceChild(pretty, [ Token, Expression, Unparsable ], "parts", this.parts, original, replacement),
            this.cloneOrReplaceChild(pretty, [ Language, undefined ], "format", this.format, original, replacement)
        ) as this; 
    }

    computeChildren() { return this.format ? [ ...this.parts, this.format ] : [ ...this.parts ]; }

    computeConflicts() { return []; }

    computeType(): Type {
        return new TextType(undefined, this.format);
    }

    compile(context: Context):Step[] {
        return [
            new Start(this),
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

    evaluateTypeSet(bind: Bind, original: TypeSet, current: TypeSet, context: Context) { 
        this.parts.forEach(part => { if(part instanceof Expression) part.evaluateTypeSet(bind, original, current, context); });
        return current;
    }

    getChildReplacement(child: Node, context: Context): Transform[] | undefined {
    
        const project = context.source.getProject();

        const index = this.parts.indexOf(child as Part);
        if(index >= 0) {
            const part = this.parts[index];
            if(part instanceof Expression)
                return getExpressionReplacements(context.source, this, part, context);
        }
        else if(child === this.format && project !== undefined)
            return getPossibleLanguages(project).map(l => new Replace(context.source, child, new Language(l)));

    }
    
    getInsertionBefore() { return undefined; }
    
    getInsertionAfter(context: Context, position: number): Transform[] | undefined { 
        
        const project = context.source.getProject();

        return [
            ...getPossiblePostfix(context, this, this.getType(context)),
            ...(this.format === undefined && project !== undefined ? getPossibleLanguages(project).map(l => new Add(context.source, position, this, "format", new Language(l))) : [])
        ];

    }

    getChildRemoval(child: Node, context: Context): Transform | undefined {
        if(this.parts.includes(child as Part)) return new Remove(context.source, this, child);
        else if(child === this.format) return new Remove(context.source, this, child);
    }

    getDescriptions(): Translations {
        return {
            "😀": TRANSLATE,
            eng: "Text made of values"
        }
    }

    getStartExplanations(): Translations { 
        return {
            "😀": TRANSLATE,
            eng: "Start by evaluating all of the parts in this template."
        }
     }

    getFinishExplanations(): Translations {
        return {
            "😀": TRANSLATE,
            eng: "Now make some text out of the parts!"
        }
    }

}