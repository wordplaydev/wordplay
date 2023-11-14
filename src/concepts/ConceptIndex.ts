import type Concept from './Concept';
import type Node from '@nodes/Node';
import type Type from '@nodes/Type';
import StructureConcept from './StructureConcept';
import Purpose from './Purpose';
import type Project from '../models/Project';
import StructureDefinition from '@nodes/StructureDefinition';
import FunctionDefinition from '@nodes/FunctionDefinition';
import FunctionConcept from './FunctionConcept';
import Bind from '@nodes/Bind';
import BindConcept from './BindConcept';
import StreamConcept from './StreamConcept';
import {
    getBasisConcepts,
    getNodeConcepts,
    getOutputConcepts,
} from './DefaultConcepts';
import type TypeSet from '@nodes/TypeSet';
import StreamDefinition from '../nodes/StreamDefinition';
import NodeConcept from './NodeConcept';
import FunctionType from '../nodes/FunctionType';
import BinaryEvaluate from '../nodes/BinaryEvaluate';
import UnaryEvaluate from '../nodes/UnaryEvaluate';
import Evaluate from '../nodes/Evaluate';
import Reference from '../nodes/Reference';
import type Locales from '../locale/Locales';

export default class ConceptIndex {
    readonly project: Project;
    readonly concepts: Concept[];
    readonly primaryConcepts: Concept[];
    readonly subConcepts: Map<Concept, Set<Concept>> = new Map();
    readonly locales: Locales;

    /** A mapping of node ids to nodes, registered by examples that are generated. */
    readonly examples: Map<number, Node> = new Map();

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
    }

    // Make a concept index with a project and some preferreed languages.
    static make(project: Project, locales: Locales) {
        const main = project.getMain();
        const sources = project.getSources();

        const projectStructures = sources
            .map((source) =>
                source.expression
                    .nodes(
                        (n): n is StructureDefinition =>
                            n instanceof StructureDefinition
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
                                project.getContext(source)
                            )
                    )
            )
            .flat();

        const projectFunctions = sources
            .map((source) =>
                source.expression.expression.statements
                    .filter(
                        (n): n is FunctionDefinition =>
                            n instanceof FunctionDefinition
                    )
                    .map(
                        (def) =>
                            new FunctionConcept(
                                Purpose.Project,
                                undefined,
                                def,
                                undefined,
                                locales,
                                project.getContext(source)
                            )
                    )
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
                                project.getContext(source)
                            )
                    )
            )
            .flat();

        function makeStreamConcept(stream: StreamDefinition) {
            return new StreamConcept(stream, locales, project.getContext(main));
        }

        const streams = Object.values(project.shares.input).map((def) =>
            def instanceof StreamDefinition
                ? makeStreamConcept(def)
                : new FunctionConcept(
                      Purpose.Input,
                      undefined,
                      def,
                      undefined,
                      locales,
                      project.getContext(main)
                  )
        );

        const constructs = getNodeConcepts(project.getContext(main));

        const basis = getBasisConcepts(
            project.basis,
            locales,
            project.getContext(main)
        );

        const output = getOutputConcepts(locales, project.getContext(main));

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
            ],
            locales
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
        const context = this.project.getNodeContext(node);
        const definition =
            node instanceof Evaluate ||
            node instanceof BinaryEvaluate ||
            node instanceof UnaryEvaluate
                ? node.getFunction(context)
                : node instanceof Reference
                ? node.resolve(context)
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
            (concept) => concept instanceof BindConcept && concept.bind === bind
        );
    }

    getFunctionConcept(fun: FunctionDefinition): FunctionConcept | undefined {
        return this.concepts.find(
            (concept): concept is FunctionConcept =>
                concept instanceof FunctionConcept && concept.definition === fun
        );
    }

    getStructureConcept(definition: Node) {
        return this.concepts.find(
            (concept) =>
                concept instanceof StructureConcept &&
                concept.definition === definition
        );
    }

    getStreamConcept(fun: StreamDefinition): StreamConcept | undefined {
        return this.concepts.find(
            (concept): concept is StreamConcept =>
                concept instanceof StreamConcept && concept.definition === fun
        );
    }

    getNodeConcept(node: Node) {
        return this.concepts.find(
            (concept) =>
                concept instanceof NodeConcept &&
                concept.template.constructor === node.constructor
        );
    }

    getEquivalent(concept: Concept): Concept | undefined {
        return this.concepts.find((c) => c.isEqualTo(concept));
    }

    /** Returns all concepts that are not subconcepts and that have the given purpose. */
    getPrimaryConceptsWithPurpose(purpose: Purpose): Concept[] {
        return this.primaryConcepts.filter((c) => c.purpose === purpose);
    }

    getConceptOfType(
        type: Type
    ): FunctionConcept | StructureConcept | undefined {
        if (type instanceof FunctionType && type.definition)
            return this.getFunctionConcept(type.definition);

        return this.concepts.find(
            (c): c is StructureConcept =>
                c instanceof StructureConcept && c.representsType(type)
        );
    }

    /** Finds the first concept for which this concept is a subconcept */
    getConceptOwner(concept: Concept): Concept | undefined {
        return this.concepts.find((c) => c.getSubConcepts().has(concept));
    }

    /** Finds a subconcept by owner name and concept name */
    getSubConcept(owner: string, concept: string) {
        const subconcepts = this.getConceptByName(owner)?.getSubConcepts();
        return subconcepts
            ? Array.from(subconcepts).find((c) =>
                  c.hasName(concept, this.locales)
              )
            : undefined;
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

    getQuery(
        locales: Locales,
        query: string
    ): [Concept, [string, number, number][]][] {
        // Find matching concepts for each locale and the string that matched.
        const matches = locales
            .getLocales()
            .reduce(
                (matches: [Concept, [string, number, number]][], locale) => {
                    const lowerQuery = query.toLocaleLowerCase(locale.language);
                    return [
                        ...matches,
                        ...this.concepts
                            .map((c) => {
                                const match = c.getTextMatching(
                                    locales,
                                    lowerQuery
                                );
                                return match !== undefined
                                    ? [c, match]
                                    : undefined;
                            })
                            .filter(
                                (
                                    match
                                ): match is [
                                    Concept,
                                    [string, number, number]
                                ] => Array.isArray(match)
                            ),
                    ];
                },
                []
            );
        // Collapse matching text of equivalent concepts
        const map = new Map<Concept, [string, number, number][]>();
        for (const [concept, match] of matches) {
            const list = map.get(concept);
            map.set(concept, list === undefined ? [match] : [...list, match]);
        }

        return Array.from(map.entries());
    }
}
