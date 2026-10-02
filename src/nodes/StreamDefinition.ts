import type { TemplateInput } from '#locale/Locales.ts';
import type Conflict from '#conflicts/Conflict.ts';
import getConceptName from '#locale/getConceptName.ts';
import type LocaleText from '#locale/LocaleText.ts';
import type { NodeDescriptor } from '#locale/NodeTexts.ts';
import { STREAM_SYMBOL } from '#parser/Symbols.ts';
import type Evaluator from '#runtime/Evaluator.ts';
import StartFinish from '#runtime/StartFinish.ts';
import type Step from '#runtime/Step.ts';
import type Value from '#values/Value.ts';
import { Purpose } from '#concepts/Purpose.ts';
import type Locales from '#locale/Locales.ts';
import Characters from '../lore/BasisCharacters';
import StreamDefinitionValue from '#values/StreamDefinitionValue.ts';
import Bind from '#nodes/Bind.ts';
import type Context from '#nodes/Context.ts';
import type Definition from '#nodes/Definition.ts';
import DefinitionExpression from '#nodes/DefinitionExpression.ts';
import Docs from '#nodes/Docs.ts';
import EvalCloseToken from '#nodes/EvalCloseToken.ts';
import EvalOpenToken from '#nodes/EvalOpenToken.ts';
import Evaluate from '#nodes/Evaluate.ts';
import type Expression from '#nodes/Expression.ts';
import ExpressionPlaceholder from '#nodes/ExpressionPlaceholder.ts';
import Names from '#nodes/Names.ts';
import type Node from '#nodes/Node.ts';
import {
    any,
    list,
    node,
    none,
    optional,
    type Grammar,
    type Replacement,
} from '#nodes/Node.ts';
import Reference from '#nodes/Reference.ts';
import StreamDefinitionType from '#nodes/StreamDefinitionType.ts';
import { Sym } from '#nodes/Sym.ts';
import Token from '#nodes/Token.ts';
import Type from '#nodes/Type.ts';
import TypePlaceholder from '#nodes/TypePlaceholder.ts';
import type TypeSet from '#nodes/TypeSet.ts';
import TypeToken from '#nodes/TypeToken.ts';
import { getEvaluationInputConflicts } from '#nodes/util.ts';

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
            output !== undefined && dot === undefined ? TypeToken() : dot;
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
            EvalOpenToken(),
            inputs,
            EvalCloseToken(),
            expression,
            TypeToken(),
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
                label: () => (l) => l.glossary.documentation.word,
            },
            { name: 'dots', kind: node(Sym.Stream), label: undefined },
            { name: 'names', kind: node(Names), label: undefined },
            { name: 'open', kind: node(Sym.EvalOpen), label: undefined },
            {
                name: 'inputs',
                kind: list(true, node(Bind)),
                space: true,
                indent: true,
                label: () => (l) => getConceptName(l, 'input'),
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
                kind: any(node(Type), none(['dot', () => TypeToken()])),
                label: () => (l) => l.glossary.type.word,
            },
        ];
    }

    getPurpose() {
        return Purpose.Hidden;
    }

    clone(replace?: Replacement) {
        return this.cloned(
            new StreamDefinition(
                this.replaceChild('docs', this.docs, replace),
                this.replaceChild('dots', this.dots, replace),
                this.replaceChild('names', this.names, replace),
                this.replaceChild('open', this.open, replace),
                this.replaceChild('inputs', this.inputs, replace),
                this.replaceChild('close', this.close, replace),
                // Passed through, not replaced: the expression is a basis-internal node that the grammar
                // deliberately doesn't declare as a child, so it's never a replacement target.
                this.expression,
                this.replaceChild('dot', this.dot, replace),
                this.replaceChild('output', this.output, replace),
            ),
        );
    }

    getEvaluateTemplate(
        nameOrLocales: string | Locales,
        context: Context,
        defaults: boolean,
        symbolic = true,
    ): Evaluate {
        return Evaluate.make(
            Reference.make(
                typeof nameOrLocales === 'string'
                    ? nameOrLocales
                    : this.names.getPreferredNameString(
                          nameOrLocales.getLocales(),
                          symbolic,
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
            const thisInput = this.inputs[i];
            const thatInput = fun.inputs[i];
            // A missing counterpart is a mismatch, as the length check was.
            if (thisInput === undefined || thatInput === undefined)
                return false;
            if (
                !thisInput
                    .getType(context)
                    .accepts(thatInput.getType(context), context)
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
            ...this.inputs.filter(
                (i): i is Bind => i instanceof Bind && i !== node,
            ),
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

    getDescriptionInputs(
        locales: Locales,
        __: Context,
    ): Record<string, TemplateInput> {
        return {
            // Not symbolic: an emoji name is unspeakable.
            name: locales.getDescriptiveName(this.names),
        };
    }

    getCharacter() {
        return Characters.Stream;
    }
}
