import Templates from '@concepts/Templates';
import type Conflict from '@conflicts/Conflict';
import { Permission, type PermissionName } from '@input/permissions';
import type { CaretPosition } from '@edit/caret/Caret';
import concretize from '@locale/concretize';
import { getBestSupportedLocales } from '@locale/getBestSupportedLocales';
import type Locale from '@locale/Locale';
import { localeToString } from '@locale/Locale';
import type { SharedDefinition } from '@nodes/Borrow';
import Changed from '@nodes/Changed';
import Context from '@nodes/Context';
import type Definition from '@nodes/Definition';
import Doc from '@nodes/Doc';
import Evaluate from '@nodes/Evaluate';
import Expression from '@nodes/Expression';
import FunctionDefinition from '@nodes/FunctionDefinition';
import Name from '@nodes/Name';
import Node from '@nodes/Node';
import type Program from '@nodes/Program';
import PropertyReference from '@nodes/PropertyReference';
import Reference from '@nodes/Reference';
import Source from '@nodes/Source';
import type StreamDefinition from '@nodes/StreamDefinition';
import type StructureDefinition from '@nodes/StructureDefinition';
import { DOCS_SYMBOL } from '@parser/Symbols';
import type createDefaultShares from '@runtime/createDefaultShares';
import { v4 as uuidv4 } from 'uuid';
import { Basis } from '@basis/Basis';
import DefaultLocale from '@locale/DefaultLocale';
import Locales from '@locale/Locales';
import type LocaleText from '@locale/LocaleText';
import FunctionType from '@nodes/FunctionType';
import type { Path } from '@nodes/Root';
import Root from '@nodes/Root';
import { parseNames } from '@parser/parseBind';
import { toTokens } from '@parser/toTokens';
import {
    PROJECT_PARAM_EDIT,
    PROJECT_PARAM_PLAY,
} from '../../routes/[[locale]]/project/constants';
import type LocalesDatabase from '@db/locales/LocalesDatabase';
import { type ModerationState, unknownFlags } from '@db/projects/Moderation';
import {
    type ProjectID,
    ProjectSchemaLatestVersion,
    type SerializedCaret,
    type SerializedPreview,
    type SerializedProject,
    type SerializedProjectStamps,
    type SerializedProjectUnknownVersion,
    type SerializedSource,
    type SerializedSourceCheckpoint,
    upgradeProject,
} from '@db/projects/ProjectSchemas';
import {
    bumpField,
    emptyStamps,
    type FieldStamp,
    getStamp,
    mergeField,
    mergeStamps,
} from '@db/projects/VectorClock';

/**
 * How we store projects in memory, mirroring the data in the deserialized form.
 * We store them in an object literal like this for less error prone immutable modifications.
 * Without this we'd have to pass all fields into a constructor for every kind of change,
 * which means every time we add or change a field, it requires modification everywhere.
 * This pattern allows us to do a simple object spread with a new value.
 */
export type ProjectData = Omit<SerializedProject, 'sources' | 'locales'> & {
    /** The main source file that starts evaluation */
    main: Source;
    /** All source files in the project, and their evaluators */
    supplements: Source[];
    /**
     * The locales on which this project relies.
     * Not an indicator of what locales are currently selected; a locale may be selected that this project does not use. */
    locales: LocaleText[];
    /** Serialized caret positions for each source file */
    carets: SerializedSourceCaret[];
};

/**
 * The metadata fields that participate in the per-field stamp merge.
 *
 * # Why we use stamps for these fields specifically
 *
 * Wordplay merges two divergent copies of a project using two different
 * mechanisms, picked to match the shape of the data:
 *
 *   - **Source code** goes through a Yjs CRDT (ProjectCRDT.ts). Two
 *     people typing in different functions both belong in the final
 *     string — there's no "winner" to pick.
 *   - **These metadata fields** go through per-field Lamport stamps
 *     (VectorClock.ts). They're scalars or arrays where concurrent
 *     edits to the *same* field do have to pick a winner; the only
 *     question is whose write came causally later.
 *
 * # Why these fields can't just live in the CRDT
 *
 * The CRDT is opaque binary bytes from the outside. These fields stay
 * as plain Firestore fields because Wordplay relies on them for two
 * things the CRDT can't support:
 *
 *   1. **Security rules.** `firestore.rules` checks predicates like
 *      `request.auth.uid in resource.data.collaborators` to gate writes.
 *      That requires `collaborators` (and `owner`, `viewers`,
 *      `commenters`) to be plain queryable arrays.
 *   2. **Server-side queries.** Firestore queries like "all listed
 *      public projects in this gallery" need `where('public', '==',
 *      true)`. Same constraint: the field has to be a plain top-level
 *      value, not buried in a CRDT blob.
 *
 * `name`, `locales`, and `preview` also live here because they're
 * rendered in project tiles without loading the full project — so they
 * need to be cheap to read off the project doc directly.
 *
 * # Fields handled by other mechanisms (not in this list)
 *
 *  - `id`, `v`                : never change, no merge needed.
 *  - `timestamp`              : scalar fallback used only when *both*
 *                                sides have NeverWritten stamps on a
 *                                field (the v6→v7 migration window).
 *                                Bumped on every save independently.
 *  - `persisted`              : local-only flag; sticky-true on merge.
 *  - `history`                : append-only checkpoints; merged by
 *                                union, not by stamp.
 *  - `carets`                 : ephemeral UI state, never synced.
 *  - `stamps`                 : the stamps themselves; merged together
 *                                via {@link mergeStamps}.
 *  - `crdt`                   : the CRDT snapshot; merged by applying
 *                                the remote bytes to the local Y.Doc
 *                                (see ProjectsDatabase.foldRemoteCRDT).
 *  - sources / `main` / `supplements` :
 *      Source *content* (code, names) lives in the CRDT, which is the
 *      authoritative source of truth and merges by character-level
 *      convergence. Source *structure* (number of sources, ordering)
 *      is rare to change concurrently; mergeWith picks local sources
 *      and lets the CRDT reconcile their text content.
 */
const StampedMetadataFields: readonly (keyof ProjectData & string)[] = [
    'name',
    'locales',
    'owner',
    'collaborators',
    'public',
    'listed',
    'archived',
    'gallery',
    'flags',
    'nonPII',
    'chat',
    'restrictedGallery',
    'viewers',
    'commenters',
    'preview',
];

type Analysis = {
    conflicts: Conflict[];
    conflictedNodes: Map<Node, Conflict[]>;
    /** Evaluations by function and structures they evaluate (a call graph) */
    evaluations: Map<
        FunctionDefinition | StructureDefinition | StreamDefinition,
        Set<Evaluate>
    >;
    /** Expression dependencies */
    /** An index of expression dependencies, mapping an Expression to one or more Expressions that are affected if it changes value.  */
    dependencies: Map<Expression, Set<Expression>>;
};

type SerializedSourceCaret = { source: Source; caret: SerializedCaret };

/**
 * The maximum number of code points we allow in the history. We allow about 20% of a 1 MB project file.
 * For a very large project (thousand of lines of code) that allows for ~100 distinct versions.
 */
const MaxCheckpointSize = 200000;

/**
 * The maximum number of editors who can be actively coediting a project at
 * the same moment in time. This is a *live-presence* cap, not a lifetime
 * cap on the `collaborators` array — a project can list any number of
 * collaborators over its life, but only this many can have a live presence
 * session (and therefore push CRDT updates) at once. When a fifth editor
 * tries to join, they sit in a read-only "waiting" state until one of the
 * four publishes a leave (or stops heartbeating long enough to fall out
 * of the presence map).
 *
 * Matches the design call: "a small group in a classroom (4 students)
 * would be a reasonable enforced maximum." Viewers and commenters never
 * count against this cap because they don't publish presence at all.
 */
export const MAX_CONCURRENT_EDITORS = 4;

/**
 * A project with a name, some source files, and evaluators for each source file.
 **/
export default class Project {
    /** The immutable data for the project */
    private readonly data: ProjectData;

    /** A cache of source contexts */
    readonly sourceContext: Map<Source, Context> = new Map();

    /** A cache of constants */
    readonly constants: Map<Expression, boolean> = new Map();

    /** An index of each source in the project */
    readonly roots: Root[];

    /** Default shares */
    readonly shares: ReturnType<typeof createDefaultShares>;

    /** The localized basis bindings */
    readonly basis: Basis;

    /** Conflicts. */
    analyzed: 'unanalyzed' | 'analyzing' | 'analyzed' = 'unanalyzed';
    analysis: Analysis = {
        conflicts: [],
        conflictedNodes: new Map(),
        evaluations: new Map(),
        dependencies: new Map(),
    };

    /** A cache of expressions that dependent on Changed expressions, so we can quickly know to reevaluate them. */
    #changeDependentExpressions: Set<Expression> | undefined = undefined;

    constructor(data: ProjectData) {
        // Copy to prevent external modification
        this.data = { ...data };

        // Get a Basis for the requested locales.
        this.basis = Basis.getLocalizedBasis(
            new Locales(concretize, this.data.locales, DefaultLocale),
        );

        // Initialize default shares
        this.shares = this.basis.shares;

        // Initialize roots for all definitions that can be referenced.
        this.roots = [
            ...this.getSources().map((source) => source.root),
            ...this.basis.getRoots(),
        ];
    }

    static make(
        id: string | null,
        name: string,
        main: Source,
        supplements: Source[],
        locales: LocaleText | LocaleText[],
        owner: string | null = null,
        collaborators: string[] = [],
        pub = false,
        carets: SerializedSourceCaret[] | undefined = undefined,
        listed = true,
        archived = false,
        persisted = false,
        gallery: string | null = null,
        // By default, unmoderated.
        flags: ModerationState = unknownFlags(),
        // This is last; omitting it updates the time.
        timestamp: number | undefined = undefined,
    ) {
        return new Project({
            v: ProjectSchemaLatestVersion,
            id: id ?? uuidv4(),
            name,
            main,
            supplements,
            locales: Array.isArray(locales) ? locales : [locales],
            owner,
            collaborators,
            public: pub,
            carets:
                carets ??
                [main, ...supplements].map((source) => {
                    return { source, caret: 0 };
                }),
            listed,
            archived,
            persisted,
            gallery,
            flags,
            timestamp: timestamp ?? Date.now(),
            nonPII: [],
            chat: null,
            history: [],
            restrictedGallery: false,
            viewers: [],
            commenters: [],
            stamps: emptyStamps(),
            crdt: null,
        });
    }

    copy(newOwner: string | null) {
        return Project.make(
            uuidv4(),
            this.getName(),
            this.getMain(),
            this.getSupplements(),
            this.getLocales().getLocales(),
            newOwner,
        ).asUnmoderated();
    }

    equals(project: Project) {
        return (
            this.getID() === project.getID() &&
            this.getName() === project.getName() &&
            this.getSources().length === project.getSources().length &&
            this.getSources().every((source1, index1) =>
                source1.isEqualTo(project.getSources()[index1]),
            )
        );
    }

    getID(): ProjectID {
        return this.data.id;
    }

    getLink(fullscreen: boolean) {
        return `/project/${encodeURI(this.getID())}${
            fullscreen ? `?${PROJECT_PARAM_PLAY}` : `?${PROJECT_PARAM_EDIT}`
        }`;
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
    resolvePath(sourceNumber: number, path: Path) {
        const source = this.getSources()[sourceNumber];
        if (source === undefined) return undefined;
        else return source.root.resolvePath(path);
    }

    /** True if one of the project's contains the given node. */
    contains(node: Node) {
        return this.getSources().some((source) => source.root.has(node));
    }

    getSources() {
        return [this.getMain(), ...this.data.supplements];
    }

    getSourceWithName(name: string) {
        return this.getSources().find((source) => source.hasName(name));
    }

    getIndexOfSource(source: Source) {
        return this.getSources().indexOf(source);
    }

    getSourceWithIndex(index: number): Source | undefined {
        return this.getSources()[index];
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
        return this.getContext(source ?? this.getMain());
    }

    getSourceOf(node: Node) {
        return this.getSources().find((source) => source.root.has(node));
    }

    getSourcesExcept(source: Source) {
        return this.getSources().filter((s) => s !== source);
    }

    getName() {
        return this.data.name;
    }

    getSourceWithProgram(program: Program) {
        return this.getSources().find(
            (source) => source.expression === program,
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
            conflictedNodes: new Map(),
            evaluations: new Map(),
            dependencies: new Map(),
        };

        // Build a mapping from nodes to conflicts.
        for (const source of this.getSources()) {
            const context = this.getContext(source);

            // Compute all of the conflicts in this source.
            const rawConflicts = source.expression.getAllConflicts(context);

            // Drop structural duplicates (same constructor + same Node fields).
            // `Conflict.isEqualTo` exists but no caller used it for dedup; the
            // Annotations UI did a defensive identity-Set pass instead. With
            // the type-rooted cascade gates in place, true duplicates are
            // already rare — this is a backstop for any that slip through. #1146
            const sourceConflicts: Conflict[] = [];
            for (const c of rawConflicts)
                if (!sourceConflicts.some((d) => d.isEqualTo(c)))
                    sourceConflicts.push(c);

            this.analysis.conflicts =
                this.analysis.conflicts.concat(sourceConflicts);

            // Build conflict indices for just this source's new conflicts.
            // (Earlier sources' conflicts were already indexed in their own
            // iteration — re-iterating the cumulative list double-counts.)
            for (const conflict of sourceConflicts) {
                const node = conflict.getConflictingNode(context, Templates);
                this.analysis.conflictedNodes.set(node, [
                    ...(this.analysis.conflictedNodes.get(node) ?? []),
                    conflict,
                ]);
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
                                            type.definition,
                                        ) ?? new Set();
                                    hofEvaluates.add(node);
                                    this.analysis.evaluations.set(
                                        type.definition,
                                        hofEvaluates,
                                    );
                                }
                            }
                        }
                    }
                }
            }

            // Now create the dependency graph using the call graph.
            for (const node of source.nodes()) {
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
                                new Set([node]),
                            );
                    }
                }
            }
        }

        this.analyzed = 'analyzed';

        return this.analysis;
    }

    static analyze(project: Project): Analysis {
        let newAnalysis: Analysis = {
            conflicts: [],
            conflictedNodes: new Map(),
            evaluations: new Map(),
            dependencies: new Map(),
        };

        // Build a mapping from nodes to conflicts.
        for (const source of project.getSources()) {
            const context = project.getContext(source);

            // Compute all of the conflicts in the program.
            newAnalysis.conflicts = newAnalysis.conflicts.concat(
                source.expression.getAllConflicts(context),
            );

            // Build conflict indices by going through each conflict, asking for the conflicting nodes
            // and adding to the conflict to each node's list of conflicts.
            for (const conflict of newAnalysis.conflicts) {
                const node = conflict.getConflictingNode(context, Templates);
                newAnalysis.conflictedNodes.set(node, [
                    ...(newAnalysis.conflictedNodes.get(node) ?? []),
                    conflict,
                ]);
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
                            newAnalysis.evaluations.get(fun) ?? new Set();
                        evaluates.add(node);
                        newAnalysis.evaluations.set(fun, evaluates);

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
                                        newAnalysis.evaluations.get(
                                            type.definition,
                                        ) ?? new Set();
                                    hofEvaluates.add(node);
                                    newAnalysis.evaluations.set(
                                        type.definition,
                                        hofEvaluates,
                                    );
                                }
                            }
                        }
                    }
                }
            }

            // Now create the dependency graph using the call graph.
            for (const node of source.nodes()) {
                // Build the dependency graph by asking each expression node for its dependencies.
                // Determine whether the node is constant.
                if (node instanceof Expression) {
                    const dependencies = node.getDependencies(context);
                    for (const dependency of dependencies) {
                        const set = newAnalysis.dependencies.get(dependency);
                        if (set) set.add(node);
                        else
                            newAnalysis.dependencies.set(
                                dependency,
                                new Set([node]),
                            );
                    }
                }
            }
        }

        return newAnalysis;
    }

    getConflicts() {
        return this.getAnalysis().conflicts;
    }

    getNewConflictsBatch(
        oldSource: Source,
        newSources: Source[],
        // Any conflict types to ignore
        negligibleConflicts: (new () => Conflict)[],
    ): Map<Source, Conflict[]> {
        // Get the current conflicts.
        const currentConflicts = this.getMajorConflictsNow();
        const newConflictsBySource = new Map<Source, Conflict[]>();
        // For all of the new sources, get the new conflicts caused by the revision.
        for (const newSource of newSources) {
            let newConflicts = this.withSource(oldSource, newSource)
                .getMajorConflictsNow()
                .filter(
                    (conflict) =>
                        !negligibleConflicts.some(
                            (neglibile) => conflict instanceof neglibile,
                        ),
                );

            // Remove all current conflicts that are in the new conflicts.
            newConflictsBySource.set(
                newSource,
                newConflicts.filter(
                    (newConflict) =>
                        !currentConflicts.some((oldConflict) =>
                            oldConflict.isEqualTo(newConflict),
                        ),
                ),
            );
        }
        return newConflictsBySource;
    }

    getNewConflicts(
        oldSource: Source,
        newSource: Source,
        negligibleConflicts: (new () => Conflict)[],
    ): Conflict[] {
        const newConflicts = this.getNewConflictsBatch(
            oldSource,
            [newSource],
            negligibleConflicts,
        );
        return Array.from(newConflicts.values())[0];
    }

    getMajorConflictsNow() {
        let conflicts: Conflict[] = [];
        for (const source of this.getSources()) {
            const context = this.getContext(source);
            for (const node of source.nodes()) {
                conflicts = [...conflicts, ...node.computeConflicts(context)];
            }
        }
        return conflicts.filter((conflict) => !conflict.isMinor());
    }

    hasMajorConflictsNow() {
        for (const source of this.getSources()) {
            const context = this.getContext(source);
            for (const node of source.nodes()) {
                if (
                    node
                        .computeConflicts(context)
                        .filter((conflict) => !conflict.isMinor()).length > 0
                )
                    return true;
            }
        }
        return false;
    }

    getConflictedNodes() {
        return this.getAnalysis().conflictedNodes;
    }

    nodeInvolvedInConflicts(node: Node) {
        return this.getConflictedNodes().has(node);
    }

    /** Given a node N, and the set of conflicts C in the program, determines the subset of C in which the given N is complicit. */
    getConflictsInvolvingNode(node: Node) {
        return this.getConflictedNodes().get(node);
    }

    getEvaluationsOf(
        fun: FunctionDefinition | StructureDefinition,
    ): Evaluate[] {
        return Array.from(this.getAnalysis().evaluations.get(fun) ?? []);
    }

    getExpressionsAffectedBy(expression: Expression): Set<Expression> {
        return this.getAnalysis().dependencies.get(expression) ?? new Set();
    }

    /**
     * Returns true if the given expression is transitively dependent on a Changed expression.
     * Used to determine whether to reevaluate an expression at evaluation time.
     */
    isChangedDependentExpression(expr: Expression): boolean {
        if (this.#changeDependentExpressions === undefined) {
            const analysis = this.analyze();
            this.#changeDependentExpressions = new Set();

            const changes = Array.from(analysis.dependencies.entries()).filter(
                (s) => s[0] instanceof Changed,
            );
            while (changes.length > 0) {
                const [, dependents] = changes.pop()!;
                for (const dependent of dependents) {
                    if (!this.#changeDependentExpressions.has(dependent)) {
                        this.#changeDependentExpressions.add(dependent);
                        const furtherDependents =
                            analysis.dependencies.get(dependent);
                        if (furtherDependents) {
                            changes.push([dependent, furtherDependents]);
                        }
                    }
                }
            }
        }
        return this.#changeDependentExpressions.has(expr);
    }

    /** Return true if the given expression is in this project and depends only on contants. */
    isConstant(expression: Expression): boolean {
        let constant = this.constants.get(expression);
        // If we haven't visited this expression yet, compute it.
        if (constant === undefined) {
            // Mark this as not constant, assuming (and preventing) cycles.
            this.constants.set(expression, false);
            // Compute whether the expression is constant.
            const context = this.getNodeContext(expression);
            constant = expression.isConstant(context);
            // Cache the determination for later.
            this.constants.set(expression, constant);
        }
        return constant;
    }

    /** Get supplements not referenced by main */
    getUnusedSupplements(): Source[] {
        // Return all supplements for which no source's borrows borrow it.
        return this.data.supplements.filter(
            (supplement) =>
                !this.getSources().some((source) =>
                    source.expression.borrows.some(
                        (borrow) =>
                            (borrow.getShare(this.getContext(source)) ??
                                [])[0] === supplement,
                    ),
                ),
        );
    }

    /** Searches source other than the given borrow for top-level binds matching the given name. */
    getShare(
        source: string,
        name: string | undefined,
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
            [],
        );
    }

    getReferences(bind: Definition): (Reference | PropertyReference)[] {
        const refs: (Reference | PropertyReference)[] = [];
        for (const source of this.getSources()) {
            const context = this.getContext(source);
            for (const ref of source.nodes(
                (n): n is Reference | PropertyReference =>
                    n instanceof Reference || n instanceof PropertyReference,
            ) as (Reference | PropertyReference)[]) {
                if (ref.resolve(context) === bind) refs.push(ref);
            }
        }
        return refs;
    }

    /**
     * Returns the set of browser permissions this project's sources reference,
     * by checking whether any reference resolves to a permission-requiring
     * basis stream definition. Used to show pre-evaluation permission feedback.
     */
    getRequiredPermissions(): Set<PermissionName> {
        const required = new Set<PermissionName>();
        const input = this.shares.input;
        const map: [Definition, PermissionName][] = [
            [input.Volume, Permission.Microphone],
            [input.Pitch, Permission.Microphone],
            [input.Speech, Permission.Microphone],
            [input.Camera, Permission.Camera],
            [input.Hand, Permission.Camera],
        ];
        for (const [definition, permission] of map) {
            if (this.getReferences(definition).length > 0)
                required.add(permission);
        }
        return required;
    }

    withName(name: string) {
        return new Project({ ...this.data, name });
    }

    getMain() {
        return this.data.main;
    }

    getSupplements() {
        return [...this.data.supplements];
    }

    withSource(oldSource: Source, newSource: Source) {
        return this.withSources([[oldSource, newSource]]);
    }

    /** Copies this project, but with the new locale added if it's not already included, placing new locales in the front, and the remainder at the end. */
    withLocales(locales: LocaleText[]) {
        return new Project({
            ...this.data,
            locales: [
                // New locales
                ...locales,
                // Locales that aren't the locales in the list above, in their current order.
                ...this.data.locales.filter(
                    (l1) =>
                        !locales.some(
                            (l2) =>
                                l2.language === l1.language &&
                                l2.regions.join() === l1.regions.join(),
                        ),
                ),
            ],
        });
    }

    withCaret(source: Source, caret: CaretPosition) {
        return new Project({
            ...this.data,
            carets: this.data.carets.map((sourceCaret) =>
                sourceCaret.source === source
                    ? {
                          source,
                          caret:
                              caret instanceof Node
                                  ? source.root.getPath(caret)
                                  : caret,
                      }
                    : sourceCaret,
            ),
        });
    }

    withoutSource(source: Source) {
        return new Project({
            ...this.data,
            supplements: this.data.supplements.filter((s) => s !== source),
            carets: this.data.carets.filter((c) => c.source !== source),
        });
    }

    withSources(replacements: [Source, Source][]) {
        const mainReplacement = replacements.find(
            (replacement) => replacement[0] === this.getMain(),
        );
        const newMain = mainReplacement ? mainReplacement[1] : this.getMain();
        const newSupplements = this.data.supplements.map((supplement) => {
            const supplementReplacement = replacements.find(
                (replacement) => replacement[0] === supplement,
            );
            return supplementReplacement
                ? supplementReplacement[1]
                : supplement;
        });

        const newCarets = this.data.carets.map((caret) => {
            // See if the caret's source was replaced.
            const replacement = replacements.find(
                ([original]) => original === caret.source,
            );
            return replacement !== undefined
                ? { source: replacement[1], caret: caret.caret }
                : caret;
        });

        return new Project({
            ...this.data,
            main: newMain,
            supplements: newSupplements,
            carets: newCarets,
        });
    }

    withRevisedNodes(nodes: [Node, Node | undefined][]) {
        const replacementSources: [Source, Source, CaretPosition][] = [];

        // Go through each replacement and generate a new source.
        for (const [original, replacement] of nodes) {
            const source = this.getSourceOf(original);
            if (source === undefined) {
                console.error(
                    "Couldn't find source of node being replaced: ",
                    original.toWordplay(),
                );
            } else {
                // Check if we made a new source already.
                const sources = replacementSources.find(
                    ([original]) => original === source,
                );
                // If not, create a new one, mapping the original to the new source.
                if (sources === undefined)
                    replacementSources.push([
                        source,
                        source.replace(original, replacement),
                        replacement === undefined
                            ? (source.getNodeFirstPosition(original) ?? 0)
                            : replacement,
                    ]);
                // Update the replacement source with the next replacement.
                else {
                    sources[1] = sources[1].replace(original, replacement);
                    sources[2] =
                        replacement === undefined
                            ? (source.getNodeFirstPosition(original) ?? 0)
                            : replacement;
                }
            }
        }

        // Replace the sources
        let newProject = this.withSources(
            replacementSources.map(([oldSource, newSource]) => [
                oldSource,
                newSource,
            ]),
        );

        // Replace the carets
        for (const [, newSource, caret] of replacementSources)
            newProject = newProject.withCaret(newSource, caret);

        // Return the revised project
        return newProject;
    }

    withNewSource(name: string, code?: string | undefined) {
        const newSource = new Source(name, code ?? '');
        return new Project({
            ...this.data,
            supplements: [...this.data.supplements, newSource],
            carets: [...this.data.carets, { source: newSource, caret: 0 }],
        });
    }

    hasOwner() {
        return this.data.owner !== null;
    }

    getOwner() {
        return this.data.owner;
    }

    isOwner(uid: string) {
        return this.data.owner === uid;
    }

    withOwner(owner: string | null) {
        return new Project({ ...this.data, owner });
    }

    getCollaborators() {
        return [...this.data.collaborators];
    }

    /** Get a list of all owners and collaborators in a singe list. */
    getContributors() {
        return [
            ...(this.data.owner ? [this.data.owner] : []),
            ...this.data.collaborators,
        ];
    }

    hasContributor(uid: string) {
        return this.getContributors().includes(uid);
    }

    hasCollaborator(uid: string) {
        return this.data.collaborators.includes(uid);
    }

    isReadOnly(uid: string) {
        return !this.data.collaborators.includes(uid);
    }

    withCollaborator(uid: string) {
        if (this.data.collaborators.includes(uid)) return this;
        return new Project({
            ...this.data,
            collaborators: [...this.data.collaborators, uid],
        });
    }

    withoutCollaborator(uid: string) {
        return !this.data.collaborators.some((user) => user === uid)
            ? this
            : new Project({
                  ...this.data,
                  collaborators: this.data.collaborators.filter(
                      (id) => id !== uid,
                  ),
              });
    }

    isPublic() {
        return this.data.public;
    }

    asPublic(pub = true) {
        return new Project({ ...this.data, public: pub });
    }

    getBindReplacements(
        evaluates: Evaluate[],
        name: string,
        value: Expression | undefined,
    ): [Evaluate, Evaluate | undefined][] {
        return evaluates.map((evaluate) => {
            // Find the bind corresponding to the name.
            const context = this.getNodeContext(evaluate);
            const fun = evaluate.getFunction(context);
            const bind = fun?.inputs.find((bind) => bind.hasName(name));
            return bind
                ? [
                      evaluate,
                      evaluate.withBindAs(
                          bind,
                          value?.clone(),
                          this.getNodeContext(evaluate),
                      ),
                  ]
                : [evaluate, evaluate];
        });
    }

    getPrimaryLanguage() {
        return this.getLocales().getLocale().language;
    }

    withPrimaryLocale(locale: LocaleText) {
        return new Project({
            ...this.data,
            locales: [locale, ...this.data.locales.filter((l) => l !== locale)],
        });
    }

    getOutput() {
        const evaluates = this.getMain()
            .nodes()
            .filter((node): node is Evaluate => node instanceof Evaluate);
        return [
            ...evaluates.filter((evaluate) =>
                evaluate.is(
                    this.shares.output.Stage,
                    this.getNodeContext(evaluate),
                ),
            ),
            ...evaluates.filter((evaluate) =>
                evaluate.is(
                    this.shares.output.Group,
                    this.getNodeContext(evaluate),
                ),
            ),
            ...evaluates.filter((evaluate) =>
                evaluate.is(
                    this.shares.output.Phrase,
                    this.getNodeContext(evaluate),
                ),
            ),
        ];
    }

    getCaretPosition(source: Source): CaretPosition | undefined {
        const position: SerializedCaret | undefined = this.data.carets.find(
            (c) => c.source === source,
        )?.caret;

        return position !== undefined
            ? // Number? Return it.
              typeof position === 'number'
                ? position
                : // Range? If it's of length 2 and they're both numbers, return a range.
                  Array.isArray(position)
                  ? position.length === 2 &&
                    position.every((n) => typeof n === 'number')
                      ? [position[0], position[1]]
                      : undefined
                  : // A node path? Resolve it.
                    source.root.resolvePath(position)
            : undefined;
    }

    static deserializeSource(source: SerializedSource): Source {
        return new Source(
            parseNames(toTokens(source.names)),
            // We changed the documentation symbol. Automatically convert it when deserializing. by seeing if there are 2 or more `` in the code,
            // and no ¶ and if so, replace them with the new symbol.
            (source.code.match(/``/g) || []).length >= 2 &&
                (source.code.match(/¶/g) || []).length === 0
                ? source.code.replaceAll('``', DOCS_SYMBOL)
                : source.code,
        );
    }

    /**
     * Given a project and a locales database, return a deserialized project.
     * Loads necessary locales on demand.
     *
     * @param localesDB A locales database, so any necessary locales can be loaded.
     * @param project The serialized project to deserialize
     * @returns A deserialized Project.
     */
    static async deserialize(
        localesDB: LocalesDatabase,
        project: SerializedProjectUnknownVersion,
    ): Promise<Project> {
        // Upgrade the project just in case.
        project = upgradeProject(project);

        // Get all of the locales on which the project depends.
        const dependentLocales = await localesDB.loadLocales(
            getBestSupportedLocales(project.locales),
        );

        const locales = Array.from(
            new Set([...dependentLocales, ...localesDB.getLocales()]),
        );

        const sources = project.sources.map((source) =>
            Project.deserializeSource(source),
        );

        return new Project({
            v: ProjectSchemaLatestVersion,
            id: project.id,
            name: project.name,
            main: sources[0],
            supplements: sources.slice(1),
            locales,
            owner: project.owner,
            collaborators: project.collaborators,
            public: project.public,
            carets: project.sources.map((s, index) => {
                return { source: sources[index], caret: s.caret };
            }),
            listed: project.listed,
            archived: project.archived,
            persisted: project.persisted,
            gallery: project.gallery,
            flags: { ...project.flags },
            timestamp: project.timestamp,
            nonPII: project.nonPII,
            chat: project.chat,
            history: project.history,
            restrictedGallery: project.restrictedGallery,
            viewers: project.viewers,
            commenters: project.commenters,
            preview: project.preview,
            stamps: {
                lamport: project.stamps.lamport,
                fields: { ...project.stamps.fields },
            },
            crdt: project.crdt,
        });
    }

    getLocalesUsed(): Locale[] {
        const locales: Record<string, Locale> = {};
        for (const source of this.getSources()) {
            for (const [id, locale] of Object.entries(
                source.expression.getLocalesUsed(this.getContext(source)),
            ))
                locales[id] = locale;
        }
        return Array.from(Object.values(locales));
    }

    isListed() {
        return this.data.listed;
    }

    isArchived() {
        return this.data.archived;
    }

    asArchived(archived: boolean) {
        return new Project({ ...this.data, archived });
    }

    asPersisted() {
        return new Project({ ...this.data, persisted: true });
    }

    isPersisted() {
        return this.data.persisted;
    }

    getGallery() {
        return this.data.gallery;
    }

    withGallery(id: string | null) {
        return new Project({ ...this.data, gallery: id });
    }

    getFlags() {
        return { ...this.data.flags };
    }

    withFlags(flags: ModerationState) {
        return new Project({ ...this.data, flags: { ...flags } });
    }

    asUnmoderated() {
        return new Project({ ...this.data, flags: unknownFlags() });
    }

    withNewTime() {
        return new Project({ ...this.data, timestamp: Date.now() });
    }

    getTimestamp() {
        return this.data.timestamp;
    }

    getNonPII() {
        return this.data.nonPII;
    }

    withNonPII(text: string) {
        return new Project({
            ...this.data,
            // Add to the set of text
            nonPII: Array.from(new Set([...this.data.nonPII, text])),
        });
    }

    withPII(text: string) {
        // Remove from the set of text
        const withPII = this.data.nonPII.filter((piiText) => {
            return piiText != text;
        });
        return new Project({ ...this.data, nonPII: withPII });
    }

    isNotPII(text: string) {
        return this.data.nonPII.includes(text);
    }

    /**
     * Creates a new project, filtering any Name or Doc that aren't one of the given locales' languages, and converting any references
     * to the first preferred language given.
     */
    withRevisedLocales(locales: Locales) {
        // Find all language tagged names that aren't in the desired locales so we can remove them.
        const unnecessaryNames = this.getSources().reduce(
            (matches: Name[], source) => {
                return [
                    ...matches,
                    ...source.nodes().filter((n): n is Name => {
                        if (!(n instanceof Name)) return false;
                        const language = n.getLanguage();
                        if (language === undefined) return false;
                        return !locales.hasLanguage(language);
                    }),
                ];
            },
            [],
        );

        // Find all the language tagged docs that aren't in the desired locales so we can remove them.
        const unnecessaryDocs = this.getSources().reduce(
            (matches: Doc[], source) => {
                return [
                    ...matches,
                    ...source.nodes().filter((n): n is Doc => {
                        if (!(n instanceof Doc)) return false;
                        const language = n.getLanguage();
                        if (language === undefined) return false;
                        return !locales.hasLanguage(language);
                    }),
                ];
            },
            [],
        );

        // Replace all the references in the project to the preferred language
        const replacedReferences: [Reference, Reference][] =
            this.getSources().reduce(
                (matches: [Reference, Reference][], source) => {
                    // Resolve the reference.
                    const revisions: [Reference, Reference][] = [];
                    for (const ref of source
                        .nodes()
                        .filter(
                            (n): n is Reference => n instanceof Reference,
                        )) {
                        const def = ref.resolve(this.getNodeContext(ref));
                        if (def) {
                            const preferred = def.names
                                .getPreferredName(locales.getLocales(), false)
                                ?.getName();
                            if (preferred) {
                                revisions.push([
                                    ref,
                                    Reference.make(preferred),
                                ]);
                            }
                        }
                    }
                    return [...matches, ...revisions];
                },
                [],
            );

        return (
            // Remove all spacing before docs to be removed so there's no extra space.
            this.withSources(
                this.getSources().map((source) => {
                    let spacing = source.getSpaces();
                    for (const doc of unnecessaryDocs) {
                        spacing = spacing.withSpace(doc, '');
                    }
                    return [source, source.withSpaces(spacing)];
                }),
            )
                // Remove all the unnecessary nodes from the project, and replace others.
                .withRevisedNodes(
                    [...unnecessaryNames, ...unnecessaryDocs].map((node) => {
                        return [node, undefined];
                    }),
                )
                .withRevisedNodes(replacedReferences)
        );
    }

    getSerializedSources(): SerializedSource[] {
        return this.getSources().map((source) => {
            return {
                names: source.names.toWordplay(),
                code: source.code.toString(),
                caret:
                    this.data.carets.find((c) => c.source === source)?.caret ??
                    0,
            };
        });
    }

    serialize(): SerializedProject {
        const serialized: SerializedProject = {
            v: ProjectSchemaLatestVersion,
            id: this.getID(),
            name: this.getName(),
            sources: this.getSerializedSources(),
            locales: this.getLocales()
                .getLocales()
                .map((l) => localeToString(l)),
            owner: this.data.owner,
            collaborators: this.data.collaborators,
            listed: this.isListed(),
            public: this.data.public,
            archived: this.isArchived(),
            persisted: this.isPersisted(),
            timestamp: this.data.timestamp,
            gallery: this.data.gallery,
            flags: { ...this.data.flags },
            nonPII: this.data.nonPII,
            chat: this.data.chat,
            history: this.data.history,
            restrictedGallery: this.data.restrictedGallery,
            viewers: this.data.viewers,
            commenters: this.data.commenters,
            stamps: {
                lamport: this.data.stamps.lamport,
                fields: { ...this.data.stamps.fields },
            },
            crdt: this.data.crdt,
        };
        // Firestore rejects literal `undefined` field values, and the schema
        // marks `preview` as optional — so omit the key entirely when unset.
        if (this.data.preview !== undefined)
            serialized.preview = this.data.preview;
        return serialized;
    }

    isTutorial() {
        return this.getID().startsWith('tutorial-');
    }

    getSourceByteSize() {
        // Estimate rather than getting exact size.
        return this.getSources().reduce(
            (sum, source) => sum + source.getCode().toString().length,
            0,
        );
    }

    withChat(id: string | null) {
        return new Project({ ...this.data, chat: id });
    }

    getPreview(): SerializedPreview | undefined {
        return this.data.preview;
    }

    withPreview(preview: SerializedPreview | undefined): Project {
        return new Project({ ...this.data, preview });
    }

    static getHistorySize(history: SerializedSourceCheckpoint[]) {
        return history.reduce(
            (size, checkpoint) =>
                checkpoint.sources.reduce(
                    (sum, source) => source.code.length + sum,
                    0,
                ) + size,
            0,
        );
    }

    withCheckpoint(checkpoint?: SerializedSourceCheckpoint) {
        // None provided? Checkpoint this project's current source.
        if (checkpoint === undefined)
            checkpoint = {
                time: Date.now(),
                sources: this.getSerializedSources(),
            };
        // Add the checkpoint, keep the list sorted by time.
        let history = [...this.data.history, checkpoint].sort(
            (a, b) => a.time - b.time,
        );

        // Remove any old checkpoints until we're under the size limit.
        while (Project.getHistorySize(history) > MaxCheckpointSize)
            history.shift();

        return new Project({ ...this.data, history: history });
    }

    getCheckpoints() {
        return this.data.history;
    }

    getLatestCheckpoint(): SerializedSourceCheckpoint | undefined {
        return this.data.history[this.data.history.length - 1];
    }

    latestCheckpointIsDifferentFrom(project: Project): boolean {
        const latest = this.getLatestCheckpoint();
        // No checkpoint? Yeah, this is different.
        if (latest === undefined) return true;

        const { sources } = latest;
        if (sources.length !== project.getSources().length) return true;
        for (let i = 0; i < sources.length; i++) {
            if (sources[i].code !== project.getSources()[i].code.toString())
                return true;
        }
        return false;
    }

    withoutHistory() {
        return new Project({ ...this.data, history: [] });
    }

    toWordplay() {
        return (
            `${this.getName()}\n` +
            this.getSources()
                .map(
                    (source) =>
                        `=== ${source.names.toWordplay()}\n${source
                            .withPreferredSpace()
                            .code.toString()}`,
                )
                .join('\n')
        );
    }

    getViewers() {
        return this.data.viewers;
    }

    withViewer(viewer: string) {
        return this.data.viewers.some((user) => user === viewer)
            ? this
            : new Project({
                  ...this.data,
                  viewers: [...this.data.viewers, viewer],
              });
    }

    withoutViewer(viewer: string) {
        return !this.data.viewers.some((user) => user === viewer)
            ? this
            : new Project({
                  ...this.data,
                  viewers: this.data.viewers.filter((id) => id !== viewer),
              });
    }

    hasViewer(id: string) {
        return this.data.viewers.includes(id);
    }

    getCommenters() {
        return this.data.commenters;
    }

    withCommenter(commenter: string) {
        return this.data.commenters.some((user) => user === commenter)
            ? this
            : new Project({
                  ...this.data,
                  commenters: [...this.data.commenters, commenter],
              });
    }

    withoutCommenter(commenter: string) {
        return !this.data.commenters.some((user) => user === commenter)
            ? this
            : new Project({
                  ...this.data,
                  commenters: this.data.commenters.filter(
                      (id) => id !== commenter,
                  ),
              });
    }

    hasCommenter(id: string) {
        return this.data.commenters.includes(id);
    }

    getRestrictedGallery() {
        return this.data.restrictedGallery;
    }

    withRestrictedGallery(restricted: boolean) {
        return new Project({ ...this.data, restrictedGallery: restricted });
    }

    // --- CRDT snapshot ---

    /**
     * The persisted CRDT snapshot (base64 of `Y.encodeStateAsUpdateV2`),
     * or null when this project has never been touched under v8 yet.
     *
     * Every project — solo or multi-collaborator — gets a CRDT session
     * when it's actively viewed (see ProjectsDatabase.activateCRDT,
     * triggered by ProjectView mount). The "every viewed project"
     * choice is what fixes the offline-rename + online-code-edit case
     * for the same user on two devices: stamps merge the `name` field,
     * and the CRDT character-level-merges the source code, so neither
     * side's edit is lost. Unviewed projects don't pay the CRDT
     * runtime cost — their metadata still merges via stamps in
     * mergeWith on remote sync, and their snapshot stays in this
     * field for the next time someone opens them.
     */
    getCRDTSnapshot(): string | null {
        return this.data.crdt;
    }

    /** Return a copy with the CRDT snapshot replaced. Persisted with
     *  the next save. */
    withCRDTSnapshot(crdt: string | null): Project {
        return new Project({ ...this.data, crdt });
    }

    // --- Per-field stamp accessors and merge ---

    getStamps(): SerializedProjectStamps {
        return this.data.stamps;
    }

    withStamps(stamps: SerializedProjectStamps): Project {
        return new Project({ ...this.data, stamps });
    }

    /**
     * Record authorship for this save by bumping a fresh Lamport stamp
     * on every field whose value has changed since `previous`. Returns
     * a copy of this project with the new {@link ProjectStamps}.
     *
     * # Why this exists
     *
     * Stamps are the durable record of "I made this change at this
     * Lamport time." Without them, when a remote replica later tries
     * to merge its copy of the project with mine, there's no way to
     * know which side has the more recent edit on any particular
     * field — that's the gap that produced bug #135 (a stale device's
     * older code clobbered a newer device's renamed project). With
     * stamps in place, the remote merge in {@link mergeWith} picks
     * the winning value field-by-field, so concurrent edits to
     * disjoint fields both survive.
     *
     * # How "changed" is decided
     *
     * Every stamped field is a Zod-validated, JSON-serializable value
     * (strings, booleans, arrays of primitives, plain object structs).
     * So `JSON.stringify` equality is exact for our schema — there are
     * no class instances or undefined-vs-missing distinctions to worry
     * about. We bump only on real changes; an idempotent save that
     * touches nothing leaves stamps alone.
     *
     * Sources are special-cased: they're not in
     * {@link StampedMetadataFields} because Source instances are AST
     * objects, not JSON. Instead we compare their *serialized* form
     * under a single stamp key. Once collaboration is active the
     * Yjs CRDT (ProjectCRDT.ts) is the real convergence mechanism
     * for code, and this stamp is just a coarse hint for replicas
     * that haven't seen the CRDT snapshot yet.
     */
    bumpStampsFrom(previous: Project, writer: string): Project {
        let stamps = this.data.stamps;
        for (const field of StampedMetadataFields) {
            if (
                !sameSerialized(
                    previous.data[field as keyof ProjectData],
                    this.data[field as keyof ProjectData],
                )
            ) {
                stamps = bumpField(stamps, field, writer);
            }
        }
        // Source content is not stamped — the Yjs CRDT in ProjectCRDT.ts
        // is the authoritative merge mechanism for code and source names.
        // Even solo single-user projects activate CRDT so that the same
        // user editing on two devices converges correctly (the #135
        // reproduction). The CRDT is character-level convergent, which is
        // strictly better than the coarse "pick one side's whole sources
        // blob" stamp we used to maintain here.
        return this.withStamps(stamps);
    }

    /**
     * Reconcile this project (the local copy) with `other` (an incoming
     * copy, usually from Firestore) into a single merged project. This
     * is the heart of the fix for #135.
     *
     * # The algorithm in one paragraph
     *
     * For every stamped field, we look at the Lamport stamps on both
     * sides and pick the value whose stamp comes later in causal order
     * (higher counter, writer ID as tiebreak). Concurrent edits to
     * *different* fields therefore both survive — A's renamed name and
     * B's edited code both make it into the merged copy. Concurrent
     * edits to the *same* field deterministically agree on one winner
     * across every replica (whichever writer ID sorts larger), so the
     * system always converges without coordination.
     *
     * # The fallback path
     *
     * For a field where both sides have NeverWritten stamps (counter
     * zero, empty writer), there's no Lamport information to compare,
     * so we fall back to the legacy v6 behavior: take the side with
     * the higher project-level `timestamp`. This only matters during
     * the v6 → v7 transition window — once both replicas have touched
     * a field under v7, the stamps will be non-zero forever after.
     *
     * # Fields that don't fit the stamp model
     *
     * - **Sources.** Source *content* (code, names) is merged via the
     *   Yjs CRDT (ProjectCRDT.ts), not stamps — that gives character-
     *   level convergence so two devices typing in different functions
     *   both see both sets of keystrokes. The mergeWith call here just
     *   takes the local Project's source structure (number of sources,
     *   their Source object identities, and the carets that reference
     *   them); the CRDT then folds in the remote's actual code content
     *   asynchronously via ProjectsDatabase.foldRemoteCRDT.
     * - **History** (checkpoints) is unioned, deduplicated by
     *   `(time, first-source-code)`. This preserves both replicas'
     *   undo history without clobbering.
     * - **timestamp** is monotonic — take the max.
     * - **persisted** is sticky-true — once any replica has saved it
     *   to the cloud, it stays persisted.
     */
    mergeWith(other: Project): Project {
        const localStamps = this.data.stamps;
        const remoteStamps = other.data.stamps;
        const fallbackPrefersLocal =
            this.data.timestamp >= other.data.timestamp;

        // Pick the winner of a single stamped field.
        const pick = <K extends keyof ProjectData>(
            field: K & string,
        ): ProjectData[K] => {
            const a: FieldStamp = getStamp(localStamps, field);
            const b: FieldStamp = getStamp(remoteStamps, field);
            if (a.c === 0 && b.c === 0) {
                return fallbackPrefersLocal
                    ? this.data[field]
                    : other.data[field];
            }
            return mergeField(this.data[field], a, other.data[field], b);
        };

        const mergedData: ProjectData = {
            ...this.data,
            // Stamped metadata fields
            name: pick('name'),
            locales: pick('locales'),
            owner: pick('owner'),
            collaborators: pick('collaborators'),
            public: pick('public'),
            listed: pick('listed'),
            archived: pick('archived'),
            gallery: pick('gallery'),
            flags: pick('flags'),
            nonPII: pick('nonPII'),
            chat: pick('chat'),
            restrictedGallery: pick('restrictedGallery'),
            viewers: pick('viewers'),
            commenters: pick('commenters'),
            preview: pick('preview'),
            // Source structure stays local. The Yjs CRDT
            // (ProjectCRDT.ts) is the authoritative merge for code and
            // source names; ProjectsDatabase.foldRemoteCRDT applies the
            // remote's CRDT bytes to our Y.Doc after this mergeWith
            // returns. Carets are local UI state and reference our
            // local Source object identities, so they stay too.
            main: this.data.main,
            supplements: this.data.supplements,
            carets: this.data.carets,
            // History is unioned, deduplicated by (time, first-source-code).
            history: unionHistory(this.data.history, other.data.history),
            // Timestamp is monotonic.
            timestamp: Math.max(this.data.timestamp, other.data.timestamp),
            // Persisted is sticky-true.
            persisted: this.data.persisted || other.data.persisted,
            stamps: mergeStamps(localStamps, remoteStamps),
        };
        return new Project(mergedData);
    }
}

/** JSON-equality check used by {@link Project.bumpStampsFrom}. Both inputs
 *  pass through the same stable serialization, so this is exact for our
 *  composite-field data (arrays, plain objects, primitives). */
function sameSerialized(a: unknown, b: unknown): boolean {
    return JSON.stringify(a) === JSON.stringify(b);
}

/** Union two history lists, deduplicated by (time, first-source-code).
 *  Sorted by time ascending. Trimmed to the size limit via the existing
 *  Project.getHistorySize bound. */
function unionHistory(
    a: SerializedSourceCheckpoint[],
    b: SerializedSourceCheckpoint[],
): SerializedSourceCheckpoint[] {
    const seen = new Set<string>();
    const out: SerializedSourceCheckpoint[] = [];
    for (const cp of [...a, ...b].sort((x, y) => x.time - y.time)) {
        const key = `${cp.time}:${cp.sources[0]?.code ?? ''}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(cp);
    }
    while (Project.getHistorySize(out) > 200000) out.shift();
    return out;
}
