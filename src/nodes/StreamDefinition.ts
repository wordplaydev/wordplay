import type Conflict from '@conflicts/Conflict';
import type LocaleText from '@locale/LocaleText';
import type { NodeDescriptor } from '@locale/NodeTexts';
import { STREAM_SYMBOL } from '@parser/Symbols';
import type Evaluator from '@runtime/Evaluator';
import StartFinish from '@runtime/StartFinish';
import type Step from '@runtime/Step';
import type Value from '@values/Value';
import Purpose from '../concepts/Purpose';
import type Locales from '../locale/Locales';
import Characters from '../lore/BasisCharacters';
import StreamDefinitionValue from '../values/StreamDefinitionValue';
import Bind from './Bind';
import type Context from './Context';
import type Definition from './Definition';
import DefinitionExpression from './DefinitionExpression';
import Docs from './Docs';
import EvalCloseToken from './EvalCloseToken';
import EvalOpenToken from './EvalOpenToken';
import Evaluate from './Evaluate';
import type Expression from './Expression';
import ExpressionPlaceholder from './ExpressionPlaceholder';
import Names from './Names';
import type Node from './Node';
import {
    any,
    list,
    node,
    none,
    optional,
    type Grammar,
    type Replacement,
} from './Node';
import Reference from './Reference';
import StreamDefinitionType from './StreamDefinitionType';
import Sym from './Sym';
import Token from './Token';
import Type from './Type';
import TypePlaceholder from './TypePlaceholder';
import type TypeSet from './TypeSet';
import TypeToken from './TypeToken';
import { getEvaluationInputConflicts } from './util';

export default class StreamDefinition extends DefinitionExpression {
    readonly docs: Docs;
    readonly dots: Token;
    readonly names: Names;
    readonly open: Token | undefined;
    readonly inputs: Bind[];
    readonly close: Token | undefined;
    readonly expression: Expression;
    readonly dot: Token;
    readonly output: Type;

    constructor(
        docs: Docs | undefined,
        dots: Token,
        names: Names,
        open: Token | undefined,
        inputs: Bind[],
        close: Token | undefined,
        expression: Expression,
        dot: Token,
        output: Type,
    ) {
        super();

        this.docs = docs ?? Docs.make();
        this.names = names;
        this.dots = dots;
        this.open = open;
        this.inputs = inputs;
        this.close = close;
        this.expression = expression;
        this.dot =
            output !== undefined && dot === undefined ? new TypeToken() : dot;
        this.output = output;

        this.computeChildren();
    }

    static make(
        docs: Docs | undefined,
        names: Names,
        inputs: Bind[],
        expression: Expression,
        output: Type,
    ) {
        return new StreamDefinition(
            docs,
            new Token(STREAM_SYMBOL, Sym.Stream),
            names instanceof Names ? names : Names.make(names),
            new EvalOpenToken(),
            inputs,
            new EvalCloseToken(),
            expression,
            new TypeToken(),
            output,
        );
    }

    /** Used by Evaluator to get the steps for the evaluation of this stream. */
    getEvaluationSteps(evaluator: Evaluator, context: Context): Step[] {
        return this.expression.compile(evaluator, context);
    }

    getDescriptor(): NodeDescriptor {
        return 'StreamDefinition';
    }

    getGrammar(): Grammar {
        return [
            {
                name: 'docs',
                kind: optional(node(Docs)),
                label: () => (l) => l.term.documentation,
            },
            { name: 'dots', kind: node(Sym.Stream), label: undefined },
            { name: 'names', kind: node(Names), label: undefined },
            { name: 'open', kind: node(Sym.EvalOpen), label: undefined },
            {
                name: 'inputs',
                kind: list(true, node(Bind)),
                space: true,
                indent: true,
                label: () => (l) => l.term.input,
            },
            { name: 'close', kind: node(Sym.EvalClose), label: undefined },
            {
                name: 'dot',
                kind: any(
                    node(Sym.Type),
                    none(['output', () => TypePlaceholder.make()]),
                ),
                label: undefined,
            },
            {
                name: 'output',
                kind: any(node(Type), none(['dot', () => new TypeToken()])),
                label: () => (l) => l.term.type,
            },
        ];
    }

    getPurpose() {
        return Purpose.Hidden;
    }

    clone(replace?: Replacement) {
        return new StreamDefinition(
            this.replaceChild('docs', this.docs, replace),
            this.replaceChild('dots', this.dots, replace),
            this.replaceChild('names', this.names, replace),
            this.replaceChild('open', this.open, replace),
            this.replaceChild('inputs', this.inputs, replace),
            this.replaceChild('close', this.close, replace),
            this.replaceChild('expression', this.expression, replace),
            this.replaceChild('dot', this.dot, replace),
            this.replaceChild('output', this.output, replace),
        ) as this;
    }

    getEvaluateTemplate(
        nameOrLocales: string | Locales,
        context: Context,
        defaults: boolean,
    ) {
        return Evaluate.make(
            Reference.make(
                typeof nameOrLocales === 'string'
                    ? nameOrLocales
                    : this.names.getPreferredNameString(
                          nameOrLocales.getLocales(),
                      ),
                this,
            ),
            this.inputs
                .filter((input) => !input.hasDefault())
                .map((input) =>
                    defaults && input.type !== undefined
                        ? (input.type.getDefaultExpression(context) ??
                          ExpressionPlaceholder.make(input.type.clone()))
                        : ExpressionPlaceholder.make(input.type?.clone()),
                ),
        );
    }

    withoutDocs() {
        return new StreamDefinition(
            undefined,
            this.dots,
            this.names,
            this.open,
            this.inputs.map((input) => input.withoutDocs()),
            this.close,
            this.expression,
            this.dot,
            this.output,
        );
    }

    sharesName(fun: StreamDefinition) {
        return this.names.sharesName(fun.names);
    }

    hasName(name: string) {
        return this.names.hasName(name);
    }

    getNames() {
        return this.names.getNames();
    }

    getPreferredName(locales: LocaleText[]) {
        return this.names.getPreferredNameString(locales);
    }

    getReference(locales: Locales): Reference {
        return Reference.make(locales.getName(this.names), this);
    }

    /**
     * Name, inputs, and outputs must match.
     */
    accepts(fun: StreamDefinition, context: Context) {
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
        return true;
    }

    computeConflicts(): Conflict[] {
        // Make sure the inputs are valid.
        return getEvaluationInputConflicts(this.inputs);
    }

    getDefinitions(node: Node): Definition[] {
        // Return inputs that aren't the one asking.
        return [
            ...(this.inputs.filter(
                (i) => i instanceof Bind && i !== node,
            ) as Bind[]),
        ];
    }

    computeType(): Type {
        return new StreamDefinitionType(this);
    }

    /** Streams have no dependencies. */
    getDependencies(): Expression[] {
        return [];
    }

    compile(): Step[] {
        return [new StartFinish(this)];
    }

    getStart() {
        return this.dots;
    }

    getFinish() {
        return this.names;
    }

    /** Wrap this in a StreamDefinitionValue and bind its names in the current context. */
    evaluate(evaluator: Evaluator): Value {
        // Create, bind, and return the value.
        const value = new StreamDefinitionValue(this);
        evaluator.bind(this.names, value);
        return value;
    }

    evaluateTypeGuards(current: TypeSet): TypeSet {
        return current;
    }

    /** Only equal if the same stream definition. */
    isEquivalentTo(definition: Definition) {
        return definition === this;
    }

    static readonly LocalePath = (l: LocaleText) => l.node.StreamDefinition;
    getLocalePath() {
        return StreamDefinition.LocalePath;
    }

    getStartExplanations(locales: Locales) {
        return locales.concretize((l) => l.node.StreamDefinition.start);
    }

    getCharacter() {
        return Characters.Stream;
    }
}
