import type Conflict from '@conflicts/Conflict';
import { UnknownBorrow } from '@conflicts/UnknownBorrow';
import { MissingKitVersion } from '@conflicts/MissingKitVersion';
import { ConflictingKitVersions } from '@conflicts/ConflictingKitVersions';
import { UnknownKit } from '@conflicts/UnknownKit';
import { UnavailableKit } from '@conflicts/UnavailableKit';
import type { EditContext, InsertContext } from '@edit/revision/EditContext';
import type LocaleText from '@locale/LocaleText';
import NodeRef from '@locale/NodeRef';
import type { NodeDescriptor } from '@locale/NodeTexts';
import { BORROW_SYMBOL, LINK_SYMBOL, PROPERTY_SYMBOL } from '@parser/Symbols';
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
import { Purpose } from '@concepts/Purpose';
import type Locales from '@locale/Locales';
import Characters from '../lore/BasisCharacters';
import StreamDefinitionValue from '@values/StreamDefinitionValue';
import Bind from '@nodes/Bind';
import type Context from '@nodes/Context';
import type Definition from '@nodes/Definition';
import Expression from '@nodes/Expression';
import FunctionDefinition from '@nodes/FunctionDefinition';
import {
    any,
    node,
    none,
    optional,
    type Grammar,
    type Replacement,
} from '@nodes/Node';
import Reference from '@nodes/Reference';
import SimpleExpression from '@nodes/SimpleExpression';
import Source from '@nodes/Source';
import StreamDefinition from '@nodes/StreamDefinition';
import StructureDefinition from '@nodes/StructureDefinition';
import { Sym } from '@nodes/Sym';
import Token from '@nodes/Token';
import type Type from '@nodes/Type';
import type TypeSet from '@nodes/TypeSet';
import Unit from '@nodes/Unit';
import KitValue from '@values/KitValue';
import UnknownNameType from '@nodes/UnknownNameType';
import KitCannotBorrow from '@conflicts/KitCannotBorrow';

export type SharedDefinition =
    Source | Bind | FunctionDefinition | StructureDefinition | StreamDefinition;

/**
 * A reference to a published kit, as written in a borrow: `@amy/colors`.
 *
 * The same `username/name` shape a character reference uses, and for the same reason — a
 * creator's names are theirs, so nobody has to win a global race for `colors`.
 */
export type KitRef = { username: string; name: string };

/**
 * What a project knows about one of the kits it borrows.
 *
 * `loading` exists so that opening a project doesn't light up red while its kits are
 * being fetched: an unresolved borrow is an `Error`-severity conflict, so without a state
 * meaning "not yet" every project with a kit would flash a conflict on every load. It is
 * also why {@link Project.dependenciesSettled} gates evaluation.
 */
export type Dependency =
    | { status: 'loading' }
    /** Fetched and parsed. The source is what {@link Project.getShare} searches. */
    | { status: 'loaded'; source: Source; kit: string; version: number }
    /** No such kit, or no such version of it. */
    | { status: 'missing' }
    /** It exists, but this viewer may not read it — taken down, or never published. */
    | { status: 'blocked' };

/**
 * The key a {@link Dependency} is stored under, and the unit a version is pinned at.
 *
 * Case is preserved rather than folded: a Wordplay name is case-sensitive, and folding
 * here would make `@Amy/Colors` and `@amy/colors` one dependency while the language
 * treats them as two different names.
 */
export function dependencyKey(ref: KitRef, version: number): string {
    return `${ref.username}/${ref.name}@${version}`;
}

/**
 * Read the `@username/name` out of a kit token's text.
 *
 * Returns undefined rather than throwing, because this runs over source a creator is
 * still typing. The tokenizer's own rule guarantees the shape, so a failure here means
 * the token came from somewhere else.
 */
export function parseKitRef(text: string): KitRef | undefined {
    if (!text.startsWith('@')) return undefined;
    const slash = text.indexOf('/');
    if (slash < 2 || slash === text.length - 1) return undefined;
    return {
        username: text.substring(1, slash),
        name: text.substring(slash + 1),
    };
}

export default class Borrow extends SimpleExpression {
    readonly borrow: Token;
    /** A kit published by a creator, e.g. `@amy/colors` (#8). Mutually exclusive with
     *  `source`: a borrow names either something in this project or something outside it. */
    readonly external: Token | undefined;
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
        external?: Token,
    ) {
        super();

        this.borrow = borrow ?? new Token(BORROW_SYMBOL, Sym.Borrow);
        this.external = external;
        this.source = source;
        this.dot = dot;
        this.name = name;
        this.version = version;

        this.computeChildren();
    }

    /** A borrow of a published kit, rather than of a source in this project. */
    static kit(ref: string, name?: Reference, version?: number) {
        return new Borrow(
            undefined,
            undefined,
            undefined,
            name,
            version === undefined
                ? undefined
                : new Token(`${version}`, Sym.Number),
            new Token(ref, Sym.External),
        );
    }

    getDescriptor(): NodeDescriptor {
        return 'Borrow';
    }

    /** A borrow is only meaningful in a program's borrow list, so it's never offered as a replacement. */
    static getPossibleReplacements() {
        return [];
    }

    /** Offer a borrow wherever a grammar field holds borrows (a program's borrow list). */
    static getPossibleInsertions({ parent, field, locales }: InsertContext) {
        const kind = parent.getGrammar().find((f) => f.name === field)?.kind;
        // Named, not bare: a lone `↓` reparses by swallowing the next line's first name, and a
        // `_` lexes as a placeholder rather than the source's name — either way the soundness
        // gate dropped it, so no borrow was ever offered.
        return kind !== undefined && kind.allowsKind(Borrow)
            ? [
                  new Borrow(
                      undefined,
                      Reference.make(
                          locales.getUnannotatedPrimaryText(
                              (l) => l.glossary.name.word,
                          ),
                      ),
                  ),
              ]
            : [];
    }

    /**
     * Complete a kit borrow as it is typed (`↓`, `↓ @`, `↓ @am`).
     *
     * Its own mechanism rather than a field-driven one, exactly as `Language`'s is: a kit
     * reference is one `Sym.External` token, and `getPossibleNodes` yields nothing for a
     * token field, so no path a text caret takes could ever offer one.
     */
    getPossibleCompletions(anchor: Token, edit: EditContext): Borrow[] {
        const kits = edit.kits;
        if (kits === undefined || kits.length === 0) return [];

        // What has been typed so far, if anything: the `↓` alone means nothing yet.
        const typed =
            anchor === this.external ? anchor.getText().replace('@', '') : '';
        if (anchor !== this.borrow && anchor !== this.external) return [];

        return kits
            .filter((kit) => kit.name.startsWith(typed))
            .map((kit) =>
                Borrow.kit(`${LINK_SYMBOL}${kit.name}`, undefined, kit.version),
            );
    }

    getGrammar(): Grammar {
        return [
            { name: 'borrow', kind: node(Sym.Borrow), label: undefined },
            {
                name: 'external',
                kind: optional(node(Sym.External)),
                space: true,
                label: () => (l) => l.node.Borrow.label.source,
            },
            {
                name: 'source',
                kind: any(node(Reference), none()),
                space: true,
                label: () => (l) => l.node.Borrow.label.source,
            },
            { name: 'dot', kind: optional(node(Sym.Access)), label: undefined },
            {
                name: 'name',
                // Assigning a name also creates the dot that separates it from the source, since
                // a name without one would print as a separate statement.
                kind: any(
                    node(Reference),
                    none(['dot', () => new Token(PROPERTY_SYMBOL, Sym.Access)]),
                ),
                label: () => (l) => l.node.Borrow.label.bind,
            },
            {
                // Spaced, or the version joins the name it follows: `↓@amy/colors3` lexes
                // `colors3` as the kit's name and loses the version entirely. Latent since
                // the numeral was added, and only reachable now that something reads it.
                name: 'version',
                kind: optional(node(Sym.Number)),
                space: true,
                label: () => (l) => l.node.Borrow.label.version,
            },
        ];
    }

    getPurpose() {
        return Purpose.Advanced;
    }

    clone(replace?: Replacement) {
        return new Borrow(
            this.replaceChild('borrow', this.borrow, replace),
            this.replaceChild('source', this.source, replace),
            this.replaceChild('dot', this.dot, replace),
            this.replaceChild('name', this.name, replace),
            this.replaceChild('version', this.version, replace),
            this.replaceChild('external', this.external, replace),
        ) as this;
    }

    isEvaluationInvolved() {
        return true;
    }

    /** The kit this borrows, if it borrows one. */
    getKitRef(): KitRef | undefined {
        return this.external === undefined
            ? undefined
            : parseKitRef(this.external.getText());
    }

    /** How this project is resolving the kit named here, if any. */
    getDependency(context: Context): Dependency | undefined {
        const ref = this.getKitRef();
        const version = this.getVersion();
        return ref === undefined || version === undefined
            ? undefined
            : context.project.getDependency(ref, version);
    }

    getShare(
        context: Context,
    ): [Source | undefined, SharedDefinition] | undefined {
        // A kit resolves against the source the project fetched for it, not against the
        // project's own sources, so it can't go through Project.getShare's name lookup.
        if (this.external !== undefined) {
            const dependency = this.getDependency(context);
            if (dependency?.status !== 'loaded') return undefined;
            const name = this.name?.getName();
            if (name === undefined)
                return [dependency.source, dependency.source];
            const def = dependency.source.getShare(name);
            return def === undefined ? undefined : [dependency.source, def];
        }

        if (this.source === undefined) return undefined;

        return context.project.getShare(
            this.source.getName(),
            this.name?.getName(),
        );
    }

    /**
     * The definitions this borrow brings into scope.
     *
     * Scope has to agree with what {@link Borrow.evaluate} binds, or a name works at
     * runtime and resolves nowhere at check time — which is what a creator sees, since
     * the editor shows conflicts. A kit named with nothing after it binds *every* share,
     * so every share has to be in scope; a local source binds its own value instead, for
     * the reason `evaluate` gives.
     */
    getScopeDefinitions(context: Context): Definition[] {
        const [source, definition] = this.getShare(context) ?? [];
        if (source === undefined)
            return definition === undefined ? [] : [definition];
        if (this.external !== undefined && this.name === undefined)
            return [...source.getShares(), source];
        return [definition === undefined ? source : definition, source];
    }

    computeConflicts(context: Context): Conflict[] {
        const conflicts: Conflict[] = [];

        // A published source is the only file its readers get, so it can borrow nothing:
        // a kit resolves no dependencies of its own, and a `↓ helper` naming a source
        // that stays behind would resolve to nothing — or to the borrower's own `helper`.
        // A rule about this `↓` belongs on this `↓` rather than in a dialog's checklist (#8).
        if (context.project.isPublishedKitSource(context.source))
            conflicts.push(new KitCannotBorrow(this));

        if (this.external !== undefined) {
            // A version is required, and must be the only one this source asks for. Each
            // of these keeps whatever is already in `conflicts`, since a borrow that
            // cannot be here at all is still worth saying alongside what else is wrong.
            if (this.getVersion() === undefined)
                return [...conflicts, new MissingKitVersion(this)];
            const ref = this.getKitRef();
            if (ref !== undefined && this.conflictsWithAnotherVersion(context))
                return [...conflicts, new ConflictingKitVersions(this)];

            switch (this.getDependency(context)?.status) {
                // Still being fetched. Deliberately no conflict: an unresolved borrow is
                // an error, so without this every project using a kit would turn red on
                // load and then quietly go green, which reads as a broken editor.
                case 'loading':
                case undefined:
                    return conflicts;
                case 'missing':
                    return [...conflicts, new UnknownKit(this)];
                case 'blocked':
                    return [...conflicts, new UnavailableKit(this)];
            }
        }

        // Borrows can't depend on sources that depend on this program.
        // Check the dependency graph to see if this definition's source depends on this borrow's source.
        const [definition, source] = this.getShare(context) ?? [];
        if (definition === undefined && source === undefined)
            conflicts.push(new UnknownBorrow(this));

        return conflicts;
    }

    /** Whether another borrow in this source names the same kit at a different version. */
    private conflictsWithAnotherVersion(context: Context): boolean {
        const ref = this.getKitRef();
        const version = this.getVersion();
        if (ref === undefined || version === undefined) return false;
        const source = context.project.getSourceOf(this) ?? context.source;
        return source.expression.borrows.some((other) => {
            if (other === this) return false;
            const otherRef = other.getKitRef();
            const otherVersion = other.getVersion();
            return (
                otherRef !== undefined &&
                otherVersion !== undefined &&
                otherRef.username === ref.username &&
                otherRef.name === ref.name &&
                otherVersion !== version
            );
        });
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

        // Either kind of reference evaluated a source; only the token naming it differs.
        const reference = this.external ?? this.source?.name;

        // Now that the source is evaluated, bind it's value if we're binding the source,
        if (reference) {
            const value = evaluator.popValue(this);
            if (this.name === undefined) {
                if (source === undefined)
                    return new NameException(
                        this,
                        reference,
                        undefined,
                        evaluator,
                    );
                // A kit named with nothing after it brings in everything it shares, since
                // a kit *is* its shares. A local source named the same way binds the
                // source's own value instead, because a source is a program that
                // evaluates to something — the asymmetry is what `@` marks.
                if (this.external !== undefined) {
                    const evaluation = evaluator.getLastEvaluation();
                    for (const share of source.getShares()) {
                        if (share instanceof Source) continue;
                        const shared = evaluation?.resolve(
                            share.names.getNames()[0],
                        );
                        if (shared === undefined)
                            return new NameException(
                                this,
                                reference,
                                undefined,
                                evaluator,
                            );
                        evaluator.bind(share.names, shared);
                    }
                    // ...and the kit itself, so `colors.sunset` can say which kit it
                    // means (#1373). Additional to the flat binds rather than instead of
                    // them: shipped examples use a kit's exports by bare name.
                    if (evaluation !== undefined)
                        evaluator.bind(
                            source.names,
                            new KitValue(this, source, evaluation),
                        );
                    return value;
                }
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
        return this.external !== undefined
            ? this.getKitRef()?.name
            : this.source === undefined
              ? undefined
              : this.source.getName();
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
        return this.external ?? this.source ?? this.borrow;
    }

    static readonly LocalePath = (l: LocaleText) => l.node.Borrow;
    getLocalePath() {
        return Borrow.LocalePath;
    }

    getStartExplanations(locales: Locales, context: Context) {
        return locales.concretize((l) => l.node.Borrow.start, {
            source: this.source
                ? new NodeRef(
                      this.source,
                      locales,
                      context,
                      this.source.getName(),
                  )
                : undefined,
            name: this.name
                ? new NodeRef(this.name, locales, context, this.name.getName())
                : undefined,
        });
    }

    getCharacter() {
        return Characters.Borrow;
    }

    getDescriptionInputs() {
        return {
            name: this.name?.getName(),
        };
    }
}
