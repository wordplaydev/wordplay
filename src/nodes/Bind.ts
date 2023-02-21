import Expression from './Expression';
import type Context from './Context';
import Token from './Token';
import Type from './Type';
import type Conflict from '@conflicts/Conflict';
import UnusedBind from '@conflicts/UnusedBind';
import IncompatibleBind from '@conflicts/IncompatibleBind';
import UnexpectedEtc from '@conflicts/UnexpectedEtc';
import NameType from './NameType';
import StructureDefinitionType from './StructureDefinitionType';
import StructureDefinition from './StructureDefinition';
import type Evaluator from '@runtime/Evaluator';
import type Step from '@runtime/Step';
import Start from '@runtime/Start';
import Halt from '@runtime/Halt';
import Finish from '@runtime/Finish';
import Block from './Block';
import ListType from './ListType';
import ValueException from '@runtime/ValueException';
import Exception from '@runtime/Exception';
import type Definition from './Definition';
import AnyType from './AnyType';
import { ETC_SYMBOL, PLACEHOLDER_SYMBOL, SHARE_SYMBOL } from '@parser/Symbols';
import FunctionDefinition from './FunctionDefinition';
import type LanguageCode from '@translation/LanguageCode';
import BindToken from './BindToken';
import TypeToken from './TypeToken';
import Docs from './Docs';
import Names from './Names';
import { MissingShareLanguages } from '@conflicts/MissingShareLanguages';
import { MisplacedShare } from '@conflicts/MisplacedShare';
import { DuplicateShare } from '@conflicts/DuplicateShare';
import type TypeSet from './TypeSet';
import type Value from '@runtime/Value';
import TokenType from './TokenType';
import type Name from './Name';
import DuplicateName from '@conflicts/DuplicateName';
import type { Replacement } from './Node';
import type Translation from '@translation/Translation';
import NodeLink from '@translation/NodeLink';
import Glyphs from '../lore/Glyphs';

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
        value?: Expression
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

    static make(
        docs: Docs | undefined,
        names: Names,
        type?: Type,
        value?: Expression
    ) {
        return new Bind(
            docs,
            undefined,
            names instanceof Names ? names : Names.make(names),
            undefined,
            type === undefined ? undefined : new TypeToken(),
            type,
            value === undefined ? undefined : new BindToken(),
            value
        );
    }

    getGrammar() {
        return [
            {
                name: 'docs',
                types: [Docs, undefined],
            },
            {
                name: 'share',
                types: [Token, undefined],
                getToken: () => new Token(SHARE_SYMBOL, TokenType.SHARE),
            },
            {
                name: 'names',
                types: [Names],
            },
            {
                name: 'etc',
                types: [Token, undefined],
                getToken: () => new Token(ETC_SYMBOL, TokenType.ETC),
            },
            { name: 'dot', types: [Token, undefined] },
            { name: 'type', types: [Type, undefined] },
            { name: 'colon', types: [Token, undefined] },
            {
                name: 'value',
                types: [Expression, undefined],
                space: true,
                indent: true,
                // If there's a type, the value must match it, otherwise anything
                getType: () => this.type ?? new AnyType(),
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
                replace
            )
        ) as this;
    }

    isEvaluationInvolved() {
        return true;
    }

    evaluateTypeSet(
        bind: Bind,
        original: TypeSet,
        current: TypeSet,
        context: Context
    ): TypeSet {
        return this.value === undefined
            ? current
            : this.value.evaluateTypeSet(bind, original, current, context);
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

    getTranslation(lang: LanguageCode[]) {
        return this.names.getTranslation(lang);
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

        // Etc tokens can't appear in block bindings, just structure and function definitions.
        if (this.etc && context.get(this)?.getParent() instanceof Block)
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
                    new IncompatibleBind(this.type, this.value, valueType)
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
                        []
                    );
                    const defsWithName = names.filter(
                        (alias) =>
                            name.getName() === alias.getName() &&
                            name !== alias &&
                            context.get(alias)?.getParent() !== this.names
                    );

                    if (defsWithName.length > 0)
                        conflicts.push(
                            new DuplicateName(name, defsWithName[0])
                        );
                }
            }
        }

        // Search the project for references and warn if there aren't any.
        const parent = context.get(this)?.getParent();
        if (
            !this.isShared() &&
            (parent instanceof Block ||
                parent instanceof FunctionDefinition ||
                parent instanceof StructureDefinition)
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
            if (!this.names.names.every((n) => n.lang !== undefined))
                conflicts.push(new MissingShareLanguages(this));

            // Other shares in this project can't have the same name
            const sources = context.project.getSourcesExcept(context.source);
            if (sources !== undefined) {
                for (const source of sources) {
                    if (source.expression.expression instanceof Block) {
                        for (const share of source.expression.expression.statements.filter(
                            (s) => s instanceof Bind && s.isShared()
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
            // If it's declared, use the declaration.
            this.type instanceof Type
                ? // Account for variable length arguments
                  this.isVariableLength()
                    ? ListType.make(this.type)
                    : this.type
                : // If it has an expression. ask the expression.
                this.value instanceof Expression
                ? this.value.getType(context)
                : // Otherwise, we don't know, it could be anything.
                  new AnyType();

        // If the type is a name, and it refers to a structure, resolve it.
        // Leave names that refer to type variables to be resolved in Evaluate.
        if (type instanceof NameType) {
            const nameType = type.getType(context);
            if (nameType instanceof StructureDefinitionType) return nameType;
        }
        return type;
    }

    getDefinitionOfNameInScope() {
        return undefined;
    }

    getDependencies(context: Context): Expression[] {
        const parent = context.get(this)?.getParent();

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

    compile(context: Context): Step[] {
        // A bind evaluates its value expression, then pushes it on the stack.
        return this.value === undefined
            ? [
                  new Halt(
                      (evaluator) => new ValueException(evaluator, this),
                      this
                  ),
              ]
            : [
                  new Start(this),
                  ...this.value.compile(context),
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
        if (value instanceof Exception) return value;

        // Bind the value on the stack to the names.
        evaluator.bind(this.names, value);

        // Return the value of the Bind for later.
        return value;
    }

    getNodeTranslation(translation: Translation) {
        return translation.nodes.Bind;
    }

    getDescription(translation: Translation) {
        return (
            this.docs
                ?.getTranslation(translation.language)
                ?.getFirstParagraph() ??
            this.getNodeTranslation(translation).description
        );
    }

    getStartExplanations(translation: Translation, context: Context) {
        return translation.nodes.Bind.start(
            this.value === undefined
                ? undefined
                : new NodeLink(this.value, translation, context)
        );
    }

    getFinishExplanations(
        translation: Translation,
        context: Context,
        evaluator: Evaluator
    ) {
        return translation.nodes.Bind.finish(
            this.getValueIfDefined(translation, context, evaluator),
            new NodeLink(
                this.names,
                translation,
                context,
                this.names.getTranslation(translation.language)
            )
        );
    }

    getGlyphs() {
        return Glyphs.Bind;
    }
}
