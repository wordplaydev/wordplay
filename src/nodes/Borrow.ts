import type Conflict from '@conflicts/Conflict';
import { UnknownBorrow } from '@conflicts/UnknownBorrow';
import type LocaleText from '@locale/LocaleText';
import NodeRef from '@locale/NodeRef';
import type { NodeDescriptor } from '@locale/NodeTexts';
import { BORROW_SYMBOL } from '@parser/Symbols';
import Evaluation from '@runtime/Evaluation';
import type Evaluator from '@runtime/Evaluator';
import Finish from '@runtime/Finish';
import Start from '@runtime/Start';
import type Step from '@runtime/Step';
import CycleException from '@values/CycleException';
import FunctionValue from '@values/FunctionValue';
import NameException from '@values/NameException';
import NumberValue from '@values/NumberValue';
import StructureDefinitionValue from '@values/StructureDefinitionValue';
import UnimplementedException from '@values/UnimplementedException';
import type Value from '@values/Value';
import Purpose from '../concepts/Purpose';
import type Locales from '../locale/Locales';
import Characters from '../lore/BasisCharacters';
import StreamDefinitionValue from '../values/StreamDefinitionValue';
import Bind from './Bind';
import type Context from './Context';
import Expression from './Expression';
import FunctionDefinition from './FunctionDefinition';
import {
    any,
    node,
    none,
    optional,
    type Grammar,
    type Replacement,
} from './Node';
import Reference from './Reference';
import SimpleExpression from './SimpleExpression';
import Source from './Source';
import StreamDefinition from './StreamDefinition';
import StructureDefinition from './StructureDefinition';
import Sym from './Sym';
import Token from './Token';
import type Type from './Type';
import type TypeSet from './TypeSet';
import Unit from './Unit';
import UnknownNameType from './UnknownNameType';

export type SharedDefinition =
    | Source
    | Bind
    | FunctionDefinition
    | StructureDefinition
    | StreamDefinition;

export default class Borrow extends SimpleExpression {
    readonly borrow: Token;
    readonly source: Reference | undefined;
    readonly dot: Token | undefined;
    readonly name: Reference | undefined;
    readonly version: Token | undefined;

    constructor(
        borrow?: Token,
        source?: Reference,
        dot?: Token,
        name?: Reference,
        version?: Token,
    ) {
        super();

        this.borrow = borrow ?? new Token(BORROW_SYMBOL, Sym.Borrow);
        this.source = source;
        this.dot = dot;
        this.name = name;
        this.version = version;

        this.computeChildren();
    }

    getDescriptor(): NodeDescriptor {
        return 'Borrow';
    }

    getGrammar(): Grammar {
        return [
            { name: 'borrow', kind: node(Sym.Borrow) },
            {
                name: 'source',
                kind: any(node(Reference), none()),
                space: true,
                label: () => (l) => l.node.Borrow.source,
            },
            { name: 'dot', kind: optional(node(Sym.Access)) },
            {
                name: 'name',
                kind: optional(node(Reference)),
                label: () => (l) => l.node.Borrow.name,
            },
            {
                name: 'version',
                kind: optional(node(Sym.Number)),
                label: () => (l) => l.node.Borrow.version,
            },
        ];
    }

    getPurpose() {
        return Purpose.Source;
    }

    clone(replace?: Replacement) {
        return new Borrow(
            this.replaceChild('borrow', this.borrow, replace),
            this.replaceChild('source', this.source, replace),
            this.replaceChild('dot', this.dot, replace),
            this.replaceChild('name', this.name, replace),
            this.replaceChild('version', this.version, replace),
        ) as this;
    }

    isEvaluationInvolved() {
        return true;
    }

    getShare(
        context: Context,
    ): [Source | undefined, SharedDefinition] | undefined {
        if (this.source === undefined) return undefined;

        return context.project.getShare(
            this.source.getName(),
            this.name?.getName(),
        );
    }

    computeConflicts(context: Context): Conflict[] {
        const conflicts: Conflict[] = [];

        // Borrows can't depend on on sources that depend on this program.
        // Check the dependency graph to see if this definition's source depends on this borrow's source.
        const [definition, source] = this.getShare(context) ?? [];
        if (definition === undefined && source === undefined)
            conflicts.push(new UnknownBorrow(this));

        return conflicts;
    }

    getDependencies(context: Context): Expression[] {
        const [, def] = this.getShare(context) ?? [];
        return def instanceof Expression ? [def] : [];
    }

    compile(): Step[] {
        // One step, evaluted below in evaluate(), which launches the evaluation of the source
        // file containing the name referred to.
        return [
            new Start(this, (evaluator) => this.start(evaluator)),
            new Finish(this),
        ];
    }

    start(evaluator: Evaluator): Value | undefined {
        // Evaluate the source
        const [source, definition] =
            this.getShare(evaluator.getCurrentContext()) ?? [];

        // If we didn't find anything, throw an exception.
        if (source === undefined) {
            // If there's no source and there's no definition, return an exception.
            if (definition === undefined)
                return new NameException(
                    this,
                    this.borrow,
                    undefined,
                    evaluator,
                );

            // Otherwise, bind the definition in the current evaluation, wrapping it in a value if necessary.
            const value =
                definition instanceof FunctionDefinition
                    ? new FunctionValue(definition, undefined)
                    : definition instanceof StructureDefinition
                      ? new StructureDefinitionValue(definition)
                      : definition instanceof StreamDefinition
                        ? new StreamDefinitionValue(definition)
                        : definition;

            if (value instanceof Bind || value instanceof Source)
                throw Error(
                    "It should't ever be possible that a Bind or Source is shared without a source.",
                );

            // Bind the value in the current evaluation for use.
            evaluator.bind(definition.names, value);

            // Jump over the finish.
            evaluator.jump(1);
        }
        // If there is a source, we need to evaluate it to get the requested value.
        else {
            // If the source we're evaluating is already on the evaluation stack, it's a cycle.
            // Halt now rather than later having a stack overflow.
            if (evaluator.isEvaluatingSource(source))
                return new CycleException(evaluator, this);

            // Otherwise, evaluate the source, and delegate the binding to the Evaluator.
            evaluator.startEvaluation(new Evaluation(evaluator, this, source));
        }
    }

    evaluate(evaluator: Evaluator): Value {
        const [source, definition] =
            this.getShare(evaluator.getCurrentContext()) ?? [];

        // Now that the source is evaluated, bind it's value if we're binding the source,
        if (this.source) {
            const value = evaluator.popValue(this);
            if (this.name === undefined) {
                if (source === undefined)
                    return new NameException(
                        this,
                        this.source.name,
                        undefined,
                        evaluator,
                    );
                evaluator.bind(source.names, value);
            }
            // Bind the share if we're binding a share.
            else if (this.name) {
                const name = this.name.getName();
                const value = evaluator.getLastEvaluation()?.resolve(name);
                if (definition === undefined || value === undefined)
                    return new NameException(
                        this,
                        this.name.name,
                        undefined,
                        evaluator,
                    );
                evaluator.bind(definition.names, value);
            }
            return value;
        } else return new UnimplementedException(evaluator, this);
    }

    computeType(context: Context): Type {
        const [, definition] = this.getShare(context) ?? [];
        return definition === undefined
            ? new UnknownNameType(this, this.name?.name, undefined)
            : definition.getType(context);
    }

    evaluateTypeGuards(current: TypeSet): TypeSet {
        return current;
    }

    getName() {
        return this.source === undefined ? undefined : this.source.getName();
    }

    getVersion() {
        return this.version === undefined
            ? undefined
            : new NumberValue(this, this.version, Unit.Empty).toNumber();
    }

    getStart() {
        return this.borrow;
    }

    getFinish() {
        return this.source ?? this.borrow;
    }

    static readonly LocalePath = (l: LocaleText) => l.node.Borrow;
    getLocalePath() {
        return Borrow.LocalePath;
    }

    getStartExplanations(locales: Locales, context: Context) {
        return locales.concretize(
            (l) => l.node.Borrow.start,
            this.source
                ? new NodeRef(
                      this.source,
                      locales,
                      context,
                      this.source.getName(),
                  )
                : undefined,
            this.name
                ? new NodeRef(this.name, locales, context, this.name.getName())
                : undefined,
        );
    }

    getCharacter() {
        return Characters.Borrow;
    }

    getDescriptionInputs() {
        return [this.name?.getName()];
    }
}
