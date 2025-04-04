import type Conflict from '@conflicts/Conflict';
import { UnknownConversion } from '@conflicts/UnknownConversion';
import type EditContext from '@edit/EditContext';
import type LocaleText from '@locale/LocaleText';
import NodeRef from '@locale/NodeRef';
import type { NodeDescriptor } from '@locale/NodeTexts';
import { CONVERT_SYMBOL, PROPERTY_SYMBOL } from '@parser/Symbols';
import Evaluation from '@runtime/Evaluation';
import type Evaluator from '@runtime/Evaluator';
import Finish from '@runtime/Finish';
import Halt from '@runtime/Halt';
import Start from '@runtime/Start';
import StartConversion from '@runtime/StartConversion';
import type Step from '@runtime/Step';
import ConversionException from '@values/ConversionException';
import ExceptionValue from '@values/ExceptionValue';
import type Value from '@values/Value';
import Purpose from '../concepts/Purpose';
import type Locales from '../locale/Locales';
import Characters from '../lore/BasisCharacters';
import Block from './Block';
import type Context from './Context';
import ConversionDefinition from './ConversionDefinition';
import ConversionType from './ConversionType';
import Expression, { type GuardContext } from './Expression';
import ExpressionPlaceholder from './ExpressionPlaceholder';
import { getConcreteConversionTypeVariable } from './Generics';
import Names from './Names';
import NameType from './NameType';
import NeverType from './NeverType';
import { node, type Grammar, type Replacement } from './Node';
import { NotAType } from './NotAType';
import Sym from './Sym';
import Token from './Token';
import Type from './Type';
import TypePlaceholder from './TypePlaceholder';
import type TypeSet from './TypeSet';

export default class Convert extends Expression {
    readonly expression: Expression;
    readonly convert: Token;
    readonly type: Type;

    constructor(expression: Expression, convert: Token, type: Type) {
        super();

        this.expression = expression;
        this.convert = convert;
        this.type = type;

        this.computeChildren();
    }

    static make(expression: Expression, type: Type) {
        return new Convert(
            expression,
            new Token(CONVERT_SYMBOL, Sym.Convert),
            type,
        );
    }

    static getPossibleReplacements({ node, type }: EditContext) {
        return node instanceof Expression
            ? [Convert.make(node, type ?? TypePlaceholder.make())]
            : [];
    }

    static getPossibleAppends({ type }: EditContext) {
        return [
            Convert.make(
                ExpressionPlaceholder.make(),
                type ?? TypePlaceholder.make(),
            ),
        ];
    }

    getDescriptor(): NodeDescriptor {
        return 'Convert';
    }

    getGrammar(): Grammar {
        return [
            { name: 'expression', kind: node(Expression) },
            { name: 'convert', kind: node(Sym.Convert), space: true },
            { name: 'type', kind: node(Type), space: true },
        ];
    }

    getPurpose() {
        return Purpose.Convert;
    }

    clone(replace?: Replacement) {
        return new Convert(
            this.replaceChild('expression', this.expression, replace),
            this.replaceChild('convert', this.convert, replace),
            this.replaceChild('type', this.type, replace),
        ) as this;
    }

    getConversionSequence(
        context: Context,
    ): ConversionDefinition[] | undefined {
        // What's the input type?
        const inputType = this.expression.getType(context);

        // Find all the type's conversions
        const typeConversions = inputType.getAllConversions(context);

        // Find all the conversions in enclosing blocks.
        const scopeConversions =
            (
                context
                    .getRoot(this)
                    ?.getAncestors(this)
                    ?.filter((a): a is Block => a instanceof Block) ?? []
            ).reduce(
                (list: ConversionDefinition[], block) => [
                    ...list,
                    ...block.statements.filter(
                        (s): s is ConversionDefinition =>
                            s instanceof ConversionDefinition,
                    ),
                ],
                [],
            ) ?? [];

        // Find a path between the input type and the desired type
        return getConversionPath(
            inputType,
            this.type,
            [...typeConversions, ...scopeConversions],
            context,
        );
    }

    computeConflicts(context: Context): Conflict[] {
        // If we know the expression's type, there must be a corresponding conversion on that type.
        const exprType = this.expression.getType(context);
        const conversionPath = this.getConversionSequence(context);
        if (
            !this.type.accepts(exprType, context) &&
            (conversionPath === undefined || conversionPath.length === 0)
        )
            return [new UnknownConversion(this, exprType)];

        return [];
    }

    computeType(context: Context): Type {
        // Technically we have a type given, but such a conversion doesn't necessarily exist.
        // Find the conversion to see.
        // Get the conversion definition, and then get its output type.
        const conversions = this.getConversionSequence(context);
        if (conversions === undefined || conversions.length === 0)
            return new NotAType(
                this,
                new NeverType(),
                ConversionType.make(
                    this.expression.getType(context),
                    this.type,
                ),
            );
        const lastConversion = conversions[conversions.length - 1];

        // Now that we have an output type, concretize it, in case it has generic types.
        let output = lastConversion.output;

        // Find any variable types in the output and resolve them to concrete types,
        // constructing a new output type.
        let moreReplacements = false;
        do {
            const variable = output
                .nodes()
                .find((node): node is NameType => node instanceof NameType);
            if (variable === undefined) break;
            const concrete = getConcreteConversionTypeVariable(
                variable,
                lastConversion,
                this,
                context,
            );
            if (concrete === variable) break;

            output = output.replace(variable, concrete);
            moreReplacements = true;
        } while (moreReplacements);

        return output;
    }

    getDependencies(): Expression[] {
        return [this.expression];
    }

    compile(evaluator: Evaluator, context: Context): Step[] {
        const fromType = this.expression.getType(context);
        // If the type of value is already the type of the requested conversion, then just leave the value on the stack and do nothing.
        // Otherwise, identify the series of conversions that will achieve the right output type.
        const conversions = this.type.accepts(fromType, context)
            ? []
            : this.getConversionSequence(context);

        // Evaluate the expression to convert, then push the conversion function on the stack.
        return [
            new Start(this),
            ...this.expression.compile(evaluator, context),
            ...(conversions === undefined ||
            (conversions.length === 0 &&
                !this.type.accepts(this.expression.getType(context), context))
                ? [
                      new Halt((evaluator) => {
                          const value = evaluator.popValue(this);
                          return new ConversionException(
                              evaluator,
                              this,
                              value,
                              this.type,
                          );
                      }, this),
                  ]
                : conversions.map(
                      (conversion) => new StartConversion(this, conversion),
                  )),
            new Finish(this),
        ];
    }

    startEvaluation(evaluator: Evaluator, conversion: ConversionDefinition) {
        // Get the value to convert
        const value = evaluator.popValue(this);
        if (value instanceof ExceptionValue) return value;

        // Execute the conversion.
        evaluator.startEvaluation(
            new Evaluation(
                evaluator,
                this,
                conversion,
                value,
                new Map().set(Names.make([PROPERTY_SYMBOL]), value),
            ),
        );

        return undefined;
    }

    evaluate(evaluator: Evaluator, prior: Value | undefined): Value {
        if (prior) return prior;

        // Pop the value we computed and then return it (so that it's saved for later).
        return evaluator.popValue(this);
    }

    evaluateTypeGuards(current: TypeSet, guard: GuardContext) {
        if (this.expression instanceof Expression)
            this.expression.evaluateTypeGuards(current, guard);
        return current;
    }

    getStart() {
        return this.convert;
    }
    getFinish() {
        return this.convert;
    }

    static readonly LocalePath = (l: LocaleText) => l.node.Convert;
    getLocalePath() {
        return Convert.LocalePath;
    }

    getStartExplanations(locales: Locales, context: Context) {
        return locales.concretize(
            (l) => l.node.Convert.start,
            new NodeRef(this.expression, locales, context),
        );
    }

    getFinishExplanations(
        locales: Locales,
        context: Context,
        evaluator: Evaluator,
    ) {
        return locales.concretize(
            (l) => l.node.Convert.finish,
            this.getValueIfDefined(locales, context, evaluator),
        );
    }

    getCharacter() {
        return Characters.Conversion;
    }
}

function getConversionPath(
    input: Type,
    output: Type,
    conversions: ConversionDefinition[],
    context: Context,
): ConversionDefinition[] {
    // Breadth first search through the conversion graph for a path from input type to output type.
    const edges: Map<Type, Type> = new Map();
    const queue: Type[] = [];
    const visited: Set<Type> = new Set();

    queue.push(input);
    visited.add(input);

    while (queue.length > 0) {
        const currentInput = queue.shift() as Type;
        // Is the type a match for the desired output? Return the path!
        if (output.accepts(currentInput, context)) {
            const path: ConversionDefinition[] = [];
            // Start from the output
            let to = output;

            // Find the path, tracing backwards from output to input.
            const match = true;
            while (match) {
                // Find the type that goes to this type
                const fromKey = Array.from(edges.keys()).find((t) =>
                    t.accepts(to, context),
                );
                const from =
                    fromKey === undefined ? undefined : edges.get(fromKey);
                // There should always be one; bail if there's not.
                if (from === undefined) return [];
                // Find the conversion that maps from -> to
                const conversion = conversions.find((c) =>
                    c.convertsTypeTo(from, to, context),
                );
                // If we didn't find one, bail; something's wrong.
                if (conversion === undefined) return [];
                // Add to the path.
                path.unshift(conversion);
                // If from is compatible with the input, we're done!
                if (from.accepts(input, context)) return path;
                // Otherwise, set the "to" to "from" and find the next transition.
                to = from;
            }
        }

        // Find all of the output types reachable through conversions
        for (const out of conversions
            .filter((c) => c.convertsType(currentInput, context))
            .map((c) => c.output)
            .filter((c) => c instanceof Type) as Type[]) {
            // If we haven't already visited this one, visit it.
            if (
                Array.from(visited).find((type) =>
                    out.accepts(type, context),
                ) === undefined
            ) {
                // We remember the edges in reverse so we can trace backwards from it.
                edges.set(out, currentInput);
                queue.push(out);
                visited.add(out);
            }
        }
    }
    return [];
}
