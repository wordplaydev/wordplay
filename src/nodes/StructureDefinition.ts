import type Node from './Node';
import Bind from './Bind';
import Expression, { ExpressionKind, type GuardContext } from './Expression';
import type Conflict from '@conflicts/Conflict';
import Type from './Type';
import Block from './Block';
import FunctionDefinition from './FunctionDefinition';
import { getEvaluationInputConflicts } from './util';
import ConversionDefinition from './ConversionDefinition';
import type Evaluator from '@runtime/Evaluator';
import type Step from '@runtime/Step';
import StructureDefinitionValue from '@values/StructureDefinitionValue';
import type Context from './Context';
import type Definition from './Definition';
import StructureType from './StructureType';
import Token from './Token';
import type TypeSet from './TypeSet';
import { UnimplementedInterface } from '@conflicts/UnimplementedInterface';
import { IncompleteImplementation } from '@conflicts/IncompleteImplementation';
import { DisallowedInputs } from '@conflicts/DisallowedInputs';
import TypeToken from './TypeToken';
import EvalOpenToken from './EvalOpenToken';
import EvalCloseToken from './EvalCloseToken';
import Docs from './Docs';
import Names from './Names';
import type Value from '@values/Value';
import StartFinish from '@runtime/StartFinish';
import TypeVariables from './TypeVariables';
import Reference from './Reference';
import NotAnInterface from '@conflicts/NotAnInterface';
import { optional, type Grammar, type Replacement, node, list } from './Node';
import type Locale from '@locale/Locale';
import NameType from './NameType';
import InternalException from '@values/InternalException';
import Glyphs from '../lore/Glyphs';
import Purpose from '../concepts/Purpose';
import { SHARE_SYMBOL } from '../parser/Symbols';
import Sym from './Sym';
import concretize from '../locale/concretize';
import Evaluate from './Evaluate';
import ExpressionPlaceholder from './ExpressionPlaceholder';
import DefinitionExpression from './DefinitionExpression';
import type Locales from '../locale/Locales';

export default class StructureDefinition extends DefinitionExpression {
    readonly docs: Docs | undefined;
    readonly share: Token | undefined;
    readonly type: Token;
    readonly names: Names;
    readonly interfaces: Reference[];
    readonly types: TypeVariables | undefined;
    readonly open: Token | undefined;
    readonly inputs: Bind[];
    readonly close: Token | undefined;
    readonly expression?: Block;

    // PERF: Cache definitions to avoid having to recreate the list.
    #definitionsCache: Map<Node, Definition[]> = new Map();

    constructor(
        docs: Docs | undefined,
        share: Token | undefined,
        type: Token,
        names: Names,
        interfaces: Reference[],
        types: TypeVariables | undefined,
        open: Token | undefined,
        inputs: Bind[],
        close: Token | undefined,
        block?: Block,
    ) {
        super();

        this.docs = docs;
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

    static getPossibleNodes() {
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
     * Asks the block for it's steps.
     */
    getEvaluationSteps(evaluator: Evaluator, context: Context): Step[] {
        return this.expression?.getEvaluationSteps(evaluator, context) ?? [];
    }

    getDescriptor() {
        return 'StructureDefinition';
    }

    getGrammar(): Grammar {
        return [
            { name: 'docs', kind: optional(node(Docs)) },
            {
                name: 'share',
                kind: optional(node(Sym.Share)),
                getToken: () => new Token(SHARE_SYMBOL, Sym.Share),
            },
            { name: 'type', kind: node(Sym.Type) },
            { name: 'names', kind: node(Names) },
            {
                name: 'interfaces',
                kind: list(true, node(Reference)),
                space: true,
            },
            {
                name: 'types',
                kind: optional(node(TypeVariables)),
                space: true,
            },
            { name: 'open', kind: node(Sym.EvalOpen) },
            {
                name: 'inputs',
                kind: list(true, node(Bind)),
                space: true,
                indent: true,
            },
            { name: 'close', kind: node(Sym.EvalClose) },
            {
                name: 'expression',
                kind: optional(node(Block)),
                space: true,
                indent: (_: Node, child: Node) => !(child instanceof Block),
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
        return Purpose.Bind;
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

    getPreferredName(locales: Locale[]): string {
        return this.names.getPreferredNameString(locales);
    }

    isEvaluationInvolved() {
        return true;
    }

    getEvaluateTemplate(nameOrLocales: Locales | string) {
        return Evaluate.make(
            Reference.make(
                typeof nameOrLocales === 'string'
                    ? nameOrLocales
                    : nameOrLocales.getName(this.names),
                this,
            ),
            this.inputs
                .filter((input) => !input.hasDefault())
                .map(() => ExpressionPlaceholder.make()),
        );
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
        else return this.clone({ original: 'inputs', replacement: inputs });
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

    getDefinitions(node: Node): Definition[] {
        // Does an input delare the name that isn't the one asking?
        let definitions = this.#definitionsCache.get(node);
        if (definitions === undefined) {
            definitions = [
                ...(this.inputs.filter(
                    (i) => i instanceof Bind && i !== node,
                ) as Bind[]),
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
        return new StructureType(this, []);
    }

    getDependencies(): Expression[] {
        return this.expression instanceof Block ? [this.expression] : [];
    }

    compile(): Step[] {
        return [new StartFinish(this)];
    }

    evaluate(evaluator: Evaluator): Value {
        // Bind this definition to it's names.
        const context = evaluator.getCurrentEvaluation();
        if (context !== undefined) {
            const def = new StructureDefinitionValue(this, context);
            evaluator.bind(this.names, def);
            return def;
        } else
            return new InternalException(
                this,
                evaluator,
                'there is no evaluation, which should be impossible',
            );
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

    getNodeLocale(locales: Locales) {
        return locales.get((l) => l.node.StructureDefinition);
    }

    getStartExplanations(locales: Locales) {
        return concretize(
            locales,
            locales.get((l) => l.node.StructureDefinition.start),
        );
    }

    getDescriptionInputs(locales: Locales) {
        return [locales.getName(this.names)];
    }

    getGlyphs() {
        return Glyphs.Type;
    }

    getKind() {
        return ExpressionKind.Definition;
    }
}
