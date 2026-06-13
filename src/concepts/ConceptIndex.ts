import BindConcept from '@concepts/BindConcept';
import type Concept from '@concepts/Concept';
import {
    getBasisConcepts,
    getNodeConcepts,
    getOutputConcepts,
} from '@concepts/DefaultConcepts';
import FunctionConcept from '@concepts/FunctionConcept';
import GalleryHowConcept from '@concepts/GalleryHowConcept';
import HowConcept from '@concepts/HowConcept';
import type HowTo from '@concepts/HowTo';
import NodeConcept from '@concepts/NodeConcept';
import { Purpose, type PurposeType } from '@concepts/Purpose';
import StreamConcept from '@concepts/StreamConcept';
import StructureConcept from '@concepts/StructureConcept';
import GalleryHowTo from '@db/howtos/HowToDatabase.svelte';
import type Project from '@db/projects/Project';
import type Locales from '@locale/Locales';
import BinaryEvaluate from '@nodes/BinaryEvaluate';
import Bind from '@nodes/Bind';
import Evaluate from '@nodes/Evaluate';
import FunctionDefinition from '@nodes/FunctionDefinition';
import FunctionType from '@nodes/FunctionType';
import type Node from '@nodes/Node';
import Reference from '@nodes/Reference';
import StreamDefinition from '@nodes/StreamDefinition';
import StructureDefinition from '@nodes/StructureDefinition';
import type Type from '@nodes/Type';
import type TypeSet from '@nodes/TypeSet';
import UnaryEvaluate from '@nodes/UnaryEvaluate';
import { makeSearchable, searchConcepts } from '@concepts/conceptSearch';
import type { Searchable, SearchMatch } from '@util/search';

export default class ConceptIndex {
    readonly project: Project;
    readonly concepts: Concept[];
    readonly primaryConcepts: Concept[];
    readonly subConcepts: Map<Concept, Set<Concept>> = new Map();
    readonly locales: Locales;

    /** Precomputed searchable text for every concept, aligned to {@link concepts}. */
    readonly searchable: Searchable<Concept>[];

    /** A mapping of node ids to nodes, registered by examples that are generated. */
    readonly examples: Map<number, Node> = new Map();

    /** Caches getNodeConcept by node kind. The result depends only on the node's
     *  class and the concepts array is immutable for this index's lifetime, so
     *  this collapses the per-call linear concept scan to O(1) after the first
     *  lookup — hot when building a menu's revisions (one lookup per candidate). */
    private readonly nodeConceptByKind = new Map<string, NodeConcept | undefined>();

    constructor(project: Project, concepts: Concept[], locales: Locales) {
        this.project = project;

        // Store the primary concepts
        this.primaryConcepts = [...concepts];

        // Start with the primary concepts.
        this.concepts = this.primaryConcepts.slice();

        // Get all subconcepts of the given concepts.
        for (const primary of this.primaryConcepts) {
            const subConcepts = primary.getSubConcepts();
            this.subConcepts.set(primary, subConcepts);
            for (const subconcept of subConcepts)
                this.concepts.push(subconcept);
        }

        // Remember the preferred locales.
        this.locales = locales;

        // Precompute searchable text ONCE. This moves the expensive work —
        // concretizing each concept's documentation markup — out of the
        // per-keystroke search path. It's rebuilt whenever a new ConceptIndex is
        // constructed (project/howtos/gallery/locale change).
        const languages = locales.getLanguages();
        this.searchable = this.concepts.map((concept) =>
            makeSearchable(
                concept,
                concept.getNames(locales, false),
                concept
                    .getDocs(locales)
                    .flatMap((markup) => markup.getWordsTexts()),
                languages,
            ),
        );
    }

    // Make a concept index with a project and some preferreed languages.
    static make(
        project: Project,
        locales: Locales,
        howTos: HowTo[] | undefined,
        galleryHowTos: GalleryHowTo[] | undefined,
    ) {
        const main = project.getMain();
        const sources = project.getSources();
        const context = project.getContext(main);

        const projectStructures = sources
            .map((source) =>
                source.expression
                    .nodes(
                        (n): n is StructureDefinition =>
                            n instanceof StructureDefinition,
                    )
                    .map(
                        (def) =>
                            new StructureConcept(
                                Purpose.Project,
                                undefined,
                                def,
                                undefined,
                                [],
                                locales,
                                project.getContext(source),
                            ),
                    ),
            )
            .flat();

        const projectFunctions = sources
            .map((source) =>
                source.expression.expression.statements
                    .filter(
                        (n): n is FunctionDefinition =>
                            n instanceof FunctionDefinition,
                    )
                    .map(
                        (def) =>
                            new FunctionConcept(
                                Purpose.Project,
                                undefined,
                                def,
                                undefined,
                                locales,
                                project.getContext(source),
                            ),
                    ),
            )
            .flat();

        const projectBinds = sources
            .map((source) =>
                source.expression.expression.statements
                    .filter((n): n is Bind => n instanceof Bind)
                    .map(
                        (def) =>
                            new BindConcept(
                                Purpose.Project,
                                def,
                                locales,
                                project.getContext(source),
                            ),
                    ),
            )
            .flat();

        function makeStreamConcept(stream: StreamDefinition) {
            return new StreamConcept(stream, locales, context);
        }

        const streams = Object.values(project.shares.input)
            .filter((c) => c !== project.shares.input.Reaction)
            .map((def) =>
                def instanceof StreamDefinition
                    ? makeStreamConcept(def)
                    : new FunctionConcept(
                          Purpose.Inputs,
                          undefined,
                          def,
                          undefined,
                          locales,
                          context,
                      ),
            );

        const constructs = getNodeConcepts(context);

        const basis = getBasisConcepts(project.basis, locales, context);

        const output = getOutputConcepts(locales, context);

        const how = howTos?.map((how) => new HowConcept(how, context)) ?? [];

        const galleryHow =
            galleryHowTos?.map((ht) => new GalleryHowConcept(ht, context)) ??
            [];

        return new ConceptIndex(
            project,
            [
                ...basis,
                ...projectStructures,
                ...projectFunctions,
                ...projectBinds,
                // Inputs have higher priority than language constructs so Previous appears last.
                ...streams,
                ...constructs,
                ...output,
                ...how,
                ...galleryHow,
            ],
            locales,
        );
    }

    /** Search through the concepts to find a corresponding node */
    getNode(id: number): Node | undefined {
        // Search all entries for a matching node.
        for (const concept of this.concepts) {
            const match = concept.getNode(id);
            if (match) return match;
        }

        // Search examples for matching node.
        return this.examples.get(id);
    }

    /** Given a node, get the most relevant concept to represent. Generally prefers functions, structures, binds, and streams over nodes. */
    getRelevantConcept(node: Node): Concept | undefined {
        // Only Evaluate/Reference nodes need a context to resolve their
        // definition; compute it lazily so other nodes (e.g. Language) skip the
        // per-call getNodeContext tree walk.
        const definition =
            node instanceof Evaluate ||
            node instanceof BinaryEvaluate ||
            node instanceof UnaryEvaluate
                ? node.getFunction(this.project.getNodeContext(node))
                : node instanceof Reference
                  ? node.resolve(this.project.getNodeContext(node))
                  : node instanceof Bind
                    ? node
                    : undefined;
        const definitionConcept =
            definition instanceof FunctionDefinition
                ? this.getFunctionConcept(definition)
                : definition instanceof StructureDefinition
                  ? this.getStructureConcept(definition)
                  : definition instanceof StreamDefinition
                    ? this.getStreamConcept(definition)
                    : definition instanceof Bind
                      ? this.getBindConcept(definition)
                      : undefined;

        return definitionConcept ?? this.getNodeConcept(node);
    }

    getBindConcept(bind: Bind) {
        return this.concepts.find(
            (concept) =>
                concept instanceof BindConcept && concept.bind === bind,
        );
    }

    getFunctionConcept(fun: FunctionDefinition): FunctionConcept | undefined {
        return this.concepts.find(
            (concept): concept is FunctionConcept =>
                concept instanceof FunctionConcept &&
                concept.definition === fun,
        );
    }

    getStructureConcept(definition: Node) {
        return this.concepts.find(
            (concept) =>
                concept instanceof StructureConcept &&
                concept.definition === definition,
        );
    }

    getInterfaceImplementers(def: StructureDefinition): StructureConcept[] {
        return this.concepts.filter(
            (concept): concept is StructureConcept =>
                concept instanceof StructureConcept &&
                concept.inter.some((s) => s.definition === def),
        );
    }

    getStreamConcept(fun: StreamDefinition): StreamConcept | undefined {
        return this.concepts.find(
            (concept): concept is StreamConcept =>
                concept instanceof StreamConcept && concept.definition === fun,
        );
    }

    getNodeConcept(node: Node): NodeConcept | undefined {
        const kind = node.getDescriptor();
        const cached = this.nodeConceptByKind.get(kind);
        if (cached !== undefined || this.nodeConceptByKind.has(kind))
            return cached;
        const found = this.concepts.find(
            (concept): concept is NodeConcept =>
                concept instanceof NodeConcept &&
                concept.template.constructor === node.constructor,
        );
        this.nodeConceptByKind.set(kind, found);
        return found;
    }

    getGalleryHowConcept(howToId: string): GalleryHowConcept | undefined {
        return this.concepts.find(
            (concept): concept is GalleryHowConcept =>
                concept instanceof GalleryHowConcept &&
                concept.getHowToId() === howToId,
        );
    }

    getEquivalent(concept: Concept): Concept | undefined {
        return this.concepts.find((c) => c.isEqualTo(concept));
    }

    /** Returns all concepts that are not subconcepts and that have the given purpose. */
    getPrimaryConceptsWithPurpose(purpose: PurposeType): Concept[] {
        return this.primaryConcepts.filter((c) => c.purpose === purpose);
    }

    /** Finds a concept that represents the given type */
    getConceptOfType(
        type: Type,
    ): FunctionConcept | StructureConcept | undefined {
        if (type instanceof FunctionType && type.definition)
            return this.getFunctionConcept(type.definition);

        return this.concepts.find(
            (c): c is StructureConcept =>
                c instanceof StructureConcept && c.representsType(type),
        );
    }

    /** Finds the first concept for which this concept is a subconcept */
    getConceptOwner(concept: Concept): Concept | undefined {
        return this.concepts.find((c) => c.getSubConcepts().has(concept));
    }

    /** Finds a subconcept by owner token and concept token */
    getSubConcept(owner: string, concept: string) {
        const subconcepts = this.getConceptByToken(owner)?.getSubConcepts();
        return subconcepts
            ? Array.from(subconcepts).find((c) =>
                  this.conceptMatchesToken(c, concept),
              )
            : undefined;
    }

    /** Finds a subconcept of the given concept by name. */
    getSubConceptByName(owner: Concept, name: string): Concept | undefined {
        return Array.from(owner.getSubConcepts()).find((sub) =>
            sub.hasName(name, this.locales),
        );
    }

    getConceptsOfTypes(types: TypeSet): StructureConcept[] {
        return types
            .list()
            .map((type) => this.getConceptOfType(type))
            .filter((t): t is StructureConcept => t !== undefined);
    }

    getConceptByName(name: string): Concept | undefined {
        return this.concepts.find((c) => c.hasName(name, this.locales));
    }

    /**
     * The token used to identify a concept in a URL: its character name if it has
     * one, otherwise its plain name. This is the inverse of {@link conceptMatchesToken}
     * and {@link getConceptByToken}; keep all three in sync so that a concept written
     * to a URL can always be read back.
     */
    getConceptToken(concept: Concept): string {
        return (
            concept.getCharacterName(this.locales) ??
            concept.getName(this.locales, false)
        );
    }

    /** True if the concept is the one identified by the given URL token. */
    conceptMatchesToken(concept: Concept, token: string): boolean {
        return (
            concept.getCharacterName(this.locales) === token ||
            concept.hasName(token, this.locales)
        );
    }

    getConceptByToken(token: string): Concept | undefined {
        return this.concepts.find((c) => this.conceptMatchesToken(c, token));
    }

    addExample(node: Node) {
        this.examples.set(node.id, node);
    }

    removeExample(node: Node) {
        this.examples.delete(node.id);
    }

    withExamples(examples: Map<number, Node>) {
        for (const ex of examples.values()) this.examples.set(ex.id, ex);
        return this;
    }

    /**
     * Searches all concepts (and subconcepts) for the query. Returns
     * `[concept, [display, start, end, priority]]` tuples ordered name-matches
     * first, then by how closely each matched (see src/util/search.ts).
     */
    getQuery(query: string): [Concept, SearchMatch][] {
        return searchConcepts(
            this.searchable,
            query,
            this.locales.getLanguages(),
        );
    }
}
