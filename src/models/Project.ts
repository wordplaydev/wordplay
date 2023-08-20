import { v4 as uuidv4 } from 'uuid';
import type Conflict from '@conflicts/Conflict';
import Evaluate from '@nodes/Evaluate';
import { Basis } from '../basis/Basis';
import Expression from '@nodes/Expression';
import FunctionDefinition from '@nodes/FunctionDefinition';
import type Program from '@nodes/Program';
import type StructureDefinition from '@nodes/StructureDefinition';
import Source from '@nodes/Source';
import Node from '@nodes/Node';
import Context from '@nodes/Context';
import type { SharedDefinition } from '@nodes/Borrow';
import PropertyReference from '@nodes/PropertyReference';
import type Bind from '@nodes/Bind';
import Reference from '@nodes/Reference';
import type LanguageCode from '@locale/LanguageCode';
import type StreamDefinition from '@nodes/StreamDefinition';
import { parseNames } from '../parser/parseBind';
import Root from '../nodes/Root';
import type { Path } from '../nodes/Root';
import type { CaretPosition } from '../edit/Caret';
import type createDefaultShares from '@runtime/createDefaultShares';
import FunctionType from '../nodes/FunctionType';
import type Locale from '../locale/Locale';
import { getBestSupportedLocales, toLocaleString } from '../locale/Locale';
import { toTokens } from '../parser/toTokens';
import type LocalesDatabase from '../db/LocalesDatabase';

export type SerializedSource = {
    names: string;
    code: string;
    caret: SerializedCaret;
};
export type SerializedProject = {
    /** A uuid4 */
    id: string;
    /** A single Translation, serialized */
    name: string;
    sources: SerializedSource[];
    /** A list of locales, which are a ISO 639-1 languaage code, followed by a -, followed by ISO 3166-2 region code: https://en.wikipedia.org/wiki/ISO_3166-2 */
    locales: string[];
    /** A list of Firestore user IDs */
    uids: string[];
    /** True if the project is listed in a creator's performance */
    listed: boolean;
    /** True if the project is archived */
    archived: boolean;
    /** When this was created */
    timestamp: number;
};

type Analysis = {
    conflicts: Conflict[];
    primary: Map<Node, Conflict[]>;
    secondary: Map<Node, Conflict[]>;
    /** Evaluations by function and structures they evaluate (a call graph) */
    evaluations: Map<
        FunctionDefinition | StructureDefinition | StreamDefinition,
        Set<Evaluate>
    >;
    /** Expression dependencies */
    /** An index of expression dependencies, mapping an Expression to one or more Expressions that are affected if it changes value.  */
    dependencies: Map<Expression, Set<Expression>>;
};

type SerializedCaret = number | Path;
type SerializedSourceCaret = { source: Source; caret: SerializedCaret };
type SerializedCarets = SerializedSourceCaret[];

/**
 * A project with a name, some source files, and evaluators for each source file.
 **/
export default class Project {
    /** The unique ID of the project */
    readonly id: string;

    /** The name of the project */
    readonly name: string;

    /** The main source file that starts evaluation */
    readonly main: Source;

    /** All source files in the project, and their evaluators */
    readonly supplements: Source[];

    /** Serialized caret positions for each source file */
    readonly carets: SerializedCarets;

    /** A list of uids that have write access to this project. */
    readonly uids: string[];

    /** True if it should be listed in the projects list. Allows tutorial projects not to be listed. */
    readonly listed: boolean;

    /** True if has been archived */
    readonly archived: boolean;

    /** A cache of source contexts */
    readonly sourceContext: Map<Source, Context> = new Map();

    /** A cache of constants */
    readonly constants: Map<Expression, boolean> = new Map();

    /** An index of each source in the project */
    readonly roots: Root[];

    /** Default shares */
    readonly shares: ReturnType<typeof createDefaultShares>;

    /** The locales on which this project relies */
    readonly locales: Locale[];

    /** The localized basis bindings */
    readonly basis: Basis;

    /** The time when this project version created. */
    readonly timestamp: number;

    /** Conflicts. */
    analyzed: 'unanalyzed' | 'analyzing' | 'analyzed' = 'unanalyzed';
    analysis: Analysis = {
        conflicts: [],
        primary: new Map(),
        secondary: new Map(),
        evaluations: new Map(),
        dependencies: new Map(),
    };

    constructor(
        id: string | null,
        name: string,
        main: Source,
        supplements: Source[],
        locales: Locale | Locale[],
        uids: string[] = [],
        carets: SerializedCarets | undefined = undefined,
        listed = true,
        archived = false,
        timestamp: number | undefined = undefined
    ) {
        this.id = id ?? uuidv4();
        this.uids = uids;
        this.timestamp = timestamp ?? Date.now();

        // Remember the source.
        this.name = name;
        this.main = main;
        this.supplements = supplements.slice();

        // Remember the locale dependencies
        this.locales = Array.isArray(locales) ? locales : [locales];

        // Get a Basis for the requested locales.
        this.basis = Basis.getLocalizedBasis(this.locales);

        // Initialize default shares
        this.shares = this.basis.shares;

        // Remember the carets
        this.carets =
            carets === undefined
                ? this.getSources().map((source) => {
                      return { source, caret: 0 };
                  })
                : carets;

        // Remember whether this project should be listed as a project. (Used to not list tutorial projects).
        this.listed = listed;

        // Remember whether this is archived.
        this.archived = archived;

        // Initialize roots for all definitions that can be referenced.
        this.roots = [
            ...this.getSources().map((source) => source.root),
            ...this.basis.roots,
            ...this.shares.all.map((share) => new Root(share)),
        ];
    }

    copy() {
        return new Project(
            null,
            this.name,
            this.main,
            this.supplements,
            this.locales,
            this.uids,
            this.carets,
            this.listed,
            this.archived
        );
    }

    equals(project: Project) {
        return (
            this.id === project.id &&
            this.name === project.name &&
            this.getSources().every((source1) =>
                project
                    .getSources()
                    .some((source2) => source1.isEqualTo(source2))
            )
        );
    }

    getNodeByID(id: number): Node | undefined {
        for (const root of this.roots) {
            const node = root.getID(id);
            if (node) return node;
        }
        return undefined;
    }

    getRoot(node: Node): Root | undefined {
        return this.roots.find((root) => root.has(node));
    }

    /** Given a path, try to resolve a corresponding node in one of the sources. */
    resolvePath(path: Path) {
        // Resolve the node from the path.
        let evaluate: Node | undefined = undefined;
        for (const root of this.roots) {
            evaluate = root.resolvePath(path);
            if (evaluate !== undefined) break;
        }
        return evaluate;
    }

    /** True if one of the project's contains the given node. */
    contains(node: Node) {
        return this.getSources().some((source) => source.root.has(node));
    }

    getSources() {
        return [this.main, ...this.supplements];
    }

    getSourceWithName(name: string) {
        return this.getSources().find((source) => source.hasName(name));
    }

    getIndexOfSource(source: Source) {
        return this.getSources().indexOf(source);
    }

    getDefaultShares() {
        return this.shares;
    }

    getLocales() {
        return this.basis.locales;
    }

    getContext(source: Source) {
        let context = this.sourceContext.get(source);
        if (context === undefined) {
            context = new Context(this, source);
            this.sourceContext.set(source, context);
        }
        return context;
    }

    getNodeContext(node: Node) {
        const source = this.getSourceOf(node);
        return this.getContext(source ?? this.main);
    }

    getSourceOf(node: Node) {
        return this.getSources().find((source) => source.root.has(node));
    }

    getSourcesExcept(source: Source) {
        return [this.main, ...this.supplements].filter((s) => s !== source);
    }
    getName() {
        return this.name;
    }
    getSourceWithProgram(program: Program) {
        return this.getSources().find(
            (source) => source.expression === program
        );
    }
    getBasis() {
        return this.basis;
    }

    getAnalysis() {
        // If there's a cycle, return the analysis thus far.
        return this.analysis;
    }

    analyze() {
        if (this.analyzed === 'analyzed' || this.analyzed === 'analyzing')
            return this.analysis;

        this.analyzed = 'analyzing';

        this.analysis = {
            conflicts: [],
            primary: new Map(),
            secondary: new Map(),
            evaluations: new Map(),
            dependencies: new Map(),
        };

        // Build a mapping from nodes to conflicts.
        for (const source of this.getSources()) {
            const context = this.getContext(source);

            // Compute all of the conflicts in the program.
            this.analysis.conflicts = this.analysis.conflicts.concat(
                source.expression.getAllConflicts(context)
            );

            // Build conflict indices by going through each conflict, asking for the conflicting nodes
            // and adding to the conflict to each node's list of conflicts.
            for (const conflict of this.analysis.conflicts) {
                const complicitNodes = conflict.getConflictingNodes();
                this.analysis.primary.set(complicitNodes.primary.node, [
                    ...(this.analysis.primary.get(
                        complicitNodes.primary.node
                    ) ?? []),
                    conflict,
                ]);
                if (complicitNodes.secondary) {
                    const nodeConflicts =
                        this.analysis.secondary.get(
                            complicitNodes.secondary.node
                        ) ?? [];
                    this.analysis.secondary.set(complicitNodes.secondary.node, [
                        ...nodeConflicts,
                        conflict,
                    ]);
                }
            }

            // Build a mapping from functions and structures to their evaluations.
            for (const node of source.nodes()) {
                // Find all Evaluates
                if (node instanceof Evaluate) {
                    // Find the function called.
                    const fun = node.getFunction(context);
                    if (fun) {
                        // Add this evaluate to the function's list of calls.
                        const evaluates =
                            this.analysis.evaluations.get(fun) ?? new Set();
                        evaluates.add(node);
                        this.analysis.evaluations.set(fun, evaluates);

                        // Is it a higher order function? Get the function input
                        // and add the Evaluate as a caller of the function input.
                        if (fun instanceof FunctionDefinition) {
                            for (const input of node.inputs) {
                                const type = input.getType(context);
                                if (
                                    type instanceof FunctionType &&
                                    type.definition
                                ) {
                                    const hofEvaluates =
                                        this.analysis.evaluations.get(
                                            type.definition
                                        ) ?? new Set();
                                    hofEvaluates.add(node);
                                    this.analysis.evaluations.set(
                                        type.definition,
                                        hofEvaluates
                                    );
                                }
                            }
                        }
                    }
                }

                // Build the dependency graph by asking each expression node for its dependencies.
                // Determine whether the node is constant.
                if (node instanceof Expression) {
                    const dependencies = node.getDependencies(context);
                    for (const dependency of dependencies) {
                        const set = this.analysis.dependencies.get(dependency);
                        if (set) set.add(node);
                        else
                            this.analysis.dependencies.set(
                                dependency,
                                new Set([node])
                            );
                    }
                }
            }
        }

        this.analyzed = 'analyzed';

        return this.analysis;
    }

    getConflicts() {
        return this.getAnalysis().conflicts;
    }

    getPrimaryConflicts() {
        return this.getAnalysis().primary;
    }

    getSecondaryConflicts() {
        return this.getAnalysis().secondary;
    }

    nodeInvolvedInConflicts(node: Node) {
        return (
            this.getPrimaryConflicts().has(node) ||
            this.getSecondaryConflicts().has(node)
        );
    }

    /** Given a node N, and the set of conflicts C in the program, determines the subset of C in which the given N is complicit. */
    getPrimaryConflictsInvolvingNode(node: Node) {
        return this.getPrimaryConflicts().get(node);
    }

    getSecondaryConflictsInvolvingNode(node: Node) {
        return this.getSecondaryConflicts().get(node);
    }

    getEvaluationsOf(
        fun: FunctionDefinition | StructureDefinition
    ): Evaluate[] {
        return Array.from(this.getAnalysis().evaluations.get(fun) ?? []);
    }

    getExpressionsAffectedBy(expression: Expression): Set<Expression> {
        return this.getAnalysis().dependencies.get(expression) ?? new Set();
    }

    /** Return true if the given expression is in this project and depends only on contants. */
    isConstant(expression: Expression): boolean {
        let constant = this.constants.get(expression);
        const context = this.getNodeContext(expression);
        // If we haven't visited this expression yet, compute it.
        if (constant === undefined) {
            // Mark this as not constant, assuming (and preventing) cycles.
            this.constants.set(expression, false);
            constant = expression.isConstant(context);
            // Now actually compute whether it's constant.
            this.constants.set(expression, constant);
        }
        return constant;
    }

    /** Get supplements not referenced by main */
    getUnusedSupplements(): Source[] {
        // Return all supplements for which no source's borrows borrow it.
        return this.supplements.filter(
            (supplement) =>
                !this.getSources().some((source) =>
                    source.expression.borrows.some(
                        (borrow) =>
                            (borrow.getShare(this.getContext(source)) ??
                                [])[0] === supplement
                    )
                )
        );
    }

    /** Searches source other than the given borrow for top-level binds matching the given name. */
    getShare(
        source: string,
        name: string | undefined
    ): [Source | undefined, SharedDefinition] | undefined {
        // Do any of the sources match the requested source, or have a share that matches, or a shared bind that matches?
        const match = this.getSources().find((s) => s.hasName(source));
        if (match) {
            if (name === undefined) return [match, match];
            const def = match.getShare(name);
            return def === undefined ? undefined : [match, def];
        }

        // Do any of the implicit shares match?
        const defaultMatch = this.shares.all.find((s) => s.hasName(source));

        return defaultMatch === undefined
            ? undefined
            : [undefined, defaultMatch];
    }

    // Get all bindings, functions, and structures shared in the project.
    getShares(): SharedDefinition[] {
        return this.getSources().reduce(
            (definitions: SharedDefinition[], source) => {
                return [...definitions, ...source.getShares()];
            },
            []
        );
    }

    getReferences(bind: Bind): (Reference | PropertyReference)[] {
        const refs: (Reference | PropertyReference)[] = [];
        for (const source of this.getSources()) {
            const context = this.getContext(source);
            for (const ref of source.nodes(
                (n): n is Reference | PropertyReference =>
                    n instanceof Reference || n instanceof PropertyReference
            ) as (Reference | PropertyReference)[]) {
                if (ref.resolve(context) === bind) refs.push(ref);
            }
        }
        return refs;
    }

    clone() {
        return new Project(
            this.id,
            this.name,
            this.main,
            this.supplements,
            this.locales,
            this.uids,
            this.carets,
            this.listed,
            this.archived
        );
    }

    withName(name: string) {
        return new Project(
            this.id,
            name,
            this.main,
            this.supplements,
            this.locales,
            this.uids,
            this.carets,
            this.listed,
            this.archived
        );
    }

    withSource(oldSource: Source, newSource: Source) {
        return this.withSources([[oldSource, newSource]]);
    }

    /** Copies this project, but with the new locale added if it's not already included. */
    withLocales(locales: Locale[]) {
        return new Project(
            this.id,
            this.name,
            this.main,
            this.supplements,
            Array.from(new Set([...this.locales, ...locales])),
            this.uids,
            this.carets,
            this.listed,
            this.archived
        );
    }

    withCaret(source: Source, caret: CaretPosition) {
        return new Project(
            this.id,
            this.name,
            this.main,
            this.supplements,
            this.locales,
            this.uids,
            this.carets.map((sourceCaret) =>
                sourceCaret.source === source
                    ? {
                          source,
                          caret:
                              caret instanceof Node
                                  ? source.root.getPath(caret)
                                  : caret,
                      }
                    : sourceCaret
            ),
            this.listed,
            this.archived
        );
    }

    withoutSource(source: Source) {
        return new Project(
            this.id,
            this.name,
            this.main,
            this.supplements.filter((s) => s !== source),
            this.locales,
            this.uids,
            this.carets.filter((c) => c.source !== source),
            this.listed,
            this.archived
        );
    }

    withSources(replacements: [Source, Source][]) {
        const mainReplacement = replacements.find(
            (replacement) => replacement[0] === this.main
        );
        const newMain = mainReplacement ? mainReplacement[1] : this.main;
        const newSupplements = this.supplements.map((supplement) => {
            const supplementReplacement = replacements.find(
                (replacement) => replacement[0] === supplement
            );
            return supplementReplacement
                ? supplementReplacement[1]
                : supplement;
        });
        return new Project(
            this.id,
            this.name,
            newMain,
            newSupplements,
            this.locales,
            this.uids,
            this.carets.map((caret) => {
                // See if the caret's source was replaced.
                const replacement = replacements.find(
                    ([original]) => original === caret.source
                );
                return replacement !== undefined
                    ? { source: replacement[1], caret: caret.caret }
                    : caret;
            }),
            this.listed,
            this.archived
        );
    }

    withRevisedNodes(nodes: [Node, Node | undefined][]) {
        const replacementSources: [Source, Source, CaretPosition][] = [];

        // Go through each replacement and generate a new source.
        for (const [original, replacement] of nodes) {
            const source = this.getSourceOf(original);
            if (source === undefined) {
                console.error("Couldn't find source of node being replaced");
                return this;
            }
            // Check if we made a new source already.
            const sources = replacementSources.find(
                ([original]) => original === source
            );
            // If not, create a new one, mapping the original to the new source.
            if (sources === undefined)
                replacementSources.push([
                    source,
                    source.replace(original, replacement),
                    replacement === undefined
                        ? source.getNodeFirstPosition(original) ?? 0
                        : replacement,
                ]);
            // Update the replacement source with the next replacement.
            else {
                sources[1] = sources[1].replace(original, replacement);
                sources[2] =
                    replacement === undefined
                        ? source.getNodeFirstPosition(original) ?? 0
                        : replacement;
            }
        }

        // Replace the sources
        let newProject = this.withSources(
            replacementSources.map(([oldSource, newSource]) => [
                oldSource,
                newSource,
            ])
        );

        // Replace the carets
        for (const [, newSource, caret] of replacementSources)
            newProject = newProject.withCaret(newSource, caret);

        // Return the revised project
        return newProject;
    }

    withNewSource(name: string) {
        const newSource = new Source(name, '');
        return new Project(
            this.id,
            this.name,
            this.main,
            [...this.supplements, newSource],
            this.locales,
            this.uids,
            [...this.carets, { source: newSource, caret: 0 }],
            this.listed,
            this.archived
        );
    }

    withUser(uid: string) {
        return this.uids.some((user) => user === uid)
            ? this
            : new Project(
                  this.id,
                  this.name,
                  this.main,
                  this.supplements,
                  this.locales,
                  [...this.uids, uid],
                  this.carets,
                  this.listed,
                  this.archived
              );
    }

    isReadOnly(uid: string) {
        return !this.uids.includes(uid);
    }

    getBindReplacements(
        evaluates: Evaluate[],
        name: string,
        value: Expression | undefined
    ): [Evaluate, Evaluate | undefined][] {
        return evaluates.map((evaluate) => [
            evaluate,
            evaluate.withBindAs(
                name,
                value?.clone(),
                this.getNodeContext(evaluate)
            ),
        ]);
    }

    /** Get all the languages used in the project */
    getLanguages() {
        return Array.from(
            new Set(
                this.getSources().reduce(
                    (list: LanguageCode[], source: Source) =>
                        list.concat(source.expression.getLanguagesUsed()),
                    []
                )
            )
        );
    }

    getOutput() {
        const evaluates = this.main
            .nodes()
            .filter((node): node is Evaluate => node instanceof Evaluate);
        return [
            ...evaluates.filter((evaluate) =>
                evaluate.is(
                    this.shares.output.Stage,
                    this.getNodeContext(evaluate)
                )
            ),
            ...evaluates.filter((evaluate) =>
                evaluate.is(
                    this.shares.output.Group,
                    this.getNodeContext(evaluate)
                )
            ),
            ...evaluates.filter((evaluate) =>
                evaluate.is(
                    this.shares.output.Phrase,
                    this.getNodeContext(evaluate)
                )
            ),
        ];
    }

    getCaretPosition(source: Source): CaretPosition | undefined {
        const position: SerializedCaret | undefined = this.carets.find(
            (c) => c.source === source
        )?.caret;

        return position !== undefined
            ? typeof position === 'number'
                ? position
                : source.root.resolvePath(position)
            : undefined;
    }

    static deserializeSource(source: SerializedSource): Source {
        return new Source(parseNames(toTokens(source.names)), source.code);
    }

    static async deserializeProject(
        localesDB: LocalesDatabase,
        project: SerializedProject
    ): Promise<Project> {
        const sources = project.sources.map((source) =>
            Project.deserializeSource(source)
        );

        // Get all of the locales on which the project depends.
        const dependentLocales = await localesDB.loadLocales(
            getBestSupportedLocales(project.locales)
        );

        const locales = Array.from(
            new Set([...dependentLocales, ...localesDB.getLocales()])
        );

        return new Project(
            project.id,
            project.name,
            sources[0],
            sources.slice(1),
            locales,
            project.uids,
            project.sources.map((s, index) => {
                return { source: sources[index], caret: s.caret };
            }),
            project.listed,
            project.archived,
            project.timestamp
        );
    }

    getLanguagesUsed(): LanguageCode[] {
        const used = this.getSources().reduce(
            (languages: LanguageCode[], source) => [
                ...languages,
                ...source.expression.getLanguagesUsed(),
            ],
            []
        );

        return Array.from(
            new Set([...this.locales.map((l) => l.language), ...used])
        );
    }

    isListed() {
        return this.listed;
    }

    isArchived() {
        return this.archived;
    }

    asArchived() {
        return new Project(
            this.id,
            this.name,
            this.main,
            this.supplements,
            this.locales,
            this.uids,
            this.carets,
            this.listed,
            true
        );
    }

    serialize(): SerializedProject {
        return {
            id: this.id,
            name: this.name,
            sources: this.getSources().map((source) => {
                return {
                    names: source.names.toWordplay(),
                    code: source.code.toString(),
                    caret:
                        this.carets.find((c) => c.source === source)?.caret ??
                        0,
                };
            }),
            locales: this.locales.map((l) => toLocaleString(l)),
            uids: this.uids,
            listed: this.listed,
            archived: this.archived,
            timestamp: this.timestamp,
        };
    }
}
