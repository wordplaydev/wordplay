import type Conflict from '@conflicts/Conflict';
import { DisallowedInputs } from '@conflicts/DisallowedInputs';
import { IncompleteImplementation } from '@conflicts/IncompleteImplementation';
import NotAnInterface from '@conflicts/NotAnInterface';
import { UnimplementedInterface } from '@conflicts/UnimplementedInterface';
import type LocaleText from '@locale/LocaleText';
import type { NodeDescriptor } from '@locale/NodeTexts';
import type Evaluator from '@runtime/Evaluator';
import Finish from '@runtime/Finish';
import Initialize from '@runtime/Initialize';
import Start from '@runtime/Start';
import StartFinish from '@runtime/StartFinish';
import type Step from '@runtime/Step';
import InternalException from '@values/InternalException';
import StructureDefinitionValue from '@values/StructureDefinitionValue';
import type Value from '@values/Value';
import { Purpose } from '@concepts/Purpose';
import type Locales from '@locale/Locales';
import Characters from '../lore/BasisCharacters';
import { SHARE_SYMBOL } from '@parser/Symbols';
import Bind from '@nodes/Bind';
import Block from '@nodes/Block';
import type Context from '@nodes/Context';
import ConversionDefinition from '@nodes/ConversionDefinition';
import type Definition from '@nodes/Definition';
import DefinitionExpression from '@nodes/DefinitionExpression';
import Docs from '@nodes/Docs';
import EvalCloseToken from '@nodes/EvalCloseToken';
import EvalOpenToken from '@nodes/EvalOpenToken';
import Evaluate from '@nodes/Evaluate';
import Expression, { ExpressionKind, type GuardContext } from '@nodes/Expression';
import ExpressionPlaceholder from '@nodes/ExpressionPlaceholder';
import FunctionDefinition from '@nodes/FunctionDefinition';
import Names from '@nodes/Names';
import NameType from '@nodes/NameType';
import type Node from '@nodes/Node';
import { list, node, optional, type Grammar, type Replacement } from '@nodes/Node';
import Reference from '@nodes/Reference';
import StructureDefinitionType from '@nodes/StructureDefinitionType';
import StructureType from '@nodes/StructureType';
import { Sym } from '@nodes/Sym';
import Token from '@nodes/Token';
import Type from '@nodes/Type';
import type TypeSet from '@nodes/TypeSet';
import TypeToken from '@nodes/TypeToken';
import TypeVariables from '@nodes/TypeVariables';
import { getEvaluationInputConflicts } from '@nodes/util';

export default class StructureDefinition extends DefinitionExpression {
    readonly docs: Docs;
    readonly share: Token | undefined;
    readonly type: Token;
    readonly names: Names;
    readonly interfaces: Reference[];
    readonly types: TypeVariables | undefined;
    readonly open: Token;
    readonly inputs: Bind[];
    readonly close: Token;
    readonly expression: Block | undefined;

    // PERF: Cache definitions to avoid having to recreate the list.
    #definitionsCache: Map<Node, Definition[]> = new Map();

    /** Optional native builder for `↑` static binds. Set by basis-structure
     *  creators (e.g., `createColorType`) whose static-bind values are
     *  better constructed directly in TypeScript than evaluated from
     *  Wordplay source. User-defined structures get their statics populated
     *  by the normal compile + evaluate flow (see `compile`/`evaluate`
     *  below), but basis structures are looked up via
     *  `Evaluation.resolveDefault` and never reach that flow — so they
     *  opt in to a builder that runs once on first static-member access,
     *  with its result cached. */
    staticBuilder?: (
        evaluator: import('@runtime/Evaluator').default,
        def: StructureDefinition,
    ) => Map<Bind, Value>;

    constructor(
        docs: Docs | undefined,
        share: Token | undefined,
        type: Token,
        names: Names,
        interfaces: Reference[],
        types: TypeVariables | undefined,
        open: Token,
        inputs: Bind[],
        close: Token,
        block?: Block,
    ) {
        super();

        this.docs = docs ?? Docs.make();
        this.share = share;
        this.type = type;
        this.names = names;
        this.interfaces = interfaces;
        this.types = types;
        this.open = open;
        this.inputs = inputs;
        this.close = close;
        this.expression = block;

        this.computeChildren();
    }

    static make(
        docs: Docs | undefined,
        names: Names,
        interfaces: Reference[],
        types: TypeVariables | undefined,
        inputs: Bind[],
        block?: Block,
    ) {
        return new StructureDefinition(
            docs,
            undefined,
            new TypeToken(),
            names instanceof Names ? names : Names.make(names),
            interfaces,
            types,
            new EvalOpenToken(),
            inputs,
            new EvalCloseToken(),
            block,
        );
    }

    /** Never makes sense to replace something with a structure definition. */
    static getPossibleReplacements() {
        return [];
    }

    static getPossibleInsertions() {
        return [
            StructureDefinition.make(
                undefined,
                Names.make(['_']),
                [],
                undefined,
                [],
                Block.make(),
            ),
        ];
    }

    /**
     * Used by Evaluator to get the steps for the evaluation of this structure definition.
     * Asks the block for its steps, but filters out any `↑` static
     * statements: those evaluate once at definition time (see `compile`
     * below), not per-instance. Without this filter, evaluating an
     * instance would re-run every static bind, and a self-referencing
     * static bind (e.g. `↑ red: 🌈(…)` on `Color`) would recurse forever.
     */
    getEvaluationSteps(evaluator: Evaluator, context: Context): Step[] {
        const block = this.expression;
        if (block === undefined) return [];
        const statementSteps = block.statements
            .filter((s) => {
                if (s instanceof Bind && s.isStatic(context)) return false;
                if (
                    s instanceof FunctionDefinition &&
                    s.isStatic(context)
                )
                    return false;
                return true;
            })
            .reduce(
                (prev: Step[], current) => [
                    ...prev,
                    ...current.compile(evaluator, context),
                ],
                [],
            );
        return [
            ...statementSteps,
            // Mirrors Block.getEvaluationSteps' trailing collect.
            new Initialize(block, (e: Evaluator) => block.collect(e)),
        ];
    }

    /** True when this structure has any `↑` static binds that need to be
     *  evaluated at definition time (when the structure value is first
     *  created in the surrounding scope). */
    hasStaticBinds(context: Context): boolean {
        return this.getStaticBindsWithValues(context).length > 0;
    }

    getDescriptor(): NodeDescriptor {
        return 'StructureDefinition';
    }

    getGrammar(): Grammar {
        return [
            {
                name: 'docs',
                kind: optional(node(Docs)),
                label: () => (l) => l.node.StructureDefinition.label.docs,
            },
            {
                name: 'share',
                kind: optional(node(Sym.Share)),
                getToken: () => new Token(SHARE_SYMBOL, Sym.Share),
                label: undefined,
            },
            { name: 'type', kind: node(Sym.Type), label: undefined },
            { name: 'names', kind: node(Names), label: undefined },
            {
                name: 'interfaces',
                kind: list(true, node(Reference)),
                space: true,
                label: () => (l) => l.node.StructureDefinition.label.interfaces,
            },
            {
                name: 'types',
                kind: optional(node(TypeVariables)),
                space: true,
                label: undefined,
            },
            { name: 'open', kind: node(Sym.EvalOpen), label: undefined },
            {
                name: 'inputs',
                kind: list(true, node(Bind)),
                space: true,
                indent: true,
                label: () => (l) => l.node.StructureDefinition.label.inputs,
            },
            { name: 'close', kind: node(Sym.EvalClose), label: undefined },
            {
                name: 'expression',
                kind: optional(node(Block)),
                space: true,
                indent: !(this.expression instanceof Block),
                label: () => (l) => l.node.StructureDefinition.label.expression,
            },
        ];
    }

    clone(replace?: Replacement) {
        return new StructureDefinition(
            this.replaceChild('docs', this.docs, replace),
            this.replaceChild('share', this.share, replace),
            this.replaceChild('type', this.type, replace),
            this.replaceChild('names', this.names, replace),
            this.replaceChild('interfaces', this.interfaces, replace),
            this.replaceChild('types', this.types, replace),
            this.replaceChild('open', this.open, replace),
            this.replaceChild('inputs', this.inputs, replace),
            this.replaceChild('close', this.close, replace),
            this.replaceChild('expression', this.expression, replace),
        ) as this;
    }

    getPurpose() {
        return Purpose.Definitions;
    }

    getNames() {
        return this.names.getNames();
    }

    hasName(name: string) {
        return this.names.hasName(name);
    }

    isShared() {
        return this.share !== undefined;
    }

    getPreferredName(locales: LocaleText[]): string {
        return this.names.getPreferredNameString(locales);
    }

    isEvaluationInvolved() {
        return true;
    }

    getEvaluateTemplate(
        nameOrLocales: Locales | string,
        context: Context,
        defaults: boolean,
        symbolic = false,
    ): Evaluate | ExpressionPlaceholder {
        // In case for some reason an input of this refers to this.
        if (context.visited(this)) return ExpressionPlaceholder.make();
        context.visit(this);
        const evaluate = Evaluate.make(
            Reference.make(
                typeof nameOrLocales === 'string'
                    ? nameOrLocales
                    : nameOrLocales.getName(this.names, symbolic),
                this,
            ),
            this.inputs
                .filter((input) => !input.hasDefault())
                .map((input) =>
                    input.type
                        ? defaults
                            ? (input.type.getDefaultExpression(context) ??
                              ExpressionPlaceholder.make())
                            : ExpressionPlaceholder.make()
                        : ExpressionPlaceholder.make(),
                ),
        );
        context.unvisit();

        return evaluate;
    }

    isEvaluationRoot() {
        return true;
    }

    getScopeOfChild(child: Node, context: Context): Node | undefined {
        // This is the scope of the expression and inputs, and its parent is for everything else.
        return child === this.expression || this.inputs.includes(child as Bind)
            ? this
            : this.getParent(context);
    }

    getInputs() {
        return this.inputs.filter((i) => i instanceof Bind) as Bind[];
    }

    /** Create a new structure definition with the provided inputs instead */
    withInputs(inputs: Bind[]) {
        // Identical inputs? Don't clone.
        if (
            this.inputs.length === inputs.length &&
            this.inputs.every((input, index) => input === inputs[index])
        )
            return this;
        else
            return this.clone({
                original: 'inputs',
                replacement: inputs,
                report: 'console',
            });
    }

    getTypeVariableReference(index: number): NameType | undefined {
        const typeVar = this.types?.variables[index];
        return typeVar === undefined ? undefined : typeVar.getReference();
    }

    isInterface(): boolean {
        return (
            this.inputs.length === 0 &&
            this.getImplementedFunctions().length === 0
        );
    }

    getTypeReference(): NameType {
        return new NameType(this.getNames()[0], undefined, this);
    }

    getReference(locales: Locales): Reference {
        return Reference.make(locales.getName(this.names), this);
    }

    getAbstractFunctions(): FunctionDefinition[] {
        return this.getFunctions(false);
    }

    getImplementedFunctions(): FunctionDefinition[] {
        return this.getFunctions(true);
    }

    implements(def: StructureDefinition, context: Context) {
        return this.interfaces.some((i) => i.refersTo(context, def));
    }

    getFunctions(implemented?: boolean): FunctionDefinition[] {
        if (this.expression === undefined) return [];
        return this.expression.statements
            .map((s) =>
                s instanceof FunctionDefinition
                    ? s
                    : s instanceof Bind && s.value instanceof FunctionDefinition
                      ? s.value
                      : undefined,
            )
            .filter(
                (s) =>
                    s !== undefined &&
                    (implemented === undefined ||
                        (implemented === true && !s.isAbstract()) ||
                        (implemented === false && s.isAbstract())),
            ) as FunctionDefinition[];
    }

    /** Gets bindings that aren't functions */
    getProperties(): Bind[] {
        if (this.expression === undefined) return [];
        return this.expression.statements.filter<Bind>(
            (s: Expression): s is Bind =>
                s instanceof Bind && !(s.value instanceof FunctionDefinition),
        );
    }

    getInterfaces(context: Context): StructureDefinition[] {
        let interfaces: StructureDefinition[] = [];
        for (const int of this.interfaces) {
            const def = int.resolve(context);
            if (def instanceof StructureDefinition) {
                interfaces.push(def);
                interfaces = [...interfaces, ...def.getInterfaces(context)];
            }
        }
        return interfaces;
    }

    computeConflicts(context: Context): Conflict[] {
        let conflicts: Conflict[] = [];

        // Inputs must be valid.
        conflicts = conflicts.concat(getEvaluationInputConflicts(this.inputs));

        // Interfaces must be interfaces
        for (const int of this.interfaces) {
            const def = int.resolve(context);
            if (
                def !== undefined &&
                (!(def instanceof StructureDefinition) ||
                    (def instanceof StructureDefinition && !def.isInterface()))
            )
                conflicts.push(new NotAnInterface(def, int));
        }

        // If the structure has unimplemented functions, it can't have any implemented functions or any inputs.
        if (this.getAbstractFunctions().length > 0) {
            const implemented = this.getImplementedFunctions();
            if (implemented.length > 0)
                conflicts.push(new IncompleteImplementation(this));
            if (this.inputs.length > 0)
                conflicts.push(new DisallowedInputs(this));
        }

        // If the structure specifies one or more interfaces, and it provides at least one implementation, must implement all interfaces
        // (any interfaces its interfaces implement)
        if (
            this.interfaces.length > 0 &&
            this.expression instanceof Block &&
            this.expression.statements.some(
                (s) => s instanceof FunctionDefinition && !s.isAbstract(),
            )
        ) {
            for (const def of this.getInterfaces(context)) {
                const abstractFunctions = def.getAbstractFunctions();
                for (const fun of abstractFunctions) {
                    // Does this structure implement the given abstract function on the interface?
                    if (
                        !this.expression.statements.some(
                            (statement) =>
                                statement instanceof FunctionDefinition &&
                                fun.accepts(statement, context),
                        )
                    )
                        conflicts.push(
                            new UnimplementedInterface(this, def, fun),
                        );
                }
            }
        }

        return conflicts;
    }

    getDefinition(
        name: string,
    ): Bind | FunctionDefinition | StructureDefinition | undefined {
        // Definitions can be inputs...
        const inputBind = this.inputs.find(
            (i) => i instanceof Bind && i.hasName(name),
        ) as Bind;
        if (inputBind !== undefined) return inputBind;

        // ...or they can be in a structure's block binds.
        return this.expression !== undefined
            ? (this.expression.statements.find(
                  (i) =>
                      (i instanceof StructureDefinition ||
                          i instanceof FunctionDefinition ||
                          i instanceof Bind) &&
                      i.names.hasName(name),
              ) as FunctionDefinition | StructureDefinition | Bind)
            : undefined;
    }

    /** The subset of block statements that are static (`↑ ƒ` or `↑ name:`).
     *  Static members live on the definition itself, not on instances. */
    getStaticDefinitions(context: Context): (Bind | FunctionDefinition)[] {
        if (!(this.expression instanceof Block)) return [];
        return this.expression.statements.filter(
            (s): s is Bind | FunctionDefinition =>
                (s instanceof Bind || s instanceof FunctionDefinition) &&
                s.isStatic(context),
        );
    }

    /** Resolve a name against this structure's static members only. Used by
     *  `Foo.bar` when `Foo` refers to the definition itself. */
    getStaticDefinition(
        name: string,
        context: Context,
    ): Bind | FunctionDefinition | undefined {
        return this.getStaticDefinitions(context).find((s) => s.hasName(name));
    }

    getDefinitions(node: Node, context: Context): Definition[] {
        // Does an input delare the name that isn't the one asking?
        let definitions = this.#definitionsCache.get(node);
        if (definitions === undefined) {
            // Inputs aren't bound until the object is fully constructed, so
            // an input's default-value expression can't reference its sibling
            // inputs. Exclude all inputs from scope when the asking node is
            // inside any input (the existing `i !== node` only handled the
            // case where the asker IS the input itself).
            const askerInsideInput = this.inputs.some(
                (i) => i instanceof Bind && i.contains(node),
            );
            // Static members (`↑ ƒ` / `↑ name:`) don't have access to
            // instance inputs — they live on the definition itself, so the
            // instance isn't bound yet when they evaluate. Detect by walking
            // statements: if any direct static block-statement contains the
            // asker, exclude inputs from scope.
            const askerInsideStatic =
                this.expression instanceof Block &&
                this.expression.statements.some(
                    (s) =>
                        (s instanceof Bind || s instanceof FunctionDefinition) &&
                        s.isStatic(context) &&
                        s.contains(node),
                );
            definitions = [
                ...(askerInsideInput || askerInsideStatic
                    ? []
                    : (this.inputs.filter(
                          (i) => i instanceof Bind && i !== node,
                      ) as Bind[])),
                ...(this.types ? this.types.variables : []),
                ...(this.expression instanceof Block
                    ? (this.expression.statements.filter(
                          (s) =>
                              s instanceof FunctionDefinition ||
                              s instanceof StructureDefinition ||
                              s instanceof Bind,
                      ) as Definition[])
                    : []),
            ];
            this.#definitionsCache.set(node, definitions);
        }
        return definitions;
    }

    /**
     * Given an execution context and input and output types, find a conversion function defined on this structure that converts between the two.
     */
    getConversion(
        context: Context,
        input: Type,
        output: Type,
    ): ConversionDefinition | undefined {
        // Find the conversion in this type's block that produces a compatible type.
        return this.expression instanceof Block
            ? (this.expression.statements.find(
                  (s) =>
                      s instanceof ConversionDefinition &&
                      s.input instanceof Type &&
                      s.output instanceof Type &&
                      s.convertsTypeTo(input, output, context),
              ) as ConversionDefinition | undefined)
            : undefined;
    }

    getAllConversions() {
        return this.expression instanceof Block
            ? (this.expression.statements.filter(
                  (s) => s instanceof ConversionDefinition,
              ) as ConversionDefinition[])
            : [];
    }

    computeType(): Type {
        return new StructureDefinitionType(new StructureType(this));
    }

    getDependencies(): Expression[] {
        return this.expression instanceof Block ? [this.expression] : [];
    }

    compile(evaluator: Evaluator, context: Context): Step[] {
        const statics = this.getStaticBindsWithValues(context);
        if (statics.length === 0) return [new StartFinish(this)];
        // Bind the structure to its name *before* evaluating any static
        // bind values. Otherwise a static bind whose value references the
        // enclosing structure (e.g. `↑ red: 🌈(…)` on `Color`) would fail
        // to resolve its own type at runtime. The Finish step then
        // populates the already-bound StructureDefinitionValue's statics
        // map from the stack.
        const steps: Step[] = [
            new Start(this, (e) => {
                const closure = e.getCurrentEvaluation();
                if (closure === undefined)
                    return new InternalException(
                        this,
                        e,
                        'there is no evaluation, which should be impossible',
                    );
                const def = new StructureDefinitionValue(
                    this,
                    closure,
                    new Map(),
                );
                e.bind(this.names, def);
                return undefined;
            }),
        ];
        for (const bind of statics)
            if (bind.value)
                steps.push(...bind.value.compile(evaluator, context));
        steps.push(new Finish(this));
        return steps;
    }

    /** The subset of static block-statement binds that have a default value
     *  expression to evaluate at definition time. */
    getStaticBindsWithValues(context: Context): Bind[] {
        return this.getStaticDefinitions(context).filter(
            (s): s is Bind => s instanceof Bind && s.value !== undefined,
        );
    }

    evaluate(evaluator: Evaluator): Value {
        const closure = evaluator.getCurrentEvaluation();
        if (closure === undefined)
            return new InternalException(
                this,
                evaluator,
                'there is no evaluation, which should be impossible',
            );

        // Two compile paths converge here:
        //  1. No static binds → `StartFinish(this)` ran; just construct the
        //     StructureDefinitionValue and bind it.
        //  2. Static binds → the Start action already created and bound the
        //     definition value. The static-bind value expressions then ran
        //     between Start and Finish, leaving their values on the stack.
        //     Pop them in reverse (they were pushed in source order) and
        //     populate the already-bound StructureDefinitionValue's statics
        //     map.
        const context = closure.getContext();
        const statics = this.getStaticBindsWithValues(context);

        if (statics.length === 0) {
            const def = new StructureDefinitionValue(this, closure, new Map());
            evaluator.bind(this.names, def);
            return def;
        }

        const bound = closure.resolve(this.names);
        const def =
            bound instanceof StructureDefinitionValue
                ? bound
                : new StructureDefinitionValue(this, closure, new Map());
        for (let i = statics.length - 1; i >= 0; i--) {
            const value = evaluator.popValue(this);
            def.statics.set(statics[i], value);
        }
        // In the unlikely event the Start action didn't bind (e.g. fresh
        // Definition value above), bind now.
        if (!(bound instanceof StructureDefinitionValue))
            evaluator.bind(this.names, def);
        return def;
    }

    evaluateTypeGuards(current: TypeSet, guard: GuardContext) {
        if (this.expression instanceof Expression)
            this.expression.evaluateTypeGuards(current, guard);
        return current;
    }

    getStart() {
        return this.type;
    }

    getFinish() {
        return this.names;
    }

    /** Only equal if the same structure definition. */
    isEquivalentTo(definition: Definition) {
        return definition === this;
    }

    static readonly LocalePath = (l: LocaleText) => l.node.StructureDefinition;
    getLocalePath() {
        return StructureDefinition.LocalePath;
    }

    getStartExplanations(locales: Locales) {
        return locales.concretize((l) => l.node.StructureDefinition.start);
    }

    getDescriptionInputs(locales: Locales) {
        return {
            name: locales.getName(this.names),
        };
    }

    getCharacter() {
        return Characters.Type;
    }

    getKind() {
        return ExpressionKind.Definition;
    }
}
