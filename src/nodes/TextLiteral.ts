import Expression from "./Expression";
import TextType from "./TextType";
import Token from "./Token";
import type Type from "./Type";
import type Node from "./Node";
import type Value from "../runtime/Value";
import Text from "../runtime/Text";
import type Step from "../runtime/Step";
import Language from "./Language";
import type Bind from "./Bind";
import type Context from "./Context";
import type { TypeSet } from "./UnionType";
import TokenType from "./TokenType";
import { getPossibleLanguages } from "../transforms/getPossibleLanguages";
import Add from "../transforms/Add";
import Replace from "../transforms/Replace";
import type Transform from "../transforms/Transform";
import { getPossiblePostfix } from "../transforms/getPossibleExpressions";
import Remove from "../transforms/Remove";
import type Translations from "./Translations";
import { TRANSLATE } from "./Translations"
import type Evaluator from "../runtime/Evaluator";
import StartFinish from "../runtime/StartFinish";

export default class TextLiteral extends Expression {
    
    readonly text: Token;
    readonly format?: Language;

    constructor(text?: Token | string, format?: Language) {
        super();
        this.text = text instanceof Token ? text : new Token(`'${text ?? ""}'`, TokenType.TEXT);
        this.format = format;

        this.computeChildren();

    }

    getGrammar() { 
        return [
            { name: "text", types:[ Token ] },
            { name: "format", types:[ Language, undefined ] },
        ];
    }

    replace(pretty: boolean=false, original?: Node, replacement?: Node) { 
        return new TextLiteral(
            this.replaceChild(pretty, "text", this.text, original, replacement), 
            this.replaceChild(pretty, "format", this.format, original, replacement)
        ) as this; 
    }

    computeConflicts() {}

    computeType(): Type {
        return new TextType(this.text, this.format);
    }

    getDependencies(): Expression[] {
        return [];
    }

    compile(): Step[] {
        return [ new StartFinish(this) ];
    }
    
    evaluate(_: Evaluator, prior: Value | undefined): Value | undefined {
        
        if(prior) return prior;
        
        // Remove the opening and optional closing quote symbols.
        const lastChar = this.text.text.toString().length === 0 ? undefined : this.text.text.toString().charAt(this.text.text.toString().length - 1);
        const lastCharIsQuote = lastChar === undefined ? false : ["』", "」", "»", "›", "'", "’", "”", '"'].includes(lastChar);    
        return new Text(this, this.text.text.toString().substring(1, this.text.text.toString().length - (lastCharIsQuote ? 1 : 0)), this.format === undefined ? undefined : this.format.getLanguage());
    }

    evaluateTypeSet(bind: Bind, original: TypeSet, current: TypeSet, context: Context) { bind; original; context; return current; }

    getChildReplacement(child: Node, context: Context) {
    
        const project = context.project;
        // Formats can be any Language tags that are used in the project.
        if(project !== undefined && child === this.format)
            return getPossibleLanguages(project).map(lang => new Replace(context, child, new Language(lang)));

    }
    
    getInsertionBefore() { return undefined; }
    
    getInsertionAfter(context: Context, position: number): Transform[] | undefined { 
        
        const project = context.project;

        // Formats can be any Language tags that are used in the project.
        return [
            ...getPossiblePostfix(context, this, this.getType(context)),
            ...(project !== undefined && this.format === undefined ? 
                getPossibleLanguages(project).map(lang => new Add(context, position, this, "format", new Language(lang))) :
                []
            )
        ];

    }

    getChildRemoval(child: Node, context: Context): Transform | undefined {
        if(child === this.format) return new Remove(context, this, child);
    }

    getDescriptions(): Translations {
        return {
            "😀": TRANSLATE,
            eng: "Text"
        }
    }

    getStart() { return this.text; }
    getFinish() { return this.text; }

    getStartExplanations(): Translations { return this.getFinishExplanations(); }

    getFinishExplanations(): Translations {
        return {
            "😀": TRANSLATE,
            eng: "Evaluate to this text!"
        }
    }

}