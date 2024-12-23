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
import Reference from '@nodes/Reference';
import type StreamDefinition from '@nodes/StreamDefinition';
import { parseNames } from '../parser/parseBind';
import Root from '../nodes/Root';
import type { Path } from '../nodes/Root';
import type { CaretPosition } from '../edit/Caret';
import type createDefaultShares from '@runtime/createDefaultShares';
import FunctionType from '../nodes/FunctionType';
import { getBestSupportedLocales } from '../locale/LocaleText';
import { localeToString } from '@locale/Locale';
import type Locale from '@locale/Locale';
import type LocaleText from '../locale/LocaleText';
import { toTokens } from '../parser/toTokens';
import type LocalesDatabase from '../db/LocalesDatabase';
import { unknownFlags, type Moderation } from './Moderation';
import DefaultLocale from '../locale/DefaultLocale';
import Locales from '../locale/Locales';
import {
    type ProjectID,
    ProjectSchemaLatestVersion,
    type SerializedCaret,
    type SerializedProject,
    type SerializedProjectUnknownVersion,
    type SerializedSource,
    upgradeProject,
} from './ProjectSchemas';
import {
    PROJECT_PARAM_EDIT,
    PROJECT_PARAM_PLAY,
} from '../routes/project/constants';
import Name from '@nodes/Name';
import Doc from '@nodes/Doc';
import type Definition from '@nodes/Definition';
import Templates from '@concepts/Templates';
import concretize from '@locale/concretize';
import { DOCS_SYMBOL } from '@parser/Symbols';

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
    carets: SerializedCarets;
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

type SerializedSourceCaret = { source: Source; caret: SerializedCaret };
type SerializedCarets = SerializedSourceCaret[];

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
        primary: new Map(),
        secondary: new Map(),
        evaluations: new Map(),
        dependencies: new Map(),
    };

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
            ...this.basis.roots,
            ...this.shares.all.map((share) => new Root(share)),
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
        carets: SerializedCarets | undefined = undefined,
        listed = true,
        archived = false,
        persisted = false,
        gallery: string | null = null,
        // By default, unmoderated.
        flags: Moderation = unknownFlags(),
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
            this.getSources().every((source1) =>
                project
                    .getSources()
                    .some((source2) => source1.isEqualTo(source2)),
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
                source.expression.getAllConflicts(context),
            );

            // Build conflict indices by going through each conflict, asking for the conflicting nodes
            // and adding to the conflict to each node's list of conflicts.
            for (const conflict of this.analysis.conflicts) {
                const complicitNodes = conflict.getConflictingNodes(
                    context,
                    Templates,
                );
                this.analysis.primary.set(complicitNodes.primary.node, [
                    ...(this.analysis.primary.get(
                        complicitNodes.primary.node,
                    ) ?? []),
                    conflict,
                ]);
                if (complicitNodes.secondary) {
                    const nodeConflicts =
                        this.analysis.secondary.get(
                            complicitNodes.secondary.node,
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

    getConflicts() {
        return this.getAnalysis().conflicts;
    }

    getMajorConflictsNow() {
        let conflicts: Conflict[] = [];
        for (const source of this.getSources()) {
            const context = new Context(this, source);
            for (const node of source.nodes()) {
                conflicts = [...conflicts, ...node.computeConflicts(context)];
            }
        }
        return conflicts.filter((conflict) => !conflict.isMinor());
    }

    hasMajorConflictsNow() {
        for (const source of this.getSources()) {
            const context = new Context(this, source);
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
        fun: FunctionDefinition | StructureDefinition,
    ): Evaluate[] {
        return Array.from(this.getAnalysis().evaluations.get(fun) ?? []);
    }

    getExpressionsAffectedBy(expression: Expression): Set<Expression> {
        return this.getAnalysis().dependencies.get(expression) ?? new Set();
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

    /** Copies this project, but with the new locale added if it's not already included. */
    withLocales(locales: LocaleText[]) {
        return new Project({
            ...this.data,
            locales: Array.from(new Set([...this.data.locales, ...locales])),
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
                console.error("Couldn't find source of node being replaced");
                return this;
            }
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
        return this.data.collaborators.some((user) => user === uid)
            ? this
            : new Project({
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
            ? typeof position === 'number'
                ? position
                : source.root.resolvePath(position)
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
            chat: null,
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

    withFlags(flags: Moderation) {
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
        return new Project({
            ...this.data,
            nonPII: withPII,
        });
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

    serialize(): SerializedProject {
        return {
            v: ProjectSchemaLatestVersion,
            id: this.getID(),
            name: this.getName(),
            sources: this.getSources().map((source) => {
                return {
                    names: source.names.toWordplay(),
                    code: source.code.toString(),
                    caret:
                        this.data.carets.find((c) => c.source === source)
                            ?.caret ?? 0,
                };
            }),
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
        };
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
        return new Project({
            ...this.data,
            chat: id,
        });
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
}
