import Expression from "./Expression";
import Node from "./Node";
import type Transform from "../transforms/Transform"
import type Context from "./Context";
import Alias from "./Alias";
import Token from "./Token";
import Type from "./Type";
import Unparsable from "./Unparsable";
import Documentation from "./Documentation";
import type Conflict from "../conflicts/Conflict";
import { UnusedBind } from "../conflicts/UnusedBind";
import { DuplicateBinds } from "../conflicts/DuplicateBinds";
import { IncompatibleBind } from "../conflicts/IncompatibleBind";
import { UnexpectedEtc } from "../conflicts/UnexpectedEtc";
import UnknownType from "./UnknownType";
import NameType from "./NameType";
import StructureType from "./StructureType";
import StructureDefinition from "./StructureDefinition";
import TypeVariable from "./TypeVariable";
import Name from "./Name";
import Column from "./Column";
import ColumnType from "./ColumnType";
import type Evaluator from "../runtime/Evaluator";
import type Evaluable from "../runtime/Evaluable";
import type Step from "../runtime/Step";
import Start from "../runtime/Start";
import Halt from "../runtime/Halt";
import Finish from "../runtime/Finish";
import type Named from "./Named";
import { getCaseCollision, getDuplicateAliases, getDuplicateDocs } from "./util";
import Evaluate from "./Evaluate";
import Block from "./Block";
import ListType from "./ListType";
import Cell from "./Cell";
import ValueException from "../runtime/ValueException";
import type Translations from "./Translations";
import Exception from "../runtime/Exception";
import Share from "./Share";
import type Definition from "./Definition";
import { getPossibleTypeAdds, getPossibleTypeReplacements } from "../transforms/getPossibleTypes";
import { getExpressionReplacements } from "../transforms/getPossibleExpressions";
import AnyType from "./AnyType";
import { ALIAS_SYMBOL, PLACEHOLDER_SYMBOL } from "../parser/Tokenizer";
import TokenType from "./TokenType";
import TypePlaceholder from "./TypePlaceholder";
import FunctionDefinition from "./FunctionDefinition";
import ExpressionPlaceholder from "./ExpressionPlaceholder";
import type LanguageCode from "./LanguageCode";
import Append from "../transforms/Append";
import Add from "../transforms/Add";
import Replace from "../transforms/Replace";
import BindToken from "./BindToken";
import TypeToken from "./TypeToken";

export default class Bind extends Node implements Evaluable, Named {
    
    readonly docs: Documentation[];
    readonly etc: Token | undefined;
    readonly names: Alias[];
    readonly dot?: Token;
    readonly type?: Type | Unparsable;
    readonly colon?: Token;
    readonly value?: Expression | Unparsable;

    constructor(docs: Documentation[], etc: Token | undefined, names: Alias[], type?: Type | Unparsable, value?: Expression | Unparsable, dot?: Token, colon?: Token) {
        super();

        this.docs = docs;
        this.etc = etc;
        this.names = names;
        this.dot = dot !== undefined ? dot : type === undefined ? undefined : new TypeToken();
        this.type = type;
        this.colon = colon !== undefined ? colon : value === undefined ? undefined : new BindToken(); 
        this.value = value;
    }

    hasName(name: string) { return this.names.find(n => n.getName() === name) !== undefined; }
    sharesName(bind: Bind) { return this.getNames().find(name => bind.hasName(name)) !== undefined; }
    getNames(): string[] { return this.names.map(n => n.getName()).filter(n => n !== undefined) as string[]; }
    getNameInLanguage(lang: LanguageCode) { return this.names.find(name => name.isLanguage(lang))?.getName() ?? this.names[0]?.getName(); }

    isVariableLength() { return this.etc !== undefined; }

    hasDefault() { return !this.isRequired(); }
    isRequired() { return this.value === undefined && !this.isVariableLength(); }

    computeChildren() { 
        let children: Node[] = [];
        children = children.concat(this.docs);
        if(this.etc) children.push(this.etc);
        children = children.concat(this.names);
        if(this.dot) children.push(this.dot);
        if(this.type) children.push(this.type);
        if(this.colon) children.push(this.colon);
        if(this.value) children.push(this.value);
        return children;
    }

    computeConflicts(context: Context): Conflict[] {

        const conflicts = [];

        // Can't have duplicate docs
        const duplicateDocs = getDuplicateDocs(this.docs);
        if(duplicateDocs) conflicts.push(duplicateDocs);

        // Etc tokens can't appear in block bindings, just structure and function definitions.
        if(this.isVariableLength() && this.getParent() instanceof Block)
            conflicts.push(new UnexpectedEtc(this));

        // Bind aliases have to be unique
        const duplicates = getDuplicateAliases(this.names);
        if(duplicates) conflicts.push(duplicates);

        // If there's a type, the value must match.
        if(this.type instanceof Type && this.value && this.value instanceof Expression) {
            const valueType = this.value.getTypeUnlessCycle(context);
            if(!this.type.accepts(valueType, context))
                conflicts.push(new IncompatibleBind(this.type, this.value, valueType));
        }

        const enclosure = this.getBindingEnclosureOf();

        // It can't already be defined.
        if(enclosure !== undefined) {
            const definitions = this.names.reduce((definitions: Definition[], alias) => {
                const name: string | undefined = alias.getName();
                return name === undefined ? definitions : definitions.concat(enclosure.getAllDefinitionsOfName(name, context, this));
            }, []).filter(def => def !== undefined && def !== this && (def instanceof Bind || def instanceof TypeVariable)) as (Bind | TypeVariable)[];
            if(definitions.length > 0)
                conflicts.push(new DuplicateBinds(this, definitions));
        }

        // Warn if there are similarly cased definitions.
        // Is there match with the other case?
        if(enclosure !== undefined) {
            this.names.forEach(alias => {
                // Is there match with the other case?
                const name = alias.getName();
                if(name !== undefined) {
                    const caseCollision = getCaseCollision(name, enclosure, context, alias);
                    if(caseCollision) conflicts.push(caseCollision);
                }
            });
        }

        // If this bind isn't part of an Evaluate or a Share, it should be used in some expression in its parent.
        const parent = this.getParent();
        if(enclosure && !(parent instanceof Share || parent instanceof Column || parent instanceof ColumnType || parent instanceof Cell || parent instanceof Evaluate)) {
            const uses = enclosure.nodes(n => n instanceof Name && this.names.find(name => name.getName() === n.name.text.toString()) !== undefined);
            if(uses.length === 0)
                conflicts.push(new UnusedBind(this));
        }

        return conflicts;

    }

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
            "eng": "Evaluate the value first"
        }
    }

    getFinishExplanations(): Translations {
        return {
            "eng": "Bind the value to this name."
        }
    }

    evaluate(evaluator: Evaluator) {
        
        // Get the value we computed.
        const value = evaluator.popValue(undefined);

        // If it's an exception, return it instead of binding.
        if(value instanceof Exception) return value;

        // Bind the value on the stack to the names.
        this.names.forEach(alias => { 
            const name = alias.getName(); 
            if(name !== undefined) 
                evaluator.bind(name, value);
        });

        return undefined;

    }

    clone(original?: Node | string, replacement?: Node) { 
        return new Bind(
            this.cloneOrReplaceChild([ Documentation ], "docs", this.docs, original, replacement), 
            this.cloneOrReplaceChild([ Token, undefined], "etc", this.etc, original, replacement), 
            this.cloneOrReplaceChild([ Alias ], "names", this.names, original, replacement), 
            this.cloneOrReplaceChild([ Type, Unparsable, undefined ], "type", this.type, original, replacement), 
            this.cloneOrReplaceChild([ Expression, Unparsable, undefined ], "value", this.value, original, replacement), 
            this.cloneOrReplaceChild([ Token, undefined ], "dot", this.dot, original, replacement),
            this.cloneOrReplaceChild([ Token, undefined ], "colon", this.colon, original, replacement)
        ) as this;
    }
    
    getDescriptions() {

        // Generate documentation by language.
        const descriptions: Record<LanguageCode, string> = { eng: "A named value" };
        for(const doc of this.docs) {
            if(doc.lang !== undefined)
                descriptions[doc.lang.getLanguage() as LanguageCode] = doc.docs.getText();
        }
        return descriptions;
        
    }

    getReplacementChild(child: Node, context: Context): Transform[] | undefined {
        if(child === this.type) {
            return getPossibleTypeReplacements(child, context);
        }
        else if(child === this.value) {
            return getExpressionReplacements(context.source, this, this.value, context, this.type instanceof Type ? this.type : new AnyType());
        }
    }

    getInsertionBefore(child: Node, context: Context, position: number): Transform[] | undefined {
        
        const parent = this.getParent();
        // Before the … or a documentation? Suggest more documentation.
        if(this.etc === child || this.docs.includes(child as Documentation))
            return [ new Append(context.source, position, this, this.docs, child, new Documentation()) ];
        // Before the first name? a name? Offer an etc or a documentation
        else if(child === this.names[0]) {
            if(this.etc === undefined) {
                if((parent instanceof FunctionDefinition || parent instanceof StructureDefinition) && parent.inputs.find(input => input.contains(child)) === parent.inputs[parent.inputs.length - 1])
                    return [ 
                        new Add(context.source, position, this, "etc", new Token(PLACEHOLDER_SYMBOL, TokenType.PLACEHOLDER)), 
                        new Append(context.source, position, this, this.docs, child, new Documentation())
                    ];
            }
        }
        // Before the etc? Offer documentation
        else if(child === this.etc)
            return [ new Append(context.source, position, this, this.docs, undefined, new Documentation()) ];
        else if(this.names.includes(child as Alias))
            return [ new Append(context.source, position, this, this.names, child, new Alias(PLACEHOLDER_SYMBOL, undefined, new Token(ALIAS_SYMBOL, TokenType.ALIAS))) ];
        // Before colon? Offer a type.
        else if(child === this.colon && this.type === undefined)
            return [ 
                new Replace(context.source, this, new Bind(this.docs, this.etc, this.names, new TypePlaceholder(), this.value, new TypeToken(), this.colon))
            ];

    }
    getInsertionAfter(context: Context, position: number): Transform[] | undefined {
        
        const children  = this.getChildren();
        const lastChild = children[children.length - 1];

        const withValue = new Replace(context.source, this, new Bind(this.docs, this.etc, this.names, this.type, new ExpressionPlaceholder(), this.dot, new BindToken()));

        if(this.names.includes(lastChild as Alias))
            return [
                new Append(context.source, position, this, this.names, undefined, new Alias(PLACEHOLDER_SYMBOL, undefined, new Token(ALIAS_SYMBOL, TokenType.ALIAS))),
                new Replace(context.source, this, new Bind(this.docs, this.etc, this.names, new TypePlaceholder(), this.value, new TypeToken(), this.colon)),
                withValue
            ];
        else if(lastChild === this.dot)
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


}