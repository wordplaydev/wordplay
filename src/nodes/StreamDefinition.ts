import type Node from './Node';
import Bind from './Bind';
import Expression from './Expression';
import Token from './Token';
import TokenType from './TokenType';
import Type from './Type';
import type Conflict from '@conflicts/Conflict';
import { getEvaluationInputConflicts } from './util';
import type Evaluator from '@runtime/Evaluator';
import type Step from '@runtime/Step';
import type Context from './Context';
import type Definition from './Definition';
import { STREAM_SYMBOL } from '@parser/Symbols';
import EvalCloseToken from './EvalCloseToken';
import EvalOpenToken from './EvalOpenToken';
import Docs from './Docs';
import Names from './Names';
import type LanguageCode from '@locale/LanguageCode';
import type Value from '@runtime/Value';
import StartFinish from '@runtime/StartFinish';
import TypeToken from './TypeToken';
import type { Replacement } from './Node';
import type Locale from '@locale/Locale';
import StreamDefinitionValue from '../runtime/StreamDefinitionValue';
import type TypeSet from './TypeSet';
import StreamDefinitionType from './StreamDefinitionType';
import Glyphs from '../lore/Glyphs';
import concretize from '../locale/concretize';

export default class StreamDefinition extends Expression {
    readonly docs?: Docs;
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
        output: Type
    ) {
        super();

        this.docs = docs;
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
        output: Type
    ) {
        return new StreamDefinition(
            docs,
            new Token(STREAM_SYMBOL, TokenType.Stream),
            names instanceof Names ? names : Names.make(names),
            new EvalOpenToken(),
            inputs,
            new EvalCloseToken(),
            expression,
            new TypeToken(),
            output
        );
    }

    getGrammar() {
        return [
            { name: 'docs', types: [Docs, undefined] },
            { name: 'dots', types: [TokenType.Stream] },
            { name: 'names', types: [Names] },
            { name: 'open', types: [TokenType.EvalOpen] },
            { name: 'inputs', types: [[Bind]], space: true, indent: true },
            { name: 'close', types: [TokenType.EvalClose] },
            { name: 'dot', types: [Token, 'output'] },
            { name: 'output', types: [Type, 'dot'] },
        ];
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
            this.replaceChild('output', this.output, replace)
        ) as this;
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

    getLocale(lang: LanguageCode[]) {
        return this.names.getLocaleText(lang);
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
                (i) => i instanceof Bind && i !== node
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

    evaluateTypeSet(_: Bind, __: TypeSet, current: TypeSet): TypeSet {
        return current;
    }

    getNodeLocale(translation: Locale) {
        return translation.node.StreamDefinition;
    }

    getStartExplanations(locale: Locale) {
        return concretize(locale, locale.node.StreamDefinition.start);
    }

    getFinishExplanations(locale: Locale) {
        return concretize(locale, locale.node.StreamDefinition.start);
    }

    getGlyphs() {
        return Glyphs.Stream;
    }
}
