import Expression, { ExpressionKind, type GuardContext } from './Expression';
import type Context from './Context';
import Token from './Token';
import Type from './Type';
import type Conflict from '@conflicts/Conflict';
import UnusedBind from '@conflicts/UnusedBind';
import IncompatibleType from '@conflicts/IncompatibleType';
import UnexpectedEtc from '@conflicts/UnexpectedEtc';
import NameType from './NameType';
import StructureType from './StructureType';
import StructureDefinition from './StructureDefinition';
import type Evaluator from '@runtime/Evaluator';
import type Step from '@runtime/Step';
import Start from '@runtime/Start';
import Halt from '@runtime/Halt';
import Finish from '@runtime/Finish';
import Block from './Block';
import ListType from './ListType';
import ValueException from '@values/ValueException';
import ExceptionValue from '@values/ExceptionValue';
import type Definition from './Definition';
import AnyType from './AnyType';
import { ETC_SYMBOL, PLACEHOLDER_SYMBOL, SHARE_SYMBOL } from '@parser/Symbols';
import FunctionDefinition from './FunctionDefinition';
import BindToken from './BindToken';
import TypeToken from './TypeToken';
import Docs from './Docs';
import Names from './Names';
import { MissingShareLanguages } from '@conflicts/MissingShareLanguages';
import { MisplacedShare } from '@conflicts/MisplacedShare';
import { DuplicateShare } from '@conflicts/DuplicateShare';
import type TypeSet from './TypeSet';
import type Value from '@values/Value';
import Sym from './Sym';
import type Name from './Name';
import DuplicateName from '@conflicts/DuplicateName';
import { node, none, type Grammar, type Replacement, any } from './Node';
import type Locale from '@locale/Locale';
import NodeRef from '@locale/NodeRef';
import Glyphs from '../lore/Glyphs';
import Purpose from '../concepts/Purpose';
import Reaction from './Reaction';
import Evaluate from './Evaluate';
import FunctionType from './FunctionType';
import concretize from '../locale/concretize';
import getConcreteExpectedType from './Generics';
import type Node from './Node';
import ExpressionPlaceholder from './ExpressionPlaceholder';
import Refer from '../edit/Refer';
import UnknownType from './UnknownType';
import type Locales from '../locale/Locales';

export default class Bind extends Expression {
    readonly docs?: Docs;
    readonly share: Token | undefined;
    readonly names: Names;
    readonly etc: Token | undefined;
    readonly dot?: Token;
    readonly type?: Type;
    readonly colon?: Token;
    readonly value?: Expression;

    constructor(
        docs: Docs | undefined,
        share: Token | undefined,
        names: Names,
        etc: Token | undefined,
        dot?: Token,
        type?: Type,
        colon?: Token,
        value?: Expression,
    ) {
        super();

        this.docs = docs;
        this.share = share;
        this.names = names;
        this.etc = etc;
        this.dot =
            type !== undefined && dot === undefined ? new TypeToken() : dot;
        this.type = type;
        this.colon =
            value !== undefined && colon === undefined
                ? new BindToken()
                : colon;
        this.value = value;

        this.computeChildren();
    }

    getDescriptor() {
        return 'Bind';
    }

    static make(
        docs: Docs | undefined,
        names: Names,
        type?: Type,
        value?: Expression,
        variable = false,
    ) {
        return new Bind(
            docs,
            undefined,
            names instanceof Names ? names : Names.make(names),
            variable ? new Token(ETC_SYMBOL, Sym.Etc) : undefined,
            type === undefined ? undefined : new TypeToken(),
            type,
            value === undefined ? undefined : new BindToken(),
            value,
        );
    }

    static getPossibleNodes(
        expectedType: Type | undefined,
        anchor: Node,
        isBeingReplaced: boolean,
        context: Context,
    ) {
        if (anchor instanceof Expression && isBeingReplaced) {
            if (
                expectedType === undefined ||
                anchor.getParent(context) instanceof Block
            )
                return [
                    Bind.make(undefined, Names.make(['_']), undefined, anchor),
                ];
        }
        // If offer insertions under various conditions
        else {
            const parent = anchor.getParent(context);
            // Block? Offer to insert a blank one.
            if (parent instanceof Block) {
                return [
                    Bind.make(
                        undefined,
                        Names.make(['_']),
                        undefined,
                        ExpressionPlaceholder.make(),
                    ),
                ];
            }
            // Evaluate, and the anchor is the open or an input? Offer binds to unset properties.
            else if (
                parent instanceof Evaluate &&
                (anchor === parent.open ||
                    (anchor instanceof Expression &&
                        parent.inputs.includes(anchor)))
            ) {
                const mapping = parent.getInputMapping(context);
                return mapping?.inputs
                    .filter((input) => input.given === undefined)
                    .map(
                        (input) =>
                            new Refer(
                                (name) =>
                                    Bind.make(
                                        undefined,
                                        Names.make([name]),
                                        undefined,
                                        ExpressionPlaceholder.make(),
                                    ),
                                input.expected,
                            ),
                    );
            } else return [];
        }
    }

    getGrammar(): Grammar {
        return [
            {
                name: 'docs',
                kind: any(node(Docs), none()),
            },
            {
                name: 'share',
                kind: any(node(Sym.Share), none()),
                getToken: () => new Token(SHARE_SYMBOL, Sym.Share),
            },
            {
                name: 'names',
                kind: node(Names),
            },
            {
                name: 'etc',
                kind: any(node(Sym.Etc), none()),
                getToken: () => new Token(ETC_SYMBOL, Sym.Etc),
            },
            { name: 'dot', kind: any(node(Sym.Type), none('type')) },
            { name: 'type', kind: any(node(Type), none('dot')) },
            { name: 'colon', kind: any(node(Sym.Bind), none('value')) },
            {
                name: 'value',
                kind: any(node(Expression), none('colon')),
                space: true,
                indent: true,
                // The bind field should be whatever type is expected.
                getType: (context: Context) => this.getExpectedType(context),
                label: (locales: Locales, child: Node, context: Context) => {
                    if (child === this.value) {
                        const bind =
                            this.getCorrespondingBindDefinition(context);
                        return bind ? locales.getName(bind.names) : '_';
                    } else return '_';
                },
            },
        ];
    }

    clone(replace?: Replacement) {
        return new Bind(
            this.replaceChild('docs', this.docs, replace),
            this.replaceChild('share', this.share, replace),
            this.replaceChild('names', this.names, replace),
            this.replaceChild('etc', this.etc, replace),
            this.replaceChild('dot', this.dot, replace),
            this.replaceChild('type', this.type, replace),
            this.replaceChild('colon', this.colon, replace),
            this.replaceChild<Expression | undefined>(
                'value',
                this.value,
                replace,
            ),
        ) as this;
    }

    /** Copy this bind, but with the given type */
    withType(type: Type) {
        return this.clone({ original: 'type', replacement: type });
    }

    /** Used to help generate function and structure types without extraneous information */
    withoutDocs() {
        return new Bind(
            undefined,
            this.share,
            this.names,
            this.etc,
            this.dot,
            this.type,
            this.colon,
            this.value,
        );
    }

    withoutValue() {
        return new Bind(
            undefined,
            this.share,
            this.names,
            this.etc,
            this.dot,
            this.type,
            undefined,
            undefined,
        );
    }

    withoutType() {
        return new Bind(
            undefined,
            this.share,
            this.names,
            this.etc,
            undefined,
            undefined,
            undefined,
            undefined,
        );
    }

    simplify(context: Context) {
        return new Bind(
            undefined,
            undefined,
            this.names.simplify(),
            this.etc,
            this.dot,
            this.type?.simplify(context),
            undefined,
        );
    }

    getPurpose() {
        return Purpose.Bind;
    }

    isEvaluationInvolved() {
        return true;
    }

    evaluateTypeGuards(current: TypeSet, guard: GuardContext): TypeSet {
        return this.value === undefined
            ? current
            : this.value.evaluateTypeGuards(current, guard);
    }

    hasName(name: string) {
        return this.names.hasName(name);
    }
    sharesName(bind: Bind) {
        return this.names.sharesName(bind.names);
    }
    getNames(): string[] {
        return this.names.getNames();
    }

    getPreferredName(locales: Locale[]) {
        return this.names.getPreferredNameString(locales);
    }

    isVariableLength() {
        return this.etc !== undefined;
    }
    hasValue() {
        return this.value !== undefined;
    }

    hasDefault() {
        return !this.isRequired();
    }
    isRequired() {
        return this.value === undefined && !this.isVariableLength();
    }

    computeConflicts(context: Context): Conflict[] {
        const conflicts = [];

        const parent = this.getParent(context);

        // Etc tokens can't appear in block bindings, just structure and function definitions.
        if (this.etc && parent instanceof Block)
            conflicts.push(new UnexpectedEtc(this.etc, this));

        // If there's a type, the value must match.
        if (
            this.type !== undefined &&
            this.value &&
            this.value instanceof Expression
        ) {
            const valueType = this.value.getType(context);
            if (!this.type.accepts(valueType, context))
                conflicts.push(
                    new IncompatibleType(
                        this.names,
                        this.type,
                        this.value,
                        valueType,
                    ),
                );
        }

        // It can't already be defined. Warn on similar casing.
        // Check for duplicate names, unless this is an input in an evaluate, in which
        // case the name isn't actually a binding.
        if (!this.isEvaluationInput(context)) {
            for (const name of this.names.names) {
                const text = name.getName();
                if (text !== undefined) {
                    const defs = this.getDefinitionsInScope(context);
                    const names = defs.reduce(
                        (names: Name[], def: Definition): Name[] =>
                            names.concat(def.names.names),
                        [],
                    );
                    const defsWithName = names.filter(
                        (alias) =>
                            name.getName() === alias.getName() &&
                            name !== alias &&
                            alias.getParent(context) !== this.names,
                    );

                    if (defsWithName.length > 0)
                        conflicts.push(
                            new DuplicateName(this, defsWithName[0]),
                        );
                }
            }
        }

        // Search the project for references and warn if there aren't any.
        if (
            !this.isShared() &&
            (parent instanceof Block ||
                parent instanceof FunctionDefinition ||
                (parent instanceof StructureDefinition &&
                    parent.expression !== undefined))
        ) {
            const references = context.project.getReferences(this);
            // Don't warn on placeholder symbols.
            if (
                references.length === 0 &&
                !this.names.hasName(PLACEHOLDER_SYMBOL)
            )
                conflicts.push(new UnusedBind(this));
        }

        // Shares can only appear in the program's root block.
        if (this.share !== undefined) {
            if (
                !context.source.expression.expression
                    .getChildren()
                    .includes(this)
            )
                conflicts.push(new MisplacedShare(this, this.share));

            // Bindings must have language tags on all names to clarify what langauge they're written in.
            if (!this.names.names.every((n) => n.language !== undefined))
                conflicts.push(new MissingShareLanguages(this));

            // Other shares in this project can't have the same name
            const sources = context.project.getSourcesExcept(context.source);
            if (sources !== undefined) {
                for (const source of sources) {
                    if (source.expression.expression instanceof Block) {
                        for (const share of source.expression.expression.statements.filter(
                            (s) => s instanceof Bind && s.isShared(),
                        ) as Bind[]) {
                            if (this.sharesName(share))
                                conflicts.push(new DuplicateShare(this, share));
                        }
                    }
                }
            }
        }

        return conflicts;
    }

    /** If in an evaluate, find the function input bind to which this corresponds. */
    getCorrespondingBindDefinition(context: Context) {
        const parent = this.getParent(context);
        if (parent instanceof Evaluate) {
            return parent
                .getInputMapping(context)
                ?.inputs.find((input) => input.given === this)?.expected;
        }
        return undefined;
    }

    isEvaluationInput(context: Context) {
        const parent = this.getParent(context);
        return !(
            parent instanceof FunctionDefinition ||
            parent instanceof StructureDefinition ||
            parent instanceof Block
        );
    }

    isShared() {
        return this.share !== undefined;
    }

    computeType(context: Context): Type {
        // What type is this binding?
        let type =
            this.getSpecifiedType() ?? // If it has an expression, ask the expression.
            (this.value instanceof Expression
                ? this.value.getType(context)
                : // Otherwise, we don't know, it could be anything.
                  undefined);

        if (type === undefined || type instanceof UnknownType)
            type = this.getExpectedType(context);

        // If the type is a name, and it refers to a structure, resolve it.
        // Leave any other names (namely those that refer to type variables) to be concretized by others.
        if (type instanceof NameType) {
            const nameType = type.getType(context);
            if (nameType instanceof StructureType) return nameType;
        }

        return type;
    }

    getSpecifiedType(): Type | undefined {
        // If it's declared, use the declaration.
        return this.type instanceof Type
            ? // Account for variable length arguments
              this.isVariableLength()
                ? ListType.make(this.type)
                : this.type
            : undefined;
    }

    getExpectedType(context: Context) {
        const expected = this.getSpecifiedType();
        if (expected) return expected;

        // No type? If the bind is in a function definition that is part of a function evaluation that takes a function input,
        // get the type from the function input.
        const parent = this.getParent(context);

        // If the parent is an evaluate and there's no value specified, see what input it corresponds to.
        if (parent instanceof Evaluate) {
            const mapping = parent.getInputMapping(context);
            const input = mapping?.inputs.find((i) => i.given === this);
            if (input) return input.expected.getType(context);
        }

        if (parent instanceof FunctionDefinition) {
            const bindIndex = parent.inputs.indexOf(this);
            const evaluate = parent.getParent(context);
            if (evaluate instanceof Evaluate) {
                const funcIndex = evaluate.inputs.indexOf(parent);
                const evalFunc = evaluate.getFunction(context);
                if (
                    evalFunc instanceof FunctionDefinition &&
                    funcIndex < evalFunc.inputs.length
                ) {
                    const bind = evalFunc.inputs[funcIndex];
                    const functionType = bind
                        .getType(context)
                        .getPossibleTypes(context)
                        .find(
                            (type): type is FunctionType =>
                                type instanceof FunctionType,
                        );
                    if (functionType) {
                        let type: Type | undefined;
                        const funcBind = functionType.inputs[bindIndex];
                        if (funcBind) type = funcBind.getType(context);

                        const concreteFunctionType = getConcreteExpectedType(
                            evalFunc,
                            bind,
                            evaluate,
                            context,
                        )
                            .getPossibleTypes(context)
                            .find(
                                (type): type is FunctionType =>
                                    type instanceof FunctionType,
                            );
                        if (concreteFunctionType) {
                            type =
                                concreteFunctionType.inputs[bindIndex].getType(
                                    context,
                                );
                        }
                        if (type) return type;
                    }
                }
            }
        }
        return new AnyType();
    }

    getDefinitionOfNameInScope() {
        return undefined;
    }

    getDependencies(context: Context): Expression[] {
        const parent = this.getParent(context);

        // A bind in a function or structure definition depends on all calls to the function/structure definition,
        // because they determine what values the binds have.
        const evaluations =
            (parent instanceof FunctionDefinition ||
            parent instanceof StructureDefinition
                ? context.project.getEvaluationsOf(parent)
                : undefined) ?? [];

        // A bind also depends on its value expression, if it has one.
        return this.value ? [this.value, ...evaluations] : [...evaluations];
    }

    /** Binds are only eligible to be constant if they are in a non-root, non-creator block. */
    isConstant(context: Context) {
        const parent = this.getParent(context);
        return (
            parent instanceof Block &&
            !parent.isRoot() &&
            !parent.isStructure() &&
            super.isConstant(context)
        );
    }

    compile(evaluator: Evaluator, context: Context): Step[] {
        // A bind evaluates its value expression, then pushes it on the stack.
        return this.value === undefined
            ? [
                  new Halt(
                      (evaluator) => new ValueException(evaluator, this),
                      this,
                  ),
              ]
            : [
                  new Start(this, (evaluator) => {
                      // Before evaluating the bind's value, see if the value expression previously evaluated to
                      // a stream, and if so, bind this Bind's names to the previous value. This allows
                      // for stream-based recurrence relations, where a stream or reaction's future values can be
                      // affected by their past values.
                      if (
                          this.value instanceof Evaluate ||
                          this.value instanceof Reaction
                      ) {
                          const stream = evaluator.getStreamFor(
                              this.value,
                              true,
                          );
                          const latest = stream?.latest();
                          if (latest) evaluator.bind(this.names, latest);
                      }
                      return undefined;
                  }),
                  ...this.value.compile(evaluator, context),
                  new Finish(this),
              ];
    }

    getStart() {
        return this.colon ?? this.names;
    }

    getFinish() {
        return this.names;
    }

    evaluate(evaluator: Evaluator, prior: Value | undefined): Value {
        // Get the value we computed, or previously computed.
        const value = prior ?? evaluator.popValue(this);

        // If it's an exception, return it instead of binding.
        if (value instanceof ExceptionValue) return value;

        // Bind the value on the stack to the names.
        evaluator.bind(this.names, value);

        // Return the value of the Bind for later.
        return value;
    }

    /** True if a name and the type matches */
    isEquivalentTo(definition: Definition) {
        return (
            definition instanceof Bind &&
            this.type &&
            definition.type &&
            this.type.isEqualTo(definition.type) &&
            this.sharesName(definition)
        );
    }

    getNodeLocale(locales: Locales) {
        return locales.get((l) => l.node.Bind);
    }

    getStartExplanations(locales: Locales, context: Context) {
        return concretize(
            locales,
            locales.get((l) => l.node.Bind.start),
            this.value === undefined
                ? undefined
                : new NodeRef(this.value, locales, context),
        );
    }

    getFinishExplanations(
        locales: Locales,
        context: Context,
        evaluator: Evaluator,
    ) {
        return concretize(
            locales,
            locales.get((l) => l.node.Bind.finish),
            this.getValueIfDefined(locales, context, evaluator),
            new NodeRef(
                this.names,
                locales,
                context,
                locales.getName(this.names),
            ),
        );
    }

    getDescriptionInputs(locales: Locales) {
        return [locales.getName(this.names)];
    }

    getGlyphs() {
        return Glyphs.Bind;
    }

    getKind() {
        return ExpressionKind.Simple;
    }
}
