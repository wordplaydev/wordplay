import Expression from "./Expression";
import Node from "./Node";
import type Transform from "../transforms/Transform"
import type Context from "./Context";
import Token from "./Token";
import Type from "./Type";
import Unparsable from "./Unparsable";
import type Conflict from "../conflicts/Conflict";
import UnusedBind from "../conflicts/UnusedBind";
import DuplicateBinds from "../conflicts/DuplicateBinds";
import IncompatibleBind from "../conflicts/IncompatibleBind";
import UnexpectedEtc from "../conflicts/UnexpectedEtc";
import UnknownType from "./UnknownType";
import NameType from "./NameType";
import StructureType from "./StructureType";
import StructureDefinition from "./StructureDefinition";
import TypeVariable from "./TypeVariable";
import Reference from "./Reference";
import Column from "./Column";
import ColumnType from "./ColumnType";
import type Evaluator from "../runtime/Evaluator";
import type Evaluable from "../runtime/Evaluable";
import type Step from "../runtime/Step";
import Start from "../runtime/Start";
import Halt from "../runtime/Halt";
import Finish from "../runtime/Finish";
import type Named from "./Named";
import { getCaseCollision } from "./util";
import Evaluate from "./Evaluate";
import Block from "./Block";
import ListType from "./ListType";
import Cell from "./Cell";
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

export default class Bind extends Node implements Evaluable, Named {
    
    readonly docs: Docs;
    readonly share: Token | undefined;
    readonly etc: Token | undefined;
    readonly names: Names;
    readonly dot?: Token;
    readonly type?: Type | Unparsable;
    readonly colon?: Token;
    readonly value?: Expression | Unparsable;

    constructor(docs: Docs | Translations | undefined, names: Names | Translations | undefined, type?: Type | Unparsable, value?: Expression | Unparsable, share?: Token | undefined, etc?: Token | undefined, dot?: Token, colon?: Token) {
        super();

        this.docs = docs instanceof Docs ? docs : new Docs(docs);
        this.share = share;
        this.names = names instanceof Names ? names : new Names(names);
        this.etc = etc;
        this.dot = dot !== undefined ? dot : type === undefined ? undefined : new TypeToken();
        this.type = type;
        this.colon = colon !== undefined ? colon : value === undefined ? undefined : new BindToken(); 
        this.value = value;
    }
    
    getChildNames() { return ["docs", "share", "etc", "names", "dot", "type", "colon", "value"]; }

    clone(pretty: boolean=false, original?: Node | string, replacement?: Node) { 
        return new Bind(
            this.cloneOrReplaceChild(pretty, [ Docs ], "docs", this.docs, original, replacement), 
            this.cloneOrReplaceChild(pretty, [ Names ], "names", this.names, original, replacement), 
            this.cloneOrReplaceChild(pretty, [ Type, Unparsable, undefined ], "type", this.type, original, replacement), 
            this.cloneOrReplaceChild<Expression|Unparsable|undefined>(pretty, [ Expression, Unparsable, undefined ], "value", this.value, original, replacement)?.withPrecedingSpaceIfDesired(pretty),
            this.cloneOrReplaceChild(pretty, [ Token, undefined ], "share", this.share, original, replacement), 
            this.cloneOrReplaceChild(pretty, [ Token, undefined], "etc", this.etc, original, replacement), 
            this.cloneOrReplaceChild(pretty, [ Token, undefined ], "dot", this.dot, original, replacement),
            this.cloneOrReplaceChild(pretty, [ Token, undefined ], "colon", this.colon, original, replacement)
        ) as this;
    }

    hasName(name: string) { return this.names.hasName(name); }
    sharesName(bind: Bind) { return this.names.sharesName(bind.names); }
    getNames(): string[] { return this.names.getNames(); }
    
    getTranslation(lang: LanguageCode[]) {
        return this.names.getTranslation(lang);
    }

    isVariableLength() { return this.etc !== undefined; }

    hasDefault() { return !this.isRequired(); }
    isRequired() { return this.value === undefined && !this.isVariableLength(); }

    computeConflicts(context: Context): Conflict[] {

        const conflicts = [];

        // Etc tokens can't appear in block bindings, just structure and function definitions.
        if(this.isVariableLength() && this.getParent() instanceof Block)
            conflicts.push(new UnexpectedEtc(this));

        // If there's a type, the value must match.
        if(this.type instanceof Type && this.value && this.value instanceof Expression) {
            const valueType = this.value.getTypeUnlessCycle(context);
            if(!this.type.accepts(valueType, context))
                conflicts.push(new IncompatibleBind(this.type, this.value, valueType));
        }

        const enclosure = this.getBindingEnclosureOf();

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

        // If this bind isn't part of an Evaluate, it should be used in some expression in its parent.
        const parent = this.getParent();
        if(enclosure && !this.isShared() && !(parent instanceof Column || parent instanceof ColumnType || parent instanceof Cell || parent instanceof Evaluate)) {
            const uses = enclosure.nodes(n => n instanceof Reference && this.names.names.find(name => name.getName() === n.name.text.toString()) !== undefined);
            if(uses.length === 0)
                conflicts.push(new UnusedBind(this));
        }

        // Shares can only appear in the program's root block.
        if(this.share !== undefined) {
            if(!context.program.block.getChildren().includes(this))
                conflicts.push(new MisplacedShare(this, this.share));

            // Bindings must have language tags on all names to clarify what langauge they're written in.
            if(!this.names.names.every(n => n.lang !== undefined))
                conflicts.push(new MissingShareLanguages(this));

            // Other shares in this project can't have the same name
            const sources = context.source.getProject()?.getSourcesExcept(context.source);
            if(sources !== undefined) {
                for(const source of sources) {
                    if(source.program.block instanceof Block) {
                        for(const share of source.program.block.statements.filter(s => s instanceof Bind && s.isShared()) as Bind[]) {
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

    getType(context: Context): Type {

        // What type is this binding?
        let type = 
            // If it's declared, use the declaration.
            this.type instanceof Type ? 
                // Account for variable length arguments
                (
                    this.isVariableLength() ? 
                    new ListType(this.type) : 
                    this.type
                ) :
            // If the value is a structure definition, make a structure type.
            this.value instanceof StructureDefinition ? new StructureType(this.value) :
            // If it has an expression. ask the expression.
            this.value instanceof Expression ? this.value.getTypeUnlessCycle(context) :
            // Otherwise, we don't know.
            new UnknownType(this);

        // If the type is a name, and it refers to a structure, resolve it.
        // Leave names that refer to type variables to be resolved in Evaluate.
        if(type instanceof NameType) {
            const nameType = type.getType(context);
            if(nameType instanceof StructureType) return nameType;
        }
        return type;
        
    }

    getTypeUnlessCycle(context: Context): Type {

        // If the context includes this node, we're in a cycle.
        if(context.visited(this)) return new UnknownType(this);

        context.visit(this);
        const type = this.getType(context);
        context.unvisit();
        return type;   

    }

    resolveTypeName(context: Context, name: string) {

        // Find the name, using the binding enclosure, or the program.
        const enclosure = this.getBindingEnclosureOf();
        const definition = enclosure !== undefined ? enclosure.getDefinitionOfName(name, context, this) : context.program.getDefinitionOfName(name, context, this);
        if(definition === undefined) return new UnknownType(this);
        else if(definition instanceof Bind) return definition.getTypeUnlessCycle(context);
        else if(definition instanceof TypeVariable) return new UnknownType(this);
        else if(definition instanceof StructureDefinition) return new StructureType(definition);
        else return new UnknownType(this);

    }

    getDefinitionOfName() { return undefined; }

    compile(context: Context):Step[] {
        return this.value === undefined ?
            [ new Halt(evaluator => new ValueException(evaluator), this) ] :
            [ 
                new Start(this), 
                ...this.value.compile(context), 
                new Finish(this) 
            ];
    }

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

    evaluate(evaluator: Evaluator) {
        
        // Get the value we computed.
        const value = evaluator.popValue(undefined);

        // If it's an exception, return it instead of binding.
        if(value instanceof Exception) return value;

        // Bind the value on the stack to the names.
        this.names.names.forEach(alias => { 
            const name = alias.getName(); 
            if(name !== undefined) 
                evaluator.bind(name, value);
        });
 
        // Share if shared.
        if(this.isShared()) {
            for(const name of this.names.names) {
                const n = name.getName();
                if(n !== undefined)
                    evaluator.share(n, value);
            }
        }

        return undefined;

    }
    
    getDescriptions(): Translations {

        return overrideWithDocs({ 
            "😀": TRANSLATE,
            eng: "A named value" 
        }, this.docs);
        
    }

    getChildReplacement(child: Node, context: Context): Transform[] | undefined {
        if(child === this.type) {
            return getPossibleTypeReplacements(child, context);
        }
        else if(child === this.value) {
            return getExpressionReplacements(context.source, this, this.value, context, this.type instanceof Type ? this.type : new AnyType());
        }
    }

    getInsertionBefore(child: Node, context: Context, position: number): Transform[] | undefined {
        
        const parent = this.getParent();
        // Before the first name? a name? Offer an etc or a documentation
        if(child === this.names) {
            if(this.etc === undefined) {
                if((parent instanceof FunctionDefinition || parent instanceof StructureDefinition) && parent.inputs.find(input => input.contains(child)) === parent.inputs[parent.inputs.length - 1])
                    return [ 
                        new Add(context.source, position, this, "etc", new Token(PLACEHOLDER_SYMBOL, TokenType.PLACEHOLDER)),
                    ];
            }
        }
        // Before colon? Offer a type.
        else if(child === this.colon && this.type === undefined)
            return [ 
                new Replace(context.source, this, new Bind(this.docs, this.names, new TypePlaceholder(), this.value, this.etc, new TypeToken(), this.colon))
            ];

    }
    getInsertionAfter(context: Context, position: number): Transform[] | undefined {
        
        const children  = this.getChildren();
        const lastChild = children[children.length - 1];

        const withValue = new Replace(context.source, this, new Bind(this.docs, this.names, this.type, new ExpressionPlaceholder(), this.etc, this.dot, new BindToken()));

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
        
        if(child === this.type && this.dot) return new Remove(context.source, this, this.dot, this.type);
        else if(child === this.value && this.colon) return new Remove(context.source, this, this.colon, this.value);

    }

}