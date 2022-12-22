import Expression from "./Expression";
import type Node from "./Node";
import type Transform from "../transforms/Transform"
import type Context from "./Context";
import Token from "./Token";
import Type from "./Type";
import type Conflict from "../conflicts/Conflict";
import UnusedBind from "../conflicts/UnusedBind";
import DuplicateBinds from "../conflicts/DuplicateBinds";
import IncompatibleBind from "../conflicts/IncompatibleBind";
import UnexpectedEtc from "../conflicts/UnexpectedEtc";
import NameType from "./NameType";
import StructureDefinitionType from "./StructureDefinitionType";
import StructureDefinition from "./StructureDefinition";
import TypeVariable from "./TypeVariable";
import type Evaluator from "../runtime/Evaluator";
import type Step from "../runtime/Step";
import Start from "../runtime/Start";
import Halt from "../runtime/Halt";
import Finish from "../runtime/Finish";
import { getCaseCollision } from "./util";
import Block from "./Block";
import ListType from "./ListType";
import ValueException from "../runtime/ValueException";
import type Translations from "./Translations";
import { overrideWithDocs, TRANSLATE } from "./Translations"
import Exception from "../runtime/Exception";
import type Definition from "./Definition";
import { getPossibleTypeAdds, getPossibleTypeReplacements } from "../transforms/getPossibleTypes";
import { getExpressionReplacements } from "../transforms/getPossibleExpressions";
import AnyType from "./AnyType";
import { PLACEHOLDER_SYMBOL } from "../parser/Tokenizer";
import TokenType from "./TokenType";
import TypePlaceholder from "./TypePlaceholder";
import FunctionDefinition from "./FunctionDefinition";
import ExpressionPlaceholder from "./ExpressionPlaceholder";
import type LanguageCode from "./LanguageCode";
import Add from "../transforms/Add";
import Replace from "../transforms/Replace";
import BindToken from "./BindToken";
import TypeToken from "./TypeToken";
import Remove from "../transforms/Remove";
import Docs from "./Docs";
import Names from "./Names";
import { MissingShareLanguages } from "../conflicts/MissingShareLanguages";
import { MisplacedShare } from "../conflicts/MisplacedShare";
import { DuplicateShare } from "../conflicts/DuplicateShare";
import type TypeSet from "./TypeSet";
import type Value from "../runtime/Value";

export default class Bind extends Expression {    
    readonly docs?: Docs;
    readonly share: Token | undefined;
    readonly names: Names;
    readonly etc: Token | undefined;
    readonly dot?: Token;
    readonly type?: Type;
    readonly colon?: Token;
    readonly value?: Expression;

    constructor(docs: Docs | undefined, share: Token | undefined, names: Names, etc: Token | undefined, dot?: Token, type?: Type, colon?: Token, value?: Expression) {
        super();

        this.docs = docs;
        this.share = share;
        this.names = names;
        this.etc = etc;
        this.dot = dot;
        this.type = type;
        this.colon = colon;
        this.value = value;

        this.computeChildren();

    }

    static make(docs: Translations | undefined, names: Names | Translations, type?: Type, value?: Expression) {
        return new Bind(
            docs ? new Docs(docs) : undefined, 
            undefined, 
            names instanceof Names ? names : Names.make(names), 
            undefined,
            type === undefined ? undefined : new TypeToken(), type, 
            value === undefined ? undefined : new BindToken(), value
        );
    }

    getGrammar() { 
        return [
            { name: "docs", types: [ Docs, undefined ] },
            { name: "share", types: [ Token, undefined ] },
            { name: "names", types: [ Names ] },
            { name: "etc", types: [ Token, undefined ] },
            { name: "dot", types: [ Token, undefined ] },
            { name: "type", types: [ Type, undefined ] },
            { name: "colon", types: [ Token, undefined ] },
            { name: "value", types: [ Expression, undefined ] },
        ];
    }

    replace(original?: Node, replacement?: Node) { 
        return new Bind(
            this.replaceChild("docs", this.docs, original, replacement), 
            this.replaceChild("share", this.share, original, replacement), 
            this.replaceChild("names", this.names, original, replacement), 
            this.replaceChild("etc", this.etc, original, replacement), 
            this.replaceChild("dot", this.dot, original, replacement),
            this.replaceChild("type", this.type, original, replacement), 
            this.replaceChild("colon", this.colon, original, replacement),
            this.replaceChild<Expression|undefined>("value", this.value, original, replacement)
        ) as this;
    }

    isEvaluationInvolved() { return true; }

    getPreferredPrecedingSpace(child: Node, space: string, depth: number): string {
        // If the block has more than one statement, and the space doesn't yet include a newline followed by the number of types tab, then prefix the child with them.
        return (child === this.value) && space.indexOf("\n") >= 0 ? `${"\t".repeat(depth)}` : "";
    }

    evaluateTypeSet(bind: Bind, original: TypeSet, current: TypeSet, context: Context): TypeSet {
        return this.value === undefined ? current : this.value.evaluateTypeSet(bind, original, current, context);
    }

    isBlockFor(child: Node) { return child === this.value; }

    hasName(name: string) { return this.names.hasName(name); }
    sharesName(bind: Bind) { return this.names.sharesName(bind.names); }
    getNames(): string[] { return this.names.getNames(); }
    
    getTranslation(lang: LanguageCode[]) {
        return this.names.getTranslation(lang);
    }

    isVariableLength() { return this.etc !== undefined; }
    hasValue() { return this.value !== undefined; }

    hasDefault() { return !this.isRequired(); }
    isRequired() { return this.value === undefined && !this.isVariableLength(); }

    computeConflicts(context: Context): Conflict[] {

        const conflicts = [];

        // Etc tokens can't appear in block bindings, just structure and function definitions.
        if(this.isVariableLength() && context.get(this)?.getParent() instanceof Block)
            conflicts.push(new UnexpectedEtc(this));

        // If there's a type, the value must match.
        if(this.type !== undefined && this.value && this.value instanceof Expression) {
            const valueType = this.value.getType(context);
            if(!this.type.accepts(valueType, context))
                conflicts.push(new IncompatibleBind(this.type, this.value, valueType));
        }

        // Find the scoping enclosure for this bind.
        const enclosure = context.get(this)?.getBindingScope();

        // It can't already be defined.
        if(enclosure !== undefined) {
            const definitions = this.names.names.reduce((definitions: Definition[], alias) => {
                const name: string | undefined = alias.getName();
                return name === undefined ? definitions : definitions.concat(enclosure.getAllDefinitionsOfName(name, context, this));
            }, []).filter(def => def !== undefined && def !== this && (def instanceof Bind || def instanceof TypeVariable)) as (Bind | TypeVariable)[];
            if(definitions.length > 0)
                conflicts.push(new DuplicateBinds(this, definitions));
        }

        // Warn if there are similarly cased definitions.
        // Is there match with the other case?
        if(enclosure !== undefined) {
            this.names.names.forEach(alias => {
                // Is there match with the other case?
                const name = alias.getName();
                if(name !== undefined) {
                    const caseCollision = getCaseCollision(name, enclosure, context, alias);
                    if(caseCollision) conflicts.push(caseCollision);
                }
            });
        }

        // Search the project for references and warn if there aren't any.
        const parent = context.get(this)?.getParent();
        if(enclosure && !this.isShared() && (parent instanceof Block || parent instanceof FunctionDefinition || parent instanceof StructureDefinition)) {
            const references = context.project.getReferences(this);
            // Don't warn on placeholder symbols.
            if(references.length === 0 && !this.names.hasName(PLACEHOLDER_SYMBOL))
                conflicts.push(new UnusedBind(this));
        }

        // Shares can only appear in the program's root block.
        if(this.share !== undefined) {
            if(!context.source.expression.expression.getChildren().includes(this))
                conflicts.push(new MisplacedShare(this, this.share));

            // Bindings must have language tags on all names to clarify what langauge they're written in.
            if(!this.names.names.every(n => n.lang !== undefined))
                conflicts.push(new MissingShareLanguages(this));

            // Other shares in this project can't have the same name
            const sources = context.project.getSourcesExcept(context.source);
            if(sources !== undefined) {
                for(const source of sources) {
                    if(source.expression.expression instanceof Block) {
                        for(const share of source.expression.expression.statements.filter(s => s instanceof Bind && s.isShared()) as Bind[]) {
                            if(this.sharesName(share))
                                conflicts.push(new DuplicateShare(this, share));
                        }
                    }
                }
            }
        }

        return conflicts;

    }

    isShared() { return this.share !== undefined; }

    computeType(context: Context): Type {

        // What type is this binding?
        let type = 
            // If it's declared, use the declaration.
            this.type instanceof Type ? 
                // Account for variable length arguments
                (
                    this.isVariableLength() ? 
                    ListType.make(this.type) : 
                    this.type
                ) :
            // If it has an expression. ask the expression.
            this.value instanceof Expression ? this.value.getType(context) :
            // Otherwise, we don't know, it could be anything.
            new AnyType();

        // If the type is a name, and it refers to a structure, resolve it.
        // Leave names that refer to type variables to be resolved in Evaluate.
        if(type instanceof NameType) {
            const nameType = type.getType(context);
            if(nameType instanceof StructureDefinitionType) return nameType;
        }
        return type;
        
    }

    getDefinitionOfName() { return undefined; }

    getDependencies(context: Context): Expression[] {

        const parent = context.get(this)?.getParent();

        // A bind in a function or structure definition depends on all calls to the function/structure definition,
        // because they determine what values the binds have.
        const evaluations = 
            (parent instanceof FunctionDefinition || parent instanceof StructureDefinition ? context.project.getEvaluationsOf(parent) : undefined) ?? [];

        // A bind also depends on its value expression, if it has one.
        return this.value ? [ this.value, ...evaluations ] : [ ...evaluations];

    }

    compile(context: Context): Step[] {
        // A bind evaluates its value expression, then pushes it on the stack.
        return this.value === undefined ?
            [ new Halt(evaluator => new ValueException(evaluator), this) ] :
            [ 
                new Start(this), 
                ...this.value.compile(context), 
                new Finish(this) 
            ];
    }

    getStart() { return this.colon ?? this.names; }
    getFinish() { return this.names; }

    getStartExplanations(): Translations {
        return {
            "😀": TRANSLATE,
            eng: "Evaluate the value first"
        }
    }

    getFinishExplanations(): Translations {
        return {
            "😀": TRANSLATE,
            eng: "Bind the value to this name."
        }
    }

    evaluate(evaluator: Evaluator, prior: Value | undefined): Value {
        
        // Get the value we computed, or previously computed.
        const value = prior ?? evaluator.popValue(undefined);

        // If it's an exception, return it instead of binding.
        if(value instanceof Exception) return value;

        // Bind the value on the stack to the names.
        evaluator.bind(this.names, value);

        // Return the value of the Bind for later.
        return value;

    }
    
    getDescriptions(): Translations {

        const defaultDocs = { 
            "😀": TRANSLATE,
            eng: "A named value" 
        };
        return this.docs ? overrideWithDocs(defaultDocs, this.docs) : defaultDocs;
        
    }

    getChildReplacement(child: Node, context: Context): Transform[] | undefined {
        if(child === this.type) {
            return getPossibleTypeReplacements(child, context);
        }
        else if(child === this.value) {
            return getExpressionReplacements(this, this.value, context, this.type instanceof Type ? this.type : new AnyType());
        }
    }

    getInsertionBefore(child: Node, context: Context, position: number): Transform[] | undefined {
        
        const parent = context.get(this)?.getParent();
        // Before the first name? a name? Offer an etc or a documentation
        if(child === this.names) {
            if(this.etc === undefined) {
                if((parent instanceof FunctionDefinition || parent instanceof StructureDefinition) && parent.inputs.find(input => input.contains(child)) === parent.inputs[parent.inputs.length - 1])
                    return [ 
                        new Add(context, position, this, "etc", new Token(PLACEHOLDER_SYMBOL, TokenType.PLACEHOLDER)),
                    ];
            }
        }
        // Before colon? Offer a type.
        else if(child === this.colon && this.type === undefined)
            return [ 
                new Replace(context, this, new Bind(this.docs, this.share, this.names, this.etc, new TypeToken(), new TypePlaceholder(), this.colon, this.value))
            ];

    }
    getInsertionAfter(context: Context, position: number): Transform[] | undefined {
        
        const children  = this.getChildren();
        const lastChild = children[children.length - 1];

        const withValue = new Replace(context, this, new Bind(this.docs, this.share, this.names, this.etc, this.dot, this.type, new BindToken(), new ExpressionPlaceholder()));

        if(lastChild === this.dot)
            return getPossibleTypeAdds(this, "context", context, position);
        else if(lastChild === this.type)
            return [ 
                withValue
            ];
        else if(lastChild === this.colon)
            return [ 
                withValue
            ];

    }

    withoutType() { 

    }

    getChildRemoval(child: Node, context: Context): Transform | undefined {
        
        if(child === this.type && this.dot) return new Remove(context, this, this.dot, this.type);
        else if(child === this.value && this.colon) return new Remove(context, this, this.colon, this.value);

    }

}