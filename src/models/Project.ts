import type Conflict from '@conflicts/Conflict';
import Evaluate from '@nodes/Evaluate';
import Expression from '@nodes/Expression';
import FunctionDefinition from '@nodes/FunctionDefinition';
import type Program from '@nodes/Program';
import type StructureDefinition from '@nodes/StructureDefinition';
import Source from '@nodes/Source';
import type Node from '@nodes/Node';
import HOF from '../native/HOF';
import FunctionDefinitionType from '@nodes/FunctionDefinitionType';
import Native from '../native/NativeBindings';
import Tree from '@nodes/Tree';
import DefaultShares from '@runtime/DefaultShares';
import Context from '@nodes/Context';
import type { SharedDefinition } from '@nodes/Borrow';
import PropertyReference from '@nodes/PropertyReference';
import type Bind from '@nodes/Bind';
import Reference from '@nodes/Reference';
import type LanguageCode from '@translation/LanguageCode';
import type StreamDefinition from '@nodes/StreamDefinition';
import { VerseType } from '../output/Verse';
import { GroupType } from '../output/Group';
import { PhraseType } from '../output/Phrase';
import { v4 as uuidv4 } from 'uuid';
import { parseNames, toTokens } from '../parser/Parser';

export type SerializedSource = { names: string; code: string };
export type SerializedProject = {
    id: string;
    name: string;
    sources: SerializedSource[];
    uids: string[];
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

    /** True if the project is fresh data from the remote database, so it does not need to be persisted. */
    saved: boolean;

    /** A list of uids that have write access to this project. */
    readonly uids: string[];

    readonly trees: Tree[];
    readonly _index: Map<Node, Tree | undefined> = new Map();

    /** A cache of sources by node, for fast lookup. */
    readonly nodeSources: Map<Node, Source | undefined> = new Map();

    /** A cache of source contexts */
    readonly sourceContext: Map<Source, Context> = new Map();

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
        uids: string[] = [],
        saved: boolean = false
    ) {
        this.id = id ?? uuidv4();
        this.uids = uids;
        this.saved = saved;

        // Remember the source.
        this.name = name;
        this.main = main;
        this.supplements = supplements.slice();

        // Build all of the trees we might need for analysis.
        this.trees = [
            ...this.getSources().map((source) => new Tree(source)),
            ...Native.getStructureDefinitionTrees(),
            ...DefaultShares.map((share) => new Tree(share)),
        ];
    }

    copy() {
        return new Project(
            null,
            this.name,
            this.main,
            this.supplements,
            this.uids
        );
    }

    equals(project: Project) {
        return (
            this.name === project.name &&
            this.getSources().every((source1) =>
                project.getSources().some((source2) => source1.equals(source2))
            )
        );
    }

    get(node: Node): Tree | undefined {
        if (!this._index.has(node)) this._index.set(node, this.resolve(node));
        return this._index.get(node);
    }

    /** Get a tree that that represents the node. It could be in a source, one of the native types, or a share. */
    resolve(node: Node): Tree | undefined {
        // Search the trees in the context for a matching node.
        for (const tree of this.trees) {
            const match = tree.get(node);
            if (match) return match;
        }

        return undefined;
    }

    /** True if one of the project's contains the given node. */
    contains(node: Node) {
        // PERF: Check the cache first, and then fall back to searching sources.
        return (
            this.get(node) !== undefined || this.getSourceOf(node) !== undefined
        );
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
        return DefaultShares;
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
        if (!this.nodeSources.has(node))
            this.nodeSources.set(
                node,
                this.getSources().find((source) => source.contains(node))
            );
        return this.nodeSources.get(node);
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
    getNative() {
        return Native;
    }

    getAnalysis() {
        // If there's a cycle, return the analysis thus far.
        return this.analysis;
    }

    analyze() {
        if (this.analyzed === 'analyzed' || this.analyzed === 'analyzing')
            return this.analyze;

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
                    let nodeConflicts =
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
                        if (
                            fun instanceof FunctionDefinition &&
                            fun.expression instanceof HOF
                        ) {
                            for (const input of node.inputs) {
                                const type = input.getType(context);
                                if (type instanceof FunctionDefinitionType) {
                                    const hofEvaluates =
                                        this.analysis.evaluations.get(
                                            type.fun
                                        ) ?? new Set();
                                    hofEvaluates.add(node);
                                    this.analysis.evaluations.set(
                                        type.fun,
                                        hofEvaluates
                                    );
                                }
                            }
                        }
                    }
                }

                // Build the dependency graph by asking each expression node for its dependencies.
                if (node instanceof Expression) {
                    for (const dependency of node.getDependencies(context)) {
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

    getNodeByID(id: number): Node | undefined {
        for (const source of this.getSources()) {
            const node = source.getNodeByID(id);
            if (node) return node;
        }
        return undefined;
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
        const defaultMatch = DefaultShares.find((s) => s.hasName(source));

        return defaultMatch === undefined
            ? undefined
            : [undefined, defaultMatch];
    }

    getReferences(bind: Bind): (Reference | PropertyReference)[] {
        const refs: (Reference | PropertyReference)[] = [];
        for (const source of this.getSources()) {
            const context = this.getContext(source);
            for (const ref of source.nodes(
                (n) => n instanceof Reference || n instanceof PropertyReference
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
            this.uids
        );
    }

    withName(name: string) {
        return new Project(
            this.id,
            name,
            this.main,
            this.supplements,
            this.uids
        );
    }

    withSource(oldSource: Source, newSource: Source) {
        return this.withSources([[oldSource, newSource]]);
    }

    withoutSource(source: Source) {
        return new Project(
            this.id,
            this.name,
            this.main,
            this.supplements.filter((s) => s !== source),
            this.uids
        );
    }

    withSources(replacements: [Source, Source][]) {
        // Note: we need to clone all of the unchanged sources in order to generate new Programs so that the views can
        // trigger an update. Without this, we'd have the same Source, Program, and Nodes, and the views would have no idea
        // that the conflicts in those same objects have changed.
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
            this.uids
        );
    }

    withRevisedNodes(nodes: [Node, Node | undefined][]) {
        const replacementSources: [Source, Source][] = [];

        // Go through each replacement and generate a new source.
        for (const [original, replacement] of nodes) {
            const context = this.getNodeContext(original);
            const source = context.source;
            // Check if we made a new source already.
            const sources = replacementSources.find(
                ([original]) => original === source
            );
            // If not, create a new one, mapping the original to the new source.
            if (sources === undefined)
                replacementSources.push([
                    source,
                    source.replace(original, replacement),
                ]);
            // Update the replacement source with the next replacement.
            else sources[1] = sources[1].replace(original, replacement);
        }

        return this.withSources(replacementSources);
    }

    withNewSource(name: string) {
        return new Project(
            this.id,
            this.name,
            this.main,
            [...this.supplements, new Source(name, '')],
            this.uids
        );
    }

    withUser(uid: string) {
        return new Project(
            this.id,
            this.name,
            this.main,
            this.supplements,
            this.uids.some((user) => user === uid)
                ? this.uids
                : [...this.uids, uid]
        );
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
                evaluate.is(VerseType, this.getNodeContext(evaluate))
            ),
            ...evaluates.filter((evaluate) =>
                evaluate.is(GroupType, this.getNodeContext(evaluate))
            ),
            ...evaluates.filter((evaluate) =>
                evaluate.is(PhraseType, this.getNodeContext(evaluate))
            ),
        ];
    }

    static sourceToSource(source: SerializedSource): Source {
        return new Source(parseNames(toTokens(source.names)), source.code);
    }

    static fromObject(project: SerializedProject) {
        return new Project(
            project.id,
            project.name,
            Project.sourceToSource(project.sources[0]),
            project.sources
                .slice(1)
                .map((source) => Project.sourceToSource(source)),
            project.uids
        );
    }

    toObject(): SerializedProject {
        return {
            id: this.id,
            name: this.name,
            sources: this.getSources().map((source) => {
                return {
                    names: source.names.toWordplay(),
                    code: source.code.toString(),
                };
            }),
            uids: this.uids,
        };
    }
}
