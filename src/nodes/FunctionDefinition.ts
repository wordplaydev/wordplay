import type Node from './Node';
import Bind from './Bind';
import Expression, { type GuardContext } from './Expression';
import Token from './Token';
import Sym from './Sym';
import Type from './Type';
import type Conflict from '@conflicts/Conflict';
import { getEvaluationInputConflicts } from './util';
import type Evaluator from '@runtime/Evaluator';
import FunctionValue from '@values/FunctionValue';
import type Step from '@runtime/Step';
import type Context from './Context';
import type Definition from './Definition';
import { OperatorRegEx } from '@parser/Tokenizer';
import { FUNCTION_SYMBOL, SHARE_SYMBOL } from '@parser/Symbols';
import type TypeSet from './TypeSet';
import EvalCloseToken from './EvalCloseToken';
import EvalOpenToken from './EvalOpenToken';
import Docs from './Docs';
import Names from './Names';
import type Value from '@values/Value';
import StartFinish from '@runtime/StartFinish';
import TypeVariables from './TypeVariables';
import NoExpression from '@conflicts/NoExpression';
import UnimplementedType from './UnimplementedType';
import TypeToken from './TypeToken';
import { any, node, none, type Grammar, type Replacement, list } from './Node';
import type Locale from '@locale/Locale';
import InternalException from '@values/InternalException';
import Glyphs from '../lore/Glyphs';
import ExpressionPlaceholder from './ExpressionPlaceholder';
import Block from './Block';
import concretize from '../locale/concretize';
import IncompatibleType from '../conflicts/IncompatibleType';
import NameType from './NameType';
import FunctionType from './FunctionType';
import StructureDefinition from './StructureDefinition';
import UnaryEvaluate from './UnaryEvaluate';
import BinaryEvaluate from './BinaryEvaluate';
import Evaluate from './Evaluate';
import PropertyReference from './PropertyReference';
import Reference from './Reference';
import Purpose from '../concepts/Purpose';
import DefinitionExpression from './DefinitionExpression';
import type Locales from '../locale/Locales';

export default class FunctionDefinition extends DefinitionExpression {
    readonly docs?: Docs;
    readonly share: Token | undefined;
    readonly fun: Token;
    readonly names: Names;
    readonly types: TypeVariables | undefined;
    readonly open: Token | undefined;
    readonly inputs: Bind[];
    readonly close: Token | undefined;
    readonly dot: Token | undefined;
    readonly output: Type | undefined;
    readonly expression: Expression | undefined;

    constructor(
        docs: Docs | undefined,
        share: Token | undefined,
        fun: Token,
        names: Names,
        types: TypeVariables | undefined,
        open: Token | undefined,
        inputs: Bind[],
        close: Token | undefined,
        dot: Token | undefined,
        output: Type | undefined,
        expression: Expression | undefined,
    ) {
        super();

        this.docs = docs;
        this.share = share;
        this.names = names;
        this.fun = fun;
        this.types = types;
        this.open = open;
        this.inputs = inputs;
        this.close = close;
        this.dot =
            output !== undefined && dot === undefined ? new TypeToken() : dot;
        this.output = output;
        this.expression = expression;

        this.computeChildren();
    }

    static make(
        docs: Docs | undefined,
        names: Names,
        types: TypeVariables | undefined,
        inputs: Bind[],
        expression: Expression,
        output?: Type,
    ) {
        return new FunctionDefinition(
            docs,
            undefined,
            new Token(FUNCTION_SYMBOL, Sym.Function),
            names instanceof Names ? names : Names.make(names),
            types,
            new EvalOpenToken(),
            inputs,
            new EvalCloseToken(),
            output === undefined ? undefined : new TypeToken(),
            output,
            expression,
        );
    }

    static getPossibleNodes() {
        return [
            FunctionDefinition.make(
                undefined,
                Names.make(['_']),
                undefined,
                [],
                ExpressionPlaceholder.make(),
                undefined,
            ),
        ];
    }

    getDescriptor() {
        return 'FunctionDefinition';
    }

    /** Create an expression that evaluates this function with typed placeholders for its inputs. */
    getEvaluateTemplate(
        nameOrLocales: Locales | string,
        context: Context,
        structureType: Expression | Type | undefined,
    ) {
        const possibleStructure = context.getRoot(this)?.getParent(this);
        const structure = structureType
            ? structureType
            : possibleStructure instanceof StructureDefinition
              ? possibleStructure
              : undefined;
        const reference = Reference.make(
            typeof nameOrLocales === 'string'
                ? nameOrLocales
                : nameOrLocales.getName(this.names),
            this,
        );
        return this.isOperator() && this.inputs.length === 0
            ? new UnaryEvaluate(
                  new Reference(
                      new Token(this.getOperatorName() ?? '_', Sym.Operator),
                  ),
                  structureType instanceof Expression
                      ? structureType
                      : ExpressionPlaceholder.make(structureType?.clone()),
              )
            : this.isOperator() && this.inputs.length === 1
              ? new BinaryEvaluate(
                    structureType instanceof Expression
                        ? structureType
                        : ExpressionPlaceholder.make(structureType),
                    Reference.make(this.getOperatorName() ?? '_'),
                    ExpressionPlaceholder.make(),
                )
              : Evaluate.make(
                    structure
                        ? PropertyReference.make(
                              structureType instanceof Expression
                                  ? structureType
                                  : ExpressionPlaceholder.make(structureType),
                              reference,
                          )
                        : reference,
                    this.inputs
                        .filter((input) => !input.hasDefault())
                        .map((input) => {
                            if (input.type instanceof FunctionType)
                                return input.type.getTemplate(context);
                            else return ExpressionPlaceholder.make();
                        }),
                );
    }

    getGrammar(): Grammar {
        return [
            { name: 'docs', kind: any(node(Docs), none()) },
            {
                name: 'share',
                kind: any(node(Sym.Share), none()),
                getToken: () => new Token(SHARE_SYMBOL, Sym.Share),
            },
            { name: 'fun', kind: node(Sym.Function) },
            { name: 'names', kind: node(Names), space: true },
            { name: 'types', kind: any(node(TypeVariables), none()) },
            { name: 'open', kind: node(Sym.EvalOpen) },
            {
                name: 'inputs',
                kind: list(true, node(Bind)),
                space: true,
                indent: true,
            },
            { name: 'close', kind: node(Sym.EvalClose) },
            { name: 'dot', kind: any(node(Sym.Type), none('output')) },
            { name: 'output', kind: any(node(Type), none('dot')) },
            {
                name: 'expression',
                kind: any(node(Expression), node(Sym.Etc), none()),
                space: true,
                indent: (_: Node, child: Node) => !(child instanceof Block),
                // Must match output type if provided
                getType: (context) => this.getOutputType(context),
            },
        ];
    }

    /** Used by Evaluator to get the steps for the evaluation of this function. */
    getEvaluationSteps(evaluator: Evaluator, context: Context): Step[] {
        return this.expression?.compile(evaluator, context) ?? [];
    }

    getPurpose() {
        return Purpose.Evaluate;
    }

    clone(replace?: Replacement) {
        return new FunctionDefinition(
            this.replaceChild('docs', this.docs, replace),
            this.replaceChild('share', this.share, replace),
            this.replaceChild('fun', this.fun, replace),
            this.replaceChild('names', this.names, replace),
            this.replaceChild('types', this.types, replace),
            this.replaceChild('open', this.open, replace),
            this.replaceChild('inputs', this.inputs, replace),
            this.replaceChild('close', this.close, replace),
            this.replaceChild('dot', this.dot, replace),
            this.replaceChild('output', this.output, replace),
            this.replaceChild('expression', this.expression, replace),
        ) as this;
    }

    sharesName(fun: FunctionDefinition) {
        return this.names.sharesName(fun.names);
    }

    hasName(name: string) {
        return this.names.hasName(name);
    }

    getNames() {
        return this.names.getNames();
    }

    isShared() {
        return this.share !== undefined;
    }

    getPreferredName(locales: Locale[]) {
        return this.names.getPreferredNameString(locales);
    }

    isOperator() {
        return this.inputs.length === 1 && this.getOperatorName() !== undefined;
    }

    getOperatorName() {
        return this.names.getNames().find((name) => OperatorRegEx.test(name));
    }

    /**
     * Name, inputs, and outputs must match.
     */
    accepts(fun: FunctionDefinition, context: Context) {
        if (!this.sharesName(fun)) return false;
        for (let i = 0; i < this.inputs.length; i++) {
            if (i >= fun.inputs.length) return false;
            if (
                !this.inputs[i]
                    .getType(context)
                    .accepts(fun.inputs[i].getType(context), context)
            )
                return false;
        }
        return this.getOutputType(context).accepts(
            fun.getOutputType(context),
            context,
        );
    }

    isEvaluationInvolved() {
        return true;
    }
    isEvaluationRoot() {
        return true;
    }
    getScopeOfChild(child: Node, context: Context): Node | undefined {
        // A function definition is the scope for its expression (since it defines inputs the expression might use),
        // but also for its output type and inputs, since they may refer to type variables declared on the function.
        // All other children's scope are the function's parent.
        return child === this.expression ||
            child === this.output ||
            this.inputs.includes(child as Bind)
            ? this
            : this.getParent(context);
    }

    computeConflicts(context: Context): Conflict[] {
        let conflicts: Conflict[] = [];

        // Make sure the inputs are valid.
        conflicts = conflicts.concat(getEvaluationInputConflicts(this.inputs));

        // Warn if there's no expression.
        if (this.expression === undefined) {
            conflicts.push(new NoExpression(this));
        }

        // Conflict if the output type doesn't match the expression type.
        if (
            this.output &&
            !this.output.nodes().some((n) => n instanceof NameType) &&
            this.expression
        ) {
            const type = this.expression.getType(context);
            if (!this.output.accepts(type, context)) {
                conflicts.push(
                    new IncompatibleType(
                        this.names,
                        this.output,
                        this.expression,
                        type,
                    ),
                );
            }
        }

        return conflicts;
    }

    getDefinitions(node: Node): Definition[] {
        // Does an input declare the name that isn't the one asking?
        return [
            ...(this.inputs.filter(
                (i) => i instanceof Bind && i !== node,
            ) as Bind[]),
            ...(this.types ? this.types.variables : []),
        ];
    }

    computeType(context: Context): Type {
        return FunctionType.make(
            this.types,
            this.inputs,
            this.getOutputType(context),
            this,
        );
    }

    getOutputType(context: Context) {
        return this.output instanceof Type
            ? this.output
            : this.expression === undefined
              ? new UnimplementedType(this)
              : this.expression.getType(context);
    }

    /** Functions have no dependencies; once they are defined, they cannot change what they evaluate to. */
    getDependencies(): Expression[] {
        return this.expression !== undefined ? [this.expression] : [];
    }

    /** Functions are not constant because they encapsulate a closure each time they are evaluated. */
    isConstant() {
        return false;
    }

    compile(): Step[] {
        return [new StartFinish(this)];
    }

    getStart() {
        return this.fun;
    }
    getFinish() {
        return this.names;
    }

    evaluate(evaluator: Evaluator): Value {
        // We ignore any prior values; must capture closures every time.

        // Get the function value.
        const context = evaluator.getCurrentEvaluation();
        const value =
            context === undefined
                ? new InternalException(
                      this,
                      evaluator,
                      'there is no evaluation, which should be impossible',
                  )
                : new FunctionValue(this, context);

        // Bind the value
        evaluator.bind(this.names, value);

        // Return the value.
        return value;
    }

    isAbstract() {
        return (
            this.expression instanceof ExpressionPlaceholder ||
            this.expression === undefined
        );
    }

    /** True if a name matches, the output matches, and the input type matches. */
    isEquivalentTo(definition: Definition) {
        return (
            definition === this ||
            (definition instanceof FunctionDefinition &&
                this.output &&
                definition.output &&
                this.names.sharesName(definition.names) &&
                this.output.isEqualTo(definition.output) &&
                this.inputs.length === definition.inputs.length &&
                this.inputs.every((input, index) =>
                    input.isEqualTo(definition.inputs[index]),
                ))
        );
    }

    evaluateTypeGuards(current: TypeSet, guard: GuardContext) {
        if (this.expression !== undefined)
            this.expression.evaluateTypeGuards(current, guard);
        return current;
    }

    getNodeLocale(locales: Locales) {
        return locales.get((l) => l.node.FunctionDefinition);
    }

    getStartExplanations(locales: Locales) {
        return concretize(
            locales,
            locales.get((l) => l.node.FunctionDefinition.start),
        );
    }

    getDescriptionInputs(locales: Locales) {
        return [locales.getName(this.names)];
    }

    getGlyphs() {
        return Glyphs.Function;
    }
}
