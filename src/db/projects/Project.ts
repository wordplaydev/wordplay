import Templates from '@concepts/Templates';
import type Conflict from '@conflicts/Conflict';
import { Permission, type PermissionName } from '@input/permissions';
import { resolveCaretPosition, type CaretPosition } from '@edit/caret/Caret';
import concretize from '@locale/concretize';
import { getBestSupportedLocales } from '@locale/getBestSupportedLocales';
import type Locale from '@locale/Locale';
import { localeToString, stringToLocale } from '@locale/Locale';
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
import StructureDefinition from '@nodes/StructureDefinition';
import { DOCS_SYMBOL } from '@parser/Symbols';
import type createDefaultShares from '@runtime/createDefaultShares';
import { v4 as uuidv4 } from 'uuid';
import { Basis } from '@basis/Basis';
import DefaultLocale from '@locale/DefaultLocale';
import Locales from '@locale/Locales';
import type LocaleText from '@locale/LocaleText';
import type { SupportedLocale } from '@locale/SupportedLocales';
import FunctionType from '@nodes/FunctionType';
import type { Path } from '@nodes/Root';
import Root from '@nodes/Root';
import { parseNames } from '@parser/parseBind';
import {
    buildKeywordIndex,
    KeywordIds,
    Keywords,
    type KeywordIndex,
} from '@parser/Keywords';
import Sym, { type SymType } from '@nodes/Sym';
import { toTokens } from '@parser/toTokens';
import { PROJECT_PARAM_MODE } from '../../routes/[[locale]]/project/constants';
import type LocalesDatabase from '@db/locales/LocalesDatabase';
import { type ModerationState, unknownFlags } from '@db/projects/Moderation';
import { ScratchPrefix } from '@db/projects/ScratchPrefix';
import {
    type Analysis,
    type AnalysisInProgress,
    type AnalysisState,
    CallGraph,
    type Callable,
    DependencyGraph,
    type SourceAnalysis,
    dedupeConflicts,
    emptyAnalysis,
    mergeConflicts,
} from '@db/projects/Analysis';
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
 * What someone other than the owner may do with a project, most powerful first.
 *
 * The three are stored as separate Firestore arrays because `firestore.rules`
 * reads each by name, but a person has exactly one of them: see
 * {@link Project.withPrivilegeFor}.
 */
export type ProjectPrivilege = 'collaborate' | 'comment' | 'view';

/** The privileges in descending order of power, which is what makes a person who
 *  somehow sits in several lists resolve to one. */
export const ProjectPrivileges: ProjectPrivilege[] = [
    'collaborate',
    'comment',
    'view',
];

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
     * The locales this project **declares** it is written in, as locale codes, in
     * priority order. This is the persisted list and the sole determinant of the
     * project's basis and keyword index — it never absorbs the viewer's UI locales,
     * so a project analyzes identically for everyone (#1246). Not an indicator of
     * what locales are currently selected; a locale may be selected that this
     * project does not use, and vice versa. Only a creator changes it, through the
     * languages dialog. */
    locales: SupportedLocale[];
    /**
     * The subset of {@link ProjectData.locales} whose text actually loaded. Kept
     * separate from the declared codes so a locale whose fetch failed stays declared
     * rather than silently disappearing from the project on the next save. Derived,
     * never serialized. */
    localeTexts: LocaleText[];
    /** Serialized caret positions for each source file */
    carets: SerializedSourceCaret[];
};

/** How a project's declared languages relate to what its code needs. See {@link Project.getLocaleUsage}. */
export type LocaleUsage = {
    /** The declared locale codes, in priority order. */
    declared: SupportedLocale[];
    /** Declared codes the code names, whether by a localized name, a language tag, or a keyword word. */
    used: SupportedLocale[];
    /** Declared codes nothing in the code refers to. */
    unused: SupportedLocale[];
    /** Declared codes whose text isn't loaded, so their names don't currently bind. */
    unloaded: SupportedLocale[];
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
 *  - `remixOf`                : written once when the remix is created and
 *                                immutable thereafter, like `id`. Both
 *                                replicas hold the same value, so the
 *                                `...this.data` base carries it through.
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
export const StampedMetadataFields: readonly (keyof ProjectData & string)[] = [
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
    'folder',
    'researchConsent',
];

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

    /**
     * Where this project is in its analysis. A discriminated union rather than
     * a flag beside a half-filled result, so that reading a layer that isn't
     * built yet is a thing the type checker makes you say out loud. See #808.
     */
    private state: AnalysisState = { kind: 'unanalyzed' };

    /** Each source's share of the analysis above, so a revision can keep the
     * shares belonging to sources it didn't touch. */
    readonly sourceAnalysis: Map<Source, SourceAnalysis> = new Map();

    /** Each source's locales, cached and carried for the same reason. */
    readonly sourceLocales: Map<Source, Locale[]> = new Map();

    /** Memoized result of {@link Project.getKeywordLocalesUsed}, which scans every token. */
    private keywordLocales: Set<SupportedLocale> | undefined = undefined;

    /** Each source's references indexed by definition; see getReferencesInSource. */
    readonly sourceReferences: Map<
        Source,
        Map<Definition, (Reference | PropertyReference)[]>
    > = new Map();

    /** A cache of expressions that dependent on Changed expressions, so we can quickly know to reevaluate them. */
    #changeDependentExpressions: Set<Expression> | undefined = undefined;

    /**
     * @param carry The project this one revises, if any. Sources it did not
     * change keep their analysis caches; see `adoptCaches`.
     */
    constructor(data: ProjectData, carry?: Project) {
        // Copy to prevent external modification
        this.data = { ...data };

        // Get a Basis for the declared locales that loaded.
        this.basis = Basis.getLocalizedBasis(
            new Locales(concretize, this.data.localeTexts, DefaultLocale),
        );

        // Initialize default shares
        this.shares = this.basis.shares;

        // Initialize roots for all definitions that can be referenced.
        this.roots = [
            ...this.getSources().map((source) => source.root),
            ...this.basis.getRoots(),
        ];

        if (carry !== undefined) this.adoptCaches(carry);
    }

    /**
     * Take over the analysis caches of the project this one revises, for every
     * source it left alone.
     *
     * Every cache here lives on the Project instance, and an edit makes a new
     * Project, so without this a keystroke re-infers the types of *every*
     * source in the project — not just the one being typed in. That is fine
     * until a project has a source it doesn't touch: a MIDI import puts
     * thousands of notes in one, and re-inferring them made each edit to the
     * two-line program that plays them take about a second.
     *
     * A source's types depend on its own nodes, on the basis, and on whatever it
     * borrows. So the safe cases to carry are the ones that are
     * identity-unchanged (which `withSources` guarantees for sources it doesn't
     * replace), borrow nothing, and share our basis — which is per-locale
     * memoized, so it holds whenever the locales did not change.
     *
     * A source's *later* analysis layers additionally depend on the whole
     * project's call graph, which a change elsewhere can move; `analyze` drops
     * and redoes those for any carried source a freshly analyzed one calls
     * into. `constants` is deliberately not carried for the same reason and is
     * not worth the same treatment: it is derived lazily and only at runtime.
     */
    /**
     * A revision of this project, keeping the analysis of every source the
     * revision doesn't change.
     *
     * **Every instance method that returns a modified project must go through
     * this.** A bare `new Project({ ...this.data, x })` silently starts with
     * cold caches, and that is not a small loss: typing one character runs
     * `withSource` (which adopts them) and then `withCaret`, `bumpStampsFrom`,
     * and `withNewTime`, so three plain constructions were enough to hand the
     * UI a project that had to re-infer and re-analyze an untouched 200KB
     * source on every keystroke. `Project.revision.test.ts` fails if a new
     * `new Project(` appears outside the two static factories.
     */
    private revised(data: Partial<ProjectData>): Project {
        return new Project({ ...this.data, ...data }, this);
    }

    /**
     * A revision with `preview` removed. Firestore rejects an undefined field
     * value, so "no preview" is an absent key — which a `revised()` spread
     * can't express. Carries caches exactly as `revised()` does.
     */
    private withoutPreview(): Project {
        const { preview: _, ...rest } = this.data;
        return new Project(rest, this);
    }

    private adoptCaches(carry: Project) {
        if (carry.basis !== this.basis) return;
        for (const source of this.getSources()) {
            if (source.expression.borrows.length > 0) continue;
            const context = carry.sourceContext.get(source);
            if (context !== undefined)
                this.sourceContext.set(source, context.withProject(this));
            const analysis = carry.sourceAnalysis.get(source);
            if (analysis !== undefined)
                this.sourceAnalysis.set(source, analysis);
            const locales = carry.sourceLocales.get(source);
            if (locales !== undefined) this.sourceLocales.set(source, locales);
            const references = carry.sourceReferences.get(source);
            if (references !== undefined)
                this.sourceReferences.set(source, references);
        }
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
        const localeTexts = Array.isArray(locales) ? locales : [locales];
        return new Project({
            v: ProjectSchemaLatestVersion,
            id: id ?? uuidv4(),
            name,
            main,
            supplements,
            locales: localeTexts.map((l) => localeToString(l)),
            localeTexts,
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
            remixOf: null,
            folder: null,
            researchConsent: false,
        });
    }

    /** A fresh, unmoderated copy of this project owned by `newOwner`, with no
     *  record of where it came from. This is the blank-slate copy used for
     *  starter templates; see {@link remix} for the one that keeps provenance. */
    copy(newOwner: string | null) {
        return (
            Project.make(
                uuidv4(),
                this.getName(),
                this.getMain(),
                this.getSupplements(),
                this.data.localeTexts,
                newOwner,
            )
                // Carry the declared codes over verbatim: `make` can only derive them from the
                // loaded texts, so a declared locale that failed to load would be lost here.
                .revised({ locales: this.data.locales })
                .asUnmoderated()
        );
    }

    /** A copy of this project owned by `newOwner` that remembers this project
     *  as its source, so the remix can credit and link back to it. */
    remix(newOwner: string | null) {
        return this.copy(newOwner).withRemixOf(this.getID());
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
        return `/project/${encodeURI(this.getID())}?${PROJECT_PARAM_MODE}=${
            fullscreen ? 'play' : 'edit'
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

    /** The locale codes this project declares it is written in, in priority order. The
     * persisted list; see {@link ProjectData.locales}. */
    getLocaleCodes(): SupportedLocale[] {
        return [...this.data.locales];
    }

    /** The text of the declared locales that loaded. */
    getLocaleTexts(): LocaleText[] {
        return [...this.data.localeTexts];
    }

    private keywordIndex: KeywordIndex | undefined = undefined;
    /** The localized-keyword recognizer for this project's declared locales, so creators can type
     * keyword words in those languages. Memoized; rebuilt per project instance. See LANGUAGE.md. */
    getKeywordIndex(): KeywordIndex {
        if (this.keywordIndex === undefined)
            this.keywordIndex = buildKeywordIndex(
                this.data.localeTexts.map((l) => l.keyword),
            );
        return this.keywordIndex;
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

    /**
     * This project's completed analysis, or undefined if it hasn't finished
     * one. Callers must decide what they mean by "no analysis yet" — before
     * this returned a half-built result that read as an empty one, so a project
     * nobody had analyzed reported that it had no conflicts. See #808.
     */
    getAnalysis(): Analysis | undefined {
        return this.state.kind === 'analyzed' ? this.state.analysis : undefined;
    }

    /**
     * The layers of the analysis built so far, for the few things that legitimately
     * run *during* one. Each layer is undefined until its phase completes, so a
     * reader has to say what it does without it rather than silently treating a
     * partial answer as the whole one.
     */
    getAnalysisInProgress(): AnalysisInProgress {
        return this.state.kind === 'analyzing'
            ? this.state.partial
            : this.state.kind === 'analyzed'
              ? this.state.analysis
              : { calls: undefined, dependencies: undefined };
    }

    /** Kept for the UI, which schedules around the three states. */
    get analyzed(): 'unanalyzed' | 'analyzing' | 'analyzed' {
        return this.state.kind;
    }

    /**
     * Derive everything analysis knows, in three project-wide phases.
     *
     * The order is the order the layers actually depend on each other, and it
     * has to be project-wide rather than per source. The call graph comes first
     * because it is derived from types alone. The dependency graph reads it: a
     * bind in a function has no value until someone calls the function, so its
     * dependencies are those calls. Conflicts come last because some of them
     * consult both — `Reaction` asks whether anything its condition depends on
     * is a stream, which for a stream passed *into* a function is only knowable
     * from the call graph.
     *
     * Running these per source instead, as this used to, meant one source's
     * conflicts were computed before another source's calls were known. Two
     * things went wrong: a reaction over a function input was told it had
     * nothing to react to, and a function defined in one source and called from
     * another never recorded the call as a dependency, so reactions inside it
     * stopped reevaluating.
     */
    analyze(): Analysis {
        if (this.state.kind === 'analyzed') return this.state.analysis;
        // Re-entrant call during analysis: hand back what exists so far rather
        // than restarting the walk. Readers that mean to do this go through
        // getAnalysisInProgress(), which makes the gaps explicit.
        if (this.state.kind === 'analyzing') {
            const { calls, dependencies } = this.state.partial;
            return {
                calls: calls ?? new CallGraph(),
                dependencies: dependencies ?? new DependencyGraph(),
                conflicts: [],
                conflictedNodes: new Map(),
            };
        }

        const analysis = emptyAnalysis();
        const partial: AnalysisInProgress = {
            calls: undefined,
            dependencies: undefined,
        };
        this.state = { kind: 'analyzing', partial };

        // Each source's share, carried from the project this one revises where
        // there is one to carry. `fresh` is the ones we have to derive.
        const shares = this.getSources().map(
            (source): [Source, SourceAnalysis, boolean] => {
                const cached = this.sourceAnalysis.get(source);
                return [
                    source,
                    cached ?? emptyAnalysis(),
                    cached === undefined,
                ];
            },
        );

        // Phase A: the call graph, for every source.
        for (const [source, share, fresh] of shares) {
            if (fresh) this.analyzeSourceCalls(source, share);
            analysis.calls.merge(share.calls);
        }
        partial.calls = analysis.calls;

        // A carried source's dependencies and conflicts were derived against
        // the call graph of the project it came from. If a source we just
        // analyzed calls into one we carried, that source's later layers are
        // stale, so drop them and redo just those. A borrowed source nothing
        // calls into — a table of data, a song's notes — never trips this,
        // which is what keeps carrying it worthwhile.
        const stale = this.staleFromNewCalls(shares, analysis.calls);
        for (const entry of shares)
            if (stale.has(entry[0])) {
                const kept = emptyAnalysis();
                kept.calls.merge(entry[1].calls);
                entry[1] = kept;
                entry[2] = true;
            }

        // Phase B: the dependency graph, which reads the call graph.
        for (const [source, share, fresh] of shares) {
            if (fresh) this.analyzeSourceDependencies(source, share);
            analysis.dependencies.merge(share.dependencies);
        }
        // The edges a call implies: every call to a definition decides what its
        // input binds are. Derived here, from the whole project's call graph,
        // rather than by `Bind` asking the project mid-analysis for calls it
        // could not yet see.
        for (const [fun, evaluates] of analysis.calls.entries())
            if (
                fun instanceof FunctionDefinition ||
                fun instanceof StructureDefinition
            )
                for (const input of fun.inputs)
                    for (const evaluate of evaluates)
                        analysis.dependencies.add(evaluate, input);
        partial.dependencies = analysis.dependencies;

        // Phase C: conflicts, which may read either graph above.
        for (const [source, share, fresh] of shares) {
            if (fresh) this.analyzeSourceConflicts(source, share);
            mergeConflicts(analysis, share);
        }

        for (const [source, share] of shares)
            this.sourceAnalysis.set(source, share);

        this.state = { kind: 'analyzed', analysis };

        return analysis;
    }

    /**
     * Carried sources whose later layers a freshly analyzed source's calls
     * invalidate. See the call in {@link Project.analyze}.
     */
    private staleFromNewCalls(
        shares: [Source, SourceAnalysis, boolean][],
        calls: CallGraph,
    ): Set<Source> {
        const stale = new Set<Source>();
        const carried = shares.filter(([, , fresh]) => !fresh);
        const fresh = shares.filter(([, , isFresh]) => isFresh);
        if (carried.length === 0 || fresh.length === 0) return stale;
        for (const [fun, evaluates] of calls.entries())
            for (const evaluate of evaluates) {
                // Only a call made from a source we just analyzed can be new.
                if (!fresh.some(([source]) => source.root.has(evaluate)))
                    continue;
                const target = carried.find(([source]) => source.root.has(fun));
                if (target !== undefined) stale.add(target[0]);
            }
        return stale;
    }

    /** Phase A for one source: which definitions its `Evaluate`s call. */
    private analyzeSourceCalls(source: Source, share: SourceAnalysis) {
        const context = this.getContext(source);
        for (const node of source.nodes()) {
            if (!(node instanceof Evaluate)) continue;
            const fun = node.getFunction(context);
            if (fun === undefined) continue;
            share.calls.add(fun, node);

            // Is it a higher order function? Get the function input and add the
            // Evaluate as a caller of the function input.
            if (fun instanceof FunctionDefinition)
                for (const input of node.inputs) {
                    const type = input.getType(context);
                    if (type instanceof FunctionType && type.definition)
                        share.calls.add(type.definition, node);
                }
        }
    }

    /** Phase B for one source: which expressions depend on which. */
    private analyzeSourceDependencies(source: Source, share: SourceAnalysis) {
        const context = this.getContext(source);
        for (const node of source.nodes())
            if (node instanceof Expression)
                for (const dependency of node.getDependencies(context))
                    share.dependencies.add(dependency, node);
    }

    /** Phase C for one source: its conflicts, and the nodes they point at. */
    private analyzeSourceConflicts(source: Source, share: SourceAnalysis) {
        const context = this.getContext(source);
        share.conflicts = dedupeConflicts(
            source.expression.getAllConflicts(context),
        );
        for (const conflict of share.conflicts) {
            const node = conflict.getConflictingNode(context, Templates);
            share.conflictedNodes.set(node, [
                ...(share.conflictedNodes.get(node) ?? []),
                conflict,
            ]);
        }
    }

    /** The conflicts of a completed analysis, or undefined if there isn't one.
     * Undefined and "no conflicts" are different answers, and treating the
     * first as the second is how an un-analyzed project reported a clean bill
     * of health. */
    getConflicts(): Conflict[] | undefined {
        return this.getAnalysis()?.conflicts;
    }

    /**
     * For each revised source, the new BLOCKING conflicts it would introduce versus the project's
     * current conflicts. Only blocking conflicts — unparsable code — gate an edit in blocks mode;
     * semantic conflicts of any severity (type mismatches, unknown names, placeholders, etc.) are
     * permitted, since they can be repaired in place.
     */
    getNewConflictsBatch(
        oldSource: Source,
        newSources: Source[],
    ): Map<Source, Conflict[]> {
        const newConflictsBySource = new Map<Source, Conflict[]>();
        // Each candidate replaces only one source; unchanged sources reproduce
        // conflicts already in currentConflicts, so they can never contribute a
        // NEW conflict. We can therefore recompute conflicts for just the changed
        // source — unless some source borrows the one being edited, the one
        // channel by which a single-source edit can change another's conflicts.
        const crossSource = this.hasSourcesDependingOn(oldSource);
        // The baseline only has to cover wherever a candidate's conflicts can
        // come from, which in the narrow case is the replaced source alone.
        // Taking the whole project's would make the saving above pointless.
        const currentConflicts = crossSource
            ? this.getMajorConflictsNow()
            : this.getMajorConflictsInSource(oldSource);
        // For all of the new sources, get the new conflicts caused by the revision.
        for (const newSource of newSources) {
            const revised = this.withSource(oldSource, newSource);
            const newConflicts = (
                crossSource
                    ? revised.getMajorConflictsNow()
                    : revised.getMajorConflictsInSource(newSource)
            ).filter((conflict) => conflict.isBlocking());

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

    getNewConflicts(oldSource: Source, newSource: Source): Conflict[] {
        const newConflicts = this.getNewConflictsBatch(oldSource, [newSource]);
        return Array.from(newConflicts.values())[0];
    }

    getMajorConflictsNow() {
        let conflicts: Conflict[] = [];
        for (const source of this.getSources())
            conflicts = [
                ...conflicts,
                ...this.getMajorConflictsInSource(source),
            ];
        return conflicts;
    }

    /** Major (non-minor) conflicts for a single source, using that source's context. */
    getMajorConflictsInSource(source: Source): Conflict[] {
        const context = this.getContext(source);
        let conflicts: Conflict[] = [];
        for (const node of source.nodes())
            conflicts = [...conflicts, ...node.computeConflicts(context)];
        return conflicts.filter((conflict) => !conflict.isMinor());
    }

    /** True if any source borrows from another, making source scopes interdependent. */
    hasCrossSourceDependencies(): boolean {
        return this.getSources().some(
            (source) => source.expression.borrows.length > 0,
        );
    }

    /**
     * True if editing `source` could change some *other* source's conflicts,
     * which can only happen through a borrow of it.
     *
     * The direction matters. Asking whether any source borrows at all answers
     * yes for the borrower itself, and a MIDI import is exactly that shape: a
     * two-line program borrowing a source of notes that nothing else reads.
     * Editing the program then re-walked every note in the supplement to
     * validate a keystroke — a second an edit on a real song.
     *
     * A borrow with no source named yet is unfinished syntax, and answers yes
     * rather than guessing what it will name.
     */
    hasSourcesDependingOn(source: Source): boolean {
        return this.getSources().some(
            (other) =>
                other !== source &&
                other.expression.borrows.some(
                    (borrow) =>
                        borrow.source === undefined ||
                        source.hasName(borrow.source.getName()),
                ),
        );
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

    getConflictedNodes(): Map<Node, Conflict[]> | undefined {
        return this.getAnalysis()?.conflictedNodes;
    }

    nodeInvolvedInConflicts(node: Node) {
        return this.getAnalysis()?.conflictedNodes.has(node) ?? false;
    }

    /** Given a node N, and the set of conflicts C in the program, determines the subset of C in which the given N is complicit. */
    getConflictsInvolvingNode(node: Node) {
        return this.getAnalysis()?.conflictedNodes.get(node);
    }

    getEvaluationsOf(fun: Callable): Evaluate[] {
        return this.getAnalysis()?.calls.getEvaluationsOf(fun) ?? [];
    }

    getExpressionsAffectedBy(expression: Expression): Set<Expression> {
        return (
            this.getAnalysis()?.dependencies.getExpressionsAffectedBy(
                expression,
            ) ?? new Set()
        );
    }

    /**
     * Returns true if the given expression is transitively dependent on a Changed expression.
     * Used to determine whether to reevaluate an expression at evaluation time.
     */
    isChangedDependentExpression(expr: Expression): boolean {
        if (this.#changeDependentExpressions === undefined) {
            const analysis = this.analyze();
            this.#changeDependentExpressions = new Set();

            const changes = analysis.dependencies
                .entries()
                .filter((s) => s[0] instanceof Changed);
            while (changes.length > 0) {
                const [, dependents] = changes.pop()!;
                for (const dependent of dependents) {
                    if (!this.#changeDependentExpressions.has(dependent)) {
                        this.#changeDependentExpressions.add(dependent);
                        const furtherDependents =
                            analysis.dependencies.getExpressionsAffectedBy(
                                dependent,
                            );
                        if (furtherDependents.size > 0)
                            changes.push([dependent, furtherDependents]);
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

    /**
     * A source's references, indexed by what they resolve to.
     *
     * Callers ask this one definition at a time, and resolving a reference is
     * not cheap, so answering each question with its own walk means resolving
     * every reference in the project once per question. `getRequiredPermissions`
     * alone asks seven times and is derived on every project change; with a
     * large source that was tens of milliseconds on every keystroke. One walk
     * per source answers all of them.
     */
    private getReferencesInSource(
        source: Source,
    ): Map<Definition, (Reference | PropertyReference)[]> {
        let index = this.sourceReferences.get(source);
        if (index === undefined) {
            index = new Map();
            const context = this.getContext(source);
            for (const node of source.nodes()) {
                if (!(
                    node instanceof Reference ||
                    node instanceof PropertyReference
                ))
                    continue;
                const definition = node.resolve(context);
                if (definition === undefined) continue;
                const refs = index.get(definition);
                if (refs) refs.push(node);
                else index.set(definition, [node]);
            }
            this.sourceReferences.set(source, index);
        }
        return index;
    }

    /**
     * Whether evaluating this source twice gives the same answer and creates
     * nothing along the way.
     *
     * True when it borrows nothing — so everything it can reach is its own or
     * the basis — and it references nothing in the basis's `input` group, which
     * is where every stream lives, along with `Random`. A source that is
     * literal data qualifies; anything that could tick, react, or roll does not.
     * A stream can only be created by referring to its definition, so a source
     * that names none of them cannot make one.
     */
    isStableSource(source: Source): boolean {
        if (source.expression.borrows.length > 0) return false;
        const referenced = this.getReferencesInSource(source);
        for (const definition of Object.values(this.shares.input))
            if (referenced.has(definition)) return false;
        return true;
    }

    getReferences(bind: Definition): (Reference | PropertyReference)[] {
        const refs: (Reference | PropertyReference)[] = [];
        for (const source of this.getSources())
            refs.push(...(this.getReferencesInSource(source).get(bind) ?? []));
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
            [input.Face, Permission.Camera],
            [input.Objects, Permission.Camera],
        ];
        for (const [definition, permission] of map) {
            if (this.getReferences(definition).length > 0)
                required.add(permission);
        }
        return required;
    }

    withName(name: string) {
        return this.revised({ name });
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

    /**
     * Copies this project, declaring the given locales if they aren't already declared.
     * New locales go at the *end*: the first declared locale is the project's primary
     * one — it decides the stage's writing direction and `getPrimaryLanguage()` — so
     * adding a language must not silently reassign that. Use {@link withPrimaryLocale}
     * to change it deliberately.
     */
    withLocales(locales: LocaleText[]) {
        const added = locales.filter(
            (l) => !this.data.locales.includes(localeToString(l)),
        );
        if (added.length === 0) return this;
        return this.revised({
            locales: [...this.data.locales, ...added.map(localeToString)],
            localeTexts: [...this.data.localeTexts, ...added],
        }).withKeywordedSources();
    }

    /** Copies this project without the given declared locales. Refuses to empty the
     * list — a project with no languages has no basis names at all. */
    withoutLocales(codes: SupportedLocale[]) {
        const remaining = this.data.locales.filter((l) => !codes.includes(l));
        if (
            remaining.length === 0 ||
            remaining.length === this.data.locales.length
        )
            return this;
        return this.revised({
            locales: remaining,
            localeTexts: this.data.localeTexts.filter((l) =>
                remaining.includes(localeToString(l)),
            ),
        }).withKeywordedSources();
    }

    /** Re-tokenize every source with this project's keyword index, so a language change
     * takes effect immediately instead of at the next reload: an added language's keyword
     * words become constructs, and a removed language's words degrade to plain names.
     * Routed through withSources so carets follow their replaced sources.
     *
     * Rebuilds every source, so a caller holding nodes gathered from the old tree must
     * call this last — which is why `withPrimaryLocale` doesn't do it for you. */
    withKeywordedSources(): Project {
        const keywords = this.getKeywordIndex();
        const replacements: [Source, Source][] = [];
        for (const source of this.getSources()) {
            const rekeyed = source.withKeywords(keywords);
            if (rekeyed !== source) replacements.push([source, rekeyed]);
        }
        return replacements.length === 0
            ? this
            : this.withSources(replacements);
    }

    withCaret(source: Source, caret: CaretPosition) {
        return this.revised({
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
        return this.revised({
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

        return this.revised({
            main: newMain,
            supplements: newSupplements,
            carets: newCarets,
        });
    }

    /**
     * Return a copy of this project with `main`, `supplements`, and
     * `carets` taken from `other`. Used by the merge layer when the
     * Yjs CRDT isn't active to drive source convergence — the remote's
     * source structure is treated as authoritative and dropped into
     * our merged metadata. Carets are intentionally swapped along
     * with the sources because they hold `Source` references that
     * are only valid against the source identities they came from;
     * keeping our local carets would leave them pointing into the
     * old Source objects.
     */
    withSourcesFrom(other: Project): Project {
        return this.revised({
            main: other.data.main,
            supplements: other.data.supplements,
            carets: other.data.carets,
        });
    }

    withRevisedNodes(nodes: [Node, Node | undefined][]) {
        const replacementSources: [Source, Source, CaretPosition][] = [];

        // Go through each replacement and generate a new source.
        for (const [original, replacement] of nodes) {
            // Replacing a node with itself is a no-op by definition, but doing
            // the work is not: each `replace` rebuilds the source, which
            // orphans every other node the caller gathered up front. A caller
            // that passes "leave this one alone" pairs alongside real ones —
            // `translateProjectContent` does, for every doc it decides not to
            // translate — then silently loses the real replacements that come
            // after them.
            if (original === replacement) continue;
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
        const newSource = new Source(name, code ?? '', this.getKeywordIndex());
        return this.revised({
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
        return this.revised({ owner });
    }

    /**
     * Hand ownership to `uid`, keeping the former owner as a collaborator so a
     * transfer never costs them access to their own work.
     *
     * Both halves matter. The new owner leaves every privilege list because
     * the owner is not their own collaborator anywhere else in the model, and
     * `getContributors` would otherwise count them twice. The former owner
     * joins the collaborators because Firestore's project rules grant edit
     * access to the owner and collaborators only — without this they'd be
     * locked out of a project they made. They do lose deletion, which is
     * owner-only in the rules, and that is the point of a transfer.
     *
     * Commenters and viewers are cleared for the same reason collaborators are.
     * That used to be unreachable, since the transfer control was only offered
     * on a collaborator; the privilege picker offers it on any row.
     *
     * Transferring to the current owner, or to nobody, is a no-op rather than
     * an error: the caller is a list of collaborators, and a stale render
     * shouldn't be able to empty the collaborator list.
     */
    withOwnerTransferredTo(uid: string) {
        const previous = this.data.owner;
        if (previous === uid) return this;
        return this.revised({
            owner: uid,
            collaborators: [
                ...this.data.collaborators.filter(
                    (collaborator) => collaborator !== uid,
                ),
                ...(previous !== null &&
                !this.data.collaborators.includes(previous)
                    ? [previous]
                    : []),
            ],
            commenters: this.data.commenters.filter(
                (commenter) => commenter !== uid,
            ),
            viewers: this.data.viewers.filter((viewer) => viewer !== uid),
        });
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
        return this.revised({
            collaborators: [...this.data.collaborators, uid],
        });
    }

    withoutCollaborator(uid: string) {
        return !this.data.collaborators.some((user) => user === uid)
            ? this
            : this.revised({
                  collaborators: this.data.collaborators.filter(
                      (id) => id !== uid,
                  ),
              });
    }

    isPublic() {
        return this.data.public;
    }

    asPublic(pub = true) {
        return this.revised({ public: pub });
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

    /** Copies this project with the given locale declared first, adding it if it wasn't
     * declared. Compares by locale code, not object identity — the same locale text can
     * arrive as a different object from a reload or a fresh fetch. */
    withPrimaryLocale(locale: LocaleText) {
        const code = localeToString(locale);
        return this.revised({
            locales: [code, ...this.data.locales.filter((l) => l !== code)],
            localeTexts: [
                locale,
                ...this.data.localeTexts.filter(
                    (l) => localeToString(l) !== code,
                ),
            ],
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

        // Defer to the shared decoder rather than repeating the cases: a node's Path is itself an
        // array, so an Array.isArray check here caught paths too and returned undefined for every one
        // of them, leaving a stored node selection unresolvable.
        return position === undefined
            ? undefined
            : resolveCaretPosition(source, position);
    }

    static deserializeSource(
        source: SerializedSource,
        keywords?: KeywordIndex,
    ): Source {
        return new Source(
            parseNames(toTokens(source.names)),
            // We changed the documentation symbol. Automatically convert it when deserializing. by seeing if there are 2 or more `` in the code,
            // and no ¶ and if so, replace them with the new symbol.
            (source.code.match(/``/g) || []).length >= 2 &&
                (source.code.match(/¶/g) || []).length === 0
                ? source.code.replaceAll('``', DOCS_SYMBOL)
                : source.code,
            keywords,
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

        // The locales the project declares, normalized to supported ones. This is an offline
        // mapping, so a locale whose text can't be fetched right now still stays declared —
        // only the creator removes a language (#1246). The viewer's UI locales are
        // deliberately *not* mixed in: a project's basis must not depend on who opens it.
        const locales = getBestSupportedLocales(project.locales);

        // Load what we can of them; a failed fetch just means fewer names bind this session.
        const localeTexts = await localesDB.loadLocales(locales);

        // Recognize typed keyword words in the project's declared locales. Dual-type tokens (LANGUAGE.md
        // §3) mean a name that collides with a keyword (e.g. "número") still parses as a name — it
        // shadows the keyword rather than breaking — so this is safe to activate for declared locales.
        const keywords = buildKeywordIndex(localeTexts.map((l) => l.keyword));
        const sources = project.sources.map((source) =>
            Project.deserializeSource(source, keywords),
        );

        return new Project({
            v: ProjectSchemaLatestVersion,
            id: project.id,
            name: project.name,
            main: sources[0],
            supplements: sources.slice(1),
            locales,
            localeTexts,
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
            // Omit the key when absent; `preview` is exactly optional, so
            // assigning undefined would put a value Firestore rejects into
            // memory. Same reasoning as the crdt/remixOf coalescing below.
            ...(project.preview !== undefined && { preview: project.preview }),
            stamps: {
                lamport: project.stamps.lamport,
                fields: { ...project.stamps.fields },
            },
            // Both coalesce so a doc written without these fields can't put
            // `undefined` into memory, where serialize() would hand it to
            // Firestore and throw. See ProjectSchemaV8 and ProjectSchemaV9.
            crdt: project.crdt ?? null,
            remixOf: project.remixOf ?? null,
            folder: project.folder ?? null,
            researchConsent: project.researchConsent ?? false,
        });
    }

    getLocalesUsed(): Locale[] {
        const locales: Record<string, Locale> = {};
        for (const source of this.getSources()) {
            // Cached per source because this resolves every reference in it,
            // and ProjectView derives it on every project change — including
            // mid-flurry, where nothing else this expensive runs.
            let used = this.sourceLocales.get(source);
            if (used === undefined) {
                used = source.expression.getLocalesUsed(
                    this.getContext(source),
                );
                this.sourceLocales.set(source, used);
            }
            // Keyed by locale, not by position: `getLocalesUsed` answers an
            // array, so keying on its indices had a second source's first
            // locale replace the first source's.
            for (const locale of used) locales[localeToString(locale)] = locale;
        }
        return Array.from(Object.values(locales));
    }

    /**
     * The declared locales whose localized keyword words the sources actually parse with.
     *
     * A keyword word is a *parse* dependency, not just a name lookup: a source containing
     * `función` only lexes it as a function keyword while `es-MX` is declared, and degrades
     * it to a plain name otherwise (LANGUAGE.md, "Localized keywords"). `getLocalesUsed`
     * sees only names and language tags, so it can't tell.
     *
     * Every declared locale that defines a used word counts, not just the one that won the
     * index: `buildKeywordIndex` resolves cross-locale collisions first-wins, so we can't
     * tell which locale the creator meant, and over-reporting only means we decline to
     * suggest removing a language.
     */
    getKeywordLocalesUsed(): Set<SupportedLocale> {
        if (this.keywordLocales !== undefined) return this.keywordLocales;

        // Every keyword-bearing name token in the project, by text. A word only carries a
        // keyword Sym alongside Sym.Name when the keyword index recognized it.
        const keywordTokens = new Map<string, Set<SymType>>();
        for (const source of this.getSources())
            for (const token of source.tokens) {
                if (!token.isSymbol(Sym.Name) || token.getTypes().length < 2)
                    continue;
                const text = token.getText();
                const types = keywordTokens.get(text) ?? new Set<SymType>();
                for (const type of token.getTypes()) types.add(type);
                keywordTokens.set(text, types);
            }

        const locales = new Set<SupportedLocale>();
        if (keywordTokens.size > 0)
            for (const locale of this.data.localeTexts) {
                for (const id of KeywordIds) {
                    const raw = locale.keyword[id];
                    if (typeof raw !== 'string') continue;
                    const word = raw.replace(/^\$[~?!]/, '').trim();
                    const types = keywordTokens.get(word);
                    if (
                        types !== undefined &&
                        Keywords[id].types.some((t) => types.has(t))
                    ) {
                        locales.add(localeToString(locale));
                        break;
                    }
                }
            }

        this.keywordLocales = locales;
        return locales;
    }

    /**
     * How this project's declared languages relate to what its code actually needs, for the
     * languages dialog. Purely advisory — nothing acts on it, since a half-written program
     * can make a language the creator deliberately added look unused (#1246).
     */
    getLocaleUsage(): LocaleUsage {
        const declared = this.getLocaleCodes();
        const loaded = new Set(
            this.data.localeTexts.map((l) => localeToString(l)),
        );

        // The languages the code names. Basis names carry only a language, not a region
        // (getNameLocales tags them with `localeToLanguage`), so this can only ever match at
        // language granularity — two declared regions of one language are both "used".
        const languages = new Set<string>();
        for (const locale of this.getLocalesUsed()) {
            languages.add(locale.language);
            for (const language of locale.multilingual ?? [])
                languages.add(language);
        }

        const keywordLocales = this.getKeywordLocalesUsed();
        const used = declared.filter(
            (code, index) =>
                // The first declared locale is the project's own language: it decides the
                // stage's writing direction and is the default translation source, so it's
                // used whether or not any name in the code happens to come from it.
                index === 0 ||
                keywordLocales.has(code) ||
                languages.has(stringToLocale(code)?.language ?? code),
        );
        const usedSet = new Set(used);

        return {
            declared,
            used,
            unused: declared.filter((code) => !usedSet.has(code)),
            unloaded: declared.filter((code) => !loaded.has(code)),
        };
    }

    isListed() {
        return this.data.listed;
    }

    isArchived() {
        return this.data.archived;
    }

    asArchived(archived: boolean) {
        return this.revised({ archived });
    }

    asPersisted() {
        return this.revised({ persisted: true });
    }

    isPersisted() {
        return this.data.persisted;
    }

    getGallery() {
        return this.data.gallery;
    }

    withGallery(id: string | null) {
        return this.revised({ gallery: id });
    }

    /** The ID of the folder this project is filed under, or null for the top level. */
    getFolder() {
        return this.data.folder;
    }

    withFolder(folder: string | null) {
        return this.revised({ folder });
    }

    /** Whether the creator has allowed this project to be shown anonymously in
     *  research and communications about Wordplay. Deliberately not inherited by
     *  a copy or a remix: consent is given for a particular project by the
     *  person who made it, and `copy()` routes through `make`, which defaults
     *  it to false. */
    hasResearchConsent() {
        return this.data.researchConsent;
    }

    withResearchConsent(consent: boolean) {
        return this.revised({ researchConsent: consent });
    }

    getFlags() {
        return { ...this.data.flags };
    }

    withFlags(flags: ModerationState) {
        return this.revised({ flags: { ...flags } });
    }

    asUnmoderated() {
        return this.revised({ flags: unknownFlags() });
    }

    withNewTime() {
        return this.revised({ timestamp: Date.now() });
    }

    getTimestamp() {
        return this.data.timestamp;
    }

    getNonPII() {
        return this.data.nonPII;
    }

    withNonPII(text: string) {
        return this.revised({
            // Add to the set of text
            nonPII: Array.from(new Set([...this.data.nonPII, text])),
        });
    }

    withPII(text: string) {
        // Remove from the set of text
        const withPII = this.data.nonPII.filter((piiText) => {
            return piiText != text;
        });
        return this.revised({ nonPII: withPII });
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
            // The declared codes, verbatim. Not `getLocales().getLocales()`, which is the
            // *loaded* subset plus the appended en-US fallback — writing that back is what
            // made a project's language list grow every time anyone opened it (#1246).
            locales: this.data.locales,
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
            crdt: this.data.crdt ?? null,
            remixOf: this.data.remixOf ?? null,
            folder: this.data.folder ?? null,
            researchConsent: this.data.researchConsent ?? false,
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

    /** A throwaway project made from a guide example so someone can tinker with
     *  it. See scratch.ts. */
    isScratch() {
        return this.getID().startsWith(ScratchPrefix);
    }

    /** Whether this project is kept on this device only, never written to the
     *  cloud. Tutorial and scratch projects are both incidental to somewhere
     *  else in the app — a lesson, a guide page — rather than work a creator
     *  went looking for, so neither belongs in their cloud project list. */
    isLocalOnly() {
        return this.isTutorial() || this.isScratch();
    }

    getSourceByteSize() {
        // Estimate rather than getting exact size.
        return this.getSources().reduce(
            (sum, source) => sum + source.getCode().toString().length,
            0,
        );
    }

    withChat(id: string | null) {
        return this.revised({ chat: id });
    }

    getPreview(): SerializedPreview | undefined {
        return this.data.preview;
    }

    withPreview(preview: SerializedPreview | undefined): Project {
        return preview === undefined
            ? this.withoutPreview()
            : this.revised({ preview });
    }

    /** The ID of the project this was remixed from, or null if it's an original. */
    getRemixOf(): ProjectID | null {
        return this.data.remixOf;
    }

    isRemix(): boolean {
        return this.data.remixOf !== null;
    }

    withRemixOf(remixOf: ProjectID | null): Project {
        return this.revised({ remixOf });
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

        return this.revised({ history: history });
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
        return this.revised({ history: [] });
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
            : this.revised({
                  viewers: [...this.data.viewers, viewer],
              });
    }

    withoutViewer(viewer: string) {
        return !this.data.viewers.some((user) => user === viewer)
            ? this
            : this.revised({
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
            : this.revised({
                  commenters: [...this.data.commenters, commenter],
              });
    }

    withoutCommenter(commenter: string) {
        return !this.data.commenters.some((user) => user === commenter)
            ? this
            : this.revised({
                  commenters: this.data.commenters.filter(
                      (id) => id !== commenter,
                  ),
              });
    }

    hasCommenter(id: string) {
        return this.data.commenters.includes(id);
    }

    /**
     * What this person may do with the project, or undefined if nothing.
     *
     * Nothing has ever stopped a uid sitting in two or three of the lists at
     * once — `withCollaborator` doesn't remove them from `commenters` — so this
     * answers with the most powerful one they hold, which is what lets a
     * project written before {@link Project.withPrivilegeFor} render as one row
     * per person. Says nothing about the owner, who is not their own
     * collaborator anywhere else in the model either.
     */
    getPrivilegeFor(uid: string): ProjectPrivilege | undefined {
        return this.data.collaborators.includes(uid)
            ? 'collaborate'
            : this.data.commenters.includes(uid)
              ? 'comment'
              : this.data.viewers.includes(uid)
                ? 'view'
                : undefined;
    }

    /**
     * Give this person exactly one privilege, or none at all, which is how they
     * are removed from the project.
     *
     * One revision rather than a remove and an add, so the three lists can never
     * be seen half-changed, and so a person in several of them is normalized to
     * one by the first edit anyone makes. Transferring ownership is not
     * expressible here — see {@link Project.withOwnerTransferredTo}, which has
     * to move the previous owner too.
     */
    withPrivilegeFor(uid: string, privilege: ProjectPrivilege | undefined) {
        // Counted rather than just compared, so that someone who is in several
        // lists is still normalized when the privilege they end up with is the
        // one they already read as having.
        const memberships = [
            this.data.collaborators,
            this.data.commenters,
            this.data.viewers,
        ].filter((people) => people.includes(uid)).length;
        if (this.getPrivilegeFor(uid) === privilege && memberships < 2)
            return this;
        const without = (people: string[]) =>
            people.filter((person) => person !== uid);
        return this.revised({
            collaborators: [
                ...without(this.data.collaborators),
                ...(privilege === 'collaborate' ? [uid] : []),
            ],
            commenters: [
                ...without(this.data.commenters),
                ...(privilege === 'comment' ? [uid] : []),
            ],
            viewers: [
                ...without(this.data.viewers),
                ...(privilege === 'view' ? [uid] : []),
            ],
        });
    }

    getRestrictedGallery() {
        return this.data.restrictedGallery;
    }

    withRestrictedGallery(restricted: boolean) {
        return this.revised({ restrictedGallery: restricted });
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
        return this.revised({ crdt });
    }

    // --- Per-field stamp accessors and merge ---

    getStamps(): SerializedProjectStamps {
        return this.data.stamps;
    }

    withStamps(stamps: SerializedProjectStamps): Project {
        return this.revised({ stamps });
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

        // Every field in StampedMetadataFields has to appear below, or the
        // `...this.data` spread silently keeps the local value and the remote's
        // edit is lost — which is what happened to v10's `folder` and
        // `researchConsent` the moment they were added to that list. The list
        // is written out rather than looped so each field's merge is explicit;
        // Project.merge.test.ts fails if the two ever drift apart.
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
            folder: pick('folder'),
            researchConsent: pick('researchConsent'),
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
        // `preview` is the only stamped field that can be absent, and it's
        // exactly optional, so set-or-delete it rather than letting the
        // `...this.data` base carry a stale one past a merge that dropped it.
        const mergedPreview = pick('preview');
        if (mergedPreview === undefined) delete mergedData.preview;
        else mergedData.preview = mergedPreview;

        // Sources and carets come from `this` (see above), so its caches
        // still describe them.
        return new Project(mergedData, this);
    }
}

/** JSON-equality check used by {@link Project.bumpStampsFrom}. Both inputs
 *  pass through the same stable serialization, so this is exact for our
 *  composite-field data (arrays, plain objects, primitives). */
function sameSerialized(a: unknown, b: unknown): boolean {
    // The same reference always serializes the same, and on the edit path most
    // fields *are* the same reference, carried over by the `{...this.data}`
    // spread. Without this, every keystroke stringifies every stamped field.
    if (a === b) return true;
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
