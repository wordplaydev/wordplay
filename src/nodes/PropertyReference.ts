import type Conflict from "../conflicts/Conflict";
import { UnknownProperty } from "../conflicts/UnknownProperty";
import Expression from "./Expression";
import Token from "./Token";
import type Type from "./Type";
import type Evaluator from "../runtime/Evaluator";
import type Step from "../runtime/Step";
import Start from "../runtime/Start";
import Finish from "../runtime/Finish";
import type Context from "./Context";
import type Node from "./Node";
import StructureDefinitionType from "./StructureDefinitionType";
import Bind from "./Bind";
import UnionType from "./UnionType";
import type TypeSet from "./TypeSet";
import Conditional from "./Conditional";
import Is from "./Is";
import { PROPERTY_SYMBOL, PLACEHOLDER_SYMBOL } from "../parser/Tokenizer";
import TokenType from "./TokenType";
import type Translations from "./Translations";
import { TRANSLATE } from "./Translations"
import { getExpressionReplacements, getPossiblePostfix } from "../transforms/getPossibleExpressions";
import TypeVariable from "./TypeVariable";
import type Transform from "../transforms/Transform"
import NameException from "../runtime/NameException";
import NativeType from "./NativeType";
import Replace from "../transforms/Replace";
import FunctionDefinition from "./FunctionDefinition";
import StructureDefinition from "./StructureDefinition";
import Evaluate from "./Evaluate";
import ExpressionPlaceholder from "./ExpressionPlaceholder";
import NameToken from "./NameToken";
import PlaceholderToken from "./PlaceholderToken";
import { NameLabels } from "./Name";
import type Definition from "./Definition";
import type Value from "../runtime/Value";
import StreamType from "./StreamType";
import Reference from "./Reference";
import NameType from "./NameType";
import UnknownNameType from "./UnknownNameType";

export default class PropertyReference extends Expression {

    readonly structure: Expression;
    readonly dot: Token;
    readonly name?: Reference;

    _unionType: Type | undefined;

    constructor(subject: Expression, dot: Token, name?: Reference) {
        super();

        this.structure = subject;
        this.dot = dot;
        this.name = name;

        this.computeChildren();

    }

    static make(subject: Expression, name: Reference) {
        return new PropertyReference(subject, new Token(PROPERTY_SYMBOL, TokenType.ACCESS), name);
    }

    getGrammar() { 
        return [
            { name: "structure", types: [ Expression ] },
            { name: "dot", types: [ Token ] },
            { name: "name", types: [ Reference, undefined ] },
        ];
    }

    replace(original?: Node, replacement?: Node) { 
        return new PropertyReference(
            this.replaceChild("structure", this.structure, original, replacement),
            this.replaceChild("dot", this.dot, original, replacement),
            this.replaceChild("name", this.name, original, replacement)
        ) as this;
    }

    computeConflicts(context: Context): Conflict[] {

        const conflicts = [];

        const def = this.getDefinition(context);
        if(def === undefined)
            conflicts.push(new UnknownProperty(this));

        return conflicts;
    }

    isBindingEnclosureOfChild(child: Node): boolean { return child === this.name; }

    getDefinitions(_: Node, context: Context): Definition[] {

        const subjectType = this.getSubjectType(context);

        if(subjectType instanceof StructureDefinitionType) return subjectType.structure.getDefinitions(_);
        else return subjectType.getDefinitions(_, context); 

    }

    getDefinition(context: Context): Definition | undefined {
        if(this.name === undefined) return undefined;

        const subjectType = this.getSubjectType(context);
        
        if(subjectType instanceof StructureDefinitionType) return subjectType.getDefinition(this.name.getName());
        else return subjectType.getDefinitionOfName(this.name.getName(), context, this); 
        
    }

    getSubjectType(context: Context): Type {
        let structureType = this.structure.getType(context);
        // If it's a stream, get the type of the stream, since streams are evaluated to their values, not themselves.
        if(structureType instanceof StreamType)
            structureType = structureType.type;
        return structureType;
    }

    computeType(context: Context): Type {

        // Get the structure type
        const subjectType = this.getSubjectType(context);

        // Get the definition.
        const def = this.getDefinition(context);

        // No definition? Unknown type.
        if(def === undefined || def instanceof TypeVariable) return new UnknownNameType(this, this.name?.name, subjectType);

        // Get the type of the definition.
        let type = def.getType(context);
        
        if(def instanceof Bind) {

            if(type instanceof NameType) {
                const bindType = type.resolve(context);
                if(bindType instanceof TypeVariable && subjectType instanceof StructureDefinitionType) {
                    const typeInput = subjectType.resolveTypeVariable(bindType.getNames()[0]);
                    if(typeInput)
                        type = typeInput;
                }   
            }

            // Narrow the type if it's a union.

            // Is the type a union? Find the subset of types that are feasible, given any type checks in conditionals.
            if(type instanceof UnionType && this._unionType === undefined) {

                // Find any conditionals with type checks that refer to the value bound to this name.
                // Reverse them so they are in furthest to nearest ancestor, so we narrow types in execution order.
                const guards = context.get(this)?.getAncestors()?.filter(a => 
                        // Guards must be conditionals
                        a instanceof Conditional &&
                        // Guards must have references to this same property in a type check
                        a.condition.nodes(
                            n =>    this.name !== undefined &&
                                    context.get(n)?.getParent() instanceof Is && 
                                    n instanceof PropertyReference && 
                                    n.getSubjectType(context) instanceof StructureDefinitionType && 
                                    def === (n.getSubjectType(context) as StructureDefinitionType).getDefinition(this.name.getName())
                        ).length > 0
                    ).reverse() as Conditional[];

                // Grab the furthest ancestor and evaluate possible types from there.
                const root = guards[0];
                if(root !== undefined) {
                    let possibleTypes = type.getTypeSet(context);
                    root.evaluateTypeSet(def, possibleTypes, possibleTypes, context);
                }
            }
            
            return this._unionType !== undefined ? this._unionType : type;

        }
        else 
        return type;
    }

    getDependencies(): Expression[] {
        return [ this.structure ];
    }

    compile(context: Context):Step[] {
        
        return [ new Start(this), ...this.structure.compile(context), new Finish(this) ]

    }

    evaluate(evaluator: Evaluator, prior: Value | undefined): Value {
        
        if(prior) return prior;

        const subject = evaluator.popValue(undefined);
        if(this.name === undefined) return new NameException("", evaluator);
        const name = this.name.getName();
        return subject.resolve(name, evaluator) ?? new NameException(name, evaluator);

    }

    evaluateTypeSet(bind: Bind, original: TypeSet, current: TypeSet, context: Context) { 
        if(this.structure instanceof Expression) {
            const possibleTypes = this.structure.evaluateTypeSet(bind, original, current, context);
            this._unionType = UnionType.getPossibleUnion(context, possibleTypes.list());
        }
        return current;
    }

    getNameTransforms(context: Context) {

        const subjectType = this.getSubjectType(context);
        // For the name, what names exist on the subject that match the current name?
        const definitions = 
            subjectType instanceof StructureDefinitionType ? subjectType.structure.getDefinitions(this) :
            subjectType instanceof NativeType ? subjectType?.getDefinitions(this, context) : [];
        return definitions
            .filter(def => def.getNames().find(n => this.name === undefined || this.name.getName() === PLACEHOLDER_SYMBOL || n.startsWith(this.name.getName())) !== undefined);

    }

    getChildReplacement(child: Node, context: Context): Transform[] | undefined {

        if(child === this.structure)
            return getExpressionReplacements(this, this.structure, context);
        else if(child === this.name)
            return this.getNameTransforms(context)
                .map(def => new Replace<Token>(context, child, [ name => new NameToken(name), def ]));

    }

    getInsertionBefore(): Transform[] | undefined { return undefined; }

    getInsertionAfter(context: Context): Transform[] | undefined {

        return [
            ...getPossiblePostfix(context, this, this.getType(context)),
            ...(this.dot === undefined ? [] : 
                    this.getNameTransforms(context)
                    .map(def => (def instanceof FunctionDefinition || def instanceof StructureDefinition) ? 
                        // Include 
                        new Replace(context, this, [ name => Evaluate.make(
                            PropertyReference.make(this.structure, Reference.make(name)), 
                            def.inputs.filter(input => !input.hasDefault()).map(() => new ExpressionPlaceholder())
                        ), def ]) : 
                        new Replace(context, this, [ name => PropertyReference.make(this.structure, Reference.make(name)), def ])
                    )
            )
        ]

    }

    getChildRemoval(child: Node, context: Context): Transform | undefined {
        
        if(child === this.structure) return new Replace(context, child, new ExpressionPlaceholder());
        else if(child === this.name) return new Replace(context, child, new PlaceholderToken());

    }

    getChildPlaceholderLabel(child: Node): Translations | undefined {
        if(child === this.name) return NameLabels;
    }

    getDescriptions(): Translations {
        return {
            "😀": TRANSLATE,
            eng: "Get a named value on a structure"
        }
    }

    getStart() { return this.dot; }
    getFinish() { return this.name ?? this.dot; }

    getStartExplanations(): Translations { 
        return {
            "😀": TRANSLATE,
            eng: "First evaluate the structure."
        }
     }

    getFinishExplanations(): Translations {
        return {
            "😀": TRANSLATE,
            eng: "Now find the name in this structure."
        }
    }

}